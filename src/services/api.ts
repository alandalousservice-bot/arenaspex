/**
 * SPEX - Client API Service
 * العميل البرمجي للاتصال بواجهة API والذكاء الاصطناعي
 * يتضمن الآن:
 * - PART A: fetchGeo* للهيكلية الوطنية
 * - PART C: offlinePost/offlineDelete via src/lib/offline.ts
 */

// -----------------------------------------------------------------------
// Real Authentication — يستبدل المقارنة المحلية لكلمة المرور في المتصفح
// الجلسة محفوظة في كوكي httpOnly، لذا لا حاجة لتخزين أي رمز يدوياً هنا
// -----------------------------------------------------------------------
import { User, KnowledgeItem } from '../types/spex';
import type { AnnualPlan, AnnualPlanKind, AnnualPlanObjectiveOverride } from '../types/spex';
import { offlinePost, offlineDelete } from '../lib/offline';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  offline?: boolean;
  disabled?: boolean;
  isOfflineSession?: boolean;
  code?: string;
}

export async function loginRequest(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      // handle disabled/pending etc - login already returns 403 for pending
      if (data.code === 'ACCOUNT_DISABLED' || data.disabled) {
        return { success: false, disabled: true, user: data.user, error: data.error };
      }
      return { success: false, error: data.error || 'تعذر تسجيل الدخول.' };
    }
    // store local copy for offline mode
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spex_current_user', JSON.stringify(data.user));
      }
    } catch {}
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export async function registerRequest(userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
  schoolName?: string;
  municipality?: string;
  phone?: string;
  eduDirectorateId?: string;
  eduDistrictId?: string;
  eduSchoolId?: string;
  municipalityId?: string;
}): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'تعذر إنشاء الحساب.' };
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spex_current_user', JSON.stringify(data.user));
      }
    } catch {}
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // تجاهل: تنظيف الحالة المحلية سيحدث بغض النظر
  }
  try {
    if (typeof localStorage !== 'undefined') {
      // احتفظ بالصندوق المعفى فقط حسب killSwitch سياسة، لكن عند logout العادي نمسح كل شيء ما عدا الصندوق؟
      // للخروج العادي نمسح المستخدم فقط
      localStorage.removeItem('spex_current_user');
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------
export async function googleLoginRequest(
  credential: string,
  role?: 'teacher' | 'inspector' | 'director' | 'admin'
): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role ? { credential, role } : { credential })
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'ACCOUNT_DISABLED' || data.disabled) {
        return { success: false, disabled: true, user: data.user, error: data.error };
      }
      return { success: false, error: data.error || 'تعذر تسجيل الدخول عبر Google.' };
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spex_current_user', JSON.stringify(data.user));
      }
    } catch {}
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}
export async function googleLinkRequest(credential: string): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/google/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'تعذر ربط حساب Google.' };
    }
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export async function googleUnlinkRequest(): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/google/unlink', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'تعذر إلغاء ربط حساب Google.' };
    }
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export async function fetchCurrentSession(): Promise<AuthResult> {
  // C3: انقطاع ≠ خروج — عند navigator.onLine===false صراحة نعمل من النسخة المحلية
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try {
      const raw = localStorage.getItem('spex_current_user');
      if (raw) {
        const user = JSON.parse(raw);
        return { success: true, offline: true, isOfflineSession: true, user };
      }
    } catch {}
    return { success: false, offline: true, error: 'offline', isOfflineSession: false };
  }

  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'ACCOUNT_DISABLED' || data.disabled || data.error?.includes('معطّل')) {
        return { success: false, disabled: true, user: data.user, error: data.error, code: data.code };
      }
      if (data.code === 'ACCOUNT_GONE') {
        return { success: false, error: data.error, code: data.code };
      }
      return { success: false, error: data.error };
    }
    // store local copy for offline resilience
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('spex_current_user', JSON.stringify(data.user));
      }
    } catch {}
    return { success: true, user: data.user };
  } catch (e) {
    // network error — check if offline explicitly
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      try {
        const raw = localStorage.getItem('spex_current_user');
        if (raw) {
          const user = JSON.parse(raw);
          return { success: true, offline: true, isOfflineSession: true, user };
        }
      } catch {}
      return { success: false, offline: true, error: 'offline' };
    }
    return { success: false, error: 'تعذر الاتصال بالخادم.' };
  }
}

