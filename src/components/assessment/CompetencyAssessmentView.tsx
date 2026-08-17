/**
 * SPEX - Competency Assessment View Component
 * شبكة تقويم الكفاءات الختامية المربوطة بحصص التقويم التحصيلي لجميع الأقسام (من س1 إلى س5)
 * وفق المنهاج الوزاري والمخططات السنوية لمادة التربية البدنية والرياضية بالجزائر
 */

import React, { useState, useMemo } from 'react';
import {
  Target,
  Award,
  CheckCircle2,
  BarChart3,
  Printer,
  Sparkles,
  Users,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  Building2,
  MapPin,
  School,
  Check,
  BookOpen
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CompetencyAssessmentSession, AssessmentGrade, Student, User, ClassRoom } from '../../types/spex';
import { INITIAL_STUDENTS, INITIAL_CLASSES } from '../../data/initialState';

interface CompetencyAssessmentViewProps {
  assessmentSessions?: CompetencyAssessmentSession[];
  onSaveAssessmentSession?: (session: CompetencyAssessmentSession) => void;
  currentUser?: User;
  classes?: ClassRoom[];
  students?: Student[];
  onAddClass?: (newClassData: { name: string; levelId: string; studentCount: number; municipality?: string; schoolName?: string }) => string;
}

// 1. Matrix of 15 Final Competencies across 5 Levels and 3 Domains
const COMPETENCY_MATRIX: Record<string, Record<string, { title: string; timing: string; target: string; track: string }>> = {
  'lvl_p1': {
    'f_locomotion': {
      title: 'يتخذ وضعيات وهيئات طبيعية لها علاقة مع محيطه المباشر',
      timing: 'ديسمبر (نهاية الميدان الأول)',
      target: 'تكييف هيئة الجسم مع المحيط والمحافظة على التوازن أثناء التنقل والوقوف.',
      track: 'مسلك حركي فني: التنقل المتوازن بين معالم محددة، الجري بغير اتجاه، التوقف المتوازن عند الإشارة الصوتية، والرمي الخفيف نحو هدف واسع.'
    },
    'f_basic_moves': {
      title: 'ينفذ حركات قاعدية مبنية على تكامل وظائف جسمه',
      timing: 'فيفري (نهاية الميدان الثاني)',
      target: 'جودة الأداء الحركي الأساسي والربط والتنسيق بين حركات الجري والوثب.',
      track: 'مسلك فني: الجري المستقيم لمسافة 10 أمتار + الوثب بقدمين داخل طوقين متتاليين + دحرجة جانبية بسيطة + رمي كرة خفيفة بالأيدين.'
    },
    'f_structuring': {
      title: 'يستغل فضاء الممارسة ومعالمه للتشكل والتنقل المنتظم',
      timing: 'ماي (نهاية الميدان الثالث)',
      target: 'التشكل والتنقل المنتظم والاحترام التفاعلي لفضاء اللعب والزملاء.',
      track: 'وضعية مشكلة جماعية: لعبة التموقع والتنقل المنتظم بين معالم الملعب (دوائر/خطوط) والمشاركة الفعالة ضمن نادٍ تربوي.'
    }
  },
  'lvl_p2': {
    'f_locomotion': {
      title: 'يعدل في الوقت المناسب وضعياته وتنقلاته من موقف لآخر',
      timing: 'ديسمبر (نهاية الميدان الأول)',
      target: 'التعديل الفوري للوضعية والتنقل حسب إكراهات الموقف وفضاء الممارسة.',
      track: 'مسلك فني: الجري السريع وتغيير الاتجاه عند العوائق + الوثب والتوقف المتوازن + تعديل وضعية المدافعة أثناء اللعب.'
    },
    'f_basic_moves': {
      title: 'ينفذ حركات طبيعية بسيطة في وضعيات متنوعة',
      timing: 'فيفري (نهاية الميدان الثاني)',
      target: 'تنفيذ الحركات الطبيعية (جري، وثب، رمي) بدقة وفي وضعيات فضائية مختلفة.',
      track: 'مسلك فني: الجري وتجاوز 3 حواجز منخفضة (15سم) + الوثب الطويل من الثبات + رمي الكرة الزنية نحو مربعات ترقيمية.'
    },
    'f_structuring': {
      title: 'يحدد الأسلوب والفضاء المناسبين لاستعمال أداة',
      timing: 'ماي (نهاية الميدان الثالث)',
      target: 'استعمال الأدوات الرياضية بأسلوب مناسب وتحديد المسافات الشاغرة.',
      track: 'وضعية مشكلة ألعاب مضرب/كرة: تمرير واستلام الأداة في المساحة الفارغة والتحرك السريع لتلقي التمريرة.'
    }
  },
  'lvl_p3': {
    'f_locomotion': {
      title: 'يركب جملة من العمليات وينفذها وفق ما يتطلبه الموقف',
      timing: 'ديسمبر (نهاية الميدان الأول)',
      target: 'تركيب السلسلة الحركية والربط السلس بين التنقل والقفز والتوازن.',
      track: 'مسلك فني مركب: تسلسل حركي يبدأ بالجري المتعرج + الدحرجة الأمامية أو الجسر + الوثب العمودي والتوازن على مقعد ثبات.'
    },
    'f_basic_moves': {
      title: 'ينجز حركات قاعدية متعلقة بالجري والرمي',
      timing: 'فيفري (نهاية الميدان الثاني)',
      target: 'إنجاز المهارات الحركية القاعدية للجري والرمي مع المحافظة على اندفاع الحركة.',
      track: 'مسلك ألعاب القوى: الجري السريع 20 أمتار + رمي الكرة الصولجانية/السهمية باليد الفاعلة لأقصى مسافة ممكنة من النطاق المخصص.'
    },
    'f_structuring': {
      title: 'يبني تصرفاته القاعدية لتنظيم تدخلاته حسب الموقف',
      timing: 'ماي (نهاية الميدان الثالث)',
      target: 'بناء التصرفات والتفاعل التكتيكي البسيط مع عناصر الفريق والمنافس.',
      track: 'مواجهة كروية/ألعاب مبسطة 4 ضد 4: اتخاذ القرار بالتحرك بالكرة أو بدونها وتنظيم خطوط اللعب وتغطية الثغرات.'
    }
  },
  'lvl_p4': {
    'f_locomotion': {
      title: 'ينجز فردياً وجماعياً حركات قاعدية تتعلق بالوثب والرمي مدافعة على ترابطها بما يتماشى وفضاء الممارسة',
      timing: 'ديسمبر (نهاية الميدان الأول)',
      target: 'المحافظة على الترابط الحركي الفردي والجماعي والتلاؤم مع أبعاد فضاء الممارسة.',
      track: 'مسلك فني تتابعي: الوثب الطويل المترابط + الرمي الموجه في مناطق محددة + الجري الجماعي للتتابع والتسليم.'
    },
    'f_basic_moves': {
      title: 'يؤدي حركات قاعدية متعلقة بالوثب والرمي ويحافظ على مراحلها وفق فضاء الممارسة المتاح',
      timing: 'فيفري (نهاية الميدان الثاني)',
      target: 'المحافظة على المراحل الفنية للحركة (الاندفاع، الارتقاء، الطيران، الهبوط/الرمي).',
      track: 'مسلك ألعاب القوى: الجري الاقتضابي (الاقتراب) + الوثب الطويل بحساب الخطوات + الرمي بقوة وسلاسة مع التوازن.'
    },
    'f_structuring': {
      title: 'يبني الحركات القاعدية التي تضمن مواجهة الموقف بما يتماشى وفضاء الممارسة',
      timing: 'ماي (نهاية الميدان الثالث)',
      target: 'المواجهة الجماعية والتطبيق التكتيكي للمهارات الرياضية في الألعاب الجماعية.',
      track: 'وضعية مباراة مبسطة 5 ضد 5: الانتشار الفضائي، تبادل التمرير السريع، بناء الهجمة، والتغطية الدفاعية المنتظمة.'
    }
  },
  'lvl_p5': {
    'f_locomotion': {
      title: 'ينجز عمليات فردية وجماعية مبنية على حركات قاعدية ويحافظ على ترابطها ويلائم وضعية جسمه حسب الموقف',
      timing: 'ديسمبر (نهاية الميدان الأول)',
      target: 'التحكم التام في إنجاز وسلاسة العمليات الفردية والجماعية وتعديل الهيئة تلقائياً.',
      track: 'مسلك فني متقدم: الجري المتزايد، الارتقاء الجانبي، التوازن على مقعد سويدي، والتحول السريع من وضعية الهجوم إلى الدفاع.'
    },
    'f_basic_moves': {
      title: 'ينجز حركات قاعدية متعلقة بالجري والوثب والرمي بطريقة سليمة',
      timing: 'فيفري (نهاية الميدان الثاني)',
      target: 'السلامة الفنية والأداء الرياضي السليم لحركات الجري والوثب والرمي.',
      track: 'اختبار ثلاثي لألعاب القوى: جري السرعة 30م + الوثب الطويل بالإشارة بحشو الرمل + رمي الكرة الثقيلة 1كغ.'
    },
    'f_structuring': {
      title: 'يمارس بعض الرياضات الجماعية وفق مبادئ اللعبة والتقنيات الأساسية',
      timing: 'ماي (نهاية الميدان الثالث)',
      target: 'الممارسة الرياضية المنظمة واحترام القوانين والتقنيات الأساسية للعبة الجماعية.',
      track: 'مباراة رياضية جماعية رسمية (كرة يد/سلة/قدم مبسطة) وفق قوانين ومبادئ اللعبة والتمركز والنواحي التكتيكية.'
    }
  }
};

