import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  fetchTeacherAttendance,
  fetchTeacherPlanningSessions,
  saveTeacherAttendance,
} from '../../services/api';
import { getCurrentAcademicYear, getAcademicYearOptions } from '../../services/academicYear';
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

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['حاضر', 'غائب', 'غائب بمبرر', 'معفى'];

function localDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function attendanceBadgeClass(status: AttendanceStatus | '') {
  if (status === 'حاضر') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (status === 'غائب') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (status === 'غائب بمبرر') return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (status === 'معفى') return 'bg-purple-100 text-purple-800 border border-purple-200';
  return 'bg-slate-100 text-slate-500 border border-slate-200';
}

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
  const academicYearId = useMemo(() => {
    const requested = params.get('academicYearId');
    return requested && getAcademicYearOptions().includes(requested)
      ? requested
      : getCurrentAcademicYear();
  }, [params]);
  const [selectedClassId, setSelectedClassId] = useState(
    params.get('classId') || ownedClasses[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState(params.get('date') || localDateValue());
  const [plannedSessions, setPlannedSessions] = useState<
    Awaited<ReturnType<typeof fetchTeacherPlanningSessions>>['sessions']
  >([]);
  const [attendanceData, setAttendanceData] = useState<TeacherAttendanceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState('');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const activeClass = ownedClasses.find((item) => item.id === selectedClassId);
  const classStudents = useMemo(
    () => students.filter((student) => student.classId === selectedClassId),
    [students, selectedClassId]
  );
  const selectedSession = useMemo(
    () =>
      plannedSessions.find((session) => session.plannedDate.slice(0, 10) === selectedDate) || null,
    [plannedSessions, selectedDate]
  );
  const attendanceByStudent = useMemo(
    () =>
      new Map(
        attendanceData?.session.id === selectedSession?.id
          ? attendanceData.students.map((student) => [student.id, student])
          : []
      ),
    [attendanceData, selectedSession]
  );

  useEffect(() => {
    if (!selectedClassId || !ownedClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(ownedClasses[0]?.id || '');
    }
  }, [ownedClasses, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setPlannedSessions([]);
      setAttendanceData(null);
      return;
    }
    let active = true;
    setPlannedSessions([]);
    setAttendanceData(null);
    setLoading(true);
    setError('');
    fetchTeacherPlanningSessions(selectedClassId, academicYearId)
      .then((response) => {
        if (!active) return;
        setPlannedSessions(response.sessions);
        if (!params.get('date') && response.sessions.length > 0) {
          setSelectedDate(response.sessions[0].plannedDate.slice(0, 10));
        }
      })
      .catch((caught) => {
        if (active) {
          setPlannedSessions([]);
          setAttendanceData(null);
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل الحصص التشغيلية.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, ownedClasses, params, selectedClassId]);

  useEffect(() => {
    if (!selectedSession) {
      setAttendanceData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    fetchTeacherAttendance(selectedSession.id)
      .then((response) => {
        if (active) setAttendanceData(response);
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
  }, [selectedSession]);

  const saveStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession) return;
    const previous = attendanceByStudent.get(studentId)?.attendance;
    setSavingStudentId(studentId);
    setSaveError('');
    try {
      await saveTeacherAttendance(selectedSession.id, [
        { studentId, status, note: previous?.note || null },
      ]);
      const refreshed = await fetchTeacherAttendance(selectedSession.id);
      setAttendanceData(refreshed);
    } catch (caught) {
      try {
        const refreshed = await fetchTeacherAttendance(selectedSession.id);
        setAttendanceData(refreshed);
      } catch {
        // Keep the last authoritative read model if the recovery fetch also fails.
      }
      setSaveError(caught instanceof Error ? caught.message : 'تعذر حفظ حالة الحضور.');
    } finally {
      setSavingStudentId('');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
              <span>دفتر تسجيل الحضور والغياب للتربية البدنية</span>
              <select
                aria-label="القسم"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 outline-none"
              >
                <option value="">اختر قسماً</option>
                {ownedClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              سجل المتابعة اليومية والانضباط للحصص الرياضية مع تسجيل الأسباب والشهادات الطبية
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              aria-label="تاريخ الحضور"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="cursor-pointer bg-transparent text-xs font-bold text-slate-900 outline-none"
            />
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {saveError && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{saveError}</p>
        )}
        {activeClass && !selectedSession && !loading && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-600">
            لا توجد حصة تشغيلية مهيأة لهذا التاريخ. اختر تاريخ حصة مبرمجة لتسجيل الحضور.
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead>
              <tr className="bg-slate-900 font-bold text-white">
                <th className="w-10 p-3 text-center">#</th>
                <th className="p-3">اسم ولقب التلميذ</th>
                <th className="p-3 text-center">الحالة اليومية</th>
                <th className="p-3 text-center">تأكيد الحضور والغياب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    لا يوجد تلاميذ مسجلين في هذا القسم.
                  </td>
                </tr>
              ) : (
                classStudents.map((student, index) => {
                  const attendanceStudent = attendanceByStudent.get(student.id);
                  const status = attendanceStudent?.attendance?.status || '';
                  return (
                    <tr key={student.id} className="transition-colors hover:bg-slate-50">
                      <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="p-3 font-extrabold text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-black ${attendanceBadgeClass(status)}`}
                        >
                          {status || 'غير مسجل'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ATTENDANCE_STATUSES.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={!selectedSession || Boolean(savingStudentId)}
                              onClick={() => void saveStatus(student.id, nextStatus)}
                              className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                status === nextStatus
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {nextStatus}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