export interface SimpleResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function forgotPasswordRequest(email: string): Promise<SimpleResult> {
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'تعذر إرسال الطلب.' };
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<SimpleResult> {
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'تعذر تحديث كلمة المرور.' };
    return { success: true, message: data.message };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const customKey = localStorage.getItem('spex_custom_api_key');
    if (customKey) return customKey.trim();

    const userRaw = localStorage.getItem('spex_current_user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user.customApiKey) return user.customApiKey.trim();
    }
  } catch (e) {
    // ignore json error
  }
  return '';
}

export function setStoredApiKey(key: string) {
  if (typeof window === 'undefined') return;
  if (!key) {
    localStorage.removeItem('spex_custom_api_key');
  } else {
    localStorage.setItem('spex_custom_api_key', key.trim());
  }
}

export async function testAIProviderOnServer(provider: string) {
  try {
    const response = await fetch('/api/ai/test-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    return await response.json();
  } catch {
    return { valid: false, message: 'تعذر الاتصال بالخادم لفحص مزود الذكاء الاصطناعي.' };
  }
}

// Backward-compatible alias for existing settings UI; it now tests the server's default provider.
export async function testApiKeyOnServer(_key: string) {
  return testAIProviderOnServer('nvidia');
}

// -----------------------------------------------------------------------
// إدارة مزودات الذكاء الاصطناعي (تخزين خادمي عبر لوحة المشرف)
// -----------------------------------------------------------------------
export interface AIProviderStatusItem {
  id: string;
  name: string;
  type: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  source: 'env' | 'db';
  keyConfigured: boolean;
}

export interface AIProviderInput {
  name: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
  sortOrder?: number;
}

export async function fetchAIProviders(): Promise<AIProviderStatusItem[]> {
  try {
    const res = await fetch('/api/ai/providers', { method: 'GET' });
    const data = await res.json();
    return (data && data.providers) || [];
  } catch {
    return [];
  }
}

export interface GenerationAccessItem { userId: string; enabled: boolean; assistantEnabled: boolean; gameSuggestionsEnabled: boolean; provider?: string; keyConfigured?: boolean; credentialEnabled?: boolean; updatedAt?: string; }
export async function fetchGenerationConfig() { const res = await fetch('/api/admin/generation/config'); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر تحميل إعدادات الخدمات.'); return data as { generationEnabled: boolean; providerConfigured: boolean; platformFallbackConfigured?: boolean; providers: AIProviderStatusItem[] }; }
export async function updateGenerationConfig(enabled: boolean) { const res = await fetch('/api/admin/generation/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) }); if (!res.ok) throw new Error('تعذر تحديث حالة الخدمة.'); }
export async function fetchGenerationAccess(): Promise<GenerationAccessItem[]> { const res = await fetch('/api/admin/generation/access'); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر تحميل صلاحيات الخدمات.'); return data.access || []; }
export async function updateGenerationAccess(userId: string, access: { enabled: boolean; assistantEnabled: boolean; gameSuggestionsEnabled: boolean; apiKey?: string; clearKey?: boolean; credentialEnabled?: boolean; provider?: string }) { const res = await fetch(`/api/admin/generation/access/${encodeURIComponent(userId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(access) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'تعذر تحديث صلاحيات الخدمات.'); return data.access as GenerationAccessItem; }
export async function testGenerationAccess(userId: string) { const res = await fetch(`/api/admin/generation/access/${encodeURIComponent(userId)}/test`, { method: 'POST' }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر اختبار بيانات الحساب.'); return data as { success: boolean; message: string }; }
export async function testPlatformFallback() { const res = await fetch('/api/admin/generation/fallback/test', { method: 'POST' }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر اختبار المفتاح الاحتياطي.'); return data as { success: boolean; message: string }; }

export async function createAIProvider(input: AIProviderInput): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/ai/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'تعذّر حفظ المزود.' };
    return { success: true };
  } catch {
    return { success: false, error: 'تعذّر الاتصال بالخادم.' };
  }
}

export async function updateAIProvider(id: string, input: AIProviderInput): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'تعذّر تحديث المزود.' };
    return { success: true };
  } catch {
    return { success: false, error: 'تعذّر الاتصال بالخادم.' };
  }
}

export async function deleteAIProvider(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'تعذّر حذف المزود.' };
    return { success: true };
  } catch {
    return { success: false, error: 'تعذّر الاتصال بالخادم.' };
  }
}

export async function testAIProviderById(id: string) {
  try {
    const res = await fetch(`/api/ai/providers/${encodeURIComponent(id)}/test`, { method: 'POST' });
    return await res.json();
  } catch {
    return { valid: false, message: 'تعذر الاتصال بالخادم لفحص المزود.' };
  }
}

export interface LessonGeneratorPayload {
  levelName: string;
  fieldName: string;
  competencyTitle: string;
  segmentTitle: string;
  sessionTitle: string;
  annualSessionRef?: string;
  segmentGoal?: string;
  sessionType?: 'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';
  sessionTypeNumber?: string;
  inspectorName?: string;
  teacherName?: string;
  institutionName?: string;
  customObjective?: string;
  customEquipment?: string;
}

export async function requestAILessonPlan(payload: LessonGeneratorPayload) {
  try {
    const response = await fetch('/api/ai/generate-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return normalizeLessonPlanData(json.data, payload);
    }
    throw new Error('لم يتم استلام بيانات المذكرة');
  } catch (err) {
    console.warn('API error, relying on local fallback client generation:', err);
    return fallbackLessonClientGenerator(payload);
  }
}

export async function previewStudentRoster(file: File) {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('file read failed'));
    reader.readAsDataURL(file);
  });
  const response = await fetch('/api/students/import/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentBase64 }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'تعذر التعرف على بنية الملف.');
  return data as { previews: any[]; summary: { worksheets: number; students: number; invalidRows: number; needsGradeSelection: number } };
}

export async function confirmStudentRosterImport(rows: unknown[], classId: string, grade?: number, className?: string, levelId?: string) {
  const response = await fetch('/api/students/import/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, classId, grade, className, levelId }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'تعذر تأكيد الاستيراد.');
  return data as { success: boolean; classId: string; summary: { created: number; existing: number; linkedStudents: number; conflicts: number; review: number } };
}

export async function fetchStudentRoster() {
  const response = await fetch('/api/students/roster');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل قائمة التلاميذ.');
  return data as { classes: any[]; students: any[] };
}

function normalizeLessonPlanData(data: any, payload: LessonGeneratorPayload) {
  const base = fallbackLessonClientGenerator(payload);
  const warmupGame = data?.warmupPhase?.pedagogicalWarmupGame || base.warmupPhase.pedagogicalWarmupGame;

  return {
    ...base,
    ...(data || {}),
    generalObjective: data?.generalObjective || base.generalObjective,
    proceduralObjectives: { ...base.proceduralObjectives, ...(data?.proceduralObjectives || {}) },
    equipmentNeeded:
      Array.isArray(data?.equipmentNeeded) && data.equipmentNeeded.length > 0
        ? data.equipmentNeeded
        : base.equipmentNeeded,
    safetyRules:
      Array.isArray(data?.safetyRules) && data.safetyRules.length > 0 ? data.safetyRules : base.safetyRules,
    warmupPhase: {
      ...base.warmupPhase,
      ...(data?.warmupPhase || {}),
      pedagogicalWarmupGame: warmupGame
    },
    mainPhase: {
      ...base.mainPhase,
      ...(data?.mainPhase || {}),
      learningSituation1: { ...base.mainPhase.learningSituation1, ...(data?.mainPhase?.learningSituation1 || {}) },
      learningSituation2: { ...base.mainPhase.learningSituation2, ...(data?.mainPhase?.learningSituation2 || {}) },
      guidedApplication: { ...base.mainPhase.guidedApplication, ...(data?.mainPhase?.guidedApplication || {}) }
    },
    coolDownPhase: { ...base.coolDownPhase, ...(data?.coolDownPhase || {}) }
  };
}

export interface ImproveWordingPayload {
  fieldLabel: string;
  currentText: string;
  context?: string;
}

export async function requestAIImproveWording(payload: ImproveWordingPayload): Promise<string> {
  try {
    const response = await fetch('/api/ai/improve-wording', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Server returned status ${response.status}`);
    const json = await response.json();
    if (json.data?.improvedText) return json.data.improvedText as string;
    throw new Error('لم يتم استلام صياغة محسّنة');
  } catch (err) {
    console.warn('improve-wording API error:', err);
    return payload.currentText;
  }
}

export async function requestAIGames(fieldName: string, levelName: string) {
  try {
    const response = await fetch('/api/ai/suggest-games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName, levelName })
    });
    const json = await response.json();
    return json.games || [];
  } catch (err) {
    return [
      {
        title: `لعبة سباق الكرات والتمرير السريع (${fieldName})`,
        description: `لعبة حماسية لرفع كفاءة التنسيق والسرعة الاستجابية لدى التلاميذ.`,
        equipment: ['أقماع شواخص (6)', 'كرات مخصصة (4)'],
        rules: 'ينقسم القسم لأربعة أفواج، ويتم التناوب على التمرير السريع بدقة.',
        duration: '10 دقائق'
      }
    ];
  }
}

export interface PedagogicalGameSuggestionRequest {
  grade: number;
  fieldId: string;
  fieldName: string;
  objectiveId?: string;
  objectiveText: string;
  existingGames?: string[];
  existingSituations?: string[];
  constraints?: { equipment?: string; groupSize?: string; environment?: string; difficulty?: string };
}

export async function requestPedagogicalGameSuggestion(payload: PedagogicalGameSuggestionRequest) {
  const response = await fetch('/api/ai/suggest-games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      levelName: `السنة ${payload.grade} ابتدائي`,
      objective: payload.objectiveText,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || json.error || 'SERVICE_UNAVAILABLE');
  if (!json.games) throw new Error('SERVICE_UNAVAILABLE');
  const candidate = Array.isArray(json.games) ? json.games[0] : json.games;
  if (!candidate || typeof candidate !== 'object') throw new Error('invalid_suggestion');
  return candidate as Record<string, unknown>;
}

export async function fetchPedagogicalGames(scope: 'public' | 'mine' | 'pending') {
  const response = await fetch(`/api/pedagogical-games/${scope}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'تعذر تحميل الألعاب.');
  return json.games || [];
}

export async function createPedagogicalGame(game: Partial<KnowledgeItem>) {
  const response = await fetch('/api/pedagogical-games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(game) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'تعذر حفظ اللعبة.');
  return json.game;
}

export async function updatePedagogicalGame(id: string, game: Partial<KnowledgeItem>) {
  const response = await fetch(`/api/pedagogical-games/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(game) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'تعذر تعديل اللعبة.');
  return json.game;
}

export async function deletePedagogicalGame(id: string) { await fetch(`/api/pedagogical-games/${id}`, { method: 'DELETE' }); }
export async function submitPedagogicalGame(id: string) { const response = await fetch(`/api/pedagogical-games/${id}/submit`, { method: 'POST' }); const json = await response.json(); if (!response.ok) throw new Error(json.error || 'تعذر إرسال اللعبة.'); return json.game; }
export async function approvePedagogicalGame(id: string) { const response = await fetch(`/api/pedagogical-games/${id}/approve`, { method: 'POST' }); if (!response.ok) throw new Error('تعذر اعتماد اللعبة.'); }
export async function rejectPedagogicalGame(id: string, rejectionReason: string) { const response = await fetch(`/api/pedagogical-games/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rejectionReason }) }); if (!response.ok) throw new Error('تعذر رفض اللعبة.'); }

export async function sendAIChatMessage(message: string, history: { role: 'user' | 'model'; text: string }[]) {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    const json = await response.json();
    return json.response || 'عذراً، حدث خطأ في معالجة الرسالة.';
  } catch (err) {
    return '⚠️ **ملاحظة من البنك البيداغوجي للمنصة**: تم استنفاذ السعة اليومية المتاحة للاستعلام المباشر لهذا الحساب اليوم. يتجدد الرصيد تلقائياً غداً صباحاً. يمكنك الاعتماد حالياً على بنك المذكرات والأنشطة المخزنة مسبقاً في المنصة.';
  }
}

// Platform DB Auto-Save Sync Helpers — PART C: موجهة عبر offlinePost/offlineDelete

export async function syncUserToDB(user: User): Promise<{ success: boolean; user?: User; error?: string }> {
  const result = await offlinePost('/api/db/users', { user }, 'POST');
  if (result.success) {
    // try to get actual user from server if online, but offlinePost already attempted
    try {
      const res = await fetch('/api/db/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error };
      }
      return { success: true, user: data.user };
    } catch {
      // if we are offline, we already queued
      return { success: true };
    }
  }
  // queued offline — consider success for UI
  return { success: true };
}

export async function deleteUserFromDB(userId: string) {
  await offlineDelete(`/api/db/users/${userId}`);
}

export async function syncUsersBatchToDB(users: User[]) {
  await offlinePost('/api/db/users/batch', { users }, 'POST');
}

export async function fetchUsersFromDB() {
  try {
    const res = await fetch('/api/db/users');
    const data = await res.json();
    return data.users || [];
  } catch (e) {
    return [];
  }
}

export async function fetchPendingUsersFromDB(): Promise<User[]> {
  try {
    const res = await fetch('/api/admin/users/pending');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

export async function fetchManagedUsersFromDB(): Promise<User[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

export async function activateUserAccount(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/activate`, { method: 'POST' });
    const data = await res.json();
    return res.ok ? { success: true, user: data.user } : { success: false, error: data.error };
  } catch {
    return { success: false, error: 'تعذر تفعيل الحساب.' };
  }
}

export async function syncLessonPlanToDB(lessonPlan: unknown) {
  await offlinePost('/api/db/lesson-plans', { lessonPlan }, 'POST');
}

export async function syncLessonPlansBatchToDB(lessonPlans: unknown[]) {
  await offlinePost('/api/db/lesson-plans/batch', { lessonPlans }, 'POST');
}

export async function fetchLessonPlansFromDB() {
  try {
    const res = await fetch('/api/db/lesson-plans');
    const data = await res.json();
    return data.lessonPlans || [];
  } catch (e) {
    return [];
  }
}

export async function deleteLessonPlanFromDB(lessonId: string) {
  await offlineDelete(`/api/db/lesson-plans/${lessonId}`);
}

export async function syncNotebookEntryToDB(entry: unknown) {
  await offlinePost('/api/db/notebook', { entry }, 'POST');
}

export async function syncNotebookBatchToDB(dailyNotebook: unknown[]) {
  await offlinePost('/api/db/notebook/batch', { dailyNotebook }, 'POST');
}

export async function deleteNotebookEntryFromDB(entryId: string) {
  await offlineDelete(`/api/db/notebook/${entryId}`);
}

export async function syncInspectorNoteToDB(note: unknown): Promise<{ success: boolean; error?: string }> {
  return offlinePost('/api/db/inspector-notes', { note }, 'POST');
}

export async function fetchTeacherInspectionFeed() {
  const res = await fetch('/api/teacher/inspection-feed');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل علاقة المفتش.');
  return data;
}

export async function syncInspectionVisitToDB(visit: unknown) {
  await offlinePost('/api/inspection-visits', { visit }, 'POST');
}

export async function syncDistrictMessageToDB(message: unknown) {
  await offlinePost('/api/db/district-messages', { message }, 'POST');
}

export async function fetchDistrictMessagesFromDB() {
  const res = await fetch('/api/db/district-messages');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل رسائل المقاطعة.');
  return data.districtMessages || [];
}

export async function syncDirectMessageToDB(message: unknown) {
  await offlinePost('/api/db/direct-messages', { message }, 'POST');
}

export async function fetchDirectMessagesFromDB() {
  const res = await fetch('/api/db/direct-messages');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل الرسائل الخاصة.');
  return data.directMessages || [];
}

export async function syncCommunityResourceToDB(resource: unknown) {
  await offlinePost('/api/db/community-resources', { resource }, 'POST');
}

export async function fetchCommunityResourcesFromDB() {
  try {
    const res = await fetch('/api/db/community-resources');
    const data = await res.json();
    return data.communityResources || [];
  } catch (e) {
    return [];
  }
}

export async function syncCommunityNotificationToDB(notification: unknown) {
  await offlinePost('/api/db/community-notifications', { notification }, 'POST');
}

export async function deleteCommunityNotificationFromDB(notificationId: string) {
  await offlineDelete(`/api/db/community-notifications/${notificationId}`);
}

export async function fetchCommunityNotificationsFromDB() {
  const res = await fetch('/api/db/community-notifications');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل الإشعارات.');
  return data.communityNotifications || [];
}

// -----------------------------------------------------------------------
// نظام الإسناد التلقائي للأساتذة إلى المفتشين
// -----------------------------------------------------------------------

async function getJSON(url: string) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return data;
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم.' };
  }
}

