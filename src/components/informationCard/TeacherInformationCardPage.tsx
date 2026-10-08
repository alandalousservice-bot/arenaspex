import React, { useEffect, useState } from 'react';
import { CARD_STATUS_LABELS, type CardReadModel, type CardSnapshot } from '../../types/informationCard';
import { InformationCardFields } from './InformationCardFields';

export async function cardApi<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل البيانات.');
  return data as T;
}
export function TeacherInformationCardPage() {
  const [card, setCard] = useState<CardReadModel | null>(null);
  const [snapshot, setSnapshot] = useState<CardSnapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const apply = (data: CardReadModel) => { setCard(data); setSnapshot(data.current); setDirty(false); };
  useEffect(() => { let active = true; void cardApi<CardReadModel>('/api/teacher/information-card').then((data) => { if (active) apply(data); }).catch((e: Error) => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function action(submit: boolean) {
    if (!card || !snapshot) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = submit ? await cardApi<CardReadModel>('/api/teacher/information-card/submit', 'POST', { revision: card.revision }) : await cardApi<CardReadModel>('/api/teacher/information-card', 'PUT', { revision: card.revision, identity: { firstName: snapshot.identity.firstName, lastName: snapshot.identity.lastName, birthDate: snapshot.identity.birthDate, phone: snapshot.identity.phone }, extra: snapshot.extra });
      apply(data); setNotice(submit ? 'أُرسلت البطاقة إلى مفتشك الحالي للمراجعة.' : 'حُفظت مسودتك.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div dir="rtl" className="space-y-5 p-4 md:p-6">
    <header className="rounded-3xl bg-emerald-800 p-6 text-white"><p className="text-xs text-emerald-200">الملف المهني للأستاذ</p><h1 className="mt-2 text-2xl font-black">بطاقة المعلومات</h1><p className="mt-2 text-sm">بياناتك الشخصية والمهنية، مع مراجعة مفتشك الحالي.</p>{card && <span className="mt-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-bold">{CARD_STATUS_LABELS[card.status]} · المسودة {card.revision}</span>}</header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {card?.status === 'NEEDS_CORRECTION' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">سبب التصحيح: {card.submission?.correctionReason}</p>}
    {card && snapshot ? <>
      {card.status === 'SUBMITTED' && <p className="rounded-xl bg-blue-50 p-4 text-blue-900">الإرسال محفوظ ولا يمكن تعديله أثناء المراجعة.</p>}
      {card.missingRequired.length > 0 && <p className="rounded-xl bg-slate-100 p-4 text-sm">حقول مطلوبة قبل الإرسال: {card.missingRequired.join('، ')}</p>}
      <InformationCardFields snapshot={snapshot} onChange={card.status === 'SUBMITTED' ? undefined : (value) => { setSnapshot(value); setDirty(true); setNotice(''); }} />
      {card.status !== 'SUBMITTED' && <div className="sticky bottom-2 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"><button disabled={busy} onClick={() => void action(false)} className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">حفظ المسودة</button><button disabled={busy || dirty || card.revision === 0 || card.status === 'VERIFIED'} onClick={() => void action(true)} className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-40">{card.status === 'NEEDS_CORRECTION' ? 'إعادة الإرسال للمفتش' : 'إرسال للمفتش'}</button>{dirty && <span className="self-center text-xs text-slate-500">احفظ التعديلات قبل الإرسال.</span>}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">سجل الإرسالات</h2>{card.history.length ? card.history.map((row) => <details key={row.id} className="mt-3 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer font-bold">الإرسال {row.revision} · {CARD_STATUS_LABELS[row.status]} · {new Date(row.submittedAt).toLocaleDateString('ar-DZ')}</summary><p className="my-2 text-sm">{row.correctionReason}</p><InformationCardFields snapshot={row.snapshot} /></details>) : <p className="mt-3 text-sm text-slate-500">لم تُرسل البطاقة بعد.</p>}</section>
    </> : !error && <p>جارٍ تحميل بطاقتك...</p>}
  </div>;
}
