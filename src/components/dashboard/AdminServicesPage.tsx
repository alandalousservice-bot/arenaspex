import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TestTube2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminGenerationAccount,
  fetchAdminGenerationOverview,
  testGenerationAccess,
  testPlatformFallback,
  updateGenerationAccess,
  updateGenerationConfig,
} from '../../services/api';

const roleLabels: Record<string, string> = {
  teacher: 'أستاذ',
  inspector: 'مفتش',
  director: 'مدير',
  admin: 'مشرف',
};
const statusLabel = (account: AdminGenerationAccount) =>
  account.status === 'active' && account.isApprovedByAdmin
    ? 'نشط'
    : account.status === 'inactive'
      ? 'معطل'
      : 'بانتظار التفعيل';
const resultLabel = (success: boolean, message: string) =>
  success
    ? `نجح الاتصال — ${message}`
    : message.includes('مفتاح')
      ? message
      : `الخدمة غير متاحة حالياً — ${message}`;

export const AdminServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof fetchAdminGenerationOverview>
  > | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [credentialFilter, setCredentialFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setOverview(await fetchAdminGenerationOverview());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل حالة الخدمات.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const selectedId = searchParams.get('userId') || '';
  const accounts = useMemo(
    () =>
      (overview?.accounts || []).filter((account) => {
        const text =
          `${account.firstName} ${account.lastName} ${account.email}`.toLocaleLowerCase();
        const status = statusLabel(account);
        return (
          (!query.trim() || text.includes(query.trim().toLocaleLowerCase())) &&
          (statusFilter === 'all' || status === statusFilter) &&
          (roleFilter === 'all' || account.role === roleFilter) &&
          (accessFilter === 'all' ||
            (account.access?.enabled ? 'enabled' : 'disabled') === accessFilter) &&
          (credentialFilter === 'all' ||
            (account.access?.keyConfigured ? 'configured' : 'missing') === credentialFilter)
        );
      }),
    [overview, query, statusFilter, roleFilter, accessFilter, credentialFilter]
  );

  const saveAccess = async (
    account: AdminGenerationAccount,
    patch: {
      enabled?: boolean;
      assistantEnabled?: boolean;
      gameSuggestionsEnabled?: boolean;
      apiKey?: string;
      clearKey?: boolean;
      credentialEnabled?: boolean;
    }
  ) => {
    const current = account.access || {
      userId: account.id,
      enabled: false,
      assistantEnabled: false,
      gameSuggestionsEnabled: false,
    };
    setSavingId(account.id);
    setNotice('');
    try {
      await updateGenerationAccess(account.id, { ...current, ...patch });
      await load();
      setKeyDrafts((drafts) => ({ ...drafts, [account.id]: '' }));
      setNotice('تم تحديث حالة الحساب والخدمة.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'تعذر حفظ التغيير.');
    } finally {
      setSavingId(null);
    }
  };
  const testPersonal = async (account: AdminGenerationAccount) => {
    setTesting(account.id);
    setNotice('');
    try {
      const result = await testGenerationAccess(account.id);
      setNotice(resultLabel(result.success, result.message));
    } catch {
      setNotice('الخدمة غير متاحة حالياً.');
    } finally {
      setTesting(null);
    }
  };
  const testFallback = async () => {
    setTesting('fallback');
    setNotice('');
    try {
      const result = await testPlatformFallback();
      setNotice(resultLabel(result.success, result.message));
    } catch {
      setNotice('الخدمة غير متاحة حالياً.');
    } finally {
      setTesting(null);
    }
  };
  const toggleGlobal = async (enabled: boolean) => {
    setSavingId('global');
    try {
      await updateGenerationConfig(enabled);
      await load();
      setNotice(
        enabled
          ? 'تم تفعيل الخدمة العامة.'
          : 'تم إيقاف الخدمة العامة؛ لن يتجاوزها أي حساب أو مفتاح خاص.'
      );
    } catch {
      setNotice('تعذر تحديث حالة الخدمة العامة.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-200">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold">إدارة الخدمات المركزية</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">الخدمات والحسابات</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              تحكم إداري آمن في الإتاحة والصلاحيات والمفاتيح دون عرض الأسرار.
            </p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>
      {notice && (
        <div className="rounded-2xl bg-purple-50 p-3 text-sm font-bold text-purple-800">
          {notice}
        </div>
      )}
      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
          جارٍ تحميل حالة الخدمات...
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
      {!loading && !error && overview && (
        <>
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-black">حالة الخدمة العامة</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusCard
                label="الإتاحة العامة"
                value={overview.generationEnabled ? 'مفعلة' : 'متوقفة'}
                good={overview.generationEnabled}
              />
              <StatusCard
                label="مزود متاح"
                value={overview.providerConfigured ? 'مهيأ' : 'غير مهيأ'}
                good={overview.providerConfigured}
              />
              <StatusCard
                label="المفتاح الاحتياطي للمنصة"
                value={overview.platformFallbackConfigured ? 'متوفر' : 'غير متوفر'}
                good={overview.platformFallbackConfigured}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={savingId === 'global'}
                onClick={() => void toggleGlobal(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                تفعيل الخدمة
              </button>
              <button
                disabled={savingId === 'global'}
                onClick={() => void toggleGlobal(false)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                إيقاف الخدمة
              </button>
              <span className="self-center text-xs font-bold text-slate-500">
                عند الإيقاف، لا يتجاوز الحساب أو المفتاح الخاص هذا القفل العام.
              </span>
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-black">صلاحيات الحسابات</h2>
            </div>
            <div className="mb-4 grid gap-2 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث بالاسم أو البريد"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-purple-500"
                />
              </div>
              <Filter
                value={statusFilter}
                onChange={setStatusFilter}
                options={['all', 'نشط', 'معطل', 'بانتظار التفعيل']}
                labels={['كل الحالات', 'نشط', 'معطل', 'بانتظار التفعيل']}
              />
              <Filter
                value={roleFilter}
                onChange={setRoleFilter}
                options={['all', 'teacher', 'inspector', 'director', 'admin']}
                labels={['كل الأدوار', 'أستاذ', 'مفتش', 'مدير', 'مشرف']}
              />
              <Filter
                value={accessFilter}
                onChange={setAccessFilter}
                options={['all', 'enabled', 'disabled']}
                labels={['كل الإتاحة', 'الخدمة مفعلة', 'الخدمة معطلة']}
              />
              <Filter
                value={credentialFilter}
                onChange={setCredentialFilter}
                options={['all', 'configured', 'missing']}
                labels={['كل المفاتيح', 'مفتاح خاص', 'بلا مفتاح خاص']}
              />
            </div>
            {accounts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">
                لا توجد حسابات متاحة لإدارة الخدمات.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    selected={account.id === selectedId}
                    saving={savingId === account.id}
                    testing={testing === account.id}
                    draft={keyDrafts[account.id] || ''}
                    onDraft={(value) =>
                      setKeyDrafts((drafts) => ({ ...drafts, [account.id]: value }))
                    }
                    onToggle={(field, value) => void saveAccess(account, { [field]: value })}
                    onSaveKey={() =>
                      void saveAccess(account, {
                        apiKey: keyDrafts[account.id],
                        credentialEnabled: true,
                      })
                    }
                    onRemoveKey={() =>
                      window.confirm('حذف المفتاح الخاص لهذا الحساب؟') &&
                      void saveAccess(account, { clearKey: true, credentialEnabled: false })
                    }
                    onTest={() => void testPersonal(account)}
                    onSelect={() => setSearchParams({ userId: account.id })}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-black">المفتاح الاحتياطي للمنصة</h2>
            </div>
            <p className="text-sm text-slate-600">
              المفتاح الخاص بالحساب له الأولوية الأولى، ويُستخدم هذا الاحتياطي فقط عند عدم توفر
              مفتاح حساب صالح. المصدر الحالي هو إعدادات المزود الموجودة في قاعدة البيانات أو البيئة.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-xl px-3 py-2 text-xs font-black ${overview.platformFallbackConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}
              >
                {overview.platformFallbackConfigured
                  ? 'متوفر'
                  : 'المفتاح الاحتياطي غير متاح حالياً.'}
              </span>
              <button
                onClick={() => void testFallback()}
                disabled={testing === 'fallback'}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              >
                <TestTube2 className="h-4 w-4" />
                فحص المفتاح الاحتياطي
              </button>
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-black">تشخيص واختبار الخدمة</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.providers.map((provider) => (
                <div key={provider.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-black">{provider.name}</span>
                    <span
                      className={
                        provider.enabled && provider.keyConfigured
                          ? 'text-emerald-600'
                          : 'text-amber-700'
                      }
                    >
                      {provider.enabled ? 'مفعّل' : 'معطّل'} ·{' '}
                      {provider.keyConfigured ? 'مهيأ' : 'غير مهيأ'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    المصدر: {provider.source === 'db' ? 'قاعدة البيانات' : 'إعدادات البيئة'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const AccountCard: React.FC<{
  account: AdminGenerationAccount;
  selected: boolean;
  saving: boolean;
  testing: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onToggle: (
    field: 'enabled' | 'assistantEnabled' | 'gameSuggestionsEnabled',
    value: boolean
  ) => void;
  onSaveKey: () => void;
  onRemoveKey: () => void;
  onTest: () => void;
  onSelect: () => void;
}> = ({
  account,
  selected,
  saving,
  testing,
  draft,
  onDraft,
  onToggle,
  onSaveKey,
  onRemoveKey,
  onTest,
  onSelect,
}) => {
  const access = account.access || {
    enabled: false,
    assistantEnabled: false,
    gameSuggestionsEnabled: false,
    keyConfigured: false,
    credentialEnabled: false,
  };
  const eligible = account.status === 'active' && account.isApprovedByAdmin;
  return (
    <article
      className={`rounded-2xl border p-5 ${selected ? 'border-purple-500 bg-purple-50/40' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">
            {account.firstName} {account.lastName}
          </h3>
          <p className="text-xs text-slate-500">{account.email}</p>
          <p className="mt-2 text-[11px] font-bold text-slate-500">
            {roleLabels[account.role] || account.role} · {statusLabel(account)}
          </p>
        </div>
        <button onClick={onSelect} className="text-xs font-bold text-purple-700">
          فتح من الحسابات
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Toggle
          label="إتاحة الخدمة"
          checked={access.enabled}
          disabled={!eligible || saving}
          onChange={(value) => onToggle('enabled', value)}
        />
        <Toggle
          label="صلاحية المساعد"
          checked={access.assistantEnabled}
          disabled={!eligible || saving}
          onChange={(value) => onToggle('assistantEnabled', value)}
        />
        <Toggle
          label="اقتراحات الألعاب"
          checked={access.gameSuggestionsEnabled}
          disabled={!eligible || saving}
          onChange={(value) => onToggle('gameSuggestionsEnabled', value)}
        />
      </div>
      <div className="mt-4 rounded-2xl bg-amber-50 p-3">
        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
          <span>
            {access.keyConfigured ? 'مفتاح خاص بالحساب' : 'لم تتم إضافة مفتاح خاص لهذا الحساب.'}
          </span>
          <span>{access.enabled && !access.keyConfigured && overviewFallbackNote}</span>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="إضافة أو استبدال المفتاح (لا يُعرض بعد الحفظ)"
            className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs dir-ltr text-left"
          />
          <button
            disabled={!draft.trim() || saving}
            onClick={onSaveKey}
            className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            حفظ المفتاح
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            disabled={!access.keyConfigured || saving || testing}
            onClick={onRemoveKey}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 disabled:opacity-50"
          >
            حذف المفتاح الخاص
          </button>
          <button
            disabled={!access.keyConfigured || testing}
            onClick={onTest}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-purple-700 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TestTube2 className="h-3 w-3" />
            )}
            فحص المفتاح الخاص
          </button>
        </div>
      </div>
    </article>
  );
};
const overviewFallbackNote = 'عند تفعيل الحساب والميزة، يستخدم الاحتياطي عند الحاجة.';
const Toggle: React.FC<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, disabled, onChange }) => (
  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-purple-600"
    />
  </label>
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
const StatusCard: React.FC<{ label: string; value: string; good: boolean }> = ({
  label,
  value,
  good,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div
      className={`mt-1 flex items-center gap-1 text-lg font-black ${good ? 'text-emerald-600' : 'text-amber-700'}`}
    >
      {good ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {value}
    </div>
  </div>
);
