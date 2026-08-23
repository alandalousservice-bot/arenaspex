/**
 * SPEX - Inspector Portal / Dashboard Component
 * بوابة المفتش البيداغوجي: متابعة الأساتذة، المصادقة على الموارد، سجل الزيارات والشهادات الرسمية، تدقيق المنهاج، والتوجيهات.
 */

import React, { useState } from 'react';
import {
  User,
  InspectorNote,
  InspectionVisit,
  DistrictBroadcast,
  DirectChatMessage,
  ClassRoom,
  Student,
  WeeklyScheduleSlot,
  LessonPlan,
  DailyNotebookEntry,
  CommunityResource,
} from '../../types/spex';

import { useInspectorDashboardStats } from '../../hooks/useInspectorDashboardStats';
import { useTeacher } from '../../hooks/useTeacher';
import { useLessonPlans } from '../../hooks/useLessonPlans';
import { useReports } from '../../hooks/useReports';

import { InspectorHeroHeader, InspectorMainTab } from './inspector/InspectorHeroHeader';
import { InspectorKpiGrid } from './inspector/InspectorKpiGrid';
import { InspectorActivityFeed } from './inspector/InspectorActivityFeed';
import { InspectorDistrictChart } from './inspector/InspectorDistrictChart';
import { InspectorTeacherList } from './inspector/InspectorTeacherList';
import { InspectorPedagogicalProfile } from './inspector/InspectorPedagogicalProfile';
import { InspectorDirectChat } from './inspector/InspectorDirectChat';
import { InspectorModals } from './inspector/InspectorModals';

import { InspectorResourceValidationView } from './inspector/InspectorResourceValidationView';
import { InspectorReportsView } from './inspector/InspectorReportsView';
import { InspectorCurriculumAuditView } from './inspector/InspectorCurriculumAuditView';
import { InspectorBroadcastsView } from './inspector/InspectorBroadcastsView';
import { InspectorPendingAssignments } from './inspector/InspectorPendingAssignments';

