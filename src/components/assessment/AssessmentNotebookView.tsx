import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  FileText,
  Save,
  ShieldAlert,
  Target,
  Users,
} from 'lucide-react';
import { canonicalReferenceSessions } from '../../services/teacherPlanning.service';
import { calculateAssessmentMastery } from '../../services/assessmentMastery';
import {
  createOrReuseTeacherAssessmentSession,
  fetchTeacherAssessmentSession,
  fetchTeacherAssessmentSessions,
  fetchTeacherAttendance,
  fetchTeacherMedicalExemptions,
  fetchTeacherPlanningSessions,
  fetchTeacherStudentAssessmentHistory,
  saveTeacherAttendance,
  createTeacherMedicalExemption,
  upsertTeacherCriterionResult,
  upsertTeacherStudentAssessment,
  type TeacherPlanningSession,
} from '../../services/api';
import {
  formatAcademicYearLabel,
  getCurrentAcademicYear,
  getOperationalAcademicYearOptions,
} from '../../services/academicYear';
import type {
  AssessmentGrade,
  AssessmentSessionDto,
  ClassRoom,
  Student,
  StudentAssessmentDto,
  StudentAssessmentHistoryDto,
  TeacherAssessmentType,
  AttendanceStatus,
  MedicalExemptionDto,
  TeacherAttendanceDto,
  User,
} from '../../types/spex';

interface AssessmentNotebookViewProps {
  currentUser: User;
  teacherClasses: ClassRoom[];
  students: Student[];
  selectedClassId?: string;
  onSelectedClassIdChange?: (classId: string) => void;
  visibleSections?: NotebookSection[];
}

type NotebookSection = 'competency' | 'marks' | 'attendance' | 'exemptions' | 'results' | 'reports';
type CriterionCode = 'C1' | 'C2' | 'C3' | 'C4';
type Draft = {
  criteria: Record<CriterionCode, AssessmentGrade | ''>;
  numericMark: string;
  note: string;
};

const CRITERIA: Array<{ code: CriterionCode; label: string }> = [
  { code: 'C1', label: 'C1 — الملاءمة' },
  { code: 'C2', label: 'C2 — الأداء الحركي' },
  { code: 'C3', label: 'C3 — الفضاء والتوازن' },
  { code: 'C4', label: 'C4 — التنسيق والمجموعة' },
];
const MASTERY: Array<{ value: AssessmentGrade; label: string }> = [
  { value: 'أ', label: 'أ — تملك أقصى' },
  { value: 'ب', label: 'ب — تملك مقبول' },
  { value: 'ج', label: 'ج — تملك جزئي' },
  { value: 'د', label: 'د — تملك محدود' },
];
const ASSESSMENT_TYPES: Array<{ value: TeacherAssessmentType; label: string }> = [
  { value: 'تقويم تشخيصي', label: 'تقويم تشخيصي' },
  { value: 'تعلمية', label: 'تقويم تكويني / تعلمي' },
  { value: 'إدماجية', label: 'تقويم إدماجي' },
  { value: 'تقويم تحصيلي', label: 'تقويم تحصيلي / ختامي' },
];
const ASSESSMENT_REFERENCE_TYPES = new Set(['تقويم تشخيصي', 'تقويم تحصيلي']);

function isAssessmentReference(type?: string): boolean {
  return Boolean(type && ASSESSMENT_REFERENCE_TYPES.has(type));
}
function criterionId(session: AssessmentSessionDto, code: CriterionCode): string {
  return `criterion:${session.gradeLevelId}:${session.domainId}:${session.finalCompetencyId || 'none'}:${code}`;
}
function emptyDraft(): Draft {
  return { criteria: { C1: '', C2: '', C3: '', C4: '' }, numericMark: '', note: '' };
}
function criterionCodeFromId(value: string): CriterionCode | null {
  const code = value.split(':').at(-1);
  return code === 'C1' || code === 'C2' || code === 'C3' || code === 'C4' ? code : null;
}

