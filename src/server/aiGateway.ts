/**
 * SPEX AI Gateway
 * بوابة مزودات ذكاء اصطناعي متعددة وغير مقيدة بمزود واحد.
 * تعمل مع: OpenAI و OpenAI-compatible (أي endpoint يطابق chat/completions) و
 * Anthropic و Google Gemini و NVIDIA NIM و Ollama (محلي بلا مفتاح).
 * يمكن للمشرف إضافة أي مزود مخصص من لوحة التحكم (يُخزَّن في قاعدة البيانات)
 * إضافة إلى مزودات البيئة (env) — مع fallback تلقائي بين كل المزودات المفعلة.
 */

import { prisma } from './prismaClient.js';
import { decryptApiKey } from './auth.js';

type ChatRole = 'system' | 'user' | 'assistant';
export type AIProviderType = 'openai' | 'nvidia' | 'anthropic' | 'gemini' | 'openai-compatible' | 'ollama';
export type AIProviderId = string;

export interface AIProviderRecord {
  id: AIProviderId;
  name: string;
  type: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  source: 'env' | 'db';
  keyConfigured: boolean;
}

export interface AIMessage {
  role: ChatRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
}

export interface AIResult {
  text: string;
  provider: AIProviderId;
  model: string;
}

export interface UserCredentialRuntime {
  provider: 'gemini';
  apiKey: string;
  model?: string;
  source: 'personal' | 'platform_fallback';
}

