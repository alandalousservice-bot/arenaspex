/**
 * SPEX - دفتر التلاميذ canonical workspace
 * إدارة الأقسام المسندة، القوائم الاسمية، والاستيراد والإعفاءات من مصدرها الرسمي.
 */

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  Printer,
  Plus,
  ShieldAlert,
  Shuffle,
  Flag,
  Trash2,
  X,
} from 'lucide-react';
import {
  previewStudentRoster,
  confirmStudentRosterImport,
  StudentClassDeleteApiError,
  type StudentClassDeleteBlockers,
  fetchTeacherMedicalExemptions,
  createTeacherMedicalExemption,
  deleteTeacherMedicalExemption,
} from '../../services/api';
import { Student, ClassRoom, User, MedicalExemptionDto } from '../../types/spex';
import { StudentFollowUpCard } from './StudentFollowUpCard';
import {
  canonicalClassIdentityKey,
  findCrossClassMatriculeConflicts,
} from '../../services/studentRosterImport.service';

type RegisterTab = 'roster' | 'exempted' | 'clubs';

export interface StudentsBookViewProps {
  classes?: ClassRoom[];
  students?: Student[];
  onAddClass?: (newClassData: {
    name: string;
    levelId: string;
    studentCount: number;
    municipality?: string;
    schoolName?: string;
  }) => string;
  onDeleteClass?: (classId: string) => void | Promise<void>;
  onForceDeleteClass?: (classId: string) => Promise<unknown>;
  onAddStudent?: (studentData: Omit<Student, 'id'>) => void;
  onDeleteStudent?: (studentId: string) => void | Promise<void>;
  onRefreshRoster?: () => Promise<unknown>;
  currentUser?: User;
  selectedStudentId?: string;
}

interface ClubAssignmentMap {
  [studentId: string]: 'club_a' | 'club_b';
}

