import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Users } from 'lucide-react';
import { User } from '../../types/spex';
import {
  fetchAllAssignments,
  fetchManagedUsersFromDB,
  fetchPendingUsersFromDB,
} from '../../services/api';
export const AdminReportsPage: React.FC<{ fallbackUsers?: User[] }> = ({ fallbackUsers = [] }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [pending, setPending] = useState(0);
  const [assignments, setAssignments] = useState(0);
  const load = async () => {
    const [managed, waiting, rows] = await Promise.all([
      fetchManagedUsersFromDB(),
      fetchPendingUsersFromDB(),
      fetchAllAssignments(),
    ]);
    setUsers(managed.length ? managed : fallbackUsers);
    setPending(waiting.length);
    setAssignments((rows.assignments || []).length);
  };
  useEffect(() => {
    void load();
  }, []);
  const metrics = [
    ['إجمالي الحسابات', users.length],
    ['الأساتذة', users.filter((u) => u.role === 'teacher').length],
    ['المفتشون', users.filter((u) => u.role === 'inspector').length],
    ['المديرون', users.filter((u) => u.role === 'director').length],
    ['طلبات التفعيل', pending],
    ['سجلات الإسناد', assignments],
  ];
  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-purple-700">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-bold">بيانات النظام</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">الإحصاءات والتقارير</h1>
        </div>
        <button onClick={() => void load()} className="rounded-xl bg-slate-100 p-2 text-slate-700">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <Users className="h-4 w-4 text-purple-600" />
            <p className="mt-3 text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