async function postJSON(url: string, body?: unknown, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return data;
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم.' };
  }
}

export const fetchDirectorates = () => getJSON('/api/locations/directorates');
export const fetchMunicipalities = (directorateId: string) =>
  getJSON(`/api/locations/directorates/${directorateId}/municipalities`);
export const fetchInspectionDistricts = (directorateId: string) =>
  getJSON(`/api/locations/directorates/${directorateId}/districts`);
export const fetchSchools = (municipalityId: string) =>
  getJSON(`/api/locations/municipalities/${municipalityId}/schools`);

export const suggestMunicipality = (name: string, directorateId: string) =>
  postJSON('/api/locations/municipalities/suggest', { name, directorateId });
export const suggestSchool = (name: string, municipalityId: string) =>
  postJSON('/api/locations/schools/suggest', { name, municipalityId });

export interface TeacherProfessionalData {
  directorateId: string;
  municipalityId: string;
  institutionId: string;
  districtId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
}
export const saveTeacherProfessionalData = (payload: TeacherProfessionalData) =>
  postJSON('/api/teacher/professional-data', payload, 'PUT');

export const fetchMyAssignment = () => getJSON('/api/teacher/assignment');

export const fetchMyAssignedTeachers = (filters?: { municipalityId?: string; institutionId?: string }) => {
  const params = new URLSearchParams();
  if (filters?.municipalityId) params.set('municipalityId', filters.municipalityId);
  if (filters?.institutionId) params.set('institutionId', filters.institutionId);
  const qs = params.toString();
  return getJSON(`/api/inspector/teachers${qs ? `?${qs}` : ''}`);
};