interface ProviderConfig {
  id: AIProviderId;
  type: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const env = (key: string) => process.env[key]?.trim() || '';

// -----------------------------------------------------------------------
// مزودات البيئة (env) — تظل تعمل دائماً حتى بدون قاعدة بيانات
// -----------------------------------------------------------------------
function envProviderRecords(): AIProviderRecord[] {
  const records: AIProviderRecord[] = [
    {
      id: 'nvidia',
      name: 'NVIDIA NIM',
      type: 'nvidia',
      apiKey: env('NVIDIA_API_KEY'),
      baseUrl: env('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1',
      model: env('NVIDIA_MODEL') || 'meta/llama-3.1-8b-instruct',
      enabled: Boolean(env('NVIDIA_API_KEY')),
      source: 'env',
      keyConfigured: Boolean(env('NVIDIA_API_KEY'))
    },
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      apiKey: env('OPENAI_API_KEY'),
      baseUrl: env('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
      model: env('OPENAI_MODEL') || 'gpt-4o-mini',
      enabled: Boolean(env('OPENAI_API_KEY')),
      source: 'env',
      keyConfigured: Boolean(env('OPENAI_API_KEY'))
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      type: 'anthropic',
      apiKey: env('ANTHROPIC_API_KEY'),
      model: env('ANTHROPIC_MODEL') || 'claude-3-5-haiku-latest',
      enabled: Boolean(env('ANTHROPIC_API_KEY')),
      source: 'env',
      keyConfigured: Boolean(env('ANTHROPIC_API_KEY'))
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      type: 'gemini',
      apiKey: env('GEMINI_API_KEY'),
      model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
      enabled: Boolean(env('GEMINI_API_KEY')) && env('GEMINI_API_KEY') !== 'MY_GEMINI_API_KEY',
      source: 'env',
      keyConfigured: Boolean(env('GEMINI_API_KEY')) && env('GEMINI_API_KEY') !== 'MY_GEMINI_API_KEY'
    },
    {
      id: 'openai-compatible',
      name: 'Generic OpenAI-Compatible',
      type: 'openai-compatible',
      apiKey: env('AI_COMPATIBLE_API_KEY'),
      baseUrl: env('AI_COMPATIBLE_BASE_URL'),
      model: env('AI_COMPATIBLE_MODEL'),
      // المفتاح اختياري: يدعم الخوادم المحلية/الخاصة بلا مصادقة (Ollama, LM Studio, vLLM...)
      enabled: Boolean(env('AI_COMPATIBLE_BASE_URL') && env('AI_COMPATIBLE_MODEL')),
      source: 'env',
      keyConfigured: Boolean(env('AI_COMPATIBLE_API_KEY'))
    },
    {
      id: 'ollama',
      name: 'Ollama (محلي)',
      type: 'ollama',
      apiKey: env('OLLAMA_API_KEY'),
      baseUrl: env('OLLAMA_BASE_URL') || 'http://localhost:11434/v1',
      model: env('OLLAMA_MODEL') || 'llama3',
      enabled: env('OLLAMA_ENABLED') === 'true' || env('OLLAMA_ENABLED') === '1',
      source: 'env',
      keyConfigured: false
    }
  ];
  return records;
}

// -----------------------------------------------------------------------
// مزودات قاعدة البيانات — يضيفها المشرف من لوحة التحكم
// -----------------------------------------------------------------------
async function dbProviderRecords(): Promise<AIProviderRecord[]> {
  try {
    const rows = await prisma.aIProviderConfig.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((row) => {
      let apiKey: string | undefined;
      let keyConfigured = false;
      if (row.encryptedApiKey) {
        try {
          apiKey = decryptApiKey(row.encryptedApiKey);
          keyConfigured = Boolean(apiKey);
        } catch (err) {
          console.warn('[AI Gateway] فشل فك تشفير مفتاح مزود AI:', err);
        }
      }
      return {
        id: row.id,
        name: row.name,
        type: (row.type as AIProviderType) || 'openai-compatible',
        apiKey,
        baseUrl: row.baseUrl || undefined,
        model: row.model || undefined,
        enabled: row.enabled,
        source: 'db' as const,
        keyConfigured
      };
    });
  } catch (err) {
    // قاعدة البيانات غير مهيأة/غير متاحة — نكتفي بمزودات البيئة دون تعطيل المنصة
    console.warn('[AI Gateway] تعذّر قراءة مزودات AI من قاعدة البيانات (سيُستخدم مزودات البيئة فقط):', err);
    return [];
  }
}

// -----------------------------------------------------------------------
// دمج المزودات مع تخزين مؤقت قصير (TTL) لتجنّب استدعاء القاعدة في كل طلب
// -----------------------------------------------------------------------
let providerCache: { at: number; records: AIProviderRecord[] } | null = null;
const CACHE_TTL_MS = 15_000;

export function invalidateAIProviderCache() {
  providerCache = null;
}

export async function allAIProviderRecords(): Promise<AIProviderRecord[]> {
  if (providerCache && Date.now() - providerCache.at < CACHE_TTL_MS) {
    return providerCache.records;
  }
  // Admin-managed database providers take precedence; environment providers remain fallback.
  const records = [...(await dbProviderRecords()), ...envProviderRecords()];
  providerCache = { at: Date.now(), records };
  return records;
}

export async function getAIProviderStatus() {
  const records = await allAIProviderRecords();
  return records.map(({ apiKey: _apiKey, ...rest }) => rest);
}

export function getAIProviderStatusSync() {
  return envProviderRecords().map(({ apiKey: _apiKey, ...rest }) => rest);
}

// -----------------------------------------------------------------------
// محوّلات الاستدعاء حسب النوع
// -----------------------------------------------------------------------
function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAICompatible(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const response = await fetchWithTimeout(`${config.baseUrl!.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4000,
      ...(req.json ? { response_format: { type: 'json_object' } } : {})
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${config.type} ${response.status}: ${JSON.stringify(data)}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${config.type}: empty response`);
  return { text, provider: config.id, model: config.model || '' };
}

async function callAnthropic(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const system = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const messages = req.messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: req.maxTokens ?? 4000,
      temperature: req.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`anthropic ${response.status}: ${JSON.stringify(data)}`);
  const text = Array.isArray(data?.content) ? data.content.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('') : '';
  if (!text) throw new Error('anthropic: empty response');
  return { text, provider: config.id, model: config.model || '' };
}

async function callGemini(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const contents = req.messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const systemInstruction = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model!)}:generateContent?key=${encodeURIComponent(config.apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4000,
        ...(req.json ? { responseMimeType: 'application/json' } : {})
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`gemini ${response.status}: ${JSON.stringify(data)}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
  if (!text) throw new Error('gemini: empty response');
  return { text, provider: config.id, model: config.model || '' };
}

async function callProvider(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  if (config.type === 'anthropic') return callAnthropic(config, req);
  if (config.type === 'gemini') return callGemini(config, req);
  return callOpenAICompatible(config, req);
}

export async function generateAIWithUserCredential(req: AIRequest, credential: UserCredentialRuntime): Promise<AIResult> {
  return callProvider({ id: credential.source === 'platform_fallback' ? 'platform-fallback-gemini' : 'user-account-gemini', type: 'gemini', apiKey: credential.apiKey, model: credential.model || env('GEMINI_MODEL') || 'gemini-2.5-flash' }, req);
}

// -----------------------------------------------------------------------
// التوليد مع fallback تلقائي بين كل المزودات المفعلة
// -----------------------------------------------------------------------
export async function generateAI(req: AIRequest): Promise<AIResult> {
  const records = await allAIProviderRecords();
  const available = records.filter((p) => p.enabled);
  if (!available.length) {
    throw new Error('لا يوجد مزود ذكاء اصطناعي مفعّل. أضف مفتاحاً في ملف .env أو من لوحة المشرف.');
  }

  const preferred = req.preferredProvider ? available.filter((p) => p.id === req.preferredProvider) : [];
  const fallback = available.filter((p) => !req.preferredProvider || p.id !== req.preferredProvider);
  const ordered = [...preferred, ...fallback];
  const errors: string[] = [];

  for (const provider of ordered) {
    try {
      const selected: ProviderConfig = {
        id: provider.id,
        type: provider.type,
        apiKey: provider.apiKey,
        baseUrl: provider.baseUrl,
        model: req.preferredModel && provider.id === req.preferredProvider ? req.preferredModel : provider.model
      };
      return await callProvider(selected, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name || provider.id}: ${message}`);
      console.warn(`[AI Gateway] ${provider.id} failed, trying fallback.`, message);
    }
  }

  throw new Error(`All configured AI providers failed: ${errors.join(' | ')}`);
}

export async function testAIProvider(providerId: AIProviderId): Promise<{ valid: boolean; message: string; provider: AIProviderId }> {
  const records = await allAIProviderRecords();
  const provider = records.find((p) => p.id === providerId);
  if (!provider?.enabled) {
    return { valid: false, message: 'المزود غير مفعّل أو بياناته غير مكتملة.', provider: providerId };
  }
  try {
    const result = await generateAI({
      preferredProvider: providerId,
      messages: [{ role: 'user', content: 'Reply with exactly: SPEX_OK' }],
      maxTokens: 10,
      temperature: 0
    });
    const directHit = result.provider === providerId && result.text.trim().length > 0;
    const message = directHit
      ? `تم الاتصال بنجاح عبر ${provider.name || provider.id} / ${result.model}.`
      : `فشل المزود ${provider.name || providerId} وتم التحويل تلقائياً إلى ${result.provider}.`;
    return { valid: directHit, message, provider: providerId };
  } catch {
    return { valid: false, message: 'فشل الاتصال بالمزود. تحقق من الرابط والمفتاح والنموذج وحدود الاستخدام.', provider: providerId };
  }
}

export function tryParseJson<T>(text: string): T | null {
  try {
    return parseJson(text) as T;
  } catch {
    return null;
  }
}