// 2. The 4 Fixed Criteria according to the ministry evaluation framework
const OFFICIAL_CRITERIA = [
  { code: 'C1', name: 'المعيار 1: اختيار الوضعيات والتصرفات المناسبة للموقف (المعرفي / الملائمة)' },
  { code: 'C2', name: 'المعيار 2: التحكم في التنفيذ والمحافظة على التوازن وسريان الحركة (الحركي / الأداء)' },
  { code: 'C3', name: 'المعيار 3: ضبط معالم فضاء الممارسة وتعديل الوضعية حسب الفضاء (الفضائي / البيئي)' },
  { code: 'C4', name: 'المعيار 4: المساهمة الفعالة ضمن المجموعة وتنفيذ السلسلة المطلوبة (الاجتماعي / الجماعي)' },
];

const LEVEL_NAMES: Record<string, string> = {
  'lvl_p1': 'السنة الأولى ابتدائي (1AP)',
  'lvl_p2': 'السنة الثانية ابتدائي (2AP)',
  'lvl_p3': 'السنة الثالثة ابتدائي (3AP)',
  'lvl_p4': 'السنة الرابعة ابتدائي (4AP)',
  'lvl_p5': 'السنة الخامسة ابتدائي (5AP)',
};

const FIELD_NAMES: Record<string, { name: string; tag: string }> = {
  'f_locomotion': { name: 'الميدان الأول: الوضعيات والتنقلات', tag: 'ديسمبر' },
  'f_basic_moves': { name: 'الميدان الثاني: الحركات القاعدية', tag: 'فيفري' },
  'f_structuring': { name: 'الميدان الثالث: الهيكلة والبناء', tag: 'ماي' }
};

