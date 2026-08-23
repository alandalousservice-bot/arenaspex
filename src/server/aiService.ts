/** SPEX AI Service — provider-agnostic business layer. */
import { generateAI, generateAIWithUserCredential, getAIProviderStatus, testAIProvider, tryParseJson, type AIProviderId, type UserCredentialRuntime, type AIRequest } from './aiGateway.js';

export interface GenerateLessonRequest {
  levelName: string;
  fieldName: string;
  competencyTitle: string;
  segmentTitle: string;
  sessionTitle: string;
  sessionType?: string;
  sessionTypeNumber?: string;
  inspectorName?: string;
  teacherName?: string;
  institutionName?: string;
  customObjective?: string;
  customEquipment?: string;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
}

const systemInstruction = `أنت الخبير التربوي والمستشار البيداغوجي لمادة التربية البدنية والرياضية في الطور الابتدائي حصراً وفق المنهاج الرسمي لوزارة التربية الوطنية الجزائرية.
المنصة مخصصة للطور الابتدائي في الجزائر. التزم بالهدف والكفاءة والمقطع والمستوى المعطاة. أخرج JSON صالحاً فقط عند طلب JSON.`;

export async function generatePELessonPlan(req: GenerateLessonRequest, credential?: UserCredentialRuntime) {
  const prompt = `قم بتوليد مذكرة حصة كاملة بصيغة JSON منظمة حسب المعطيات التالية:
المستوى الدراسي: ${req.levelName}
الميدان التعليمي: ${req.fieldName}
الكفاءة الختامية: ${req.competencyTitle}
المقطع التعليمي: ${req.segmentTitle}
عنوان الحصة: ${req.sessionTitle}
نوع الحصة: ${req.sessionType || 'تعلمية'}
${req.customObjective ? `الهدف الخاص: ${req.customObjective}` : ''}
${req.customEquipment ? `الوسائل المتوفرة: ${req.customEquipment}` : ''}
يجب أن تحتوي النتيجة على: generalObjective, proceduralObjectives, equipmentNeeded, safetyRules, warmupPhase, mainPhase, coolDownPhase، وأن تكون قابلة للعرض مباشرة في SPEX.`;

  try {
    const request: AIRequest = {
      preferredProvider: req.preferredProvider,
      preferredModel: req.preferredModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      json: true,
      temperature: 0.7,
      maxTokens: 5000
    };
    const result = credential ? await generateAIWithUserCredential(request, credential) : await generateAI(request);
    const parsed = tryParseJson<Record<string, unknown>>(result.text);
    if (parsed) return { ...parsed, aiProvider: result.provider, aiModel: result.model };
  } catch (error) {
    console.warn('[SPEX AI] lesson generation failed; using local fallback:', error);
  }
  return generateFallbackLessonPlan(req);
}

export interface ImproveWordingRequest {
  fieldLabel: string; // e.g. "الهدف العام للحصة"
  currentText: string;
  context?: string; // e.g. levelName + fieldName + sessionTitle, for relevance
  preferredProvider?: AIProviderId;
  preferredModel?: string;
}

/**
 * تحسين صياغة حقل نصي واحد في مذكرة الحصة (وليس توليد المذكرة كاملة) —
 * يُستعمل من زر "تحسين الصياغة" داخل مساحة العمل التفاعلية لأي حقل قابل للتحرير.
 */
export async function improvePELessonWording(req: ImproveWordingRequest, credential?: UserCredentialRuntime) {
  const prompt = `حسّن صياغة النص التالي الموجود في حقل "${req.fieldLabel}" ضمن مذكرة حصة تربية بدنية ورياضية للطور الابتدائي بالجزائر، ${req.context ? `في سياق: ${req.context}. ` : ''}مع الحفاظ على نفس المعنى والمصطلحات البيداغوجية الرسمية، بأسلوب أوضح وأكثر احترافية وإيجازاً. النص الحالي:\n"""${req.currentText}"""\nأرجع فقط النص المحسّن دون أي شرح إضافي أو علامات اقتباس.`;

  try {
    const request: AIRequest = {
      preferredProvider: req.preferredProvider,
      preferredModel: req.preferredModel,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      json: false,
      temperature: 0.5,
      maxTokens: 600
    };
    const result = credential ? await generateAIWithUserCredential(request, credential) : await generateAI(request);
    const improved = (result.text || '').trim().replace(/^"|"$/g, '');
    if (improved) return { improvedText: improved, aiProvider: result.provider, aiModel: result.model };
  } catch (error) {
    console.warn('[SPEX AI] wording improvement failed:', error);
  }
  // Fallback: بدون AI متاح، نعيد النص الأصلي مع تنبيه بدل فشل الطلب بالكامل
  return { improvedText: req.currentText, aiProvider: 'local-fallback', aiModel: null };
}

