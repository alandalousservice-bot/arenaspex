import { describe, expect, it } from 'vitest';
import { hasFeatureAccess, providerIsUsable } from '../src/server/generationAccess.policy';

describe('generation access policy', () => {
  it('requires account and feature permission', () => {
    const access = { enabled: true, assistantEnabled: false, gameSuggestionsEnabled: true };
    expect(hasFeatureAccess(null, 'SUGGEST_GAMES')).toBe(false);
    expect(hasFeatureAccess(access, 'SUGGEST_GAMES')).toBe(true);
    expect(hasFeatureAccess(access, 'ASSISTANT')).toBe(false);
  });
  it('accepts only usable configured providers', () => {
    expect(providerIsUsable({ enabled: true, keyConfigured: true, type: 'gemini' })).toBe(true);
    expect(providerIsUsable({ enabled: true, keyConfigured: false, type: 'ollama' })).toBe(true);
    expect(providerIsUsable({ enabled: false, keyConfigured: true, type: 'gemini' })).toBe(false);
  });
});
