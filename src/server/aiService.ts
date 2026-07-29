/**
 * SPEX - Server-side Gemini AI Service
 * محرك الذكاء الاصطناعي التربوي لمستندات ومذكرات التربية البدنية والرياضية
 */

import { GoogleGenAI } from '@google/genai';

function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export async function testGeminiApiKey(apiKey: string): Promise<{ valid: boolean; message: string; quotaExhausted?: boolean }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { valid: false, message: 'مفتاح الاستعلام (API Key) غير مكتمل أو غير صالح.' };
  }

  try {
    const client = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'مرحباً، فحص الاتصال بالبنك البيداغوجي المتقدم.',
      config: { maxOutputTokens: 10 }
    });

    if (response.text) {
      return { valid: true, message: '🟢 تم التحقق بنجاح! المفتاح نشط وجاهز للعمل مع العميل المخصص للحساب.' };
    }
    return { valid: false, message: 'تعذر استلام رد من الخدمة.' };
  } catch (err: any) {
    const errorStr = String(err?.message || err);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota exceeded')) {
      return {
        valid: false,
        quotaExhausted: true,
        message: '🟡 المفتاح صحيح ولكن تم استنفاذ السعة اليومية المتاحة لهذا المفتاح اليوم. يتجدد الرصيد تلقائياً غداً صباحاً.'
      };
    }
    return { valid: false, message: '❌ مفتاح غير صالح أو مرفوض من الخدمة. يرجى التأكد من نسخه بشكل صحيح من Google AI Studio.' };
  }
}

export interface GenerateLessonRequest {
  levelName: string;
  fieldName: string;
  competencyTitle: string;
  segmentTitle: string;
  sessionTitle: string;
  sessionType?: 'تعلمية' | 'إدماجية' | 'تقويمية' | 'علاجية' | 'تقويم تشخيصي' | 'تقويم تحصيلي';
  sessionTypeNumber?: string;
  inspectorName?: string;
  teacherName?: string;
  institutionName?: string;
  customObjective?: string;
  customEquipment?: string;
  customApiKey?: string;
}

