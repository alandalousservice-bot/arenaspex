import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  Loader2,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminAccountDetail, fetchAdminAccountsDirectory } from '../../services/api';

type Role = 'all' | 'teacher' | 'inspector' | 'director' | 'admin';
type Status = 'all' | 'pending_approval' | 'active' | 'inactive';
const roles: Record<Role, string> = {
  all: 'الكل',
  teacher: 'الأساتذة',
  inspector: 'المفتشون',
  director: 'المديرون',
  admin: 'المشرفون',
};
const statuses: Record<Status, string> = {
  all: 'الكل',
  pending_approval: 'بانتظار التفعيل',
  active: 'نشط',
  inactive: 'معطل',
};
const pending = (u: AdminAccountDetail) =>
  u.status === 'pending_approval' || u.isApprovedByAdmin === false;
const place = (u: AdminAccountDetail) =>
  u.adminAffiliation?.institutionName ||
  u.schoolName ||
  u.adminAffiliation?.districtName ||
  u.districtId ||
  u.adminAffiliation?.directorateName ||
  u.directorateId ||
  'غير محدد';
const statusText = (u: AdminAccountDetail) =>
  pending(u) ? statuses.pending_approval : statuses[u.status as Status] || 'غير محدد';

export const AdminAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminAccountDetail[]>([]),
    [search, setSearch] = useState(''),
    [role, setRole] = useState<Role>('all'),
    [status, setStatus] = useState<Status>('all'),
    [sort, setSort] = useState('createdAt'),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void fetchAdminAccountsDirectory().then((r) => {
      if (!live) return;
      setLoading(false);
      if (r.success) setUsers(r.users);
      else setError(r.error || 'تعذر تحميل الحسابات.');
    });
    return () => {
      live = false;
    };
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
            u.adminAffiliation?.institutionName,
            u.adminAffiliation?.directorateName,
            u.adminAffiliation?.districtName,
            u.schoolName,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase();
          const actual = pending(u) ? 'pending_approval' : u.status;
          return (
            (!search.trim() || text.includes(search.trim().toLocaleLowerCase())) &&
            (role === 'all' || u.role === role) &&
            (status === 'all' || actual === status)
          );
        })
        .sort((a, b) =>
          sort === 'name'
            ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'ar')
            : sort === 'role'
              ? roles[a.role as Role].localeCompare(roles[b.role as Role], 'ar')
              : String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        ),
    [users, search, role, status, sort]
  );
  const open = (id: string) => navigate(`/admin/accounts/${encodeURIComponent(id)}`);
  return (
    <div className="space-y-6" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-purple-300" />
          <div>
            <p className="text-xs font-bold text-purple-200">مساحة الإدارة اليومية</p>
            <h1 className="mt-1 text-2xl font-black">إدارة الحسابات</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-purple-100/80">
          دليل الحسابات المحفوظة في قاعدة البيانات وصفحة الإدارة المركزية لكل حساب.
        </p>
      </header>
      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد أو الهاتف أو المؤسسة..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold"
          >
            <option value="all">الدور: الكل</option>
            {Object.entries(roles)
              .filter(([k]) => k !== 'all')
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold"
          >
            <option value="all">الحالة: الكل</option>
            {Object.entries(statuses)
              .filter(([k]) => k !== 'all')
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold">
            <ArrowUpDown className="h-4 w-4 text-purple-600" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="outline-none">
              <option value="createdAt">الأحدث</option>
              <option value="name">الاسم</option>
              <option value="role">الدور</option>
            </select>
          </label>
        </div>
        <div className="text-xs font-bold text-slate-500">
          {visible.length} نتيجة من أصل {users.length}
        </div>
      </section>
      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-500">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-purple-600" />
          جارٍ تحميل الحسابات...
        </div>
      )}
      {!loading && error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <AlertCircle className="mb-2 h-5 w-5" />
          {error}
        </div>
      )}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          لا توجد حسابات مطابقة للفلاتر الحالية.
        </div>
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
                <tr>
                  <th className="p-4">الحساب</th>
                  <th className="p-4">الدور</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الانتساب الإداري</th>
                  <th className="p-4">الهاتف</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <Row key={u.id} user={u} open={() => open(u.id)} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {visible.map((u) => (
              <Card key={u.id} user={u} open={() => open(u.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const Badge: React.FC<{ user: AdminAccountDetail }> = ({ user }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${pending(user) ? 'bg-amber-100 text-amber-800' : user.status === 'inactive' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}
  >
    {statusText(user)}
  </span>
);
const Row: React.FC<{ user: AdminAccountDetail; open: () => void }> = ({ user, open }) => (
  <tr className="transition hover:bg-slate-50">
    <td className="p-4">
      <button onClick={open} className="flex items-center gap-3 text-right">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-800">
          {user.firstName?.[0] || '?'}
        </span>
        <span>
          <span className="block font-extrabold text-slate-900">
            {user.firstName} {user.lastName}
            {user.isPlatformOwner && (
              <small className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                مالك المنصة
              </small>
            )}
          </span>
          <span className="block text-xs text-slate-400">{user.email}</span>
        </span>
      </button>
    </td>
    <td className="p-4 font-bold">{roles[user.role as Role] || user.role}</td>
    <td className="p-4">
      <Badge user={user} />
    </td>
    <td className="p-4 text-slate-600">{place(user)}</td>
    <td className="p-4 dir-ltr text-right text-slate-500">{user.phone || 'غير مضاف'}</td>
    <td className="p-4 text-left">
      <button
        onClick={open}
        className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
      >
        فتح الحساب
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </td>
  </tr>
);
const Card: React.FC<{ user: AdminAccountDetail; open: () => void }> = ({ user, open }) => (
  <button onClick={open} className="rounded-2xl border border-slate-200 p-4 text-right shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="font-extrabold text-slate-900">
          {user.firstName} {user.lastName}
        </div>
        <div className="mt-1 text-xs text-slate-500">{user.email}</div>
      </div>
      <Badge user={user} />
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
      <span className="rounded-lg bg-slate-50 p-2 font-bold">
        {roles[user.role as Role] || user.role}
      </span>
      <span className="rounded-lg bg-slate-50 p-2">{place(user)}</span>
    </div>
  </button>
);
