/**
 * SPEX - Teacher Dashboard Component
 * لوحة قيادة الأستاذ: مؤشرات الأداء، جدول اليوم، والإجراءات السريعة
 *
 * تمت إعادة هيكلة هذا الملف: العرض مقسّم إلى مكونات فرعية صغيرة تحت ./teacher،
 * والمنطق الحسابي منقول إلى services/hooks. لا تغيير في السلوك أو المخرجات.
 */
import React, { useEffect, useState } from 'react';
import {
  User,
  DailyNotebookEntry,
  LessonPlan,
  InspectorNote,
  InspectionVisit,
  ClassRoom,
} from '../../types/spex';
import { NavTab } from '../layout/Sidebar';
import { useTeacherDashboardStats } from '../../hooks/useTeacherDashboardStats';
import { TeacherHeroBanner } from './teacher/TeacherHeroBanner';
import { TeacherKpiGrid } from './teacher/TeacherKpiGrid';
import { DailyScheduleList } from './teacher/DailyScheduleList';
import { InspectorFeedPanel } from './teacher/InspectorFeedPanel';
import { QuickAccessPanel } from './teacher/QuickAccessPanel';
import { fetchTeacherPlanningSessions, TeacherPlanningSession } from '../../services/api';
import { getCurrentAcademicYear, isOperationalAcademicYear } from '../../services/academicYear';

interface TeacherDashboardProps {
  user: User;
  dailyNotebook: DailyNotebookEntry[];
  teacherClasses: ClassRoom[];
  lessonPlans: LessonPlan[];
  inspectorNotes: InspectorNote[];
  inspectionVisits?: InspectionVisit[];
  inspectorDisplayName?: string | null;
  onNavigateTab: (tab: NavTab) => void;
  onOpenAIGenerator: () => void;
  onUpdateNotebookStatus?: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  dailyNotebook,
  teacherClasses,
  lessonPlans,
  inspectorNotes,
  inspectionVisits = [],
  inspectorDisplayName = null,
  onNavigateTab,
  onOpenAIGenerator,
  onUpdateNotebookStatus,
}) => {
  const [todaySessions, setTodaySessions] = useState<TeacherPlanningSession[]>([]);
  const [academicYearId, setAcademicYearId] = useState(getCurrentAcademicYear);
  const notebookStats = useTeacherDashboardStats(user, dailyNotebook);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const storedYear = window.localStorage.getItem('arenaspex:selectedAcademicYear');
    const selectedYear = isOperationalAcademicYear(storedYear)
      ? storedYear
      : getCurrentAcademicYear();
    setAcademicYearId(selectedYear);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all(
      teacherClasses.map((teacherClass) =>
        fetchTeacherPlanningSessions(teacherClass.id, academicYearId)
      )
    )
      .then((responses) => {
        if (active)
          setTodaySessions(
            responses
              .flatMap((response) => response.sessions)
              .filter((session) => session.plannedDate.slice(0, 10) === today)
          );
      })
      .catch(() => {
        if (active) setTodaySessions([]);
      });
    return () => {
      active = false;
    };
  }, [academicYearId, teacherClasses, today]);

  const completedCount = todaySessions.filter((session) => session.status === 'منجزة').length;
  const delayedCount = todaySessions.filter((session) => session.status === 'مؤجلة').length;
  const totalSessions = todaySessions.length;
  const executionPercentage = totalSessions
    ? Math.round((completedCount / totalSessions) * 100)
    : 0;
  const { schoolName, municipality, districtLabel } = notebookStats;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <TeacherHeroBanner
        user={user}
        schoolName={schoolName}
        municipality={municipality}
        districtLabel={districtLabel}
        onNavigateTab={onNavigateTab}
        onOpenAIGenerator={onOpenAIGenerator}
      />

      <TeacherKpiGrid
        executionPercentage={executionPercentage}
        completedCount={completedCount}
        delayedCount={delayedCount}
        totalSessions={totalSessions}
        lessonPlansCount={lessonPlans.length}
        inspectorNotesCount={inspectorNotes.length}
      />

      {/* Main Grid: Today's Schedule + Inspector Note Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DailyScheduleList
          dailyNotebook={dailyNotebook}
          plannedSessions={todaySessions}
          onNavigateTab={onNavigateTab}
          onUpdateNotebookStatus={onUpdateNotebookStatus}
        />

        <div className="space-y-6">
          <InspectorFeedPanel
            inspectorNotes={inspectorNotes}
            inspectionVisits={inspectionVisits}
            inspectorDisplayName={inspectorDisplayName}
            onOpenChatWithInspector={
              inspectorDisplayName ? () => onNavigateTab('professional_hub') : undefined
            }
          />
          <QuickAccessPanel onNavigateTab={onNavigateTab} />
        </div>
      </div>
    </div>
  );
};
