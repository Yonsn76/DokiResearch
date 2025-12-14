// Cliente LangChain con GitHub Models
// https://models.github.ai/inference

import { ChatOpenAI } from '@langchain/openai';

export interface GitHubModelsConfig {
  model?: string;
  temperature?: number;
}

export function createLLM(config: GitHubModelsConfig = {}): ChatOpenAI {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      'GITHUB_TOKEN no configurado. Agrégalo en el archivo .env\n' +
      'Obtén tu token en: https://github.com/settings/tokens'
    );
  }

  return new ChatOpenAI({
    model: config.model || process.env.MODEL_NAME || 'gpt-4o',
    temperature: config.temperature ?? 0.7,
    apiKey: token,
    configuration: {
      baseURL: 'https://models.inference.ai.azure.com',
    },
  });
}