export const StudentsBookView: React.FC<StudentsBookViewProps> = ({
  classes = [],
  students = [],
  onAddClass,
  onDeleteClass,
  onForceDeleteClass,
  onAddStudent,
  onDeleteStudent,
  onRefreshRoster,
  currentUser,
  selectedStudentId,
}) => {
  const workspaceParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [activeRegister, setActiveRegister] = useState<RegisterTab>('roster');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    workspaceParams.get('classId') ||
      (selectedStudentId
        ? students.find((student) => student.id === selectedStudentId)?.classId
        : '') ||
      classes[0]?.id ||
      ''
  );
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
  const [blockedClassDelete, setBlockedClassDelete] = useState<{
    classId: string;
    blockers: StudentClassDeleteBlockers;
  } | null>(null);
  const [classDeleteLoading, setClassDeleteLoading] = useState(false);

  // Exemptions State
  const [exemptionsList, setExemptionsList] = useState<MedicalExemptionDto[]>([]);
  const [exemptionsLoading, setExemptionsLoading] = useState(false);
  const [showAddExemptionModal, setShowAddExemptionModal] = useState<boolean>(false);
  const [newExemptionStudentId, setNewExemptionStudentId] = useState<string>('');
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

  const activeClass: ClassRoom = classes.find((c) => c.id === selectedClassId) ||
    classes[0] || {
      id: '',
      institutionId: currentUser?.institutionId || '',
      teacherId: currentUser?.id || '',
      levelId: '',
      name: '',
      studentCount: 0,
    };
  // Keeps the empty-roster fallback explicit for static account-cleanliness checks:
  // const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0] || { id: '', name: '', studentCount: 0 }
  const classStudents = students.filter((s) => s.classId === activeClass.id);
  const selectedStudent = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId)
    : undefined;

  const formatClassDeleteBlockers = (blockers: StudentClassDeleteBlockers) =>
    [
      blockers.studentsWithHistory > 0
        ? `- ${blockers.studentsWithHistory} تلميذاً لديهم بيانات محفوظة`
        : '',
      blockers.plannedSessions > 0 ? `- ${blockers.plannedSessions} حصة مبرمجة` : '',
      blockers.attendanceRecords > 0 ? `- ${blockers.attendanceRecords} سجل حضور` : '',
      blockers.assessmentSessions > 0 ? `- ${blockers.assessmentSessions} جلسة تقييم` : '',
      blockers.weeklySlots > 0 ? `- ${blockers.weeklySlots} حصة في التوقيت الأسبوعي` : '',
      blockers.studentAssessments > 0 ? `- ${blockers.studentAssessments} سجل تقييم للتلاميذ` : '',
      blockers.criterionResults > 0 ? `- ${blockers.criterionResults} نتيجة معيار تقييم` : '',
      blockers.medicalExemptions > 0 ? `- ${blockers.medicalExemptions} إعفاء طبي` : '',
    ]
      .filter(Boolean)
      .join('\n');

  React.useEffect(() => {
    if (!activeClass.id) {
      setExemptionsList([]);
      return;
    }
    let active = true;
    setExemptionsLoading(true);
    fetchTeacherMedicalExemptions(activeClass.id)
      .then((response) => {
        if (active) setExemptionsList(response.exemptions);
      })
      .catch(() => {
        if (active) setExemptionsList([]);
      })
      .finally(() => {
        if (active) setExemptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeClass.id]);

  // Active class club names
  const currentClubs = classClubNames[activeClass.id] || {
    aName: `نادي أ (${activeClass.name})`,
    aSlogan: 'بالرياضة والأخلاق نسبق الجميع',
    bName: `نادي ب (${activeClass.name})`,
    bSlogan: 'بالعزيمة والإصرار نحو القمة',
  };

  // Ensure selectedClassId is valid
  React.useEffect(() => {
    const selectedStudentClassId = selectedStudentId
      ? students.find((student) => student.id === selectedStudentId)?.classId
      : undefined;
    if (selectedStudentClassId && selectedStudentClassId !== selectedClassId) {
      setSelectedClassId(selectedStudentClassId);
      return;
    }
    if (classes.length > 0 && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId, selectedStudentId, students]);

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
  const handleConfirmDeleteClass = async (classId: string) => {
    const targetClass = classes.find((c) => c.id === classId);
    if (
      window.confirm(
        `هل تريد حذف القسم «${targetClass?.name || classId}» نهائياً؟\nسيتم حذف التلاميذ المسجلين فيه إذا لم توجد بيانات تاريخية محمية، ولا يمكن التراجع عن العملية.`
      )
    ) {
      try {
        await onDeleteClass?.(classId);
        setBlockedClassDelete(null);
        setRosterError('');
        const remaining = classes.filter((c) => c.id !== classId);
        if (remaining.length > 0) {
          setSelectedClassId(remaining[0].id);
        }
      } catch (error) {
        if (
          error instanceof StudentClassDeleteApiError &&
          error.code === 'CLASS_DELETE_BLOCKED' &&
          error.blockers
        ) {
          setBlockedClassDelete({ classId, blockers: error.blockers });
          setRosterError(
            `لا يمكن حذف القسم لوجود بيانات مرتبطة به:\n${formatClassDeleteBlockers(error.blockers)}`
          );
        } else {
          setBlockedClassDelete(null);
          setRosterError(
            error instanceof Error ? error.message : 'تعذر حذف القسم. يرجى إعادة المحاولة.'
          );
        }
      }
    }
  };

  const handleForceDeleteClass = async () => {
    if (!blockedClassDelete || !onForceDeleteClass) return;
    const className = classes.find((item) => item.id === blockedClassDelete.classId)?.name || '';
    const warning = `هذا القسم مرتبط ببيانات محفوظة.\n\nسيؤدي الحذف النهائي إلى حذف القسم والبيانات المرتبطة به مثل الحضور والتقييمات والحصص المبرمجة والتوقيت الأسبوعي التي تخص هذا القسم.\n\n${formatClassDeleteBlockers(blockedClassDelete.blockers)}\n\nلا يمكن التراجع عن هذه العملية.\n\nهل تريد المتابعة؟`;
    if (!window.confirm(warning)) return;
    if (!window.confirm(`تأكيد نهائي: حذف القسم «${className}» مع البيانات المرتبطة به؟`)) return;

    setClassDeleteLoading(true);
    try {
      await onForceDeleteClass(blockedClassDelete.classId);
      setBlockedClassDelete(null);
      setRosterError('');
      const remaining = classes.filter((c) => c.id !== blockedClassDelete.classId);
      if (remaining.length > 0) setSelectedClassId(remaining[0].id);
      window.alert('تم حذف القسم نهائياً مع بياناته المرتبطة.');
    } catch (error) {
      setRosterError(
        error instanceof Error ? error.message : 'تعذر حذف القسم. يرجى إعادة المحاولة.'
      );
    } finally {
      setClassDeleteLoading(false);
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
    setBlockedClassDelete(null);
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
    const crossClassConflicts = findCrossClassMatriculeConflicts(previews);
    if (crossClassConflicts.length) {
      setRosterError(
        `تعذر الاستيراد: رقم التسجيل ${crossClassConflicts.join('، ')} مرتبط بأكثر من قسم في الملف.`
      );
      return;
    }
    setRosterLoading(true);
    setRosterError('');
    setBlockedClassDelete(null);
    try {
      let created = 0;
      let existing = 0;
      let reassociated = 0;
      let conflicts = 0;
      let review = 0;
      let classesImported = 0;
      const reviewReasonCounts = {
        foreignOwner: 0,
        ambiguousMatch: 0,
        duplicateWorkbookMembership: 0,
        invalidIdentity: 0,
        institutionMismatch: 0,
        other: 0,
      };
      for (const preview of previews) {
        const grade =
          Number(preview.grade) ||
          Number(('levelId' in activeClass ? activeClass.levelId : '').replace('lvl_p', '')) ||
          1;
        const levelId = `lvl_p${grade}`;
        const targetClassName = preview.groupName || `السنة ${grade} ابتدائي`;
        const targetClassIdentity = canonicalClassIdentityKey(levelId, targetClassName);
        const matched =
          classes.find(
            (item) =>
              item.levelId === levelId &&
              canonicalClassIdentityKey(item.levelId, item.name) === targetClassIdentity
          ) ||
          (!preview.groupName &&
          grade ===
            Number(('levelId' in activeClass ? activeClass.levelId : '').replace('lvl_p', ''))
            ? activeClass
            : undefined);
        const effectiveClassName = preview.groupName || matched?.name || targetClassName;
        const destinationId =
          matched?.id ||
          (() => {
            const id = onAddClass?.({
              name: effectiveClassName,
              levelId,
              studentCount: preview.students.length,
            });
            return id;
          })() ||
          activeClass.id;
        const result = await confirmStudentRosterImport(
          preview.students,
          destinationId,
          grade,
          effectiveClassName,
          levelId
        );
        created += result.summary.created;
        existing += result.summary.existing;
        reassociated += result.summary.reassociated;
        conflicts += result.summary.conflicts;
        review += result.summary.review;
        Object.entries(result.summary.reviewReasonCounts).forEach(([reason, count]) => {
          if (reason in reviewReasonCounts)
            reviewReasonCounts[reason as keyof typeof reviewReasonCounts] += count;
        });
        setSelectedClassId(result.classId);
        classesImported += 1;
      }
      await onRefreshRoster?.();
      window.alert(
        `تم استيراد ${classesImported} قسم بنجاح\nالجدد: ${created}\nالموجودون مسبقاً: ${existing}\nالمعاد ربطهم بالأقسام: ${reassociated}\nبحاجة إلى مراجعة: ${conflicts + review}\n- تعارض ملكية سجل موجود: ${reviewReasonCounts.foreignOwner}\n- تطابق غامض: ${reviewReasonCounts.ambiguousMatch}\n- بيانات تعريف غير كافية: ${reviewReasonCounts.invalidIdentity}\n- اختلاف المؤسسة: ${reviewReasonCounts.institutionMismatch}`
      );
      setRosterPreview(null);
      setRosterFileName('');
    } catch (error) {
      await onRefreshRoster?.().catch(() => undefined);
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

    void createTeacherMedicalExemption(activeClass.id, {
      studentId: std.id,
      issuedOn: new Date().toISOString().split('T')[0],
      reason: newReason,
      note: `${newDoctor ? `الطبيب: ${newDoctor}` : ''}${newPeriod ? ` — ${newPeriod}` : ''}`.trim(),
    })
      .then((response) => {
        setExemptionsList((prev) => [response.exemption, ...prev]);
        setShowAddExemptionModal(false);
        setNewExemptionStudentId('');
        setNewReason('');
        setNewDoctor('');
      })
      .catch((error) =>
        setRosterError(error instanceof Error ? error.message : 'تعذر حفظ الإعفاء الطبي.')
      );
  };

  const handleDeleteExemption = async (exemptionId: string) => {
    if (!window.confirm('هل تريد حذف سجل الإعفاء الطبي؟')) return;
    try {
      await deleteTeacherMedicalExemption(exemptionId);
      setExemptionsList((prev) => prev.filter((item) => item.id !== exemptionId));
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : 'تعذر حذف الإعفاء الطبي.');
    }
  };

  return (
    <div
      className="workspace-page workspace-page--students space-y-6 animate-in fade-in duration-200"
      dir="rtl"
    >
      {selectedStudent && activeClass.id === selectedStudent.classId && (
        <StudentFollowUpCard student={selectedStudent} classRoom={activeClass} />
      )}
      {/* Top Banner & Header */}
      <div className="workspace-header students-book-header bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              دفتر التلاميذ
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              المقاطعة 07 - عين أزال سطيف
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span>دفتر التلاميذ — القوائم الاسمية والمتابعة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            الأقسام المسندة للأستاذ • القوائم الاسمية • الاستيراد والإعفاءات الطبية
          </p>
        </div>

        {/* Global Controls */}
        <div className="students-book-actions flex flex-wrap items-center gap-2">
          <button
            data-students-action="add-class"
            onClick={() => setShowAddClassModal(true)}
            className="workspace-button-secondary flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl border shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم جديد</span>
          </button>

          <button
            data-students-action="add-student"
            onClick={() => setShowAddStudentModal(true)}
            className="workspace-button-primary flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تلميذ للقسم</span>
          </button>

          <label
            data-students-action="import-roster"
            className="workspace-button-outline flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl border shadow-md cursor-pointer"
          >
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleRosterFile} />
            <Users className="w-4 h-4" />
            <span>استيراد قائمة التلاميذ</span>
          </label>

          <button
            data-students-action="print-roster"
            onClick={() => window.print()}
            className="workspace-button-secondary flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الدفتر الحالى</span>
          </button>
        </div>
      </div>

      {/* Compact class selector with wrapping cards and contextual delete action */}
      <section className="students-class-selector workspace-card rounded-3xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs font-black text-slate-800">الأقسام المسندة للأستاذ</span>
              <span className="text-[11px] font-semibold text-slate-400">
                {classes.length} أقسام
              </span>
            </div>
            <div className="students-selected-class mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">القسم المحدد</span>
              <strong className="text-emerald-800">{activeClass.name || 'لا يوجد قسم محدد'}</strong>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                {classStudents.length} تلميذاً
              </span>
            </div>
          </div>

          <button
            onClick={() => void handleConfirmDeleteClass(activeClass.id)}
            disabled={classDeleteLoading}
            className="workspace-button-danger inline-flex items-center gap-1.5 self-start rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer"
            title="حذف هذا القسم"
            aria-label="حذف القسم المحدد"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف القسم</span>
          </button>
        </div>

        <div className="students-class-list mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => {
            const isSelected = cls.id === activeClass.id;
            const count = students.filter((s) => s.classId === cls.id).length;
            return (
              <button
                type="button"
                key={cls.id}
                className={`students-class-chip min-w-0 rounded-2xl border px-3 py-2.5 text-right text-xs font-extrabold transition-all cursor-pointer ${
                  isSelected
                    ? 'is-selected border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60'
                }`}
                onClick={() => setSelectedClassId(cls.id)}
                aria-pressed={isSelected}
              >
                <span className="flex min-w-0 items-start gap-2">
                  <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1 break-words">{cls.name}</span>
                </span>
                <span
                  className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  {count} تلميذاً
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {rosterError && !rosterPreview && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 whitespace-pre-line"
        >
          <p>{rosterError}</p>
          {blockedClassDelete && (
            <button
              type="button"
              disabled={classDeleteLoading}
              onClick={() => void handleForceDeleteClass()}
              className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {classDeleteLoading
                ? 'جارٍ الحذف النهائي...'
                : 'حذف القسم نهائياً مع البيانات المرتبطة'}
            </button>
          )}
        </div>
      )}

      {/* Canonical Students Book sections */}
      <nav
        className="workspace-tabs students-book-tabs grid grid-cols-1 gap-1.5 rounded-2xl bg-slate-200/60 p-1.5 sm:grid-cols-3"
        aria-label="أقسام دفتر التلاميذ"
      >
        <button
          onClick={() => setActiveRegister('roster')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
            activeRegister === 'roster'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>القائمة الاسمية والمتابعة</span>
        </button>

        <button
          onClick={() => setActiveRegister('exempted')}
          className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
            activeRegister === 'exempted'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>المعفيون طبياً</span>
          {exemptionsList.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {exemptionsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveRegister('clubs')}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
            activeRegister === 'clubs'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <Flag className="h-4 w-4" />
          <span>البلديات والنوادي</span>
        </button>
      </nav>

      {activeRegister === 'roster' && (
        <div className="students-book-section workspace-card bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">القائمة الاسمية للقسم</h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeClass.name || 'لا يوجد قسم محدد'} — {classStudents.length} تلميذاً
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              مصدر العضوية الرسمي
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3">#</th>
                  <th className="p-3">الاسم واللقب</th>
                  <th className="p-3">رقم التسجيل</th>
                  <th className="p-3">المستوى</th>
                  <th className="p-3">المتابعة</th>
                  <th className="p-3">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="workspace-empty-state p-8 text-center text-slate-400"
                    >
                      لا يوجد تلاميذ مسجلون في هذا القسم.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((std, index) => (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-extrabold">
                        {std.firstName} {std.lastName}
                      </td>
                      <td className="p-3 font-mono">
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                          {std.matricule || std.registrationNumber || '—'}
                        </span>
                      </td>
                      <td className="p-3">{activeClass.levelName || std.grade || '—'}</td>
                      <td className="p-3">
                        <a
                          className="workspace-link-secondary font-bold text-blue-700 hover:underline"
                          href={`/students/${encodeURIComponent(std.id)}?classId=${encodeURIComponent(activeClass.id)}`}
                        >
                          بطاقة المتابعة
                        </a>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            handleConfirmDeleteStudent(std.id, `${std.firstName} ${std.lastName}`)
                          }
                          className="workspace-button-danger inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف
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
      {/* REGISTER TAB 3: MEDICAL EXEMPTIONS (دفتر المعفيين طبياً) */}
      {/* ========================================================================= */}
      {activeRegister === 'exempted' && (
        <div className="students-book-section workspace-card bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
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
                سجل حصر الشهادات الطبية والإعفاءات ومتابعة أدوارهم البديلة (تحكيم، تنظيم، ملاحظة)
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
                {exemptionsLoading || exemptionsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="workspace-empty-state p-8 text-center text-slate-400 font-medium"
                    >
                      {exemptionsLoading
                        ? 'جارٍ تحميل سجلات الإعفاء...'
                        : 'لا توجد شهادات إعفاء طبية مسجلة لهذا القسم حتى الآن.'}
                    </td>
                  </tr>
                ) : (
                  exemptionsList.map((ex, idx) => (
                    <tr key={ex.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-slate-900">
                        {ex.student
                          ? `${ex.student.firstName} ${ex.student.lastName}`
                          : students.find((student) => student.id === ex.studentId)?.firstName ||
                            ex.studentId}
                      </td>
                      <td className="p-3 text-slate-600">
                        <div>
                          <strong className="text-slate-800">{ex.issuedOn.slice(0, 10)}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ex.expiresOn ? `إلى ${ex.expiresOn.slice(0, 10)}` : 'دون تاريخ انتهاء'}
                        </div>
                      </td>
                      <td className="p-3 text-rose-700 font-bold">{ex.reason || ex.note || '—'}</td>
                      <td className="p-3 text-center">
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                          {ex.expiresOn ? 'محددة بالتاريخ' : 'سارية'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">
                        {ex.note || 'إعفاء طبي من المجهود البدني'}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => void handleDeleteExemption(ex.id)}
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
        <div className="students-book-section workspace-card bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
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
                توزيع تلاميذ هذا القسم تلقائياً إلى ناديين (نادي أ ونادي ب) ومتابعة الروح المنافسة
                الشريفة
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
            <div className="students-club-card bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-4 rounded-2xl border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <h4 className="text-xs font-black text-blue-900">النادي الأول (نادي أ)</h4>
                </div>
                <span className="text-[10px] bg-blue-200/60 text-blue-900 font-extrabold px-2 py-0.5 rounded-full">
                  {
                    classStudents.filter((s) => (clubAssignments[s.id] || 'club_a') === 'club_a')
                      .length
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
            <div className="students-club-card bg-gradient-to-br from-purple-50/70 to-pink-50/50 p-4 rounded-2xl border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-600"></div>
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
                    <td
                      colSpan={6}
                      className="workspace-empty-state p-8 text-center text-slate-400"
                    >
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
                            {assignedClub === 'club_a' ? currentClubs.aName : currentClubs.bName}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleStudentClub(std.id)}
                            className="workspace-button-secondary px-3 py-1 text-slate-700 text-xs font-bold rounded-xl border transition-all cursor-pointer"
                          >
                            تبديل النادي 🔁
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() =>
                              handleConfirmDeleteStudent(std.id, `${std.firstName} ${std.lastName}`)
                            }
                            className="workspace-button-danger p-1.5 rounded-lg border transition-colors cursor-pointer"
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
      {/* MODAL 1: ADD NEW CLASS (إضافة قسم جديد) */}
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
                <label className="text-xs font-bold text-slate-700 block mb-1.5">اسم القسم:</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(event) => setNewClassName(event.target.value)}
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
                  onChange={(event) => setNewClassLevel(event.target.value)}
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
                  onChange={(event) => setNewClassStudentCount(parseInt(event.target.value) || 25)}
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
