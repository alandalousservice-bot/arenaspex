import {
  deterministicPedagogicalGenerationProvider,
  type PedagogicalGenerationProvider,
} from '../pedagogicalGeneration.service.js';
import { OpenAIPedagogicalGenerationProvider } from './openaiPedagogicalGeneration.provider.js';
import { GeminiPedagogicalGenerationProvider } from './geminiPedagogicalGeneration.provider.js';

export function resolveConfiguredPedagogicalGenerationProvider(): PedagogicalGenerationProvider | null {
  const configured = (process.env.PEDAGOGICAL_GENERATION_PROVIDER || '').trim().toLowerCase();
  if (configured === 'openai') return new OpenAIPedagogicalGenerationProvider();
  if (configured === 'gemini') return new GeminiPedagogicalGenerationProvider();
  if (
    configured === 'deterministic' ||
    (process.env.NODE_ENV !== 'production' &&
      process.env.PEDAGOGICAL_GENERATION_ALLOW_LOCAL === 'true')
  ) {
    return deterministicPedagogicalGenerationProvider;
  }
  return null;
}
