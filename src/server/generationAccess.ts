import { prisma } from './prismaClient.js';
import { allAIProviderRecords } from './aiGateway.js';
import { hasFeatureAccess, providerIsUsable } from './generationAccess.policy.js';

export type GenerationFeature = 'ASSISTANT' | 'SUGGEST_GAMES' | 'LESSON_GENERATION' | 'IMPROVE_WORDING';

export async function checkGenerationAccess(userId: string, feature: GenerationFeature) {
  const config = await prisma.generationServiceConfig.findUnique({ where: { id: 'default' } }).catch(() => null);
  if (config && !config.enabled) return { allowed: false, code: 'SERVICE_DISABLED', message: feature === 'SUGGEST_GAMES' ? 'خدمة اقتراح الألعاب غير مفعلة حالياً.' : 'هذه الخدمة غير مفعلة حالياً.' };
  const access = await prisma.userGenerationAccess.findUnique({ where: { userId } }).catch(() => null);
  if (!hasFeatureAccess(access, feature)) return { allowed: false, code: 'SERVICE_NOT_ENABLED', message: feature === 'SUGGEST_GAMES' ? 'خدمة اقتراح الألعاب غير مفعلة لحسابك.' : feature === 'ASSISTANT' ? 'خدمة المساعد غير مفعلة لحسابك.' : 'هذه الخدمة غير مفعلة لحسابك.' };
  const providers = await allAIProviderRecords();
  const configured = providers.some(providerIsUsable);
  if (!configured) return { allowed: false, code: 'PROVIDER_UNAVAILABLE', message: 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً.' };
  return { allowed: true as const };
}
