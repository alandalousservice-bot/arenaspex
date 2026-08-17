import React from 'react';
import { Calendar, Sparkles, BookMarked, Timer } from 'lucide-react';
import { User } from '../../../types/spex';
import { NavTab } from '../../layout/Sidebar';
import { CURRENT_SCHOOL_YEAR_LABEL } from '../../../constants/teacherDashboard.constants';

interface TeacherHeroBannerProps {
  user: User;
  schoolName: string;
  municipality: string;
  districtLabel: string;
  onNavigateTab: (tab: NavTab) => void;
  onOpenAIGenerator: () => void;
}

export const TeacherHeroBanner: React.FC<TeacherHeroBannerProps> = ({
  user,
  schoolName,
  municipality,
  districtLabel,
  onNavigateTab,
  onOpenAIGenerator,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-blue-600/15">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100 border border-white/20">
            <Calendar className="w-3.5 h-3.5" />
            <span>{CURRENT_SCHOOL_YEAR_LABEL}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            أهلاً بك، أستاذ {user.firstName} {user.lastName} 👋
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
            مرحباً بك في بيئة عمل SPEX الذكية للتربية البدنية والرياضية. تم ربط حسابك بـ{' '}
            <span className="font-bold underline decoration-blue-300">{schoolName}</span> (
            {municipality}) • وتحت إشراف {districtLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigateTab('lesson_command_center')}
            className="flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Timer className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>مركز قيادة الحصة ⏱️</span>
          </button>
          <button
            onClick={onOpenAIGenerator}
            className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-2xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>توليد المذكرة البيداغوجية</span>
          </button>
          <button
            onClick={() => onNavigateTab('daily_notebook')}
            className="flex items-center gap-2 px-4 py-3 bg-blue-800/60 hover:bg-blue-800 text-white font-bold rounded-2xl text-xs border border-white/20 transition-all cursor-pointer"
          >
            <BookMarked className="w-4 h-4" />
            <span>الكراس اليومي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
