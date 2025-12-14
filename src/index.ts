// DokiResearch - Sistema Multi-Agente de Investigacion
// LangGraph + LangChain.js + GitHub Models + Perplexity

import 'dotenv/config';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import figures from 'figures';
import boxen from 'boxen';
import { createLLM } from './llm/github-models.js';
import { runResearch } from './graph/research-graph.js';

function printHeader(): void {
  const title = boxen(
    chalk.bold.cyan('DokiResearch\n') +
    chalk.gray('Sistema Multi-Agente de Investigacion\n\n') +
    chalk.white('LangGraph + GitHub Models + Perplexity'),
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

function printArchitecture(): void {
  console.log(chalk.gray(`
  ┌───────────────────────────────────────────┐
  │              SUPERVISOR                   │
  │       (decide que agente trabaja)         │
  └─────────────────┬─────────────────────────┘
                    │
     ┌──────────────┼──────────────┬──────────────┐
     │              │              │              │
     ▼              ▼              ▼              ▼
  ┌───────┐   ┌────────┐   ┌────────────┐   ┌────────┐
  │BUSCA- │   │ LECTOR │   │SINTETIZA-  │   │ESCRITOR│
  │DOR    │   │        │   │DOR         │   │        │
  └───────┘   └────────┘   └────────────┘   └────────┘
  Perplexity   Analiza      Combina         Genera
               chunks       analisis        documento
  `));
}

function printQuery(query: string): void {
  console.log(chalk.bold.white(`${figures.arrowRight} Consulta:`), chalk.yellow(query));
  console.log(chalk.gray('─'.repeat(60)));
}

function printModel(model: string): void {
  console.log(chalk.gray(`${figures.pointer} Modelo: ${model}\n`));
}

function printResults(result: string): void {
  const resultsBox = boxen(result, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'green',
    title: 'Documento Final',
    titleAlignment: 'center',
  });
  console.log(resultsBox);
}

function printError(error: unknown): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.log(boxen(
    chalk.red(`${logSymbols.error} ${errorMsg}\n\n`) +
    chalk.yellow(`${figures.warning} Verifica tu configuración:\n`) +
    chalk.white('   1. Crea un archivo .env con tu GITHUB_TOKEN\n') +
    chalk.white('   2. Obtén tu token en: https://github.com/settings/tokens'),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'red',
      title: 'Error',
      titleAlignment: 'center',
    }
  ));
}

async function main() {
  printHeader();
  printArchitecture();

  const query = process.argv[2] || '¿Cuáles son los beneficios de TypeScript para proyectos grandes?';
  printQuery(query);

  const model = process.env.MODEL_NAME || 'gpt-4o';
  printModel(model);

  try {
    const llm = createLLM({ model });

    const startTime = Date.now();
    const { result } = await runResearch(llm, query);
    const duration = Date.now() - startTime;

    printResults(result);

    console.log(chalk.gray(`\nTiempo total: ${(duration / 1000).toFixed(2)}s`));
    console.log(`\n${logSymbols.success} ${chalk.green('Investigación completada')}\n`);

  } catch (error) {
    printError(error);
    process.exit(1);
  }
}

main();
