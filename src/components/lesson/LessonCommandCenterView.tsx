/**
 * SPEX - Lesson Command Center View
 * مركز قيادة الحصة البيداغوجية الذكي والتفاعلي لمرافقة أستاذ التربية البدنية والرياضية
 */

import React, { useState, useEffect } from 'react';
import {
  LessonSession,
  LessonSessionTiming,
  ClassRoom,
  LessonPlan,
  Student,
  DailyNotebookEntry,
  WeeklyScheduleSlot,
  LessonExecutionLog,
} from '../../types/spex';

import { useLessonCommandCenter } from '../../hooks/useLessonCommandCenter';
import { CommandCenterHeader } from './commandCenter/CommandCenterHeader';
import { CommandCenterPreSessionSetup } from './commandCenter/CommandCenterPreSessionSetup';
import { CommandCenterWhistleConsole } from './commandCenter/CommandCenterWhistleConsole';
import { CommandCenterActiveSession } from './commandCenter/CommandCenterActiveSession';
import { CommandCenterFieldTools } from './commandCenter/CommandCenterFieldTools';
import { CommandCenterModals } from './commandCenter/CommandCenterModals';
import { buildSmartExecutionReport, computePhasePacing } from '../../services/lessonCommandCenter.service';

type FieldToolTab = 'guide' | 'attendance' | 'teams' | 'stopwatch' | 'coach' | 'notes';

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
  onStartSession,
  onUpdateSession,
  onEndSession,
  onUpdateTimingSettings,
  onNavigateToLessonPlans,
  onAddNotebookEntry,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(teacherClasses[0]?.id || '');
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [lastExecutionLog, setLastExecutionLog] = useState<LessonExecutionLog | null>(null);
  const [isFullScreenMode, setIsFullScreenMode] = useState<boolean>(true);
  const [activeTabTool, setActiveTabTool] = useState<FieldToolTab>('guide');

  // Custom hook for Stopwatch, Teams, Attendance & Contingency
  const {
    stopwatchTime,
    isStopwatchRunning,
    stopwatchLaps,
    handleToggleStopwatch,
    handleResetStopwatch,
    handleLapStopwatch,
    teamCount,
    generatedTeams,
    handleGenerateTeams,
    attendanceRecords,
    handleToggleAttendance,
    contingencyMode,
    setContingencyMode,
    studentRatings,
    setStudentRatings,
    lessonNotesInput,
    setLessonNotesInput,
  } = useLessonCommandCenter(currentSession, students, selectedClassId);

  const handleSetStudentRating = (studentId: string, rating: string) => {
    setStudentRatings((prev) => ({ ...prev, [studentId]: [rating] }));
  };

  // Auto-find matching lesson plan
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

  const selectedPlan = lessonPlans.find((lp) => lp.id === selectedLessonPlanId) || lessonPlans[0] || null;

  const handleFinishAndSave = () => {
    if (!currentSession) return;
    const durationMinutes = Math.round((currentSession.totalElapsedSeconds || 0) / 60) || 45;

    const pacing = computePhasePacing(currentSession);
    const overruns = pacing
      .filter((p) => p.status === 'overrun')
      .map((p) => ({
        phase: p.phase === 'preparation' ? 'المرحلة التحضيرية' : p.phase === 'situation1' ? 'الوضعية التعلمية 1' : p.phase === 'situation2' ? 'الوضعية التعلمية 2' : 'المرحلة الختامية',
        minutes: Math.max(1, Math.round((p.spentSecs - p.plannedSecs) / 60)),
      }));
    const overrunTotalMins = overruns.reduce((sum, o) => sum + o.minutes, 0);

    const attendanceData = {
      total: Object.keys(attendanceRecords).length > 0
        ? Object.keys(attendanceRecords).length
        : (students.filter((s) => s.classId === selectedClassId).length || 25),
      present: Object.keys(attendanceRecords).length > 0
        ? Object.values(attendanceRecords).filter((v) => v === 'present').length
        : (students.filter((s) => s.classId === selectedClassId).length || 25),
      absent: Object.values(attendanceRecords).filter((v) => v === 'absent').length,
      exempt: Object.values(attendanceRecords).filter((v) => v === 'exempt').length,
    };

    const completionStatus: LessonExecutionLog['completionStatus'] =
      overrunTotalMins >= 2
        ? 'تجاوز زمني'
        : (currentSession.totalElapsedSeconds || 0) > ((currentSession.phaseDurations?.preparation || 600) + (currentSession.phaseDurations?.situation1 || 1200) + (currentSession.phaseDurations?.situation2 || 1200) + (currentSession.phaseDurations?.final || 600))
        ? 'تأخير بسيط'
        : 'منجزة في الوقت';

    const notes = lessonNotesInput.trim() || undefined;
    const ratingsRecord = Object.keys(studentRatings).length > 0 ? studentRatings : undefined;

    const log: LessonExecutionLog = {
      id: `exec_${Date.now()}`,
      teacherId: currentSession.teacherId || 't_1',
      classId: currentSession.classId,
      className: currentSession.className,
      lessonPlanTitle: currentSession.sessionTitle || currentSession.educationalObjective || 'حصة بيداغوجية',
      date: new Date().toISOString().split('T')[0],
      actualStartTime: currentSession.startTime || '08:00',
      actualEndTime: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      totalDurationMinutes: durationMinutes,
      phaseDurations: {
        preparation: Math.round((currentSession.phaseDurations?.preparation || 600) / 60),
        situation1: Math.round((currentSession.phaseDurations?.situation1 || 1200) / 60),
        situation2: Math.round((currentSession.phaseDurations?.situation2 || 1200) / 60),
        final: Math.round((currentSession.phaseDurations?.final || 600) / 60),
      },
      delaysOrOverrunsMinutes: overrunTotalMins,
      completionStatus,
      attendanceData,
      notes,
      studentRatings: ratingsRecord,
      paceAnalysis: buildSmartExecutionReport(currentSession, attendanceData, overruns),
      overruns: overruns.length > 0 ? overruns : undefined,
      contingencyMode: currentSession.contingencyMode || 'normal',
    };

    setLastExecutionLog(log);

    if (onAddNotebookEntry) {
      const attendanceRate = Math.round((attendanceData.present / attendanceData.total) * 100);
      onAddNotebookEntry({
        teacherId: currentSession.teacherId || 't_1',
        classId: currentSession.classId,
        className: currentSession.className,
        levelName: 'التعليم الابتدائي / المتوسط',
        executionDate: new Date().toISOString().split('T')[0],
        timeSlot: '08:00 - 09:00',
        segmentTitle: 'المقطع البيداغوجي المعتمد',
        sessionTitle: currentSession.sessionTitle || 'حصة بيداغوجية',
        status: 'منجزة',
        note: `تم الإنجاز الميداني بنجاح بنسبة حضور ${attendanceRate}%${overrunTotalMins > 0 ? ` مع تجاوز زمني ${overrunTotalMins} دقيقة` : ''}.`,
      });
    }

    onEndSession(log);
    setShowSummaryModal(true);
  };

  return (
    <div className="space-y-6 pb-12 dir-rtl">
      {/* Top Header */}
      <CommandCenterHeader
        timingSettings={timingSettings}
        onUpdateTimingSettings={onUpdateTimingSettings}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        isFullScreenMode={isFullScreenMode}
        onToggleFullScreen={() => setIsFullScreenMode((prev) => !prev)}
      />

      {/* Whistle Console */}
      <CommandCenterWhistleConsole
        soundEnabled={timingSettings.soundEnabled}
        vibrationEnabled={timingSettings.vibrationEnabled}
      />

      {/* Main Content Area: Setup or Active Session */}
      {!currentSession ? (
        <CommandCenterPreSessionSetup
          teacherClasses={teacherClasses}
          selectedClassId={selectedClassId}
          onSelectClassId={setSelectedClassId}
          lessonPlans={lessonPlans}
          selectedLessonPlanId={selectedLessonPlanId}
          onSelectLessonPlanId={setSelectedLessonPlanId}
          contingencyMode={contingencyMode}
          onSelectContingencyMode={(mode) => setContingencyMode(mode as 'normal' | 'hot_weather' | 'equipment_shortage' | 'high_fatigue')}
          timingSettings={timingSettings}
          onStartSession={onStartSession}
          onNavigateToLessonPlans={onNavigateToLessonPlans}
        />
      ) : (
        <CommandCenterActiveSession
          currentSession={currentSession}
          timingSettings={timingSettings}
          onUpdateSession={onUpdateSession}
          onEndSession={handleFinishAndSave}
        />
      )}

      {/* Field Tools Tabs: Guide, Attendance, Teams, Field Stopwatch */}
      <CommandCenterFieldTools
        activeTabTool={activeTabTool}
        onSelectTabTool={setActiveTabTool}
        selectedPlan={selectedPlan}
        students={students}
        selectedClassId={selectedClassId}
        attendanceRecords={attendanceRecords}
        onToggleAttendance={handleToggleAttendance}
        teamCount={teamCount}
        generatedTeams={generatedTeams}
        onGenerateTeams={handleGenerateTeams}
        stopwatchTime={stopwatchTime}
        isStopwatchRunning={isStopwatchRunning}
        stopwatchLaps={stopwatchLaps}
        onToggleStopwatch={handleToggleStopwatch}
        onResetStopwatch={handleResetStopwatch}
        onLapStopwatch={handleLapStopwatch}
        currentPhase={currentSession?.currentPhase || 'preparation'}
        contingencyMode={contingencyMode}
        sessionTitle={currentSession?.sessionTitle || selectedPlan?.sessionTitle}
        educationalObjective={currentSession?.educationalObjective || selectedPlan?.generalObjective}
        studentRatings={studentRatings}
        onSetStudentRating={handleSetStudentRating}
        lessonNotesInput={lessonNotesInput}
        onSetLessonNotes={setLessonNotesInput}
      />

      {/* Modals Container */}
      <CommandCenterModals
        showSettingsModal={showSettingsModal}
        onCloseSettingsModal={() => setShowSettingsModal(false)}
        timingSettings={timingSettings}
        onUpdateTimingSettings={onUpdateTimingSettings}
        showSummaryModal={showSummaryModal}
        onCloseSummaryModal={() => setShowSummaryModal(false)}
        lastExecutionLog={lastExecutionLog}
      />
    </div>
  );
};
