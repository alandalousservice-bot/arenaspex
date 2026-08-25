import React, { useEffect, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  FileCheck2,
  KeyRound,
  MapPin,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KnowledgeItem, User } from '../../types/spex';
import {
  fetchAllAssignments,
  fetchGenerationAccess,
  fetchGeoDistricts,
  fetchManagedUsersFromDB,
  fetchPendingUsersFromDB,
} from '../../services/api';

interface AdminOverviewProps {
  users?: User[];
  knowledgeItems?: KnowledgeItem[];
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  users = [],
  knowledgeItems = [],
}) => {
  const navigate = useNavigate();
  const [managedUsers, setManagedUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [unassignedDistricts, setUnassignedDistricts] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchManagedUsersFromDB(),
      fetchPendingUsersFromDB(),
      fetchGenerationAccess(),
      fetchGeoDistricts(''),
      fetchAllAssignments(),
    ]).then(([managed, pending, access, districts, assignments]) => {
      if (!active) return;
      setManagedUsers(managed);
      setPendingUsers(pending);
      setServiceCount(access.filter((item: { enabled?: boolean }) => item.enabled).length);
      const assignedDistricts = new Set(
        (assignments.assignments || [])
          .map((item: { inspector?: User | null }) => item.inspector?.districtId)
          .filter(Boolean)
      );
      setUnassignedDistricts(Math.max(0, districts.length - assignedDistricts.size));
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceUsers = managedUsers.length > 0 ? managedUsers : users;
  const cards = [
    {
      label: 'إجمالي الحسابات',
      value: sourceUsers.length,
      href: '/admin/accounts',
      icon: Users,
      tone: 'purple',
    },
    {
      label: 'طلبات التفعيل',
      value: pendingUsers.length,
      href: '/admin/pending-users',
      icon: CheckCircle2,
      tone: 'amber',
    },
    {
      label: 'الأساتذة',
      value: sourceUsers.filter((u) => u.role === 'teacher').length,
      href: '/admin/accounts',
      icon: Users,
      tone: 'emerald',
    },
    {
      label: 'المفتشون',
      value: sourceUsers.filter((u) => u.role === 'inspector').length,
      href: '/admin/inspectors',
      icon: Building2,
      tone: 'blue',
    },
    {
      label: 'المديرون',
      value: sourceUsers.filter((u) => u.role === 'director').length,
      href: '/admin/accounts',
      icon: Building2,
      tone: 'violet',
    },
    {
      label: 'الخدمات المساعدة المفعلة',
      value: serviceCount,
      href: '/admin/services',
      icon: KeyRound,
      tone: 'amber',
    },
    {
      label: 'المقاطعات بدون مفتش',
      value: unassignedDistricts,
      href: '/admin/inspectors',
      icon: MapPin,
      tone: 'rose',
    },
    {
      label: 'اعتمادات الموارد',
      value: knowledgeItems.filter((item) =>
        ['pending', 'PENDING', 'PENDING_APPROVAL'].includes(
          String((item as KnowledgeItem & { status?: string }).status)
        )
      ).length,
      href: '/admin/approvals',
      icon: FileCheck2,
      tone: 'cyan',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      <section className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-lg shadow-purple-900/15">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-purple-300" />
          <div>
            <p className="text-xs font-bold text-purple-200">مساحة إدارة ArenaSpex</p>
            <h1 className="mt-1 text-2xl font-black">الرئيسية</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-purple-100/80">
          ملخص تشغيلي من بيانات الحسابات والخدمات والإسنادات الحالية.
        </p>
      </section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, href, icon: Icon, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(href)}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 text-right shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`mb-3 flex items-center gap-2 text-xs font-bold text-${tone}-700`}>
              <Icon className="h-4 w-4" />
              {label}
            </div>
            <div className="text-3xl font-black text-slate-900">{value}</div>
            <span className="mt-2 block text-[10px] font-bold text-slate-400">فتح الإدارة</span>
          </button>
        ))}
      </div>
    </div>
  );
};
