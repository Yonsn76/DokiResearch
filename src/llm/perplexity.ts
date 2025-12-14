// Cliente Perplexity para búsquedas con sonar-deep-research
// https://docs.perplexity.ai/

import { ChatOpenAI } from '@langchain/openai';

export function createPerplexityLLM(): ChatOpenAI {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error(
      'PERPLEXITY_API_KEY no configurado. Agrégalo en el archivo .env\n' +
      'Obtén tu API key en: https://www.perplexity.ai/settings/api'
    );
  }

  return new ChatOpenAI({
    model: 'sonar-deep-research',
    apiKey,
    configuration: {
      baseURL: 'https://api.perplexity.ai',
    },
  });
}
