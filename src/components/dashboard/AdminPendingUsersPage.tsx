import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Users } from 'lucide-react';
import { User } from '../../types/spex';
import { activateUserAccount, fetchPendingUsersFromDB } from '../../services/api';

export const AdminPendingUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true);
    setUsers(await fetchPendingUsersFromDB());
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const activate = async (user: User) => {
    const result = await activateUserAccount(user.id);
    if (!result.success) {
      setMessage(result.error || 'تعذر تفعيل الحساب.');
      return;
    }
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setMessage('تم تفعيل الحساب وإضافته إلى إدارة الحسابات.');
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple-700">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold">إدارة الحسابات</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">طلبات تفعيل الحسابات</h1>
          <p className="mt-1 text-xs text-slate-500">
            الحسابات المعروضة هنا مصدرها قاعدة البيانات وتبقى محفوظة بعد التفعيل.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>
      {message && (
        <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</p>
      )}
      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
          جارٍ تحميل الطلبات...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">
          لا توجد حسابات بانتظار التفعيل.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-900">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">{user.email}</p>
                  <p className="mt-2 text-[11px] font-bold text-amber-800">
                    الدور المطلوب: {user.role}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <button
                onClick={() => void activate(user)}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
              >
                تفعيل الحساب
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
