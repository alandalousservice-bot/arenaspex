import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { fetchTeacherAttendanceByDate, saveTeacherAttendanceByDate } from '../../services/api';
import type { TeacherDateAttendanceDto } from '../../services/api';
import { getCurrentAcademicYear, isOperationalAcademicYear } from '../../services/academicYear';
import type { AttendanceStatus, ClassRoom, Student, User } from '../../types/spex';

interface AttendanceBookViewProps {
  currentUser: User;
  teacherClasses: ClassRoom[];
  students: Student[];
  onDeleteStudent?: (studentId: string) => void | Promise<void>;
}

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['حاضر', 'غائب', 'غائب بمبرر', 'معفى'];

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function attendanceBadgeClass(status: AttendanceStatus) {
  if (status === 'حاضر') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (status === 'غائب') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (status === 'غائب بمبرر') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-purple-100 text-purple-800 border border-purple-200';
}

export const AttendanceBookView: React.FC<AttendanceBookViewProps> = ({
  currentUser,
  teacherClasses,
  students,
  onDeleteStudent,
}) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const ownedClasses = useMemo(
    () => teacherClasses.filter((item) => item.teacherId === currentUser.id),
    [teacherClasses, currentUser.id]
  );
  const academicYearId = useMemo(() => {
    const requested = params.get('academicYearId');
    return requested && isOperationalAcademicYear(requested) ? requested : getCurrentAcademicYear();
  }, [params]);
  const [selectedClassId, setSelectedClassId] = useState(
    params.get('classId') || ownedClasses[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState(params.get('date') || localDateValue());
  const [attendanceData, setAttendanceData] = useState<TeacherDateAttendanceDto | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState('');
  const [error, setError] = useState('');

  const classStudents = useMemo(
    () => students.filter((student) => student.classId === selectedClassId),
    [students, selectedClassId]
  );
  const recordsByStudent = useMemo(
    () => new Map((attendanceData?.records ?? []).map((record) => [record.studentId, record])),
    [attendanceData]
  );

  useEffect(() => {
    if (!selectedClassId || !ownedClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(ownedClasses[0]?.id || '');
    }
  }, [ownedClasses, selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceData(null);
      setStatusOverrides({});
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    setAttendanceData(null);
    setStatusOverrides({});
    fetchTeacherAttendanceByDate(selectedClassId, selectedDate, academicYearId)
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
  }, [academicYearId, ownedClasses, selectedClassId, selectedDate]);

  const statusForStudent = (studentId: string): AttendanceStatus =>
    statusOverrides[studentId] || recordsByStudent.get(studentId)?.status || 'حاضر';

  const saveStatus = async (studentId: string, status: AttendanceStatus) => {
    const previousStatus = statusForStudent(studentId);
    setStatusOverrides((current) => ({ ...current, [studentId]: status }));
    setSavingStudentId(studentId);
    setError('');
    try {
      const response = await saveTeacherAttendanceByDate({
        classId: selectedClassId,
        date: selectedDate,
        academicYearId,
        records: [{ studentId, status, note: recordsByStudent.get(studentId)?.note || null }],
      });
      setAttendanceData(response);
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
    } catch (caught) {
      setStatusOverrides((current) => ({ ...current, [studentId]: previousStatus }));
      try {
        const refreshed = await fetchTeacherAttendanceByDate(
          selectedClassId,
          selectedDate,
          academicYearId
        );
        setAttendanceData(refreshed);
      } catch {
        // Keep the prior authoritative response when the recovery read also fails.
      }
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ حالة الحضور.');
    } finally {
      setSavingStudentId('');
    }
  };

  const deleteStudent = async (student: Student) => {
    if (!onDeleteStudent) return;
    const studentName = `${student.firstName} ${student.lastName}`;
    if (!window.confirm(`هل أنت تأكد من حذف التلميذ(ة): ${studentName}؟`)) return;
    setDeletingStudentId(student.id);
    setError('');
    try {
      await onDeleteStudent(student.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حذف التلميذ.');
    } finally {
      setDeletingStudentId('');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
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
        {loading && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
            جاري تحميل دفتر الحضور...
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-900 font-bold text-white">
                <th className="w-10 p-3 text-center">#</th>
                <th className="p-3">اسم ولقب التلميذ</th>
                <th className="p-3 text-center">الحالة اليومية</th>
                <th className="p-3 text-center">تأكيد الحضور والغياب</th>
                <th className="w-12 p-3 text-center">حذف</th>
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
                classStudents.map((student, index) => {
                  const status = statusForStudent(student.id);
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
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ATTENDANCE_STATUSES.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={Boolean(savingStudentId) || Boolean(deletingStudentId)}
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
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => void deleteStudent(student)}
                          disabled={Boolean(savingStudentId) || Boolean(deletingStudentId)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          title="حذف التلميذ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  );
};
