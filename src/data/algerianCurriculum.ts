/**
 * SPEX - Algerian Official Physical Education Curriculum Data for Primary Education
 * منهاج التربية البدنية والرياضية لمرحلة التعليم الابتدائي - وزارة التربية الوطنية الجزائرية
 * يشمل المخطط السنوي الكامل والمقاطع التعلمية للحصص العشر لكل مستوى من س1 إلى س5
 */

import {
  Directorate,
  InspectionDistrict,
  Institution,
  PELevel,
  PEField,
  FinalCompetency,
  LearningSegment,
  LearningUnit,
  PESession,
} from '../types/spex';
import {
  academicYearForDate,
  calendarEventForDate,
  getAcademicCalendar,
  isValidAcademicSchoolDate,
} from './academicCalendars';

// Directorates (مديريات التربية)
export const ALGERIAN_DIRECTORATES: Directorate[] = [
  {
    id: 'dir_alg_east',
    name: 'مديرية التربية لولاية الجزائر شرق',
    wilaya: 'الجزائر',
    code: '16-EAST',
  },
  {
    id: 'dir_alg_center',
    name: 'مديرية التربية لولاية الجزائر وسط',
    wilaya: 'الجزائر',
    code: '16-CENTER',
  },
  { id: 'dir_oran', name: 'مديرية التربية لولاية وهران', wilaya: 'وهران', code: '31' },
  { id: 'dir_constantine', name: 'مديرية التربية لولاية قسنطينة', wilaya: 'قسنطينة', code: '25' },
  { id: 'dir_setif', name: 'مديرية التربية لولاية سطيف', wilaya: 'سطيف', code: '19' },
  { id: 'dir_blida', name: 'مديرية التربية لولاية البليدة', wilaya: 'البليدة', code: '09' },
];

export const INSPECTION_DISTRICTS: InspectionDistrict[] = [
  {
    id: 'dist_alg_1',
    directorateId: 'dir_alg_east',
    name: 'مقاطعة إدارة وابتدائيات التربية البدنية 01 - رويبة والدار البيضاء',
  },
  {
    id: 'dist_alg_2',
    directorateId: 'dir_alg_east',
    name: 'مقاطعة إدارة وابتدائيات التربية البدنية 02 - الحراش وبرج الكيفان',
  },
  {
    id: 'dist_oran_1',
    directorateId: 'dir_oran',
    name: 'مقاطعة التفتيش الابتدائي للتربية البدنية 01 - وهران شرق',
  },
  {
    id: 'dist_const_1',
    directorateId: 'dir_constantine',
    name: 'مقاطعة التفتيش الابتدائي للتربية البدنية 01 - قسنطينة وسط',
  },
];

export const INSTITUTIONS: Institution[] = [
  {
    id: 'inst_1',
    districtId: 'dist_alg_1',
    directorateId: 'dir_alg_east',
    name: 'مدرسة الأمير عبد القادر الابتدائية - رويبة',
    type: 'ابتدائية',
    address: 'حي بن زرقة، رويبة، الجزائر',
  },
  {
    id: 'inst_2',
    districtId: 'dist_alg_1',
    directorateId: 'dir_alg_east',
    name: 'مدرسة طارق بن زياد الابتدائية - الدار البيضاء',
    type: 'ابتدائية',
    address: 'وسط المدينة، الدار البيضاء، الجزائر',
  },
  {
    id: 'inst_3',
    districtId: 'dist_alg_2',
    directorateId: 'dir_alg_east',
    name: 'مدرسة الشهيد أحمد زبانا الابتدائية - الحراش',
    type: 'ابتدائية',
    address: 'حي كُوريفة، الحراش',
  },
  {
    id: 'inst_4',
    districtId: 'dist_oran_1',
    directorateId: 'dir_oran',
    name: 'مدرسة العربي بن مهيدي الابتدائية - وهران',
    type: 'ابتدائية',
    address: 'حي السلام، وهران',
  },
];

export const PE_LEVELS: PELevel[] = [
  { id: 'lvl_p1', name: 'السنة الأولى ابتدائي', cycle: 'ابتدائي', order: 1 },
  { id: 'lvl_p2', name: 'السنة الثانية ابتدائي', cycle: 'ابتدائي', order: 2 },
  { id: 'lvl_p3', name: 'السنة الثالثة ابتدائي', cycle: 'ابتدائي', order: 3 },
  { id: 'lvl_p4', name: 'السنة الرابعة ابتدائي', cycle: 'ابتدائي', order: 4 },
  { id: 'lvl_p5', name: 'السنة الخامسة ابتدائي', cycle: 'ابتدائي', order: 5 },
];

export const OVERALL_COMPETENCY_BY_LEVEL: Record<string, string> = {
  lvl_p1:
    'التحكم في الوضعيات والتنقلات والحركات القاعدية الأساسية وتوظيفها في وضعيات لعب ونشاطات جماعية بسيطة منظمة، في إطار احترام الذات والآخرين.',
  lvl_p2:
    'التحكم في التنقلات والحركات القاعدية المركّبة وتوظيفها في وضعيات حركية ولعب جماعي منظم، مع الالتزام بقواعد النشاط والتعاون مع الزملاء.',
  lvl_p3:
    'بناء وتوظيف مهارات حركية وجماعية متنوعة في وضعيات مشكلة تتطلب التخطيط والتعاون واحترام القواعد، مع تنمية روح المبادرة.',
  lvl_p4:
    'التحكم في مهارات حركية وجماعية أكثر تعقيداً وتوظيفها في وضعيات تنافسية منظمة، مع تحمل المسؤولية الجماعية واحترام روح المنافسة الشريفة.',
  lvl_p5:
    'إدماج مجمل المكتسبات الحركية والمعرفية والاجتماعية في وضعيات تنافسية جماعية مركّبة، وبناء حلول جماعية تُظهر الاستقلالية والمسؤولية والانضباط.',
};

export function getFieldAllocatedHours(field: { sessionsCount: number }): number {
  return field.sessionsCount;
}

export const PE_FIELDS: PEField[] = [
  {
    id: 'f_locomotion',
    name: 'الميدان الأول: الوضعيات والتنقلات',
    category: 'بدني',
    description:
      '10 حصص تعلّمية - التحكم في وضعيات الجسم الأساسية والتنقلات والتوازن وتغيير الاتجاه والسرعة.',
  },
  {
    id: 'f_fundamentals',
    name: 'الميدان الثاني: الحركات القاعدية',
    category: 'جماعي',
    description:
      '10 حصص تعلّمية - اكتساب وتوظيف الحركات القاعدية الأساسية (المشي، الجري، القفز، الرمي والاستقبال).',
  },
  {
    id: 'f_structuring',
    name: 'الميدان الثالث: الهيكلة والبناء',
    category: 'فردي',
    description:
      '10 حصص تعلّمية - بناء وتنظيم الأنشطة الجماعية، احترام القواعد والتنظيم، والتعاون مع الزملاء.',
  },
];

export interface CurriculumFieldDetail {
  fieldId: string;
  fieldName: string;
  sessionsCount: number;
  finalCompetency: string;
  criteria: string[];
  indicators: string[];
  pedagogicalNotes?: string[];
  suggestedTools?: string[];
  sessionsList: {
    sessionNumber: number;
    type: 'تقويم تشخيصي' | 'تعلمية' | 'إدماجية' | 'تقويم تحصيلي';
    typeLabel: string;
    objective: string;
  }[];
}

