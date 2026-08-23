import { prisma } from './prismaClient.js';
import { hasFeatureAccess } from './generationAccess.policy.js';
import { decryptApiKey } from './auth.js';

export type GenerationFeature = 'ASSISTANT' | 'SUGGEST_GAMES' | 'LESSON_GENERATION' | 'IMPROVE_WORDING';

export interface UserGenerationCredential {
  provider: 'gemini';
  apiKey: string;
  model?: string;
  source: 'user-account';
}

export async function resolveUserGenerationCredential(userId: string, feature: GenerationFeature): Promise<{ access: { enabled: boolean; assistantEnabled: boolean; gameSuggestionsEnabled: boolean } | null; credential: UserGenerationCredential | null; error?: { code: string; message: string } }> {
  const config = await prisma.generationServiceConfig.findUnique({ where: { id: 'default' } }).catch(() => null);
  if (config && !config.enabled) return { access: null, credential: null, error: { code: 'SERVICE_DISABLED', message: 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.' } };
  const access = await prisma.userGenerationAccess.findUnique({ where: { userId } }).catch(() => null);
  if (!hasFeatureAccess(access, feature)) return { access, credential: null, error: { code: 'SERVICE_NOT_ENABLED', message: feature === 'SUGGEST_GAMES' ? 'خدمة اقتراح الألعاب غير مفعلة لحسابك.' : feature === 'ASSISTANT' ? 'خدمة المساعد غير مفعلة لحسابك.' : 'هذه الخدمة غير مفعلة لحسابك.' } };
  if (!access?.credentialEnabled || !access.encryptedApiKey || access.provider !== 'gemini') return { access, credential: null, error: { code: 'CREDENTIAL_UNAVAILABLE', message: 'الخدمة غير متاحة حالياً. يرجى التواصل مع المشرف.' } };
  try {
    const apiKey = decryptApiKey(access.encryptedApiKey);
    if (!apiKey) throw new Error('empty credential');
    return { access, credential: { provider: 'gemini', apiKey, source: 'user-account' } };
  } catch {
    return { access, credential: null, error: { code: 'CREDENTIAL_UNAVAILABLE', message: 'الخدمة غير متاحة حالياً. يرجى التواصل مع المشرف.' } };
  }
}

export async function checkGenerationAccess(userId: string, feature: GenerationFeature) {
  const resolved = await resolveUserGenerationCredential(userId, feature);
  return resolved.error ? { allowed: false, ...resolved.error } : { allowed: true as const };
}