export async function suggestPEGames(fieldName: string, levelName: string, preferredProvider?: AIProviderId, preferredModel?: string, context?: { objective?: string; existingGames?: string[]; existingSituations?: string[]; constraints?: Record<string, string> }, credential?: UserCredentialRuntime) {
  try {
    const request: AIRequest = {
      preferredProvider,
      preferredModel,
      messages: [{ role: 'user', content: `اقترح لعبة تربوية واحدة قابلة للتحرير لمادة التربية البدنية والرياضية في الجزائر. الميدان: ${fieldName}. المستوى: ${levelName}. الهدف المستهدف: ${context?.objective || 'غير محدد'}. الألعاب الموجودة لتجنب التكرار: ${(context?.existingGames || []).join('؛ ')}. المواقف المرجعية ذات الصلة: ${(context?.existingSituations || []).join('؛ ')}. القيود الاختيارية: ${JSON.stringify(context?.constraints || {})}. أرجع JSON لكائن واحد يحتوي على title, description, organization, rules, equipment, safety, progression.` }],
      json: true,
      temperature: 0.8,
      maxTokens: 2000
    };
    const result = credential ? await generateAIWithUserCredential(request, credential) : await generateAI(request);
    const parsed = tryParseJson<unknown>(result.text);
    if (parsed) return parsed;
  } catch (error) {
    console.warn('[SPEX AI] games generation failed:', error);
  }
  return [];
}

export async function generateAIChatResponse(userMessage: string, conversationHistory: { role: 'user' | 'model' | 'assistant'; text: string }[], preferredProvider?: AIProviderId, preferredModel?: string, credential?: UserCredentialRuntime) {
  try {
    const request: AIRequest = {
      preferredProvider,
      preferredModel,
      messages: [
        { role: 'system', content: 'أنت مستشار SPEX البيداغوجي لمادة التربية البدنية والرياضية في الطور الابتدائي في الجزائر. أجب بالعربية بوضوح وعملياً.' },
        ...conversationHistory.map(h => ({ role: h.role === 'model' ? 'assistant' as const : h.role, content: h.text })),
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      maxTokens: 4000
    };
    const result = credential ? await generateAIWithUserCredential(request, credential) : await generateAI(request);
    return result.text;
  } catch (error) {
    console.warn('[SPEX AI] chat failed:', error);
    return `أهلاً بك في منصة SPEX. تعذر الوصول إلى مزودات الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً أو استخدام بنك المحتوى التربوي المدمج.`;
  }
}

export async function getConfiguredAIProviders() {
  return getAIProviderStatus();
}

export async function testConfiguredAIProvider(provider: AIProviderId) {
  return testAIProvider(provider);
}

function generateFallbackLessonPlan(req: GenerateLessonRequest) {
  return {
    teacherName: req.teacherName || 'أستاذ المادة',
    institutionName: req.institutionName || 'المؤسسة التعليمية',
    generalObjective: req.customObjective || `تحقيق هدف المقطع التعليمي الخاص بـ (${req.sessionTitle}) وفق مؤشرات المنهج الوزاري.`,
    proceduralObjectives: {
      motor: `أن ينفذ التلميذ المهارة الحركية والبدنية لـ (${req.sessionTitle}) بتناسق وتوافق حركي.`,
      cognitive: 'أن يدرك القواعد والقوانين المنظمة والإدراك الزماني والمكاني للوضعية.',
      communication: 'أن يتواصل التلميذ بفاعلية مع أفراد الفوج ويستجيب للإشارات.',
      personalSocial: 'أن يظهر الروح الرياضية والانضباط والتعاون والمحافظة على سلامة الزملاء.'
    },
    equipmentNeeded: req.customEquipment ? req.customEquipment.split(/[,،]/).map(s => s.trim()).filter(Boolean) : ['ميقاتي رقمي', 'أقماع ملونة', 'كرات', 'صفارة', 'أشرطة تحديد الميدان'],
    safetyRules: ['تفقد ساحة النشاط وإزالة العوائق.', 'التأكد من اللباس والحذاء الرياضي المناسب.', 'مراعاة التدرج في الإحماء والجهد البدني.'],
    warmupPhase: { duration: '10-12 دقيقة', pedagogicalWarmupGame: { title: 'لعبة الصياد والأسماك السريعة', rules: 'يتنقل التلاميذ داخل منطقة محددة وعند الإشارة يحاول الصياد لمس أكبر عدد دون اصطدام.', equipment: 'أقماع وصدريات' }, generalWarmup: 'جري خفيف مع تغيير الاتجاهات.', specificWarmup: 'تمارين مرونة وإطالة ديناميكية.', organization: 'مجموعات متوازية مع مسافات أمان.' },
    mainPhase: { duration: '30-35 دقيقة', problemSituation: `كيف تنجز هدف (${req.sessionTitle}) بسرعة ودقة مع احترام قواعد المنافسة؟`, learningSituation1: { title: 'الموقف الأول: لعبة تربوية تنافسية', description: 'سباق تتابع بين مجموعات مع تنفيذ المهارة المطلوبة.', dosing: '3 جولات', criteria: 'الدقة والسرعة واحترام القواعد.' }, learningSituation2: { title: 'الموقف الثاني: تحدي جماعي', description: 'تطبيق المهارة تحت ضغط المنافسة.', dosing: 'جولتان', criteria: 'تحقيق هدف الحصة.' }, guidedApplication: { title: 'منافسة ختامية', description: 'تطبيق شامل للهدف بين فرق القسم.', rules: 'التنافس الشريف والروح الرياضية.' } },
    coolDownPhase: { duration: '5-10 دقائق', activities: 'مشي خفيف وتنفس واسترخاء.', assessmentAndDialogue: 'حوار تقييمي واستخلاص النتائج.' },
    aiProvider: 'local-fallback'
  };
}
