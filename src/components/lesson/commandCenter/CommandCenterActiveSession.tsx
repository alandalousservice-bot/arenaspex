import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipForward, CheckCircle2, Clock, PlusCircle, Timer, Activity } from 'lucide-react';
import { LessonSession, LessonSessionTiming } from '../../../types/spex';
import {
  announcePhaseInArabic,
  computePhasePacing,
  playWhistleSound,
  triggerVibration,
} from '../../../services/lessonCommandCenter.service';

interface CommandCenterActiveSessionProps {
  currentSession: LessonSession;
  timingSettings: LessonSessionTiming;
  onUpdateSession: (updated: Partial<LessonSession>) => void;
  onEndSession: () => void;
}

interface SessionEvent {
  id: string;
  time: string;
  text: string;
  tone: 'info' | 'warn' | 'success';
}

const PHASE_META: Record<LessonSession['currentPhase'], { name: string; short: string; active: string; chip: string }> = {
  preparation: {
    name: 'المرحلة التحضيرية',
    short: 'إحماء وتجهيز الصف',
    active: 'bg-amber-500/25 border-amber-500 text-amber-200 ring-2 ring-amber-500/40',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  situation1: {
    name: 'الوضعية التعلمية الأولى',
    short: 'بناء التعلمات',
    active: 'bg-blue-500/25 border-blue-500 text-blue-200 ring-2 ring-blue-500/40',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  situation2: {
    name: 'الوضعية التعلمية الثانية',
    short: 'التنافس والتطبيق',
    active: 'bg-indigo-500/25 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/40',
    chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  final: {
    name: 'المرحلة الختامية',
    short: 'التهدئة والتقويم',
    active: 'bg-emerald-500/25 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40',
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

const CONTINGENCY_BADGES: Record<string, string> = {
  normal: '',
  hot_weather: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  equipment_shortage: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
  high_fatigue: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
};

const CONTINGENCY_NAMES: Record<string, string> = {
  normal: '',
  hot_weather: 'وضع حرارة',
  equipment_shortage: 'نقص عتاد',
  high_fatigue: 'وضع إرهاق',
};

export const CommandCenterActiveSession: React.FC<CommandCenterActiveSessionProps> = ({
  currentSession,
  timingSettings,
  onUpdateSession,
  onEndSession,
}) => {
  const currentPhase: LessonSession['currentPhase'] = currentSession.currentPhase || 'preparation';
  const isPaused = currentSession.isPaused || false;
  const isCompleted = currentSession.status === 'completed';

  const prepMins = timingSettings.preparationMinutes || 10;
  const sit1Mins = timingSettings.situation1Minutes || 20;
  const sit2Mins = timingSettings.situation2Minutes || 20;
  const finalMins = timingSettings.finalMinutes || 10;
  const totalMins = prepMins + sit1Mins + sit2Mins + finalMins;

  const remainingSecs = typeof currentSession.phaseRemainingSeconds === 'number'
    ? currentSession.phaseRemainingSeconds
    : 0;
  const totalElapsedSecs = currentSession.totalElapsedSeconds || 0;
  const isOverrun = remainingSecs < 0;

  const pacing = useMemo(() => computePhasePacing(currentSession), [currentSession]);

  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const prevPhaseRef = useRef<LessonSession['currentPhase']>(currentPhase);
  const overrunFiredRef = useRef(false);

  const nowTime = () =>
    new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const pushEvent = (text: string, tone: SessionEvent['tone']) => {
    setEvents((prev) => [{ id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time: nowTime(), text, tone }, ...prev].slice(0, 30));
  };

  // watcher: phase change → صافرة + اهتزاز + إعلان صوتي + تسجيل الحدث (بدون أي مؤقت محلي)
  useEffect(() => {
    if (prevPhaseRef.current === currentPhase) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase;
    overrunFiredRef.current = false;

    playWhistleSound('long', timingSettings.soundEnabled);
    triggerVibration(timingSettings.vibrationEnabled);
    announcePhaseInArabic(currentPhase, timingSettings.voiceAnnouncements);

    pushEvent(`انتقال تلقائي: من «${PHASE_META[prev].name}» إلى «${PHASE_META[currentPhase].name}»`, 'success');
    if (timingSettings.voiceAnnouncements) {
      pushEvent('🔊 إعلان صوتي للمرحلة الجديدة', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  // watcher: دخول منطقة التجاوز الزمني (مرة واحدة لكل مرحلة)
  useEffect(() => {
    if (isOverrun && !overrunFiredRef.current && !isCompleted) {
      overrunFiredRef.current = true;
      pushEvent(`تجاوز الزمن المخطط للمرحلة الحالية (+${Math.floor(Math.abs(remainingSecs) / 60)} دقيقة حتى الآن)`, 'warn');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOverrun, isCompleted]);

  const formatMinutesSeconds = (secs: number) => {
    const abs = Math.abs(Math.floor(secs));
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const sign = secs < 0 ? '-' : '';
    return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextPhase = () => {
    playWhistleSound('long', timingSettings.soundEnabled);
    triggerVibration(timingSettings.vibrationEnabled);

    if (currentPhase === 'preparation') {
      onUpdateSession({ currentPhase: 'situation1', phaseRemainingSeconds: sit1Mins * 60 });
      pushEvent('الانتقال اليدوي إلى الوضعية التعلمية الأولى', 'info');
    } else if (currentPhase === 'situation1') {
      onUpdateSession({ currentPhase: 'situation2', phaseRemainingSeconds: sit2Mins * 60 });
      pushEvent('الانتقال اليدوي إلى الوضعية التعلمية الثانية', 'info');
    } else if (currentPhase === 'situation2') {
      onUpdateSession({ currentPhase: 'final', phaseRemainingSeconds: finalMins * 60 });
      pushEvent('الانتقال اليدوي إلى المرحلة الختامية', 'info');
    } else {
      onEndSession();
    }
  };

  const handleExtend = (minutes: number) => {
    const currentMax = pacing.find((p) => p.status === 'current' || p.status === 'overrun')?.plannedSecs || 0;
    onUpdateSession({ phaseRemainingSeconds: (remainingSecs < 0 ? 0 : remainingSecs) + minutes * 60 });
    pushEvent(`⏱️ تمديد المرحلة الحالية +${minutes} دقيقة (المخطط: ${Math.round(currentMax / 60)} دقيقة)`, 'warn');
  };

  const handlePauseToggle = () => {
    onUpdateSession({ isPaused: !isPaused });
    pushEvent(isPaused ? 'استئناف احتساب الزمن' : '⏸️ إيقاف مؤقت للزمن', 'info');
  };

  const phaseProgress = (pacingItem: (typeof pacing)[number]) => {
    if (pacingItem.status === 'pending') return 0;
    if (pacingItem.plannedSecs <= 0) return pacingItem.status === 'current' ? 50 : 100;
    const ratio = Math.min(1, pacingItem.spentSecs / pacingItem.plannedSecs);
    return Math.round(ratio * 100);
  };

  const contingency = currentSession.contingencyMode || 'normal';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-2xl space-y-5 border border-slate-700/80">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ● الجلسة الميدانية جارية مع {currentSession.className}
          </span>
          <h3 className="text-lg font-black text-white mt-1">
            {currentSession.sessionTitle || currentSession.educationalObjective || 'حصة تربية بدنية ورياضية'}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded-full">
              {PHASE_META[currentPhase].name}
            </span>
            {contingency !== 'normal' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CONTINGENCY_BADGES[contingency]}`}>
                {CONTINGENCY_NAMES[contingency]}
              </span>
            )}
            {isCompleted && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40">
                انتهى الزمن المخطط — اعتمد التقرير الآن
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
            الوقت المنقضي: {formatMinutesSeconds(totalElapsedSecs)} / {totalMins} دقيقة
          </span>
        </div>
      </div>

      {/* Smart Pacing Dashboard — planned vs actual per phase */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
        {pacing.map((item) => {
          const meta = PHASE_META[item.phase];
          const isCurrent = item.status === 'current' || item.status === 'overrun';
          const over = item.status === 'overrun';
          return (
            <div
              key={item.phase}
              className={`p-3.5 rounded-2xl border transition-all ${
                isCurrent ? meta.active : item.status === 'done' ? 'bg-slate-700/40 border-slate-600 text-slate-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-70'
              } ${over ? '!border-rose-500 !ring-rose-500/40' : ''}`}
            >
              <span className="text-[10px] font-black block">{item.phase === 'preparation' ? '1. ' : item.phase === 'situation1' ? '2. ' : item.phase === 'situation2' ? '3. ' : '4. '}{meta.name}</span>
              <span className="text-xs font-extrabold block mt-0.5">
                {Math.round(item.spentSecs / 60)}/{Math.round(item.plannedSecs / 60)} د
                {over && <span className="text-rose-300 font-black"> ⚠</span>}
              </span>
              <div className="w-full h-1.5 bg-slate-900/70 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-rose-500' : 'bg-emerald-500/80'}`}
                  style={{ width: `${Math.min(100, phaseProgress(item))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Timer Counter Display */}
      <div className={`bg-slate-950/90 p-6 rounded-3xl border text-center space-y-2 ${isOverrun ? 'border-rose-500/60' : 'border-slate-800'}`}>
        <div className="text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>{isOverrun ? 'تجاوز الزمن المخطط للمرحلة الحالية' : `المتبقي في ${PHASE_META[currentPhase].name}:`}</span>
        </div>
        <div className={`text-5xl sm:text-6xl font-black tracking-wider font-mono dir-ltr ${isOverrun ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
          {formatMinutesSeconds(remainingSecs)}
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Timer className="w-3.5 h-3.5" />
          <span>المخطط: {Math.round((pacing.find((p) => p.status === 'current' || p.status === 'overrun')?.plannedSecs || 0) / 60)} دقيقة</span>
        </div>
      </div>

      {/* Big Field Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={handlePauseToggle}
          disabled={isCompleted}
          className={`px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          <span>{isPaused ? 'استئناف التوقيت' : 'إيقاف مؤقت'}</span>
        </button>

        <button
          onClick={handleNextPhase}
          disabled={isCompleted}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-5 h-5" />
          <span>{currentPhase === 'final' ? 'إنهاء المرحلة والاعتماد' : 'الانتقال للمرحلة التالية'}</span>
        </button>

        <button
          onClick={onEndSession}
          className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>إنهاء الحصة واعتماد التقرير</span>
        </button>
      </div>

      {/* Extend Phase */}
      {!isCompleted && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-700/60 pt-3">
          <span className="text-[11px] font-bold text-slate-300">تعديل إيقاع المرحلة الحالية:</span>
          <button
            onClick={() => handleExtend(1)}
            className="px-4 py-2 rounded-xl bg-slate-700/70 hover:bg-slate-600 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> +1 دقيقة
          </button>
          <button
            onClick={() => handleExtend(2)}
            className="px-4 py-2 rounded-xl bg-slate-700/70 hover:bg-slate-600 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> +2 دقيقة
          </button>
          {isOverrun && (
            <button
              onClick={() => handleExtend(0)}
              className="px-4 py-2 rounded-xl bg-rose-700/60 hover:bg-rose-600 text-white text-xs font-black transition-all cursor-pointer"
            >
              تصفير المؤقت الآن
            </button>
          )}
        </div>
      )}

      {/* Session Event Feed */}
      <div className="border-t border-slate-700/60 pt-3">
        <button
          onClick={() => setShowEvents((v) => !v)}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          سجل أحداث الحصة ({events.length})
          <span className="text-[10px]">{showEvents ? '▲' : '▼'}</span>
        </button>
        {showEvents && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500">لا أحداث بعد — ستُسجل التحولات بين المراحل والتجاوزات والتمديدات هنا تلقائياً.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 font-mono shrink-0 mt-0.5">{ev.time}</span>
                  <span
                    className={
                      ev.tone === 'success'
                        ? 'text-emerald-300'
                        : ev.tone === 'warn'
                        ? 'text-amber-300'
                        : 'text-slate-200'
                    }
                  >
                    {ev.text}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