export interface LevelCurriculumDetail {
  levelId: string;
  levelName: string;
  totalSessions: number;
  fields: Record<string, CurriculumFieldDetail>;
}

export const COMPLETE_ANNUAL_CURRICULUM: Record<string, LevelCurriculumDetail> = {
  lvl_p1: {
    levelId: 'lvl_p1',
    levelName: 'السنة الأولى ابتدائي',
    totalSessions: 30,
    fields: {
      f_locomotion: {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        sessionsCount: 10,
        finalCompetency: 'التحكم في الوضعيات الأساسية للجسم والتنقلات البسيطة في فضاء محدد.',
        criteria: [
          'التعرف على مختلف وضعيات الجسم.',
          'التحكم في التنقلات الأساسية.',
          'احترام فضاء النشاط وقواعده.',
        ],
        indicators: [
          'يتخذ وضعيات جسمية مختلفة حسب التعليمات.',
          'ينتقل من وضعية إلى أخرى.',
          'يتحرك في اتجاهات مختلفة.',
          'يحافظ على توازنه أثناء التنقل.',
        ],
        pedagogicalNotes: [
          'تعتمد الحصص على الألعاب شبه الرياضية والتمارين الحركية البسيطة.',
          'التركيز في هذا المستوى يكون على: اكتشاف الجسم، التحكم في الفضاء، التوازن، والانتقال من الحركة الفردية إلى الحركة المنظمة.',
        ],
        suggestedTools: ['أقماع', 'حلقات', 'حبال', 'بساط', 'كرات خفيفة'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في وضعيات الجسم الأساسية وقدرة المتعلم على التنقل في فضاء محدد.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective:
              'يتعرف على وضعيات الجسم الأساسية (الوقوف، الجلوس، الانبطاح، الاستلقاء) وينجزها حسب التعليمات.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينتقل من وضعية إلى أخرى بطريقة منظمة استجابة للإشارة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز تنقلات بسيطة (المشي، الجري الخفيف) في اتجاهات مختلفة.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الوضعيات والتنقلات المكتسبة في وضعيات لعب بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتحكم في التنقل الأمامي والخلفي مع المحافظة على التوازن.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز تنقلات جانبية وتغيير الاتجاه داخل فضاء محدد.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين وضعيات الجسم والتنقلات في مسار حركي بسيط.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'ينجز سلسلة حركية تجمع بين عدة وضعيات وتنقلات.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مدى تحكم المتعلم في الوضعيات الأساسية والتنقلات البسيطة وتحقيق أهداف المقطع.',
          },
        ],
      },
      f_fundamentals: {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان الثاني: الحركات القاعدية',
        sessionsCount: 10,
        finalCompetency:
          'اكتساب التحكم الأولي في الحركات القاعدية الأساسية (المشي، الجري، القفز، الرمي).',
        criteria: [
          'إنجاز الحركات الأساسية بطريقة صحيحة.',
          'التنسيق بين مختلف أجزاء الجسم.',
          'التكيف مع الوضعيات الحركية.',
        ],
        indicators: [
          'يمشي ويجري وفق تعليمات بسيطة.',
          'ينجز قفزات بسيطة.',
          'يرمي أدوات خفيفة.',
          'ينسق بين حركة الذراعين والرجلين.',
        ],
        pedagogicalNotes: [
          'يركز هذا المقطع على بناء القاعدة الحركية الأولى للطفل.',
          'يتم الانتقال تدريجياً من: الحركة الفردية إلى الحركة المنظمة، والأداء البسيط إلى الربط بين الحركات.',
        ],
        suggestedTools: ['كرات صغيرة', 'أقماع', 'حلقات', 'حواجز منخفضة', 'أكياس رملية خفيفة'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الحركات القاعدية الأساسية (المشي، الجري، القفز، الرمي).',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز المشي والجري البسيط مع التحكم في وضعية الجسم.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يؤدي الجري في اتجاهات مختلفة مع احترام المسار المحدد.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز القفز على القدمين مع التحكم في التوازن أثناء الهبوط.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف المشي والجري والقفز في وضعيات لعب حركية بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يؤدي الوثب البسيط إلى الأمام مع تنسيق حركة الذراعين والرجلين.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز الرمي من الثبات باتجاه هدف محدد باستعمال أدوات خفيفة.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين الجري والقفز في مسار حركي بسيط.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يوظف الجري والقفز والرمي في ألعاب شبه رياضية بسيطة.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مدى تحكم المتعلم في الحركات القاعدية الأساسية وتوظيفها في وضعيات حركية.',
          },
        ],
      },
      f_structuring: {
        fieldId: 'f_structuring',
        fieldName: 'الميدان الثالث: الهيكلة والبناء',
        sessionsCount: 10,
        finalCompetency: 'المشاركة في أنشطة جماعية بسيطة مع احترام التنظيم والقواعد.',
        criteria: [
          'احترام الزملاء والقوانين.',
          'تنظيم الحركة داخل المجموعة.',
          'المشاركة في النشاط.',
        ],
        indicators: [
          'يقف في صف أو تشكيل جماعي.',
          'يحترم دوره.',
          'يتعاون مع زملائه.',
          'يطبق تعليمات اللعبة.',
        ],
        pedagogicalNotes: [
          'يركز هذا المقطع على بناء السلوك الجماعي والحركي للطفل.',
          'الانتقال من التنظيم الفردي إلى الجماعي، ومن احترام التعليمات إلى المشاركة الفعالة.',
        ],
        suggestedTools: [
          'ألعاب المطاردة',
          'ألعاب نقل الأدوات',
          'ألعاب التتابع البسيطة',
          'ألعاب التعاون بين الفرق',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص قدرة المتعلم على التنظيم داخل المجموعة واحترام التعليمات والقواعد الأساسية.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'يتعرف على أشكال التنظيم الجماعي (صف، دائرة، مجموعات).',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يتحرك داخل فضاء النشاط مع احترام المسافة بين الزملاء.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يشارك في ألعاب جماعية بسيطة مع احترام الدور والتعليمات.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف التنظيم والتعاون في وضعيات لعب جماعية بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتعاون مع زميل أو مجموعة لإنجاز مهمة حركية مشتركة.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يحترم قواعد لعبة جماعية بسيطة ويتكيف مع أدوارها.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينظم حركته داخل الفريق حسب الهدف المطلوب.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يشارك في وضعيات جماعية مركبة تجمع التنظيم والتعاون والحركة.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم قدرة المتعلم على تنظيم نشاط جماعي واحترام القواعد والتعاون مع الزملاء.',
          },
        ],
      },
    },
  },
  lvl_p2: {
    levelId: 'lvl_p2',
    levelName: 'السنة الثانية ابتدائي',
    totalSessions: 30,
    fields: {
      f_locomotion: {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        sessionsCount: 10,
        finalCompetency: 'تنويع الوضعيات والتنقلات والتحكم في الجسم أثناء الحركة.',
        criteria: [
          'تحسين التحكم الجسدي.',
          'الانتقال السلس بين الوضعيات.',
          'استعمال الفضاء بشكل منظم.',
        ],
        indicators: [
          'يغير وضعية الجسم حسب المطلوب.',
          'ينتقل في اتجاهات مختلفة.',
          'يحافظ على التوازن.',
          'يتكيف مع تغير المسار.',
        ],
        pedagogicalNotes: [
          'يركز على تطوير التحكم في الجسم والانتقال من الحركات البسيطة إلى الحركات المركبة.',
          'تعزيز الوعي بالجسم، التوازن، التوجه في الفضاء وسرعة الاستجابة.',
        ],
        suggestedTools: ['أقماع', 'حلقات', 'حبال', 'بساط', 'علامات أرضية'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective: 'تشخيص مستوى التحكم في وضعيات الجسم والتنقلات الأساسية المكتسبة سابقاً.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'يؤدي وضعيات جسمية متنوعة (وقوف، جلوس، انبطاح، توازن) وفق التعليمات.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينتقل بين وضعيات مختلفة بطريقة منظمة وسلسة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز تنقلات أمامية وخلفية وجانبية مع التحكم في الجسم.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الوضعيات والتنقلات المكتسبة في وضعيات حركية مركبة بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتحكم في تغيير الاتجاه أثناء التنقل داخل فضاء محدد.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز تنقلات مع تغيير السرعة حسب الإشارة أو الموقف.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين وضعيات الجسم والتنقلات في مسار حركي منظم.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'ينجز سلسلة حركية تجمع بين الوضعيات والتنقلات المختلفة.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم قدرة المتعلم على التحكم في الوضعيات والتنقلات وتوظيفها في وضعيات حركية.',
          },
        ],
      },
      f_fundamentals: {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان الثاني: الحركات القاعدية',
        sessionsCount: 10,
        finalCompetency: 'توظيف الحركات القاعدية في مواقف حركية متنوعة.',
        criteria: ['تحسين جودة الأداء.', 'التحكم في السرعة والقوة.', 'الربط بين الحركات.'],
        indicators: [
          'يجري بسرعات مختلفة.',
          'ينجز قفزات متنوعة.',
          'يرمي ويوجه الأدوات.',
          'يربط بين الجري والقفز.',
        ],
        pedagogicalNotes: [
          'تهدف إلى تطوير المكتسبات الحركية الأساسية للسنة الثانية.',
          'الانتقال من التحكم في الحركة إلى تحسين الأداء والربط بين عدة مهارات.',
        ],
        suggestedTools: [
          'كرات صغيرة',
          'أقماع',
          'حلقات',
          'حواجز منخفضة',
          'أكياس رملية',
          'علامات أرضية',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective: 'تشخيص مستوى التحكم في مهارات الجري والقفز والرمي لدى المتعلمين.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز الجري في مسارات مختلفة مع التحكم في السرعة والاتجاه.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يؤدي الجري مع تغيير السرعة والاستجابة للإشارات.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز القفزات البسيطة مع التحكم في الارتقاء والهبوط.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الجري والقفز في وضعيات لعب حركية بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يؤدي الوثب إلى الأمام مع تحسين التوازن والتنسيق الحركي.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز الرمي من وضعيات مختلفة نحو هدف محدد.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين الجري والقفز والرمي في مسار حركي منظم.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يوظف الحركات القاعدية في ألعاب شبه رياضية جماعية.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective: 'تقويم مدى التحكم في الحركات القاعدية وتوظيفها في وضعيات حركية متنوعة.',
          },
        ],
      },
      f_structuring: {
        fieldId: 'f_structuring',
        fieldName: 'الميدان الثالث: الهيكلة والبناء',
        sessionsCount: 10,
        finalCompetency: 'تنظيم نشاط جماعي بسيط والتكيف مع الأدوار والقواعد.',
        criteria: ['التعاون مع المجموعة.', 'احترام القواعد.', 'التنظيم المكاني.'],
        indicators: [
          'يوزع نفسه داخل المجموعة.',
          'يحترم الدور.',
          'يشارك في ألعاب جماعية.',
          'يتكيف مع تغير الوضعيات.',
        ],
        pedagogicalNotes: [
          'تطوير الجانب الاجتماعي والحركي للمتعلم.',
          'الانتقال من العمل الفردي إلى العمل الجماعي، ومن اللعب الحر إلى اللعب المنظم.',
        ],
        suggestedTools: ['أقماع', 'كرات', 'حلقات', 'صدريات ملونة', 'علامات تحديد الفضاء'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective: 'تشخيص قدرة المتعلم على التنظيم داخل المجموعة واحترام قواعد النشاط الجماعي.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'يتعرف على مختلف أشكال التنظيم الجماعي (صف، دائرة، مجموعات).',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينظم حركته داخل الفضاء مع احترام أماكن الزملاء.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يشارك في ألعاب جماعية بسيطة مع احترام الأدوار والتعليمات.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف التنظيم والتعاون في وضعيات لعب جماعية تجمع عدة مهارات.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتعاون مع زملائه لإنجاز مهمة حركية مشتركة.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يطبق قواعد لعبة جماعية بسيطة ويتكيف مع تغير الأدوار.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينظم تحركاته داخل الفريق لتحقيق هدف محدد.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يشارك في وضعيات جماعية مركبة تعتمد على التعاون والتنظيم.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم قدرة المتعلم على تنظيم نشاط جماعي واحترام القواعد والتعاون مع المجموعة.',
          },
        ],
      },
    },
  },
  lvl_p3: {
    levelId: 'lvl_p3',
    levelName: 'السنة الثالثة ابتدائي',
    totalSessions: 30,
    fields: {
      f_locomotion: {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        sessionsCount: 10,
        finalCompetency: 'التحكم في التنقلات المختلفة واستعمال الفضاء بطريقة فعالة.',
        criteria: ['تنسيق الحركات.', 'التحكم في الاتجاه والسرعة.', 'المحافظة على التوازن.'],
        indicators: [
          'ينجز مسارات متنوعة.',
          'يغير الاتجاه أثناء الحركة.',
          'يتجاوز عوائق بسيطة.',
          'يربط بين وضعيات مختلفة.',
        ],
        pedagogicalNotes: [
          'الانتقال من التحكم الأساسي إلى التنويع والتركيب الحركي.',
          'التركيز على الوعي بالجسم، التوازن، التوجه في الفضاء، والتحكم في المسار الحركي.',
        ],
        suggestedTools: ['أقماع', 'حلقات', 'حواجز منخفضة', 'حبال', 'بساط', 'علامات أرضية'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الوضعيات والتنقلات الأساسية ومدى قدرة المتعلم على التكيف مع الفضاء.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز وضعيات جسمية متنوعة مع المحافظة على التوازن والثبات.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينتقل بين وضعيات مختلفة بطريقة منسقة وسريعة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يؤدي تنقلات متنوعة (أمامية، خلفية، جانبية) داخل مسارات محددة.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الوضعيات والتنقلات المكتسبة في مسارات حركية بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتحكم في تغيير الاتجاه أثناء التنقل وتجاوز مسارات متنوعة.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز تنقلات مع تغيير السرعة حسب طبيعة الوضعية الحركية.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين عدة وضعيات وتنقلات في سلسلة حركية منظمة.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'ينجز مساراً حركياً مركباً يجمع بين التوازن والتنقل وتغيير الاتجاه.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مدى تحكم المتعلم في الوضعيات والتنقلات المركبة وتوظيفها في وضعيات حركية.',
          },
        ],
      },
      f_fundamentals: {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان الثاني: الحركات القاعدية',
        sessionsCount: 10,
        finalCompetency: 'إتقان الحركات القاعدية وربطها في وضعيات حركية.',
        criteria: ['دقة الأداء.', 'التحكم في القوة والسرعة.', 'التنسيق الحركي.'],
        indicators: [
          'يجري بمستويات سرعة مختلفة.',
          'يقفز ويتجاوز عوائق.',
          'يرمي بدقة.',
          'يربط بين مهارات مختلفة.',
        ],
        pedagogicalNotes: [
          'تطوير المهارات الأساسية والانتقال من الأداء المنفصل إلى التركيب الحركي.',
          'تنمية سرعة الاستجابة، التوازن، الدقة والتحكم في السرعة.',
        ],
        suggestedTools: [
          'كرات مختلفة الأحجام',
          'أقماع',
          'حواجز منخفضة',
          'حلقات',
          'أكياس رملية',
          'عصي',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الجري والقفز والرمي ومدى توظيف الحركات القاعدية المكتسبة.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز الجري بسرعات مختلفة مع التحكم في الانطلاق والتوقف.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يؤدي الجري مع تغيير الاتجاه والمسار حسب الوضعية الحركية.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز القفز والوثب مع التحكم في الارتقاء والهبوط والتوازن.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الجري والقفز في وضعيات حركية مركبة بسيطة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يحسن أداء الوثب والقفز فوق عوائق منخفضة مع التحكم في الجسم.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز الرمي من وضعيات مختلفة مع توجيه الأداة نحو الهدف.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين الجري والقفز والرمي في مسار حركي منظم.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يوظف الحركات القاعدية في ألعاب شبه رياضية جماعية.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective: 'تقويم مدى التحكم في الحركات القاعدية وربطها في وضعيات حركية متنوعة.',
          },
        ],
      },
      f_structuring: {
        fieldId: 'f_structuring',
        fieldName: 'الميدان الثالث: الهيكلة والبناء',
        sessionsCount: 10,
        finalCompetency: 'بناء وتنظيم أنشطة جماعية وفق قواعد محددة.',
        criteria: ['توزيع الأدوار.', 'التعاون.', 'احترام التنظيم.'],
        indicators: [
          'يطبق قواعد الألعاب.',
          'يتعاون مع الفريق.',
          'يشغل مكانه المناسب.',
          'يتكيف مع المواقف.',
        ],
        pedagogicalNotes: [
          'تنمية الجانب الجماعي والاجتماعي للحركة.',
          'انتقال المتعلم من تنفيذ التعليمات الفردية إلى التعاون والمساهمة في تنظيم النشاط.',
        ],
        suggestedTools: ['أقماع', 'كرات', 'صدريات', 'حلقات', 'حواجز', 'علامات تحديد الفضاء'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص قدرة المتعلم على التنظيم الجماعي واحترام القواعد الأساسية أثناء الأنشطة الحركية.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينظم تموقعه داخل المجموعة وفق أشكال تنظيمية مختلفة (صف، دائرة، مجموعات).',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينسق حركته مع زملائه لإنجاز مهام جماعية بسيطة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يطبق قواعد ألعاب جماعية بسيطة مع احترام الأدوار.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف التنظيم والتعاون في وضعيات لعب جماعية تجمع عدة مهارات.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يشارك في بناء خطة جماعية بسيطة لتحقيق هدف محدد.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يتكيف مع تغيير الأدوار والقواعد أثناء النشاط الجماعي.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينظم تحركاته داخل الفريق حسب متطلبات الوضعية.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'ينجز وضعيات جماعية مركبة تعتمد على التعاون والتنسيق واتخاذ القرار.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم قدرة المتعلم على تنظيم نشاط جماعي والتعاون واحترام القواعد لتحقيق هدف مشترك.',
          },
        ],
      },
    },
  },
  lvl_p4: {
    levelId: 'lvl_p4',
    levelName: 'السنة الرابعة ابتدائي',
    totalSessions: 30,
    fields: {
      f_locomotion: {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        sessionsCount: 10,
        finalCompetency: 'إتقان التنقلات المركبة والتكيف مع مختلف الوضعيات الحركية.',
        criteria: ['الدقة في الأداء.', 'التحكم في التوازن.', 'سرعة الاستجابة.'],
        indicators: [
          'ينجز مسارات مركبة.',
          'يتحكم في تغيير الاتجاه.',
          'يربط بين عدة حركات.',
          'يحافظ على التوازن.',
        ],
        pedagogicalNotes: [
          'الانتقال من اكتساب المهارة إلى تحسين الأداء والدقة.',
          'التركيز على التوازن الديناميكي، التحكم في الجسم، وسرعة الاستجابة.',
        ],
        suggestedTools: ['بساط', 'عوارض توازن', 'أقماع', 'حلقات', 'حواجز منخفضة'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الوضعيات والتنقلات ومدى قدرة المتعلم على التكيف مع المسارات الحركية.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'يؤدي وضعيات توازن مختلفة مع التحكم في وضعية الجسم.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينتقل بين وضعيات متعددة بسرعة ودقة وفق تعليمات محددة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز تنقلات متنوعة (أمامية، خلفية، جانبية) مع تغيير الاتجاه.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الوضعيات والتنقلات المكتسبة في مسار حركي منظم.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتحكم في التنقل داخل مسارات منحنية ومتغيرة الاتجاه.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'ينجز تنقلات مع تغيير السرعة حسب طبيعة الوضعية.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين التوازن والتنقل في سلسلة حركية مركبة.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'ينجز مساراً حركياً يجمع بين الوضعيات، التوازن والتنقلات المتنوعة.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مدى التحكم في الوضعيات والتنقلات المركبة وتوظيفها في وضعيات حركية مختلفة.',
          },
        ],
      },
      f_fundamentals: {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان الثاني: الحركات القاعدية',
        sessionsCount: 10,
        finalCompetency: 'توظيف الحركات القاعدية في مواقف رياضية متنوعة.',
        criteria: ['تحسين الأداء.', 'التحكم في الإيقاع.', 'الدقة والفعالية.'],
        indicators: [
          'ينجز الجري السريع.',
          'يتحكم في القفز.',
          'يحسن الرمي والاستقبال.',
          'يربط الحركات.',
        ],
        pedagogicalNotes: [
          'تطوير الأداء الحركي والانتقال من التنفيذ البسيط إلى التحكم والربط بين المهارات.',
          'تنمية السرعة الحركية، القوة المناسبة، الدقة والتوافق.',
        ],
        suggestedTools: [
          'كرات مختلفة الأحجام',
          'أقماع',
          'حواجز منخفضة',
          'حلقات',
          'عصي',
          'أكياس رملية',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الجري والقفز والرمي ومدى توظيف المهارات الحركية الأساسية.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز الجري السريع لمسافات قصيرة مع تحسين الانطلاق والتسارع.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يتحكم في تغيير السرعة والاتجاه أثناء الجري حسب متطلبات الوضعية.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يؤدي القفز والوثب مع تحسين الارتقاء والتحكم في الهبوط.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الجري والقفز في مسارات حركية تجمع أكثر من مهارة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'ينجز الوثب الطويل من الثبات مع تحسين التوازن بعد الهبوط.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يؤدي الرمي من وضعيات مختلفة مع التحكم في القوة والدقة.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين الجري والقفز والرمي في وضعيات مركبة.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يوظف الحركات القاعدية في ألعاب شبه رياضية تعتمد السرعة والتعاون.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective: 'تقويم مدى التحكم في الحركات القاعدية المركبة وتوظيفها في وضعيات تطبيقية.',
          },
        ],
      },
      f_structuring: {
        fieldId: 'f_structuring',
        fieldName: 'الميدان الثالث: الهيكلة والبناء',
        sessionsCount: 10,
        finalCompetency: 'تنظيم نشاط جماعي وتحقيق هدف مشترك.',
        criteria: ['التخطيط الجماعي.', 'احترام القواعد.', 'التعاون.'],
        indicators: [
          'يطبق استراتيجية بسيطة.',
          'يتبادل الأدوار.',
          'يساعد الفريق.',
          'يحترم المنافس.',
        ],
        pedagogicalNotes: [
          'تطوير قدرة المتعلم على العمل الجماعي وبناء الفعل الحركي المشترك.',
          'الانتقال من المشاركة في النشاط إلى تنظيمه واتخاذ القرار.',
        ],
        suggestedTools: ['كرات', 'أقماع', 'صدريات فرق', 'حلقات', 'مرامي صغيرة', 'حواجز'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص قدرة المتعلم على تنظيم نشاط جماعي واحترام القواعد وتوزيع الأدوار داخل الفريق.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينظم موقعه داخل الفريق وفق متطلبات الوضعية الحركية.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينسق حركته مع الزملاء لإنجاز مهام جماعية منظمة.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يطبق قواعد ألعاب جماعية بسيطة ويتكيف مع أدوارها المختلفة.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف التنظيم والتعاون في وضعية لعب جماعية تجمع عدة مهارات.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يشارك في بناء خطة جماعية بسيطة لتحقيق هدف محدد.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يتخذ قرارات مناسبة أثناء تغير وضعية اللعب.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينظم تحركات الفريق حسب متطلبات الموقف الحركي.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يشارك في وضعيات جماعية مركبة تعتمد على التنظيم والتعاون والتكيف.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم قدرة المتعلم على بناء وتنظيم نشاط جماعي واحترام القواعد وتحقيق الهدف المشترك.',
          },
        ],
      },
    },
  },
  lvl_p5: {
    levelId: 'lvl_p5',
    levelName: 'السنة الخامسة ابتدائي',
    totalSessions: 30,
    fields: {
      f_locomotion: {
        fieldId: 'f_locomotion',
        fieldName: 'الميدان الأول: الوضعيات والتنقلات',
        sessionsCount: 10,
        finalCompetency: 'توظيف الوضعيات والتنقلات المركبة في مواقف إدماجية مع التحكم في الجسم.',
        criteria: ['التحكم المتقدم في الجسم.', 'الربط بين المهارات.', 'التكيف مع الوضعيات.'],
        indicators: [
          'ينجز مسارات مركبة.',
          'يتحكم في التوازن.',
          'يغير السرعة والاتجاه.',
          'يبدع في بناء حركات.',
        ],
        pedagogicalNotes: [
          'مرحلة متتقدمة في التحكم الحركي، حيث ينتقل المتعلم من تنفيذ الحركات إلى التحكم في تركيبها وتوظيفها.',
          'التركيز على التوازن الديناميكي، الرشاقة، الربط بين المهارات والاستقلالية.',
        ],
        suggestedTools: ['بساط الجمباز', 'عوارض التوازن', 'أقماع', 'حواجز', 'حلقات', 'حبال'],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الوضعيات والتنقلات المركبة ومدى توظيف المكتسبات السابقة.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'يؤدي وضعيات توازن متنوعة (ثابتة وديناميكية) مع التحكم في وضعية الجسم.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'ينتقل بين وضعيات مختلفة مع المحافظة على الانسجام والتوازن.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'ينجز تنقلات متنوعة في مسارات مستقيمة ومنحنية مع تغيير الاتجاه.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الوضعيات والتنقلات المكتسبة في مسار حركي مركب.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يتحكم في التنقل فوق مسارات وعوائق متنوعة مع المحافظة على التوازن.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يربط بين التنقلات والقفزات وتغيير الاتجاه في سلسلة حركية.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينجز تركيباً حركياً يجمع بين التوازن والتنقل والتحكم في الجسم.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يبتكر ويؤدي مساراً حركياً مركباً وفق شروط محددة.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مدى التحكم في الوضعيات والتنقلات المركبة وتحقيق الكفاءة الخاصة بالميدان.',
          },
        ],
      },
      f_fundamentals: {
        fieldId: 'f_fundamentals',
        fieldName: 'الميدان الثاني: الحركات القاعدية',
        sessionsCount: 10,
        finalCompetency: 'توظيف الحركات القاعدية الأساسية في مواقف رياضية متنوعة.',
        criteria: ['جودة الأداء.', 'التحكم التقني.', 'الفعالية الحركية.'],
        indicators: [
          'ينجز الجري لمسافات مختلفة.',
          'يتحكم في القفز والوثب.',
          'يحسن الرمي.',
          'يدمج عدة مهارات.',
        ],
        pedagogicalNotes: [
          'الانتقال من اكتساب المهارة إلى تحسين الأداء والفعالية.',
          'تطوير السرعة الحركية، القوة المناسبة، الدقة، والقدرة على الربط بين المهارات.',
        ],
        suggestedTools: [
          'كرات مختلفة الأوزان',
          'أقماع',
          'حواجز',
          'حلقات',
          'عصي',
          'مناطق رمي محددة',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective:
              'تشخيص مستوى التحكم في الحركات القاعدية (الجري، القفز، الرمي) وتحديد المكتسبات والصعوبات.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينجز الجري السريع لمسافات قصيرة مع تحسين وضعية الانطلاق والتسارع.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يتحكم في تغيير السرعة والاتجاه أثناء الجري حسب متطلبات الوضعية.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يؤدي القفزات والوثبات المختلفة مع التحكم في الارتقاء والهبوط.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف الجري والقفز في مسار حركي مركب يجمع عدة مهارات.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'ينجز الوثب الطويل من الاقتراب مع تحسين مراحل الإنجاز.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يؤدي الرمي من وضعيات مختلفة مع التحكم في القوة والدقة.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'يربط بين الجري والقفز والرمي في وضعيات تطبيقية مركبة.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يوظف الحركات القاعدية في ألعاب شبه رياضية تعتمد السرعة والتنسيق والتعاون.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective:
              'تقويم مستوى التحكم في الحركات القاعدية المركبة وتوظيفها في وضعيات رياضية متنوعة.',
          },
        ],
      },
      f_structuring: {
        fieldId: 'f_structuring',
        fieldName: 'الميدان الثالث: الهيكلة والبناء',
        sessionsCount: 10,
        finalCompetency: 'بناء حلول جماعية وتنظيم النشاطات الرياضية وفق قواعدها.',
        criteria: ['العمل الجماعي.', 'اتخاذ القرار.', 'احترام القوانين.'],
        indicators: [
          'يوزع الأدوار.',
          'يقترح حلولاً جماعية.',
          'يطبق خططاً بسيطة.',
          'يقيم أداء الفريق.',
        ],
        pedagogicalNotes: [
          'تطوير بناء حلول جماعية وتنظيم النشاطات وفق القواعد والقوانين.',
          'تنمية القيادة، توزيع الأدوار، المبادرة وتقييم أداء المجموعة.',
        ],
        suggestedTools: [
          'أقماع',
          'كرات تكتيكية',
          'صدريات الفرق',
          'مرامي رياضية',
          'صفارة حكّم',
          'لوحة تكتيكية',
        ],
        sessionsList: [
          {
            sessionNumber: 1,
            type: 'تقويم تشخيصي',
            typeLabel: 'تقويم تشخيصي',
            objective: 'تشخيص قدرة المتعلم على تنظيم خطط جماعية وتوزيع الأدوار داخل الفريق.',
          },
          {
            sessionNumber: 2,
            type: 'تعلمية',
            typeLabel: 'تعلمية 1',
            objective: 'ينظم توزيع الأدوار والتمركز التكتيكي داخل الفريق.',
          },
          {
            sessionNumber: 3,
            type: 'تعلمية',
            typeLabel: 'تعلمية 2',
            objective: 'يقترح حلولاً جماعية وتنسيقية لمواجهة صعوبات اللعب.',
          },
          {
            sessionNumber: 4,
            type: 'تعلمية',
            typeLabel: 'تعلمية 3',
            objective: 'يطبق خططاً هجومية ودفاعية بسيطة مع احترام القوانين.',
          },
          {
            sessionNumber: 5,
            type: 'إدماجية',
            typeLabel: 'إدماجية 1',
            objective: 'يوظف التكتيك والتعاون في مباراة تعليمية موجهة.',
          },
          {
            sessionNumber: 6,
            type: 'تعلمية',
            typeLabel: 'تعلمية 4',
            objective: 'يدير مواقف اللعب الجماعي ويتكيف مع تغير خطط المنافس.',
          },
          {
            sessionNumber: 7,
            type: 'تعلمية',
            typeLabel: 'تعلمية 5',
            objective: 'يقيم أداء الفريق ويقترح تعديلات لتحسين النتائج.',
          },
          {
            sessionNumber: 8,
            type: 'تعلمية',
            typeLabel: 'تعلمية 6',
            objective: 'ينظم بطولة مصغرة داخل الفصل مع احترام قانون اللعبة والتنافس الشريف.',
          },
          {
            sessionNumber: 9,
            type: 'تعلمية',
            typeLabel: 'تعلمية 7',
            objective: 'يشارك في وضعيات تنافسية جماعية شاملة تعتمد على اتخاذ القرار.',
          },
          {
            sessionNumber: 10,
            type: 'تقويم تحصيلي',
            typeLabel: 'تقويم تحصيلي',
            objective: 'تقويم قدرة المتعلم على بناء حلول جماعية وتنظيم النشاطات وفق قوانينها.',
          },
        ],
      },
    },
  },
};