export async function fetchInspectorSummary() {
  const res = await fetch('/api/inspector/summary');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل ملخص المفتش.');
  return data.summary || {};
}

export async function fetchInspectorTeacherFollowUp(teacherId: string) {
  const res = await fetch(`/api/inspector/teachers/${encodeURIComponent(teacherId)}/follow-up`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'تعذر تحميل ملف متابعة الأستاذ.');
  return data;
}

// PART A: Geo hierarchy public endpoints
export const fetchGeoDirectorates = () => getJSON('/api/geo/directorates');
export const fetchGeoDistricts = (directorateId: string) =>
  getJSON(`/api/geo/directorates/${directorateId}/districts`);
export const fetchGeoMunicipalities = (directorateId: string) =>
  getJSON(`/api/geo/directorates/${directorateId}/municipalities`);
export const fetchGeoSchools = (params?: { municipalityId?: string; districtId?: string; commune?: string }) => {
  const q = new URLSearchParams();
  if (params?.municipalityId) q.set('municipalityId', params.municipalityId);
  if (params?.districtId) q.set('districtId', params.districtId);
  if (params?.commune) q.set('commune', params.commune);
  const qs = q.toString();
  return getJSON(`/api/geo/schools${qs ? `?${qs}` : ''}`);
};
export const fetchGeoDistrictCommunes = (districtId: string) =>
  getJSON(`/api/geo/districts/${districtId}/communes`);

