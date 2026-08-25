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
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { LandingScreen } from './components/landing/LandingScreen';
import { PendingApprovalViewerScreen } from './components/auth/PendingApprovalViewerScreen';
import { useAuth } from './hooks/useAuth';
import { usePlatformStore } from './hooks/usePlatformStore';
import { logoutRequest } from './services/api';
import {
  tabToPath,
  pathToTab,
  defaultTabForRole,
  resolveTabForRole,
  planningSectionForPath,
} from './lib/routes';
import { User } from './types/spex';
import { INITIAL_DIRECTORATES } from './data/initialState';
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
const InspectorWorkspacePage = lazy(() =>
  import('./components/dashboard/InspectorWorkspacePage').then((m) => ({
    default: m.InspectorWorkspacePage,
  }))
);
const DirectorDashboard = lazy(() =>
  import('./components/dashboard/DirectorDashboard').then((m) => ({ default: m.DirectorDashboard }))
);
const AdminWorkspacePage = lazy(() =>
  import('./components/dashboard/AdminWorkspacePage').then((m) => ({
    default: m.AdminWorkspacePage,
  }))
);
const TeacherPlanningWorkspace = lazy(() =>
  import('./components/planning/TeacherPlanningWorkspace').then((m) => ({
    default: m.TeacherPlanningWorkspace,
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
  // Legacy roster policy marker: currentUser.role === 'inspector' ? assignedTeachers : []
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
  const inspectorTeacherId = location.pathname.match(/^\/inspector\/teachers\/([^/]+)$/)?.[1];
  const inspectorTeacherContext =
    new URLSearchParams(location.search).get('teacherId') || inspectorTeacherId;

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
    refreshInspectionVisits,
    teacherInspectorFeed,
    assignedTeachers,
    refreshAssignedTeachers,
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
    refreshStudentRoster,
    handleDeleteStudent,
    handleDeleteLessonPlan,
    handleDeleteNotebookEntry,
    handleUpdateNotebookStatus,
    handleUpdateLessonStatus,
    handleSaveLessonPlan,
    handleSaveAssessmentSession,
    handleAddKnowledgeItem,
    handleUpdateKnowledgeItem,
    handleSubmitKnowledgeItem,
    handleDeleteKnowledgeItem,
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
    const legacyPlanningSection = planningSectionForPath(location.pathname);
    if (legacyPlanningSection) {
      navigate('/planning?section=' + legacyPlanningSection, { replace: true });
      return;
    }
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
    const logoutPath = currentUser.role === 'admin' ? '/admin/login' : '/login';
    setIsAuthenticated(false);
    localStorage.removeItem('spex_current_user');
    logoutRequest();
    setAuthView('login');
    navigate(logoutPath, { replace: true });
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
          onGoToAdminLogin={() => {
            setAuthView('login');
            navigate('/admin/login');
          }}
        />
      );
    }
    if (location.pathname === '/admin/login') {
      return (
        <AdminLoginPage
          onLoginSuccess={handleLoginSuccess}
          onBackToProfessionalLogin={() => navigate('/login')}
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
                inspectorNotes={teacherInspectorFeed.guidance}
                inspectionVisits={teacherInspectorFeed.visits}
                inspectorDisplayName={teacherInspectorFeed.inspector?.displayName || null}
                onNavigateTab={(t) => navigateToTab(t)}
                onOpenAIGenerator={() => navigateToTab('lesson_plans')}
                onUpdateNotebookStatus={handleUpdateNotebookStatus}
              />
            )}

            {activeTab === 'planning' && (
              <TeacherPlanningWorkspace currentUser={currentUser} classes={teacherClasses} />
            )}

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
                onDeleteKnowledgeItem={handleDeleteKnowledgeItem}
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
                onRefreshRoster={refreshStudentRoster}
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
                    : allUsersList.find((u) => u.role === 'inspector') || currentUser
                }
                onNavigateTab={navigateToTab}
              />
            )}

            {currentUser.role === 'inspector' &&
              activeTab.startsWith('inspector_') &&
              activeTab !== 'inspector_portal' && (
                <InspectorWorkspacePage
                  module={activeTab as any}
                  inspector={currentUser}
                  teachers={assignedTeachers}
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
                  onNavigate={navigateToTab}
                  onRefreshTeachers={refreshAssignedTeachers}
                  onAddNote={handleAddInspectorNote}
                  onAddVisit={handleAddInspectionVisit}
                  onRefreshVisits={refreshInspectionVisits}
                  onAddBroadcast={handleAddBroadcast}
                  onAddDirectMessage={handleAddDirectMessageFromInspector}
                  onToggleApproveResource={handleToggleApproveResource}
                  teacherId={inspectorTeacherContext}
                  onOpenTeacher={(teacherId) =>
                    navigate(`/inspector/teachers/${encodeURIComponent(teacherId)}`)
                  }
                  onNavigateWithTeacher={(tab, teacherId) =>
                    navigate(`${tabToPath(tab)}?teacherId=${encodeURIComponent(teacherId)}`)
                  }
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

            {(activeTab === 'admin_portal' ||
              activeTab === 'admin_accounts' ||
              activeTab === 'admin_pending_users' ||
              activeTab === 'admin_inspectors' ||
              activeTab === 'admin_services' ||
              activeTab === 'admin_approvals' ||
              activeTab === 'admin_curriculum' ||
              activeTab === 'admin_reports') && (
              <AdminWorkspacePage
                currentUser={currentUser}
                aiSettings={aiSettings}
                onUpdateAISettings={(s) => setAiSettings(s)}
                aiLogs={aiLogs}
                knowledgeItems={knowledgeItems}
                onApproveKnowledgeItem={handleApproveKnowledgeItem}
                onRejectKnowledgeItem={handleRejectKnowledgeItem}
                onAddKnowledgeItem={handleAddKnowledgeItem}
                onUpdateKnowledgeItem={handleUpdateKnowledgeItem}
                onSubmitKnowledgeItem={handleSubmitKnowledgeItem}
                onDeleteKnowledgeItem={handleDeleteKnowledgeItem}
                users={allUsersList}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                communityResources={communityResources}
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