export const FINAL_COMPETENCIES: FinalCompetency[] = Object.values(
  COMPLETE_ANNUAL_CURRICULUM
).flatMap((lvl) =>
  Object.values(lvl.fields).map((f, idx) => ({
    id: `fc_${lvl.levelId}_${f.fieldId}`,
    fieldId: f.fieldId,
    levelId: lvl.levelId,
    officialCode: `ك.خ - ${lvl.levelName.slice(0, 8)}.${idx + 1}`,
    title: f.finalCompetency,
    description: `المعايير: ${f.criteria.join(' | ')}`,
  }))
);

export const LEARNING_SEGMENTS: LearningSegment[] = Object.values(
  COMPLETE_ANNUAL_CURRICULUM
).flatMap((lvl) =>
  Object.values(lvl.fields).map((f, idx) => ({
    id: `seg_${lvl.levelId}_${f.fieldId}`,
    competencyId: `fc_${lvl.levelId}_${f.fieldId}`,
    fieldId: f.fieldId,
    levelId: lvl.levelId,
    title: `${f.fieldName} - ${lvl.levelName}`,
    orderIndex: idx + 1,
    durationWeeks: 10,
    objectives: f.indicators,
  }))
);

export const LEARNING_UNITS: LearningUnit[] = Object.values(COMPLETE_ANNUAL_CURRICULUM).flatMap(
  (lvl) =>
    Object.values(lvl.fields).map((f) => ({
      id: `unit_${lvl.levelId}_${f.fieldId}`,
      segmentId: `seg_${lvl.levelId}_${f.fieldId}`,
      title: `وحدة ${f.fieldName}`,
      orderIndex: 1,
    }))
);

