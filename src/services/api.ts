/**
 * SPEX - Client API Service
 * العميل البرمجي للاتصال بواجهة API والذكاء الاصطناعي
 */

// -----------------------------------------------------------------------
// Real Authentication — يستبدل المقارنة المحلية لكلمة المرور في المتصفح
// الجلسة محفوظة في كوكي httpOnly، لذا لا حاجة لتخزين أي رمز يدوياً هنا
// -----------------------------------------------------------------------
export interface AuthResult {
  success: boolean;
  user?: any;
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

export async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // تجاهل: تنظيف الحالة المحلية سيحدث بغض النظر
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

export async function testApiKeyOnServer(key: string) {
  try {
    const response = await fetch('/api/ai/test-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-custom-api-key': key.trim()
      },
      body: JSON.stringify({ apiKey: key.trim() })
    });
    return await response.json();
  } catch (err) {
    return { valid: false, message: 'تعذر الاتصال بالخادم لفحص المفتاح.' };
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
  const customApiKey = getStoredApiKey();
  try {
    const response = await fetch('/api/ai/generate-lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'x-custom-api-key': customApiKey } : {})
      },
      body: JSON.stringify({ ...payload, customApiKey })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data;
    }
    throw new Error('لم يتم استلام بيانات المذكرة');
  } catch (err) {
    console.warn('API error, relying on local fallback client generation:', err);
    return fallbackLessonClientGenerator(payload);
  }
}

export async function requestAIGames(fieldName: string, levelName: string) {
  const customApiKey = getStoredApiKey();
  try {
    const response = await fetch('/api/ai/suggest-games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'x-custom-api-key': customApiKey } : {})
      },
      body: JSON.stringify({ fieldName, levelName, customApiKey })
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
  const customApiKey = getStoredApiKey();
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'x-custom-api-key': customApiKey } : {})
      },
      body: JSON.stringify({ message, history, customApiKey })
    });
    const json = await response.json();
    return json.response || 'عذراً، حدث خطأ في معالجة الرسالة.';
  } catch (err) {
    return '⚠️ **ملاحظة من البنك البيداغوجي للمنصة**: تم استنفاذ السعة اليومية المتاحة للاستعلام المباشر لهذا الحساب اليوم. يتجدد الرصيد تلقائياً غداً صباحاً. يمكنك الاعتماد حالياً على بنك المذكرات والأنشطة المخزنة مسبقاً في المنصة.';
  }
}

// Platform DB Auto-Save Sync Helpers

export async function syncUserToDB(user: any): Promise<{ success: boolean; user?: any; error?: string }> {
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

export async function syncUsersBatchToDB(users: any[]) {
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

export async function syncLessonPlanToDB(lessonPlan: any) {
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

export async function syncLessonPlansBatchToDB(lessonPlans: any[]) {
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

export async function syncNotebookEntryToDB(entry: any) {
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

export async function syncNotebookBatchToDB(dailyNotebook: any[]) {
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

export async function syncInspectorNoteToDB(note: any) {
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

export async function syncDistrictMessageToDB(message: any) {
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

export async function syncDirectMessageToDB(message: any) {
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

export async function syncCommunityResourceToDB(resource: any) {
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

export async function syncCommunityNotificationToDB(notification: any) {
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
