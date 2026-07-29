/**
 * SPEX - Lesson Command Center View
 * مركز قيادة الحصة البيداغوجية الذكي والتفاعلي لمرافقة أستاذ التربية البدنية والرياضية
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Timer,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  FileText,
  Volume2,
  VolumeX,
  Smartphone,
  Settings,
  Sparkles,
  Plus,
  Minus,
  Maximize2,
  Award,
  BookMarked,
  X,
  Check,
  ChevronRight,
  ShieldCheck,
  Activity,
  Calendar,
  Zap,
  Megaphone,
  UserCheck,
  UserX,
  UserMinus,
  RefreshCw,
  Shuffle,
  Dumbbell,
  Flag,
  Lightbulb,
  Share2,
  Star,
  Flame,
  CloudSun,
  ShieldAlert,
  Sliders
} from 'lucide-react';

import {
  LessonSession,
  LessonSessionTiming,
  ClassRoom,
  LessonPlan,
  Student,
  DailyNotebookEntry,
  WeeklyScheduleSlot,
  LessonExecutionLog
} from '../../types/spex';

interface LessonCommandCenterViewProps {
  currentSession: LessonSession | null;
  timingSettings: LessonSessionTiming;
  teacherClasses: ClassRoom[];
  lessonPlans: LessonPlan[];
  students: Student[];
  weeklySchedule: WeeklyScheduleSlot[];
  onStartSession: (sessionData: Omit<LessonSession, 'id'>) => void;
  onUpdateSession: (updated: Partial<LessonSession>) => void;
  onEndSession: (executionLog?: LessonExecutionLog) => void;
  onUpdateTimingSettings: (settings: LessonSessionTiming) => void;
  onNavigateToLessonPlans: () => void;
  onAddNotebookEntry?: (entry: Omit<DailyNotebookEntry, 'id'>) => void;
}

export const LessonCommandCenterView: React.FC<LessonCommandCenterViewProps> = ({
  currentSession,
  timingSettings,
  teacherClasses,
  lessonPlans,
  students,
  weeklySchedule,
  onStartSession,
  onUpdateSession,
  onEndSession,
  onUpdateTimingSettings,
  onNavigateToLessonPlans,
  onAddNotebookEntry
}) => {
  // Pre-session setup selection
  const [selectedClassId, setSelectedClassId] = useState<string>(
    teacherClasses[0]?.id || ''
  );
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [lastFinishedExecutionLog, setLastFinishedExecutionLog] = useState<LessonExecutionLog | null>(null);
  const [isFullScreenMode, setIsFullScreenMode] = useState<boolean>(true);
  const [showQuickAttendanceModal, setShowQuickAttendanceModal] = useState<boolean>(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState<string>('');

  // Active tools state inside command center
  const [activeTabTool, setActiveTabTool] = useState<'guide' | 'attendance' | 'teams' | 'stopwatch'>('guide');

  // Quick attendance state during active session
  const [attendanceRecords, setAttendanceRecords] = useState<{
    [studentId: string]: 'present' | 'absent' | 'exempt';
  }>({});
  const [studentRatings, setStudentRatings] = useState<{
    [studentId: string]: string[];
  }>({});
  const [lessonNotesInput, setLessonNotesInput] = useState<string>('');

  // Field Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const [stopwatchLaps, setStopwatchLaps] = useState<number[]>([]);

  // Generated Teams state
  const [teamCount, setTeamCount] = useState<number>(2);
  const [generatedTeams, setGeneratedTeams] = useState<{
    [teamName: string]: Student[];
  }>({});

  // Adaptation Modes
  const [contingencyMode, setContingencyMode] = useState<'normal' | 'hot_weather' | 'equipment_shortage' | 'high_fatigue'>('normal');

  // Stopwatch interval timer
  useEffect(() => {
    let interval: any = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 10);
      }, 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Audio Synthesizer via Web Audio API (Whistle & Chimes)
  const playWhistleSound = (type: 'short' | 'double' | 'long' | 'chime' = 'short') => {
    if (!timingSettings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'short') {
        // Single sharp athletic whistle sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(2700, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'double') {
        // Two rhythmic whistle bursts
        [0, 0.18].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2900, ctx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(3300, ctx.currentTime + delay + 0.04);
          osc.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + delay + 0.12);

          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.14);
        });
      } else if (type === 'long') {
        // Long sustained whistle sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2850, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(3150, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(3000, ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else {
        // Soft chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  // Vibration feedback
  const triggerVibration = () => {
    if (timingSettings.vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch (e) {}
    }
  };

  // Auto-find matching lesson plan for selected class
  useEffect(() => {
    if (selectedClassId) {
      const cls = teacherClasses.find((c) => c.id === selectedClassId);
      if (cls) {
        const matchingPlan = lessonPlans.find(
          (lp) => lp.levelName === cls.levelId || lp.className === cls.name || lp.teacherId === cls.teacherId
        );
        if (matchingPlan) {
          setSelectedLessonPlanId(matchingPlan.id);
        } else if (lessonPlans.length > 0) {
          setSelectedLessonPlanId(lessonPlans[0].id);
        }
      }
    }
  }, [selectedClassId, teacherClasses, lessonPlans]);

  // Selected Class details
  const activeClass = teacherClasses.find((c) => c.id === selectedClassId);
  const selectedPlan = lessonPlans.find((lp) => lp.id === selectedLessonPlanId);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format Stopwatch time MM:SS:MS
  const formatStopwatch = (timeMs: number) => {
    const mins = Math.floor(timeMs / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const ms = Math.floor((timeMs % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Handle Starting a Session
  const handleStartSession = () => {
    if (!activeClass) return;

    const prepSecs = timingSettings.preparationMinutes * 60;
    const sit1Secs = timingSettings.situation1Minutes * 60;
    const sit2Secs = timingSettings.situation2Minutes * 60;
    const finalSecs = timingSettings.finalMinutes * 60;

    const newSession: Omit<LessonSession, 'id'> = {
      teacherId: activeClass.teacherId || 'usr_teacher_1',
      classId: activeClass.id,
      className: activeClass.name,
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      sessionTitle: selectedPlan ? selectedPlan.sessionTitle || selectedPlan.title || `حصة التربية البدنية - ${activeClass.name}` : `حصة التربية البدنية والرياضية - ${activeClass.name}`,
      lessonPlanId: selectedPlan?.id,
      educationalObjective: selectedPlan
        ? selectedPlan.generalObjective || selectedPlan.objective || 'تطوير المهارات الحركية والتوافق البدني الجماعي'
        : 'تطوير المهارات الحركية والتوافق البدني الجماعي والالتزام بقواعد اللعب',
      preparationObjective: selectedPlan?.warmupPhase?.generalWarmup || selectedPlan?.preparationPart?.objective || 'الإحماء العام والخاص وتنظيم الصفوف',
      situation1Title: selectedPlan?.mainPhase?.learningSituation1?.title || selectedPlan?.learningSituations?.[0]?.title || 'الموقف التعليمي الأول: بناء التعلمات والمهارات الأساسية',
      situation1Description: selectedPlan?.mainPhase?.learningSituation1?.description || selectedPlan?.learningSituations?.[0]?.content || 'تنفيذ الوضعية التعلمية المبرمجة بالتركيز على التوافق الحركي والتحكم الفردي.',
      situation2Title: selectedPlan?.mainPhase?.learningSituation2?.title || selectedPlan?.learningSituations?.[1]?.title || 'الموقف التعليمي الثاني: الوضعية المشكلة والمنافسة',
      situation2Description: selectedPlan?.mainPhase?.learningSituation2?.description || selectedPlan?.learningSituations?.[1]?.content || 'تطبيق المهارات في موقف منافسة مصغرة أو لعبة جماعية موجهة.',
      finalObjective: selectedPlan?.coolDownPhase?.activities || selectedPlan?.finalPart?.objective || 'العودة للهدوء والتقويم الختامي واستخلاص النتائج وجمع العتاد',
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
      startedAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      isPaused: false
    };

    playWhistleSound('long');
    triggerVibration();
    onStartSession(newSession);
  };

  // Phase names map
  const PHASES: Array<{
    id: 'preparation' | 'situation1' | 'situation2' | 'final';
    title: string;
    subtitle: string;
    defaultMin: number;
    color: string;
  }> = [
    {
      id: 'preparation',
      title: 'المرحلة التحضيرية',
      subtitle: 'الإحماء العام والخاص + نداء الحضور والتنظيم',
      defaultMin: timingSettings.preparationMinutes,
      color: 'amber'
    },
    {
      id: 'situation1',
      title: 'الموقف التعليمي الأول',
      subtitle: 'بناء التعلمات المباشرة والمهارات الأساسية',
      defaultMin: timingSettings.situation1Minutes,
      color: 'blue'
    },
    {
      id: 'situation2',
      title: 'الموقف التعليمي الثاني',
      subtitle: 'الوضعية المشكلة المركبة / اللعب والمنافسة',
      defaultMin: timingSettings.situation2Minutes,
      color: 'indigo'
    },
    {
      id: 'final',
      title: 'المرحلة الختامية',
      subtitle: 'الاسترجاع والتهدئة + التقييم وجمع العتاد',
      defaultMin: timingSettings.finalMinutes,
      color: 'emerald'
    }
  ];

  // Pause / Resume Toggle
  const handleTogglePause = () => {
    if (!currentSession) return;
    onUpdateSession({ isPaused: !currentSession.isPaused });
    playWhistleSound('short');
  };

  // Next Phase Transition
  const handleNextPhase = () => {
    if (!currentSession) return;

    const currentIdx = PHASES.findIndex((p) => p.id === currentSession.currentPhase);
    if (currentIdx < PHASES.length - 1) {
      const nextPhaseId = PHASES[currentIdx + 1].id;
      const nextSecs = currentSession.phaseDurations[nextPhaseId];

      playWhistleSound('double');
      triggerVibration();

      onUpdateSession({
        currentPhase: nextPhaseId,
        phaseRemainingSeconds: nextSecs,
        isPaused: false
      });
    } else {
      // Reached end of final phase
      handleFinishSession();
    }
  };

  // Fast forward / adjust time (+3m / -3m)
  const handleAdjustTime = (deltaSeconds: number) => {
    if (!currentSession) return;
    const newRem = Math.max(0, currentSession.phaseRemainingSeconds + deltaSeconds);
    onUpdateSession({ phaseRemainingSeconds: newRem });
  };

  // Finish session
  const handleFinishSession = () => {
    if (!currentSession) return;

    playWhistleSound('long');
    triggerVibration();

    const actualEndTime = new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    const totalMins = Math.round(currentSession.totalElapsedSeconds / 60) || 60;

    const log: LessonExecutionLog = {
      id: `exec_${Date.now()}`,
      teacherId: currentSession.teacherId,
      classId: currentSession.classId,
      className: currentSession.className,
      lessonPlanTitle: currentSession.sessionTitle,
      date: currentSession.date,
      actualStartTime: currentSession.startedAt || '08:00',
      actualEndTime,
      totalDurationMinutes: totalMins,
      phaseDurations: {
        preparation: Math.round(currentSession.actualPhaseSpent.preparation / 60),
        situation1: Math.round(currentSession.actualPhaseSpent.situation1 / 60),
        situation2: Math.round(currentSession.actualPhaseSpent.situation2 / 60),
        final: Math.round(currentSession.actualPhaseSpent.final / 60)
      },
      delaysOrOverrunsMinutes: Math.max(0, totalMins - 60),
      completionStatus: totalMins <= 65 ? 'منجزة في الوقت' : 'تجاوز زمني',
      notes: lessonNotesInput,
      attendanceData: {
        total: students.filter((s) => s.classId === currentSession.classId).length || 24,
        present: Object.values(attendanceRecords).filter((r) => r === 'present').length || 22,
        absent: Object.values(attendanceRecords).filter((r) => r === 'absent').length || 1,
        exempt: Object.values(attendanceRecords).filter((r) => r === 'exempt').length || 1
      }
    };

    // Auto-Add to Daily Notebook if enabled
    if (timingSettings.autoLogToNotebook && onAddNotebookEntry) {
      onAddNotebookEntry({
        date: currentSession.date,
        timeSlot: `${currentSession.startedAt} - ${actualEndTime}`,
        classId: currentSession.classId,
        className: currentSession.className,
        lessonPlanTitle: currentSession.sessionTitle,
        fieldTitle: 'التربية البدنية والرياضية',
        status: 'منجزة',
        notes: `تم تنفيذ الحصة بمركز القيادة. ${lessonNotesInput ? `ملاحظات: ${lessonNotesInput}` : ''}`
      });
    }

    setLastFinishedExecutionLog(log);
    setShowSummaryModal(true);
    onEndSession(log);
  };

  // Split Class into Balanced Teams
  const handleGenerateTeams = () => {
    const classStudents = students.filter((s) => s.classId === (currentSession?.classId || selectedClassId));
    if (classStudents.length === 0) return;

    const shuffled = [...classStudents].sort(() => 0.5 - Math.random());
    const teams: { [teamName: string]: Student[] } = {};

    const teamNames = ['الفريق الأحمر 🔴', 'الفريق الأزرق 🔵', 'الفريق الأخضر 🟢', 'الفريق الأصفر 🟡'];

    for (let i = 0; i < teamCount; i++) {
      teams[teamNames[i]] = [];
    }

    shuffled.forEach((student, index) => {
      const teamIdx = index % teamCount;
      teams[teamNames[teamIdx]].push(student);
    });

    setGeneratedTeams(teams);
  };

  // Get active phase details with game details and smart reminders
  const getActivePhaseDetails = () => {
    if (!currentSession) return null;

    switch (currentSession.currentPhase) {
      case 'preparation':
        return {
          title: 'المرحلة التحضيرية',
          durationMinutes: timingSettings.preparationMinutes,
          gameTitle: selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.title || 'اللعبة الإحمائية والتهيئة الحركية',
          objective: currentSession.preparationObjective || selectedPlan?.generalObjective || 'الإحماء العام والخاص وتجهيز التلاميذ بدنياً ونفسياً',
          content: selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.rules
            ? `قواعد اللعبة الإحمائية: ${selectedPlan.warmupPhase.pedagogicalWarmupGame.rules}`
            : 'تنظيم الصفوف، نداء الحضور، الجري الخفيف والتنقلات مع إشارات الصفارة، تمارين المرونة المَفصلية والإحماء الموجه.',
          nextPhaseTitle: 'الموقف التعليمي الأول (بناء التعلمات - 20 د)',
          color: 'amber',
          tips: [
            'تأكد من سلامة الأرضية وخلو الملعب من أي عوائق.',
            'ركز على الجري الخفيف والتنفس المنتظم لمنع التشنجات.',
            'قم بنادء الحضور سريعاً واستبعاد التلاميذ غير المرتدين للباس الرياضي.'
          ]
        };
      case 'situation1':
        return {
          title: 'الموقف التعليمي الأول (بناء التعلمات)',
          durationMinutes: timingSettings.situation1Minutes,
          gameTitle: selectedPlan?.mainPhase?.learningSituation1?.title || 'الموقف 1: الوضعية التعلمية المباشرة والمهارات الأساسية',
          objective: currentSession.educationalObjective || 'تطوير المهارات الحركية والتوافق البدني',
          content: currentSession.situation1Description || selectedPlan?.mainPhase?.learningSituation1?.description || 'شرح نموذج الحركة، توزيع العتاد، والتطبيق الفردي والجماعي بالتكرار للتمكن من الأداء الحركي.',
          nextPhaseTitle: 'الموقف التعليمي الثاني (المنافسة واللعب الموجه - 20 د)',
          color: 'blue',
          tips: [
            'قدم نموذجاً حركياً واضحاً ومصغراً قبل بدء التطبيق.',
            'وزع العتاد والمجموعات بشكل يضمن التكرار المباشر لكل تلميذ.',
            'ركز على تصحيح الأخطاء الشائعة دون إيقاف الحصة للجميع.'
          ]
        };
      case 'situation2':
        return {
          title: 'الموقف التعليمي الثاني (الوضعية المشكلة والتنافس)',
          durationMinutes: timingSettings.situation2Minutes,
          gameTitle: selectedPlan?.mainPhase?.learningSituation2?.title || 'الموقف 2: اللعبة التنافسية والوضعية المشكلة المركبة',
          objective: selectedPlan?.mainPhase?.learningSituation2?.description || currentSession.situation2Title || 'تطبيق التعلمات في موقف منافسة مصغرة والتكيف مع قانون اللعبة',
          content: currentSession.situation2Description || selectedPlan?.mainPhase?.guidedApplication?.rules || 'منافسات مصغرة بين الأفواج المتوازنة، احتساب النقاط، تشجيع التحكيم الذاتي والالتزام بقواعد اللعب.',
          nextPhaseTitle: 'المرحلة الختامية (التهدئة والتقويم - 10 د)',
          color: 'indigo',
          tips: [
            'طبق نظام الأفواج المتوازنة وشجع التحكيم الذاتي.',
            'عزز الروح الرياضية واحترام المنافس وتطبيق القانون.',
            'راقب الجهد البدني لمنع الإجهاد الحراري خاصة في الجو الحار.'
          ]
        };
      case 'final':
        return {
          title: 'المرحلة الختامية (التهدئة والتقويم)',
          durationMinutes: timingSettings.finalMinutes,
          gameTitle: selectedPlan?.coolDownPhase?.activities || 'لعبة العودة للهدوء والتقويم الختامي',
          objective: currentSession.finalObjective || 'العودة للهدوء واستخلاص النتائج وتفقد العتاد',
          content: selectedPlan?.coolDownPhase?.assessmentAndDialogue || 'تمارين الاسترخاء والترويع، التقييم الذاتي للحصة والحوار الهادف، جمع العتاد والمغادرة بانتظام نحو الأقسام.',
          nextPhaseTitle: 'نهاية الحصة وتوثيق الكراس اليومي 📝',
          color: 'emerald',
          tips: [
            'اجعل جميع التلاميذ يجلسون في نصف دائرة للتهدئة والتنفس العميق.',
            'اطرح أسئلة تقويمية حول مدى تحقيق الهدف البيداغوجي للحصة.',
            'كلف رئيس الفريق بجمع وتفقد العتاد قبل التوجه للأقسام.'
          ]
        };
      default:
        return null;
    }
  };

  // Smart dynamic alert ticker message synchronized with timer countdown
  const getSmartTickerAlertMessage = () => {
    if (!currentSession) return '';

    const remainingSecs = currentSession.phaseRemainingSeconds;
    const remainingMin = Math.ceil(remainingSecs / 60);
    const totalRemainingMin = Math.ceil(Math.max(0, 3600 - currentSession.totalElapsedSeconds) / 60);

    // Warmup pedagogical game title and rules
    const warmupGameTitle = selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.title || 'اللعبة التربوية الإحمائية (التهيئة الحركية)';
    const warmupGameRules = selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.rules || 'تنظيم الصفوف والجري الخفيف مع تنفيذ الإشارات الصوتية والحركية';

    // Learning Situation 1
    const sit1Title = selectedPlan?.mainPhase?.learningSituation1?.title || 'الموقف التعليمي الأول: بناء التعلمات والمهارات الأساسية';
    const sit1Desc = currentSession.situation1Description || selectedPlan?.mainPhase?.learningSituation1?.description || 'شرح نموذج الحركة والتطبيق الفردي والجماعي بالتكرار للتمكن من الأداء الحركي';

    // Learning Situation 2
    const sit2Title = selectedPlan?.mainPhase?.learningSituation2?.title || 'الموقف التعليمي الثاني: اللعبة التنافسية والوضعية المشكلة';
    const sit2Desc = currentSession.situation2Description || selectedPlan?.mainPhase?.guidedApplication?.rules || 'منافسات مصغرة بين الأفواج المتوازنة مع تطبيق قواعد اللعبة والتحكيم الذاتي';

    // Cool-down
    const finalActivities = selectedPlan?.coolDownPhase?.activities || 'لعبة العودة للهدوء والتقويم الختامي';

    switch (currentSession.currentPhase) {
      case 'preparation':
        if (remainingSecs <= 120) {
          return `🔔 [تنبيه اقتراب نهاية الإحماء]: متبقي دقيقتان (${remainingMin}د) على نهاية المرحلة التحضيرية! استعد لإنهائها والانتقال فوراً للموقف التعليمي الأول: "${sit1Title}" ⏱️ إجمالي الحصة المتبقي: ${totalRemainingMin} دقيقة.`;
        }
        return `🏃‍♂️ [المرحلة التحضيرية - 10د]: اسم اللعبة التربوية الإحمائية: "${warmupGameTitle}" 📋 القواعد: (${warmupGameRules}) 🎯 الهدف: ${selectedPlan?.generalObjective || 'الإحماء وتجهيز التلاميذ بدﻧياً ونفسياً'} ⏱️ المتبقي: ${remainingMin} دقيقة.`;

      case 'situation1':
        if (remainingSecs <= 180) {
          return `⚠️ [تنبيه نهاية الموقف التعليمي الأول]: باقي ${remainingMin} دقائق فقط على ختام الموقف الأول! استعد لتنبيه التلاميذ ببدء الموقف التعليمي الثاني (المنافسة واللعب الموجه): "${sit2Title}" 🏆 الشرح: (${sit2Desc}).`;
        }
        return `⚽ [الموقف التعليمي الأول - 20د]: "${sit1Title}" 📋 الشرح البسيط والتطبيق: (${sit1Desc}) 🎯 الهدف: بناء وتطوير الأداء الحركي والتوافق ⏱️ متبقي ${remainingMin} دقيقة على ختام الموقف الأول.`;

      case 'situation2':
        if (remainingSecs <= 180) {
          return `🔔 [تنبيه نهاية الموقف التعلمي الثاني والمنافسة]: باقي ${remainingMin} دقائق على نهاية المنافسات! استعد للتنبيه بالجمهرة والتحول إلى المرحلة الختامية والتهدئة: "${finalActivities}" 📝`;
        }
        return `🏆 [الموقف التعليمي الثاني - 20د]: "${sit2Title}" 📋 قواعد اللعبة والمستجدات: (${sit2Desc}) 🎯 الهدف: التطبيق في منافسة مصغرة والتكيف مع القوانين والروح الرياضية ⏱️ متبقي ${remainingMin} دقيقة.`;

      case 'final':
        if (remainingSecs <= 120) {
          return `🏁 [تنبيه ختام الحصة الكلية - 60 دقيقة]: متبقي دقيقتان فقط! اجمع التلاميذ في نصف دائرة للتهدئة، استخلص نتائج الحصة، تفقد العتاد الرياضي ونظم خروج الصفوف نحو الأقسام 🏫`;
        }
        return `🧘‍♂️ [المرحلة الختامية - 10د]: "${finalActivities}" 📋 التهدئة والحوار البيداغوجي: (${selectedPlan?.coolDownPhase?.assessmentAndDialogue || 'استخلاص النتائج والتقويم الذاتي'}) 🎯 الهدف: العودة للهدوء وتفقد العتاد ⏱️ المتبقي: ${remainingMin} دقيقة.`;

      default:
        return `⏱️ مركز قيادة الحصة البيداغوجية - إجمالي الزمن المتبقي: ${totalRemainingMin} دقيقة.`;
    }
  };

  const activePhaseInfo = getActivePhaseDetails();
  const smartTickerMessage = getSmartTickerAlertMessage();

  const currentClassStudents = currentSession ? students.filter((s) => s.classId === currentSession.classId) : [];
  const presentCount = currentClassStudents.filter((s) => (attendanceRecords[s.id] || 'present') === 'present').length;
  const absentCount = currentClassStudents.filter((s) => attendanceRecords[s.id] === 'absent').length;
  const exemptCount = currentClassStudents.filter((s) => attendanceRecords[s.id] === 'exempt').length;

  return (
    <div className={`space-y-6 animate-in fade-in duration-200 dir-rtl ${
      isFullScreenMode ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-white p-4 sm:p-6 lg:p-8 space-y-6 shadow-2xl' : ''
    }`}>
      {/* Inline style for marquee text animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 26s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30 backdrop-blur-md">
              <Timer className="w-4 h-4 animate-pulse text-blue-400" />
              <span>مركز قيادة الحصة البيداغوجية المباشرة v2.0 (الشاشة الكاملة)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>مساعد الأستاذ الرقمي الميداني</span>
              <span className="text-xl px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl">
                ⏱️ توقيت وتوجيه بيداغوجي 60د
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              أداة قيادية متكاملة لمرافقة الأستاذ في الملعب: صفارات رقمية، مؤقت تنازلي ذكي، تقسيم الأفواج، تسجيل الغيابات، وتوجيهات بيداغوجية فورية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Attendance Trigger Button */}
            <button
              onClick={() => setShowQuickAttendanceModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer border border-emerald-400/30"
              title="تسجيل الحضور والغياب الميداني للفوج"
            >
              <UserCheck className="w-4 h-4 text-emerald-200" />
              <span>تسجيل غياب الفوج 📋 ({presentCount} حاضر / {absentCount} غائب)</span>
            </button>

            {/* Toggle Fullscreen button */}
            <button
              onClick={() => setIsFullScreenMode(!isFullScreenMode)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-xs shadow-lg transition-all cursor-pointer"
            >
              <span>{isFullScreenMode ? 'إلغاء وضع الشاشة الكاملة ↙️' : 'توسيع للشاشة الكاملة ↗️'}</span>
            </button>

            {/* Quick Whistle Sound Trigger */}
            <button
              onClick={() => playWhistleSound('short')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
              title="صفارة الحكم/الأستاذ"
            >
              <Megaphone className="w-4 h-4 text-slate-950" />
              <span>صفارة سريعة 🎺</span>
            </button>

            <button
              onClick={() => onUpdateTimingSettings({ ...timingSettings, soundEnabled: !timingSettings.soundEnabled })}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                timingSettings.soundEnabled
                  ? 'bg-blue-600/30 text-blue-200 border-blue-400/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              {timingSettings.soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{timingSettings.soundEnabled ? 'التنبيه الصوتي مفعّل' : 'الصوت مكتوم'}</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span>ضبط المدد والإعدادات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switch: 1. Setup mode (if no session active) or 2. Live Session Active Screen */}
      {!currentSession || currentSession.status === 'completed' ? (
        /* Pre-Session Setup & Selection View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Setup Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">إطلاق الحصة في مركز القيادة</h3>
                  <p className="text-xs text-slate-500">اختر القسم والمذكرة المعتمدة للبدء في المركز القيادي بالزمن الحي</p>
                </div>
              </div>
            </div>

            {/* Step 1: Select Class */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                1. اختيار القسم التعليمي:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {teacherClasses.map((cls) => {
                  const isSelected = cls.id === selectedClassId;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`p-4 rounded-2xl text-right border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-extrabold block">{cls.name}</span>
                      <span className={`text-[11px] block mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {cls.studentCount} تلميذ • {cls.schoolName || 'المؤسسة'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select or Validate Lesson Plan */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  2. ربط المذكرة البيداغوجية الرسمية:
                </label>
                <button
                  onClick={onNavigateToLessonPlans}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إعداد مذكرة جديدة</span>
                </button>
              </div>

              {selectedPlan ? (
                <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md">
                        مذكرة معتمدة
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{selectedPlan.sessionTitle || selectedPlan.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      الهدف: {selectedPlan.generalObjective || selectedPlan.objective}
                    </p>
                  </div>
                  <select
                    value={selectedLessonPlanId}
                    onChange={(e) => setSelectedLessonPlanId(e.target.value)}
                    className="text-xs font-bold bg-white text-slate-800 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {lessonPlans.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.sessionTitle || lp.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900">
                      تنبيه: لا توجد مذكرة بيداغوجية معتمدة مرتبطة بالقسم المحدد!
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      سيتم استخدام المخطط المعياري لمنهاج التربية البدنية والرياضية تلقائياً للتحكم بالزمن.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Default Phase Breakdown Preview */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                3. التوزيع الزمني التلقائي للحصة (60 دقيقة):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PHASES.map((ph, idx) => (
                  <div key={ph.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                      المرحلة {idx + 1}
                    </span>
                    <h5 className="text-xs font-bold text-slate-800">{ph.title}</h5>
                    <span className="text-sm font-extrabold text-slate-900 block font-mono">
                      {ph.defaultMin} دقائق
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Big Start Button */}
            <div className="pt-4">
              <button
                onClick={handleStartSession}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-base rounded-2xl shadow-xl shadow-blue-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="w-6 h-6 fill-current text-white animate-pulse" />
                <span>بدء تنفيذ الحصة المباشرة الآن 🚀</span>
              </button>
            </div>
          </div>

          {/* Side Info & Whistle Console Preview Box */}
          <div className="space-y-6">
            {/* Whistle Sound Effects Panel */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Megaphone className="w-5 h-5" />
                <h4 className="text-sm font-bold">منصة الصفارة الرقمية المباشرة</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                استخدم صفارة الملعب الصوتية مباشرة من هاتفك أو لوحتك الرقمية لقيادة التلاميذ:
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={() => playWhistleSound('short')}
                  className="p-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 rounded-2xl text-center transition-all cursor-pointer"
                >
                  <span className="text-xs font-black block">قصيرة 🎺</span>
                  <span className="text-[10px] opacity-80 block">تنبيه / توقف</span>
                </button>

                <button
                  onClick={() => playWhistleSound('double')}
                  className="p-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 rounded-2xl text-center transition-all cursor-pointer"
                >
                  <span className="text-xs font-black block">مزدوجة 🎺🎺</span>
                  <span className="text-[10px] opacity-80 block">انتقال للمرحلة</span>
                </button>

                <button
                  onClick={() => playWhistleSound('long')}
                  className="p-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 rounded-2xl text-center transition-all cursor-pointer"
                >
                  <span className="text-xs font-black block">طويلة 🎺</span>
                  <span className="text-[10px] opacity-80 block">إنهاء النشاط</span>
                </button>
              </div>
            </div>

            {/* Quick Time Slots Preview */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>جدول الحصص القادمة</span>
              </h4>
              <p className="text-xs text-slate-500">
                الحصة القادمة المبرمجة حسب التوزيع الأسبوعي:
              </p>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-900 block">{activeClass?.name || 'السنة 5 ابتدائي'}</span>
                  <span className="text-blue-700 text-[11px]">09:00 - 10:00 • الملعب الرئيسي</span>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg">
                  جاهزة
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE ACTIVE SESSION SCREEN */
        <div className="space-y-6">
          {/* Top Main Active Session Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-3.5 w-3.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentSession.isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${currentSession.isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    القسم: {currentSession.className} • {currentSession.sessionTitle}
                  </span>
                  <h3 className="text-lg font-black text-white">
                    الحصة جارية الآن بمركز القيادة الميداني
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinishSession}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إنهاء الحصة وتوثيق البيانات</span>
                </button>
              </div>
            </div>

            {/* ANIMATED SMART LIVE TICKER BAR - SYNCHRONIZED WITH COUNTDOWN */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-3 border border-amber-500/40 shadow-lg relative overflow-hidden flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/40 shrink-0 text-xs font-black animate-pulse">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>تنبيهات القيادة المتحركة المباشرة:</span>
              </div>

              <div className="overflow-hidden whitespace-nowrap flex-1 relative py-1">
                <div className="inline-block animate-marquee text-xs font-extrabold text-amber-200 tracking-wide">
                  {smartTickerMessage}
                </div>
              </div>
            </div>

            {/* Giant Dual Timer & Active Phase Smart Alarm Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Timer & Stopwatch Display Column */}
              <div className="lg:col-span-5 bg-slate-950/90 rounded-3xl p-6 border border-slate-800 text-center space-y-5 shadow-inner relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>ساعة الأستاذ الميدانية (60 دقيقة)</span>
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      إجمالي الحصة: {formatTime(Math.max(0, 3600 - currentSession.totalElapsedSeconds))} متبقية
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest block">
                    العد التنازلي للمرحلة النشطة: {activePhaseInfo?.title}
                  </span>

                  <div className="text-5xl sm:text-6xl font-mono font-black text-blue-400 tracking-wider my-3 text-shadow">
                    {formatTime(currentSession.phaseRemainingSeconds)}
                  </div>

                  {/* Low time alarm banner */}
                  {currentSession.phaseRemainingSeconds <= 120 && (
                    <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-300 text-xs font-extrabold animate-pulse flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>تنبيه المنبه الذكي: باقي أقل من دقيقتين! استعد للانتقال للمرحلة التالية</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-2 px-2">
                    <span>المنقضي: {Math.floor(currentSession.totalElapsedSeconds / 60)} دقيقة</span>
                    <span>الهدف المحدد: {activePhaseInfo?.durationMinutes} دقائق</span>
                  </div>
                </div>

                {/* Adjust time buttons */}
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleAdjustTime(-180)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      -3 دقائق
                    </button>
                    <button
                      onClick={() => handleAdjustTime(-60)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      -1 دقيقة
                    </button>
                    <button
                      onClick={() => handleAdjustTime(60)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      +1 دقيقة
                    </button>
                    <button
                      onClick={() => handleAdjustTime(180)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      +3 دقائق
                    </button>
                  </div>

                  {/* Pause / Resume & Next controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePause}
                      className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        currentSession.isPaused
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      {currentSession.isPaused ? (
                        <>
                          <Play className="w-5 h-5 fill-current" />
                          <span>استئناف</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-5 h-5 fill-current" />
                          <span>إيقاف مؤقت</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleNextPhase}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <SkipForward className="w-5 h-5" />
                      <span>الانتقال فوراً للمرحلة القادمة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Content, Objectives & Smart Game Alarm Column */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                {/* Smart Alarm Active Game Reminder Box */}
                <div className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-blue-500/30 shadow-lg space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-400/30">
                        <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block">المنبه الذكي والتذكير باللعبة</span>
                        <h4 className="text-sm font-black text-white">{activePhaseInfo?.title}</h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-black rounded-xl border border-amber-500/30">
                      المدة: {activePhaseInfo?.durationMinutes} دقائق
                    </span>
                  </div>

                  {/* Active Game Title */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">⚽ اسم اللعبة والنشاط النشط حالياً:</span>
                    <h5 className="text-sm font-extrabold text-amber-300">{activePhaseInfo?.gameTitle}</h5>
                  </div>

                  {/* Educational Objective */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-blue-200">🎯 الهدف البيداغوجي للحصة والمرحلة:</h5>
                    <p className="text-xs text-slate-100 font-semibold leading-relaxed">
                      {activePhaseInfo?.objective}
                    </p>
                  </div>

                  {/* Rules and Setup */}
                  <div className="space-y-1 pt-2 border-t border-slate-700/60">
                    <h5 className="text-xs font-bold text-slate-300">📋 قواعد اللعبة والتوجيه الميداني:</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activePhaseInfo?.content}
                    </p>
                  </div>

                  {/* Next Phase Preview */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span>المرحلة واللعبة القادمة:</span>
                    <span className="font-bold text-amber-300">{activePhaseInfo?.nextPhaseTitle}</span>
                  </div>

                  {/* Quick Attendance Registration CTA */}
                  <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>حالة نداء الفوج:</span>
                      <span className="text-emerald-400 font-extrabold">{presentCount} حاضر</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-rose-400 font-extrabold">{absentCount} غائب</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-amber-400 font-extrabold">{exemptCount} معفى</span>
                    </div>

                    <button
                      onClick={() => setShowQuickAttendanceModal(true)}
                      className={`px-4 py-2 bg-gradient-to-r ${
                        currentSession?.currentPhase === 'preparation'
                          ? 'from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-600 hover:to-teal-800 ring-2 ring-emerald-400/50 animate-pulse'
                          : 'from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
                      } text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30`}
                    >
                      <UserCheck className="w-4 h-4 text-white" />
                      <span>{currentSession?.currentPhase === 'preparation' ? 'تسجيل الغياب السريع للمرحلة التحضيرية 📋' : 'فتح سجل الغياب والحضور 📋'}</span>
                    </button>
                  </div>
                </div>

                {/* 4 Phases Timeline Progress Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PHASES.map((ph, idx) => {
                    const isCurrent = currentSession.currentPhase === ph.id;
                    const phIdx = PHASES.findIndex((p) => p.id === ph.id);
                    const currentIdx = PHASES.findIndex((p) => p.id === currentSession.currentPhase);
                    const isDone = phIdx < currentIdx;

                    return (
                      <div
                        key={ph.id}
                        onClick={() => {
                          const nextSecs = currentSession.phaseDurations[ph.id];
                          onUpdateSession({
                            currentPhase: ph.id,
                            phaseRemainingSeconds: nextSecs
                          });
                        }}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/40'
                            : isDone
                            ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                            : 'bg-slate-900/60 text-slate-500 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold">0{idx + 1} ({ph.defaultMin}د)</span>
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {isCurrent && <Timer className="w-3.5 h-3.5 text-amber-300 animate-pulse" />}
                        </div>
                        <span className="text-xs font-bold block line-clamp-1">{ph.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Field Tools Bar for Live Session */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">أدوات الأستاذ الذكية في الملعب</h3>
              </div>

              {/* Tool Navigation Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
                <button
                  onClick={() => setActiveTabTool('guide')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabTool === 'guide' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 inline ml-1" />
                  <span>توجيهات بيداغوجية</span>
                </button>

                <button
                  onClick={() => setActiveTabTool('attendance')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabTool === 'attendance' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline ml-1" />
                  <span>الحضور والتقييم</span>
                </button>

                <button
                  onClick={() => setActiveTabTool('teams')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabTool === 'teams' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5 inline ml-1" />
                  <span>مولد الأفواج</span>
                </button>

                <button
                  onClick={() => setActiveTabTool('stopwatch')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTabTool === 'stopwatch' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5 inline ml-1" />
                  <span>ساعة التوقيت</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Pedagogical Guidance & Concise Lesson Plan Summary */}
            {activeTabTool === 'guide' && (
              <div className="space-y-6">
                {/* Concise Lesson Plan Summary Box */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-extrabold text-slate-900">
                        عرض لمذكرة الحصة باختصار (مرتبطة بمراحل الحصة والزمن)
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
                      إجمالي الزمن: 60 دقيقة
                    </span>
                  </div>

                  {/* Objective */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">🎯 هدف الحصة البيداغوجي العام:</span>
                    <p className="text-xs font-bold text-slate-900 mt-1 leading-relaxed">
                      {selectedPlan?.generalObjective || currentSession.educationalObjective}
                    </p>
                  </div>

                  {/* 4 Phases Detailed Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Phase 1 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      currentSession.currentPhase === 'preparation'
                        ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          10 دقائق
                        </span>
                        <span className="text-xs font-bold text-slate-600">المرحلة التحضيرية</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                        {selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.title || 'اللعبة الإحمائية'}
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                        {selectedPlan?.warmupPhase?.pedagogicalWarmupGame?.rules || 'الإحماء العام والخاص + نداء الحضور والجري الخفيف.'}
                      </p>
                    </div>

                    {/* Phase 2 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      currentSession.currentPhase === 'situation1'
                        ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/30'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          20 دقيقة
                        </span>
                        <span className="text-xs font-bold text-slate-600">الموقف التعليمي 1</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                        {selectedPlan?.mainPhase?.learningSituation1?.title || 'بناء التعلمات المباشرة'}
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                        {selectedPlan?.mainPhase?.learningSituation1?.description || currentSession.situation1Description}
                      </p>
                    </div>

                    {/* Phase 3 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      currentSession.currentPhase === 'situation2'
                        ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-400/30'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          20 دقيقة
                        </span>
                        <span className="text-xs font-bold text-slate-600">الموقف التعليمي 2</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                        {selectedPlan?.mainPhase?.learningSituation2?.title || 'الوضعية المشكلة والتنافس'}
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                        {selectedPlan?.mainPhase?.learningSituation2?.description || currentSession.situation2Description}
                      </p>
                    </div>

                    {/* Phase 4 */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      currentSession.currentPhase === 'final'
                        ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/30'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          10 دقائق
                        </span>
                        <span className="text-xs font-bold text-slate-600">المرحلة الختامية</span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 line-clamp-1">
                        {selectedPlan?.coolDownPhase?.activities || 'التهدئة والتقويم'}
                      </h5>
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                        {selectedPlan?.coolDownPhase?.assessmentAndDialogue || currentSession.finalObjective}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contingency / Adaptation Quick Buttons */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 ml-2">تعديل بيداغوجي سريع لحالة الملعب:</span>
                  <button
                    onClick={() => setContingencyMode('normal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      contingencyMode === 'normal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    onClick={() => setContingencyMode('hot_weather')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      contingencyMode === 'hot_weather' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    ☀️ طقس حار / مشمس
                  </button>
                  <button
                    onClick={() => setContingencyMode('equipment_shortage')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      contingencyMode === 'equipment_shortage' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    ⚽ قلة العتاد
                  </button>
                  <button
                    onClick={() => setContingencyMode('high_fatigue')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      contingencyMode === 'high_fatigue' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    💧 إجهاد وتعب
                  </button>
                </div>

                {/* Advice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activePhaseInfo?.tips.map((tip, idx) => (
                    <div key={idx} className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>توجيه مالي #{idx + 1}</span>
                      </div>
                      <p className="text-xs text-blue-950 leading-relaxed font-medium">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Whistle sound test bar */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">صفارة التحكم المباشرة في الملعب:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playWhistleSound('short')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                    >
                      صفارة قصيرة 🎺
                    </button>
                    <button
                      onClick={() => playWhistleSound('double')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                    >
                      صفارة مزدوجة 🎺🎺
                    </button>
                    <button
                      onClick={() => playWhistleSound('long')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                    >
                      صفارة طويلة 🎺
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Attendance & Student Performance Grid */}
            {activeTabTool === 'attendance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Attendance Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    تسجيل غيابات وإعفاءات التلاميذ (نقرة واحدة):
                  </label>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {students
                      .filter((s) => s.classId === currentSession.classId)
                      .map((st) => {
                        const rec = attendanceRecords[st.id] || 'present';
                        const ratings = studentRatings[st.id] || [];
                        return (
                          <div
                            key={st.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-900">{st.firstName} {st.lastName}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'present' }))}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    rec === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  حاضر
                                </button>
                                <button
                                  onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'absent' }))}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    rec === 'absent' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  غائب
                                </button>
                                <button
                                  onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'exempt' }))}
                                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                    rec === 'exempt' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  معفى
                                </button>
                              </div>
                            </div>

                            {/* Behavioral Badges */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                              <span className="text-[10px] text-slate-500 font-bold ml-1">ملاحظة حركية:</span>
                              <button
                                onClick={() => {
                                  setStudentRatings((prev) => ({
                                    ...prev,
                                    [st.id]: prev[st.id]?.includes('مجهود') ? prev[st.id].filter(r => r !== 'مجهود') : [...(prev[st.id] || []), 'مجهود']
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  ratings.includes('مجهود') ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-500 border-slate-200'
                                }`}
                              >
                                ⭐ أداء مميز
                              </button>
                              <button
                                onClick={() => {
                                  setStudentRatings((prev) => ({
                                    ...prev,
                                    [st.id]: prev[st.id]?.includes('تعاون') ? prev[st.id].filter(r => r !== 'تعاون') : [...(prev[st.id] || []), 'تعاون']
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  ratings.includes('تعاون') ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-slate-500 border-slate-200'
                                }`}
                              >
                                🤝 روح رياضية
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Lesson Notes */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    ملاحظات ومستجدات الحصة:
                  </label>
                  <textarea
                    rows={6}
                    value={lessonNotesInput}
                    onChange={(e) => setLessonNotesInput(e.target.value)}
                    placeholder="سجل أي ملاحظات خاصة بالحصة (مثال: تجاوب ممتازة مع الموقف الثاني، تعديل زمن الإحماء بسبب ارتفاع درجة الحرارة...)"
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Team Generator Tool */}
            {activeTabTool === 'teams' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-800">عدد الفرق المطلوب تقسيمها:</span>
                    <select
                      value={teamCount}
                      onChange={(e) => setTeamCount(parseInt(e.target.value))}
                      className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-1.5"
                    >
                      <option value={2}>فريقان (2)</option>
                      <option value={3}>ثلاثة فرق (3)</option>
                      <option value={4}>أربعة فرق (4)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateTeams}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>توليد الفرق عشوائياً متوازناً</span>
                  </button>
                </div>

                {Object.keys(generatedTeams).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(Object.entries(generatedTeams) as [string, Student[]][]).map(([teamName, teamStudents]) => (
                      <div key={teamName} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h4 className="text-xs font-extrabold text-slate-900">{teamName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 rounded-full text-slate-700">
                            {teamStudents.length} تلميذ
                          </span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 max-h-48 overflow-y-auto">
                          {teamStudents.map((st) => (
                            <li key={st.id} className="flex items-center gap-1.5 py-0.5 border-b border-slate-100 last:border-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>{st.firstName} {st.lastName}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    اضغط على زر "توليد الفرق عشوائياً" لتقسيم تلاميذ القسم إلى أفواج للأنشطة التنافسية.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Field Stopwatch */}
            {activeTabTool === 'stopwatch' && (
              <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-6 text-center">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">ساعة التوقيت الميدانية</span>
                  <div className="text-5xl font-mono font-black text-amber-400 tracking-wider">
                    {formatStopwatch(stopwatchTime)}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                    className={`px-6 py-3 font-bold rounded-2xl text-xs cursor-pointer transition-all flex items-center gap-2 ${
                      isStopwatchRunning ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isStopwatchRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isStopwatchRunning ? 'إيقاف' : 'تشغيل'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (stopwatchTime > 0) {
                        setStopwatchLaps((prev) => [stopwatchTime, ...prev]);
                      }
                    }}
                    disabled={stopwatchTime === 0}
                    className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs cursor-pointer disabled:opacity-50"
                  >
                    تسجيل دورة / زمن
                  </button>

                  <button
                    onClick={() => {
                      setIsStopwatchRunning(false);
                      setStopwatchTime(0);
                      setStopwatchLaps([]);
                    }}
                    className="px-4 py-3 bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-bold rounded-2xl text-xs cursor-pointer border border-rose-800/50"
                  >
                    إعادة ضبط
                  </button>
                </div>

                {stopwatchLaps.length > 0 && (
                  <div className="max-w-md mx-auto bg-slate-950 rounded-2xl p-4 border border-slate-800 text-right space-y-2">
                    <h5 className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">سجل الأزمان المسجلة:</h5>
                    <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                      {stopwatchLaps.map((lap, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-900 text-slate-300 font-mono">
                          <span>دورة #{stopwatchLaps.length - idx}</span>
                          <span className="font-bold text-amber-300">{formatStopwatch(lap)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>إعدادات وتخصيص مركز قيادة الحصة</span>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Timing settings */}
              <div className="space-y-3">
                <label className="font-bold text-slate-800 block">
                  تعديل المدد الافتراضية لمراحل الحصة (بالدقائق):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">المرحلة التحضيرية:</span>
                    <input
                      type="number"
                      value={timingSettings.preparationMinutes}
                      onChange={(e) =>
                        onUpdateTimingSettings({
                          ...timingSettings,
                          preparationMinutes: Math.max(1, parseInt(e.target.value) || 10)
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">الموقف الأول:</span>
                    <input
                      type="number"
                      value={timingSettings.situation1Minutes}
                      onChange={(e) =>
                        onUpdateTimingSettings({
                          ...timingSettings,
                          situation1Minutes: Math.max(1, parseInt(e.target.value) || 20)
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">الموقف الثاني:</span>
                    <input
                      type="number"
                      value={timingSettings.situation2Minutes}
                      onChange={(e) =>
                        onUpdateTimingSettings({
                          ...timingSettings,
                          situation2Minutes: Math.max(1, parseInt(e.target.value) || 20)
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">المرحلة الختامية:</span>
                    <input
                      type="number"
                      value={timingSettings.finalMinutes}
                      onChange={(e) =>
                        onUpdateTimingSettings({
                          ...timingSettings,
                          finalMinutes: Math.max(1, parseInt(e.target.value) || 10)
                        })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-700">تفعيل التنبيه الصوتي عند الانتقال</span>
                  <input
                    type="checkbox"
                    checked={timingSettings.soundEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, soundEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-700">تفعيل الاهتزاز عند الانتقال</span>
                  <input
                    type="checkbox"
                    checked={timingSettings.vibrationEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, vibrationEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-700">إظهار النافذة العائمة فوق الواجهات</span>
                  <input
                    type="checkbox"
                    checked={timingSettings.floatingOverlayEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        floatingOverlayEnabled: e.target.checked
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-700">التوثيق التلقائي في الكراس اليومي</span>
                  <input
                    type="checkbox"
                    checked={timingSettings.autoLogToNotebook}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        autoLogToNotebook: e.target.checked
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              حفظ التغييرات
            </button>
          </div>
        </div>
      )}

      {/* Summary Report Modal post-finish */}
      {showSummaryModal && lastFinishedExecutionLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">
                تم إنهاء الحصة وتوثيق البيانات بنجاح 🎉
              </h3>
              <p className="text-xs text-slate-500">
                تقرير تنفيذ الحصة البيداغوجية - {lastFinishedExecutionLog.className}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">عنوان الحصة:</span>
                <span className="font-bold text-slate-900">{lastFinishedExecutionLog.lessonPlanTitle}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">المدة الكلية المنجزة:</span>
                <span className="font-bold text-blue-600">{lastFinishedExecutionLog.totalDurationMinutes} دقيقة</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">حالة الالتزام بالوقت:</span>
                <span className="font-bold text-emerald-600">{lastFinishedExecutionLog.completionStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">حالة التوثيق:</span>
                <span className="font-bold text-slate-800">تم تحديث الكراس اليومي وسجل الحصص تلقائياً</span>
              </div>
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-colors cursor-pointer"
            >
              متابعة واستكمال العمل
            </button>
          </div>
        </div>
      )}

      {/* Quick Field Attendance Modal Overlay */}
      {showQuickAttendanceModal && currentSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto dir-rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl text-white space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 mb-1">
                    <span>تسجيل الغياب الميداني السريع (المرحلة التحضيرية)</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    منصة نداء الحضور والغياب - فوج {currentSession.className}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowQuickAttendanceModal(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي الفوج</span>
                <span className="text-lg font-black text-white">{currentClassStudents.length}</span>
              </div>
              <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-500/30 text-center">
                <span className="text-[10px] font-bold text-emerald-300 block">الحاضرون</span>
                <span className="text-lg font-black text-emerald-400">{presentCount}</span>
              </div>
              <div className="p-3 bg-rose-950/50 rounded-2xl border border-rose-500/30 text-center">
                <span className="text-[10px] font-bold text-rose-300 block">الغائبون</span>
                <span className="text-lg font-black text-rose-400">{absentCount}</span>
              </div>
              <div className="p-3 bg-amber-950/50 rounded-2xl border border-amber-500/30 text-center">
                <span className="text-[10px] font-bold text-amber-300 block">المعفون/بدون بدلة</span>
                <span className="text-lg font-black text-amber-400">{exemptCount}</span>
              </div>
            </div>

            {/* Toolbar: Search + Mark All Present Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                type="text"
                value={attendanceSearchQuery}
                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                placeholder="🔍 البحث باسم التلميذ أو لقبه..."
                className="w-full sm:w-64 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />

              <button
                onClick={() => {
                  const allPresent: Record<string, 'present'> = {};
                  currentClassStudents.forEach((st) => {
                    allPresent[st.id] = 'present';
                  });
                  setAttendanceRecords(allPresent);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تحديد الجميع حاضرون ✅</span>
              </button>
            </div>

            {/* Student List Grid */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {currentClassStudents
                .filter((s) => {
                  if (!attendanceSearchQuery.trim()) return true;
                  const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
                  return fullName.includes(attendanceSearchQuery.toLowerCase());
                })
                .map((st, idx) => {
                  const status = attendanceRecords[st.id] || 'present';
                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        status === 'present'
                          ? 'bg-slate-800/60 border-slate-700'
                          : status === 'absent'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : 'bg-amber-950/30 border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="text-xs font-black text-white">{st.firstName} {st.lastName}</h5>
                          <span className="text-[10px] text-slate-400 font-medium">
                            رقم التسجيل: {st.id.slice(0, 6)}
                          </span>
                        </div>
                      </div>

                      {/* Status Toggles - Touch Targets */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'present' }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>حاضر</span>
                        </button>

                        <button
                          onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'absent' }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>غائب</span>
                        </button>

                        <button
                          onClick={() => setAttendanceRecords((prev) => ({ ...prev, [st.id]: 'exempt' }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            status === 'exempt'
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>معفى</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                يتم الحفظ التلقائي للسجل فور النقر على الأزرار ⚡
              </span>
              <button
                onClick={() => setShowQuickAttendanceModal(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                حفظ وتأكيد السجل 💾
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
