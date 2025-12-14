// LangGraph Multi-Agent System
// Implementación del patrón Supervisor del libro usando StateGraph

import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import chalk from 'chalk';
import figures from 'figures';
import {
  WorkerAgent,
  createSearcherAgent,
  createReaderAgent,
  createSynthesizerAgent,
  createWriterAgent,
} from '../agents/worker-agents.js';
import { createPerplexityLLM } from '../llm/perplexity.js';

// ============================================
// CONFIGURACIÓN DE CHUNKING
// ============================================

const CHUNK_SIZE = 5000; // Caracteres por chunk (aprox 1250 tokens)
const MAX_CHUNKS = 5; // Máximo de chunks a procesar

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.slice(0, MAX_CHUNKS);
}

// ============================================
// ESTADO DEL GRAFO
// ============================================

const ResearchState = Annotation.Root({
  query: Annotation<string>(),
  searchResults: Annotation<string>(),
  searchChunks: Annotation<string[]>({
    reducer: (curr, update) => update,
    default: () => [],
  }),
  currentChunkIndex: Annotation<number>({
    reducer: (curr, update) => update,
    default: () => 0,
  }),
  chunkAnalyses: Annotation<string[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  analysis: Annotation<string>(),
  finalDocument: Annotation<string>(),
  currentAgent: Annotation<string>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
});

type ResearchStateType = typeof ResearchState.State;

// ============================================
// NODOS DEL GRAFO (AGENTES)
// ============================================

function createSearcherNode(agent: WorkerAgent) {
  return async (state: ResearchStateType): Promise<Partial<ResearchStateType>> => {
    const result = await agent.invoke(state.query);
    const chunks = splitIntoChunks(result, CHUNK_SIZE);

    console.log(chalk.gray(`    ${figures.arrowRight} Resultados divididos en ${chunks.length} chunks`));

    return {
      searchResults: result,
      searchChunks: chunks,
      currentChunkIndex: 0,
      currentAgent: 'Buscador',
      messages: [new HumanMessage(`[Buscador] Encontrados ${chunks.length} segmentos de información`)],
    };
  };
}

function createChunkReaderNode(agent: WorkerAgent) {
  return async (state: ResearchStateType): Promise<Partial<ResearchStateType>> => {
    const chunkIndex = state.currentChunkIndex;
    const chunks = state.searchChunks;

    if (chunkIndex >= chunks.length) {
      return { currentAgent: 'Lector' };
    }

    const chunk = chunks[chunkIndex];
    console.log(chalk.blue(`    ${figures.arrowRight} Procesando chunk ${chunkIndex + 1}/${chunks.length}`));

    const input = `Analiza este segmento de información sobre "${state.query}" (parte ${chunkIndex + 1} de ${chunks.length}):\n\n${chunk}\n\nExtrae los puntos clave de forma concisa.`;

    const result = await agent.invoke(input);

    return {
      chunkAnalyses: [result],
      currentChunkIndex: chunkIndex + 1,
      currentAgent: 'Lector',
      messages: [new HumanMessage(`[Lector] Chunk ${chunkIndex + 1} analizado`)],
    };
  };
}

function createSynthesizerNode(agent: WorkerAgent) {
  return async (state: ResearchStateType): Promise<Partial<ResearchStateType>> => {
    console.log(chalk.blue(`    ${figures.arrowRight} Sintetizando ${state.chunkAnalyses.length} análisis`));

    const combinedAnalysis = state.chunkAnalyses.join('\n\n---\n\n');
    const input = `Sintetiza estos análisis parciales sobre "${state.query}" en un análisis unificado y coherente:\n\n${combinedAnalysis}`;

    const result = await agent.invoke(input);

    return {
      analysis: result,
      currentAgent: 'Sintetizador',
      messages: [new HumanMessage(`[Sintetizador] Análisis unificado completado`)],
    };
  };
}

function createWriterNode(agent: WorkerAgent) {
  return async (state: ResearchStateType): Promise<Partial<ResearchStateType>> => {
    const input = `Crea un documento de investigación sobre "${state.query}" basado en este análisis:\n\n${state.analysis}`;

    const result = await agent.invoke(input);

    return {
      finalDocument: result,
      currentAgent: 'Escritor',
      messages: [new HumanMessage(`[Escritor] ${result}`)],
    };
  };
}

// ============================================
// NODO SUPERVISOR
// ============================================

function createSupervisorNode() {
  return async (state: ResearchStateType): Promise<Partial<ResearchStateType>> => {
    console.log(chalk.yellow(`\n${figures.pointer} Supervisor evaluando estado...`));

    // 1. Buscar información
    if (!state.searchResults) {
      console.log(chalk.gray(`  ${figures.arrowRight} Siguiente: Buscador`));
      return { currentAgent: 'searcher' };
    }

    // 2. Procesar chunks pendientes
    if (state.currentChunkIndex < state.searchChunks.length) {
      console.log(chalk.gray(`  ${figures.arrowRight} Siguiente: Lector (chunk ${state.currentChunkIndex + 1}/${state.searchChunks.length})`));
      return { currentAgent: 'chunk_reader' };
    }

    // 3. Sintetizar análisis de chunks
    if (!state.analysis && state.chunkAnalyses.length > 0) {
      console.log(chalk.gray(`  ${figures.arrowRight} Siguiente: Sintetizador`));
      return { currentAgent: 'synthesizer' };
    }

    // 4. Escribir documento final
    if (!state.finalDocument) {
      console.log(chalk.gray(`  ${figures.arrowRight} Siguiente: Escritor`));
      return { currentAgent: 'writer' };
    }

    console.log(chalk.green(`  ${figures.tick} Investigación completada`));
    return { currentAgent: 'end' };
  };
}

// ============================================
// FUNCIÓN DE ROUTING
// ============================================

function routeNext(state: ResearchStateType): string {
  const agent = state.currentAgent;

  if (agent === 'end') return END;
  if (agent === 'searcher') return 'searcher';
  if (agent === 'chunk_reader') return 'chunk_reader';
  if (agent === 'synthesizer') return 'synthesizer';
  if (agent === 'writer') return 'writer';

  return 'supervisor';
}

// ============================================
// CREAR EL GRAFO
// ============================================

export function createResearchGraph(llm: BaseChatModel) {
  // Buscador usa Perplexity sonar-deep-research para búsquedas reales
  const perplexityLLM = createPerplexityLLM();
  const searcherAgent = createSearcherAgent(perplexityLLM);

  // Lector, Sintetizador y Escritor usan GitHub Models (gpt-4o)
  const readerAgent = createReaderAgent(llm);
  const synthesizerAgent = createSynthesizerAgent(llm);
  const writerAgent = createWriterAgent(llm);

  const graph = new StateGraph(ResearchState)
    .addNode('supervisor', createSupervisorNode())
    .addNode('searcher', createSearcherNode(searcherAgent))
    .addNode('chunk_reader', createChunkReaderNode(readerAgent))
    .addNode('synthesizer', createSynthesizerNode(synthesizerAgent))
    .addNode('writer', createWriterNode(writerAgent))
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', routeNext)
    .addEdge('searcher', 'supervisor')
    .addEdge('chunk_reader', 'supervisor')
    .addEdge('synthesizer', 'supervisor')
    .addEdge('writer', 'supervisor');

  return graph.compile();
}

// ============================================
// EJECUTAR INVESTIGACIÓN
// ============================================

export async function runResearch(llm: BaseChatModel, query: string): Promise<{
  result: string;
  states: string[];
}> {
  console.log(chalk.cyan(`\n${figures.play} Iniciando sistema multi-agente con chunking...`));
  console.log(chalk.gray(`    ${figures.info} Chunk size: ${CHUNK_SIZE} chars | Max chunks: ${MAX_CHUNKS}`));

  const graph = createResearchGraph(llm);
  const states: string[] = [];

  const initialState: Partial<ResearchStateType> = {
    query,
    searchResults: '',
    searchChunks: [],
    currentChunkIndex: 0,
    chunkAnalyses: [],
    analysis: '',
    finalDocument: '',
    currentAgent: '',
    messages: [],
  };

  const finalState = await graph.invoke(initialState);

  return {
    result: finalState.finalDocument || finalState.analysis || 'Sin resultados',
    states,
  };
}
