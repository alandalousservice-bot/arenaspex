import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  AdminModerationItem,
  fetchAdminModerationOverview,
  reviewAdminModerationItem,
} from '../../services/api';

const typeLabels = { game: 'الألعاب التربوية', situation: 'المواقف التربوية' } as const;
const statusLabels = {
  PENDING_APPROVAL: 'بانتظار المراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
} as const;
const fieldLabels: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
  f_structure: 'الهيكلة والبناء',
};

export const AdminApprovalsPage: React.FC = () => {
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof fetchAdminModerationOverview>
  > | null>(null);
  const [selected, setSelected] = useState<AdminModerationItem | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | AdminModerationItem['resourceType']>('all');
  const [status, setStatus] = useState<AdminModerationItem['status'] | 'all'>('PENDING_APPROVAL');
  const [role, setRole] = useState('all');
  const [reviewer, setReviewer] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const next = await fetchAdminModerationOverview();
      setOverview(next);
      setSelected((current) =>
        current
          ? next.items.find(
              (item) => item.id === current.id && item.resourceType === current.resourceType
            ) || null
          : null
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل مركز اعتمادات الموارد.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      (overview?.items || [])
        .filter((item) => {
          const haystack = [
            item.title,
            item.summary,
            item.submitter?.name,
            item.submitter?.email,
            item.objectiveText,
            item.fieldName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          return (
            (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase())) &&
            (type === 'all' || item.resourceType === type) &&
            (status === 'all' || item.status === status) &&
            (role === 'all' || item.submitter?.role === role) &&
            (reviewer === 'all' ||
              (reviewer === 'reviewed' ? Boolean(item.reviewer) : !item.reviewer))
          );
        })
        .sort((a, b) =>
          sort === 'newest'
            ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        ),
    [overview, query, type, status, role, reviewer, sort]
  );
  const review = async (action: 'approve' | 'reject') => {
    if (!selected || selected.status !== 'PENDING_APPROVAL' || saving) return;
    const reason = action === 'reject' ? window.prompt('سبب الرفض (إلزامي):')?.trim() || '' : '';
    if (action === 'reject' && !reason) return;
    if (
      action === 'approve' &&
      !window.confirm('اعتماد هذا المورد ونشره حسب قواعد المحتوى الحالية؟')
    )
      return;
    setSaving(true);
    setMessage('');
    try {
      await reviewAdminModerationItem(selected.id, selected.resourceType, action, reason);
      setMessage(
        action === 'approve' ? 'تم اعتماد المورد وتحديث القائمة.' : 'تم رفض المورد وحفظ سبب الرفض.'
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر تنفيذ المراجعة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="workspace-page workspace-page--admin space-y-6">
      <header className="workspace-hero rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-200">
              <FileCheck2 className="h-5 w-5" />
              <span className="text-xs font-bold">المراجعة المركزية للمحتوى المرسل</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">مركز اعتمادات الموارد</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              الألعاب التربوية والمواقف التربوية التي تمر فعلياً بدورة اعتماد.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>
      {message && (
        <div className="rounded-2xl bg-purple-50 p-3 text-sm font-bold text-purple-800">
          {message}
        </div>
      )}
      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
          جارٍ تحميل الموارد...
        </div>
      )}
      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <AlertCircle className="mb-2 h-5 w-5" />
          {error}
          <button
            onClick={() => void load()}
            className="mr-3 rounded-lg bg-white px-3 py-1 text-xs font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !error && overview && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary
              label="بانتظار المراجعة"
              value={overview.counts.pending}
              icon={<Clock3 className="h-4 w-4" />}
              tone="amber"
            />
            <Summary
              label="معتمدة"
              value={overview.counts.approved}
              icon={<CheckCircle2 className="h-4 w-4" />}
              tone="emerald"
            />
            <Summary
              label="مرفوضة"
              value={overview.counts.rejected}
              icon={<XCircle className="h-4 w-4" />}
              tone="rose"
            />
            <Summary
              label="إجمالي العناصر"
              value={overview.counts.total}
              icon={<FileCheck2 className="h-4 w-4" />}
              tone="purple"
            />
          </section>
          <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="grid gap-2 md:grid-cols-6">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث بالعنوان أو المرسل أو الهدف"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-xs outline-none focus:border-purple-500"
                />
              </div>
              <Filter
                value={type}
                onChange={(v) => setType(v as typeof type)}
                options={['all', 'game', 'situation']}
                labels={['كل الأنواع', 'الألعاب التربوية', 'المواقف التربوية']}
              />
              <Filter
                value={status}
                onChange={(v) => setStatus(v as typeof status)}
                options={['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'all']}
                labels={['بانتظار المراجعة', 'معتمد', 'مرفوض', 'كل الحالات']}
              />
              <Filter
                value={role}
                onChange={setRole}
                options={['all', 'teacher', 'inspector']}
                labels={['كل أدوار المرسلين', 'أستاذ', 'مفتش']}
              />
              <Filter
                value={reviewer}
                onChange={setReviewer}
                options={['all', 'reviewed', 'unreviewed']}
                labels={['كل المراجعين', 'تمت مراجعته', 'بلا مراجع']}
              />
              <Filter
                value={sort}
                onChange={(v) => setSort(v as typeof sort)}
                options={['newest', 'oldest']}
                labels={['الأحدث أولاً', 'الأقدم أولاً']}
              />
            </div>
          </section>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
            <section className="space-y-3">
              {visible.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">
                  {status === 'PENDING_APPROVAL'
                    ? 'لا توجد موارد بانتظار المراجعة.'
                    : status === 'APPROVED'
                      ? 'لا توجد موارد معتمدة ضمن هذا التصنيف.'
                      : status === 'REJECTED'
                        ? 'لا توجد موارد مرفوضة ضمن هذا التصنيف.'
                        : 'لا توجد موارد مطابقة.'}
                </div>
              ) : (
                visible.map((item) => (
                  <button
                    key={`${item.resourceType}:${item.id}`}
                    onClick={() => setSelected(item)}
                    className={`w-full rounded-2xl border p-4 text-right transition ${selected?.id === item.id && selected.resourceType === item.resourceType ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-black text-purple-700">
                          {typeLabels[item.resourceType]}
                        </span>
                        <h2 className="mt-1 font-black text-slate-900">{item.title}</h2>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                          {item.summary || 'لا يوجد ملخص محفوظ.'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
                      <span>المرسل: {item.submitter?.name || 'غير محدد'}</span>
                      <span>التاريخ: {new Date(item.submittedAt).toLocaleDateString('ar-DZ')}</span>
                      {item.grade ? <span>السنة: {item.grade}</span> : null}
                    </div>
                  </button>
                ))
              )}
            </section>
            <ReviewPanel item={selected} saving={saving} onReview={review} />
          </div>
        </>
      )}
    </div>
  );
};

const ReviewPanel: React.FC<{
  item: AdminModerationItem | null;
  saving: boolean;
  onReview: (action: 'approve' | 'reject') => void;
}> = ({ item, saving, onReview }) =>
  !item ? (
    <aside className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
      اختر مورداً لعرض تفاصيل المراجعة.
    </aside>
  ) : (
    <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-purple-600" />
        <h2 className="text-lg font-black">تفاصيل المراجعة</h2>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <Info label="النوع" value={typeLabels[item.resourceType]} />
        <Info label="العنوان" value={item.title} />
        <Info
          label="المرسل"
          value={item.submitter ? `${item.submitter.name} — ${item.submitter.email}` : 'غير محدد'}
        />
        <Info label="الحالة" value={statusLabels[item.status]} />
        <Info
          label="السنة / المجال"
          value={`${item.grade || 'غير محدد'} — ${item.fieldName || fieldLabels[item.fieldId || ''] || 'غير محدد'}`}
        />
        <Info label="الهدف" value={item.objectiveText || 'غير محدد'} />
        <Info
          label="المحتوى"
          value={Object.entries(item.details)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(
              ([key, value]) => `${key}: ${Array.isArray(value) ? value.join('، ') : String(value)}`
            )
            .join('\n')}
        />
        {item.reviewer && (
          <Info
            label="المراجع"
            value={`${item.reviewer.name} — ${item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('ar-DZ') : 'التاريخ غير محفوظ'}`}
          />
        )}
        {item.rejectionReason && <Info label="سبب الرفض" value={item.rejectionReason} />}
      </div>
      {item.status === 'PENDING_APPROVAL' && (
        <div className="mt-5 flex gap-2">
          <button
            disabled={saving}
            onClick={() => onReview('approve')}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'اعتماد'}
          </button>
          <button
            disabled={saving}
            onClick={() => onReview('reject')}
            className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            رفض
          </button>
        </div>
      )}
    </aside>
  );
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border-b border-slate-100 pb-2">
    <dt className="text-xs font-bold text-slate-400">{label}</dt>
    <dd className="mt-1 whitespace-pre-wrap font-bold text-slate-700">{value}</dd>
  </div>
);
const Filter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels: string[];
}> = ({ value, onChange, options, labels }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
  >
    {options.map((option, index) => (
      <option key={option} value={option}>
        {labels[index]}
      </option>
    ))}
  </select>
);
const Summary: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'amber' | 'emerald' | 'rose' | 'purple';
}> = ({ label, value, icon, tone }) => (
  <div
    className={`rounded-2xl border p-4 ${tone === 'amber' ? 'border-amber-200 bg-amber-50' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : tone === 'rose' ? 'border-rose-200 bg-rose-50' : 'border-purple-200 bg-purple-50'}`}
  >
    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-3xl font-black text-slate-900">{value}</div>
  </div>
);
