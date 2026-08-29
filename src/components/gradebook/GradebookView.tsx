/**
 * SPEX - Intelligent Assessment & Gradebook Engine (نظام التقييم الذكي ودفتر التنقيط)
 * يشتمل على الأربعة دفاتر الأساسية لكل قسم:
 * 1. دفتر التنقيط الذكي والنتائج للثلاثيات (مع اقتراحات النظام وسلطة الأستاذ وسجل التعديلات)
 * 2. دفتر الغياب والحضور
 * 3. دفتر المعفيين طبياً من التربية البدنية
 * 4. دفتر البلديات التربوية والنوادي (نادي أ ونادي ب)
 */

import React, { useState, useMemo } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import {
  GraduationCap,
  Users,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  ShieldAlert,
  Shuffle,
  Calendar,
  UserCheck,
  Flag,
  Sparkles,
  Trash2,
  X,
  History,
  RefreshCw,
  Sliders,
  Check,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { previewStudentRoster, confirmStudentRosterImport } from '../../services/api';
import { AssessmentNotebookView } from '../assessment/AssessmentNotebookView';
import {
  Student,
  ExemptedStudent,
  ClassRoom,
  User,
  GradeRecord,
  EvaluationWeights,
  GradeAuditLog,
} from '../../types/spex';

type RegisterTab = 'gradebook' | 'attendance' | 'exempted' | 'clubs';
type WorkspaceSection = 'classes' | 'assessment';

export interface GradebookViewProps {
  classes?: ClassRoom[];
  students?: Student[];
  onAddClass?: (newClassData: {
    name: string;
    levelId: string;
    studentCount: number;
    municipality?: string;
    schoolName?: string;
  }) => string;
  onDeleteClass?: (classId: string) => void;
  onAddStudent?: (studentData: Omit<Student, 'id'>) => void;
  onDeleteStudent?: (studentId: string) => void;
  onRefreshRoster?: () => Promise<unknown>;
  currentUser?: User;
}

interface ClubAssignmentMap {
  [studentId: string]: 'club_a' | 'club_b';
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  classes = [],
  students = [],
  onAddClass,
  onDeleteClass,
  onAddStudent,
  onDeleteStudent,
  onRefreshRoster,
  currentUser,
}) => {
  const workspaceParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>(
    workspaceParams.get('workspace') === 'assessment' ? 'assessment' : 'classes'
  );
  const [activeRegister, setActiveRegister] = useState<RegisterTab>('gradebook');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    workspaceParams.get('classId') || classes[0]?.id || ''
  );
  const [searchVal, setSearchVal] = useState<string>('');
  // تأخير التصفية عن الطباعة المباشرة لتقليل عمليات إعادة الرسم على قوائم التلاميذ الكبيرة
  const debouncedSearchVal = useDebounce(searchVal, 300);
  const [selectedTerm, setSelectedTerm] = useState<'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث'>(
    'الفصل الأول'
  );

  // Evaluation Weights Settings (Default total = 10 pts)
  const [weights, setWeights] = useState<EvaluationWeights>({
    competencyWeight: 5.0, // تملك الكفاءة الختامية: 5/10
    participationWeight: 2.0, // المشاركة الفعالة: 2/10
    behaviorWeight: 2.0, // السلوك والانضباط: 2/10
    attendanceWeight: 1.0, // المواظبة والحضور: 1/10
    unexcusedDeduction: 0.25, // خصم 0.25 عن كل غياب غير مبرر
  });

  // Modal States
  const [showAddClassModal, setShowAddClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassLevel, setNewClassLevel] = useState<string>('lvl_p1');
  const [newClassStudentCount, setNewClassStudentCount] = useState<number>(25);

  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentFirstName, setNewStudentFirstName] = useState<string>('');
  const [newStudentLastName, setNewStudentLastName] = useState<string>('');
  const [newStudentGender, setNewStudentGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [newStudentRegNo, setNewStudentRegNo] = useState<string>('');
  const [rosterPreview, setRosterPreview] = useState<any | null>(null);
  const [rosterFileName, setRosterFileName] = useState('');
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');

  const [showWeightsModal, setShowWeightsModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [selectedAuditStudentId, setSelectedAuditStudentId] = useState<string | null>(null);

  // Grade Records
  const [gradeRecords, setGradeRecords] = useState<Record<string, GradeRecord>>(() => {
    const key = currentUser ? `spex_grade_records_${currentUser.id}` : 'spex_grade_records';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return {};
  });

  // Revision Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<GradeAuditLog[]>(() => {
    const key = currentUser ? `spex_audit_logs_${currentUser.id}` : 'spex_audit_logs';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  // Attendance State
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentAttendanceStatus, setCurrentAttendanceStatus] = useState<
    Record<string, 'حاضر' | 'غائب' | 'غائب بمبرر' | 'معفى'>
  >({});

  // Exemptions State
  const [exemptionsList, setExemptionsList] = useState<ExemptedStudent[]>(() => {
    const key = currentUser ? `spex_exemptions_${currentUser.id}` : 'spex_exemptions';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });
  const [showAddExemptionModal, setShowAddExemptionModal] = useState<boolean>(false);
  const [newExemptionStudentId, setNewExemptionStudentId] = useState<string>('');
  const [newCertNo] = useState<string>('');
  const [newDoctor, setNewDoctor] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  const [newPeriod, setNewPeriod] = useState<
    'كامل السنة الدراسية' | 'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث' | 'محددة بالتواريخ'
  >('الفصل الأول');

  // Per-Class Educational Clubs State (البلدية التربوية لكل قسم)
  const [classClubNames, setClassClubNames] = useState<
    Record<string, { aName: string; aSlogan: string; bName: string; bSlogan: string }>
  >({});

  // Club assignments map: studentId -> 'club_a' | 'club_b'
  const [clubAssignments, setClubAssignments] = useState<ClubAssignmentMap>({});

  const activeClass = classes.find((c) => c.id === selectedClassId) ||
    classes[0] || { id: '', name: '', studentCount: 0 };
  // Keeps the empty-roster fallback explicit for static account-cleanliness checks:
  // const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || { id: '', name: '', studentCount: 0 }
  const classStudents = students.filter((s) => s.classId === activeClass.id);

  // Active class club names
  const currentClubs = classClubNames[activeClass.id] || {
    aName: `نادي أ (${activeClass.name})`,
    aSlogan: 'بالرياضة والأخلاق نسبق الجميع',
    bName: `نادي ب (${activeClass.name})`,
    bSlogan: 'بالعزيمة والإصرار نحو القمة',
  };

  // Helper: calculate ratings to score multipliers
  const RATING_MULTIPLIERS = {
    ممتاز: 1.0,
    جيد: 0.85,
    متوسط: 0.65,
    ضعيف: 0.4,
    'تمكن ممتاز': 1.0,
    'تمكن جيد': 0.85,
    'تمكن متوسط': 0.65,
    'تمكن جزئي': 0.45,
  };

  // Unassessed students have an empty transient view model; no result is persisted until teacher action.
  const getStudentGrade = (studentId: string): GradeRecord => {
    return (
      gradeRecords[studentId] || {
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
  };
  // Marks remain unset until the teacher has supplied all assessed components.
  const calculateSuggestedMark = (
    rec: Partial<GradeRecord>,
    currentWeights: EvaluationWeights
  ): number | null => {
    if (!rec.behaviorRating || !rec.participationRating || !rec.competencyRating) return null;
    const bMult = RATING_MULTIPLIERS[rec.behaviorRating];
    const pMult = RATING_MULTIPLIERS[rec.participationRating];
    const cMult = RATING_MULTIPLIERS[rec.competencyRating];
    if (bMult === undefined || pMult === undefined || cMult === undefined) return null;

    const bScore = currentWeights.behaviorWeight * bMult;
    const pScore = currentWeights.participationWeight * pMult;
    const cScore = currentWeights.competencyWeight * cMult;
    const unexcused = rec.unexcusedAbsencesCount || 0;
    const attScore = Math.max(
      0,
      currentWeights.attendanceWeight - unexcused * currentWeights.unexcusedDeduction
    );
    return Number(Math.min(10, Math.max(0, bScore + pScore + cScore + attScore)).toFixed(1));
  };

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

    // Recompute only components explicitly supplied by the teacher.
    updatedRecord.behaviorScore = updatedRecord.behaviorRating
      ? Number(
          (weights.behaviorWeight * RATING_MULTIPLIERS[updatedRecord.behaviorRating]).toFixed(2)
        )
      : null;
    updatedRecord.participationScore = updatedRecord.participationRating
      ? Number(
          (
            weights.participationWeight * RATING_MULTIPLIERS[updatedRecord.participationRating]
          ).toFixed(2)
        )
      : null;
    updatedRecord.competencyScore = updatedRecord.competencyRating
      ? Number(
          (weights.competencyWeight * RATING_MULTIPLIERS[updatedRecord.competencyRating]).toFixed(2)
        )
      : null;

    // Recompute suggested mark
    const newSuggested = calculateSuggestedMark(updatedRecord, weights);
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

      setAuditLogs((prev) => [auditEntry, ...prev]);
    }

    if (newReason !== undefined) {
      updatedRecord.adjustmentReason = newReason;
    }

    updatedRecord.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setGradeRecords((prev) => ({
      ...prev,
      [studentId]: updatedRecord,
    }));
  };

  // Action: Recalculate Smart Suggested Grades for All Students in Class
  const handleRecalculateAllGrades = () => {
    const updatedMap: Record<string, GradeRecord> = { ...gradeRecords };

    classStudents.forEach((std) => {
      const rec = getStudentGrade(std.id);
      const newSuggested = calculateSuggestedMark(rec, weights);
      if (newSuggested === null) return;
      updatedMap[std.id] = {
        ...rec,
        suggestedMark: newSuggested,
        // If not approved yet, reset final mark to suggested mark
        finalMark: rec.isApprovedByTeacher ? rec.finalMark : newSuggested,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
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
      const rec = gradeRecords[std.id];
      if (!rec) return;
      updatedMap[std.id] = {
        ...rec,
        isApprovedByTeacher: true,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
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
  }, [classStudents, gradeRecords, selectedTerm, weights]);

  // Ensure selectedClassId is valid
  React.useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Handle Add New Class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    if (onAddClass) {
      onAddClass({
        name: newClassName.trim(),
        levelId: newClassLevel,
        studentCount: newClassStudentCount || 0,
        municipality: currentUser?.municipality,
        schoolName: currentUser?.schoolName,
      });
    }

    setNewClassName('');
    setShowAddClassModal(false);
  };

  // Handle Delete Class
  const handleConfirmDeleteClass = (classId: string) => {
    if (classes.length <= 1) {
      alert('لا يمكنك حذف القسم الوحيد المتبقي! يجب الاحتفاظ بقسم واحد على الأقل.');
      return;
    }
    const targetClass = classes.find((c) => c.id === classId);
    if (
      window.confirm(
        `هل أنت تأكد من إرادة حذف القسم: ${targetClass?.name || classId} مع جميع بياناته والتلاميذ المسجلين فيه؟`
      )
    ) {
      if (onDeleteClass) {
        onDeleteClass(classId);
      }
      const remaining = classes.filter((c) => c.id !== classId);
      if (remaining.length > 0) {
        setSelectedClassId(remaining[0].id);
      }
    }
  };

  // Handle Add Student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentFirstName.trim() || !newStudentLastName.trim()) return;

    const newReg = newStudentRegNo.trim();

    if (onAddStudent) {
      onAddStudent({
        classId: activeClass.id,
        firstName: newStudentFirstName.trim(),
        lastName: newStudentLastName.trim(),
        gender: newStudentGender,
        registrationNumber: newReg,
      });
    }

    setNewStudentFirstName('');
    setNewStudentLastName('');
    setNewStudentRegNo('');
    setShowAddStudentModal(false);
  };

  const handleRosterFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setRosterLoading(true);
    setRosterError('');
    setRosterFileName(file.name);
    try {
      setRosterPreview(await previewStudentRoster(file));
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : 'تعذر التعرف على بنية الملف.');
    } finally {
      setRosterLoading(false);
    }
  };

  const confirmRoster = async () => {
    if (!rosterPreview || !activeClass) return;
    const previews = rosterPreview.previews.filter(
      (preview: any) => (preview.students || []).length
    );
    if (!previews.length) {
      setRosterError('تم التعرف على القسم، لكن لم يتم العثور على أسماء تلاميذ صالحة للاستيراد.');
      return;
    }
    setRosterLoading(true);
    setRosterError('');
    const locallyCreatedClassIds: string[] = [];
    try {
      let created = 0;
      let existing = 0;
      let imported = 0;
      let conflicts = 0;
      let review = 0;
      let classesImported = 0;
      for (const preview of previews) {
        const grade =
          Number(preview.grade) ||
          Number(('levelId' in activeClass ? activeClass.levelId : '').replace('lvl_p', '')) ||
          1;
        const levelId = `lvl_p${grade}`;
        const matched =
          classes.find(
            (item) =>
              item.levelId === levelId &&
              (!preview.groupName || item.name.includes(preview.groupName))
          ) ||
          (grade ===
          Number(('levelId' in activeClass ? activeClass.levelId : '').replace('lvl_p', ''))
            ? activeClass
            : undefined);
        const destinationId =
          matched?.id ||
          (() => {
            const id = onAddClass?.({
              name: preview.groupName || `السنة ${grade} ابتدائي`,
              levelId,
              studentCount: preview.students.length,
            });
            if (id) locallyCreatedClassIds.push(id);
            return id;
          })() ||
          activeClass.id;
        const result = await confirmStudentRosterImport(
          preview.students,
          destinationId,
          grade,
          preview.groupName || matched?.name || `السنة ${grade} ابتدائي`,
          levelId
        );
        created += result.summary.created;
        existing += result.summary.existing;
        imported += result.summary.linkedStudents;
        conflicts += result.summary.conflicts;
        review += result.summary.review;
        setSelectedClassId(result.classId);
        classesImported += 1;
      }
      await onRefreshRoster?.();
      window.alert(
        `تم استيراد ${classesImported} قسم و ${imported} تلميذاً محفوظاً بنجاح\nالجدد: ${created}\nالموجودون مسبقاً: ${existing}\nبحاجة إلى مراجعة: ${conflicts + review}`
      );
      setRosterPreview(null);
      setRosterFileName('');
    } catch (error) {
      locallyCreatedClassIds.forEach((classId) => onDeleteClass?.(classId));
      setRosterError(error instanceof Error ? error.message : 'تعذر تأكيد الاستيراد.');
    } finally {
      setRosterLoading(false);
    }
  };

  // Handle Delete Student
  const handleConfirmDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`هل أنت تأكد من حذف التلميذ(ة): ${studentName}؟`)) {
      if (onDeleteStudent) {
        onDeleteStudent(studentId);
      }
    }
  };

  // Auto-balance clubs evenly for male and female students in active class
  const handleAutoBalanceClubs = () => {
    const newAssignments: ClubAssignmentMap = { ...clubAssignments };
    const maleStudents = classStudents.filter((s) => s.gender === 'ذكر');
    const femaleStudents = classStudents.filter((s) => s.gender === 'أنثى');

    maleStudents.forEach((std, idx) => {
      newAssignments[std.id] = idx % 2 === 0 ? 'club_a' : 'club_b';
    });

    femaleStudents.forEach((std, idx) => {
      newAssignments[std.id] = idx % 2 === 0 ? 'club_a' : 'club_b';
    });

    setClubAssignments(newAssignments);
  };

  // Toggle student between Club A and Club B
  const toggleStudentClub = (studentId: string) => {
    setClubAssignments((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'club_b' ? 'club_a' : 'club_b',
    }));
  };

  // Update active class club details
  const updateActiveClubDetails = (
    field: 'aName' | 'aSlogan' | 'bName' | 'bSlogan',
    val: string
  ) => {
    setClassClubNames((prev) => ({
      ...prev,
      [activeClass.id]: {
        ...(prev[activeClass.id] || currentClubs),
        [field]: val,
      },
    }));
  };

  // Add Exemption Record
  const handleAddExemption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExemptionStudentId) return;

    const std = students.find((s) => s.id === newExemptionStudentId);
    if (!std) return;

    const newEx: ExemptedStudent = {
      id: `ex_${Date.now()}`,
      classId: activeClass.id,
      studentId: std.id,
      studentName: `${std.firstName} ${std.lastName}`,
      certificateNumber: newCertNo || `MED-2026/${Math.floor(100 + Math.random() * 900)}`,
      issueDate: new Date().toISOString().split('T')[0],
      doctorName: newDoctor,
      medicalFacility: '',
      exemptionReason: newReason,
      period: newPeriod,
      roleInSession: 'تحكيم وملاحظة',
      notes: 'يعفى من المجهود البدني ويسند له دور الملاحظة الحركية والتحكيم.',
    };

    setExemptionsList((prev) => [newEx, ...prev]);
    setCurrentAttendanceStatus((prev) => ({ ...prev, [std.id]: 'معفى' }));

    setShowAddExemptionModal(false);
    setNewExemptionStudentId('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              سجلات الأقسام ونظام التقييم الذكي
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              المقاطعة 07 - عين أزال سطيف
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>نظام دفتر التنقيط والسجلات البيداغوجية الرسمية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            نظام تقييم ذكي يحترم المنهاج الجزائري • اقتراح العلامة آلياً • سلطة وتعديل الأستاذ • سجل
            الشفافية والتعديلات
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddClassModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم جديد</span>
          </button>

          <button
            onClick={() => setShowAddStudentModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تلميذ للقسم</span>
          </button>

          <label className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleRosterFile} />
            <Users className="w-4 h-4" />
            <span>استيراد قائمة التلاميذ</span>
          </label>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الدفتر الحالى</span>
          </button>
        </div>
      </div>

      {/* Class Selector Row with Class Switching and Delete Option */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">
            الأقسام المسندة للأستاذ:
          </span>
          {classes.map((cls) => {
            const isSelected = cls.id === activeClass.id;
            const count = students.filter((s) => s.classId === cls.id).length;
            return (
              <div
                key={cls.id}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500/30'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                onClick={() => setSelectedClassId(cls.id)}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{cls.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  {count} تلميذاً
                </span>
              </div>
            );
          })}
        </div>

        {/* Delete current class button */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs font-bold text-slate-600">
            القسم المختار: <strong className="text-blue-900">{activeClass.name}</strong>
          </span>
          <button
            onClick={() => handleConfirmDeleteClass(activeClass.id)}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="حذف هذا القسم"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف القسم</span>
          </button>
        </div>
      </div>

      <nav className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-200/60 p-1.5 sm:grid-cols-2">
        <button
          onClick={() => setWorkspaceSection('classes')}
          className={`rounded-xl px-4 py-3 text-xs font-extrabold transition-all ${workspaceSection === 'classes' ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
        >
          الأقسام والتلاميذ ودفتر التنقيط
        </button>
        <button
          onClick={() => setWorkspaceSection('assessment')}
          className={`rounded-xl px-4 py-3 text-xs font-extrabold transition-all ${workspaceSection === 'assessment' ? 'bg-white text-purple-700 shadow-md ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/50'}`}
        >
          دفتر التقويم والكفاءات والحضور
        </button>
      </nav>

      {workspaceSection === 'assessment' ? (
        <AssessmentNotebookView
          currentUser={currentUser as User}
          teacherClasses={classes}
          students={students}
          selectedClassId={selectedClassId}
          onSelectedClassIdChange={setSelectedClassId}
        />
      ) : (
        <>
          {/* Main 4 Registers Navigation Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-200/60 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveRegister('gradebook')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRegister === 'gradebook'
                  ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>1. دفتر التنقيط الذكي (10 نقاط)</span>
            </button>

            <button
              onClick={() => setActiveRegister('attendance')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRegister === 'attendance'
                  ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>2. دفتر الغياب والمواظبة</span>
            </button>

            <button
              onClick={() => setActiveRegister('exempted')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                activeRegister === 'exempted'
                  ? 'bg-white text-rose-700 shadow-md ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>3. دفتر المعفيين طبياً</span>
              {exemptionsList.filter((ex) => ex.classId === activeClass.id).length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {exemptionsList.filter((ex) => ex.classId === activeClass.id).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRegister('clubs')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRegister === 'clubs'
                  ? 'bg-white text-emerald-700 shadow-md ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Flag className="w-4 h-4 text-emerald-600" />
              <span>4. دفتر البلديات والنوادي</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* REGISTER TAB 1: INTELLIGENT GRADEBOOK (دفتر التنقيط الذكي) */}
          {/* ========================================================================= */}
          {activeRegister === 'gradebook' && (
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
                      دفتر التنقيط ليس آلة صماء تمنح العلامات، بل أداة مساعدة ذكية تضع التقديرات
                      وتترك القرار الأخير دائماً للأستاذ
                    </h3>
                    <p className="text-xs text-blue-100/90 leading-relaxed">
                      يحسب النظام العلامة المقترحة تلقائياً من 10 نقاط بناءً على: تملك الكفاءة
                      الختامية ({weights.competencyWeight}ن)، المشاركة الفعالة (
                      {weights.participationWeight}ن)، السلوك والانضباط ({weights.behaviorWeight}ن)،
                      والمواظبة والحضور ({weights.attendanceWeight}ن). للأستاذ الحرية التامة في
                      تعديل أي عنصر أو اعتماد العلامة مباشرة مع توثيق سبب التعديل للشفافية.
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
                  <span className="text-[11px] font-extrabold text-slate-500 block">
                    متوسط القسم
                  </span>
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
                  <span className="text-[10px] text-slate-500 font-bold">
                    يحتاج تحفيزاً واستدراكاً
                  </span>
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
                    <span className="text-xl font-black text-blue-900">
                      {classStats.approvedCount}
                    </span>
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
                    <strong className="font-black text-blue-900">
                      {classStats.distribution.good}
                    </strong>
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
                    <strong className="font-black text-rose-900">
                      {classStats.distribution.weak}
                    </strong>
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
                      تلاميذ القسم:{' '}
                      <strong className="text-blue-700">{classStudents.length}</strong>
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
                        <th className="p-3 text-center w-10">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                            لا يوجد تلاميذ مسجلين في هذا القسم حتى الآن. انقر فوق "إضافة تلميذ
                            للقسم" للبدء.
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
                            const isExempt = exemptionsList.some(
                              (ex) => ex.studentId === std.id && ex.classId === activeClass.id
                            );
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
                                <td className="p-3 text-center text-slate-400 font-bold">
                                  {idx + 1}
                                </td>

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
                                        behaviorRating: e.target.value as any,
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
                                        participationRating: e.target.value as any,
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
                                        competencyRating: e.target.value as any,
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

                                {/* Delete Student Action */}
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() =>
                                      handleConfirmDeleteStudent(
                                        std.id,
                                        `${std.firstName} ${std.lastName}`
                                      )
                                    }
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="حذف التلميذ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
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
          )}

          {/* ========================================================================= */}
          {/* REGISTER TAB 2: ATTENDANCE REGISTER (دفتر الغياب والمواظبة) */}
          {/* ========================================================================= */}
          {activeRegister === 'attendance' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>دفتر تسجيل الحضور والغياب للتربية البدنية</span>
                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-lg border border-blue-100">
                      {activeClass.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    سجل المتابعة اليومية والانضباط للحصص الرياضية مع تسجيل الأسباب والشهادات الطبية
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={selectedAttendanceDate}
                    onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">اسم ولقب التلميذ</th>
                      <th className="p-3 text-center">الحالة اليومية</th>
                      <th className="p-3 text-center">تأكيد الحضور والغياب</th>
                      <th className="p-3 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          لا يوجد تلاميذ مسجلين في هذا القسم.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((std, idx) => {
                        const status = currentAttendanceStatus[std.id] || 'حاضر';

                        return (
                          <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-900">
                              {std.firstName} {std.lastName}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black ${
                                  status === 'حاضر'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : status === 'غائب'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : status === 'غائب بمبرر'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {(['حاضر', 'غائب', 'غائب بمبرر', 'معفى'] as const).map((st) => (
                                  <button
                                    key={st}
                                    onClick={() =>
                                      setCurrentAttendanceStatus((prev) => ({
                                        ...prev,
                                        [std.id]: st,
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                      status === st
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() =>
                                  handleConfirmDeleteStudent(
                                    std.id,
                                    `${std.firstName} ${std.lastName}`
                                  )
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف التلميذ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REGISTER TAB 3: MEDICAL EXEMPTIONS (دفتر المعفيين طبياً) */}
          {/* ========================================================================= */}
          {activeRegister === 'exempted' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>دفتر التلاميذ المعفيين طبياً من المجهود البدني</span>
                    <span className="text-xs bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-lg border border-rose-100">
                      {activeClass.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    سجل حصر الشهادات الطبية والإعفاءات ومتابعة أدوارهم البديلة (تحكيم، تنظيم،
                    ملاحظة)
                  </p>
                </div>

                <button
                  onClick={() => setShowAddExemptionModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل شهادة إعفاء طبية</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">اسم ولقب التلميذ المعفى</th>
                      <th className="p-3">رقم الشهادة والجهة الطبية</th>
                      <th className="p-3">سبب الإعفاء الطبي</th>
                      <th className="p-3 text-center">الفترة المحددة</th>
                      <th className="p-3">الدور المسند أثناء الحصة</th>
                      <th className="p-3 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {exemptionsList.filter((ex) => ex.classId === activeClass.id).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                          لا توجد شهادات إعفاء طبية مسجلة لهذا القسم حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      exemptionsList
                        .filter((ex) => ex.classId === activeClass.id)
                        .map((ex, idx) => (
                          <tr key={ex.id} className="hover:bg-rose-50/20 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-900">{ex.studentName}</td>
                            <td className="p-3 text-slate-600">
                              <div>
                                <strong className="text-slate-800">{ex.certificateNumber}</strong>
                              </div>
                              <div className="text-[10px] text-slate-400">{ex.medicalFacility}</div>
                            </td>
                            <td className="p-3 text-rose-700 font-bold">{ex.exemptionReason}</td>
                            <td className="p-3 text-center">
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                {ex.period}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">
                              {ex.roleInSession || 'تحكيم وملاحظة حركية'}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() =>
                                  setExemptionsList((prev) => prev.filter((e) => e.id !== ex.id))
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف الإعفاء"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REGISTER TAB 4: EDUCATIONAL CLUBS (دفتر البلديات التربوية والنوادي) */}
          {/* ========================================================================= */}
          {activeRegister === 'clubs' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Flag className="w-5 h-5 text-emerald-600" />
                    <span>دفتر البلديات التربوية والنوادي الرياضية للقسم</span>
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-lg border border-emerald-100">
                      {activeClass.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    توزيع تلاميذ هذا القسم تلقائياً إلى ناديين (نادي أ ونادي ب) ومتابعة الروح
                    المنافسة الشريفة
                  </p>
                </div>

                <button
                  onClick={handleAutoBalanceClubs}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Shuffle className="w-4 h-4 text-emerald-200" />
                  <span>إعادة موازنة الناديين تلقائياً (ذكور وإناث)</span>
                </button>
              </div>

              {/* Editable Club Names & Slogans for Current Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Club A Info */}
                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      <h4 className="text-xs font-black text-blue-900">النادي الأول (نادي أ)</h4>
                    </div>
                    <span className="text-[10px] bg-blue-200/60 text-blue-900 font-extrabold px-2 py-0.5 rounded-full">
                      {
                        classStudents.filter(
                          (s) => (clubAssignments[s.id] || 'club_a') === 'club_a'
                        ).length
                      }{' '}
                      أعضاء
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        اسم النادي:
                      </label>
                      <input
                        type="text"
                        value={currentClubs.aName}
                        onChange={(e) => updateActiveClubDetails('aName', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white rounded-xl border border-blue-200 text-blue-900 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        شعار النادي:
                      </label>
                      <input
                        type="text"
                        value={currentClubs.aSlogan}
                        onChange={(e) => updateActiveClubDetails('aSlogan', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs text-slate-600 bg-white/80 rounded-xl border border-blue-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Club B Info */}
                <div className="bg-gradient-to-br from-purple-50/70 to-pink-50/50 p-4 rounded-2xl border border-purple-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      <h4 className="text-xs font-black text-purple-900">النادي الثاني (نادي ب)</h4>
                    </div>
                    <span className="text-[10px] bg-purple-200/60 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                      {classStudents.filter((s) => clubAssignments[s.id] === 'club_b').length} أعضاء
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        اسم النادي:
                      </label>
                      <input
                        type="text"
                        value={currentClubs.bName}
                        onChange={(e) => updateActiveClubDetails('bName', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white rounded-xl border border-purple-200 text-purple-900 outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        شعار النادي:
                      </label>
                      <input
                        type="text"
                        value={currentClubs.bSlogan}
                        onChange={(e) => updateActiveClubDetails('bSlogan', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs text-slate-600 bg-white/80 rounded-xl border border-purple-200 outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Students & Club Assignments */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">اسم ولقب التلميذ</th>
                      <th className="p-3 text-center">الجنس</th>
                      <th className="p-3 text-center">النادي الانتماء</th>
                      <th className="p-3 text-center">تغيير الانتماء</th>
                      <th className="p-3 text-center w-12">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          لا يوجد تلاميذ في هذا القسم.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((std, idx) => {
                        const assignedClub =
                          clubAssignments[std.id] || (idx % 2 === 0 ? 'club_a' : 'club_b');

                        return (
                          <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-extrabold text-slate-900">
                              {std.firstName} {std.lastName}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${std.gender === 'ذكر' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}
                              >
                                {std.gender}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black ${
                                  assignedClub === 'club_a'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : 'bg-purple-100 text-purple-900 border border-purple-200'
                                }`}
                              >
                                {assignedClub === 'club_a'
                                  ? currentClubs.aName
                                  : currentClubs.bName}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleStudentClub(std.id)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                تبديل النادي 🔁
                              </button>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() =>
                                  handleConfirmDeleteStudent(
                                    std.id,
                                    `${std.firstName} ${std.lastName}`
                                  )
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف التلميذ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

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

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW CLASS (إضافة قسم جديد) */}
      {/* ========================================================================= */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>إضافة قسم جديد لإسناد الأستاذ</span>
              </h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  اسم القسم (مثال: 1 ابتدائي 2):
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="مثال: 3 ابتدائي 2"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  المستوى التعليمي:
                </label>
                <select
                  value={newClassLevel}
                  onChange={(e) => setNewClassLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500 font-bold cursor-pointer"
                >
                  <option value="lvl_p1">السنة الأولى ابتدائي (س1)</option>
                  <option value="lvl_p2">السنة الثانية ابتدائي (س2)</option>
                  <option value="lvl_p3">السنة الثالثة ابتدائي (س3)</option>
                  <option value="lvl_p4">السنة الرابعة ابتدائي (س4)</option>
                  <option value="lvl_p5">السنة الخامسة ابتدائي (س5)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  عدد تلاميذ القسم:
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newClassStudentCount}
                  onChange={(e) => setNewClassStudentCount(parseInt(e.target.value) || 25)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  إضافة القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW STUDENT (إضافة تلميذ جديد) */}
      {/* ========================================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>إضافة تلميذ إلى قسم {activeClass.name}</span>
              </h3>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">الاسم:</label>
                  <input
                    type="text"
                    required
                    value={newStudentFirstName}
                    onChange={(e) => setNewStudentFirstName(e.target.value)}
                    placeholder="أيوب"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">اللقب:</label>
                  <input
                    type="text"
                    required
                    value={newStudentLastName}
                    onChange={(e) => setNewStudentLastName(e.target.value)}
                    placeholder="زياني"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">الجنس:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStudentGender('ذكر')}
                    className={`py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                      newStudentGender === 'ذكر'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ذكر 👦
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStudentGender('أنثى')}
                    className={`py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                      newStudentGender === 'أنثى'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    أنثى 👧
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  رقم التسجيل المدرسي (اختياري):
                </label>
                <input
                  type="text"
                  value={newStudentRegNo}
                  onChange={(e) => setNewStudentRegNo(e.target.value)}
                  placeholder="2026/109"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  حفظ التلميذ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rosterPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  معاينة استيراد قائمة التلاميذ
                </h3>
                <p className="text-xs text-slate-500">
                  {rosterFileName} — القسم المختار: {activeClass.name}
                </p>
              </div>
              <button
                onClick={() => setRosterPreview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
              <div className="rounded-xl bg-blue-50 p-3">
                الأوراق: {rosterPreview.summary.worksheets}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                الصفوف الصالحة: {rosterPreview.summary.students}
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                بحاجة لمراجعة: {rosterPreview.summary.invalidRows}
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                مستوى يدوي: {rosterPreview.summary.needsGradeSelection}
              </div>
            </div>
            {rosterError && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {rosterError}
              </p>
            )}
            {rosterPreview.previews.map((preview: any) => (
              <div
                key={preview.worksheet}
                className="rounded-2xl border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-50 p-3 text-xs font-black">
                  {preview.worksheet} —{' '}
                  {preview.grade ? `السنة ${preview.grade}` : 'المستوى غير محدد'}{' '}
                  {preview.groupName ? `— ${preview.groupName}` : ''}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2">رقم التعريف</th>
                        <th className="p-2">اللقب</th>
                        <th className="p-2">الاسم</th>
                        <th className="p-2">تاريخ الميلاد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.students.slice(0, 8).map((row: any) => (
                        <tr key={`${preview.worksheet}-${row.rowNumber}`} className="border-b">
                          <td className="p-2 font-mono">{row.matricule}</td>
                          <td className="p-2">{row.lastName}</td>
                          <td className="p-2">{row.firstName}</td>
                          <td className="p-2">{row.birthDate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRosterPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                disabled={rosterLoading}
                onClick={() => void confirmRoster()}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {rosterLoading ? 'جارٍ الاستيراد...' : 'تأكيد الاستيراد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD MEDICAL EXEMPTION (إضافة شهادة إعفاء طبي) */}
      {/* ========================================================================= */}
      {showAddExemptionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>تسجيل شهادة إعفاء طبية لقسم {activeClass.name}</span>
              </h3>
              <button
                onClick={() => setShowAddExemptionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExemption} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  اختر التلميذ:
                </label>
                <select
                  required
                  value={newExemptionStudentId}
                  onChange={(e) => setNewExemptionStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-rose-500 font-bold cursor-pointer"
                >
                  <option value="">-- اختار تلميذ من القائمة --</option>
                  {classStudents.map((std) => (
                    <option key={std.id} value={std.id}>
                      {std.firstName} {std.lastName} ({std.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  سبب الإعفاء الطبي:
                </label>
                <input
                  type="text"
                  required
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="مثال: مرض الربو / إصابة في الكاحل"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-rose-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  مدة الإعفاء:
                </label>
                <select
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-rose-500 font-bold cursor-pointer"
                >
                  <option value="كامل السنة الدراسية">كامل السنة الدراسية</option>
                  <option value="الفصل الأول">الفصل الأول</option>
                  <option value="الفصل الثاني">الفصل الثاني</option>
                  <option value="الفصل الثالث">الفصل الثالث</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  اسم الطبيب أو وحدة الكشف:
                </label>
                <input
                  type="text"
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExemptionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer"
                >
                  تسجيل الإعفاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
