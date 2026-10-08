import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReportContext, ReportDocument } from '../../types/visitReport';
import { cardApi } from '../informationCard/TeacherInformationCardPage';
import { VisitReportPrint } from '../dashboard/inspector/VisitReportPrint';

interface SharedReport {
  report: ReportDocument;
  context: ReportContext;
}
const title = (report: ReportDocument) =>
  report.reportType === 'TENURE' ? 'محضر التثبيت' : 'التقرير التربوي';
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export function TeacherVisitReportsPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('reportId');
  const [reports, setReports] = useState<SharedReport[]>([]);
  const [selected, setSelected] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAck, setConfirmAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    const result = await cardApi<{ reports: SharedReport[] }>('/api/teacher/visit-reports');
    setReports(result.reports || []);
    if (selectedId) {
      const current = await cardApi<SharedReport>(
        `/api/teacher/visit-reports/${encodeURIComponent(selectedId)}`
      );
      setSelected(current);
    } else setSelected(null);
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void load()
      .catch((reason: Error) => {
        if (active) {
          setSelected(null);
          setError(reason.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function acknowledge() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      await cardApi(
        `/api/teacher/visit-reports/${encodeURIComponent(selected.report.id)}/acknowledge`,
        'POST',
        {}
      );
      setConfirmAck(false);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl min-w-0 space-y-5 overflow-x-hidden">
      <header className="rounded-3xl bg-gradient-to-l from-emerald-800 to-teal-700 p-6 text-white">
        <p className="text-sm text-emerald-100">الوثائق التي أرسلها مفتش المادة إلى حسابك</p>
        <h1 className="mt-1 text-2xl font-black">تقاريري</h1>
        <p className="mt-2 text-sm">
          التقارير هنا نسخ نهائية للقراءة والطباعة، ولا يتأثر محتواها بتحديث بيانات الملف.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </p>
      )}
      {loading ? (
        <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقارير المرسلة…</p>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
          <section
            className="min-w-0 space-y-3 rounded-2xl border bg-white p-4"
            aria-label="التقارير المرسلة"
          >
            <h2 className="font-black">التقارير المرسلة ({reports.length})</h2>
            {reports.length ? (
              reports.map(({ report, context }) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setParams({ reportId: report.id })}
                  className={`block w-full min-w-0 rounded-xl border p-3 text-right ${selectedId === report.id ? 'border-emerald-600 bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <strong className="block">{title(report)}</strong>
                  <span className="mt-1 block break-words text-sm">
                    {context.teacher.name} · {context.location.school}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    زيارة {context.visit.date} · أرسل في {date(report.sharedWithTeacherAt)}
                  </span>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs">
                    {report.teacherAcknowledgedAt ? 'تم الاطلاع' : 'بانتظار تأكيد الاطلاع'}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-600">لا توجد تقارير أرسلها المفتش إلى حسابك بعد.</p>
            )}
          </section>
          <section className="min-w-0 space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
            {!selected ? (
              <p className="py-10 text-center text-slate-600">اختر تقريرًا من القائمة لقراءته.</p>
            ) : (
              <>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{title(selected.report)}</h2>
                    <p className="mt-1 break-words text-sm text-slate-600">
                      المفتش: {selected.context.inspector.name} · {selected.context.location.school}
                    </p>
                    <p className="text-sm text-slate-500">
                      تاريخ الإرسال: {date(selected.report.sharedWithTeacherAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPrinting(true)}
                    className="rounded-xl border px-4 py-2 font-bold"
                  >
                    معاينة وطباعة A4
                  </button>
                </div>
                <div
                  className={`rounded-xl p-4 text-sm ${selected.report.teacherAcknowledgedAt ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}
                >
                  {selected.report.teacherAcknowledgedAt ? (
                    <>
                      <strong>تم الاطلاع</strong>
                      <p>وقت التأكيد: {date(selected.report.teacherAcknowledgedAt)}</p>
                    </>
                  ) : (
                    <>
                      <p>لم يتم تأكيد الاطلاع بعد. فتح التقرير أو طباعته لا يسجل إقرارًا.</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmAck(true)}
                        className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white"
                      >
                        تأكيد الاطلاع
                      </button>
                    </>
                  )}
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p>التقرير نهائي للقراءة فقط، ولا يمكن تعديله من حساب الأستاذ.</p>
                  <p className="mt-1">
                    العلامة:{' '}
                    <bdi>{selected.report.mark === null ? 'غير محددة' : selected.report.mark}</bdi>
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {confirmAck && selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد الاطلاع"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6">
            <h2 className="text-lg font-black">تأكيد الاطلاع</h2>
            <p>هل تؤكد أنك اطلعت على التقرير؟ سيُحفظ وقت التأكيد في سجل التقرير.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void acknowledge()}
                className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white"
              >
                تأكيد الاطلاع
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmAck(false)}
                className="rounded-xl border px-4 py-2"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}
      {printing && selected && (
        <VisitReportPrint
          report={selected.report}
          context={selected.context}
          onClose={() => setPrinting(false)}
        />
      )}
    </main>
  );
}
