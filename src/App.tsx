/**
 * SPEX - Sports Physical Education eXpert Platform
 * Application Entry Point & View Orchestrator
 * State and data handlers live in src/hooks/useAuth.ts and src/hooks/usePlatformStore.ts.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { AuthScreen } from './components/auth/AuthScreen';
import { LandingScreen } from './components/landing/LandingScreen';
import { PendingApprovalViewerScreen } from './components/auth/PendingApprovalViewerScreen';
import { useAuth } from './hooks/useAuth';
import { usePlatformStore } from './hooks/usePlatformStore';
import { logoutRequest } from './services/api';
import { tabToPath, pathToTab, defaultTabForRole, resolveTabForRole } from './lib/routes';
import { User } from './types/spex';
import { DEMO_USERS, INITIAL_DIRECTORATES } from './data/initialState';
import { registerOnlineFlush } from './lib/offline';
import { OfflineBanner } from './components/common/OfflineBanner';

const TeacherDashboard = lazy(() =>
  import('./components/dashboard/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const InspectorDashboard = lazy(() =>
  import('./components/dashboard/InspectorDashboard').then((m) => ({
    default: m.InspectorDashboard,
  }))
);
const DirectorDashboard = lazy(() =>
  import('./components/dashboard/DirectorDashboard').then((m) => ({ default: m.DirectorDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./components/dashboard/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AnnualPlanView = lazy(() =>
  import('./components/curriculum/AnnualPlanView').then((m) => ({ default: m.AnnualPlanView }))
);
const AnnualScheduleView = lazy(() =>
  import('./components/curriculum/AnnualScheduleView').then((m) => ({
    default: m.AnnualScheduleView,
  }))
);
const WeeklyScheduleView = lazy(() =>
  import('./components/schedule/WeeklyScheduleView').then((m) => ({
    default: m.WeeklyScheduleView,
  }))
);
const LearningSegmentsView = lazy(() =>
  import('./components/curriculum/LearningSegmentsView').then((m) => ({
    default: m.LearningSegmentsView,
  }))
);
const DailyNotebookView = lazy(() =>
  import('./components/notebook/DailyNotebookView').then((m) => ({ default: m.DailyNotebookView }))
);
const LessonPlanView = lazy(() =>
  import('./components/lesson/LessonPlanView').then((m) => ({ default: m.LessonPlanView }))
);
const KnowledgeEngineView = lazy(() =>
  import('./components/knowledge/KnowledgeEngineView').then((m) => ({
    default: m.KnowledgeEngineView,
  }))
);
const CompetencyAssessmentView = lazy(() =>
  import('./components/assessment/CompetencyAssessmentView').then((m) => ({
    default: m.CompetencyAssessmentView,
  }))
);
const GradebookView = lazy(() =>
  import('./components/gradebook/GradebookView').then((m) => ({ default: m.GradebookView }))
);
const ReportsView = lazy(() =>
  import('./components/reports/ReportsView').then((m) => ({ default: m.ReportsView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);
const ProfessionalHub = lazy(() =>
  import('./components/community/ProfessionalHub').then((m) => ({ default: m.ProfessionalHub }))
);
const AIAssistantDrawer = lazy(() =>
  import('./components/ai/AIAssistantDrawer').then((m) => ({ default: m.AIAssistantDrawer }))
);
const LessonCommandCenterView = lazy(() =>
  import('./components/lesson/LessonCommandCenterView').then((m) => ({
    default: m.LessonCommandCenterView,
  }))
);

const ViewFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-slate-500 space-y-3">
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
    <p className="text-sm font-medium text-slate-600">جارٍ تحميل الواجهة...</p>
  </div>
);

export default function App() {
  const {
    isAuthenticated,
    setIsAuthenticated,
    isCheckingSession,
    isOfflineSession,
    authView,
    setAuthView,
    currentUser,
    setCurrentUser,
  } = useAuth() as any;

  // ---------------------------------------------------------------
  // التنقل عبر عناوين URL: التبويب النشط يُشتق من الرابط دائماً، وأي
  // "setCurrentTab" (من القائمة الجانبية، البحث، إجراءات داخلية...) يغيّر
  // الرابط — فيصبح بالإمكان فتح عدة أدوات في تبويبات متصفح متزامنة
  // ومشاركة الروابط واستخدام زر الرجوع.
  // ---------------------------------------------------------------
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = pathToTab(location.pathname);
  const currentTab: NavTab = urlTab ?? defaultTabForRole(currentUser.role);

  /** نقطة التنقل الموحدة: كل تغيير تبويب أصبح تغييراً لعنوان URL */
  const navigateToTab = (tab: NavTab) => {
    navigate(tabToPath(tab));
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const store = usePlatformStore({
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setCurrentTab: navigateToTab,
  });

  const {
    allUsersList,
    setAllUsersList,
    teacherClasses,
    allStudents,
    dailyNotebook,
    weeklySchedule,
    lessonPlans,
    knowledgeItems,
    inspectorNotes,
    inspectionVisits,
    assessmentSessions,
    broadcasts,
    directMessages,
    communityResources,
    communityNotifications,
    personalLibraryItems,
    districtGroupMessages,
    aiSettings,
    setAiSettings,
    aiLogs,
    lessonTimingSettings,
    activeLessonSession,
    activeLessonPlanId,
    handleStartLessonSession,
    handleLaunchCommandCenterForPlan,
    handleUpdateLessonSession,
    handleEndLessonSession,
    handleAddNotebookEntry,
    handleUpdateTimingSettings,
    handleToggleSound,
    handleAddClass,
    handleDeleteClass,
    handleAddStudent,
    handleDeleteStudent,
    handleDeleteLessonPlan,
    handleDeleteNotebookEntry,
    handleAddWeeklySlot,
    handleDeleteWeeklySlot,
    handleUpdateNotebookStatus,
    handleUpdateLessonStatus,
    handleSaveLessonPlan,
    handleSaveAssessmentSession,
    handleAddKnowledgeItem,
    handleUpdateKnowledgeItem,
    handleSubmitKnowledgeItem,
    handleApproveKnowledgeItem,
    handleRejectKnowledgeItem,
    handleAddInspectorNote,
    handleAddInspectionVisit,
    handleAddBroadcast,
    handleAddDirectMessageFromInspector,
    handleAddUser,
    handleUpdateUser,
    handleDeleteUser,
    handleDeleteCommunityNotification,
    handleSendDistrictGroupMessage,
    handleSendDirectMessageFromChat,
    handleSendDirectMessage,
    handleToggleLikeResource,
    handleToggleApproveResource,
    handleToggleFollowTeacher,
    handleUpdateCurrentUser,
    handleAddCommunityResource,
    handleSaveToPersonalLibrary,
    handleMarkNotificationRead,
    handleNotifyNewFollower,
    handleOpenLessonPlan,
    refreshSessionUser,
  } = store;

  // PART C/C1: صندوق صادر بلا إنترنت — تفريغ عند 'online' + banner
  useEffect(() => {
    const cleanup = registerOnlineFlush();
    return cleanup;
  }, []);

  // حارس صلاحيات العرض: أي تبويب لا ينتمي لدور المستخدم يُستبدل بالصفحة الرئيسية
  // للدور (والمعيّنة أيضاً في lib/routes حتى تبقى صالحة عند الروابط العميقة)
  const activeTab = resolveTabForRole(currentTab, currentUser.role);

  // مزامنة العنوان مع التبويب الفعلي: رابط غير معروف أو قسم محظور على الدور
  // → يُصحَّح تلقائياً إلى الرابط المناسب (replace حتى لا يُلوَّث السجل)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fromUrl = pathToTab(location.pathname);
    if (!fromUrl) {
      navigate(tabToPath(defaultTabForRole(currentUser.role)), { replace: true });
      return;
    }
    const resolved = resolveTabForRole(fromUrl, currentUser.role);
    if (resolved !== fromUrl) {
      navigate(tabToPath(resolved), { replace: true });
    }
  }, [isAuthenticated, location.pathname, currentUser.role, navigate]);

  // AI Assistant Drawer State
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    // نعيد المستخدم إلى الرابط العميق الذي قصدَه قبل تسجيل الدخول إن وُجد
    // (سواءً عبر ?next= أو لأنه فتح رابط الأداة مباشرة وبقي في العنوان)
    const next = searchParams.get('next');
    const nextTab = pathToTab(next ?? '') ?? pathToTab(location.pathname);
    const target = nextTab ? resolveTabForRole(nextTab, user.role) : defaultTabForRole(user.role);
    if (next) setSearchParams({}, { replace: true });
    navigate(tabToPath(target), { replace: true });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('spex_current_user');
    logoutRequest();
    setAuthView('login');
    navigate('/login', { replace: true });
  };

  const handleSwitchUser = (user: User) => {
    handleLoginSuccess(user);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">جارٍ التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // رابط عميق لأداة داخلية بدون جلسة: نظهر شاشة الدخول مباشرة ويبقى الرابط
    // في شريط العنوان، فيعود إليه المستخدم آلياً بعد نجاح الدخول (handleLoginSuccess)
    if (authView === 'landing' && location.pathname === '/') {
      return (
        <LandingScreen
          onGoToLogin={() => {
            setAuthView('login');
            navigate('/login');
          }}
        />
      );
    }
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={() => {
          setAuthView('landing');
          navigate('/');
        }}
      />
    );
  }

  // إذا كان الحساب بانتظار تفعيل المشرف أو معطلاً، تظهر واجهة المشاهدة واستكشاف المزايا والتواصل مع المشرف
  if (
    currentUser &&
    (!currentUser.isApprovedByAdmin ||
      currentUser.status === 'pending_approval' ||
      currentUser.status === 'inactive')
  ) {
    return (
      <>
        <OfflineBanner isOfflineSession={isOfflineSession} />
        <PendingApprovalViewerScreen
          user={currentUser}
          onLogout={handleLogout}
          onRefreshStatus={refreshSessionUser}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <OfflineBanner isOfflineSession={isOfflineSession} />
      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        allUsers={allUsersList}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onSearchQuery={() => {}}
        notificationsCount={
          inspectorNotes.length + dailyNotebook.filter((n) => n.status !== 'منجزة').length
        }
        dailyNotebookEntries={dailyNotebook}
        onUpdateNotebookStatus={handleUpdateNotebookStatus}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeLessonSession={activeLessonSession}
        onOpenCommandCenter={() => navigateToTab('lesson_command_center')}
        searchStudents={allStudents}
        searchLessonPlans={lessonPlans}
        searchKnowledgeItems={knowledgeItems}
        onNavigateToTab={(tab) => navigateToTab(tab as NavTab)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(t) => {
            navigateToTab(t);
            setIsMobileMenuOpen(false);
          }}
          userRole={currentUser.role}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          unreadInspectorNotesCount={inspectorNotes.filter((n) => n.status === 'جديدة').length}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
        />

        {/* View Content Canvas Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 pb-20 md:pb-8 overflow-y-auto max-h-[calc(100vh-60px)]">
          <Suspense fallback={<ViewFallback />}>
            {activeTab === 'dashboard' && (
              <TeacherDashboard
                user={currentUser}
                dailyNotebook={dailyNotebook}
                lessonPlans={lessonPlans}
                inspectorNotes={inspectorNotes}
                inspectionVisits={inspectionVisits}
                onNavigateTab={(t) => navigateToTab(t)}
                onOpenAIGenerator={() => navigateToTab('lesson_plans')}
                onUpdateNotebookStatus={handleUpdateNotebookStatus}
              />
            )}

            {activeTab === 'annual_plan' && (
              <AnnualPlanView
                currentUser={currentUser}
                onNavigateToAnnualSchedule={() => navigateToTab('annual_schedule')}
              />
            )}

            {activeTab === 'annual_schedule' && (
              <AnnualScheduleView
                currentUser={currentUser}
                onNavigateToAnnualPlan={() => navigateToTab('annual_plan')}
              />
            )}

            {activeTab === 'weekly_schedule' && (
              <WeeklyScheduleView
                scheduleSlots={weeklySchedule}
                onAddSlot={handleAddWeeklySlot}
                onDeleteSlot={handleDeleteWeeklySlot}
                teacherName={`${currentUser.firstName} ${currentUser.lastName}`}
                schoolName={currentUser.schoolName || 'المدرسة الابتدائية'}
                teacherClasses={teacherClasses}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'learning_segments' && <LearningSegmentsView />}

            {activeTab === 'daily_notebook' && (
              <DailyNotebookView
                notebookEntries={dailyNotebook}
                lessonPlans={lessonPlans}
                onUpdateStatus={handleUpdateNotebookStatus}
                onOpenLessonPlan={(id) => handleOpenLessonPlan(id)}
                onOpenAIGeneratorForSession={() => navigateToTab('lesson_plans')}
                onDeleteEntry={handleDeleteNotebookEntry}
              />
            )}

            {activeTab === 'lesson_plans' && (
              <LessonPlanView
                lessonPlans={lessonPlans}
                activeLessonId={activeLessonPlanId}
                onSaveLessonPlan={handleSaveLessonPlan}
                onDeleteLessonPlan={handleDeleteLessonPlan}
                onUpdateLessonStatus={handleUpdateLessonStatus}
                onOpenCommandCenterForPlan={handleLaunchCommandCenterForPlan}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'lesson_command_center' && (
              <LessonCommandCenterView
                currentSession={activeLessonSession}
                timingSettings={lessonTimingSettings}
                teacherClasses={teacherClasses}
                lessonPlans={lessonPlans}
                students={allStudents}
                weeklySchedule={weeklySchedule}
                onStartSession={handleStartLessonSession}
                onUpdateSession={handleUpdateLessonSession}
                onEndSession={handleEndLessonSession}
                onUpdateTimingSettings={handleUpdateTimingSettings}
                onNavigateToLessonPlans={() => navigateToTab('lesson_plans')}
                onAddNotebookEntry={handleAddNotebookEntry}
              />
            )}

            {activeTab === 'knowledge_engine' && (
              <KnowledgeEngineView
                knowledgeItems={knowledgeItems}
                onAddKnowledgeItem={handleAddKnowledgeItem}
                onUpdateKnowledgeItem={handleUpdateKnowledgeItem}
                onSubmitKnowledgeItem={handleSubmitKnowledgeItem}
                onApproveKnowledgeItem={handleApproveKnowledgeItem}
                onRejectKnowledgeItem={handleRejectKnowledgeItem}
                currentUser={currentUser}
                communityResources={communityResources}
              />
            )}

            {activeTab === 'competency_assessment' && (
              <CompetencyAssessmentView
                assessmentSessions={assessmentSessions}
                onSaveAssessmentSession={handleSaveAssessmentSession}
                currentUser={currentUser}
                classes={teacherClasses}
                students={allStudents}
                onAddClass={handleAddClass}
              />
            )}

            {activeTab === 'gradebook' && (
              <GradebookView
                classes={teacherClasses}
                students={allStudents}
                onAddClass={handleAddClass}
                onDeleteClass={handleDeleteClass}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'professional_hub' && (
              <ProfessionalHub
                currentUser={currentUser}
                onUpdateCurrentUser={handleUpdateCurrentUser}
                allUsersList={allUsersList}
                onUpdateAllUsers={(users) => setAllUsersList(users)}
                districts={INITIAL_DIRECTORATES[0].districts || []}
                groupMessages={districtGroupMessages}
                directMessages={directMessages}
                onSendGroupMessage={handleSendDistrictGroupMessage}
                onSendDirectMessageFromChat={handleSendDirectMessageFromChat}
                onToggleFollowTeacher={handleToggleFollowTeacher}
                communityResources={communityResources}
                onAddCommunityResource={handleAddCommunityResource}
                onToggleLikeResource={handleToggleLikeResource}
                onSaveToPersonalLibrary={handleSaveToPersonalLibrary}
                personalLibraryItems={personalLibraryItems}
                onSendDirectMessage={handleSendDirectMessage}
                notifications={communityNotifications}
                onMarkNotificationRead={handleMarkNotificationRead}
                onDeleteNotification={handleDeleteCommunityNotification}
                onNotifyNewFollower={handleNotifyNewFollower}
                lessonPlans={lessonPlans}
                knowledgeItems={knowledgeItems}
              />
            )}

            {activeTab === 'inspector_portal' && (
              <InspectorDashboard
                inspector={
                  currentUser.role === 'inspector'
                    ? currentUser
                    : allUsersList.find((u) => u.role === 'inspector') ||
                      DEMO_USERS.find((u) => u.role === 'inspector') ||
                      DEMO_USERS[0]
                }
                teachers={allUsersList.filter((u) => u.role === 'teacher')}
                notes={inspectorNotes}
                visits={inspectionVisits}
                broadcasts={broadcasts}
                directMessages={directMessages}
                classes={teacherClasses}
                students={allStudents}
                weeklySchedule={weeklySchedule}
                lessonPlans={lessonPlans}
                dailyNotebook={dailyNotebook}
                communityResources={communityResources}
                onToggleApproveResource={handleToggleApproveResource}
                onAddNote={handleAddInspectorNote}
                onAddVisit={handleAddInspectionVisit}
                onAddBroadcast={handleAddBroadcast}
                onAddDirectMessage={handleAddDirectMessageFromInspector}
              />
            )}

            {activeTab === 'director_portal' && (
              <DirectorDashboard
                director={
                  currentUser.role === 'director'
                    ? currentUser
                    : allUsersList.find((u) => u.role === 'director') || currentUser
                }
                teachers={allUsersList.filter(
                  (u) => u.role === 'teacher' && u.institutionId === currentUser.institutionId
                )}
                classes={teacherClasses}
                notebookEntries={dailyNotebook}
              />
            )}

            {activeTab === 'admin_portal' && (
              <AdminDashboard
                aiSettings={aiSettings}
                onUpdateAISettings={(s) => setAiSettings(s)}
                aiLogs={aiLogs}
                knowledgeItems={knowledgeItems}
                onApproveKnowledgeItem={handleApproveKnowledgeItem}
                users={allUsersList}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                user={currentUser}
                lessonPlans={lessonPlans}
                inspectorNotes={inspectorNotes}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />
            )}
          </Suspense>
        </main>
      </div>

      {/* Floating AI Pedagogical Assistant Drawer */}
      <Suspense fallback={null}>
        <AIAssistantDrawer isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />
      </Suspense>
    </div>
  );
}
