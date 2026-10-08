import React, { useEffect, useState } from 'react';

export const InspectorTransferPanel: React.FC<{ onAccepted: () => void }> = ({ onAccepted }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [archive, setArchive] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const load = async () => {
    try {
      const r = await fetch('/api/inspector/transfers');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'تعذر تحميل طلبات النقل.');
      setTransfers(data.transfers || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاتصال.');
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const decide = async (id: string, decision: 'accept' | 'reject') => {
    setBusy(id);
    try {
      const r = await fetch(`/api/inspector/transfers/${encodeURIComponent(id)}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasons[id] || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'تعذر البت في طلب النقل.');
      await load();
      if (decision === 'accept') onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاتصال.');
    } finally {
      setBusy('');
    }
  };
  const openArchive = async () => {
    if (archive) return setArchive(null);
    try {
      const r = await fetch('/api/inspector/archive');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'تعذر تحميل الأرشيف.');
      setArchive(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاتصال.');
    }
  };
  return (
    <section dir="rtl" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-slate-900">طلبات النقل الواردة ({transfers.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold"
          >
            تحديث طلبات النقل
          </button>
          <button
            onClick={() => void openArchive()}
            className="rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700"
          >
            {archive ? 'إغلاق الأرشيف' : 'أرشيف إشرافي السابق'}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-600">
        يبقى الأستاذ تحت إشراف المفتش الحالي حتى قبولك النقل. الرفض لا يغيّر انتسابه.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {transfers.map((t) => (
        <article
          key={t.id}
          className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <h4 className="font-black">{t.snapshot.teacherName}</h4>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>المؤسسة الحالية: {t.snapshot.institutionName || 'غير محددة'}</div>
            <div>المفتش الحالي: {t.snapshot.sourceInspectorName}</div>
            <div>المقاطعة الحالية: {t.snapshot.sourceDistrictName}</div>
            <div>المقاطعة الوجهة: {t.snapshot.destinationDistrictName}</div>
            <div>تاريخ الطلب: {new Date(t.requestedAt).toLocaleDateString('ar-DZ')}</div>
          </dl>
          <textarea
            aria-label={`سبب رفض نقل ${t.snapshot.teacherName}`}
            placeholder="سبب الرفض (اختياري)"
            maxLength={1000}
            value={reasons[t.id] || ''}
            onChange={(e) => setReasons({ ...reasons, [t.id]: e.target.value })}
            className="w-full rounded-xl border border-slate-200 p-2 text-xs"
          />
          <div className="flex gap-2">
            <button
              disabled={busy === t.id}
              onClick={() => void decide(t.id, 'accept')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              قبول النقل
            </button>
            <button
              disabled={busy === t.id}
              onClick={() => void decide(t.id, 'reject')}
              className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"
            >
              رفض النقل
            </button>
          </div>
        </article>
      ))}
      {archive && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <h3 className="font-black">أرشيف إشرافي السابق — للقراءة فقط</h3>
          <p className="text-xs text-slate-500">
            يعرض سجلاتك التاريخية وبيانات الانتساب وقت النقل. لا يفتح ملف الأستاذ الحالي.
          </p>
          {archive.transfers.length === 0 && (
            <p className="text-sm text-slate-500">لا توجد سجلات نقل مكتملة في أرشيفك.</p>
          )}
          {archive.transfers.map((t: any) => (
            <article key={t.id} className="rounded-xl bg-slate-50 p-3 text-xs">
              <b>{t.snapshot.teacherName}</b> — {t.snapshot.sourceDistrictName} ←{' '}
              {t.snapshot.destinationDistrictName}
              <p>
                قبول المفتش الوجهة: {t.snapshot.destinationInspectorName} —{' '}
                {new Date(t.effectiveAt).toLocaleString('ar-DZ')}
              </p>
            </article>
          ))}
          {[
            ...archive.visits.map((v: any) => ({ ...v, kind: 'زيارة / تقرير' })),
            ...archive.notes.map((n: any) => ({ ...n, kind: 'توجيه / ملاحظة' })),
          ].map((r: any) => (
            <details key={`${r.kind}-${r.id}`} className="rounded-xl border border-slate-200 p-3">
              <summary className="cursor-pointer text-xs font-bold">
                {r.kind} — {new Date(r.createdAt).toLocaleDateString('ar-DZ')}
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                <p>
                  {r.data.visitType || r.data.title || ''} {r.data.visitDate || ''}
                </p>
                <p>
                  {r.data.lessonObservedTitle ||
                    r.data.content ||
                    r.data.message ||
                    r.data.note ||
                    ''}
                </p>
                {r.data.pedagogicalGrade != null && (
                  <p>العلامة البيداغوجية: {r.data.pedagogicalGrade} / 20</p>
                )}
                {['positivePoints', 'areasForImprovement', 'recommendations'].map(
                  (field, index) =>
                    Array.isArray(r.data[field]) &&
                    r.data[field].length > 0 && (
                      <div key={field}>
                        <b>{['نقاط إيجابية', 'جوانب للتحسين', 'توصيات'][index]}</b>
                        <ul className="list-inside list-disc">
                          {r.data[field].map((text: string, i: number) => (
                            <li key={i}>{text}</li>
                          ))}
                        </ul>
                      </div>
                    )
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
};
