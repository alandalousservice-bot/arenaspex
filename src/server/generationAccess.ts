import { prisma } from './prismaClient.js';
import { hasFeatureAccess, providerIsUsable, chooseGenerationCredential } from './generationAccess.policy.js';
import { decryptApiKey } from './auth.js';
import { allAIProviderRecords } from './aiGateway.js';

export type GenerationFeature = 'ASSISTANT' | 'SUGGEST_GAMES' | 'LESSON_GENERATION' | 'IMPROVE_WORDING';

export interface UserGenerationCredential {
  provider: 'gemini';
  apiKey: string;
  model?: string;
  source: 'personal' | 'platform_fallback';
}

type GenerationResolution = { access: { enabled: boolean; assistantEnabled: boolean; gameSuggestionsEnabled: boolean } | null; credential: UserGenerationCredential | null; error?: { code: string; message: string } };

async function resolvePersonalCredential(access: any): Promise<UserGenerationCredential | null> {
  if (!access?.credentialEnabled || !access.encryptedApiKey || access.provider !== 'gemini') return null;
  try {
    const apiKey = decryptApiKey(access.encryptedApiKey);
    return apiKey ? { provider: 'gemini', apiKey, source: 'personal' } : null;
  } catch { return null; }
}

export async function resolvePlatformFallbackCredential(): Promise<UserGenerationCredential | null> {
  const providers = await allAIProviderRecords();
  const fallback = providers.find((provider) => provider.type === 'gemini' && providerIsUsable(provider));
  return fallback?.apiKey ? { provider: 'gemini', apiKey: fallback.apiKey, model: fallback.model, source: 'platform_fallback' } : null;
}

export async function resolvePersonalGenerationCredential(userId: string): Promise<UserGenerationCredential | null> {
  const access = await prisma.userGenerationAccess.findUnique({ where: { userId } }).catch(() => null);
  return resolvePersonalCredential(access);
}

export async function resolveGenerationCredential(userId: string, feature: GenerationFeature): Promise<GenerationResolution> {
  const config = await prisma.generationServiceConfig.findUnique({ where: { id: 'default' } }).catch(() => null);
  if (config && !config.enabled) return { access: null, credential: null, error: { code: 'SERVICE_DISABLED', message: 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.' } };
  const access = await prisma.userGenerationAccess.findUnique({ where: { userId } }).catch(() => null);
  if (!hasFeatureAccess(access, feature)) return { access, credential: null, error: { code: 'SERVICE_NOT_ENABLED', message: feature === 'SUGGEST_GAMES' ? 'خدمة اقتراح الألعاب غير مفعلة لحسابك.' : feature === 'ASSISTANT' ? 'خدمة المساعد غير مفعلة لحسابك.' : 'هذه الخدمة غير مفعلة لحسابك.' } };
  const personal = await resolvePersonalCredential(access);
  if (personal) return { access, credential: chooseGenerationCredential(personal, null) };
  const fallback = await resolvePlatformFallbackCredential();
  if (fallback) return { access, credential: chooseGenerationCredential(null, fallback) };
  return { access, credential: null, error: { code: 'CREDENTIAL_UNAVAILABLE', message: 'الخدمة غير متاحة حالياً. يرجى التواصل مع المشرف.' } };
}

export const resolveUserGenerationCredential = resolveGenerationCredential;

export async function checkGenerationAccess(userId: string, feature: GenerationFeature) {
  const resolved = await resolveGenerationCredential(userId, feature);
  return resolved.error ? { allowed: false, ...resolved.error } : { allowed: true as const };
}
