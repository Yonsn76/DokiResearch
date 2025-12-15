// DokiResearch - CLI Conversacional Interactivo
// Chat con el Supervisor LLM que puede asignar investigaciones

import 'dotenv/config';
import * as readline from 'readline';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import figures from 'figures';
import boxen from 'boxen';
import { createLLM } from './llm/github-models.js';
import { SupervisorAgent } from './supervisor/supervisor-agent.js';
import { runResearch } from './graph/research-graph.js';

// ============================================
// INTERFAZ DE USUARIO
// ============================================

function printHeader(): void {
  const title = boxen(
    chalk.bold.cyan('🔬 DokiResearch Chat\n') +
    chalk.gray('Sistema Multi-Agente Conversacional\n\n') +
    chalk.white('Habla conmigo y pídeme investigar cualquier tema'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      textAlignment: 'center',
    }
  );
  console.log(title);
}

function printHelp(): void {
  console.log(chalk.gray(`
  ${chalk.bold('Comandos disponibles:')}
  ${chalk.cyan('/help')}      - Mostrar esta ayuda
  ${chalk.cyan('/clear')}     - Limpiar historial de conversación
  ${chalk.cyan('/reset')}     - Reiniciar completamente (incluye investigaciones)
  ${chalk.cyan('/history')}   - Ver investigaciones completadas
  ${chalk.cyan('/exit')}      - Salir del chat

  ${chalk.bold('Ejemplos de uso:')}
  ${chalk.yellow('>')} Hola, ¿qué puedes hacer?
  ${chalk.yellow('>')} Investiga sobre inteligencia artificial en 2024
  ${chalk.yellow('>')} Busca información sobre el cambio climático
  ${chalk.yellow('>')} ¿Qué encontraste sobre IA?
  ${chalk.yellow('>')} Profundiza en el tema de machine learning
  `));
}

function printWelcome(): void {
  console.log(chalk.cyan(`\n${figures.star} ¡Bienvenido a DokiResearch Chat!`));
  console.log(chalk.gray(`  Escribe ${chalk.cyan('/help')} para ver los comandos disponibles.`));
  console.log(chalk.gray(`  Puedes conversar conmigo o pedirme que investigue cualquier tema.\n`));
}

function printResearchStart(query: string): void {
  console.log(boxen(
    chalk.yellow(`${figures.pointer} Iniciando investigación...\n\n`) +
    chalk.white(`Tema: "${query}"\n\n`) +
    chalk.gray('Esto puede tomar unos momentos...'),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
      title: '🔍 Investigación',
      titleAlignment: 'center',
    }
  ));
}

function printResearchComplete(): void {
  console.log(chalk.green(`\n${logSymbols.success} Investigación completada\n`));
}

function printSupervisorMessage(message: string): void {
  console.log(chalk.cyan(`\n${figures.pointer} DokiResearch:`));
  console.log(chalk.white(`  ${message.split('\n').join('\n  ')}\n`));
}

function printUserPrompt(): void {
  process.stdout.write(chalk.yellow(`${figures.pointer} Tú: `));
}

function printHistory(researches: Array<{ query: string; result: string; timestamp: Date }>): void {
  if (researches.length === 0) {
    console.log(chalk.gray(`\n${figures.info} No hay investigaciones completadas aún.\n`));
    return;
  }

  console.log(chalk.cyan(`\n${figures.pointer} Investigaciones completadas (${researches.length}):\n`));

  researches.forEach((r, i) => {
    console.log(chalk.white(`  ${i + 1}. ${chalk.bold(r.query)}`));
    console.log(chalk.gray(`     ${r.timestamp.toLocaleString()}`));
    console.log(chalk.gray(`     ${r.result.substring(0, 100)}...\n`));
  });
}

function printGoodbye(): void {
  console.log(boxen(
    chalk.cyan('¡Hasta pronto! 👋\n\n') +
    chalk.gray('Gracias por usar DokiResearch'),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center',
    }
  ));
}

// ============================================
// PROCESAMIENTO DE COMANDOS
// ============================================

