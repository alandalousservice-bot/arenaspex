import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Save, Users } from 'lucide-react';
import {
  fetchTeacherAttendance,
  fetchTeacherPlanningSessions,
  saveTeacherAttendance,
} from '../../services/api';
import {
  formatAcademicYearLabel,
  getAcademicYearOptions,
  getCurrentAcademicYear,
} from '../../services/academicYear';
import type {
  AttendanceStatus,
  ClassRoom,
  Student,
  TeacherAttendanceDto,
  User,
} from '../../types/spex';

interface AttendanceBookViewProps {
  currentUser: User;
  teacherClasses: ClassRoom[];
  students: Student[];
}

type AttendanceDraft = { status: AttendanceStatus | ''; note: string };

export const AttendanceBookView: React.FC<AttendanceBookViewProps> = ({
  currentUser,
  teacherClasses,
  students,
}) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const ownedClasses = useMemo(
    () => teacherClasses.filter((item) => item.teacherId === currentUser.id),
    [teacherClasses, currentUser.id]
  );
  const yearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [academicYearId, setAcademicYearId] = useState(
    yearOptions.includes(params.get('academicYearId') || '')
      ? (params.get('academicYearId') as string)
      : getCurrentAcademicYear()
  );
  const [selectedClassId, setSelectedClassId] = useState(
    params.get('classId') || ownedClasses[0]?.id || ''
  );
  const [plannedSessions, setPlannedSessions] = useState<
    Awaited<ReturnType<typeof fetchTeacherPlanningSessions>>['sessions']
  >([]);
  const [attendanceSessionId, setAttendanceSessionId] = useState(
    params.get('classPlannedSessionId') || ''
  );
  const [attendanceData, setAttendanceData] = useState<TeacherAttendanceDto | null>(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const activeClass = ownedClasses.find((item) => item.id === selectedClassId);
  const classStudents = students.filter((student) => student.classId === selectedClassId);

  useEffect(() => {
    if (!selectedClassId) {
      setPlannedSessions([]);
      setAttendanceSessionId('');
      setAttendanceData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetchTeacherPlanningSessions(selectedClassId, academicYearId)
      .then((response) => {
        if (!active) return;
        setPlannedSessions(response.sessions);
        setAttendanceSessionId((current) => {
          if (response.sessions.some((session) => session.id === current)) return current;
          return response.sessions[0]?.id || '';
        });
      })
      .catch((caught) => {
        if (active) {
          setPlannedSessions([]);
          setAttendanceSessionId('');
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل الحصص التشغيلية.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, selectedClassId]);

  useEffect(() => {
    if (!attendanceSessionId) {
      setAttendanceData(null);
      setAttendanceDrafts({});
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetchTeacherAttendance(attendanceSessionId)
      .then((response) => {
        if (!active) return;
        setAttendanceData(response);
        const drafts: Record<string, AttendanceDraft> = {};
        response.students.forEach((student) => {
          drafts[student.id] = {
            status: student.attendance?.status || '',
            note: student.attendance?.note || '',
          };
        });
        setAttendanceDrafts(drafts);
      })
      .catch((caught) => {
        if (active) {
          setAttendanceData(null);
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل دفتر الحضور.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attendanceSessionId]);

  const updateDraft = (studentId: string, update: Partial<AttendanceDraft>) => {
    setAttendanceDrafts((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] || { status: '', note: '' }), ...update },
    }));
  };

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
      setSaveError('اختر حالة واحدة على الأقل ثم احفظ.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await saveTeacherAttendance(attendanceSessionId, records);
      const refreshed = await fetchTeacherAttendance(attendanceSessionId);
      setAttendanceData(refreshed);
      const drafts: Record<string, AttendanceDraft> = {};
      refreshed.students.forEach((student) => {
        drafts[student.id] = {
          status: student.attendance?.status || '',
          note: student.attendance?.note || '',
        };
      });
      setAttendanceDrafts(drafts);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'تعذر حفظ دفتر الحضور.');
    } finally {
      setSaving(false);
    }
  };

  const summary = attendanceData?.students.reduce(
    (counts, student) => {
      const status = attendanceDrafts[student.id]?.status || student.attendance?.status;
      if (status === 'حاضر') counts.present += 1;
      if (status === 'غائب' || status === 'غائب بمبرر') counts.absent += 1;
      if (status === 'معفى') counts.exempt += 1;
      return counts;
    },
    { present: 0, absent: 0, exempt: 0 }
  );

  return (
    <div className="space-y-5" dir="rtl">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
              دفتر الغياب والمواظبة
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              تسجيل الحضور والغياب للتلاميذ اعتماداً على بيانات الحصص المحفوظة.
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
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                  setAttendanceSessionId('');
                }}
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-blue-900">
          <span>القسم: {activeClass?.name || 'غير محدد'}</span>
          <label>
            الحصة التشغيلية
            <select
              value={attendanceSessionId}
              onChange={(event) => setAttendanceSessionId(event.target.value)}
              className="mr-2 rounded-xl border border-blue-200 bg-white px-3 py-2"
            >
              <option value="">اختر حصة تشغيلية</option>
              {plannedSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.plannedDate.slice(0, 10)} · {session.startTime || 'غير محدد'}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saveError && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{saveError}</p>
      )}
      {plannedSessions.length === 0 && selectedClassId && !loading && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          لا توجد حصص تشغيلية مهيأة لهذه السنة.
        </p>
      )}
      {!selectedClassId && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          اختر قسماً لعرض دفتر الغياب والمواظبة.
        </p>
      )}
      {selectedClassId && classStudents.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          لا يوجد تلاميذ في هذا القسم بعد.
        </p>
      )}
      {attendanceData && !loading && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Users className="h-5 w-5 text-blue-600" />
              <span>قائمة التلاميذ · {attendanceData.session.plannedDate.slice(0, 10)}</span>
            </div>
            <div className="flex gap-3 text-xs font-bold text-slate-600">
              <span>حاضر: {summary?.present || 0}</span>
              <span>غائب: {summary?.absent || 0}</span>
              <span>معفى: {summary?.exempt || 0}</span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[760px] w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">اسم ولقب التلميذ</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceData.students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      لا يوجد تلاميذ في هذا القسم بعد.
                    </td>
                  </tr>
                ) : (
                  attendanceData.students.map((student, index) => {
                    const draft = attendanceDrafts[student.id] || { status: '', note: '' };
                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center text-slate-400">{index + 1}</td>
                        <td className="p-3 font-extrabold text-slate-900">
                          {student.firstName} {student.lastName}
                          {student.medicallyExempt && (
                            <span className="mr-2 text-[10px] text-purple-700">معفى طبياً</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            {(['حاضر', 'غائب', 'غائب بمبرر', 'معفى'] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateDraft(student.id, { status })}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${draft.status === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            value={draft.note}
                            onChange={(event) =>
                              updateDraft(student.id, { note: event.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2"
                            placeholder="ملاحظة اختيارية"
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
            type="button"
            onClick={() => void saveAttendance()}
            disabled={saving || !attendanceData.students.length}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'حفظ...' : 'حفظ دفتر الحضور'}
          </button>
        </section>
      )}
    </div>
  );
};