export const AssessmentNotebookView: React.FC<AssessmentNotebookViewProps> = ({
  currentUser,
  teacherClasses,
  students,
  selectedClassId: controlledClassId,
  onSelectedClassIdChange,
  visibleSections,
}) => {
  const allowedSections: NotebookSection[] = visibleSections || [
    'competency',
    'marks',
    'attendance',
    'exemptions',
    'results',
    'reports',
  ];
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const ownedClasses = useMemo(
    () => teacherClasses.filter((item) => item.teacherId === currentUser.id),
    [teacherClasses, currentUser.id]
  );
  const yearOptions = useMemo(() => getOperationalAcademicYearOptions(), []);
  const requestedPlannedSessionId = params.get('classPlannedSessionId') || '';
  const requestedSection = params.get('section') as NotebookSection;
  const [section, setSection] = useState<NotebookSection>(
    allowedSections.includes(requestedSection) ? requestedSection : allowedSections[0]
  );
  const [selectedClassId, setSelectedClassId] = useState(
    controlledClassId || params.get('classId') || ownedClasses[0]?.id || ''
  );
  const [academicYearId, setAcademicYearId] = useState(
    yearOptions.includes(params.get('academicYearId') || '')
      ? (params.get('academicYearId') as string)
      : getCurrentAcademicYear()
  );
  const [sessions, setSessions] = useState<AssessmentSessionDto[]>([]);
  const [activeSession, setActiveSession] = useState<AssessmentSessionDto | null>(null);
  const [results, setResults] = useState<StudentAssessmentDto[]>([]);
  const [plannedSession, setPlannedSession] = useState<TeacherPlanningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentHistory, setStudentHistory] = useState<StudentAssessmentHistoryDto[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualType, setManualType] = useState<TeacherAssessmentType>('تقويم تشخيصي');
  const [manualDomainId, setManualDomainId] = useState('f_locomotion');
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [plannedSessions, setPlannedSessions] = useState<TeacherPlanningSession[]>([]);
  const [attendanceSessionId, setAttendanceSessionId] = useState(requestedPlannedSessionId);
  const [attendanceData, setAttendanceData] = useState<TeacherAttendanceDto | null>(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState<
    Record<string, { status: AttendanceStatus | ''; note: string }>
  >({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceSaveError, setAttendanceSaveError] = useState('');
  const [exemptions, setExemptions] = useState<MedicalExemptionDto[]>([]);
  const [exemptionsLoading, setExemptionsLoading] = useState(false);
  const [exemptionsError, setExemptionsError] = useState('');
  const [exemptionStudentId, setExemptionStudentId] = useState('');
  const [exemptionIssuedOn, setExemptionIssuedOn] = useState(new Date().toISOString().slice(0, 10));
  const [exemptionExpiresOn, setExemptionExpiresOn] = useState('');
  const [exemptionReason, setExemptionReason] = useState('');
  const [exemptionNote, setExemptionNote] = useState('');
  const [exemptionSaving, setExemptionSaving] = useState(false);
  const [exemptionSaveError, setExemptionSaveError] = useState('');

  const activeClass = ownedClasses.find((item) => item.id === selectedClassId) || null;
  const classStudents = useMemo(
    () => students.filter((student) => student.classId === selectedClassId),
    [students, selectedClassId]
  );
  const resultsByStudent = useMemo(
    () => new Map(results.map((result) => [result.studentId, result])),
    [results]
  );
  const selectedStudent = classStudents.find((student) => student.id === selectedStudentId) || null;

  useEffect(() => {
    if (controlledClassId !== undefined && controlledClassId !== selectedClassId) {
      setSelectedClassId(controlledClassId);
    }
  }, [controlledClassId, selectedClassId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    onSelectedClassIdChange?.(classId);
  };
  const plannedReference = useMemo(
    () =>
      activeClass && plannedSession
        ? canonicalReferenceSessions(activeClass.levelId).find(
            (reference) => reference.referenceSessionId === plannedSession.referenceSessionId
          )
        : null,
    [activeClass, plannedSession]
  );

  useEffect(() => {
    if (selectedStudentId && !classStudents.some((student) => student.id === selectedStudentId))
      setSelectedStudentId('');
    if (!selectedStudentId && classStudents[0]) setSelectedStudentId(classStudents[0].id);
  }, [classStudents, selectedStudentId]);

  useEffect(() => {
    if (!requestedPlannedSessionId || params.get('classId') || !ownedClasses.length) return;
    let active = true;
    Promise.all(
      ownedClasses.map(async (item) => {
        try {
          const response = await fetchTeacherPlanningSessions(item.id, academicYearId);
          return response.sessions.some((session) => session.id === requestedPlannedSessionId)
            ? item.id
            : null;
        } catch {
          return null;
        }
      })
    ).then((ids) => {
      if (active) {
        const match = ids.find(Boolean);
        if (match) setSelectedClassId(match);
      }
    });
    return () => {
      active = false;
    };
  }, [academicYearId, ownedClasses, params, requestedPlannedSessionId]);

  useEffect(() => {
    let active = true;
    setError('');
    setSaveError('');
    setActiveSession(null);
    setResults([]);
    setPlannedSession(null);
    if (!selectedClassId) return undefined;
    setLoading(true);
    (async () => {
      try {
        const response = await fetchTeacherAssessmentSessions(selectedClassId, academicYearId);
        if (!active) return;
        setSessions(response.sessions);
        if (requestedPlannedSessionId) {
          const planning = await fetchTeacherPlanningSessions(selectedClassId, academicYearId);
          const scheduled = planning.sessions.find((item) => item.id === requestedPlannedSessionId);
          const reference = scheduled
            ? canonicalReferenceSessions(activeClass?.levelId || '').find(
                (item) => item.referenceSessionId === scheduled.referenceSessionId
              )
            : null;
          if (!scheduled || !reference)
            throw new Error('الحصة التشغيلية غير موجودة أو مرجعها غير متاح.');
          if (!isAssessmentReference(reference.sessionType))
            throw new Error('هذه الحصة ليست من حصص التقويم المعتمدة.');
          setPlannedSession(scheduled);
          const existing = response.sessions.find(
            (item) => item.classPlannedSessionId === requestedPlannedSessionId
          );
          const sessionResponse = existing
            ? { session: existing }
            : await createOrReuseTeacherAssessmentSession({
                classId: selectedClassId,
                academicYearId,
                classPlannedSessionId: scheduled.id,
                assessmentType: reference.sessionType as TeacherAssessmentType,
                gradeLevelId: activeClass?.levelId || '',
                domainId: reference.domainId,
                finalCompetencyId: null,
                title: reference.objective,
                assessedAt: `${scheduled.plannedDate.slice(0, 10)}T00:00:00.000Z`,
              });
          const full = await fetchTeacherAssessmentSession(sessionResponse.session.id);
          if (!active) return;
          setActiveSession(full.session);
          setResults(full.results);
          setSessions((current) =>
            current.some((item) => item.id === full.session.id)
              ? current.map((item) => (item.id === full.session.id ? full.session : item))
              : [full.session, ...current]
          );
        }
      } catch (caught) {
        if (active)
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل مساحة التقويم.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    academicYearId,
    activeClass?.levelId,
    requestedPlannedSessionId,
    selectedClassId,
    reloadNonce,
  ]);

  useEffect(() => {
    if (!selectedClassId) return;
    let active = true;
    fetchTeacherPlanningSessions(selectedClassId, academicYearId)
      .then((response) => {
        if (active) setPlannedSessions(response.sessions);
      })
      .catch(() => {
        if (active) setPlannedSessions([]);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, selectedClassId]);

  useEffect(() => {
    if (section !== 'attendance' || !attendanceSessionId) return;
    let active = true;
    setAttendanceLoading(true);
    setAttendanceError('');
    fetchTeacherAttendance(attendanceSessionId)
      .then((response) => {
        if (!active) return;
        setAttendanceData(response);
        const next: Record<string, { status: AttendanceStatus | ''; note: string }> = {};
        response.students.forEach((student) => {
          next[student.id] = {
            status: student.attendance?.status || '',
            note: student.attendance?.note || '',
          };
        });
        setAttendanceDrafts(next);
      })
      .catch((caught) => {
        if (active)
          setAttendanceError(
            caught instanceof Error ? caught.message : 'تعذر تحميل دفتر المناداة.'
          );
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attendanceSessionId, section]);

  useEffect(() => {
    if (section !== 'exemptions' || !selectedClassId) return;
    let active = true;
    setExemptionsLoading(true);
    setExemptionsError('');
    fetchTeacherMedicalExemptions(selectedClassId)
      .then((response) => {
        if (active) setExemptions(response.exemptions);
      })
      .catch((caught) => {
        if (active)
          setExemptionsError(
            caught instanceof Error ? caught.message : 'تعذر تحميل الإعفاءات الطبية.'
          );
      })
      .finally(() => {
        if (active) setExemptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [section, selectedClassId]);

  const saveAttendance = async () => {
    if (!attendanceSessionId) return;
    const records = Object.entries(attendanceDrafts)
      .filter(([, draft]) => draft.status)
      .map(([studentId, draft]) => ({
        studentId,
        status: draft.status as AttendanceStatus,
        note: draft.note.trim() || null,
      }));
    if (!records.length) {
      setAttendanceSaveError('اختر حالة واحدة على الأقل ثم احفظ.');
      return;
    }
    setAttendanceSaveError('');
    setAttendanceLoading(true);
    try {
      await saveTeacherAttendance(attendanceSessionId, records);
      const refreshed = await fetchTeacherAttendance(attendanceSessionId);
      setAttendanceData(refreshed);
      const next: Record<string, { status: AttendanceStatus | ''; note: string }> = {};
      refreshed.students.forEach((student) => {
        next[student.id] = {
          status: student.attendance?.status || '',
          note: student.attendance?.note || '',
        };
      });
      setAttendanceDrafts(next);
    } catch (caught) {
      setAttendanceSaveError(caught instanceof Error ? caught.message : 'تعذر حفظ دفتر المناداة.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const saveExemption = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClassId || !exemptionStudentId) return;
    setExemptionSaving(true);
    setExemptionSaveError('');
    try {
      const response = await createTeacherMedicalExemption(selectedClassId, {
        studentId: exemptionStudentId,
        issuedOn: exemptionIssuedOn,
        expiresOn: exemptionExpiresOn || null,
        reason: exemptionReason.trim() || null,
        note: exemptionNote.trim() || null,
      });
      setExemptions((current) => [response.exemption, ...current]);
      setExemptionStudentId('');
      setExemptionReason('');
      setExemptionNote('');
      setExemptionExpiresOn('');
    } catch (caught) {
      setExemptionSaveError(caught instanceof Error ? caught.message : 'تعذر حفظ الإعفاء الطبي.');
    } finally {
      setExemptionSaving(false);
    }
  };
  useEffect(() => {
    const next: Record<string, Draft> = {};
    classStudents.forEach((student) => {
      const result = resultsByStudent.get(student.id);
      const draft = emptyDraft();
      result?.criterionResults.forEach((criterion) => {
        const code = criterionCodeFromId(criterion.criterionId);
        if (code) draft.criteria[code] = criterion.masteryLevel || '';
      });
      draft.numericMark =
        result?.numericMark === null || result?.numericMark === undefined
          ? ''
          : String(result.numericMark);
      draft.note = result?.note || '';
      next[student.id] = draft;
    });
    setDrafts(next);
  }, [classStudents, resultsByStudent]);

  useEffect(() => {
    if (section !== 'reports' || !selectedStudentId || !selectedClassId) return;
    let active = true;
    setHistoryLoading(true);
    setHistoryError('');
    fetchTeacherStudentAssessmentHistory(selectedStudentId, selectedClassId, academicYearId)
      .then((response) => {
        if (active) setStudentHistory(response.history);
      })
      .catch((caught) => {
        if (active)
          setHistoryError(caught instanceof Error ? caught.message : 'تعذر تحميل التقرير.');
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, section, selectedClassId, selectedStudentId]);

  const openSession = async (sessionId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchTeacherAssessmentSession(sessionId);
      setActiveSession(response.session);
      setResults(response.results);
      setSection('competency');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر فتح جلسة التقويم.');
    } finally {
      setLoading(false);
    }
  };

  const createManualSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeClass) return;
    setLoading(true);
    setError('');
    try {
      const response = await createOrReuseTeacherAssessmentSession({
        classId: activeClass.id,
        academicYearId,
        assessmentType: manualType,
        gradeLevelId: activeClass.levelId,
        domainId: manualDomainId,
        finalCompetencyId: null,
        title: 'تقويم يدوي',
        assessedAt: new Date().toISOString(),
      });
      setSessions((current) => [
        response.session,
        ...current.filter((item) => item.id !== response.session.id),
      ]);
      setActiveSession(response.session);
      setResults([]);
      setManualOpen(false);
      setSection('competency');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إنشاء التقويم اليدوي.');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (studentId: string, update: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] || emptyDraft()), ...update },
    }));
  };
  const updateCriterion = (studentId: string, code: CriterionCode, value: AssessmentGrade | '') => {
    const current = drafts[studentId] || emptyDraft();
    updateDraft(studentId, { criteria: { ...current.criteria, [code]: value } });
  };

  const saveStudent = async (student: Student, draftOverride?: Draft) => {
    if (!activeSession) return;
    const draft = draftOverride || drafts[student.id] || emptyDraft();
    const hasCriterion = Object.values(draft.criteria).some(Boolean);
    const hasMark = draft.numericMark.trim() !== '';
    if (!hasCriterion && !hasMark && !draft.note.trim()) {
      setSaveError('لم تُسجّل أي ملاحظة أو معيار أو علامة لهذا التلميذ.');
      return;
    }
    const numericMark = hasMark ? Number(draft.numericMark) : null;
    if (
      numericMark !== null &&
      (!Number.isFinite(numericMark) || numericMark < 0 || numericMark > 10)
    ) {
      setSaveError('العلامة يجب أن تكون بين 0 و10.');
      return;
    }
    setSavingStudentId(student.id);
    setSaveError('');
    try {
      await upsertTeacherStudentAssessment(activeSession.id, student.id, {
        masteryLevel: null,
        numericMark,
        note: draft.note.trim() || null,
        assessedAt: new Date().toISOString(),
      });
      const existing = resultsByStudent.get(student.id);
      for (const item of CRITERIA) {
        const value = draft.criteria[item.code];
        const previous = existing?.criterionResults.some(
          (result) => criterionCodeFromId(result.criterionId) === item.code
        );
        if (value || previous) {
          await upsertTeacherCriterionResult(
            activeSession.id,
            student.id,
            criterionId(activeSession, item.code),
            {
              masteryLevel: value || null,
            }
          );
        }
      }
      const refreshed = await fetchTeacherAssessmentSession(activeSession.id);
      setResults(refreshed.results);
      setActiveSession(refreshed.session);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'تعذر حفظ نتيجة التلميذ.');
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleBulkSetGrade = async (grade: AssessmentGrade) => {
    if (!activeSession || !classStudents.length) return;
    const nextDrafts = { ...drafts };
    classStudents.forEach((student) => {
      const current = nextDrafts[student.id] || emptyDraft();
      nextDrafts[student.id] = {
        ...current,
        criteria: { C1: grade, C2: grade, C3: grade, C4: grade },
      };
    });
    setDrafts(nextDrafts);
    setBulkSaving(true);
    try {
      for (const student of classStudents) {
        await saveStudent(student, nextDrafts[student.id]);
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const assessedCount = results.length;
  const marks = results
    .map((result) => result.numericMark)
    .filter((mark): mark is number => mark !== null);
  const markAverage = marks.length
    ? (marks.reduce((sum, mark) => sum + mark, 0) / marks.length).toFixed(2)
    : null;
  const masteryCounts = MASTERY.reduce<Record<AssessmentGrade, number>>(
    (counts, item) => {
      counts[item.value] = results.reduce(
        (total, result) =>
          total +
          result.criterionResults.filter((criterion) => criterion.masteryLevel === item.value)
            .length,
        0
      );
      return counts;
    },
    { أ: 0, ب: 0, ج: 0, د: 0 }
  );
  const masteryDistribution = useMemo(() => {
    const counts: Record<AssessmentGrade, number> = { أ: 0, ب: 0, ج: 0, د: 0 };
    classStudents.forEach((student) => {
      const mastery = calculateAssessmentMastery((drafts[student.id] || emptyDraft()).criteria);
      if (mastery) counts[mastery] += 1;
    });
    return MASTERY.map((item) => ({ ...item, count: counts[item.value] }));
  }, [classStudents, drafts]);
  const remediationStudents = classStudents.filter(
    (student) => calculateAssessmentMastery((drafts[student.id] || emptyDraft()).criteria) === 'د'
  );

  return (
    <div className="space-y-5" dir="rtl">
      <header className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              دفتر التنقيط
            </span>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <BookOpenCheck className="h-6 w-6 text-purple-600" /> دفتر التنقيط والتقويم البيداغوجي
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              تقويم الكفاءات والعلامات ونتائج القسم وتقارير التلاميذ من البيانات المحفوظة فعلياً.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <label>
              السنة الدراسية
              <select
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
                className="mr-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {formatAcademicYearLabel(year)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              القسم
              <select
                value={selectedClassId}
                onChange={(event) => handleClassChange(event.target.value)}
                className="mr-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">اختر قسماً</option>
                {ownedClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <nav className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 md:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ['competency', 'تقويم الكفاءات', Target],
              ['marks', 'العلامات', FileText],
              ['attendance', 'الحضور والمناداة', CalendarCheck],
              ['exemptions', 'الإعفاءات', ShieldAlert],
              ['results', 'نتائج القسم', BarChart3],
              ['reports', 'تقارير التلميذ', Users],
            ] as const
          )
            .filter(([value]) => allowedSections.includes(value))
            .map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setSection(value)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold ${section === value ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
        </nav>
      </header>

      {requestedPlannedSessionId && plannedSession && plannedReference && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-xs font-bold text-purple-900">
          حصة تقويم مرتبطة بالتوزيع · {plannedReference.sessionTypeLabel} ·{' '}
          {plannedReference.objective}
        </div>
      )}
      {activeSession && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong>{activeSession.title || 'جلسة تقويم'}</strong>
            <span className="mr-2 rounded-lg bg-slate-100 px-2 py-1">
              {activeSession.classPlannedSessionId ? 'مرتبطة بالتوزيع' : 'تقويم يدوي'}
            </span>
            <span className="mr-2 text-slate-500">
              {activeSession.assessmentType} · {activeSession.domainId}
            </span>
          </div>
          <button
            onClick={() => setActiveSession(null)}
            className="rounded-xl border border-slate-200 px-3 py-2 font-bold"
          >
            اختيار جلسة أخرى
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setReloadNonce((value) => value + 1)}
            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {saveError && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{saveError}</div>
      )}
      {loading && (
        <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
          جارٍ تحميل البيانات المحفوظة...
        </div>
      )}

      {!loading && !activeSession && selectedClassId && (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900">جلسات التقويم للقسم</h2>
              <p className="mt-1 text-xs text-slate-500">
                اختر جلسة محفوظة أو أنشئ تقويماً يدوياً.
              </p>
            </div>
            <button
              onClick={() => setManualOpen((value) => !value)}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white"
            >
              تقويم يدوي جديد
            </button>
          </div>
          {manualOpen && (
            <form
              onSubmit={createManualSession}
              className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3"
            >
              <label className="text-xs font-bold">
                النوع
                <select
                  value={manualType}
                  onChange={(event) => setManualType(event.target.value as TeacherAssessmentType)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  {ASSESSMENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                الميدان
                <select
                  value={manualDomainId}
                  onChange={(event) => setManualDomainId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="f_locomotion">الميدان الأول</option>
                  <option value="f_basic_moves">الميدان الثاني</option>
                  <option value="f_structuring">الميدان الثالث</option>
                </select>
              </label>
              <button
                type="submit"
                className="self-end rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
              >
                إنشاء وفتح
              </button>
            </form>
          )}
          {sessions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              لا توجد جلسات تقويم محفوظة بعد.
            </p>
          ) : (
            <div className="grid gap-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => void openSession(session.id)}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-200 p-4 text-right hover:border-purple-300"
                >
                  <strong>{session.title || 'جلسة تقويم'}</strong>
                  <span className="text-xs text-slate-500">
                    {session.classPlannedSessionId ? 'حصة تقويم مرتبطة بالتوزيع' : 'تقويم يدوي'} ·{' '}
                    {session.assessmentType} · {session.assessedAt.slice(0, 10)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {activeSession && section === 'competency' && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold">
              <Target className="h-5 w-5 text-purple-600" />
              تقويم الكفاءات
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              القيم غير المختارة تبقى غير مقوّمة ولا تُنشئ نتيجة تلقائية.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-bold">
            <span className="text-slate-600">تقييم جماعي محفوظ:</span>
            {(['أ', 'ب'] as AssessmentGrade[]).map((grade) => (
              <button
                key={grade}
                type="button"
                disabled={bulkSaving}
                onClick={() => void handleBulkSetGrade(grade)}
                className="rounded-xl bg-purple-600 px-3 py-2 text-white disabled:opacity-50"
              >
                الجميع {grade}
              </button>
            ))}
            {bulkSaving && <span className="text-purple-700">جارٍ حفظ جميع النتائج...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100">
                  {' '}
                  <th className="p-3">التلميذ</th>
                  {CRITERIA.map((item) => (
                    <th key={item.code} className="p-3 text-center">
                      {item.label}
                    </th>
                  ))}
                  <th className="p-3">العلامة / الملاحظة</th>
                  <th className="p-3">حفظ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      لا يوجد تلاميذ حقيقيون في هذا القسم.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student) => {
                    const draft = drafts[student.id] || emptyDraft();
                    const persisted = resultsByStudent.has(student.id);
                    const mastery = calculateAssessmentMastery(draft.criteria);
                    return (
                      <tr key={student.id} className="align-top">
                        <td className="p-3 font-extrabold">
                          {student.firstName} {student.lastName}
                          <span
                            className={`mt-1 block text-[10px] ${persisted ? 'text-emerald-700' : 'text-slate-400'}`}
                          >
                            {persisted ? 'نتيجة محفوظة' : 'غير مقوّم'}
                          </span>
                          <span className="mt-1 block text-[10px] font-bold text-purple-700">
                            {mastery ? `التملك العام: ${mastery}` : 'التملك العام: غير مقوّم'}
                          </span>
                        </td>
                        {CRITERIA.map((item) => (
                          <td key={item.code} className="p-2 text-center">
                            <select
                              value={draft.criteria[item.code]}
                              onChange={(event) =>
                                updateCriterion(
                                  student.id,
                                  item.code,
                                  event.target.value as AssessmentGrade | ''
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"
                            >
                              <option value="">غير مقوّم</option>
                              {MASTERY.map((level) => (
                                <option key={level.value} value={level.value}>
                                  {level.value}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.25"
                            value={draft.numericMark}
                            onChange={(event) =>
                              updateDraft(student.id, { numericMark: event.target.value })
                            }
                            placeholder="غير مقوّم"
                            className="w-24 rounded-xl border border-slate-200 px-2 py-2"
                          />
                          <textarea
                            value={draft.note}
                            onChange={(event) =>
                              updateDraft(student.id, { note: event.target.value })
                            }
                            placeholder="ملاحظة اختيارية"
                            className="mt-2 min-h-16 w-full rounded-xl border border-slate-200 px-2 py-2"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => void saveStudent(student)}
                            disabled={savingStudentId === student.id}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {savingStudentId === student.id ? 'حفظ...' : 'حفظ'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-extrabold text-slate-900">توزيع حالات التملك</h3>
              <div className="mt-3 space-y-2">
                {masteryDistribution.map((item) => {
                  const percentage = classStudents.length
                    ? Math.round((item.count / classStudents.length) * 100)
                    : 0;
                  return (
                    <div key={item.value} className="flex items-center gap-2 text-xs">
                      <span className="w-28 font-bold">{item.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <strong className="w-16 text-left">
                        {item.count} ({percentage}%)
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <h3 className="text-sm font-extrabold text-rose-900">خطة المعالجة</h3>
              <p className="mt-1 text-xs text-rose-700">التلاميذ ذوو التملك المحدود (د).</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {remediationStudents.length ? (
                  remediationStudents.map((student) => (
                    <span
                      key={student.id}
                      className="rounded-xl border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-900"
                    >
                      {student.firstName} {student.lastName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-rose-700">لا توجد حالات تحتاج معالجة.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSession && section === 'marks' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-extrabold">
            <FileText className="h-5 w-5 text-amber-600" />
            العلامات
          </h2>
          <p className="mt-1 text-xs text-slate-500">العلامات المعروضة محفوظة فعلياً فقط.</p>
          <div className="mt-4 grid gap-2">
            {classStudents.map((student) => {
              const result = resultsByStudent.get(student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 text-sm"
                >
                  <span className="font-bold">
                    {student.firstName} {student.lastName}
                  </span>
                  <strong>
                    {result?.numericMark === null || result?.numericMark === undefined
                      ? 'غير مقوّم'
                      : `${result.numericMark} / 10`}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {allowedSections.includes('attendance') && section === 'attendance' && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-extrabold">
                <CalendarCheck className="h-5 w-5 text-blue-600" />
                الحضور والمناداة
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                الحضور مستقل عن تقويم الكفاءات. لا تُنشأ حالة «حاضر» قبل حفظ الأستاذ.
              </p>
            </div>
            <select
              value={attendanceSessionId}
              onChange={(event) => setAttendanceSessionId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
            >
              <option value="">اختر حصة تشغيلية</option>
              {plannedSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.plannedDate.slice(0, 10)} · {session.startTime || 'غير محدد'}
                </option>
              ))}
            </select>
          </div>
          {plannedSessions.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
              لا توجد حصص تشغيلية مهيأة لهذه السنة.
            </p>
          )}
          {attendanceError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{attendanceError}</p>
          )}
          {attendanceSaveError && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {attendanceSaveError}
            </p>
          )}
          {attendanceLoading && (
            <p className="text-sm text-slate-500">جارٍ تحميل الحضور المحفوظ...</p>
          )}
          {attendanceData && !attendanceLoading && (
            <>
              <div className="flex flex-wrap justify-between gap-2 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-900">
                <span>تاريخ الحصة: {attendanceData.session.plannedDate.slice(0, 10)}</span>
                <span>غير المسجلين لا يدخلون في إحصاء الحضور.</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3">التلميذ</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceData.students.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">
                          لا يوجد تلاميذ حقيقيون في هذا القسم.
                        </td>
                      </tr>
                    ) : (
                      attendanceData.students.map((student) => {
                        const draft = attendanceDrafts[student.id] || { status: '', note: '' };
                        return (
                          <tr key={student.id}>
                            <td className="p-3 font-extrabold">
                              {student.firstName} {student.lastName}
                              {student.medicallyExempt && (
                                <span className="mr-2 rounded-lg bg-purple-50 px-2 py-1 text-[10px] text-purple-700">
                                  إعفاء نشط
                                </span>
                              )}
                              {!student.attendance && (
                                <span className="mr-2 text-[10px] text-slate-400">غير مسجل</span>
                              )}
                            </td>
                            <td className="p-2">
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  setAttendanceDrafts((current) => ({
                                    ...current,
                                    [student.id]: {
                                      ...draft,
                                      status: event.target.value as AttendanceStatus | '',
                                    },
                                  }))
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold"
                              >
                                <option value="">غير مسجل</option>
                                <option value="حاضر">حاضر</option>
                                <option value="غائب">غائب</option>
                                <option value="غائب بمبرر">غائب بمبرر</option>
                                <option value="معفى">معفى</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                value={draft.note}
                                onChange={(event) =>
                                  setAttendanceDrafts((current) => ({
                                    ...current,
                                    [student.id]: { ...draft, note: event.target.value },
                                  }))
                                }
                                placeholder="ملاحظة اختيارية"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => void saveAttendance()}
                disabled={attendanceLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                حفظ الحضور المحدد
              </button>
            </>
          )}
        </section>
      )}

      {allowedSections.includes('exemptions') && section === 'exemptions' && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="flex items-center gap-2 font-extrabold">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              الإعفاءات الطبية
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              بيانات minimal ومحدودة للأستاذ ولا تتحول إلى نتيجة تقويم.
            </p>
          </div>
          {exemptionsError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{exemptionsError}</p>
          )}
          {exemptionSaveError && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {exemptionSaveError}
            </p>
          )}
          <form
            onSubmit={saveExemption}
            className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-5"
          >
            <select
              required
              value={exemptionStudentId}
              onChange={(event) => setExemptionStudentId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">اختر التلميذ</option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
            <label className="text-xs font-bold">
              يبدأ في
              <input
                required
                type="date"
                value={exemptionIssuedOn}
                onChange={(event) => setExemptionIssuedOn(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <label className="text-xs font-bold">
              ينتهي في
              <input
                type="date"
                value={exemptionExpiresOn}
                onChange={(event) => setExemptionExpiresOn(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <input
              value={exemptionReason}
              onChange={(event) => setExemptionReason(event.target.value)}
              placeholder="سبب مختصر اختياري"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={exemptionSaving}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {exemptionSaving ? 'حفظ...' : 'حفظ الإعفاء'}
            </button>
            <textarea
              value={exemptionNote}
              onChange={(event) => setExemptionNote(event.target.value)}
              placeholder="ملاحظة اختيارية غير تشخيصية"
              className="md:col-span-5 min-h-16 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            />
          </form>
          {exemptionsLoading ? (
            <p className="text-sm text-slate-500">جارٍ تحميل الإعفاءات...</p>
          ) : exemptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              لا توجد إعفاءات محفوظة لهذا القسم.
            </p>
          ) : (
            <div className="grid gap-2">
              {exemptions.map((exemption) => (
                <article
                  key={exemption.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 p-4 text-xs"
                >
                  <strong>
                    {exemption.student?.firstName} {exemption.student?.lastName}
                  </strong>
                  <span>
                    {exemption.issuedOn.slice(0, 10)} →{' '}
                    {exemption.expiresOn?.slice(0, 10) || 'مفتوح'}
                  </span>
                  <span className="text-slate-600">{exemption.reason || 'دون سبب مسجل'}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeSession && section === 'results' && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-extrabold">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            نتائج القسم
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs text-slate-500">مقوّمون</span>
              <strong className="mt-1 block text-xl">{assessedCount}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs text-slate-500">غير مقوّمين</span>
              <strong className="mt-1 block text-xl">
                {Math.max(0, classStudents.length - assessedCount)}
              </strong>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs text-slate-500">متوسط العلامات المحفوظة</span>
              <strong className="mt-1 block text-xl">{markAverage || '—'}</strong>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <span className="text-xs text-slate-500">نتائج المعايير</span>
              <strong className="mt-1 block text-xl">
                {Object.values(masteryCounts).reduce((sum, value) => sum + value, 0)}
              </strong>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {MASTERY.map((item) => (
              <div
                key={item.value}
                className="rounded-xl border border-slate-100 p-3 text-xs font-bold"
              >
                {item.label}
                <strong className="mr-2">{masteryCounts[item.value]}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {section === 'reports' && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-extrabold">
            <Users className="h-5 w-5 text-blue-600" />
            تقارير التلميذ
          </h2>
          <label className="block max-w-md text-xs font-bold">
            التلميذ
            <select
              value={selectedStudentId}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <option value="">اختر تلميذاً</option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </label>
          {historyLoading && (
            <p className="text-sm text-slate-500">جارٍ تحميل التاريخ المحفوظ...</p>
          )}
          {historyError && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{historyError}</p>
          )}
          {!historyLoading && selectedStudent && studentHistory.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              لا توجد نتائج محفوظة لهذا التلميذ.
            </p>
          )}
          <div className="grid gap-3">
            {studentHistory.map((item) => (
              <article key={item.session.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <strong>{item.session.title || 'جلسة تقويم'}</strong>
                  <span>
                    {item.session.assessedAt.slice(0, 10)} · {item.session.assessmentType} ·{' '}
                    {item.session.classPlannedSessionId ? 'مرتبطة بالتوزيع' : 'يدوية'}
                  </span>
                </div>
                {item.result ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {item.result.criterionResults.map((criterion) => (
                        <span key={criterion.id} className="rounded-lg bg-slate-100 px-2 py-1">
                          {criterionCodeFromId(criterion.criterionId) || criterion.criterionId}:{' '}
                          {criterion.masteryLevel || 'غير مقوّم'}
                        </span>
                      ))}
                      <span className="rounded-lg bg-amber-50 px-2 py-1">
                        العلامة: {item.result.numericMark ?? 'غير مقوّم'}
                      </span>
                    </div>
                    {item.result.note && (
                      <p className="mt-2 text-xs text-slate-600">{item.result.note}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">غير مقوّم في هذه الجلسة.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
