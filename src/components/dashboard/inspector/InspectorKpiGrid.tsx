import React from 'react';
import {
  UserCheck,
  School,
  TrendingUp,
  UserX,
  AlertTriangle,
  Users,
  Clock,
} from 'lucide-react';
import { User } from '../../../types/spex';

interface InspectorKpiGridProps {
  teachersCount: number;
  institutionsCount: number;
  completionRate: number;
  inactiveTeachersCount: number;
  lateReportsCount: number;
  totalStudentsTaught: number;
  weeklyHoursCount: number;
}

const KpiCard: React.FC<{
  icon: React.ReactNode;
  iconWrapperClassName: string;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}> = ({ icon, iconWrapperClassName, label, value, valueClassName = 'text-slate-900' }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
    <div className={`p-3 rounded-2xl shrink-0 ${iconWrapperClassName}`}>{icon}</div>
    <div className="min-w-0">
      <span className="text-[10px] font-bold text-slate-500 block">{label}</span>
      <div className={`text-xl font-extrabold ${valueClassName}`}>{value}</div>
    </div>
  </div>
);

export const InspectorKpiGrid: React.FC<InspectorKpiGridProps> = ({
  teachersCount,
  institutionsCount,
  completionRate,
  inactiveTeachersCount,
  lateReportsCount,
  totalStudentsTaught,
  weeklyHoursCount,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <KpiCard
        icon={<UserCheck className="w-6 h-6" />}
        iconWrapperClassName="bg-emerald-50 text-emerald-600"
        label="عدد الأساتذة"
        value={teachersCount}
      />
      <KpiCard
        icon={<School className="w-6 h-6" />}
        iconWrapperClassName="bg-teal-50 text-teal-600"
        label="عدد المؤسسات"
        value={institutionsCount}
        valueClassName="text-teal-900"
      />
      <KpiCard
        icon={<TrendingUp className="w-6 h-6" />}
        iconWrapperClassName="bg-amber-50 text-amber-600"
        label="نسبة الإنجاز"
        value={`${completionRate}%`}
        valueClassName="text-amber-900"
      />
      <KpiCard
        icon={<UserX className="w-6 h-6" />}
        iconWrapperClassName="bg-rose-50 text-rose-600"
        label="أساتذة غير نشطين"
        value={inactiveTeachersCount}
        valueClassName="text-rose-900"
      />
      <KpiCard
        icon={<AlertTriangle className="w-6 h-6" />}
        iconWrapperClassName="bg-orange-50 text-orange-600"
        label="تقارير متأخرة"
        value={lateReportsCount}
        valueClassName="text-orange-900"
      />
      <KpiCard
        icon={<Users className="w-6 h-6" />}
        iconWrapperClassName="bg-blue-50 text-blue-600"
        label="إجمالي تلاميذ الأستاذ"
        value={totalStudentsTaught}
        valueClassName="text-blue-900"
      />
      <KpiCard
        icon={<Clock className="w-6 h-6" />}
        iconWrapperClassName="bg-purple-50 text-purple-600"
        label="ساعات العمل الأسبوعية"
        value={`${weeklyHoursCount} سا/أسبوعياً`}
        valueClassName="text-purple-900 text-xs sm:text-sm font-extrabold"
      />
    </div>
  );
};
