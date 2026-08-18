/**
 * SPEX - Client API Service
 * العميل البرمجي للاتصال بواجهة API والذكاء الاصطناعي
 */

// -----------------------------------------------------------------------
// Real Authentication — يستبدل المقارنة المحلية لكلمة المرور في المتصفح
// الجلسة محفوظة في كوكي httpOnly، لذا لا حاجة لتخزين أي رمز يدوياً هنا
// -----------------------------------------------------------------------
import { User } from '../types/spex';
import type { AnnualPlan, AnnualPlanKind, AnnualPlanObjectiveOverride } from '../types/spex';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
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
      return { success: false, error: data.error || 'تعذر تسجيل الدخول.' };
    }
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
}

// ---------------------------------------------------------------------------
// Google Sign-In (ID token القادم من زر GSI) — لا ينشئ حسابات جديدة إطلاقاً:
// الخادم يقبل فقط الحسابات الموجودة المعتمدة، ويربط googleId تلقائياً عند أول
// دخول ناجح بنفس البريد الإلكتروني
// ---------------------------------------------------------------------------
export async function googleLoginRequest(
  credential: string,
  role?: 'teacher' | 'inspector' | 'director'
): Promise<AuthResult> {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // الدور يُمرَّر فقط عند الإنشاء الأول للحساب (الخادم يحصّنه ضد admin)
      body: JSON.stringify(role ? { credential, role } : { credential })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'تعذر تسجيل الدخول عبر Google.' };
    }
    return { success: true, user: data.user };
  } catch (e) {
    return { success: false, error: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' };
  }
}
// ربط حساب Google بحساب مسجّل الدخول حالياً (من صفحة الإعدادات)
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
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, user: data.user };
  } catch (e) {
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
      // الذكاء الاصطناعي قد يعيد بنية ناقصة أحياناً، فنركّب النتيجة فوق القالب
      // المحلي الكامل لضمان اكتمال كل الحقول التي تعتمدها الواجهة (ولا تتحطم الشاشة)
      return normalizeLessonPlanData(json.data, payload);
    }
    throw new Error('لم يتم استلام بيانات المذكرة');
  } catch (err) {
    console.warn('API error, relying on local fallback client generation:', err);
    return fallbackLessonClientGenerator(payload);
  }
}

/**
 * دمج عميق بين نتيجة الذكاء الاصطناعي (قد تكون ناقصة) والقالب المحلي الكامل:
 * أي حقل أو مرحلة ينقصها ردّ النموذج تُستكمل من القالب فلا تنكسر واجهة عرض المذكرة.
 */
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

// Platform DB Auto-Save Sync Helpers

export async function syncUserToDB(user: User): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch('/api/db/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('DB syncUser failed:', data.error);
      return { success: false, error: data.error };
    }
    return { success: true, user: data.user };
  } catch (e) {
    console.warn('DB syncUser failed:', e);
    return { success: false };
  }
}

export async function deleteUserFromDB(userId: string) {
  try {
    await fetch(`/api/db/users/${userId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('DB deleteUser failed:', e);
  }
}

export async function syncUsersBatchToDB(users: User[]) {
  try {
    await fetch('/api/db/users/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
  } catch (e) {
    console.warn('DB syncUsersBatch failed:', e);
  }
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

export async function syncLessonPlanToDB(lessonPlan: unknown) {
  try {
    await fetch('/api/db/lesson-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonPlan })
    });
  } catch (e) {
    console.warn('DB syncLessonPlan failed:', e);
  }
}

export async function syncLessonPlansBatchToDB(lessonPlans: unknown[]) {
  try {
    await fetch('/api/db/lesson-plans/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonPlans })
    });
  } catch (e) {
    console.warn('DB syncLessonPlansBatch failed:', e);
  }
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
  try {
    await fetch(`/api/db/lesson-plans/${lessonId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('DB deleteLessonPlan failed:', e);
  }
}

export async function syncNotebookEntryToDB(entry: unknown) {
  try {
    await fetch('/api/db/notebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    });
  } catch (e) {
    console.warn('DB syncNotebookEntry failed:', e);
  }
}

export async function syncNotebookBatchToDB(dailyNotebook: unknown[]) {
  try {
    await fetch('/api/db/notebook/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyNotebook })
    });
  } catch (e) {
    console.warn('DB syncNotebookBatch failed:', e);
  }
}

export async function deleteNotebookEntryFromDB(entryId: string) {
  try {
    await fetch(`/api/db/notebook/${entryId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('DB deleteNotebookEntry failed:', e);
  }
}

export async function syncInspectorNoteToDB(note: unknown) {
  try {
    await fetch('/api/db/inspector-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
  } catch (e) {
    console.warn('DB syncInspectorNote failed:', e);
  }
}

export async function syncDistrictMessageToDB(message: unknown) {
  try {
    await fetch('/api/db/district-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  } catch (e) {
    console.warn('DB syncDistrictMessage failed:', e);
  }
}

export async function fetchDistrictMessagesFromDB() {
  try {
    const res = await fetch('/api/db/district-messages');
    const data = await res.json();
    return data.districtMessages || [];
  } catch (e) {
    return [];
  }
}

export async function syncDirectMessageToDB(message: unknown) {
  try {
    await fetch('/api/db/direct-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
  } catch (e) {
    console.warn('DB syncDirectMessage failed:', e);
  }
}

export async function fetchDirectMessagesFromDB() {
  try {
    const res = await fetch('/api/db/direct-messages');
    const data = await res.json();
    return data.directMessages || [];
  } catch (e) {
    return [];
  }
}

export async function syncCommunityResourceToDB(resource: unknown) {
  try {
    await fetch('/api/db/community-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource })
    });
  } catch (e) {
    console.warn('DB syncCommunityResource failed:', e);
  }
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
  try {
    await fetch('/api/db/community-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification })
    });
  } catch (e) {
    console.warn('DB syncCommunityNotification failed:', e);
  }
}

export async function deleteCommunityNotificationFromDB(notificationId: string) {
  try {
    await fetch(`/api/db/community-notifications/${notificationId}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('DB deleteCommunityNotification failed:', e);
  }
}

export async function fetchCommunityNotificationsFromDB() {
  try {
    const res = await fetch('/api/db/community-notifications');
    const data = await res.json();
    return data.communityNotifications || [];
  } catch (e) {
    return [];
  }
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
  districtId: string;
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