interface InspectorDashboardProps {
  inspector: User;
  teachers: User[];
  notes: InspectorNote[];
  visits: InspectionVisit[];
  broadcasts?: DistrictBroadcast[];
  directMessages?: DirectChatMessage[];
  classes?: ClassRoom[];
  students?: Student[];
  weeklySchedule?: WeeklyScheduleSlot[];
  lessonPlans?: LessonPlan[];
  dailyNotebook?: DailyNotebookEntry[];
  communityResources?: CommunityResource[];
  onToggleApproveResource?: (resourceId: string) => void;
  onAddNote: (note: Partial<InspectorNote>) => void;
  onAddVisit: (visit: Partial<InspectionVisit>) => void;
  onAddBroadcast?: (broadcast: Partial<DistrictBroadcast>) => void;
  onAddDirectMessage?: (msg: { receiverId: string; receiverName: string; message: string }) => void;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  inspector,
  teachers,
  notes,
  visits,
  broadcasts = [],
  directMessages = [],
  classes = [],
  students = [],
  weeklySchedule = [],
  lessonPlans = [],
  dailyNotebook = [],
  communityResources = [],
  onToggleApproveResource,
  onAddNote,
  onAddVisit,
  onAddBroadcast,
  onAddDirectMessage,
}) => {
  const safeTeachers = (Array.isArray(teachers) ? teachers : []).filter(Boolean);
  if (!inspector) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-900">
        بيانات حساب المفتش غير مكتملة. يرجى التواصل مع مشرف المنظومة.
      </div>
    );
  }
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(safeTeachers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<InspectorMainTab>('overview');
  const [teacherSubTab, setTeacherSubTab] = useState<
    'annual_plan' | 'schedule' | 'lesson_plans' | 'students' | 'visits'
  >('annual_plan');
  const [selectedInspectorLevelId, setSelectedInspectorLevelId] = useState<string>('lvl_p1');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedLessonPlanModal, setSelectedLessonPlanModal] = useState<LessonPlan | null>(null);

  // Chat local state fallback
  const [localChatMessages, setLocalChatMessages] = useState<DirectChatMessage[]>([]);

  // 1. Dashboard Global Stats
  const globalStats = useInspectorDashboardStats(
    safeTeachers,
    dailyNotebook,
    notes,
    visits,
    lessonPlans,
    broadcasts
  );

  // 2. Selected Teacher Details
  const {
    selectedTeacher,
    teacherClasses,
    totalStudentsTaught,
    maleCount,
    femaleCount,
    weeklyHoursCount,
  } = useTeacher(safeTeachers, selectedTeacherId, classes, students, weeklySchedule);

  // 3. Lesson Plans for selected teacher
  const { filteredTeacherPlans } = useLessonPlans(lessonPlans, selectedTeacher, safeTeachers);

  // 4. Reports for selected teacher
  const { teacherVisits, teacherNotes } = useReports(visits, notes);

  // Handlers
  const handleSelectTeacher = (t: User) => {
    setSelectedTeacherId(t.id);
  };

  const handleSendBroadcast = (title: string, content: string) => {
    if (onAddBroadcast) {
      onAddBroadcast({
        id: `bc_${Date.now()}`,
        inspectorId: inspector.id,
        inspectorName: `${inspector?.firstName || ''} ${inspector?.lastName || ''}`.trim() || 'المفتش',
        title,
        content,
        category: 'توجيه_بيداغوجي',
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleSendDirectMessage = (text: string) => {
    const targetTeacher = selectedTeacher || safeTeachers[0];
    if (!targetTeacher) return;
    const receiverId = targetTeacher.id;
    const receiverName = `${targetTeacher.firstName} ${targetTeacher.lastName}`;

    if (onAddDirectMessage) {
      onAddDirectMessage({
        receiverId,
        receiverName,
        message: text,
      });
    }
  };

  const handleSendNoteToTeacher = (
    teacherId: string,
    teacherName: string,
    title: string,
    content: string
  ) => {
    onAddNote({
      id: `note_${Date.now()}`,
      inspectorId: inspector.id,
      inspectorName: `المفتش ${inspector?.firstName || ''} ${inspector?.lastName || ''}`.trim(),
      teacherId,
      teacherName,
      moduleRef: 'general',
      title,
      content,
      priority: 'عادية',
      status: 'جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const pendingResourcesCount = communityResources.filter((r) => !r.isApprovedByInspector).length;

  return (
    <div className="space-y-6 pb-12 dir-rtl">
      {/* Navigation & Hero Header */}
      <InspectorHeroHeader
        inspector={inspector}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingResourcesCount={pendingResourcesCount}
        onOpenBroadcastModal={() => setShowBroadcastModal(true)}
        onOpenVisitModal={() => setShowVisitModal(true)}
      />

      {/* Overview Main View */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Stats Grid */}
          <InspectorKpiGrid
            teachersCount={safeTeachers.length}
            institutionsCount={globalStats.institutionsCount}
            completionRate={globalStats.completionRate}
            inactiveTeachersCount={globalStats.inactiveTeachers.length}
            lateReportsCount={globalStats.lateReportTeachers.length}
            totalStudentsTaught={totalStudentsTaught}
            weeklyHoursCount={weeklyHoursCount}
          />

          {/* PART B/B4: Pending Assignments - قبل قائمة الأساتذة */}
          <InspectorPendingAssignments />

          {/* Teacher Selection Grid */}
          <InspectorTeacherList
            teachers={safeTeachers}
            selectedTeacher={selectedTeacher}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectTeacher={handleSelectTeacher}
          />

          {safeTeachers.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              لا يوجد أساتذة مرتبطون بهذه المقاطعة حالياً.
            </div>
          )}

          {/* Selected Teacher Full Pedagogical Profile */}
          {selectedTeacher && <InspectorPedagogicalProfile
            inspector={inspector}
            selectedTeacher={selectedTeacher}
            teacherClasses={teacherClasses}
            totalStudentsTaught={totalStudentsTaught}
            maleCount={maleCount}
            femaleCount={femaleCount}
            weeklyHoursCount={weeklyHoursCount}
            teacherSubTab={teacherSubTab}
            onSetTeacherSubTab={setTeacherSubTab}
            selectedInspectorLevelId={selectedInspectorLevelId}
            onSetSelectedInspectorLevelId={setSelectedInspectorLevelId}
            teacherLessonPlans={filteredTeacherPlans}
            teacherNotebook={dailyNotebook.filter((nb) => nb.teacherId === selectedTeacher?.id)}
            teacherScheduleSlots={weeklySchedule.filter(
              (s) => !s.teacherId || s.teacherId === selectedTeacher?.id
            )}
            visits={visits}
            notes={notes}
            onOpenVisitModal={() => setShowVisitModal(true)}
            onOpenNoteModal={() => setShowNoteModal(true)}
            onSelectLessonPlanModal={setSelectedLessonPlanModal}
          />}

          {/* Activity Feed & Alerts + District Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InspectorActivityFeed
              recentActivities={globalStats.recentActivities}
              lateReportTeachers={globalStats.lateReportTeachers}
              inactiveTeachers={globalStats.inactiveTeachers}
              onSelectTeacher={handleSelectTeacher}
              onOpenNoteModalForTeacher={(t) => {
                setSelectedTeacherId(t.id);
                setShowNoteModal(true);
              }}
            />
            <InspectorDistrictChart chartData={globalStats.institutionChartData} />
          </div>
        </div>
      )}

      {/* Resource Validation View */}
      {activeTab === 'resource_validation' && (
        <InspectorResourceValidationView
          resources={communityResources}
          teachers={safeTeachers}
          onToggleApproveResource={
            onToggleApproveResource || ((id) => console.log('Toggle approve:', id))
          }
          onSendNoteToTeacher={handleSendNoteToTeacher}
        />
      )}

      {/* Inspection Reports & Certificates View */}
      {activeTab === 'inspection_reports' && (
        <InspectorReportsView
          visits={visits}
          teachers={safeTeachers}
          inspector={inspector}
          onAddVisit={onAddVisit}
        />
      )}

      {/* Curriculum Execution Audit View */}
      {activeTab === 'curriculum_audit' && (
        <InspectorCurriculumAuditView
          teachers={safeTeachers}
          lessonPlans={lessonPlans}
          onSendNoteToTeacher={handleSendNoteToTeacher}
        />
      )}

      {/* District Broadcasts & Seminars View */}
      {activeTab === 'district_broadcasts' && (
        <InspectorBroadcastsView
          broadcasts={broadcasts}
          inspector={inspector}
          onAddBroadcast={(bc) => onAddBroadcast && onAddBroadcast(bc)}
        />
      )}

      {/* Chat View */}
      {activeTab === 'chat' && selectedTeacher && (
        <div className="animate-in fade-in duration-200">
          <InspectorDirectChat
            inspector={inspector}
            selectedTeacher={selectedTeacher}
            chatMessages={directMessages}
            onSendMessage={handleSendDirectMessage}
          />
        </div>
      )}

      {/* Modals Container */}
      {selectedTeacher && <InspectorModals
        selectedLessonPlanModal={selectedLessonPlanModal}
        onCloseLessonPlanModal={() => setSelectedLessonPlanModal(null)}
        showNoteModal={showNoteModal}
        onCloseNoteModal={() => setShowNoteModal(false)}
        selectedTeacher={selectedTeacher}
        onAddNote={(note) => onAddNote(note)}
        showVisitModal={showVisitModal}
        onCloseVisitModal={() => setShowVisitModal(false)}
        onAddVisit={(visit) => onAddVisit(visit)}
        showBroadcastModal={showBroadcastModal}
        onCloseBroadcastModal={() => setShowBroadcastModal(false)}
        onSendBroadcast={handleSendBroadcast}
      />}
    </div>
  );
};