export const CompetencyAssessmentView: React.FC<CompetencyAssessmentViewProps> = ({
  assessmentSessions = [],
  onSaveAssessmentSession,
  currentUser,
  classes: propsClasses,
  students: propsStudents,
  onAddClass
}) => {
  // Local Classes and Students fallback
  const [localClasses, setLocalClasses] = useState<ClassRoom[]>(propsClasses !== undefined ? propsClasses : INITIAL_CLASSES);
  const [localStudents, setLocalStudents] = useState<Student[]>(propsStudents !== undefined ? propsStudents : INITIAL_STUDENTS);

  const allClasses = propsClasses !== undefined ? propsClasses : localClasses;
  const allStudentsList = propsStudents !== undefined ? propsStudents : localStudents;

  // State for Selection
  const [selectedLevelId, setSelectedLevelId] = useState<string>('lvl_p1');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('f_locomotion');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return allClasses[0]?.id || '';
  });

  // Modal State for Assigning / Adding a Class
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('1 ابتدائي 2');
  const [newLevelId, setNewLevelId] = useState('lvl_p1');
  const [newStudentCount, setNewStudentCount] = useState(28);
  const [newSchoolName, setNewSchoolName] = useState(currentUser?.schoolName || 'مدرسة الشهيد بالخيري عبد القادر');
  const [newMunicipality, setNewMunicipality] = useState(currentUser?.municipality || 'عين أزال');

  // Filter classes available for selected level
  const availableClasses = useMemo(() => {
    const matched = allClasses.filter((c) => c.levelId === selectedLevelId);
    return matched.length > 0 ? matched : allClasses;
  }, [allClasses, selectedLevelId]);

  // Handle Level Change -> Auto select appropriate first class
  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId);
    const matched = allClasses.filter((c) => c.levelId === levelId);
    if (matched.length > 0) {
      setSelectedClassId(matched[0].id);
    }
  };

  // Get active students list for selected class (Strict real students)
  const activeStudents = useMemo(() => {
    return allStudentsList.filter((s) => s.classId === selectedClassId);
  }, [allStudentsList, selectedClassId]);

  // Student Grades State: Map `${classId}_${fieldId}` -> studentId -> criterionCode -> AssessmentGrade
  const [studentGradesMap, setStudentGradesMap] = useState<
    Record<string, Record<string, Record<string, AssessmentGrade>>>
  >({});

  const sessionKey = `${selectedClassId}_${selectedFieldId}`;
  const currentSessionGrades = studentGradesMap[sessionKey] || {};

  // Helper score mapping for average calculation
  const gradeScoreMap: Record<AssessmentGrade, number> = {
    'أ': 4,
    'ب': 3,
    'ج': 2,
    'د': 1
  };

  const calculateStudentLevel = (grades: Record<string, AssessmentGrade>) => {
    const values = Object.values(grades).map((g) => gradeScoreMap[g] || 3);
    const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);

    if (avg >= 3.5) return { label: 'تملك أقصى (أ)', code: 'أ', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (avg >= 2.5) return { label: 'تملك مقبول (ب)', code: 'ب', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (avg >= 1.8) return { label: 'تملك جزئي (ج)', code: 'ج', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'تملك محدود (د)', code: 'د', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const handleGradeChange = (studentId: string, criterionCode: string, grade: AssessmentGrade) => {
    setStudentGradesMap((prev) => {
      const sessionMap = prev[sessionKey] || {};
      const studentCurrentGrades = sessionMap[studentId] || { C1: 'ب', C2: 'ب', C3: 'ب', C4: 'ب' };
      return {
        ...prev,
        [sessionKey]: {
          ...sessionMap,
          [studentId]: {
            ...studentCurrentGrades,
            [criterionCode]: grade
          }
        }
      };
    });
  };

  const handleBulkSetGrade = (grade: AssessmentGrade) => {
    const updated: Record<string, Record<string, AssessmentGrade>> = {};
    activeStudents.forEach((std) => {
      updated[std.id] = { C1: grade, C2: grade, C3: grade, C4: grade };
    });
    setStudentGradesMap((prev) => ({
      ...prev,
      [sessionKey]: updated
    }));
  };

  // Submit Handler for Modal Adding a New Class
  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    if (onAddClass) {
      const createdId = onAddClass({
        name: newClassName.trim(),
        levelId: newLevelId,
        studentCount: Number(newStudentCount) || 25,
        schoolName: newSchoolName,
        municipality: newMunicipality
      });
      setSelectedLevelId(newLevelId);
      setSelectedClassId(createdId);
    } else {
      const newId = `cls_${Date.now()}`;
      const createdClass: ClassRoom = {
        id: newId,
        institutionId: 'inst_ainazel_1',
        teacherId: currentUser?.id || '',
        levelId: newLevelId,
        name: newClassName.trim(),
        studentCount: 0
      };
      setLocalClasses((prev) => [...prev, createdClass]);

      setSelectedLevelId(newLevelId);
      setSelectedClassId(newId);
    }

    setIsAddClassModalOpen(false);
  };

  // Get current Competency Details from Matrix
  const currentCompetency = useMemo(() => {
    const levelData = COMPETENCY_MATRIX[selectedLevelId] || COMPETENCY_MATRIX['lvl_p1'];
    return levelData[selectedFieldId] || levelData['f_locomotion'];
  }, [selectedLevelId, selectedFieldId]);

  // Stats calculation for Chart
  const stats = useMemo(() => {
    const counts = { 'أ': 0, 'ب': 0, 'ج': 0, 'د': 0 };

    activeStudents.forEach((std) => {
      const grades = currentSessionGrades[std.id] || { C1: 'ب', C2: 'ب', C3: 'ب', C4: 'ب' };
      const res = calculateStudentLevel(grades);
      counts[res.code as keyof typeof counts] = (counts[res.code as keyof typeof counts] || 0) + 1;
    });

    return [
      { name: 'أ (تملك أقصى)', count: counts['أ'], color: '#10b981' },
      { name: 'ب (تملك مقبول)', count: counts['ب'], color: '#3b82f6' },
      { name: 'ج (تملك جزئي)', count: counts['ج'], color: '#f59e0b' },
      { name: 'د (تملك محدود)', count: counts['د'], color: '#f43f5e' }
    ];
  }, [activeStudents, currentSessionGrades]);

  // Students requiring remediation (grade 'د')
  const remediationStudents = useMemo(() => {
    return activeStudents.filter((std) => {
      const grades = currentSessionGrades[std.id] || { C1: 'ب', C2: 'ب', C3: 'ب', C4: 'ب' };
      return calculateStudentLevel(grades).code === 'د';
    });
  }, [activeStudents, currentSessionGrades]);

  const activeClassObj = allClasses.find((c) => c.id === selectedClassId) || availableClasses[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print:space-y-3">
      {/* Printable Header - Visible ONLY in Print */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4 space-y-1">
        <h3 className="text-sm font-black text-slate-900">الجمهورية الجزائرية الديمقراطية الشعبية</h3>
        <h4 className="text-xs font-bold text-slate-700">وزارة التربية الوطنية - مديرية التربية لولاية سطيف</h4>
        <h5 className="text-xs font-extrabold text-blue-900 mt-1">
          شبكة تقويم الكفاءة الختامية وحصة التقويم التحصيلي الرسمية ({LEVEL_NAMES[selectedLevelId]})
        </h5>
        <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 px-2">
          <span>المؤسسة: {currentUser?.schoolName || newSchoolName || 'مدرسة الشهيد بالخيري عبد القادر'}</span>
          <span>القسم: {activeClassObj?.name} | الميدان: {FIELD_NAMES[selectedFieldId]?.name}</span>
          <span>البلدية: {newMunicipality} | التاريخ: {new Date().toLocaleDateString('ar-DZ')}</span>
        </div>
      </div>

      {/* Main Header Screen */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
              المخطط السنوي للتربية البدنية والرياضية
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              حصة التقويم التحصيلي الختامية
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
              إجمالي الأقسام المسندة: {allClasses.length} قسم
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            <Target className="w-6 h-6 text-teal-600" />
            <span>شبكة تقويم الكفاءات الختامية وحصص التقويم التحصيلي</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            تقويم لجميع الأقسام (س1 إلى س5) في نهاية كل الميادين مع إمكانية إسناد وإضافة أقسام جديدة للأستاذ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddClassModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إسناد قسم جديد للأستاذ</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>طباعة الشبكة الرسمية</span>
          </button>
        </div>
      </div>

      {/* Level, Field & Class Selectors */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        {/* Row 1: Grade Selection Tabs (1AP to 5AP) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>1. اختر المستوى الدراسي (الطور الابتدائي):</span>
            </label>
            <span className="text-[11px] font-bold text-slate-500">
              أقسام المستوى الحالي: {availableClasses.length} قسم
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(LEVEL_NAMES).map(([lvlId, lvlName]) => {
              const active = selectedLevelId === lvlId;
              const countForLevel = allClasses.filter((c) => c.levelId === lvlId).length;
              return (
                <button
                  key={lvlId}
                  onClick={() => handleLevelChange(lvlId)}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all text-center border cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                    active
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-transparent shadow-md shadow-teal-500/20 scale-102'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{lvlName}</span>
                  <span className={`text-[10px] font-normal ${active ? 'text-teal-100' : 'text-slate-400'}`}>
                    ({countForLevel} قسم مسند)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Field Selection & Class Dropdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="lg:col-span-2">
            <label className="text-xs font-extrabold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>2. اختر الميدان التعليمي وتوقيت حصة التقويم التحصيلي (في نهاية الميدان):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(FIELD_NAMES).map(([fId, fObj]) => {
                const active = selectedFieldId === fId;
                return (
                  <button
                    key={fId}
                    onClick={() => setSelectedFieldId(fId)}
                    className={`p-2.5 rounded-2xl text-xs font-bold text-right transition-all border cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{fObj.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1.5 self-start ${
                        active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      توقيت التقويم: {fObj.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>3. اختر القسم المخصص للتقويم:</span>
              </label>
              <button
                onClick={() => setIsAddClassModalOpen(true)}
                className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>إسناد قسم</span>
              </button>
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-300 font-extrabold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
            >
              {allClasses.map((cls) => {
                const lvlName = LEVEL_NAMES[cls.levelId] || cls.levelId;
                return (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.studentCount} تلميذ) — [{lvlName.split('(')[0]}]
                  </option>
                );
              })}
            </select>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
              <span>تلقائياً: تفريغ وتقويم تلاميذ القسم</span>
              <span className="font-bold text-slate-700">البلدية: {newMunicipality}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Competency Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <span className="text-xs text-teal-300 font-bold block">
                الهدف الأسمى المباشر لحصة التقويم التحصيلي
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                الكفاءة الختامية المستهدفة ({LEVEL_NAMES[selectedLevelId]}) — قسم: {activeClassObj?.name}
              </h3>
            </div>
          </div>

          <span className="text-xs font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            📅 {currentCompetency.timing}
          </span>
        </div>

        {/* Competency Statement */}
        <div className="p-4 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-xs space-y-1">
          <span className="text-xs text-blue-200 font-bold block">نص الكفاءة الختامية بالمنهاج:</span>
          <p className="text-sm sm:text-base font-extrabold text-yellow-300 leading-relaxed">
            « {currentCompetency.title} »
          </p>
        </div>

        {/* Position Target & Technical Track */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="font-extrabold text-teal-300 block mb-1">الموقف الاستهدافي المباشر:</span>
            <p className="text-slate-200 leading-relaxed">{currentCompetency.target}</p>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="font-extrabold text-amber-300 block mb-1">وسيلة القياس الرسمية (المسلك الفني):</span>
            <p className="text-slate-200 leading-relaxed">{currentCompetency.track}</p>
          </div>
        </div>
      </div>

      {/* Analytics & Distribution Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>إحصائيات ونسب تملك الكفاءة الختامية لقسم: ({activeClassObj?.name})</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              إجمالي المفحوصين: {activeStudents.length} تلميذ
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#334155' }} />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend Levels Box */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-md space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-teal-300 border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>مستويات التحكم الرسمية بالمنهاج:</span>
            </h4>
            <ul className="space-y-1.5 text-xs mt-2">
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-emerald-400">تقدير (أ)</span>
                <span>تملك أقصى (ممتاز)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-blue-400">تقدير (ب)</span>
                <span>تملك مقبول (جيد)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-amber-400">تقدير (ج)</span>
                <span>تملك جزئي (متوسط)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-bold text-rose-400">تقدير (د)</span>
                <span>تملك محدود (يتطلب علاج)</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 font-bold">
            <span>سريع التعيين للقسم:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleBulkSetGrade('أ')}
                className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
              >
                الجميع أ
              </button>
              <button
                onClick={() => handleBulkSetGrade('ب')}
                className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white cursor-pointer"
              >
                الجميع ب
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Student Evaluation Grid Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-600" />
              <span>شبكة تقويم التلاميذ التفصيلية (المعايير الأربعة)</span>
            </h3>
            <span className="text-xs text-slate-500">
              تفرغ التقديرات لكل معيار (أ، ب، ج، د) ويحسب تملك الكفاءة الختامية آلياً
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
              القسم الحالي: {activeClassObj?.name} ({activeStudents.length} تلميذ)
            </span>
          </div>
        </div>

        {/* Four Criteria Explanation Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] p-3 bg-slate-50 rounded-2xl border border-slate-200">
          {OFFICIAL_CRITERIA.map((crit) => (
            <div key={crit.code} className="font-bold text-slate-700">
              <span className="text-teal-700 font-extrabold">{crit.code}:</span> {crit.name.split(':')[1]}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                <th className="p-3">رقم التسجيل</th>
                <th className="p-3">اسم ولقب التلميذ</th>
                <th className="p-3">الجنس</th>
                <th className="p-3 text-center" title={OFFICIAL_CRITERIA[0].name}>C1 الملائمة</th>
                <th className="p-3 text-center" title={OFFICIAL_CRITERIA[1].name}>C2 الأداء الحركي</th>
                <th className="p-3 text-center" title={OFFICIAL_CRITERIA[2].name}>C3 الفضاء والتوازن</th>
                <th className="p-3 text-center" title={OFFICIAL_CRITERIA[3].name}>C4 التنسيق والمجموعة</th>
                <th className="p-3 text-center">درجة التحكم النهائي للكفاءة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeStudents.map((std) => {
                const grades = currentSessionGrades[std.id] || { C1: 'ب', C2: 'ب', C3: 'ب', C4: 'ب' };
                const levelRes = calculateStudentLevel(grades);

                return (
                  <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400 font-bold">{std.registrationNumber}</td>
                    <td className="p-3 font-extrabold text-slate-900">
                      {std.firstName} {std.lastName}
                    </td>
                    <td className="p-3 text-slate-500">{std.gender}</td>

                    {/* Selector for C1 to C4 */}
                    {['C1', 'C2', 'C3', 'C4'].map((cCode) => {
                      const cur = grades[cCode] || 'ب';
                      return (
                        <td key={cCode} className="p-3 text-center">
                          <select
                            value={cur}
                            onChange={(e) => handleGradeChange(std.id, cCode, e.target.value as AssessmentGrade)}
                            className={`p-1.5 rounded-lg font-black text-xs outline-none cursor-pointer border transition-all ${
                              cur === 'أ'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : cur === 'ب'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : cur === 'ج'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="أ">أ (أقصى)</option>
                            <option value="ب">ب (مقبول)</option>
                            <option value="ج">ج (جزئي)</option>
                            <option value="د">د (محدود)</option>
                          </select>
                        </td>
                      );
                    })}

                    <td className="p-3 text-center">
                      <span className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${levelRes.color}`}>
                        {levelRes.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remediation Panel for Level 'د' */}
      {remediationStudents.length > 0 && (
        <div className="bg-rose-50 rounded-3xl p-6 border border-rose-200/80 shadow-xs space-y-3 print:hidden">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
            <h3 className="text-sm font-extrabold">
              خطة المعالجة والعلاج البيداغوجي (التلاميذ المتحصلون على تملك محدود - د)
            </h3>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            تم رصد <strong className="underline">{remediationStudents.length} تلاميذ</strong> في هذا القسم يحتاجون حصص معالجة بيداغوجية موجهة لتدارك نقائص المسلك الفني قبل نهاية الفصل الدراسي:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {remediationStudents.map((s) => (
              <span key={s.id} className="px-3 py-1 bg-white border border-rose-300 text-rose-900 rounded-xl text-xs font-bold shadow-xs">
                {s.firstName} {s.lastName} ({s.registrationNumber})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Print Footer / Signatures - Visible in Print Only */}
      <div className="hidden print:grid grid-cols-2 gap-8 text-xs font-bold text-slate-800 pt-8 border-t border-slate-300 mt-6">
        <div className="text-center space-y-12">
          <p>توقيع وختم أستاذ التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
        <div className="text-center space-y-12">
          <p>توقيع وختم مفتش التربية البدنية والرياضية</p>
          <p className="text-slate-400">......................................................</p>
        </div>
      </div>

      {/* MODAL: Assign / Add New Class to Teacher */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <School className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">إسناد قسم جديد للأستاذ</h3>
                  <p className="text-xs text-slate-500">تحديد اسم القسم والمستوى الدراسي المعني ميدانياً</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  اسم القسم أو الفوج التربوي:
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="مثال: 1 ابتدائي 2 أو 3 ابتدائي 3"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    المستوى الدراسي:
                  </label>
                  <select
                    value={newLevelId}
                    onChange={(e) => setNewLevelId(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {Object.entries(LEVEL_NAMES).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    عدد تلاميذ القسم:
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    value={newStudentCount}
                    onChange={(e) => setNewStudentCount(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  المؤسسة التربوية المسندة:
                </label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  البلدية التربوية:
                </label>
                <input
                  type="text"
                  value={newMunicipality}
                  onChange={(e) => setNewMunicipality(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>إسناد القسم وحفظ المعطيات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