export async function generatePELessonPlan(req: GenerateLessonRequest) {
  const client = getGeminiClient(req.customApiKey);

  const systemInstruction = `أنت الخبير التربوي والمستشار البيداغوجي لمادة التربية البدنية والرياضية في الطور الابتدائي حصراً وفق المنهاج الرسمي لوزارة التربية الوطنية الجزائرية.
قواعد جازمة وخاصة بـ SPEX الابتدائي:
1. المنصة حصرية للطور الابتدائي بالجزائر (السنوات: 1، 2، 3، 4، 5 ابتدائي فقط).
2. الالتزام بالأهداف المسطرة في المقاطع التعليمية لكل ميدان ولكل مستوى في المنهج الوزاري.
3. المرحلة الأولى (المرحلة التحضيرية / الإحماء): تعتمد إجباريًا إحماءً بلعبة تربوية حركية ممتعة وآمنة (pedagogicalWarmupGame).
4. المرحلة الأساسية (المرحلة التعلمية): تتكون إجبارياً من موقفين للعبتين تربويتين تنافسيتين (learningSituation1 و learningSituation2) تُحققان هدف الحصة المسطر وتنميان روح التنافس الشريف والتحدي.
5. توفير البيانات الرسمية كاملة: اسم الأستاذ، اسم المفتش، اسم المدرسة، نوع الحصة التعلمية ورقمها (أو تقويم تشخيصي أو تقويم تحصيلي أو إدماجية)، هدف الحصة الخاص الإجرائي، والكفاءة الختامية للميدان الذي تتبع له الحصة.

المخرجات يجب أن تكون صيغة JSON منظمة بالكامل بالشكل التالي بالضبط:
{
  "generalObjective": "...",
  "proceduralObjectives": {
    "motor": "...",
    "cognitive": "...",
    "communication": "...",
    "personalSocial": "..."
  },
  "equipmentNeeded": ["...", "..."],
  "safetyRules": ["...", "..."],
  "warmupPhase": {
    "duration": "10-12 دقيقة",
    "pedagogicalWarmupGame": {
      "title": "اسم اللعبة التربوية الإحمائية",
      "rules": "قواعد ومجريات اللعبة التربوية",
      "equipment": "الوسائل البسيطة المستعملة"
    },
    "generalWarmup": "جري خفيف وتنشيط الدورة الدموية",
    "specificWarmup": "تمارين مرونة وإطالات موجهة",
    "organization": "تشكيل منظّم للمجموعات"
  },
  "mainPhase": {
    "duration": "30-35 دقيقة",
    "problemSituation": "...",
    "learningSituation1": {
      "title": "الموقف الأول: اللعبة التربوية التنافسية الأولى",
      "description": "شرح اللعبة، طريقة التنافس، والربط بهدف الحصة",
      "dosing": "عدد الجولات وتداول الأدوار",
      "criteria": "معيار ومؤشر النجاح لتحقيق الهدف"
    },
    "learningSituation2": {
      "title": "الموقف الثاني: اللعبة التربوية التنافسية الثانية",
      "description": "شرح اللعبة التنافسية الثانية المعززة للهدف تحت ضغط التنافس",
      "dosing": "عدد الجولات والزمن",
      "criteria": "معيار الأداء والنجاح"
    },
    "guidedApplication": {
      "title": "المنافسة الجماعية الختامية والتطبيق الموجه",
      "description": "مواجهة تطبيقية بين الفرق للتطبيق الشامل للهدف",
      "rules": "قوانين التنافس الشريف والروح الرياضية"
    }
  },
  "coolDownPhase": {
    "duration": "5-10 دقائق",
    "activities": "مش واسترخاء وتنفس هادئ",
    "assessmentAndDialogue": "حوار تقييمي وتوزيع الانطباعات"
  }
}`;

  const userPrompt = `قم بتوليد مذكرة حصة كاملة حسب المعطيات التالية:
المستوى الدراسي: ${req.levelName}
الميدان التعليمي: ${req.fieldName}
الكفاءة الختامية: ${req.competencyTitle}
المقطع التعليمي: ${req.segmentTitle}
عنوان الحصة: ${req.sessionTitle}
نوع الحصة: ${req.sessionType || 'تعلمية'}
${req.customObjective ? `الهدف الخاص المحدد من الأستاذ: ${req.customObjective}` : ''}
${req.customEquipment ? `الوسائل المتوفرة: ${req.customEquipment}` : ''}`;

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + '\n\n' + userPrompt }] }
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        return JSON.parse(jsonText);
      }
    } catch (err: any) {
      const errorStr = String(err?.message || err);
      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota exceeded')) {
        console.warn('Daily quota limit reached for this account/key. Falling back to local stored pedagogical bank.');
        const fallback = generateFallbackLessonPlan(req);
        return {
          ...fallback,
          quotaNotice: '⚠️ تم استنفاذ السعة اليومية المتاحة للاستعلام المباشر لهذا الحساب اليوم. يتجدد الرصيد اليومي تلقائياً غداً صباحاً. تم استخراج المذكرة بنجاح من بنك المذكرات والأنشطة المخزنة مسبقاً بالمنصة.'
        };
      }
      console.warn('Gemini API call error, falling back to dynamic generator:', err);
    }
  }

  // Fallback pedagogical generator if API key is not configured or call fails
  return generateFallbackLessonPlan(req);
}

export async function suggestPEGames(fieldName: string, levelName: string, customApiKey?: string) {
  const client = getGeminiClient(customApiKey);
  const prompt = `اقترح 3 ألعاب تربوية رياضية ممتعة ومناسبة لمادة التربية البدنية والرياضية في الجزائر.
الميدان: ${fieldName}
المستوى: ${levelName}
قم بإرجاع النتيجة بصيغة JSON كقائمة تحتوي على: title, description, equipment (قائمة), rules, duration.`;

  if (client) {
    try {
      const res = await client.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      if (res.text) return JSON.parse(res.text);
    } catch (e: any) {
      console.warn('Gemini fallback for games:', e);
    }
  }

  return [
    {
      title: `لعبة التتابع السريع والسيطرة على الكرات (${fieldName})`,
      description: `لعبة تنافسية حماسية تهدف إلى زيادة اللياقة والتنسيق الجسدي المتبادل.`,
      equipment: ['أقماع شواخص (8)', 'كرات مخصصة (4)', 'صفارات'],
      rules: 'يتنافس فريقان في مسار زجزاجي، مع الالتزام بالتمرير أو التنقل السليم دون إسقاط الأدوات.',
      duration: '10-12 دقيقة'
    },
    {
      title: `لعبة الرادار والمدافع الخفي`,
      description: `تنمي سرعة رد الفعل والملاحظة التاكتيكية أثناء التموقع في الميدان.`,
      equipment: ['شواخص ملونة', 'صدريات مميزة'],
      rules: 'يتحرك المدافع الخفي للقطع المفاجئ للكرة مع مراعاة السلامة وعدم الاحتكاك الخشن.',
      duration: '10 دقائق'
    }
  ];
}