export const SAMPLE_PE_SESSIONS: PESession[] = Object.values(COMPLETE_ANNUAL_CURRICULUM).flatMap(
  (lvl) =>
    Object.values(lvl.fields).flatMap((f) =>
      f.sessionsList.map((s) => ({
        id: `sess_${lvl.levelId}_${f.fieldId}_${s.sessionNumber}`,
        unitId: `unit_${lvl.levelId}_${f.fieldId}`,
        segmentId: `seg_${lvl.levelId}_${f.fieldId}`,
        orderIndex: s.sessionNumber,
        title: `الحصة ${s.sessionNumber < 10 ? '0' + s.sessionNumber : s.sessionNumber}: ${s.typeLabel} - ${s.objective.slice(0, 40)}...`,
        type: s.type,
        targetObjective: s.objective,
      }))
    )
);

export const ALGERIAN_SCHOOL_HOLIDAYS_2025_2026 = getAcademicCalendar('2025-2026').events.map(
  ({ name, startDate, endDate }) => ({ name, startDate, endDate })
);

export interface ScheduledAnnualSession {
  globalSessionNumber: number;
  fieldSessionNumber: number;
  fieldId: string;
  fieldName: string;
  levelId: string;
  levelName: string;
  sessionType: 'تقويم تشخيصي' | 'تعلمية' | 'إدماجية' | 'تقويم تحصيلي' | 'تعارف وتنظيم';
  sessionTypeLabel: string;
  targetObjective: string;
  scheduledDate: string;
  isHolidayPostponed: boolean;
  holidayNote?: string;
  status: 'منجزة' | 'مؤجلة' | 'غير منجزة' | 'مبرمجة';
  durationMinutes: number;
  isIntro?: boolean;
  objectiveGroupId?: string;
}

