/**
 * SPEX - Lesson Plan Auto-Generation Engine (deterministic, no AI call)
 * محرك التوليد الآلي الفوري لمذكرة الحصة انطلاقاً من بيانات التوزيع السنوي
 * والمقاطع التعليمية (COMPLETE_ANNUAL_CURRICULUM) مباشرة — دون أي استدعاء شبكي
 * ودون تكرار بيانات المنهاج (قراءة مرجعية فقط).
 *
 * يُستعمل كخطوة أولى فورية؛ يبقى التوليد بالذكاء الاصطناعي والتحسين اليدوي
 * لكل حقل متاحَين لاحقاً لإثراء نفس السجل.
 */

import { LessonPlan, User } from '../types/spex';

export interface AutoGenerateSessionSource {
  fieldId: string;
  fieldName: string;
  finalCompetency: string;
  segmentGoal: string;
  sessionNumber: number;
  globalNumber: number;
  weekNumber: number;
  type: LessonPlan['sessionType'];
  typeLabel: string;
  objective: string;
  tools: string[];
}

export interface AutoGenerateContext {
  levelName: string;
  className?: string;
  teacher?: User;
  inspectorName?: string;
  dailyNotebookEntryId?: string;
  date?: string;
}

// قوالب بيداغوجية مرجعية لكل ميدان من الميادين الثلاثة الرسمية — تُستعمل فقط
// لصياغة المراحل الثلاث تلقائياً، وليست بديلاً عن بيانات المنهاج نفسها.
const FIELD_TEMPLATES: Record<
  string,
  {
    warmupGame: string;
    warmupRules: string;
    situation1: string;
    situation2: string;
    coolDown: string;
  }
> = {
  f_locomotion: {
    warmupGame: 'لعبة الأشكال والتجمد',
    warmupRules: 'يتنقل التلاميذ داخل الفضاء المحدد وعند إشارة الصفارة يتجمدون في وضعية متوازنة.',
    situation1: 'مسار حركي بعوائق بسيطة (تنقل، توازن، تغيير اتجاه) يجتازه كل تلميذ بدوره.',
    situation2: 'سباق تتابع جماعي عبر نفس المسار مع احترام الدور والمسافة الآمنة.',
    coolDown: 'مشي هادئ مع تمارين تنفس وتمطيط خفيف للأطراف السفلية.'
  },
  f_fundamentals: {
    warmupGame: 'لعبة الرمي والالتقاط السريع',
    warmupRules: 'يتبادل التلاميذ ثنائياً تمرير كرة خفيفة مع زيادة تدريجية في المسافة.',
    situation1: 'ورشات دورانية (جري - قفز - رمي) بأفواج صغيرة مع تصحيح فوري للأداء.',
    situation2: 'منافسة بين الأفواج على تنفيذ نفس الحركة الأساسية بدقة وسرعة.',
    coolDown: 'استرخاء موجه وحوار جماعي حول أفضل أداء لوحظ خلال الحصة.'
  },
  f_structuring: {
    warmupGame: 'لعبة المطاردة الجماعية',
    warmupRules: 'يُقسّم القسم إلى فوجين، فوج يطارد وفوج يهرب داخل فضاء محدد، مع التبديل.',
    situation1: 'لعبة جماعية صغيرة (3 ضد 3) لتطبيق قاعدة تنظيمية أو تكتيكية محددة.',
    situation2: 'مباراة مصغرة بين فرق القسم مع تحكيم تشاركي واحترام الأدوار.',
    coolDown: 'دائرة ختامية للحوار حول روح الفريق والتعاون واحترام القوانين.'
  }
};

const DEFAULT_TEMPLATE = FIELD_TEMPLATES.f_locomotion;

const SAFETY_RULES_BASE = [
  'تفقد أرضية النشاط والتأكد من خلوها من العوائق والأجسام الحادة قبل بدء الحصة.',
  'التأكد من ارتداء التلاميذ للباس واللباس الرياضي المناسب (حذاء رياضي مربوط جيداً).',
  'احترام التدرج في شدة المجهود البدني وتجنب الإجهاد المفاجئ.',
  'التذكير المستمر بالمسافات الآمنة بين التلاميذ أثناء الحركة الجماعية.'
];

function sessionTypeSafetyExtra(type: LessonPlan['sessionType']): string[] {
  switch (type) {
    case 'تقويمية':
    case 'تقويم تحصيلي':
      return ['التأكد من تكافؤ فرص التقييم بين جميع التلاميذ ومراعاة ذوي الاحتياجات الخاصة.'];
    case 'إدماجية':
      return ['متابعة لصيقة للتلاميذ الأقل تحكماً أثناء الوضعية الإدماجية.'];
    default:
      return [];
  }
}

