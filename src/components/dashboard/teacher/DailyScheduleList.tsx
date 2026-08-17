import React from 'react';
import { Clock, ArrowUpRight, FileText } from 'lucide-react';
import { DailyNotebookEntry } from '../../../types/spex';
import { NavTab } from '../../layout/Sidebar';
import { NOTEBOOK_STATUS } from '../../../constants/teacherDashboard.constants';
import { resolveSessionTitle } from '../../../services/teacherDashboard.service';

interface DailyScheduleListProps {
  dailyNotebook: DailyNotebookEntry[];
  onNavigateTab: (tab: NavTab) => void;
  onUpdateNotebookStatus?: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة') => void;
}

const STATUS_TOGGLES: Array<{
  status: 'منجزة' | 'مؤجلة' | 'غير منجزة';
  label: string;
  title: string;
  activeClassName: string;
  inactiveClassName: string;
}> = [
  {
    status: NOTEBOOK_STATUS.DONE,
    label: '✓ منجزة',
    title: 'تأشير كـ منجزة',
    activeClassName: 'bg-emerald-600 text-white shadow-2xs',
    inactiveClassName: 'text-slate-600 hover:text-emerald-700',
  },
  {
    status: NOTEBOOK_STATUS.NOT_DONE,
    label: '✕ غير منجزة',
    title: 'تأشير كـ غير منجزة',
    activeClassName: 'bg-rose-600 text-white shadow-2xs',
    inactiveClassName: 'text-slate-600 hover:text-rose-700',
  },
  {
    status: NOTEBOOK_STATUS.DELAYED,
    label: '⏰ مؤجلة',
    title: 'تأشير كـ مؤجلة',
    activeClassName: 'bg-amber-600 text-white shadow-2xs',
    inactiveClassName: 'text-slate-600 hover:text-amber-700',
  },
];

export const DailyScheduleList: React.FC<DailyScheduleListProps> = ({
  dailyNotebook,
  onNavigateTab,
  onUpdateNotebookStatus,
}) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>جدول حصص اليوم في الكراس اليومي</span>
          </h3>
          <p className="text-xs text-slate-500">حالة التنفيذ والمذكرات المرتبطة بحصصك الدراسية</p>
        </div>
        <button
          onClick={() => onNavigateTab('daily_notebook')}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
        >
          <span>عرض الكراس الكامل</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {dailyNotebook.map((entry) => (
          <div
            key={entry.id}
            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-2xl transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                  {entry.timeSlot}
                </span>
                <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {entry.className}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                {resolveSessionTitle(entry.sessionId)}
              </h4>
              {entry.note && (
                <p className="text-[11px] text-slate-500 italic">ملاحظة: {entry.note}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {STATUS_TOGGLES.map((toggle) => (
                  <button
                    key={toggle.status}
                    onClick={() =>
                      onUpdateNotebookStatus && onUpdateNotebookStatus(entry.id, toggle.status)
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                      entry.status === toggle.status
                        ? toggle.activeClassName
                        : toggle.inactiveClassName
                    }`}
                    title={toggle.title}
                  >
                    {toggle.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onNavigateTab('lesson_plans')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>المذكرة</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
