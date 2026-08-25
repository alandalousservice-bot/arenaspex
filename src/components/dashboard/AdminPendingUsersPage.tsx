import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  activateUserAccount,
  AdminAccountDetail,
  fetchAdminPendingAccounts,
} from '../../services/api';

const roleLabel: Record<string, string> = {
  teacher: 'أستاذ',
  inspector: 'مفتش',
  director: 'مدير',
  admin: 'مشرف',
};
const place = (u: AdminAccountDetail) =>
  u.adminAffiliation?.institutionName ||
  u.schoolName ||
  u.adminAffiliation?.municipalityName ||
  u.municipality ||
  'لم تُحدد مؤسسة';

export const AdminPendingUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminAccountDetail[]>([]),
    [query, setQuery] = useState(''),
    [sort, setSort] = useState<'oldest' | 'newest' | 'name'>('oldest'),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [activatingId, setActivatingId] = useState<string | null>(null);
  const load = async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    const result = await fetchAdminPendingAccounts();
    if (result.success) {
      setUsers(result.users);
      setError('');
    } else setError(result.error || 'تعذر تحميل طلبات التفعيل.');
    if (background) setRefreshing(false);
    else setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      users
        .filter((u) => {
          const text = [
            u.firstName,
            u.lastName,
            `${u.firstName} ${u.lastName}`,
            u.email,
            u.phone,
            u.schoolName,
            u.municipality,
            u.adminAffiliation?.institutionName,
            u.adminAffiliation?.directorateName,
            u.adminAffiliation?.districtName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          return !query.trim() || text.includes(query.trim().toLocaleLowerCase());
        })
        .sort((a, b) =>
          sort === 'name'
            ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ar')
            : sort === 'newest'
              ? String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
              : String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
        ),
    [users, query, sort]
  );
  const activate = async (user: AdminAccountDetail) => {
    if (activatingId) return;
    if (!window.confirm(`تفعيل حساب ${user.firstName} ${user.lastName}؟`)) return;
    setActivatingId(user.id);
    setMessage('');
    const result = await activateUserAccount(user.id);
    setActivatingId(null);
    if (!result.success) {
      setMessage(result.error || 'تعذر تفعيل الحساب.');
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setMessage('تم تفعيل الحساب نفسه وإزالته من قائمة الطلبات.');
  };
  const oldest = users[0]?.createdAt;
  return (
    <div className="space-y-6" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-200">
              <Users className="h-5 w-5" />
              <span className="text-xs font-bold">مساحة الموافقة المركزية</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">طلبات تفعيل الحسابات</h1>
            <p className="mt-2 text-sm text-purple-100/80">
              مراجعة بيانات التسجيل الحقيقية قبل تفعيل الحساب؛ لا يتم إنشاء أو إعادة إنشاء User
              جديد.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-bold text-amber-800">إجمالي الطلبات المعلقة</div>
          <div className="mt-1 text-3xl font-black text-amber-950">{users.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Clock3 className="h-4 w-4" />
            أقدم طلب
          </div>
          <div className="mt-2 text-sm font-black text-slate-800">
            {oldest ? new Date(oldest).toLocaleDateString('ar-DZ') : 'لا توجد طلبات'}
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الهاتف أو المؤسسة..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold"
        >
          <option value="oldest">الأقدم أولاً</option>
          <option value="newest">الأحدث أولاً</option>
          <option value="name">الاسم</option>
        </select>
        <span className="self-center text-xs font-bold text-slate-500">{visible.length} نتيجة</span>
      </section>
      {message && (
        <div className="rounded-2xl bg-purple-50 p-3 text-sm font-bold text-purple-800">
          {message}
        </div>
      )}
      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
          جارٍ تحميل الطلبات...
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
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-500">
          لا توجد حسابات بانتظار التفعيل حالياً.
        </div>
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 dir-ltr text-right">{user.email}</p>
                  <p className="mt-2 text-[11px] font-bold text-amber-800">
                    الدور الحالي: {roleLabel[user.role] || user.role}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Info
                  label="تاريخ التسجيل"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('ar-DZ')
                      : 'غير محدد'
                  }
                />
                <Info label="الهاتف" value={user.phone || 'غير مضاف'} />
                <Info label="المؤسسة" value={place(user)} />
                <Info
                  label="المديرية"
                  value={
                    user.adminAffiliation?.directorateName || user.directorateId || 'غير محددة'
                  }
                />
                <Info
                  label="المقاطعة"
                  value={user.adminAffiliation?.districtName || user.districtId || 'غير محددة'}
                />
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/admin/accounts/${encodeURIComponent(user.id)}`)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-purple-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  مراجعة الطلب
                </button>
                <button
                  onClick={() => void activate(user)}
                  disabled={activatingId === user.id}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {activatingId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  تفعيل الحساب
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="font-bold text-slate-400">{label}</dt>
    <dd className="mt-1 font-bold text-slate-700">{value}</dd>
  </div>
);
