/**
 * SPEX - Floating Lesson Overlay Component
 * النافذة العائمة الذكية لمتابعة زمان الحصة فوق جميع واجهات التطبيق
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Timer,
  Play,
  Pause,
  SkipForward,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
  Move
} from 'lucide-react';
import { LessonSession, LessonSessionTiming } from '../../types/spex';

interface FloatingLessonOverlayProps {
  session: LessonSession | null;
  timingSettings: LessonSessionTiming;
  onPauseResume: () => void;
  onNextPhase: () => void;
  onEndSession: () => void;
  onOpenFullCommandCenter: () => void;
  onToggleSound?: () => void;
}

export const FloatingLessonOverlay: React.FC<FloatingLessonOverlayProps> = ({
  session,
  timingSettings,
  onPauseResume,
  onNextPhase,
  onEndSession,
  onOpenFullCommandCenter,
  onToggleSound
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);

  if (!session || (session.status !== 'in_progress' && session.status !== 'paused')) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseTitle = (phase: LessonSession['currentPhase']) => {
    switch (phase) {
      case 'preparation':
        return 'المرحلة التحضيرية';
      case 'situation1':
        return 'الموقف التعليمي الأول';
      case 'situation2':
        return 'الموقف التعليمي الثاني';
      case 'final':
        return 'المرحلة الختامية';
      default:
        return 'الحصة جارية';
    }
  };

  const getPhaseBadgeColor = (phase: LessonSession['currentPhase']) => {
    switch (phase) {
      case 'preparation':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'situation1':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'situation2':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'final':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const activePhaseDuration = session.phaseDurations[session.currentPhase] || 600;
  const remainingSecs = session.phaseRemainingSeconds;
  const progressPercent = Math.max(0, Math.min(100, ((activePhaseDuration - remainingSecs) / activePhaseDuration) * 100));

  return (
    <div
      style={{ left: `${position.x}px`, bottom: `${position.y}px` }}
      className="fixed z-50 select-none transition-all duration-75"
    >
      <AnimatePresence>
        {isMinimized ? (
          /* Minimized Floating Pill */
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 text-white backdrop-blur-xl border border-blue-500/40 rounded-full shadow-2xl cursor-pointer hover:border-blue-400 group"
            onClick={() => setIsMinimized(false)}
          >
            <div className="relative">
              <span className="flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${session.isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${session.isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm tracking-wider text-blue-300">
              <Timer className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>{formatTime(remainingSecs)}</span>
            </div>
            <span className="text-xs font-semibold text-slate-300 border-r border-slate-700 pr-2 max-w-[120px] truncate">
              {getPhaseTitle(session.currentPhase)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
              title="تكبير النافذة"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          /* Expanded Floating Overlay Widget */
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-80 bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header Drag Handle & Controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/60 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-blue-400" />
                  مركز القيادة العائم
                </span>
              </div>
              <div className="flex items-center gap-1">
                {onToggleSound && (
                  <button
                    onClick={onToggleSound}
                    className="p-1.5 hover:bg-slate-700/70 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title={timingSettings.soundEnabled ? 'تعطيل الصوت' : 'تفعيل الصوت'}
                  >
                    {timingSettings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-slate-700/70 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="تصغير النافذة"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onOpenFullCommandCenter}
                  className="p-1.5 hover:bg-slate-700/70 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="الشاشة الكاملة"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-3">
              {/* Class & Phase Banner */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    القسم: {session.className}
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {session.sessionTitle}
                  </h4>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getPhaseBadgeColor(session.currentPhase)}`}>
                  {getPhaseTitle(session.currentPhase)}
                </span>
              </div>

              {/* Big Countdown Timer */}
              <div className="bg-slate-950/70 rounded-2xl p-3 border border-slate-800 text-center relative overflow-hidden">
                <div className="text-3xl font-mono font-extrabold text-blue-400 tracking-wider">
                  {formatTime(remainingSecs)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-2">
                  <span>منقضية: {formatTime(activePhaseDuration - remainingSecs)}</span>
                  <span>الإجمالي: {Math.round(activePhaseDuration / 60)}د</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Active Objective / Activity Preview */}
              <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/50 text-[11px] text-slate-300 space-y-1">
                <span className="font-semibold text-blue-300 block">الهدف الحلي:</span>
                <p className="text-slate-200 line-clamp-2 leading-tight">
                  {session.educationalObjective || 'تنفيذ أنشطة ومواقف المقطع البيداغوجي المبرمج'}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onPauseResume}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    session.isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'bg-amber-600/90 hover:bg-amber-600 text-white'
                  }`}
                >
                  {session.isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>استئناف</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>إيقاف مؤقت</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onNextPhase}
                  className="flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  title="المرحلة التالية"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>التالي</span>
                </button>

                <button
                  onClick={onEndSession}
                  className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl transition-all"
                  title="إنهاء الحصة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