async function handleCommand(
  command: string,
  supervisor: SupervisorAgent
): Promise<boolean> {
  switch (command.toLowerCase()) {
    case '/help':
      printHelp();
      return true;

    case '/clear':
      supervisor.clearContext();
      console.log(chalk.green(`${logSymbols.success} Historial de conversación limpiado.\n`));
      return true;

    case '/reset':
      supervisor.reset();
      console.log(chalk.green(`${logSymbols.success} Sistema reiniciado completamente.\n`));
      return true;

    case '/history':
      printHistory(supervisor.getCompletedResearches());
      return true;

    case '/exit':
    case '/quit':
    case '/salir':
      return false;

    default:
      if (command.startsWith('/')) {
        console.log(chalk.red(`${logSymbols.error} Comando no reconocido: ${command}`));
        console.log(chalk.gray(`  Escribe ${chalk.cyan('/help')} para ver los comandos disponibles.\n`));
      }
      return true;
  }
}

// ============================================
// LOOP PRINCIPAL DE CHAT
// ============================================

async function chatLoop(supervisor: SupervisorAgent, llm: ReturnType<typeof createLLM>): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): Promise<string> => {
    return new Promise((resolve) => {
      printUserPrompt();
      rl.once('line', (answer) => {
        resolve(answer.trim());
      });
    });
  };

  printWelcome();

  // Saludo inicial del supervisor
  const greeting = await supervisor.chat('Hola, preséntate brevemente.');
  printSupervisorMessage(greeting.message);

  // Loop de conversación
  while (true) {
    const userInput = await askQuestion();

    // Entrada vacía
    if (!userInput) {
      continue;
    }

    // Verificar si es un comando
    if (userInput.startsWith('/')) {
      const shouldContinue = await handleCommand(userInput, supervisor);
      if (!shouldContinue) {
        break;
      }
      continue;
    }

    try {
      // Procesar mensaje con el supervisor
      const response = await supervisor.chat(userInput);

      // Si el supervisor decide investigar
      if (response.shouldResearch && response.researchQuery) {
        printSupervisorMessage(response.message);
        printResearchStart(response.researchQuery);

        // Ejecutar la investigación con el sistema multi-agente
        const startTime = Date.now();
        const { result } = await runResearch(llm, response.researchQuery);
        const duration = Date.now() - startTime;

        printResearchComplete();
        console.log(chalk.gray(`  Tiempo: ${(duration / 1000).toFixed(2)}s\n`));

        // Notificar al supervisor que la investigación terminó
        const completionResponse = await supervisor.onResearchCompleted(
          response.researchQuery,
          result
        );

        printSupervisorMessage(completionResponse.message);
      } else {
        // Respuesta normal de conversación
        printSupervisorMessage(response.message);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\n${logSymbols.error} Error: ${errorMsg}\n`));
    }
  }

  rl.close();
  printGoodbye();
}

// ============================================
// MAIN
// ============================================

async function main() {
  printHeader();

  try {
    // Crear LLM
    const model = process.env.MODEL_NAME || 'gpt-4o';
    console.log(chalk.gray(`${figures.pointer} Modelo: ${model}\n`));

    const llm = createLLM({ model });

    // Crear Supervisor conversacional
    const supervisor = new SupervisorAgent(llm);

    // Iniciar chat
    await chatLoop(supervisor, llm);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(boxen(
      chalk.red(`${logSymbols.error} ${errorMsg}\n\n`) +
      chalk.yellow(`${figures.warning} Verifica tu configuración:\n`) +
      chalk.white('   1. Crea un archivo .env con tu GITHUB_TOKEN\n') +
      chalk.white('   2. Agrega PERPLEXITY_API_KEY para investigaciones\n') +
      chalk.white('   3. Obtén tokens en:\n') +
      chalk.gray('      - https://github.com/settings/tokens\n') +
      chalk.gray('      - https://www.perplexity.ai/settings/api'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
        title: 'Error',
        titleAlignment: 'center',
      }
    ));
    process.exit(1);
  }
}

main();
