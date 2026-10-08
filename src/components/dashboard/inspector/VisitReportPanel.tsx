import React, { useEffect, useState } from 'react';
import { cardApi } from '../../informationCard/TeacherInformationCardPage';
import {
  DECISION_LABELS,
  GUIDANCE_SECTIONS,
  TENURE_SECTIONS,
  type ReportContent,
  type ReportDocument,
  type ReportRead,
  type PracticalLesson,
} from '../../../types/visitReport';
import { VisitReportPrint } from './VisitReportPrint';
export function VisitReportPanel({ visitId, onClose }: { visitId: string; onClose: () => void }) {
  const [data, setData] = useState<ReportRead | null>(null);
  const [content, setContent] = useState<ReportContent>({});
  const [mark, setMark] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const url = `/api/pedagogical-visits/${encodeURIComponent(visitId)}/report`;
  function accept(value: ReportRead) {
    setData(value);
    setContent(value.report?.content || {});
    setMark(
      value.report?.mark === null || value.report?.mark === undefined
        ? ''
        : String(value.report.mark)
    );
    setDirty(false);
  }
  async function refresh() {
    accept(await cardApi<ReportRead>(url));
  }
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    void cardApi<ReportRead>(url)
      .then((value) => {
        if (active) accept(value);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [url]);
  async function action(kind: 'create' | 'save' | 'finalize' | 'share') {
    setBusy(true);
    setError('');
    try {
      if (kind === 'create') await cardApi(url, 'POST', {});
      else if (data?.report)
        await cardApi(
          `/api/visit-reports/${encodeURIComponent(data.report.id)}/${kind}`,
          'POST',
          kind === 'save'
            ? { revision: data.report.revision, content, mark: mark === '' ? null : Number(mark) }
            : { revision: data.report.revision }
        );
      setConfirmFinal(false);
      setConfirmShare(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function change(key: string, value: ReportContent[string]) {
    setContent((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  }
  const report = data?.report;
  const lessons = content.practicalLessons || [];
  const edit = !!data?.canEdit && !busy;
  const sections = report?.reportType === 'TENURE' ? TENURE_SECTIONS : GUIDANCE_SECTIONS;
  function editLesson(index: number, key: keyof PracticalLesson, value: string) {
    change(
      'practicalLessons',
      lessons.map((lesson, i) => (i === index ? { ...lesson, [key]: value } : lesson))
    );
  }
  return (
    <section dir="rtl" className="space-y-5 rounded-2xl border bg-white p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">
          {report?.reportType === 'TENURE' ? 'محضر التثبيت' : 'التقرير التربوي'}
          {report && (
            <span className="mr-3 text-sm text-emerald-700">
              {report.status === 'DRAFT' ? 'مسودة' : 'نهائي / معتمد'}
            </span>
          )}
        </h2>
        <button onClick={onClose} disabled={busy}>
          رجوع إلى الزيارات
        </button>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {!data && !error && <p>جارٍ تحميل التقرير...</p>}
      {data?.unsupported && (
        <p>نموذج التقرير الرسمي لزيارة المراقبة غير مهيأ بعد. تبقى الزيارة وسجلها متاحين.</p>
      )}
      {data && !report && data.canCreate && (
        <button
          disabled={busy}
          onClick={() => void action('create')}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
        >
          إنشاء مسودة التقرير
        </button>
      )}
      {data && !report && !data.canCreate && !data.unsupported && (
        <p>لا يوجد تقرير؛ إنشاؤه متاح لمن أنجز الزيارة ضمن الإسناد الحالي.</p>
      )}
      {report && (
        <>
          <p className="text-sm text-slate-500">
            {data?.canEdit
              ? 'الحفظ يبقي التقرير مسودة. الاعتماد إجراء مستقل ويثبت بيانات الوثيقة.'
              : 'عرض للقراءة فقط؛ لا يمكن تعديل التقرير هنا.'}{' '}
            لا ينشر التقرير تلقائيًا للأستاذ.
          </p>
          {report.status === 'FINAL' && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
              {report.sharedWithTeacherAt ? (
                <>
                  <p className="font-bold">
                    {report.teacherAcknowledgedAt
                      ? 'اطلع الأستاذ على التقرير'
                      : 'تم الإرسال — في انتظار اطلاع الأستاذ'}
                  </p>
                  <p>
                    تاريخ الإرسال:{' '}
                    <bdi>{new Date(report.sharedWithTeacherAt).toLocaleString('ar-DZ')}</bdi>
                  </p>
                  {report.teacherAcknowledgedAt && (
                    <p>
                      تاريخ الاطلاع:{' '}
                      <bdi>{new Date(report.teacherAcknowledgedAt).toLocaleString('ar-DZ')}</bdi>
                    </p>
                  )}
                </>
              ) : (
                <p>
                  {data.canShare
                    ? 'لم يرسل للأستاذ'
                    : 'لم يرسل للأستاذ؛ الإرسال متاح لصاحب التقرير ضمن الإسناد الحالي فقط.'}
                </p>
              )}
            </div>
          )}
          {data?.context && (
            <div className="grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <p>الأستاذ: {data.context.teacher.name}</p>
              <p>المؤسسة: {data.context.location.school}</p>
              <p>المفتش: {data.context.inspector.name}</p>
              <p>
                تاريخ الزيارة: <bdi>{data.context.visit.date}</bdi>
              </p>
              <p>المقاطعة: {data.context.location.district}</p>
              <p>
                السنة الدراسية: <bdi>{data.context.visit.academicYear}</bdi>
              </p>
            </div>
          )}
          {report.reportType === 'TENURE' && (
            <fieldset disabled={!edit} className="space-y-3 rounded-xl border p-4">
              <legend className="px-2 font-bold">
                الاختبار التطبيقي — التربية البدنية والرياضية
              </legend>
              <p>حصة واحدة أو حصتان؛ لا توجد علامة منفصلة لكل حصة.</p>
              {lessons.map((lesson, index) => (
                <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                  {(['level', 'className', 'domain', 'objective'] as const).map((key) => (
                    <label key={key}>
                      {
                        {
                          level: 'المستوى',
                          className: 'القسم/الفوج',
                          domain: 'الميدان',
                          objective: 'هدف الحصة',
                        }[key]
                      }
                      <input
                        aria-label={`الحصة ${index + 1}: ${{ level: 'المستوى', className: 'القسم/الفوج', domain: 'الميدان', objective: 'هدف الحصة' }[key]}`}
                        value={lesson[key]}
                        maxLength={key === 'objective' ? 500 : key === 'domain' ? 200 : 100}
                        onChange={(e) => editLesson(index, key, e.target.value)}
                        className="mt-1 block w-full rounded-lg border p-2"
                      />
                    </label>
                  ))}
                  {edit && (
                    <button
                      type="button"
                      onClick={() =>
                        change(
                          'practicalLessons',
                          lessons.filter((_, i) => i !== index)
                        )
                      }
                    >
                      حذف الحصة من المسودة
                    </button>
                  )}
                </div>
              ))}
              {edit && lessons.length < 2 && (
                <button
                  onClick={() =>
                    change('practicalLessons', [
                      ...lessons,
                      { level: '', className: '', domain: '', objective: '' },
                    ])
                  }
                  className="rounded-lg border px-4 py-2"
                >
                  إضافة حصة عملية
                </button>
              )}
            </fieldset>
          )}
          {sections.map((section) => (
            <fieldset
              key={section.title}
              disabled={!edit}
              className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"
            >
              <legend className="px-2 font-bold">{section.title}</legend>
              {section.fields.map(([key, label, kind]) => (
                <label key={key} className={kind === 'long' ? 'sm:col-span-2' : ''}>
                  {label}
                  {kind === 'long' ? (
                    <textarea
                      aria-label={label}
                      value={String(content[key] ?? '')}
                      maxLength={5000}
                      rows={4}
                      onChange={(e) => change(key, e.target.value)}
                      className="mt-1 block w-full rounded-lg border p-3"
                    />
                  ) : (
                    <input
                      aria-label={label}
                      type={kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'}
                      value={String(content[key] ?? '')}
                      maxLength={300}
                      onChange={(e) =>
                        change(
                          key,
                          kind === 'number'
                            ? e.target.value === ''
                              ? null
                              : Number(e.target.value)
                            : e.target.value
                        )
                      }
                      className="mt-1 block w-full rounded-lg border p-3"
                    />
                  )}
                </label>
              ))}
            </fieldset>
          ))}
          <label className="block">
            {report.reportType === 'TENURE' ? 'العلامة النهائية /20' : 'العلامة بالأرقام'}
            <input
              aria-label="علامة التقرير"
              type="number"
              min={0}
              max={20}
              step="0.01"
              disabled={!edit}
              value={mark}
              onChange={(e) => {
                setMark(e.target.value);
                setDirty(true);
              }}
              className="mt-2 block rounded-lg border p-3"
            />
          </label>
          {report.reportType === 'TENURE' && (
            <label className="block">
              قرار اللجنة
              <select
                aria-label="قرار اللجنة"
                disabled={!edit}
                value={content.decision || ''}
                onChange={(e) => {
                  const decision = e.target.value as ReportContent['decision'];
                  if (decision) change('decision', decision);
                  else {
                    const { decision: _decision, ...rest } = content;
                    void _decision;
                    setContent(rest);
                    setDirty(true);
                  }
                }}
                className="mt-2 block rounded-lg border p-3"
              >
                <option value="">لم يحدد</option>
                {Object.entries(DECISION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            {data?.canEdit && (
              <>
                <button
                  disabled={busy}
                  onClick={() => void action('save')}
                  className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
                >
                  حفظ المسودة
                </button>
                <button
                  disabled={busy || dirty}
                  onClick={() => setConfirmFinal(true)}
                  className="rounded-xl border px-4 py-3 font-bold"
                >
                  اعتماد التقرير نهائيًا
                </button>
                <button
                  disabled={busy}
                  onClick={() => void refresh().catch((e: Error) => setError(e.message))}
                  className="rounded-xl border px-4 py-3"
                >
                  إعادة تحميل المحفوظ
                </button>
              </>
            )}
            {data?.canShare && report.status === 'FINAL' && !report.sharedWithTeacherAt && (
              <button
                disabled={busy || dirty}
                onClick={() => setConfirmShare(true)}
                className="rounded-xl bg-violet-700 px-4 py-3 font-bold text-white"
              >
                إرسال التقرير إلى الأستاذ
              </button>
            )}
            {data?.context && (
              <button
                disabled={busy || dirty}
                onClick={() => setPreview(true)}
                className="rounded-xl border px-4 py-3"
              >
                معاينة الطباعة A4
              </button>
            )}
          </div>
          {dirty && (
            <p className="text-sm text-amber-800">احفظ المسودة قبل المعاينة أو الاعتماد.</p>
          )}
          {confirmFinal && (
            <div
              role="dialog"
              aria-label="تأكيد الاعتماد"
              className="space-y-3 rounded-xl border bg-amber-50 p-4"
            >
              <p>
                سيثبت الاعتماد بيانات الوثيقة ومحتواها. لن يكون التعديل متاحًا بعده، ولن ينشر
                التقرير للأستاذ.
              </p>
              <button
                disabled={busy}
                onClick={() => void action('finalize')}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-white"
              >
                تأكيد الاعتماد النهائي
              </button>
              <button disabled={busy} onClick={() => setConfirmFinal(false)} className="mr-3">
                رجوع
              </button>
            </div>
          )}
          {confirmShare && (
            <div
              role="dialog"
              aria-label="تأكيد إرسال التقرير"
              aria-modal="true"
              className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4"
            >
              <p>
                هل تؤكد إرسال هذا التقرير النهائي إلى الأستاذ؟ سيصبح متاحًا له للقراءة والطباعة، ولا
                يمكن سحبه بعد الإرسال.
              </p>
              <button
                disabled={busy}
                onClick={() => void action('share')}
                className="rounded-lg bg-violet-700 px-4 py-2 font-bold text-white"
              >
                تأكيد الإرسال
              </button>
              <button disabled={busy} onClick={() => setConfirmShare(false)} className="mr-3">
                إلغاء
              </button>
            </div>
          )}
          {preview && data?.context && (
            <VisitReportPrint
              report={report as ReportDocument}
              context={data.context}
              onClose={() => setPreview(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
