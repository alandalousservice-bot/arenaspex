import React, { useEffect, useState } from 'react';
import { CARD_STATUS_LABELS, type CardReadModel, type CardSnapshot } from '../../types/informationCard';
import type { WeeklyScheduleSlot, AnnualPlanObjectiveOverride } from '../../types/spex';
import { cardApi } from './TeacherInformationCardPage';
import { InformationCardFields } from './InformationCardFields';
import { OfficialInformationCardPrint, safeCardPhoto } from './OfficialInformationCardPrint';
import { InspectorWeeklyTimetable } from '../schedule/InspectorWeeklyTimetable';
import { AnnualPlanOfficialTable } from '../curriculum/AnnualPlanOfficialTable';
import { resolveAnnualPlanReferenceReadModel, resolveAnnualPlanTeacherValue } from '../../services/annualPlanReferenceReadModel';
import { buildAnnualPlanPresentation, buildDomainPresentation } from '../../services/annualPlanPresentation';
import { formatWeeklyMinutes } from '../../services/weeklyTimetable';
import { ANNUAL_PLAN_REFERENCE } from '../../data/annualPlanReference';
import { PedagogicalVisitPlanner } from '../dashboard/inspector/PedagogicalVisitPlanner';

interface Dossier {
  card: CardReadModel; academicYearId: string;
  groups: { id: string; name: string; levelId: string; pupilCount: number }[];
  weeklySchedule: WeeklyScheduleSlot[];
  annualPlans: { id: string; levelId: string; kind: string; status: string; updatedAt: string; data: { overrides?: Record<string, AnnualPlanObjectiveOverride> } }[];
  summary: { professionalStatus: string; cardStatus: keyof typeof CARD_STATUS_LABELS; classCount: number; totalPupils: number; weeklyMinutes: number | null };
}
function ReadOnlyAnnualPlan({ plan }: { plan: Dossier['annualPlans'][number] }) {
  const level = resolveAnnualPlanReferenceReadModel(plan.levelId);
  const values = plan.data.overrides || {};
  const display = (key: string, reference: string) => resolveAnnualPlanTeacherValue(key, reference, true, values);
  const presentation = buildAnnualPlanPresentation(level, (domain, grade) => buildDomainPresentation({ ...domain, components: display(`${domain.fieldId}__components`, domain.components), knowledgeResources: display(`${domain.fieldId}__knowledge`, domain.knowledgeResources), transversalResources: display(`${domain.fieldId}__transversal`, domain.transversalResources), evaluationCriteria: display(`${domain.fieldId}__evaluation`, domain.evaluationCriteria), time: display(`${domain.fieldId}__time`, domain.time) }, grade));
  return <section className="space-y-3"><h3 className="font-black">{level.levelName} · {plan.status}</h3><p className="text-xs text-slate-500">من مخطط الأستاذ المحفوظ؛ آخر تحديث {new Date(plan.updatedAt).toLocaleDateString('ar-DZ')}</p><AnnualPlanOfficialTable presentation={presentation} editValues={{ comprehensive: presentation.overallCompetency, domains: {} }} isEditing={false} onDomainChange={() => undefined} /></section>;
}
export function InspectorSupervisionDossier({ teacherId, academicYearId }: { teacherId: string; academicYearId: string }) {
  const [data, setData] = useState<Dossier | null>(null);
  const [tab, setTab] = useState('بطاقة المعلومات');
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [print, setPrint] = useState<CardSnapshot | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const base = `/api/inspector/teachers/${encodeURIComponent(teacherId)}`;
  useEffect(() => { let active = true; setData(null); setError(''); setPrint(null); setSelectedSubmission(''); void cardApi<Dossier>(`${base}/supervision-dossier?academicYearId=${academicYearId}`).then((result) => { if (active) setData(result); }).catch((e: Error) => { if (active) setError(e.message); }); return () => { active = false; }; }, [base, academicYearId]);
  async function review(decision: 'VERIFIED' | 'NEEDS_CORRECTION') {
    if (!data?.card.submission) return;
    setBusy(true); setError('');
    try { const card = await cardApi<CardReadModel>(`${base}/information-card/review`, 'POST', { submissionId: data.card.submission.id, decision, reason }); setData({ ...data, card, summary: { ...data.summary, cardStatus: card.status } }); setReason(''); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function openPrint() {
    setError(''); setBusy(true);
    try { const result = await cardApi<{ snapshot: CardSnapshot }>(`${base}/information-card/print${selectedSubmission === 'current' ? '?view=current' : selectedSubmission ? `?submissionId=${encodeURIComponent(selectedSubmission)}` : ''}`); setPrint(result.snapshot); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!data) return <section className="rounded-2xl border bg-white p-5">{error || 'جارٍ تحميل ملف الإشراف...'}</section>;
  const identity = data.card.current.identity;
  const reviewed = selectedSubmission ? data.card.history.find((row) => row.id === selectedSubmission) : data.card.submission;
  return <section dir="rtl" className="space-y-5">
    <header className="rounded-3xl bg-emerald-900 p-6 text-white"><div className="flex items-center gap-4">{safeCardPhoto(identity.avatar) && <img src={safeCardPhoto(identity.avatar)} alt="" className="h-16 w-16 rounded-2xl object-cover" />}<div><p className="text-xs text-emerald-200">ملف الإشراف الرقمي</p><h2 className="mt-1 text-xl font-black">{identity.firstName} {identity.lastName}</h2><p className="mt-2 text-sm">{identity.institution || 'المؤسسة غير محددة'} · {identity.district || 'المقاطعة غير محددة'}</p></div></div><div className="mt-5 grid gap-3 text-sm md:grid-cols-4"><span>{data.summary.professionalStatus || 'الوضعية غير محددة'}</span><span>النصاب الأسبوعي: {data.summary.weeklyMinutes === null ? 'لم يسجل توقيت أسبوعي' : formatWeeklyMinutes(data.summary.weeklyMinutes)}</span><span>{data.summary.classCount} أفواج · {data.summary.totalPupils} تلميذًا</span><span>البطاقة: {CARD_STATUS_LABELS[data.card.status]}</span></div></header>
    <nav aria-label="أقسام ملف الإشراف" className="flex flex-wrap gap-2">{['بطاقة المعلومات', 'المخطط السنوي', 'التوزيع / الجدول الأسبوعي', 'الأفواج والنصاب'].map((label) => <button key={label} onClick={() => setTab(label)} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === label ? 'bg-emerald-700 text-white' : 'border bg-white text-slate-700'}`}>{label}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {tab !== 'التوزيع / الجدول الأسبوعي' && <PedagogicalVisitPlanner teacherId={teacherId} academicYearId={academicYearId} groups={data.groups} slots={data.weeklySchedule} />}
    {tab === 'بطاقة المعلومات' && <div className="space-y-4"><div className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center gap-3"><h3 className="font-black">بطاقة المعلومات · {CARD_STATUS_LABELS[data.card.status]}</h3><button disabled={busy} onClick={() => void openPrint()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">طباعة بطاقة المعلومات</button><select aria-label="نسخة البطاقة" value={selectedSubmission} onChange={(e) => setSelectedSubmission(e.target.value)} className="rounded-xl border p-2"><option value="">آخر إرسال</option><option value="current">البيانات الحالية</option>{data.card.history.map((row) => <option key={row.id} value={row.id}>الإرسال {row.revision} · {CARD_STATUS_LABELS[row.status]}</option>)}</select></div><p className="mt-3 text-xs text-slate-500">{reviewed ? `نسخة الإرسال ${reviewed.revision} بتاريخ ${new Date(reviewed.submittedAt).toLocaleDateString('ar-DZ')}` : 'لم يرسل الأستاذ البطاقة بعد؛ البيانات الحالية للقراءة فقط.'}</p>
      {data.card.status === 'SUBMITTED' && !selectedSubmission && <div className="mt-4 space-y-3"><label className="block text-sm font-bold">سبب التصحيح<textarea aria-label="سبب التصحيح" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} className="mt-2 w-full rounded-xl border p-3" /></label><div className="flex gap-3"><button disabled={busy} onClick={() => void review('VERIFIED')} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white">تحقيق البطاقة</button><button disabled={busy || !reason.trim()} onClick={() => void review('NEEDS_CORRECTION')} className="rounded-xl bg-amber-100 px-4 py-2 font-bold text-amber-900">طلب التصحيح</button></div></div>}{reviewed?.correctionReason && <p className="mt-3 rounded-xl bg-amber-50 p-3">{reviewed.correctionReason}</p>}</div><InformationCardFields snapshot={reviewed?.snapshot || data.card.current} /></div>}
    {tab === 'المخطط السنوي' && <div className="space-y-6 rounded-2xl border bg-white p-5">{data.annualPlans.length ? data.annualPlans.map((plan) => <ReadOnlyAnnualPlan key={plan.id} plan={plan} />) : <p>لا يوجد مخطط سنوي محفوظ للأستاذ في السنة المختارة.</p>}</div>}
    {tab === 'التوزيع / الجدول الأسبوعي' && <InspectorWeeklyTimetable teacherId={teacherId} academicYearId={academicYearId} />}
    {tab === 'الأفواج والنصاب' && <div className="rounded-2xl border bg-white p-5"><h3 className="font-black">الأفواج والنصاب</h3><p className="my-3 text-sm text-slate-600">النصاب مجموع مدد الحصص الأسبوعية المسجلة للسنة المختارة (وقت النهاية ناقص وقت البداية). العدد من سجل أقسام الأستاذ وتلاميذه؛ دون عرض أسماء أو تقييمات التلاميذ.</p><table className="w-full text-right"><thead><tr><th>الفوج / القسم</th><th>المستوى</th><th>عدد التلاميذ</th></tr></thead><tbody>{data.groups.map((group) => <tr key={group.id} className="border-t"><td className="py-3">{group.name}</td><td>{ANNUAL_PLAN_REFERENCE[group.levelId]?.levelName || 'غير محدد'}</td><td>{group.pupilCount}</td></tr>)}</tbody></table><p className="mt-4 font-bold">المجموع: {data.summary.totalPupils} تلميذًا · {data.summary.weeklyMinutes === null ? 'النصاب غير متوفر' : formatWeeklyMinutes(data.summary.weeklyMinutes)}</p></div>}
    {print && <OfficialInformationCardPrint snapshot={print} onClose={() => setPrint(null)} />}
  </section>;
}
