// Supervisor LLM Conversacional
// Un agente inteligente que puede conversar y asignar tareas de investigación

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import chalk from "chalk";
import figures from "figures";

export interface SupervisorResponse {
  message: string;
  shouldResearch: boolean;
  researchQuery: string | null;
  researchCompleted?: boolean;
  researchResult?: string;
}

export interface ConversationContext {
  messages: BaseMessage[];
  completedResearches: Array<{
    query: string;
    result: string;
    timestamp: Date;
  }>;
}

const SUPERVISOR_SYSTEM_PROMPT = `Eres DokiResearch, un asistente de investigación inteligente y conversacional.

Tu personalidad:
- Eres amable, profesional y útil
- Te gusta investigar y compartir conocimiento
- Respondes en español de forma natural y conversacional

Tus capacidades:
1. CONVERSAR: Puedes hablar con el usuario sobre cualquier tema
2. INVESTIGAR: Cuando el usuario te pide investigar algo, usas la herramienta "iniciar_investigacion"
3. RECORDAR: Recuerdas las investigaciones previas y el contexto de la conversación

Cuándo usar la herramienta de investigación:
- Cuando el usuario dice explícitamente "investiga", "busca información sobre", "quiero saber sobre", "analiza el tema de", etc.
- Cuando el usuario hace preguntas complejas que requieren búsqueda en internet
- NO uses la herramienta para preguntas simples o conversación casual

Cuándo NO usar la herramienta:
- Saludos y despedidas
- Preguntas sobre ti mismo o tus capacidades
- Conversación casual
- Preguntas que puedes responder con tu conocimiento general
- Cuando el usuario solo quiere discutir resultados de investigaciones anteriores

Después de una investigación:
- Resume los puntos más importantes
- Pregunta si el usuario quiere profundizar en algún aspecto
- Ofrece hacer investigaciones relacionadas

Formato de respuesta:
- Sé conciso pero informativo
- Usa emojis ocasionalmente para ser más amigable
- Si vas a investigar, informa al usuario que comenzarás la investigación`;

export class SupervisorAgent {
  private llm: BaseChatModel;
  private context: ConversationContext;
  private tools: DynamicStructuredTool[];
  private pendingResearch: string | null = null;

  constructor(llm: BaseChatModel) {
    this.llm = llm;
    this.context = {
      messages: [],
      completedResearches: [],
    };

    // Herramienta para iniciar investigación
    this.tools = [
      new DynamicStructuredTool({
        name: "iniciar_investigacion",
        description:
          'Inicia una investigación profunda sobre un tema específico. Usa esta herramienta cuando el usuario solicite investigar, buscar información detallada o analizar un tema a fondo. Siempre usa profundidad "media" a menos que el usuario pida explícitamente algo básico o muy profundo.',
        schema: z.object({
          tema: z.string().describe("El tema o pregunta a investigar"),
          profundidad: z
            .enum(["basica", "media", "profunda"])
            .describe(
              "Nivel de profundidad de la investigación: basica, media o profunda",
            ),
        }),
        func: async ({ tema, profundidad }) => {
          this.pendingResearch = tema;
          console.log(
            chalk.cyan(
              `\n${figures.pointer} Investigación solicitada: "${tema}" (${profundidad})`,
            ),
          );
          return JSON.stringify({
            status: "pending",
            tema,
            profundidad,
            message: `Investigación sobre "${tema}" iniciada con profundidad ${profundidad}`,
          });
        },
      }),
    ];
  }

  /**
   * Obtener el historial de mensajes para contexto
   */
  private getConversationHistory(): string {
    if (this.context.completedResearches.length === 0) {
      return "";
    }

    const researches = this.context.completedResearches
      .map(
        (r, i) =>
          `[Investigación ${i + 1}] "${r.query}": ${r.result.substring(0, 500)}...`,
      )
      .join("\n\n");

    return `\n\nInvestigaciones completadas anteriormente:\n${researches}`;
  }