// --- إدارة (Admin) ---
export const adminCreateDirectorate = (payload: { id: string; name: string; wilayaCode?: string }) =>
  postJSON('/api/admin/directorates', payload);
export const adminCreateMunicipality = (payload: { name: string; directorateId: string }) =>
  postJSON('/api/admin/municipalities', payload);
export const adminCreateSchool = (payload: { name: string; municipalityId: string }) =>
  postJSON('/api/admin/schools', payload);
export const adminCreateDistrict = (payload: { name: string; directorateId: string; districtNumber?: number }) =>
  postJSON('/api/admin/districts', payload);

export const adminDeleteDirectorate = (id: string) => postJSON(`/api/admin/directorates/${id}`, undefined, 'DELETE');
export const adminDeleteMunicipality = (id: string) => postJSON(`/api/admin/municipalities/${id}`, undefined, 'DELETE');
export const adminDeleteSchool = (id: string) => postJSON(`/api/admin/schools/${id}`, undefined, 'DELETE');
export const adminDeleteDistrict = (id: string) => postJSON(`/api/admin/districts/${id}`, undefined, 'DELETE');

export const fetchPendingSuggestions = () => getJSON('/api/admin/suggestions');
export const approveMunicipalitySuggestion = (id: string) =>
  postJSON(`/api/admin/suggestions/municipalities/${id}/approve`);
