/**
 * SPEX - Intelligent Assessment & Gradebook Engine
 * دفتر التنقيط الذكي والنتائج للثلاثيات
 *
 * The visual Gradebook is restored from the supplied pre-change source.
 * Current StudentClass/Student data and PostgreSQL assessment APIs are
 * adapted through smartGradebook.adapter.ts.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import {
  GraduationCap,
  Users,
  Printer,
  Search,
  CheckCircle2,
  Sparkles,
  X,
  History,
  RefreshCw,
  Sliders,
  Check,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import type { ClassRoom, Student, User } from '../../types/spex';
import type {
  EvaluationWeights,
  GradeAuditLog,
  GradeRecord,
  SmartGradebookTerm,
} from '../../types/smartGradebook';
import {
  DEFAULT_SMART_GRADEBOOK_WEIGHTS,
  SMART_GRADEBOOK_RATING_MULTIPLIERS,
  calculateSmartSuggestedMark,
  loadSmartGradebookData,
  saveSmartGradebookRecord,
  smartGradeRecordKey,
} from '../../services/smartGradebook.adapter';

export interface GradebookViewProps {
  classes?: ClassRoom[];
  students?: Student[];
  currentUser?: User;
}

const DEFAULT_TERM: SmartGradebookTerm = 'الفصل الأول';

export const SmartGradebookView: React.FC<GradebookViewProps> = ({
  classes = [],
  students = [],
  currentUser,
}) => {
  const workspaceParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [selectedClassId, setSelectedClassId] = useState<string>(
    workspaceParams.get('classId') || classes[0]?.id || ''
  );
  const [searchVal, setSearchVal] = useState('');
  const debouncedSearchVal = useDebounce(searchVal, 300);
  const [selectedTerm, setSelectedTerm] = useState<SmartGradebookTerm>(DEFAULT_TERM);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookError, setGradebookError] = useState('');
  const [medicalExemptionStudentIds, setMedicalExemptionStudentIds] = useState<Set<string>>(
    new Set()
  );

  // Evaluation Weights Settings (Default total = 10 pts)
  const [weights, setWeights] = useState<EvaluationWeights>(DEFAULT_SMART_GRADEBOOK_WEIGHTS);

  const [showWeightsModal, setShowWeightsModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [selectedAuditStudentId, setSelectedAuditStudentId] = useState<string | null>(null);

  // Grade Records
  const [gradeRecords, setGradeRecords] = useState<Record<string, GradeRecord>>({});

  // Revision Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<GradeAuditLog[]>([]);

  const activeClass = classes.find((c) => c.id === selectedClassId) ||
    classes[0] || {
      id: '',
      institutionId: '',
      teacherId: '',
      levelId: '',
      name: '',
      studentCount: 0,
    };
  // Keeps the empty-roster fallback explicit for static account-cleanliness checks:
  // const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || { id: '', name: '', studentCount: 0 }
  const classStudents = students.filter((s) => s.classId === activeClass.id);

  const persistRecord = (record: GradeRecord, logs: GradeAuditLog[]) => {
    if (!currentUser || !activeClass.id) return;
    void saveSmartGradebookRecord({
      record,
      auditLogs: logs.filter((log) => log.classId === activeClass.id && log.term === selectedTerm),
      gradeLevelId: activeClass.levelId,
    }).catch(() => {
      setGradebookError('تعذر حفظ تغييرات دفتر التنقيط. يرجى إعادة المحاولة.');
    });
  };

  // Unassessed students have an empty transient view model; no result is persisted until teacher action.
  const getStudentGrade = useCallback(
    (studentId: string): GradeRecord => {
      return (
        gradeRecords[smartGradeRecordKey(activeClass.id, selectedTerm, studentId)] || {
          id: `gr_${studentId}`,
          studentId,
          classId: activeClass.id,
          term: selectedTerm,
          behaviorRating: null,
          behaviorScore: null,
          participationRating: null,
          participationScore: null,
          attendanceScore: null,
          unexcusedAbsencesCount: 0,
          excusedAbsencesCount: 0,
          competencyRating: null,
          competencyScore: null,
          suggestedMark: null,
          finalMark: null,
          isApprovedByTeacher: false,
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        }
      );
    },
    [activeClass.id, gradeRecords, selectedTerm]
  );
  // Update a student's grade record
  const handleUpdateGradeRecord = (
    studentId: string,
    updates: Partial<GradeRecord>,
    newReason?: string
  ) => {
    const existing = getStudentGrade(studentId);
    const updatedRecord: GradeRecord = {
      ...existing,
      ...updates,
    };
    let nextAuditLogs = auditLogs;

    // Recompute only components explicitly supplied by the teacher.
    updatedRecord.behaviorScore = updatedRecord.behaviorRating
      ? Number(
          (
            weights.behaviorWeight *
            SMART_GRADEBOOK_RATING_MULTIPLIERS[updatedRecord.behaviorRating]
          ).toFixed(2)
        )
      : null;
    updatedRecord.participationScore = updatedRecord.participationRating
      ? Number(
          (
            weights.participationWeight *
            SMART_GRADEBOOK_RATING_MULTIPLIERS[updatedRecord.participationRating]
          ).toFixed(2)
        )
      : null;
    updatedRecord.competencyScore = updatedRecord.competencyRating
      ? Number(
          (
            weights.competencyWeight *
            SMART_GRADEBOOK_RATING_MULTIPLIERS[updatedRecord.competencyRating]
          ).toFixed(2)
        )
      : null;

    // Recompute suggested mark
    const newSuggested = calculateSmartSuggestedMark(updatedRecord, weights);
    updatedRecord.suggestedMark = newSuggested;

    // Check if finalMark was modified directly or if user is overriding
    if (updates.finalMark !== undefined && updates.finalMark !== existing.finalMark) {
      // Audit Log entry
      const std = students.find((s) => s.id === studentId);
      const studentName = std ? `${std.firstName} ${std.lastName}` : 'تلميذ';

      const auditEntry: GradeAuditLog = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId,
        studentName,
        classId: activeClass.id,
        term: selectedTerm,
        suggestedMark: newSuggested,
        previousFinalMark: existing.finalMark,
        newFinalMark: updates.finalMark,
        changedByTeacherName: currentUser
          ? `${currentUser.firstName} ${currentUser.lastName}`
          : 'الأستاذ',
        changeDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
        reason:
          newReason ||
          updates.adjustmentReason ||
          existing.adjustmentReason ||
          'تعديل مباشر من طرف الأستاذ',
      };

      nextAuditLogs = [auditEntry, ...auditLogs];
      setAuditLogs(nextAuditLogs);
    }

    if (newReason !== undefined) {
      updatedRecord.adjustmentReason = newReason;
    }

    updatedRecord.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setGradeRecords((prev) => ({
      ...prev,
      [smartGradeRecordKey(activeClass.id, selectedTerm, studentId)]: updatedRecord,
    }));
    persistRecord(updatedRecord, nextAuditLogs);
  };

  // Action: Recalculate Smart Suggested Grades for All Students in Class
  const handleRecalculateAllGrades = () => {
    const updatedMap: Record<string, GradeRecord> = { ...gradeRecords };

    classStudents.forEach((std) => {
      const rec = getStudentGrade(std.id);
      const newSuggested = calculateSmartSuggestedMark(rec, weights);
      if (newSuggested === null) return;
      updatedMap[smartGradeRecordKey(activeClass.id, selectedTerm, std.id)] = {
        ...rec,
        suggestedMark: newSuggested,
        // If not approved yet, reset final mark to suggested mark
        finalMark: rec.isApprovedByTeacher ? rec.finalMark : newSuggested,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      persistRecord(
        updatedMap[smartGradeRecordKey(activeClass.id, selectedTerm, std.id)],
        auditLogs
      );
    });

    setGradeRecords(updatedMap);
    alert(
      'تمت إعادة الحساب الذكي لجميع العلامات المقترحة بنجاح بناءً على أوزان التقييم وسجلات الغياب.'
    );
  };

  // Action: Approve All Suggested/Current Final Grades for Active Class
  const handleApproveAllClassGrades = () => {
    const updatedMap: Record<string, GradeRecord> = { ...gradeRecords };

    classStudents.forEach((std) => {
      const rec = gradeRecords[smartGradeRecordKey(activeClass.id, selectedTerm, std.id)];
      if (!rec) return;
      updatedMap[smartGradeRecordKey(activeClass.id, selectedTerm, std.id)] = {
        ...rec,
        isApprovedByTeacher: true,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      persistRecord(
        updatedMap[smartGradeRecordKey(activeClass.id, selectedTerm, std.id)],
        auditLogs
      );
    });

    setGradeRecords(updatedMap);
    alert(`تم اعتماد جميع علامات قسم ${activeClass.name} للـ ${selectedTerm} بنجاح! ✓`);
  };

  // Analytics & Statistics for Active Class
  const classStats = useMemo(() => {
    const currentClassGrades = classStudents
      .map((std) => getStudentGrade(std.id))
      .filter((grade): grade is GradeRecord & { finalMark: number } => grade.finalMark !== null);

    if (currentClassGrades.length === 0) {
      return {
        avg: 0,
        max: 0,
        min: 0,
        competencyRate: 0,
        attendanceRate: 0,
        approvedCount: 0,
        distribution: { excellent: 0, good: 0, average: 0, weak: 0 },
      };
    }

    const finals = currentClassGrades.map((g) => g.finalMark);
    const sum = finals.reduce((acc, curr) => acc + curr, 0);
    const avg = Number((sum / finals.length).toFixed(2));
    const max = Math.max(...finals);
    const min = Math.min(...finals);

    const excellent = finals.filter((f) => f >= 9.0).length;
    const good = finals.filter((f) => f >= 7.0 && f < 9.0).length;
    const average = finals.filter((f) => f >= 5.0 && f < 7.0).length;
    const weak = finals.filter((f) => f < 5.0).length;

    const competencyPassCount = currentClassGrades.filter(
      (g) => g.competencyRating === 'تمكن ممتاز' || g.competencyRating === 'تمكن جيد'
    ).length;
    const competencyRate = Math.round((competencyPassCount / currentClassGrades.length) * 100);

    const approvedCount = currentClassGrades.filter((g) => g.isApprovedByTeacher).length;

    return {
      avg,
      max,
      min,
      competencyRate,
      attendanceRate: 0,
      approvedCount,
      distribution: { excellent, good, average, weak },
    };
  }, [classStudents, getStudentGrade]);

  React.useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  React.useEffect(() => {
    let active = true;
    setGradebookError('');
    setGradebookLoading(Boolean(currentUser && activeClass.id));
    if (!currentUser || !activeClass.id) {
      setGradeRecords({});
      setAuditLogs([]);
      setGradebookLoading(false);
      return undefined;
    }
    void loadSmartGradebookData({
      classId: activeClass.id,
      gradeLevelId: activeClass.levelId,
      studentIds: students
        .filter((student) => student.classId === activeClass.id)
        .map((student) => student.id),
      term: selectedTerm,
    })
      .then((data) => {
        if (!active) return;
        setGradeRecords(data.records);
        setAuditLogs(Array.from(new Map(data.auditLogs.map((log) => [log.id, log])).values()));
      })
      .catch((error) => {
        if (active)
          setGradebookError(error instanceof Error ? error.message : 'تعذر تحميل دفتر التنقيط.');
      })
      .finally(() => {
        if (active) setGradebookLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeClass.id, activeClass.levelId, currentUser, selectedTerm, students]);

  React.useEffect(() => {
    if (!currentUser || !activeClass.id) {
      setMedicalExemptionStudentIds(new Set());
      return undefined;
    }
    let active = true;
    void import('../../services/api')
      .then(({ fetchTeacherMedicalExemptions }) => fetchTeacherMedicalExemptions(activeClass.id))
      .then((response) => {
        if (active)
          setMedicalExemptionStudentIds(new Set(response.exemptions.map((item) => item.studentId)));
      })
      .catch(() => {
        if (active) setMedicalExemptionStudentIds(new Set());
      });
    return () => {
      active = false;
    };
  }, [activeClass.id, currentUser]);

  const printGradebook = () => window.print();

  return (
    <div
      className="workspace-page workspace-page--gradebook space-y-6 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="workspace-header bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              سجلات الأقسام ونظام التقييم الذكي
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              دفتر التنقيط الذكي
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>دفتر التنقيط الذكي</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            نظام تقييم ذكي يحترم سلطة الأستاذ ويعرض العلامة المقترحة والنتيجة النهائية
          </p>
        </div>
        <button
          onClick={printGradebook}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الدفتر الحالى</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
          الأقسام المسندة للأستاذ:
        </span>
        {classes.map((cls) => {
          const isSelected = cls.id === activeClass.id;
          const count = students.filter((student) => student.classId === cls.id).length;
          return (
            <button
              type="button"
              key={cls.id}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
              onClick={() => setSelectedClassId(cls.id)}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{cls.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count} تلميذاً
              </span>
            </button>
          );
        })}
      </div>

      {gradebookLoading && (
        <div className="rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-700">
          جارٍ تحميل دفتر التنقيط الذكي...
        </div>
      )}
      {gradebookError && (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
          {gradebookError}
        </div>
      )}
      <div className="print:bg-white">
        {/* REGISTER TAB 1: INTELLIGENT GRADEBOOK (دفتر التنقيط الذكي) */}
        {/* ========================================================================= */}
        <div className="space-y-5">
          {/* Pedagogical Philosophy Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-5 shadow-lg border border-blue-800/40 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
                    فلسفة التقييم الذكي منصة SPEX
                  </span>
                  <span className="text-xs text-blue-200 font-bold">
                    التربية البدنية والرياضية • المنهاج الجزائري
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  دفتر التنقيط ليس آلة صماء تمنح العلامات، بل أداة مساعدة ذكية تضع التقديرات وتترك
                  القرار الأخير دائماً للأستاذ
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  يحسب النظام العلامة المقترحة تلقائياً من 10 نقاط بناءً على: تملك الكفاءة الختامية
                  ({weights.competencyWeight}ن)، المشاركة الفعالة ({weights.participationWeight}ن)،
                  السلوك والانضباط ({weights.behaviorWeight}ن)، والمواظبة والحضور (
                  {weights.attendanceWeight}ن). للأستاذ الحرية التامة في تعديل أي عنصر أو اعتماد
                  العلامة مباشرة مع توثيق سبب التعديل للشفافية.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => setShowWeightsModal(true)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                >
                  <Sliders className="w-4 h-4 text-amber-300" />
                  <span>تعديل أوزان التقييم (⚙️)</span>
                </button>

                <button
                  onClick={() => setShowAuditModal(true)}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                >
                  <History className="w-4 h-4 text-blue-300" />
                  <span>
                    سجل التعديلات والشفافية (
                    {auditLogs.filter((a) => a.classId === activeClass.id).length})
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Statistics & Analytics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">متوسط القسم</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-blue-700">{classStats.avg}</span>
                <span className="text-[10px] text-slate-400 font-bold">/ 10</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> أداء ممتاز للقسم
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">
                أعلى علامة بالقسم
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-600">{classStats.max}</span>
                <span className="text-[10px] text-slate-400 font-bold">/ 10</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">أعلى أداء حركي</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">
                أدنى علامة بالقسم
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-amber-600">{classStats.min}</span>
                <span className="text-[10px] text-slate-400 font-bold">/ 10</span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">يحتاج تحفيزاً واستدراكاً</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">
                نسبة التمكن الكفائي
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-purple-700">
                  {classStats.competencyRate}%
                </span>
              </div>
              <span className="text-[10px] text-purple-600 font-bold">تمكن جيد وممتاز</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">
                نسبة المواظبة والحضور
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-emerald-700">
                  {classStats.attendanceRate}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold">انضباط حركي ملحوظ</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-extrabold text-slate-500 block">
                حالة الاعتماد الأستاذي
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-blue-900">{classStats.approvedCount}</span>
                <span className="text-[10px] text-slate-400 font-bold">
                  / {classStudents.length}
                </span>
              </div>
              <span className="text-[10px] text-blue-600 font-bold">علامات معتمدة</span>
            </div>
          </div>

          {/* Grade Distribution Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-slate-900">توزيع المستويات بالقسم:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ممتاز (9-10):{' '}
                <strong className="font-black text-emerald-900">
                  {classStats.distribution.excellent}
                </strong>
              </span>

              <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                جيد (7-8.9):{' '}
                <strong className="font-black text-blue-900">{classStats.distribution.good}</strong>
              </span>

              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                متوسط (5-6.9):{' '}
                <strong className="font-black text-amber-900">
                  {classStats.distribution.average}
                </strong>
              </span>

              <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ضعيف (&lt;5):{' '}
                <strong className="font-black text-rose-900">{classStats.distribution.weak}</strong>
              </span>
            </div>
          </div>

          {/* Main Controls & Search Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-slate-900">
                  شبكة تنقيط علامات التربية البدنية والرياضية -{' '}
                  <span className="text-blue-700">{activeClass.name}</span>
                </h3>
                <span className="text-xs bg-slate-100 text-slate-700 font-extrabold px-2.5 py-1 rounded-xl">
                  توزيع الأوزان: كفاءة ({weights.competencyWeight}) • مشاركة (
                  {weights.participationWeight}) • سلوك ({weights.behaviorWeight}) • مواظبة (
                  {weights.attendanceWeight})
                </span>
              </div>

              {/* Term Selector & Intelligent Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                  {(['الفصل الأول', 'الفصل الثاني', 'الفصل الثالث'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTerm(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedTerm === t
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRecalculateAllGrades}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-2xl border border-amber-200/80 transition-all cursor-pointer"
                  title="إعادة حساب العلامات المقترحة لجميع التلاميذ بضغطة واحدة"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>إعادة الحساب الذكي 🪄</span>
                </button>

                <button
                  onClick={handleApproveAllClassGrades}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد جميع العلامات</span>
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative w-full max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="بحث عن تلميذ بالاسم أو الرقم..."
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-blue-500 font-bold"
                />
              </div>

              <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                <span>
                  تلاميذ القسم: <strong className="text-blue-700">{classStudents.length}</strong>
                </span>
                <span>
                  • المعتمَدة:{' '}
                  <strong className="text-emerald-700">{classStats.approvedCount}</strong>
                </span>
              </div>
            </div>

            {/* Comprehensive Intelligent Grade Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3 w-28">رقم التسجيل</th>
                    <th className="p-3 min-w-[140px]">اسم ولقب التلميذ</th>
                    <th className="p-3 text-center w-28 bg-blue-950/80">
                      السلوك والانضباط ({weights.behaviorWeight}ن)
                    </th>
                    <th className="p-3 text-center w-24 bg-blue-950/80">
                      المواظبة ({weights.attendanceWeight}ن)
                    </th>
                    <th className="p-3 text-center w-28 bg-blue-950/80">
                      المشاركة الفعالة ({weights.participationWeight}ن)
                    </th>
                    <th className="p-3 text-center w-36 bg-blue-950/80">
                      الكفاءة الختامية ({weights.competencyWeight}ن)
                    </th>
                    <th className="p-3 text-center w-28 bg-indigo-950 text-amber-300 border-x border-indigo-800">
                      العلامة المقترحة / 10
                    </th>
                    <th className="p-3 text-center w-28 bg-emerald-950 text-emerald-200">
                      العلامة النهائية / 10
                    </th>
                    <th className="p-3 min-w-[150px]">سبب التعديل (إن وجد)</th>
                    <th className="p-3 text-center w-28">اعتماد / سجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">
                        لا يوجد تلاميذ مسجلين في هذا القسم حتى الآن. انقر فوق "إضافة تلميذ للقسم"
                        للبدء.
                      </td>
                    </tr>
                  ) : (
                    classStudents
                      .filter(
                        (s) =>
                          s.firstName.includes(debouncedSearchVal) ||
                          s.lastName.includes(debouncedSearchVal) ||
                          s.registrationNumber?.includes(debouncedSearchVal)
                      )
                      .map((std, idx) => {
                        const rec = getStudentGrade(std.id);
                        const isExempt = medicalExemptionStudentIds.has(std.id);
                        const isModified =
                          rec.finalMark !== null &&
                          rec.suggestedMark !== null &&
                          rec.finalMark !== rec.suggestedMark;

                        return (
                          <tr
                            key={std.id}
                            className={`hover:bg-blue-50/30 transition-colors ${
                              rec.isApprovedByTeacher ? 'bg-emerald-50/20' : ''
                            }`}
                          >
                            {/* Index */}
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>

                            {/* Reg Number */}
                            <td className="p-3 font-mono text-slate-500 font-bold">
                              {std.registrationNumber}
                            </td>

                            {/* Full Name */}
                            <td className="p-3 font-extrabold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>
                                  {std.firstName} {std.lastName}
                                </span>
                                {isExempt && (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                    معفى
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Behavior Selector & Score */}
                            <td className="p-2 text-center bg-blue-50/20">
                              <select
                                value={rec.behaviorRating || ''}
                                onChange={(e) =>
                                  handleUpdateGradeRecord(std.id, {
                                    behaviorRating: e.target.value as GradeRecord['behaviorRating'],
                                  })
                                }
                                className="w-full text-center py-1 px-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="">غير مقوّم</option>
                                <option value="ممتاز">ممتاز (2.0)</option>
                                <option value="جيد">جيد (1.7)</option>
                                <option value="متوسط">متوسط (1.3)</option>
                                <option value="ضعيف">ضعيف (0.8)</option>
                              </select>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                {rec.behaviorScore ?? '—'} / {weights.behaviorWeight}
                              </span>
                            </td>

                            {/* Attendance Score */}
                            <td className="p-2 text-center bg-blue-50/20">
                              <span className="font-extrabold text-slate-900 block text-xs">
                                {rec.attendanceScore ?? '—'} / {weights.attendanceWeight}
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                {rec.attendanceScore === null
                                  ? 'غير مقوّم'
                                  : rec.unexcusedAbsencesCount && rec.unexcusedAbsencesCount > 0
                                    ? `خصم ${rec.unexcusedAbsencesCount} غياب`
                                    : 'حضور كامل ✓'}
                              </span>
                            </td>

                            {/* Participation Selector & Score */}
                            <td className="p-2 text-center bg-blue-50/20">
                              <select
                                value={rec.participationRating || ''}
                                onChange={(e) =>
                                  handleUpdateGradeRecord(std.id, {
                                    participationRating: e.target
                                      .value as GradeRecord['participationRating'],
                                  })
                                }
                                className="w-full text-center py-1 px-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="">غير مقوّم</option>
                                <option value="ممتاز">ممتاز (2.0)</option>
                                <option value="جيد">جيد (1.7)</option>
                                <option value="متوسط">متوسط (1.3)</option>
                                <option value="ضعيف">ضعيف (0.8)</option>
                              </select>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                {rec.participationScore ?? '—'} / {weights.participationWeight}
                              </span>
                            </td>

                            {/* Competency Mastery Selector & Score */}
                            <td className="p-2 text-center bg-blue-50/20">
                              <select
                                value={rec.competencyRating || ''}
                                onChange={(e) =>
                                  handleUpdateGradeRecord(std.id, {
                                    competencyRating: e.target
                                      .value as GradeRecord['competencyRating'],
                                  })
                                }
                                className="w-full text-center py-1 px-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 cursor-pointer"
                              >
                                <option value="">غير مقوّم</option>
                                <option value="تمكن ممتاز">تمكن ممتاز (5.0)</option>
                                <option value="تمكن جيد">تمكن جيد (4.25)</option>
                                <option value="تمكن متوسط">تمكن متوسط (3.25)</option>
                                <option value="تمكن جزئي">تمكن جزئي (2.25)</option>
                              </select>
                              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                {rec.competencyScore ?? '—'} / {weights.competencyWeight}
                              </span>
                            </td>

                            {/* Suggested Grade (System Calculation) */}
                            <td className="p-3 text-center bg-indigo-50/40 border-x border-indigo-100 font-mono font-black text-indigo-900 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-600 fill-indigo-600" />
                                <span>{rec.suggestedMark ?? 'غير مقوّم'}</span>
                              </div>
                            </td>

                            {/* Final Mark Input (Teacher Direct Authority) */}
                            <td className="p-2 text-center bg-emerald-50/30">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.25"
                                value={rec.finalMark ?? ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    handleUpdateGradeRecord(std.id, {
                                      finalMark: Math.min(10, Math.max(0, val)),
                                    });
                                  }
                                }}
                                className={`w-16 text-center py-1 font-mono font-black text-xs rounded-xl border outline-none ${
                                  isModified
                                    ? 'bg-amber-100 border-amber-400 text-amber-950 font-extrabold ring-2 ring-amber-300'
                                    : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500'
                                }`}
                              />
                            </td>

                            {/* Reason for Modification */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={rec.adjustmentReason || ''}
                                placeholder={isModified ? 'سبب التعديل...' : 'اختياري...'}
                                onChange={(e) =>
                                  handleUpdateGradeRecord(std.id, {}, e.target.value)
                                }
                                className={`w-full px-2.5 py-1 text-xs rounded-xl border outline-none ${
                                  isModified && !rec.adjustmentReason
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500'
                                }`}
                              />
                            </td>

                            {/* Approval Toggle & Audit Log Button */}
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    handleUpdateGradeRecord(std.id, {
                                      isApprovedByTeacher: !rec.isApprovedByTeacher,
                                    })
                                  }
                                  className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    rec.isApprovedByTeacher
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {rec.isApprovedByTeacher ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>معتمدة</span>
                                    </>
                                  ) : (
                                    <span>اعتماد</span>
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedAuditStudentId(std.id);
                                    setShowAuditModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="عرض سجل تعديلات التلميذ"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
      </div>
      {/* ========================================================================= */}
      {/* MODAL: CONFIG EVALUATION WEIGHTS (إعدادات أوزان التقييم) */}
      {/* ========================================================================= */}
      {showWeightsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                <span>إعدادات وتخصيص أوزان التقييم (المجموع = 10)</span>
              </h3>
              <button
                onClick={() => setShowWeightsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              يمكن للأستاذ أو المؤسسة تعديل التوزيع الافتراضي لأوزان التقييم الأربعة لتلائم خصوصيات
              التدريس أو المنشور الخاص بالولاية.
            </p>

            <div className="space-y-4">
              {/* Competency Weight */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <label className="text-slate-800">1. تملك الكفاءة الختامية:</label>
                  <span className="text-blue-700 font-mono font-black">
                    {weights.competencyWeight} نقاط
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="0.5"
                  value={weights.competencyWeight}
                  onChange={(e) =>
                    setWeights((prev) => ({
                      ...prev,
                      competencyWeight: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Participation Weight */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <label className="text-slate-800">2. المشاركة الفعالة والأداء الحركي:</label>
                  <span className="text-blue-700 font-mono font-black">
                    {weights.participationWeight} نقاط
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={weights.participationWeight}
                  onChange={(e) =>
                    setWeights((prev) => ({
                      ...prev,
                      participationWeight: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Behavior Weight */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <label className="text-slate-800">3. السلوك والانضباط والروح الرياضية:</label>
                  <span className="text-blue-700 font-mono font-black">
                    {weights.behaviorWeight} نقاط
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={weights.behaviorWeight}
                  onChange={(e) =>
                    setWeights((prev) => ({ ...prev, behaviorWeight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Attendance Weight */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <label className="text-slate-800">4. المواظبة والحضور:</label>
                  <span className="text-blue-700 font-mono font-black">
                    {weights.attendanceWeight} نقاط
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={weights.attendanceWeight}
                  onChange={(e) =>
                    setWeights((prev) => ({
                      ...prev,
                      attendanceWeight: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Unexcused Absence Deduction */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <label className="text-slate-800">خصم الغياب غير المبرر (عن كل حصة):</label>
                  <span className="text-rose-600 font-mono font-black">
                    -{weights.unexcusedDeduction} نقطة
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  value={weights.unexcusedDeduction}
                  onChange={(e) =>
                    setWeights((prev) => ({
                      ...prev,
                      unexcusedDeduction: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              {/* Total Check Indicator */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">المجموع النهائي للأوزان:</span>
                <span className="font-mono font-black text-sm text-blue-900">
                  {(
                    weights.competencyWeight +
                    weights.participationWeight +
                    weights.behaviorWeight +
                    weights.attendanceWeight
                  ).toFixed(1)}{' '}
                  / 10 نقاط
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setWeights({
                    competencyWeight: 5.0,
                    participationWeight: 2.0,
                    behaviorWeight: 2.0,
                    attendanceWeight: 1.0,
                    unexcusedDeduction: 0.25,
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
              >
                استرجاع الأوزان الافتراضية
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWeightsModal(false);
                  handleRecalculateAllGrades();
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
              >
                حفظ وإعادة حساب العلامات المقترحة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDIT TRAIL REVISION HISTORY (سجل التعديلات والشفافية) */}
      {/* ========================================================================= */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <span>سجل التعديلات المباشرة والشفافية (Audit Log)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  توثيق كامل لكافة التغييرات التي أجراها الأستاذ على العلامات المقترحة مع الأسباب
                  والتاريخ
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedAuditStudentId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter student */}
            {selectedAuditStudentId && (
              <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-900 rounded-2xl border border-blue-200 text-xs font-bold">
                <span>
                  تصفية السجل للتلميذ:{' '}
                  {students.find((s) => s.id === selectedAuditStudentId)?.firstName}{' '}
                  {students.find((s) => s.id === selectedAuditStudentId)?.lastName}
                </span>
                <button
                  onClick={() => setSelectedAuditStudentId(null)}
                  className="text-blue-700 hover:underline cursor-pointer"
                >
                  عرض جميع تعديلات القسم
                </button>
              </div>
            )}

            {/* Audit Log Table */}
            <div className="space-y-3">
              {auditLogs.filter(
                (a) =>
                  a.classId === activeClass.id &&
                  (!selectedAuditStudentId || a.studentId === selectedAuditStudentId)
              ).length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl">
                  لا توجد سجلات تعديلات مسجلة لهذا القسم حتى الآن. العلامات الحالية مطابقة لاقتراح
                  النظام آلياً.
                </div>
              ) : (
                auditLogs
                  .filter(
                    (a) =>
                      a.classId === activeClass.id &&
                      (!selectedAuditStudentId || a.studentId === selectedAuditStudentId)
                  )
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {log.studentName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {log.changeDate}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-slate-100 font-mono text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block">المقترحة</span>
                          <span className="font-black text-indigo-700">
                            {log.suggestedMark} / 10
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">السابقة</span>
                          <span className="font-bold text-slate-600">
                            {log.previousFinalMark ?? '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">النهائية المعدلة</span>
                          <span className="font-black text-emerald-700">
                            {log.newFinalMark} / 10
                          </span>
                        </div>
                      </div>

                      {log.reason && (
                        <div className="text-slate-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                          <strong className="text-amber-900 font-bold block mb-0.5">
                            سبب التعديل:
                          </strong>
                          <span>{log.reason}</span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 flex justify-between items-center pt-1">
                        <span>
                          الأستاذ المعدّل:{' '}
                          <strong className="text-slate-800">{log.changedByTeacherName}</strong>
                        </span>
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                          {log.term}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAuditModal(false);
                  setSelectedAuditStudentId(null);
                }}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
              >
                إغلاق السجل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