export interface AnnualTimeDistributionOptions {
  includeIntro?: boolean;
}

function getGradeFromLevelId(levelId: string): number {
  const map: Record<string, number> = { lvl_p1: 1, lvl_p2: 2, lvl_p3: 3, lvl_p4: 4, lvl_p5: 5 };
  return map[levelId] || 1;
}

export const PRIMARY_GRADES_1_3 = {
  sessionsPerWeek: 2,
  durationMinutes: 60,
  introSessions: 2,
  introDurationMinutes: 60,
} as const;

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSchoolDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 0 && day <= 4;
}

function isValidGenerationDate(date: Date, academicYearId?: string): boolean {
  if (!academicYearId) return isValidSchoolDate(date);
  const value = formatISODate(date);
  const calendar = getAcademicCalendar(academicYearId);
  const endDate = calendar.schoolEnd || `${academicYearId.slice(5)}-08-31`;
  return (
    value >= calendar.schoolStart &&
    value <= endDate &&
    isValidAcademicSchoolDate(value, academicYearId)
  );
}

function isHoliday(
  date: Date,
  academicYearId?: string
): { holiday: boolean; name?: string; note?: string } {
  const ymd = formatISODate(date);
  const holiday = calendarEventForDate(ymd, academicYearId);
  return holiday
    ? { holiday: true, name: holiday.name, note: `صادف ${holiday.name} - تم التأجيل تلقائياً` }
    : { holiday: false };
}