export async function generateAIChatResponse(
  userMessage: string,
  conversationHistory: { role: 'user' | 'model'; text: string }[],
  customApiKey?: string
) {
  const client = getGeminiClient(customApiKey);
  const systemPrompt = `أنت "مستشار SPEX البيداغوجي المعتمد من قاعدة البيانات المنهاجية" - الخبير والمستشار البيداغوجي لمادة التربية البدنية والرياضية في الطور الابتدائي حصراً وفق المنهاج الوزاري وقاعدة البيانات الجزائرية.
أسلوبك: صبور، مشجع، عملي، ومراعي للخصائص السيكولوجية والبدنية لأطفال المدارس الابتدائية.
ساعد أستاذ الابتدائي أو المفتش في الإجابة على استفسارات المنهج، صياغة الأهداف الحركية، اختيار الألعاب التمهيدية، حل مشكلات انضباط التلاميذ، وتوليد الوثائق البيداغوجية الرسمية.
أجب دائماً بلغة عربية ناصعة ومنسقة بوضوح باستخدام النقاط والترقيم.`;

  if (client) {
    try {
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...conversationHistory.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const res = await client.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contents as any,
        config: { temperature: 0.7 }
      });

      if (res.text) return res.text;
    } catch (e: any) {
      const errorStr = String(e?.message || e);
      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota exceeded')) {
        return `⚠️ **ملاحظة بيداغوجية من منصة SPEX**:
تم استنفاذ السعة اليومية المتاحة للاستعلام المباشر لهذا الحساب اليوم. يتجدد الرصيد اليومي تلقائياً غداً صباحاً.

يمكنك في هذه الأثناء الاعتماد على بنك المذكرات والوضعيات والأنشطة البيداغوجية المخزنة مسبقاً في المنصة، أو مراجعة شاشات الدروس ودليل المنهاج المتاح بدون انقطاع.`;
      }
      console.warn('Chat Gemini error:', e);
    }
  }

  return `أهلاً بك أستاذي الكريم! كمستشار بيداغوجي في منصة **SPEX** للتربية البدنية والرياضية وفق المنهاج الجزائري:

بخصوص سؤالك: "${userMessage}"

إليك التوجيهات البيداغوجية الموصى بها من قاعدة البيانات المنهاجية:
1. **الالتزام بالكفاءة الختامية**: ربط النشاط التعليمي بالمؤشرات المعرفية والحركية المعتمدة في المنهج الرسمية.
2. **التدرج في الشدة والجرعة**: البدء بوضعيات مبسطة فردية قبل الانتقال للوضعيات التنافسية الجماعية.
3. **التطبيق الموجه والسلامة**: التأكد دائماً من تهيئة الميدان والسلامة البدنية للتلاميذ قبل إقامة السباقات.

هل تود أن أصيغ لك نموذجاً تطبيقياً أو هدفا إجرائياً محدداً لهذه الحصة؟`;
}

