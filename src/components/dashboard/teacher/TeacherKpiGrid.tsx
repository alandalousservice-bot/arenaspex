import React from 'react';
import { TrendingUp, CheckCircle2, FileText, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { LAST_INSPECTION_VISIT_LABEL } from '../../../constants/teacherDashboard.constants';

interface TeacherKpiGridProps {
  executionPercentage: number;
  completedCount: number;
  delayedCount: number;
  totalSessions: number;
  lessonPlansCount: number;
  inspectorNotesCount: number;
}

/** بطاقة مؤشر أداء واحدة (KPI) - عنصر قابل لإعادة الاستخدام */
const KpiCard: React.FC<{
  label: string;
  icon: React.ReactNode;
  iconWrapperClassName: string;
  children: React.ReactNode;
}> = ({ label, icon, iconWrapperClassName, children }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className={`p-2.5 rounded-xl ${iconWrapperClassName}`}>{icon}</div>
    </div>
    {children}
  </div>
);

export const TeacherKpiGrid: React.FC<TeacherKpiGridProps> = ({
  executionPercentage,
  completedCount,
  delayedCount,
  totalSessions,
  lessonPlansCount,
  inspectorNotesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="نسبة تنفيذ المخطط السنوي"
        icon={<TrendingUp className="w-5 h-5" />}
        iconWrapperClassName="bg-blue-50 text-blue-600"
      >
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-slate-900">{executionPercentage}%</span>
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" /> منظم جداً
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${executionPercentage}%` }}
          />
        </div>
      </KpiCard>

      <KpiCard
        label="الحصص المنجزة الكراس اليومي"
        icon={<CheckCircle2 className="w-5 h-5" />}
        iconWrapperClassName="bg-emerald-50 text-emerald-600"
      >
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-slate-900">{completedCount}</span>
          <span className="text-xs text-slate-500 font-medium">من أصل {totalSessions} حصة</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          الحصص المؤجلة: <span className="font-bold text-amber-600">{delayedCount} حصة</span>
        </p>
      </KpiCard>

      <KpiCard
        label="المذكرات الجاهزة والمنشأة"
        icon={<FileText className="w-5 h-5" />}
        iconWrapperClassName="bg-purple-50 text-purple-600"
      >
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-slate-900">{lessonPlansCount}</span>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">
            من البنك التربوي
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">جاهزة للطباعة والتصدير PDF</p>
      </KpiCard>

      <KpiCard
        label="ملاحظات وتوجيهات المفتش"
        icon={<ShieldCheck className="w-5 h-5" />}
        iconWrapperClassName="bg-amber-50 text-amber-600"
      >
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-slate-900">{inspectorNotesCount}</span>
          <span className="text-xs font-semibold text-emerald-600">توجيه بيداغوجي</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">{LAST_INSPECTION_VISIT_LABEL}</p>
      </KpiCard>
    </div>
  );
};
