import React from 'react';
import { Play, Users, FileText, Zap, ShieldAlert, Clock } from 'lucide-react';
import { ClassRoom, LessonPlan, LessonSession, LessonSessionTiming } from '../../../types/spex';
import { CONTINGENCY_MODES } from '../../../constants/lessonCommandCenter.constants';

interface CommandCenterPreSessionSetupProps {
  teacherClasses: ClassRoom[];
  selectedClassId: string;
  onSelectClassId: (id: string) => void;
  lessonPlans: LessonPlan[];
  selectedLessonPlanId: string;
  onSelectLessonPlanId: (id: string) => void;
  contingencyMode: string;
  onSelectContingencyMode: (mode: string) => void;
  timingSettings: LessonSessionTiming;
  teacherId?: string;
  onStartSession: (sessionData: Omit<LessonSession, 'id'>) => void;
  onNavigateToLessonPlans: () => void;
}

export const CommandCenterPreSessionSetup: React.FC<CommandCenterPreSessionSetupProps> = ({
  teacherClasses,
  selectedClassId,
  onSelectClassId,
  lessonPlans,
  selectedLessonPlanId,
  onSelectLessonPlanId,
  contingencyMode,
  onSelectContingencyMode,
  timingSettings,
  teacherId,
  onStartSession,
  onNavigateToLessonPlans,
}) => {
  const selectedClass = teacherClasses.find((c) => c.id === selectedClassId) || teacherClasses[0];
  const selectedPlan = lessonPlans.find((lp) => lp.id === selectedLessonPlanId) || lessonPlans[0];

  const prepSecs = (timingSettings.preparationMinutes || 10) * 60;
  const sit1Secs = (timingSettings.situation1Minutes || 20) * 60;
  const sit2Secs = (timingSettings.situation2Minutes || 20) * 60;
  const finalSecs = (timingSettings.finalMinutes || 10) * 60;
  const totalMins = (prepSecs + sit1Secs + sit2Secs + finalSecs) / 60;

  const handleLaunch = () => {
    onStartSession({
      teacherId: teacherId || 't_1',
      classId: selectedClassId || teacherClasses[0]?.id || 'cls_1',
      className: selectedClass?.name || '1 ابتدائي 1',
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(Date.now() + totalMins * 60000).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      sessionTitle: selectedPlan?.sessionTitle || 'حصة بيداغوجية موجهة',
      lessonPlanId: selectedLessonPlanId || lessonPlans[0]?.id || 'lp_1',
      educationalObjective: selectedPlan?.generalObjective || 'تطوير المهارات الحركية والتوافق البدني',
      preparationObjective: selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.title || 'الإحماء العام والخاص وتجهيز التلاميذ بدﻧياً ونفسياً',
      situation1Title: selectedPlan?.mainPhase?.learningSituation1?.title || 'الوضعية التعلمية الأولى',
      situation1Description: selectedPlan?.mainPhase?.learningSituation1?.description || 'بناء التعلمات والتطبيق الحركي الفردي والجماعي',
      situation2Title: selectedPlan?.mainPhase?.learningSituation2?.title || 'الوضعية التعلمية الثانية',
      situation2Description: selectedPlan?.mainPhase?.learningSituation2?.description || 'المنافسة المصغرة واللعب الموجه وفق القوانين',
      finalObjective: selectedPlan?.coolDownPhase?.assessmentAndDialogue || 'العودة للهدوء وتفقد العتاد والتقويم الختامي',
      status: 'in_progress',
      currentPhase: 'preparation',
      phaseRemainingSeconds: prepSecs,
      totalElapsedSeconds: 0,
      phaseDurations: {
        preparation: prepSecs,
        situation1: sit1Secs,
        situation2: sit2Secs,
        final: finalSecs
      },
      actualPhaseSpent: {
        preparation: 0,
        situation1: 0,
        situation2: 0,
        final: 0
      },
      isPaused: false,
      contingencyMode: (contingencyMode as LessonSession['contingencyMode']) || 'normal',
    });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">إعداد انطلاق الحصة الميدانية</h3>
          <p className="text-xs text-slate-500">اختر القسم، المذكرة البيداغوجية، وظروف الحصة لبدء التوقيت الحي</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>1. اختر القسم التربوي:</span>
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => onSelectClassId(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-emerald-500 cursor-pointer"
          >
            {teacherClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.studentCount || 25} تلميذاً)
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Plan Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>2. المذكرة البيداغوجية المعتمدة:</span>
          </label>
          <select
            value={selectedLessonPlanId}
            onChange={(e) => onSelectLessonPlanId(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-blue-500 cursor-pointer"
          >
            {lessonPlans.map((lp) => (
              <option key={lp.id} value={lp.id}>
                {lp.sessionTitle} ({lp.levelName || 'ابتدائي'})
              </option>
            ))}
          </select>
        </div>

        {/* Contingency Mode Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>3. تكييف الظروف والبيئة:</span>
          </label>
          <select
            value={contingencyMode}
            onChange={(e) => onSelectContingencyMode(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:border-amber-500 cursor-pointer"
          >
            {CONTINGENCY_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Lesson Overview */}
      {selectedPlan && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900">{selectedPlan.sessionTitle}</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
              {selectedPlan.durationMinutes ? `${selectedPlan.durationMinutes} دقيقة` : `${totalMins} دقيقة`}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong>الهدف التعلمي:</strong> {selectedPlan.generalObjective || 'تنمية المهارات الحركية والتنقل بالتوازن'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>التوزيع الزمني التلقائي:</span>
            </span>
            {[
              ['الإحماء', prepSecs / 60],
              ['وضعية 1', sit1Secs / 60],
              ['وضعية 2', sit2Secs / 60],
              ['ختام', finalSecs / 60],
            ].map(([label, mins]) => (
              <span key={label} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-600">
                {label}: {mins} د
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Launch Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={onNavigateToLessonPlans}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
        >
          + إضافة أو تعديل مذكرة بيداغوجية
        </button>

        <button
          onClick={handleLaunch}
          className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>انطلاق الحصة الآن الميدان والتوقيت</span>
        </button>
      </div>
    </div>
  );
};
