import React, { useEffect, useState } from 'react';
import { Activity, ClipboardCheck, ShieldAlert } from 'lucide-react';
import {
  fetchTeacherMedicalExemptions,
  fetchTeacherStudentAssessmentHistory,
  fetchTeacherStudentAttendanceSummary,
} from '../../services/api';
import { getCurrentAcademicYear } from '../../services/academicYear';
import type {
  ClassRoom,
  Student,
  StudentAssessmentHistoryDto,
  MedicalExemptionDto,
} from '../../types/spex';

interface StudentFollowUpCardProps {
  student: Student;
  classRoom: ClassRoom;
}

export const StudentFollowUpCard: React.FC<StudentFollowUpCardProps> = ({ student, classRoom }) => {
  const [history, setHistory] = useState<StudentAssessmentHistoryDto[]>([]);
  const [attendance, setAttendance] = useState<{
    totalRecorded: number;
    counts: Record<string, number>;
  } | null>(null);
  const [exemptions, setExemptions] = useState<MedicalExemptionDto[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const academicYearId = getCurrentAcademicYear();
    Promise.all([
      fetchTeacherStudentAssessmentHistory(student.id, classRoom.id, academicYearId),
      fetchTeacherStudentAttendanceSummary(student.id, classRoom.id, academicYearId),
      fetchTeacherMedicalExemptions(classRoom.id),
    ])
      .then(([assessment, attendanceSummary, exemptionResponse]) => {
        if (!active) return;
        setHistory(assessment.history);
        setAttendance(attendanceSummary);
        setExemptions(exemptionResponse.exemptions.filter((item) => item.studentId === student.id));
      })
      .catch((caught) => {
        if (active)
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل بطاقة المتابعة.');
      });
    return () => {
      active = false;
    };
  }, [classRoom.id, student.id]);

  return (
    <section
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">بطاقة متابعة التلميذ</h2>
          <p className="mt-1 text-sm font-bold text-blue-700">
            {student.firstName} {student.lastName}
          </p>
        </div>
        <div className="text-left text-xs text-slate-500">
          <p>
            القسم: <strong>{classRoom.name}</strong>
          </p>
          <p>
            المستوى: <strong>{classRoom.levelName || student.grade || '—'}</strong>
          </p>
          <p>
            المعرّف: <strong>{student.matricule || student.registrationNumber || '—'}</strong>
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-blue-900">
            <ClipboardCheck className="h-4 w-4" />
            التقييم
          </h3>
          <p className="mt-2 text-xs text-slate-600">
            {history.filter((item) => item.result).length} نتيجة محفوظة
          </p>
          <a
            href={`/gradebook?classId=${encodeURIComponent(classRoom.id)}`}
            className="mt-3 inline-block text-xs font-bold text-blue-700 hover:underline"
          >
            فتح دفتر التنقيط
          </a>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-emerald-900">
            <Activity className="h-4 w-4" />
            المواظبة
          </h3>
          <p className="mt-2 text-xs text-slate-600">
            {attendance ? `${attendance.totalRecorded} سجلاً محفوظاً` : 'جارٍ التحميل...'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            حاضر: {attendance?.counts['حاضر'] || 0} — غائب: {attendance?.counts['غائب'] || 0}
          </p>
          <a
            href={`/attendance?classId=${encodeURIComponent(classRoom.id)}`}
            className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
          >
            فتح دفتر الغياب والمواظبة
          </a>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-rose-900">
            <ShieldAlert className="h-4 w-4" />
            الإعفاء الطبي
          </h3>
          <p className="mt-2 text-xs text-slate-600">
            {exemptions.length ? `${exemptions.length} سجل إعفاء` : 'لا يوجد إعفاء طبي محفوظ'}
          </p>
          <a
            href={`/students?classId=${encodeURIComponent(classRoom.id)}`}
            className="mt-3 inline-block text-xs font-bold text-rose-700 hover:underline"
          >
            إدارة الإعفاءات في دفتر التلاميذ
          </a>
        </div>
      </div>
    </section>
  );
};
