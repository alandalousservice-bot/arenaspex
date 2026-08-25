import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, XCircle } from 'lucide-react';
import { AdminReportRange, fetchAdminReportsOverview } from '../../services/api';

type Report = any;
const labels: Record<string, string> = {
  teacher: 'أستاذ',
  inspector: 'مفتش',
  director: 'مدير',
  admin: 'مشرف',
  active: 'نشط',
  inactive: 'معطل',
  pending_approval: 'بانتظار التفعيل',
  Pending: 'معلق',
  Active: 'نشط',
  Changed: 'تغير المفتش',
  Removed: 'مزال',
};
function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-purple-700">
        <BarChart3 className="h-4 w-4" />
        {label}
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
export const AdminReportsPage: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [range, setRange] = useState<AdminReportRange>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      setReport(await fetchAdminReportsOverview(range));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل التقارير التشغيلية.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [range]);
  const o = report?.overview;
  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-purple-200">مساحة التحليلات التشغيلية</div>
            <h1 className="mt-1 text-2xl font-black">التقارير التشغيلية</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              بيانات حقيقية من السجلات الحالية للمنصة.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            تحديث البيانات
          </button>
        </div>
      </header>
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="self-center text-slate-500">النطاق الزمني للنشاط:</span>
        {(
          [
            ['7', 'آخر 7 أيام'],
            ['30', 'آخر 30 يوماً'],
            ['year', 'هذه السنة'],
            ['all', 'الكل'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setRange(v)}
            className={
              range === v
                ? 'rounded-xl bg-purple-700 px-3 py-2 text-white'
                : 'rounded-xl bg-white px-3 py-2 text-slate-600 ring-1 ring-slate-200'
            }
          >
            {l}
          </button>
        ))}
      </div>
      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center font-bold text-slate-500">
          جارٍ تحميل التقارير...
        </div>
      )}
      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <XCircle className="mb-2 h-5 w-5" />
          {error}
          <button
            onClick={() => void load()}
            className="mr-3 rounded-lg bg-white px-3 py-1 text-xs font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !error && report && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {[
              ['إجمالي الحسابات', o.totalAccounts],
              ['الحسابات النشطة', o.activeAccounts],
              ['الحسابات المعلقة', o.pendingAccounts],
              ['الأساتذة', o.teachers],
              ['المفتشون', o.inspectors],
              ['المديرون', o.directors],
              ['المقاطعات بدون مفتش', o.uncoveredDistricts],
              ['الإسنادات المعلقة', o.pendingAssignments],
              ['موارد بانتظار الاعتماد', o.moderationPending],
              ['الخدمات المفعلة', o.serviceEnabledAccounts],
            ].map(([l, v]) => (
              <Card key={String(l)} label={String(l)} value={v as number} />
            ))}
          </div>
          <Section title="نظرة عامة">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-black">توزيع الأدوار</h3>
                {Object.entries(report.accounts.roleCounts).map(([k, v]) => (
                  <div className="flex justify-between border-b p-2 text-sm" key={k}>
                    <span>{labels[k] || k}</span>
                    <b>{String(v)}</b>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 font-black">حالة الحسابات</h3>
                {Object.entries(report.accounts.statusCounts).map(([k, v]) => (
                  <div className="flex justify-between border-b p-2 text-sm" key={k}>
                    <span>{labels[k] || k}</span>
                    <b>{String(v)}</b>
                  </div>
                ))}
              </div>
            </div>
          </Section>
          <Section title="الحسابات والمستخدمون">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card label="الأساتذة النشطون المعتمدون" value={report.accounts.activeTeachers} />
              <Card label="الحسابات بانتظار التفعيل" value={report.accounts.pendingAccounts} />
              <Card label="أيام إنشاء الحسابات" value={report.accounts.creationTrend.length} />
            </div>
          </Section>
          <Section title="التغطية التفتيشية">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card label="إجمالي المقاطعات" value={o.districts} />
              <Card label="مقاطعات مغطاة" value={o.coveredDistricts} />
              <Card
                label="مفتشون بلا أساتذة مقبولين"
                value={report.coverage.inspectorsWithoutAcceptedTeachers}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="p-2">المديرية</th>
                    <th className="p-2">المقاطعة</th>
                    <th className="p-2">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.coverage.districts.map((d: any) => (
                    <tr className="border-b" key={d.id}>
                      <td className="p-2">{d.directorate.name}</td>
                      <td className="p-2">{d.name}</td>
                      <td className="p-2 font-bold">
                        {d.covered ? (
                          'مغطاة'
                        ) : (
                          <a href="/admin/inspectors" className="text-rose-700">
                            بدون مفتش
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          <Section title="الإسنادات والمتابعة">
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(report.assignments.statuses).map(([k, v]) => (
                <Card key={k} label={labels[k] || k} value={v as number} />
              ))}
            </div>
            <p className="mt-4 text-sm font-bold text-slate-600">
              أقدم/أحدث قائمة معلقة معروضة بشكل مختصر: {report.assignments.pending.length}.
            </p>
          </Section>
          <Section title="الموارد والاعتمادات">
            <div className="grid gap-6 md:grid-cols-2">
              {(['games', 'situations'] as const).map((type) => (
                <div key={type}>
                  <h3 className="mb-2 font-black">
                    {type === 'games' ? 'الألعاب' : 'المواقف التعليمية'}
                  </h3>
                  {Object.entries(report.moderation[type]).map(([k, v]) => (
                    <div className="flex justify-between border-b p-2 text-sm" key={k}>
                      <span>{k}</span>
                      <b>{String(v)}</b>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
          <Section title="الخدمات المساعدة">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card
                label="الخدمة العامة"
                value={report.services.globalEnabled ? 'مفعلة' : 'متوقفة'}
              />
              <Card label="حسابات مفعلة" value={report.services.enabledAccounts} />
              <Card label="اعتماد شخصي مهيأ" value={report.services.personalCredentialConfigured} />
              <Card label="صلاحية المساعد" value={report.services.assistantEnabled} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              مؤشرات جاهزية وإتاحة فقط؛ لا تعرض أسراراً أو عدد استدعاءات أو تكلفة.
            </p>
          </Section>
          <Section title="النشاط التشغيلي">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {Object.entries(report.activity).map(([k, v]) => (
                <Card
                  key={k}
                  label={
                    (
                      {
                        visits: 'الزيارات',
                        notes: 'ملاحظات المفتشين',
                        directMessages: 'رسائل مباشرة',
                        districtMessages: 'إعلانات المقاطعات',
                        classes: 'الأقسام',
                        students: 'التلاميذ',
                      } as Record<string, string>
                    )[k] || k
                  }
                  value={v as number}
                />
              ))}
            </div>
          </Section>
          <Section title="جودة البيانات">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(report.quality).map(([k, v]) => (
                <div className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm" key={k}>
                  <span>
                    {(
                      {
                        activeTeachersWithoutInstitution: 'أساتذة نشطون بلا مؤسسة',
                        activeTeachersWithoutAcceptedAssignment: 'أساتذة بلا إسناد مقبول',
                        inspectorsWithoutDistrict: 'مفتشون بلا مقاطعة',
                        districtsWithoutInspector: 'مقاطعات بلا مفتش',
                        accountsWithoutPhone: 'حسابات بلا هاتف',
                      } as Record<string, string>
                    )[k] || k}
                  </span>
                  <b>{String(v)}</b>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <a className="rounded-lg bg-slate-100 px-3 py-2" href="/admin/accounts">
                إدارة الحسابات
              </a>
              <a className="rounded-lg bg-slate-100 px-3 py-2" href="/admin/inspectors">
                إدارة التغطية
              </a>
              <a className="rounded-lg bg-slate-100 px-3 py-2" href="/admin/pending-users">
                طلبات التفعيل
              </a>
              <a className="rounded-lg bg-slate-100 px-3 py-2" href="/admin/services">
                إعدادات الخدمات
              </a>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};
