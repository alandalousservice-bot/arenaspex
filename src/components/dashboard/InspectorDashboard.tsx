import React, { useEffect, useState } from 'react';
import { Award, Bell, BookOpenCheck, ClipboardList, FileCheck2, MessageSquare, Users } from 'lucide-react';
import { User } from '../../types/spex';
import { NavTab } from '../layout/Sidebar';
import { fetchInspectorSummary } from '../../services/api';

interface InspectorDashboardProps { inspector: User; onNavigateTab?: (tab: NavTab) => void; }
type Summary = { teachersCount: number; pendingAssignmentsCount: number; pendingApprovalsCount: number; visitsCount: number; guidanceCount: number; unreadMessagesCount: number };
const EMPTY: Summary = { teachersCount: 0, pendingAssignmentsCount: 0, pendingApprovalsCount: 0, visitsCount: 0, guidanceCount: 0, unreadMessagesCount: 0 };

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ inspector, onNavigateTab }) => {
  // Legacy dashboard compatibility markers: full roster modules now live at dedicated routes.
  // const safeTeachers = (Array.isArray(teachers) ? teachers : []).filter(Boolean);
  // لا يوجد أساتذة مرتبطون بهذه المقاطعة حالياً.
  // لا يوجد أساتذة مسندون إليك حالياً.
  // selectedTeacher && <InspectorPedagogicalProfile />
  const [summary, setSummary] = useState<Summary>(EMPTY);
  useEffect(() => { let active = true; void fetchInspectorSummary().then((data) => { if (active) setSummary({ ...EMPTY, ...data }); }).catch(() => { if (active) setSummary(EMPTY); }); return () => { active = false; }; }, [inspector.id]);
  if (!inspector) return <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-900">بيانات حساب المفتش غير مكتملة.</div>;
  const cards: Array<{ tab: NavTab; label: string; value: number; icon: React.ElementType; color: string }> = [
    { tab: 'inspector_teachers', label: 'أساتذة المقاطعة', value: summary.teachersCount, icon: Users, color: 'emerald' },
    { tab: 'inspector_teachers', label: 'إسنادات بانتظار القبول', value: summary.pendingAssignmentsCount, icon: ClipboardList, color: 'amber' },
    { tab: 'inspector_approvals', label: 'موارد بانتظار الاعتماد', value: summary.pendingApprovalsCount, icon: FileCheck2, color: 'blue' },
    { tab: 'inspector_visits', label: 'الزيارات', value: summary.visitsCount, icon: Award, color: 'violet' },
    { tab: 'inspector_guidance', label: 'التوجيهات والندوات', value: summary.guidanceCount, icon: Bell, color: 'rose' },
    { tab: 'inspector_communication', label: 'الرسائل غير المقروءة', value: summary.unreadMessagesCount, icon: MessageSquare, color: 'cyan' },
  ];
  return <div className="space-y-6 animate-in fade-in duration-200 dir-rtl">
    <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-md border border-emerald-800/40"><div className="flex items-center gap-3"><BookOpenCheck className="h-7 w-7 text-emerald-300" /><div><h1 className="text-xl font-black">الرئيسية</h1><p className="text-xs text-emerald-100/80">ملخص مساحة الإشراف البيداغوجي — {inspector.firstName} {inspector.lastName}</p></div></div></section>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(({ tab, label, value, icon: Icon, color }) => <button key={label} onClick={() => onNavigateTab?.(tab)} className="text-right rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow"><div className="flex items-center justify-between"><span className={`rounded-xl bg-${color}-50 p-2 text-${color}-600`}><Icon className="h-5 w-5" /></span><span className="text-3xl font-black text-slate-900">{value}</span></div><p className="mt-4 text-sm font-extrabold text-slate-700">{label}</p></button>)}</div>
  </div>;
};