export function isValidSchoolDate(date: Date): boolean {
  const value = formatISODate(date);
  return isSchoolDay(date) && isValidAcademicSchoolDate(value, academicYearForDate(value));
}

function getNextValidSchoolDate(from: Date, inclusive = true, academicYearId?: string): Date {
  let d = new Date(from);
  if (!inclusive) {
    d = addDays(d, 1);
  }
  let guard = 0;
  while (guard < 365) {
    if (isValidGenerationDate(d, academicYearId)) return d;
    d = addDays(d, 1);
    guard++;
  }
  if (!academicYearId) return d;
  throw new Error('لا توجد سعة تقويمية كافية لتوليد التوزيع السنوي ضمن السنة المحددة.');
}

interface AnnualScheduleSlot {
  desiredDate: Date;
  actualDate: Date;
}

function buildBoundedAnnualSchedule(
  count: number,
  startDateStr: string,
  _teachingDayOfWeek: number,
  sessionsPerWeek: number,
  academicYearId: string
): AnnualScheduleSlot[] {
  const slots: AnnualScheduleSlot[] = [];
  let weekAnchor = getNextValidSchoolDate(parseISODate(startDateStr), true, academicYearId);
  let slotInWeek = 0;
  let lastActualDate: Date | null = null;

  for (let index = 0; index < count; index += 1) {
    let desiredDate = sessionsPerWeek > 1 && slotInWeek === 1 ? addDays(weekAnchor, 2) : weekAnchor;
    if (lastActualDate && desiredDate <= lastActualDate) {
      desiredDate = addDays(lastActualDate, 1);
    }
    let actualDate = getNextValidSchoolDate(desiredDate, true, academicYearId);
    if (lastActualDate && actualDate <= lastActualDate) {
      actualDate = getNextValidSchoolDate(addDays(lastActualDate, 1), true, academicYearId);
    }
    slots.push({ desiredDate, actualDate });
    lastActualDate = actualDate;

    if (sessionsPerWeek > 1 && slotInWeek === 0) {
      slotInWeek = 1;
    } else {
      slotInWeek = 0;
      if (index < count - 1) {
        weekAnchor = getNextValidSchoolDate(addDays(weekAnchor, 7), true, academicYearId);
      }
    }
  }

  return slots;
}

