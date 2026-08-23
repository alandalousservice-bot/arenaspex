import type { GenerationFeature } from './generationAccess.js';

export function hasFeatureAccess(access: { enabled: boolean; assistantEnabled: boolean; gameSuggestionsEnabled: boolean } | null, feature: GenerationFeature): boolean {
  if (!access?.enabled) return false;
  if (feature === 'ASSISTANT') return access.assistantEnabled;
  if (feature === 'SUGGEST_GAMES') return access.gameSuggestionsEnabled;
  return true;
}

export function providerIsUsable(provider: { enabled: boolean; keyConfigured: boolean; type: string; baseUrl?: string }): boolean {
  return provider.enabled && (provider.keyConfigured || provider.type === 'ollama' || (provider.type === 'openai-compatible' && Boolean(provider.baseUrl)));
}

export function chooseGenerationCredential<TPersonal, TFallback>(personal: TPersonal | null, fallback: TFallback | null): TPersonal | TFallback | null {
  return personal || fallback;
}
