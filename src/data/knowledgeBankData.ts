/**
 * SPEX - Educational Knowledge Bank Seed Data for Primary Education
 * بنك المعرفة التربوية للطور الابتدائي: الأهداف الحركية، الألعاب التمهيدية، والأنشطة العلاجية للأطفال
 */

import { KnowledgeItem } from '../types/spex';
import fundamentalGameSeed from '../../arenaspex_situations_mapped_to_objectives (1).json';

type FundamentalGameSeed = {
  id: string;
  grade: number;
  name: string;
  field_id: string;
  field_name: string;
  source_goal: string;
  organization: string;
  equipment?: string;
  variations?: string;
  source_page?: number;
  origin?: string;
};

// Three clearly game-like, source-backed activities per grade. This is a read-only
// projection of the reviewed guide data; the EducationalSituation records remain untouched.
const FUNDAMENTAL_GAME_SOURCE_IDS = new Set([
  'PDF-G1-06',
  'PDF-G1-08',
  'PDF-G1-19',
  'PDF-G2-06',
  'PDF-G2-16',
  'PDF-G2-18',
  'PDF-G3-06',
  'PDF-G3-16',
  'PDF-G3-18',
  'PDF-G4-06',
  'PDF-G4-16',
  'PDF-G4-18',
  'PDF-G5-06',
  'PDF-G5-16',
  'PDF-G5-18',
]);

const FUNDAMENTAL_REFERENCE_GAMES: KnowledgeItem[] = (fundamentalGameSeed as FundamentalGameSeed[])
  .filter((item) => item.field_id === 'f_fundamentals' && FUNDAMENTAL_GAME_SOURCE_IDS.has(item.id))
  .map((item) => ({
    id: `kg_${item.id.toLowerCase()}`,
    category: 'game',
    title: item.name,
    description: item.source_goal,
    origin: 'REFERENCE',
    fieldId: 'f_fundamentals',
    fieldName: 'الحركات القاعدية',
    levelIds: [`lvl_p${item.grade}`],
    levelName: `السنة ${item.grade} ابتدائي`,
    tags: ['مرجع دليل الألعاب التمهيدية', 'الحركات القاعدية'],
    equipment: (item.equipment || '')
      .split(/[،,]/)
      .map((value) => value.trim())
      .filter(Boolean),
    rules: item.organization,
    duration: undefined,
    approved: true,
    approvalStatus: 'APPROVED',
    createdBy:
      item.origin || 'دليل الألعاب التمهيدية للتربية البدنية والرياضية بسلك التعليم الابتدائي 2022',
    usageCount: 0,
    rating: 0,
  }));