export const rejectMunicipalitySuggestion = (id: string) =>
  postJSON(`/api/admin/suggestions/municipalities/${id}/reject`);
export const approveSchoolSuggestion = (id: string) => postJSON(`/api/admin/suggestions/schools/${id}/approve`);
export const rejectSchoolSuggestion = (id: string) => postJSON(`/api/admin/suggestions/schools/${id}/reject`);

export const fetchAllAssignments = (status?: string) =>
  getJSON(`/api/admin/assignments${status ? `?status=${status}` : ''}`);
export const reassignAllTeachers = () => postJSON('/api/admin/assignments/reassign-all');
export const removeTeacherAssignment = (teacherId: string) => postJSON(`/api/admin/assignments/${teacherId}/remove`);
export const reassignSingleTeacher = (teacherId: string) => postJSON(`/api/admin/assignments/${teacherId}/reassign`);

// Pending assignments for inspector (PART B)
export const fetchInspectorPendingAssignments = () => getJSON('/api/inspector/pending-assignments');
export const acceptInspectorAssignment = (teacherId: string) =>
  postJSON(`/api/inspector/assignments/${teacherId}/accept`);
export const rejectInspectorAssignment = (teacherId: string, reason?: string) =>
  postJSON(`/api/inspector/assignments/${teacherId}/reject`, { reason });

