import React from 'react';
import { Volume2, VolumeX, Settings, Maximize2, Sparkles, Timer } from 'lucide-react';
import { LessonSessionTiming } from '../../../types/spex';

interface CommandCenterHeaderProps {
  timingSettings: LessonSessionTiming;
  onUpdateTimingSettings: (settings: LessonSessionTiming) => void;
  onOpenSettingsModal: () => void;
  isFullScreenMode: boolean;
  onToggleFullScreen: () => void;
}

export const CommandCenterHeader: React.FC<CommandCenterHeaderProps> = ({
  timingSettings,
  onUpdateTimingSettings,
  onOpenSettingsModal,
  isFullScreenMode: _isFullScreenMode,
  onToggleFullScreen,
}) => {
  return (
    <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Timer className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-1 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" />
            <span>نظام المرافقة الميداني الذكي — SPEX Command</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">مركز قيادة الحصة البيداغوجية</h2>
          <p className="text-xs text-slate-400">إدارة زبرة الصفارة، التوقيت الميداني، والتنظيم المباشر للحصة</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            onUpdateTimingSettings({
              ...timingSettings,
              soundEnabled: !timingSettings.soundEnabled,
            })
          }
          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            timingSettings.soundEnabled
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
          title="تفعيل / كتم صقارة الصوت"
        >
          {timingSettings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{timingSettings.soundEnabled ? 'الصوت مفعّل' : 'مكتوم'}</span>
        </button>

        <button
          onClick={onOpenSettingsModal}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Settings className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">إعدادات التوقيت</span>
        </button>

        <button
          onClick={onToggleFullScreen}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          title="شاشة كاملة"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
