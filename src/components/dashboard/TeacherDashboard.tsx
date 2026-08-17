/**
 * SPEX - Teacher Dashboard Component
 * لوحة قيادة الأستاذ: مؤشرات الأداء، جدول اليوم، والإجراءات السريعة
 *
 * تمت إعادة هيكلة هذا الملف: العرض مقسّم إلى مكونات فرعية صغيرة تحت ./teacher،
 * والمنطق الحسابي منقول إلى services/hooks. لا تغيير في السلوك أو المخرجات.
 */
import React from 'react';
import { User, DailyNotebookEntry, LessonPlan, InspectorNote, InspectionVisit } from '../../types/spex';
import { NavTab } from '../layout/Sidebar';
import { useTeacherDashboardStats } from '../../hooks/useTeacherDashboardStats';
import { TeacherHeroBanner } from './teacher/TeacherHeroBanner';
import { TeacherKpiGrid } from './teacher/TeacherKpiGrid';
import { DailyScheduleList } from './teacher/DailyScheduleList';
import { InspectorFeedPanel } from './teacher/InspectorFeedPanel';
import { QuickAccessPanel } from './teacher/QuickAccessPanel';

interface TeacherDashboardProps {
  user: User;
  dailyNotebook: DailyNotebookEntry[];
  lessonPlans: LessonPlan[];
  inspectorNotes: InspectorNote[];
  inspectionVisits?: InspectionVisit[];
  onNavigateTab: (tab: NavTab) => void;
  onOpenAIGenerator: () => void;
  onUpdateNotebookStatus?: (entryId: string, status: 'منجزة' | 'مؤجلة' | 'غير منجزة') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  dailyNotebook,
  lessonPlans,
  inspectorNotes,
  inspectionVisits = [],
  onNavigateTab,
  onOpenAIGenerator,
  onUpdateNotebookStatus,
}) => {
  const {
    completedCount,
    delayedCount,
    totalSessions,
    executionPercentage,
    schoolName,
    municipality,
    districtLabel,
  } = useTeacherDashboardStats(user, dailyNotebook);

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
          onNavigateTab={onNavigateTab}
          onUpdateNotebookStatus={onUpdateNotebookStatus}
        />

        <div className="space-y-6">
          <InspectorFeedPanel
            inspectorNotes={inspectorNotes}
            inspectionVisits={inspectionVisits}
            onOpenChatWithInspector={() => onNavigateTab('inspector_portal')}
          />
          <QuickAccessPanel onNavigateTab={onNavigateTab} />
        </div>
      </div>
    </div>
  );
};