// -----------------------------------------------------------------------
// المخطط السنوي / التوزيع السنوي — تعديل الأستاذ لصياغة الأهداف، واقتراح
// المفتش لأساتذة مقاطعته مع إمكانية اعتماد اقتراحه
// -----------------------------------------------------------------------

export const fetchAnnualPlans = (params: {
  teacherId?: string;
  kind?: AnnualPlanKind;
  academicYearId?: string;
  levelId?: string;
}) => {
  const query = new URLSearchParams();
  if (params.teacherId) query.set('teacherId', params.teacherId);
  if (params.kind) query.set('kind', params.kind);
  if (params.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params.levelId) query.set('levelId', params.levelId);
  const qs = query.toString();
  return getJSON(`/api/db/annual-plans${qs ? `?${qs}` : ''}`) as Promise<{ success: boolean; annualPlans?: AnnualPlan[]; error?: string }>;
};

// الأستاذ يحفظ مسودته الخاصة، أو المفتش يحفظ اقتراحاً لأستاذ من مقاطعته (يبقى
// بحالة "مقترح" إلى أن يعتمده المفتش بنفسه عبر approveAnnualPlan)
export const saveAnnualPlan = (payload: {
  id?: string;
  teacherId: string;
  academicYearId: string;
  levelId: string;
  kind: AnnualPlanKind;
  data: { overrides: Record<string, AnnualPlanObjectiveOverride>; note?: string };
}) => postJSON('/api/db/annual-plans', { annualPlan: payload }) as Promise<{ success: boolean; annualPlan?: AnnualPlan; error?: string }>;

export const approveAnnualPlan = (id: string) =>
  postJSON(`/api/db/annual-plans/${id}/approve`) as Promise<{ success: boolean; annualPlan?: AnnualPlan; error?: string }>;

export const deleteAnnualPlan = (id: string) => postJSON(`/api/db/annual-plans/${id}`, undefined, 'DELETE');

