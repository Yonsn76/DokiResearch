// Agentes Worker independientes
// Cada uno es un agente completo con su propio LLM

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import chalk from 'chalk';
import figures from 'figures';

// ============================================
// HERRAMIENTAS PARA LECTOR
// ============================================

const readTools = [
  new DynamicStructuredTool({
    name: 'extract_content',
    description: 'Extraer contenido de una URL',
    schema: z.object({
      url: z.string().describe('URL para extraer'),
    }),
    func: async ({ url }) => {
      console.log(chalk.gray(`    ${figures.arrowRight} Extrayendo: ${url}`));
      await new Promise(r => setTimeout(r, 400));
      return JSON.stringify({
        title: `Contenido de ${url}`,
        content: `Contenido extraído con información relevante sobre el tema.`,
      });
    },
  }),
];

// ============================================
// CLASE WORKER AGENT
// ============================================

export class WorkerAgent {
  private llm: BaseChatModel;
  private name: string;
  private systemPrompt: string;
  private tools: DynamicStructuredTool[];

  constructor(
    llm: BaseChatModel,
    name: string,
    systemPrompt: string,
    tools: DynamicStructuredTool[] = []
  ) {
    this.llm = llm;
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
  }

  getName(): string {
    return this.name;
  }

  async invoke(task: string): Promise<string> {
    console.log(chalk.blue(`\n  ${figures.pointer} [${this.name}] Procesando tarea...`));
    const startTime = Date.now();

    const messages: BaseMessage[] = [
      new SystemMessage(this.systemPrompt),
      new HumanMessage(task),
    ];

    // Si no hay herramientas, llamar directamente al LLM
    if (this.tools.length === 0) {
      const response = await this.llm.invoke(messages);
      const duration = Date.now() - startTime;
      console.log(chalk.green(`  ${figures.tick} [${this.name}] Completado en ${duration}ms`));

      return typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    }

    // Con herramientas
    const llmWithTools = this.llm.bindTools!(this.tools);
    let response = await llmWithTools.invoke(messages);
    messages.push(response);

    const maxIterations = 3;
    let iterations = 0;
    const executedTools = new Set<string>();

    while (response.tool_calls && response.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;

      for (const toolCall of response.tool_calls) {
        const toolKey = `${toolCall.name}:${JSON.stringify(toolCall.args)}`;
        if (executedTools.has(toolKey)) continue;
        executedTools.add(toolKey);

        const tool = this.tools.find(t => t.name === toolCall.name);
        if (tool) {
          const result = await tool.invoke(toolCall.args);
          messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          } as any);
        }
      }

      response = await llmWithTools.invoke(messages);
      messages.push(response);

      if (!response.tool_calls || response.tool_calls.length === 0) break;
    }

    const duration = Date.now() - startTime;
    console.log(chalk.green(`  ${figures.tick} [${this.name}] Completado en ${duration}ms`));

    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Agente Buscador - Usa Perplexity sonar-deep-research
 * Busca información real en internet
 */
export function createSearcherAgent(llm: BaseChatModel): WorkerAgent {
  return new WorkerAgent(
    llm,
    'Buscador',
    `Eres un agente de investigación. Tu trabajo es buscar y recopilar información sobre el tema solicitado.

Instrucciones:
1. Investiga el tema a fondo
2. Incluye datos, estadísticas y hechos relevantes
3. Cita las fuentes cuando sea posible
4. Organiza la información de forma clara
5. Responde en español

Devuelve toda la información encontrada de forma estructurada.`,
    [] // Sin herramientas - Perplexity busca directamente
  );
}

/**
 * Agente Lector - Analiza y sintetiza información
 */
export function createReaderAgent(llm: BaseChatModel): WorkerAgent {
  return new WorkerAgent(
    llm,
    'Lector',
    `Eres el agente LECTOR. Tu trabajo es analizar y sintetizar información.

Cuando recibas información de búsqueda:
1. Identifica los puntos más importantes
2. Organiza la información por temas
3. Extrae datos clave y estadísticas
4. Crea un análisis estructurado

Responde en español con un análisis claro y organizado.`,
    readTools
  );
}

/**
 * Agente Sintetizador - Combina y unifica análisis parciales
 */
export function createSynthesizerAgent(llm: BaseChatModel): WorkerAgent {
  return new WorkerAgent(
    llm,
    'Sintetizador',
    `Eres el agente SINTETIZADOR. Tu trabajo es combinar múltiples análisis parciales en uno coherente.

Cuando recibas varios análisis:
1. Identifica temas comunes y conexiones entre los análisis
2. Elimina redundancias y consolida información duplicada
3. Crea una narrativa unificada que fluya naturalmente
4. Prioriza los insights más relevantes y valiosos
5. Mantén la estructura lógica: contexto → desarrollo → conclusiones

Responde en español con un análisis integrado, coherente y bien estructurado.`,
    [] // Sin herramientas - sintetiza directamente
  );
}

/**
 * Agente Escritor - Crea el documento final
 */
export function createWriterAgent(llm: BaseChatModel): WorkerAgent {
  return new WorkerAgent(
    llm,
    'Escritor',
    `Eres el agente ESCRITOR. Tu trabajo es crear documentos profesionales.

IMPORTANTE: Escribe el documento directamente en tu respuesta.

Instrucciones:
1. Crea un documento con estructura clara (encabezados markdown #, ##, ###)
2. Incluye: Introducción, Desarrollo (varias secciones), Conclusión
3. Usa datos y estadísticas del análisis recibido
4. Escribe de forma profesional y detallada
5. Escribe en español

Tu respuesta debe ser el documento completo en formato markdown.`,
    [] // Sin herramientas - escribe directamente
  );
}