function generateFallbackLessonPlan(req: GenerateLessonRequest) {
  return {
    generalObjective: req.customObjective || `تحقيق هدف المقطع التعليمي الخاص بـ (${req.sessionTitle}) وفق مؤشرات المنهج الوزاري الرسمية.`,
    proceduralObjectives: {
      motor: `أن ينفذ التلميذ المهارة الحركية والبدنية لـ (${req.sessionTitle}) بتناسق وتوافق حركي وسلاسة.`,
      cognitive: `أن يدرك التلميذ القواعد والقوانين المنظمة والإدراك الزماني والمكاني للوضعية.`,
      communication: `أن يتواصل التلميذ بفاعلية مع أفراد أفواج النشاط ويستجيب للإشارات الصوتية والبصرية.`,
      personalSocial: `أن يظهر التلميذ الروح الرياضية التنافسية، الانضباط والتعاون والمحافظة على أمان الزملاء.`
    },
    equipmentNeeded: req.customEquipment ? req.customEquipment.split(/[,،]/).map(s => s.trim()) : ['ميقاتي رقمي', 'أقماع ملونة (10)', 'كرات وأدوات رياضية مخصصة', 'صفارة حكّم', 'أشرطة تحديد الميدان'],
    safetyRules: [
      'التفقد الميداني لخلو ساحة التربية البدنية من العوائق والأجسام الصلبة',
      'التأكد من ارتداء اللباس والحذاء الرياضي الموحد والمناسب للنشاط',
      'مراعاة التدرج في الإحماء والجهد البدني تجنباً للإصابات العضلية'
    ],
    warmupPhase: {
      duration: '10-12 دقيقة',
      pedagogicalWarmupGame: {
        title: `لعبة الصياد والأسماك السريعة (إحماء تربوي حر)`,
        rules: `يتنقل التلاميذ داخل منطقة محددة بالإيقاع الجري، وعند إشارة الأستاذ يحاول "الصياد" المساس بأكبر عدد مع تفادي الاصطدام.`,
        equipment: 'أقماع ملونة لتحديد منطقة اللعب + صدريات للتمجيد'
      },
      generalWarmup: 'جري خفيف حول الميدان مع تغيير الاتجاهات والتوقف الذكي عند سماع صفارة الأستاذ.',
      specificWarmup: 'تمارين مرونة المفاصل والإطالة العضلية الديناميكية الموجهة للطرفين السفليين والعلويين.',
      organization: 'مجموعات متوازية مع الحفاظ على مسافة أمان كافية بين التلاميذ.'
    },
    mainPhase: {
      duration: '30-35 دقيقة',
      problemSituation: `كيف تتغلب على الفريق المنافس وتصل للهدف بسرعة ودقة مع تطبيق حركات (${req.sessionTitle})؟`,
      learningSituation1: {
        title: `الموقف الأول (لعبة تربوية تنافسية 1): سباق التتابع والدقة الحركية`,
        description: `يتنافس قاطرتان بين الأقماع للوصول إلى النقطة النهائية وأداء الحركة المطلوبة ثم العودة لتسليم الشاهد لزميله.`,
        dosing: `3 جولات تنافسية متتالية مع احتساب النقاط لكل فوج.`,
        criteria: `سرعة الإنجاز والالتزام بقواعد اللعبة والدقة الحركية.`
      },
      learningSituation2: {
        title: `الموقف الثاني (لعبة تربوية تنافسية 2): مباراة التحدي والتصويب الجماعي`,
        description: `موقف تنافسي مركب يتواجه فيه فريقان لإنجاز المهارة تحت ضغط المنافسة المباشرة مع تطبيق قواعد الهدف.`,
        dosing: `جولتان لمدة 5 دقائق لكل جولة مع تبادل الملاعب.`,
        criteria: `تحقيق هدف الحصة عبر جمع أكبر عدد من النقاط وفق شروط التنافس.`
      },
      guidedApplication: {
        title: `المنافسة الختامية والتطبيق الموجه: بطولة مصغرة داخل القسم`,
        description: `إقامة منافسة شاملة بين أندية القسم (نادي أ ونادي ب) لتطبيق المهارة مع تشجيع التلاميذ.`,
        rules: `احترام قوانين اللعبة والتنافس الشريف والروح الرياضية.`
      }
    },
    coolDownPhase: {
      duration: '5-10 دقائق',
      activities: 'المشي الخفيف، حركات التنفس الموجهة والاسترخاء العضلي للتهدئة.',
      assessmentAndDialogue: 'حوار تقييمي مع الأستاذ لاستخلاص الانطباعات، ثناء الأستاذ وتسجيل نتائج التقويم.'
    }
  };
}
