import React from 'react';
import { Volume2, Zap } from 'lucide-react';
import { playWhistleSound, triggerVibration } from '../../../services/lessonCommandCenter.service';

interface CommandCenterWhistleConsoleProps {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const CommandCenterWhistleConsole: React.FC<CommandCenterWhistleConsoleProps> = ({
  soundEnabled,
  vibrationEnabled,
}) => {
  const triggerWhistle = (type: 'short' | 'double' | 'long' | 'chime') => {
    playWhistleSound(type, soundEnabled);
    triggerVibration(vibrationEnabled);
  };

  return (
    <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl space-y-4 border border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>وحدة تحكم الصفارات والأوامر الصوتية الميدانية</span>
        </div>
        <span className="text-[10px] text-slate-400 font-bold">زبرة الصفارة التكتيكية</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => triggerWhistle('short')}
          className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
        >
          <Zap className="w-4 h-4" />
          <span>زبرة قصيرة (انطلاق / توقف)</span>
        </button>

        <button
          onClick={() => triggerWhistle('double')}
          className="p-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>زبرتان (تغيير المجموعات)</span>
        </button>

        <button
          onClick={() => triggerWhistle('long')}
          className="p-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>زبرة طويلة (نهاية المرحلة)</span>
        </button>

        <button
          onClick={() => triggerWhistle('chime')}
          className="p-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
          <span>جرس ناعم (تجمّع وهدوء)</span>
        </button>
      </div>
    </div>
  );
};
