import React, { useEffect, useState } from 'react';
import { cardApi } from '../../informationCard/TeacherInformationCardPage';
import { VISIT_STATUS_LABELS, type TeacherVisitAppointment } from '../../../types/pedagogicalVisit';
export function TeacherVisitAppointments() {
  const [appointments, setAppointments] = useState<TeacherVisitAppointment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => { void cardApi<{ appointments: TeacherVisitAppointment[] }>('/api/teacher/visit-appointments').then((r) => { if (active) { setAppointments(r.appointments); setError(''); } }).catch((e: Error) => { if (active) setError(e.message); }); };
    refresh(); const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  if (error) return <p role="alert" className="rounded-xl border p-3">تعذر تحميل مواعيد الزيارات: {error}</p>;
  if (!appointments.length) return null;
  return <section dir="rtl" className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-black">مواعيد زيارة التثبيت المُبلّغة</h2>{appointments.map((v) => <article key={v.id} className="rounded-xl border p-3"><strong>زيارة التثبيت · {VISIT_STATUS_LABELS[v.status]}</strong><p className="mt-2">{new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v.scheduledAt))}</p>{v.status === 'CANCELLED' && <p>ألغي الموعد؛ لا توجد زيارة قادمة بهذا الموعد.</p>}{v.status === 'POSTPONED' && <p>أُجلت الزيارة؛ في انتظار إبلاغ الموعد الجديد.</p>}</article>)}</section>;
}