  /**
   * Procesar un mensaje del usuario
   */
  async chat(userMessage: string): Promise<SupervisorResponse> {
    console.log(
      chalk.yellow(`\n${figures.pointer} Supervisor procesando mensaje...`),
    );

    // Agregar mensaje del usuario al contexto
    const humanMessage = new HumanMessage(userMessage);
    this.context.messages.push(humanMessage);

    // Construir el prompt del sistema con contexto
    const historyContext = this.getConversationHistory();
    const systemPrompt = SUPERVISOR_SYSTEM_PROMPT + historyContext;

    // Preparar mensajes para el LLM
    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...this.context.messages.slice(-10), // Últimos 10 mensajes para contexto
    ];

    // Invocar LLM con herramientas
    const llmWithTools = this.llm.bindTools!(this.tools);
    let response = await llmWithTools.invoke(messages);

    // Verificar si hay llamadas a herramientas
    let shouldResearch = false;
    let researchQuery: string | null = null;

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        if (toolCall.name === "iniciar_investigacion") {
          shouldResearch = true;
          researchQuery = toolCall.args.tema as string;

          // Ejecutar la herramienta
          const tool = this.tools.find((t) => t.name === toolCall.name);
          if (tool) {
            await tool.invoke(toolCall.args);
          }
        }
      }

      // Si hay investigación pendiente, obtener respuesta final del LLM
      if (shouldResearch) {
        // Agregar respuesta de herramienta al contexto
        messages.push(response);
        messages.push({
          role: "tool",
          content: JSON.stringify({ status: "iniciando", tema: researchQuery }),
          tool_call_id: response.tool_calls[0].id,
        } as any);

        response = await llmWithTools.invoke(messages);
      }
    }

    // Extraer el contenido del mensaje
    const aiMessageContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Guardar respuesta en contexto
    this.context.messages.push(new AIMessage(aiMessageContent));

    console.log(chalk.green(`${figures.tick} Supervisor respondió`));

    return {
      message: aiMessageContent,
      shouldResearch,
      researchQuery,
    };
  }

  /**
   * Notificar que una investigación se completó
   */
  async onResearchCompleted(
    query: string,
    result: string,
  ): Promise<SupervisorResponse> {
    // Guardar en historial de investigaciones
    this.context.completedResearches.push({
      query,
      result,
      timestamp: new Date(),
    });

    // Limpiar investigación pendiente
    this.pendingResearch = null;

    // Generar resumen y respuesta
    const summaryPrompt = `La investigación sobre "${query}" se ha completado. Aquí están los resultados:

${result}

Por favor:
1. Resume los puntos más importantes en 3-5 puntos
2. Pregunta al usuario si quiere profundizar en algún aspecto
3. Sugiere temas relacionados que podrían interesarle`;

    const messages: BaseMessage[] = [
      new SystemMessage(SUPERVISOR_SYSTEM_PROMPT),
      ...this.context.messages.slice(-6),
      new HumanMessage(summaryPrompt),
    ];

    const response = await this.llm.invoke(messages);
    const aiMessageContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Guardar en contexto
    this.context.messages.push(new AIMessage(aiMessageContent));

    return {
      message: aiMessageContent,
      shouldResearch: false,
      researchQuery: null,
      researchCompleted: true,
      researchResult: result,
    };
  }

  /**
   * Obtener investigaciones completadas
   */
  getCompletedResearches() {
    return this.context.completedResearches;
  }

  /**
   * Limpiar contexto de conversación
   */
  clearContext() {
    this.context.messages = [];
    console.log(
      chalk.gray(`${figures.info} Contexto de conversación limpiado`),
    );
  }

  /**
   * Limpiar todo (incluyendo investigaciones)
   */
  reset() {
    this.context = {
      messages: [],
      completedResearches: [],
    };
    this.pendingResearch = null;
    console.log(
      chalk.gray(`${figures.info} Supervisor reiniciado completamente`),
    );
  }
}