function fallbackLessonClientGenerator(payload: LessonGeneratorPayload) {
  const customObj = payload.customObjective || `تحقيق هدف المقطع التعليمي لـ (${payload.sessionTitle}) وفق المعايير الرسمية المعتمدة.`;
  const segmentTarget = payload.segmentGoal || payload.competencyTitle || 'التحكم في المهارات الحركية والسلوك البدني والتنظيم الجماعي.';

  return {
    teacherName: payload.teacherName || 'أستاذ المادة',
    institutionName: payload.institutionName || 'المؤسسة التعليمية',
    generalObjective: customObj,
    segmentGoal: segmentTarget,
    annualSessionRef: payload.annualSessionRef || 'التوزيع السنوي الرسمي',
    proceduralObjectives: {
      motor: `أن ينفذ التلميذ المهارات الحركية لـ (${customObj}) بتناسق حركي وسلاسة ودقة أداء.`,
      cognitive: `أن يستوعب التلميذ التكتيك وقوانين اللعبة المنظمة للحصة لربطها بـ (${segmentTarget}).`,
      affective: `أن يبدي التلميذ الروح الرياضية التنافسية، الانضباط، والتعاون مع زملائه داخل الفريق.`
    },
    equipmentNeeded: payload.customEquipment ? payload.customEquipment.split(/[,،]/).map(s => s.trim()) : ['ميقاتي رقمي', 'أقماع ملونة (10)', 'كرات مخصصة', 'صفارة حكّم'],
    safetyRules: [
      'التفقد الميداني لخلو الملعب من العوائق والأجسام الصلبة',
      'التأكد من ارتداء اللباس والحذاء الرياضي المناسب',
      'مراعاة التدرج في الإحماء والجهد البدني تجنباً للإصابات العضلية'
    ],
    warmupPhase: {
      duration: '10-12 دقيقة',
      pedagogicalWarmupGame: {
        title: `لعبة الصياد والأسماك السريعة (إحماء تربوي حر)`,
        rules: `يتنقل التلاميذ داخل منطقة محددة بالإيقاع الجري، وعند إشارة الأستاذ يحاول "الصياد" المساس بأكبر عدد مع تفادي الاصطدام.`,
        equipment: 'أقماع ملونة لتحديد منطقة اللعب + صدريات للوحدات'
      },
      generalWarmup: 'جري خفيف حول الميدان في تشكيل منظم مع تنويع الإيقاع والاستجابة لإشارات الأستاذ.',
      specificWarmup: 'تمارين مرونة المفاصل والإطالة العضلية الديناميكية الموجهة للطرفين السفليين والعلميين.',
      organization: 'مجموعات متوازية مع الحفاظ على مسافة أمان كافية بين التلاميذ.'
    },
    mainPhase: {
      duration: '30-35 دقيقة',
      problemSituation: `كيف تتغلب على الفريق المنافس وتصل للهدف بسرعة ودقة مع تطبيق حركات (${customObj})؟`,
      learningSituation1: {
        title: `الموقف الأول (لعبة تربوية تنافسية 1): سباق التتابع والدقة الحركية`,
        description: `يتنافس قاطرتان بين الأقماع للوصول إلى النقطة النهائية وأداء حركة (${customObj}) ثم العودة لتسليم الشاهد لزميله.`,
        dosing: `3 جولات تنافسية متتالية مع احتساب النقاط لكل فوج.`,
        criteria: `سرعة الإنجاز والالتزام بقواعد اللعبة والدقة الحركية.`
      },
      learningSituation2: {
        title: `الموقف الثاني (لعبة تربوية تنافسية 2): مباراة التحدي والتصويب الجماعي`,
        description: `موقف تنافسي مركب يتواجه فيه فريقان لإنجاز المهارة تحت ضغط المنافسة المباشرة مع تحقيق هدف المقطع (${segmentTarget}).`,
        dosing: `جولتان لمدة 5 دقائق لكل جولة مع تبادل الملاعب.`,
        criteria: `تحقيق هدف الحصة عبر جمع أكبر عدد من النقاط وفق شروط التنافس.`
      },
      guidedApplication: {
        title: `التطبيق الموجه: مواجهة تنافسية مصغرة بروح رياضية`,
        description: `إقامة منافسة بين أفواج القسم لتطبيق المهارات المكتسبة مع احتساب النقاط.`,
        rules: `احترام قوانين اللعبة والتنافس الشريف.`
      }
    },
    coolDownPhase: {
      duration: '5-10 دقائق',
      activities: 'المشي الخفيف، حركات التنفس الموجهة والاسترخاء العضلي للتهدئة.',
      assessmentAndDialogue: 'مناقشة الأستاذ للتلاميذ وتحديد الملاحظات الفردية الجماعية وتسجيل النتائج.'
    }
  };
}