/**
 * توليد مذكرة حصة كاملة وفورياً من معطيات حصة في التوزيع السنوي، دون أي استدعاء AI.
 */
export function autoGenerateLessonPlan(session: AutoGenerateSessionSource, ctx: AutoGenerateContext): LessonPlan {
  const template = FIELD_TEMPLATES[session.fieldId] || DEFAULT_TEMPLATE;
  const teacher = ctx.teacher;

  const equipmentNeeded = session.tools.length > 0 ? session.tools : ['أقماع', 'ميقاتي', 'صفارة'];

  return {
    id: `lp_auto_${Date.now()}`,
    dailyNotebookEntryId: ctx.dailyNotebookEntryId,
    teacherId: teacher?.id || '',
    institutionName: teacher?.schoolName || 'المؤسسة التعليمية',
    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'أستاذ المادة',
    inspectorName: ctx.inspectorName,
    levelName: ctx.levelName,
    className: ctx.className || '',
    fieldName: session.fieldName,
    competencyTitle: session.finalCompetency,
    segmentTitle: `${session.fieldName.split(':')[1]?.trim() || session.fieldName} — ${session.typeLabel}`,
    sessionTitle: session.objective,
    sessionType: session.type,
    sessionTypeNumber: session.typeLabel,
    sessionGlobalNumber: session.globalNumber,
    annualSessionRef: `التوزيع السنوي - الأسبوع ${String(session.weekNumber).padStart(2, '0')} / الحصة ${String(
      session.globalNumber
    ).padStart(2, '0')} (${session.typeLabel})`,
    segmentGoal: session.segmentGoal,
    date: ctx.date || new Date().toISOString().split('T')[0],
    durationMinutes: 60,
    equipmentNeeded,
    equipmentChecklist: equipmentNeeded.map((name) => ({ name, available: true })),
    generalObjective: `تحقيق هدف الحصة: ${session.objective}`,
    proceduralObjectives: {
      motor: `أن ينفذ التلميذ الحركة/المهارة الخاصة بـ (${session.objective}) بتناسق وتحكم حركي مناسب لسنه.`,
      cognitive: 'أن يدرك التلميذ القواعد والتعليمات المنظمة للنشاط ويستوعب الهدف من الوضعية.',
      communication: 'أن يتواصل التلميذ بفاعلية مع زملائه ويستجيب لإشارات الأستاذ والصفارة.',
      personalSocial: 'أن يُظهر التلميذ الانضباط والروح الرياضية والتعاون مع أفراد فوجه.'
    },
    warmupPhase: {
      duration: '10-12 دقيقة',
      pedagogicalWarmupGame: {
        title: template.warmupGame,
        rules: template.warmupRules,
        equipment: equipmentNeeded.slice(0, 2).join('، ')
      },
      generalWarmup: 'جري خفيف مع تمارين تحريك المفاصل وتغيير الاتجاهات.',
      specificWarmup: `تمارين تمهيدية خاصة تهيئ التلميذ لمهارة (${session.objective}).`,
      organization: 'أفواج متوازية ضمن مساحات آمنة تحت إشراف مباشر للأستاذ.'
    },
    mainPhase: {
      duration: '30-35 دقيقة',
      problemSituation: `كيف يمكن تحقيق هدف الحصة (${session.objective}) بدقة وسرعة مع احترام القواعد؟`,
      learningSituation1: {
        title: 'الموقف التعلمي الأول',
        description: template.situation1,
        dosing: '3 محاولات/جولات لكل فوج',
        criteria: 'الدقة في الأداء الحركي واحترام التعليمات.'
      },
      learningSituation2: {
        title: 'الموقف التعلمي الثاني (تنافسي)',
        description: template.situation2,
        dosing: 'جولتان بين الأفواج',
        criteria: 'تحقيق هدف الحصة ضمن روح المنافسة الشريفة.'
      },
      guidedApplication: {
        title: 'التطبيق الموجه والمنافسة الختامية',
        description: `تطبيق شامل لهدف الحصة (${session.objective}) بين فرق القسم بإشراف الأستاذ.`,
        rules: 'احترام القوانين والروح الرياضية والتعاون بين الفريق الواحد.'
      }
    },
    coolDownPhase: {
      duration: '5-8 دقائق',
      activities: template.coolDown,
      assessmentAndDialogue: 'حوار تقييمي جماعي حول مدى تحقيق هدف الحصة وأبرز الملاحظات.'
    },
    safetyRules: [...SAFETY_RULES_BASE, ...sessionTypeSafetyExtra(session.type)],
    aiGenerated: false,
    version: 1,
    createdAt: new Date().toISOString()
  };
}