export function generateAnnualTimeDistribution(
  levelId: string = 'lvl_p1',
  startDateStr: string = '2025-09-21',
  teachingDayOfWeek: number = 0,
  _className: string = '1 ابتدائي 1',
  academicYearId?: string,
  options: AnnualTimeDistributionOptions = {}
): ScheduledAnnualSession[] {
  const levelData = COMPLETE_ANNUAL_CURRICULUM[levelId];
  const grade = getGradeFromLevelId(levelId);
  if (!levelData || !grade) return [];
  const scheduled: ScheduledAnnualSession[] = [];
  const includeIntro = options.includeIntro ?? true;
  let globalCounter = 1;

  const gradeConfig = (() => {
    if (grade === 1 || grade === 2 || grade === 3) {
      return {
        sessionsPerWeek: PRIMARY_GRADES_1_3.sessionsPerWeek,
        duration: PRIMARY_GRADES_1_3.durationMinutes,
        introSessions: PRIMARY_GRADES_1_3.introSessions,
        introDuration: PRIMARY_GRADES_1_3.introDurationMinutes,
      };
    } else if (grade === 4) {
      return { sessionsPerWeek: 1, duration: 90, introSessions: 1, introDuration: 90 };
    } else {
      return { sessionsPerWeek: 1, duration: 60, introSessions: 1, introDuration: 60 };
    }
  })();

  let currentDate = getNextValidSchoolDate(parseISODate(startDateStr), true, academicYearId);

  const firstWeekEnd = addDays(parseISODate(startDateStr), 6);

  const introTitle = 'تعارف، تنظيم واتصال مع التلاميذ';

  let boundedStartDate = startDateStr;
  if (includeIntro && gradeConfig.introSessions === 2) {
    const firstIntroDesired = new Date(currentDate);
    const firstIntroActual = getNextValidSchoolDate(firstIntroDesired, true, academicYearId);
    const isPostponed1 = formatISODate(firstIntroActual) !== formatISODate(firstIntroDesired);
    scheduled.push({
      globalSessionNumber: globalCounter++,
      fieldSessionNumber: 1,
      fieldId: 'intro',
      fieldName: 'أسبوع التعارف والتنظيم',
      levelId: levelData.levelId,
      levelName: levelData.levelName,
      sessionType: 'تعارف وتنظيم',
      sessionTypeLabel: 'تعارف، تنظيم واتصال',
      targetObjective: introTitle,
      scheduledDate: formatISODate(firstIntroActual),
      isHolidayPostponed: isPostponed1,
      holidayNote: isPostponed1
        ? `تم ترحيل حصة التعارف من ${formatISODate(firstIntroDesired)}`
        : undefined,
      status: 'مبرمجة',
      durationMinutes: gradeConfig.introDuration,
      isIntro: true,
      objectiveGroupId: 'intro_group',
    });

    let secondDesired = addDays(firstIntroActual, 2);
    if (secondDesired > firstWeekEnd) {
      secondDesired = firstWeekEnd;
    }
    let secondActual = getNextValidSchoolDate(secondDesired, true, academicYearId);
    let attempts = 0;
    while (secondActual.getTime() === firstIntroActual.getTime() && attempts < 10) {
      secondDesired = addDays(secondDesired, 1);
      secondActual = getNextValidSchoolDate(secondDesired, true, academicYearId);
      attempts++;
    }
    const isPostponed2 =
      formatISODate(secondActual) !== formatISODate(addDays(firstIntroActual, 2));
    scheduled.push({
      globalSessionNumber: globalCounter++,
      fieldSessionNumber: 2,
      fieldId: 'intro',
      fieldName: 'أسبوع التعارف والتنظيم',
      levelId: levelData.levelId,
      levelName: levelData.levelName,
      sessionType: 'تعارف وتنظيم',
      sessionTypeLabel: 'تعارف، تنظيم واتصال',
      targetObjective: introTitle,
      scheduledDate: formatISODate(secondActual),
      isHolidayPostponed: isPostponed2,
      holidayNote: isPostponed2 ? `تم ترحيل حصة التعارف الثانية` : undefined,
      status: 'مبرمجة',
      durationMinutes: gradeConfig.introDuration,
      isIntro: true,
      objectiveGroupId: 'intro_group',
    });

    currentDate = getNextValidSchoolDate(addDays(firstIntroActual, 7), true, academicYearId);
  } else if (includeIntro) {
    const desired = new Date(currentDate);
    const actual = getNextValidSchoolDate(desired, true, academicYearId);
    const isPostponed = formatISODate(actual) !== formatISODate(desired);
    scheduled.push({
      globalSessionNumber: globalCounter++,
      fieldSessionNumber: 1,
      fieldId: 'intro',
      fieldName: 'أسبوع التعارف والتنظيم',
      levelId: levelData.levelId,
      levelName: levelData.levelName,
      sessionType: 'تعارف وتنظيم',
      sessionTypeLabel: 'تعارف، تنظيم واتصال',
      targetObjective: introTitle,
      scheduledDate: formatISODate(actual),
      isHolidayPostponed: isPostponed,
      holidayNote: isPostponed ? `تم ترحيل حصة التعارف` : undefined,
      status: 'مبرمجة',
      durationMinutes: gradeConfig.introDuration,
      isIntro: true,
      objectiveGroupId: 'intro_group',
    });
    currentDate = getNextValidSchoolDate(addDays(actual, 7), true, academicYearId);
  } else {
    const officialEntryDate = academicYearId
      ? getAcademicCalendar(academicYearId).schoolStart
      : formatISODate(currentDate);
    const entryWeekStart = parseISODate(officialEntryDate);
    entryWeekStart.setDate(entryWeekStart.getDate() - entryWeekStart.getDay());
    const firstPedagogicalDate = formatISODate(addDays(entryWeekStart, 7));
    const requestedPedagogicalDate =
      formatISODate(currentDate) > firstPedagogicalDate
        ? formatISODate(currentDate)
        : firstPedagogicalDate;
    currentDate = getNextValidSchoolDate(
      parseISODate(requestedPedagogicalDate),
      true,
      academicYearId
    );
    boundedStartDate = formatISODate(currentDate);

    const diagnosticPreludeCount = gradeConfig.introSessions;
    for (let index = 0; index < diagnosticPreludeCount; index += 1) {
      const desiredDate = new Date(currentDate);
      if (index > 0) desiredDate.setDate(desiredDate.getDate() + 2);
      const actualDate = getNextValidSchoolDate(desiredDate, true, academicYearId);
      scheduled.push({
        globalSessionNumber: globalCounter++,
        fieldSessionNumber: index + 1,
        fieldId: 'diagnostic',
        fieldName: 'التقويم التشخيصي',
        levelId: levelData.levelId,
        levelName: levelData.levelName,
        sessionType: 'تقويم تشخيصي',
        sessionTypeLabel: 'تقويم تشخيصي',
        targetObjective: 'تقويم تشخيصي أولي لمكتسبات التلاميذ',
        scheduledDate: formatISODate(actualDate),
        isHolidayPostponed: formatISODate(actualDate) !== formatISODate(desiredDate),
        holidayNote:
          formatISODate(actualDate) !== formatISODate(desiredDate)
            ? `تم ترحيل الحصة من ${formatISODate(desiredDate)} بسبب عطلة`
            : undefined,
        status: 'مبرمجة',
        durationMinutes: gradeConfig.duration,
        isIntro: false,
        objectiveGroupId: 'diagnostic_prelude',
      });
    }
  }

  const fieldsSequence = ['f_locomotion', 'f_fundamentals', 'f_structuring'];
  for (const fieldKey of fieldsSequence) {
    const fieldDetail = levelData.fields[fieldKey];
    if (!fieldDetail) continue;

    const originalList = fieldDetail.sessionsList;
    const diagnostic = originalList.find((s) => s.type === 'تقويم تشخيصي');
    const integration1 = originalList.find(
      (s) => s.typeLabel.includes('إدماجية 1') || (s.type === 'إدماجية' && s.sessionNumber === 5)
    );
    const summative = originalList.find((s) => s.type === 'تقويم تحصيلي');
    const learningSessions = originalList.filter((s) => s.type === 'تعلمية');

    const learningBefore = learningSessions.slice(0, 3);
    const learningAfter = learningSessions.slice(3);

    const integration2 = {
      sessionNumber: 99,
      type: 'إدماجية' as const,
      typeLabel: 'إدماجية 2',
      objective: 'توظيف المكتسبات في وضعية إدماجية ثانية قبل التقويم التحصيلي',
    };

    const ordered: Array<{
      sessionNumber: number;
      type: string;
      typeLabel: string;
      objective: string;
    }> = [];
    if (diagnostic) ordered.push(diagnostic as any);
    ordered.push(...(learningBefore as any));
    if (integration1) ordered.push(integration1 as any);
    ordered.push(...(learningAfter as any));
    ordered.push(integration2 as any);
    if (summative) ordered.push(summative as any);

    let objectiveCounter = 1;
    let fieldSessionCounter = 1;
    for (const obj of ordered) {
      const isSpecial = obj.type !== 'تعلمية';
      let sessionsForThisObjective = 1;
      if (!isSpecial && (grade === 1 || grade === 2 || grade === 3)) {
        sessionsForThisObjective = 2;
      }

      let firstSessionActualDate: Date | null = null;

      for (let sIdx = 0; sIdx < sessionsForThisObjective; sIdx++) {
        let desiredDate: Date;
        if (sIdx === 0) {
          desiredDate = new Date(currentDate);
        } else {
          if (!firstSessionActualDate) {
            desiredDate = addDays(currentDate, 2);
          } else {
            desiredDate = addDays(firstSessionActualDate, 2);
          }
          const wd = desiredDate.getDay();
          if (wd === 5 || wd === 6) {
            desiredDate = getNextValidSchoolDate(desiredDate, true, academicYearId);
          }
        }

        const actualDate = getNextValidSchoolDate(desiredDate, true, academicYearId);
        const isPostponed = formatISODate(actualDate) !== formatISODate(desiredDate);
        const holidayCheck = isHoliday(actualDate, academicYearId);
        let note: string | undefined = undefined;
        if (isPostponed) {
          note = `تم ترحيل الحصة من ${formatISODate(desiredDate)} بسبب عطلة`;
        }
        if (holidayCheck.holiday) {
          note = holidayCheck.note;
        }

        if (sIdx === 0) {
          firstSessionActualDate = actualDate;
        }

        scheduled.push({
          globalSessionNumber: globalCounter++,
          fieldSessionNumber: fieldSessionCounter++,
          fieldId: fieldDetail.fieldId,
          fieldName: fieldDetail.fieldName,
          levelId: levelData.levelId,
          levelName: levelData.levelName,
          sessionType: obj.type as any,
          sessionTypeLabel: obj.typeLabel,
          targetObjective: obj.objective,
          scheduledDate: formatISODate(actualDate),
          isHolidayPostponed: isPostponed,
          holidayNote: note,
          status: 'مبرمجة',
          durationMinutes: gradeConfig.duration,
          isIntro: false,
          objectiveGroupId: `${fieldDetail.fieldId}__${objectiveCounter}`,
        });
      }

      if (grade === 1 || grade === 2 || grade === 3) {
        if (firstSessionActualDate) {
          const nextWeekDesired = addDays(firstSessionActualDate, 7);
          currentDate = getNextValidSchoolDate(nextWeekDesired, true, academicYearId);
        }
      } else {
        if (firstSessionActualDate) {
          const nextDesired = addDays(firstSessionActualDate, 7);
          currentDate = getNextValidSchoolDate(nextDesired, true, academicYearId);
        }
      }
      objectiveCounter++;
    }
  }

  if (!academicYearId) return scheduled;

  const boundedSchedule = buildBoundedAnnualSchedule(
    scheduled.length,
    boundedStartDate,
    teachingDayOfWeek,
    gradeConfig.sessionsPerWeek,
    academicYearId
  );
  return scheduled.map((session, index) => {
    const slot = boundedSchedule[index];
    const postponed = formatISODate(slot.actualDate) !== formatISODate(slot.desiredDate);
    return {
      ...session,
      scheduledDate: formatISODate(slot.actualDate),
      isHolidayPostponed: postponed,
      holidayNote: postponed
        ? `تم ترحيل الحصة من ${formatISODate(slot.desiredDate)} بسبب عطلة أو عدم توفر اليوم الدراسي`
        : undefined,
    };
  });
}

/**
 * Returns only the official pedagogical sequence. Operational introduction
 * sessions are materialized from each class timetable by teacherPlanning.
 */
export function generateAnnualPedagogicalTimeDistribution(
  levelId: string = 'lvl_p1',
  startDateStr: string = '2025-09-21',
  teachingDayOfWeek = 0,
  className = '1 ابتدائي 1',
  academicYearId?: string
): ScheduledAnnualSession[] {
  return generateAnnualTimeDistribution(
    levelId,
    startDateStr,
    teachingDayOfWeek,
    className,
    academicYearId,
    { includeIntro: false }
  );
}