export const INITIAL_KNOWLEDGE_BANK: KnowledgeItem[] = [
  // Games for Primary PE (ألعاب تربوية رياضية مخصصة للابتدائي)
  {
    id: 'k_g1',
    category: 'game',
    title: 'لعبة الثعلب والأرانب السريعة (سرعة رد الفعل)',
    description:
      'لعبة تنافسية ممتعة جداً لتطوير سرعة الاستجابة الصوتية والانطلاق المفاجئ من وضعيات حركية متنوعة لدى أطفال الابتدائي.',
    origin: 'REFERENCE',
    fieldId: 'f_locomotion',
    fieldName: 'الوضعيات والتنقلات',
    levelIds: ['lvl_p1', 'lvl_p2'],
    levelName: 'السنة الأولى والثانية ابتدائي',
    tags: ['ألعاب حركية', 'إحماء', 'سرعة', 'رد فعل'],
    equipment: ['أقماع ملونة عدد 8', 'صفارة إشارة'],
    rules:
      'يقف الأطفال في خطين متوازيين (الثعالب والأرانب). عند سماع إشارة الأستاذ ينطلق الأرانب نحو المنطقة الآمنة بينما تحاول الثعالب لمسهم خفيفاً.',
    duration: '10 دقائق',
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 240,
    rating: 5.0,
  },
  {
    id: 'k_g2',
    category: 'game',
    title: 'لعبة صياد الكرات الإسفنجية (التنقل والتمرير)',
    description:
      'لعبة كروية مصغرة لتعليم التمرير الصدري والتنقل بالكرة الإسفنجية بسلامة والتواصل الجماعي.',
    origin: 'REFERENCE',
    fieldId: 'f_structuring',
    fieldName: 'الهيكلة والبناء',
    levelIds: ['lvl_p3', 'lvl_p4'],
    levelName: 'السنة الثالثة والرابعة ابتدائي',
    tags: ['كرة مصغرة', 'تمرير', 'تنسيق حركي'],
    equipment: ['كرات إسفنجية خفيفة 6', 'صدريات ملونة'],
    rules:
      'ينقسم القسم لأربعة أفواج، ويتم التمرير السريع باليدين لتسجيل النقاط عند إيصال الكرة للزميل في الدائرة المحددة.',
    duration: '12 دقيقة',
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 195,
    rating: 4.9,
  },
  {
    id: 'k_g3',
    category: 'game',
    title: 'لعبة الجسر المائل والتوازن الثابت (الجمباز والاتزان)',
    description:
      'تعزز وضعية التوازن الثابت على قدم واحدة والمشي المتزن على المقاعد السويدية الخشبية أو الخطوط الرسمية.',
    origin: 'REFERENCE',
    fieldId: 'f_locomotion',
    fieldName: 'الوضعيات والتنقلات',
    levelIds: ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'],
    levelName: 'جميع مستويات الابتدائي (1-5 ابتدائي)',
    tags: ['جمباز', 'توازن', 'تركيز'],
    equipment: ['بساط جمباز', 'مقاعد خشبية منخفضة'],
    rules:
      'يمشي الطفل ببطء مع فتح الذراعين جانباً للحفاظ على التوازن، ثم يؤدي الوقوف المتزن لمدة 5 ثوان عند نهاية المسار.',
    duration: '12 دقيقة',
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 160,
    rating: 4.8,
  },

  // Source-backed fundamental movement games (دليل الألعاب التمهيدية 2022)
  ...FUNDAMENTAL_REFERENCE_GAMES,

  // Objectives (بنك الأهداف التربوية الإجرائية للابتدائي)
  {
    id: 'k_o1',
    category: 'objective',
    title: 'التنسيق بين العين واليد أثناء رمي الكرات الخفيفة نحو الشواخص',
    description:
      'أن يرمي التلميذ الكرة الإسفنجية باليد المفضلة نحو شاخص ملون يبعد 4 أمتار ويصيبه بنجاح في 3 محاولات من أصل 5.',
    origin: 'REFERENCE',
    fieldId: 'f_fundamentals',
    fieldName: 'الحركات القاعدية',
    levelIds: ['lvl_p1', 'lvl_p2'],
    levelName: 'السنة الأولى والثانية ابتدائي',
    tags: ['رمي', 'دقة', 'توافق حركي'],
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 210,
    rating: 4.9,
  },
  {
    id: 'k_o2',
    category: 'objective',
    title: 'تسليم واستلام الشريط الملون في الجري التتابعي الجماعي',
    description:
      'أن يتمكن التلميذ من تسليم الشريط القماشي لزميله في منطقة التناوب دون إيقاف الجري أو إسقاط الشريط.',
    origin: 'REFERENCE',
    fieldId: 'f_structuring',
    fieldName: 'الهيكلة والبناء',
    levelIds: ['lvl_p4', 'lvl_p5'],
    levelName: 'السنة الرابعة والخامسة ابتدائي',
    tags: ['سباق تتابع', 'شاهد', 'سرعة'],
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 175,
    rating: 4.8,
  },

  // Situations (الوضعيات التعلمية للابتدائي)
  {
    id: 'k_s1',
    category: 'situation',
    title: 'وضعية مشكلة هدف: تجاوز المدافع والتمرير السريع للزميل الشاغر في لعبة الكرة المصغرة',
    description:
      'مواجهة بين فريقين مصغرين (3 ضد 3) في نصف ملعب الابتدائي، حيث يُشترط إجراء تمريرتين قبل التصويب على القمع الملون.',
    origin: 'REFERENCE',
    fieldId: 'f_structuring',
    fieldName: 'الهيكلة والبناء',
    levelIds: ['lvl_p5'],
    levelName: 'السنة الخامسة ابتدائي',
    tags: ['وضعية مشكلة', 'تمرير', 'تفكير حركي'],
    equipment: ['كرات خفيفة', 'صدريات ملونة', 'أقماع'],
    duration: '18 دقيقة',
    approved: true,
    createdBy: 'مرجع المنصة',
    usageCount: 140,
    rating: 4.9,
  },

  // Remedial (أنشطة علاجية للأطفال)
  {
    id: 'k_r1',
    category: 'remedial',
    title: 'نشاط علاجي: معالجة عدم التوازن أو الخوف أثناء الدحرجة الأمامية البسيطة',
    description:
      'استخدام بساط مائل بزاوية خفيفة جداً مع ثني الرأس نحو الصدر ومساعدة الأستاذ اليدوية المباشرة لترسيخ الأمان والاطمئنان.',
    origin: 'REFERENCE',
    fieldId: 'f_locomotion',
    fieldName: 'الوضعيات والتنقلات',
    levelIds: ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'],
    levelName: 'جميع مستويات الابتدائي',
    tags: ['علاجي', 'جمباز', 'دحرجة', 'ثقة بالنفس'],
    equipment: ['بساط جمباز سميك', 'وسائد حماية'],
    duration: '10 دقائق',
    approved: true,
    createdBy: 'مرجع المنصة',
    remedialProblem: 'عدم التوازن أو الخوف أثناء الدحرجة الأمامية البسيطة',
    targetSkill: 'الدحرجة الأمامية الآمنة والتحكم في وضعية الجسم',
    usageCount: 185,
    rating: 5.0,
  },
];
