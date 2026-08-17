/**
 * SPEX - Sports Physical Education eXpert Platform
 * Application Entry Point & Core State Controller
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { TeacherDashboard } from './components/dashboard/TeacherDashboard';
import { InspectorDashboard } from './components/dashboard/InspectorDashboard';
import { DirectorDashboard } from './components/dashboard/DirectorDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { AuthScreen } from './components/auth/AuthScreen';
import { LandingScreen } from './components/landing/LandingScreen';
import { AnnualPlanView } from './components/curriculum/AnnualPlanView';
import { AnnualScheduleView } from './components/curriculum/AnnualScheduleView';
import { WeeklyScheduleView } from './components/schedule/WeeklyScheduleView';
import { LearningSegmentsView } from './components/curriculum/LearningSegmentsView';
import { DailyNotebookView } from './components/notebook/DailyNotebookView';
import { LessonPlanView } from './components/lesson/LessonPlanView';
import { KnowledgeEngineView } from './components/knowledge/KnowledgeEngineView';
import { CompetencyAssessmentView } from './components/assessment/CompetencyAssessmentView';
import { GradebookView } from './components/gradebook/GradebookView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { DistrictChatView } from './components/chat/DistrictChatView';
import { ProfessionalCommunityView } from './components/community/ProfessionalCommunityView';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { LessonCommandCenterView } from './components/lesson/LessonCommandCenterView';
import { FloatingLessonOverlay } from './components/lesson/FloatingLessonOverlay';
import {
  syncUserToDB,
  deleteUserFromDB,
  syncUsersBatchToDB,
  fetchUsersFromDB,
  syncLessonPlanToDB,
  syncLessonPlansBatchToDB,
  fetchLessonPlansFromDB,
  syncNotebookEntryToDB,
  syncNotebookBatchToDB,
  syncInspectorNoteToDB,
  syncDistrictMessageToDB,
  fetchDistrictMessagesFromDB,
  syncCommunityResourceToDB,
  fetchCommunityResourcesFromDB,
  syncCommunityNotificationToDB,
  fetchCommunityNotificationsFromDB,
  deleteCommunityNotificationFromDB,
  syncDirectMessageToDB,
  fetchDirectMessagesFromDB,
  fetchCurrentSession,
  logoutRequest
} from './services/api';

import {
  User,
  DailyNotebookEntry,
  LessonPlan,
  KnowledgeItem,
  InspectorNote,
  InspectionVisit,
  AISetting,
  AILog,
  CompetencyAssessmentSession,
  ClassRoom,
  Student,
  WeeklyScheduleSlot,
  DistrictGroupMessage,
  DirectChatMessage,
  LessonSessionTiming,
  LessonSession,
  LessonExecutionLog,
  CommunityResource,
  CommunityChatMessage,
  CommunityNotification,
  PersonalLibraryItem
} from './types/spex';

import {
  DEMO_USERS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_DAILY_NOTEBOOK,
  INITIAL_LESSON_PLANS,
  INITIAL_INSPECTOR_NOTES,
  INITIAL_INSPECTION_VISITS,
  INITIAL_AI_SETTINGS,
  INITIAL_AI_LOGS,
  INITIAL_ASSESSMENT_SESSIONS,
  INITIAL_BROADCASTS,
  INITIAL_DIRECT_MESSAGES,
  INITIAL_WEEKLY_SCHEDULE,
  INITIAL_DISTRICT_GROUP_MESSAGES,
  INITIAL_DIRECTORATES
} from './data/initialState';

import { INITIAL_KNOWLEDGE_BANK } from './data/knowledgeBankData';

// الحسابات التجريبية (DEMO_USERS) معروضة للتقييم فقط وتحمل كلمة المرور العمومية المعروفة
// '12345678' — مزامنتها تلقائياً إلى قاعدة البيانات كانت تحوّلها إلى حسابات حقيقية
// قابلة لتسجيل الدخول بكلمة مرور متداولة! لذا تُستبعد من كل مسارات المزامنة الصادرة.
const DEMO_USER_IDS = new Set(DEMO_USERS.map((u) => u.id));

export default function App() {
  // Authentication state — the source of truth is now the server session (httpOnly cookie),
  // not a flag readable/writable from the browser console.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [authView, setAuthView] = useState<'landing' | 'login'>(() =>
    typeof window !== 'undefined' && window.location.search.includes('reset_token=') ? 'login' : 'landing'
  );

  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);

  // On load, ask the server whether we have a valid session instead of trusting local storage
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const result = await fetchCurrentSession();
      if (cancelled) return;
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsCheckingSession(false);
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // App domain state with persistent LocalStorage backup
  const [allUsersList, setAllUsersList] = useState<User[]>(() => {
    const saved = localStorage.getItem('spex_all_users');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return DEMO_USERS;
  });

  const [teacherClasses, setTeacherClasses] = useState<ClassRoom[]>(() => {
    const saved = localStorage.getItem('spex_teacher_classes');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_CLASSES;
  });

  const [allStudents, setAllStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('spex_all_students');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_STUDENTS;
  });

  const [dailyNotebook, setDailyNotebook] = useState<DailyNotebookEntry[]>(() => {
    const saved = localStorage.getItem('spex_daily_notebook');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_DAILY_NOTEBOOK;
  });

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleSlot[]>(() => {
    const saved = localStorage.getItem('spex_weekly_schedule');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_WEEKLY_SCHEDULE;
  });

  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(() => {
    const saved = localStorage.getItem('spex_lesson_plans');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_LESSON_PLANS;
  });

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => {
    const saved = localStorage.getItem('spex_knowledge_items');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_KNOWLEDGE_BANK;
  });

  const [inspectorNotes, setInspectorNotes] = useState<InspectorNote[]>(() => {
    const saved = localStorage.getItem('spex_inspector_notes');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_INSPECTOR_NOTES;
  });

  const [inspectionVisits, setInspectionVisits] = useState<InspectionVisit[]>(INITIAL_INSPECTION_VISITS);
  const [assessmentSessions, setAssessmentSessions] = useState<CompetencyAssessmentSession[]>(INITIAL_ASSESSMENT_SESSIONS);
  const [broadcasts, setBroadcasts] = useState(INITIAL_BROADCASTS);
  const [directMessages, setDirectMessages] = useState<DirectChatMessage[]>(() => {
    const saved = localStorage.getItem('spex_direct_messages');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_DIRECT_MESSAGES;
  });

  const [communityResources, setCommunityResources] = useState<CommunityResource[]>(() => {
    const saved = localStorage.getItem('spex_community_resources');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return [
      {
        id: 'res_demo_1',
        spexId: 'SPX-8K31H2',
        authorName: 'عبد المالك نابتي',
        authorUsername: '@abdelmalek_nabti',
        authorRole: 'teacher',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        type: 'game',
        title: 'لعبة الصياد والأسماك السريعة (تنمية السرعة والتوافق الحركي)',
        description: 'لعبة تربوية تنافسية موجهة لتلاميذ السنة الأولى والثانية ابتدائية تهدف لتعزيز السرعة والاستجابة للإشارات.',
        likesCount: 18,
        savesCount: 12,
        isApprovedByInspector: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'res_demo_2',
        spexId: 'SPX-0I11R5',
        authorName: 'مصطفى رواق',
        authorUsername: '@inspector_rewaq',
        authorRole: 'inspector',
        authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
        type: 'lesson_plan',
        title: 'مذكرة نموذجية معتمدة: الجري في مسار مستقيم ومنحنٍ مع التغيير',
        description: 'مذكرة بيداغوجية مصادق عليها تشتمل على وضعيات مشكلة وإجراءات السلامة للميدان البدني للطور الابتدائي.',
        likesCount: 35,
        savesCount: 29,
        isApprovedByInspector: true,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [communityNotifications, setCommunityNotifications] = useState<CommunityNotification[]>(() => {
    const saved = localStorage.getItem('spex_community_notifications');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return [
      {
        id: 'notif_1',
        userId: 'usr_teacher_1',
        senderId: 'usr_teacher_2',
        senderUsername: 'issam_boucharaba',
        senderName: 'عصام بوشرابة',
        type: 'new_follower',
        title: 'متابع جديد بالمجتمع المهني',
        message: 'قام الأستاذ عصام بوشرابة بمتابعة حسابك الشخصي على SPEX.',
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif_2',
        userId: 'usr_teacher_1',
        senderId: 'usr_inspector_1',
        senderUsername: 'inspector_rewaq',
        senderName: 'المفتش مصطفى رواق',
        type: 'resource_approved',
        title: 'اعتماد مورد بيداغوجي',
        message: 'تمت المصادقة على لعبتك التربوية المنشورة من طرف مفتشية المقاطعة.',
        read: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [personalLibraryItems, setPersonalLibraryItems] = useState<PersonalLibraryItem[]>(() => {
    const saved = localStorage.getItem('spex_personal_library');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return [];
  });
  const [districtGroupMessages, setDistrictGroupMessages] = useState<DistrictGroupMessage[]>(() => {
    const saved = localStorage.getItem('spex_district_group_messages');
    if (saved) { try { return JSON.parse(saved); } catch(e){} }
    return INITIAL_DISTRICT_GROUP_MESSAGES;
  });
  const [aiSettings, setAiSettings] = useState<AISetting>(INITIAL_AI_SETTINGS);
  const [aiLogs, setAiLogs] = useState<AILog[]>(INITIAL_AI_LOGS);

  // Lesson Command Center Domain State & Persistent Settings
  const [lessonTimingSettings, setLessonTimingSettings] = useState<LessonSessionTiming>(() => {
    const saved = localStorage.getItem('spex_lesson_timing_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      preparationMinutes: 10,
      situation1Minutes: 20,
      situation2Minutes: 20,
      finalMinutes: 10,
      alertBeforeStart10Min: true,
      alertBeforeStart5Min: true,
      alertNoPlan: true,
      soundEnabled: true,
      vibrationEnabled: true,
      floatingOverlayEnabled: true,
      autoLogToNotebook: true
    };
  });

  const [activeLessonSession, setActiveLessonSession] = useState<LessonSession | null>(() => {
    const saved = localStorage.getItem('spex_active_lesson_session');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [lessonExecutionLogs, setLessonExecutionLogs] = useState<LessonExecutionLog[]>(() => {
    const saved = localStorage.getItem('spex_lesson_execution_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Ticker Interval effect for live session countdown
  useEffect(() => {
    if (!activeLessonSession || activeLessonSession.status !== 'in_progress' || activeLessonSession.isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setActiveLessonSession((prev) => {
        if (!prev || prev.status !== 'in_progress' || prev.isPaused) return prev;

        const currentPhase = prev.currentPhase;
        const remaining = prev.phaseRemainingSeconds - 1;
        const totalElapsed = prev.totalElapsedSeconds + 1;
        const phaseSpent = {
          ...prev.actualPhaseSpent,
          [currentPhase]: (prev.actualPhaseSpent[currentPhase] || 0) + 1
        };

        if (remaining <= 0) {
          // Automatic Phase Transition
          const PHASES_ORDER: Array<'preparation' | 'situation1' | 'situation2' | 'final'> = [
            'preparation',
            'situation1',
            'situation2',
            'final'
          ];
          const currIdx = PHASES_ORDER.indexOf(currentPhase);

          if (currIdx < PHASES_ORDER.length - 1) {
            const nextPhase = PHASES_ORDER[currIdx + 1];
            const nextSecs = prev.phaseDurations[nextPhase] || 1200;
            return {
              ...prev,
              currentPhase: nextPhase,
              phaseRemainingSeconds: nextSecs,
              totalElapsedSeconds: totalElapsed,
              actualPhaseSpent: phaseSpent
            };
          } else {
            // Reached end of final phase
            return {
              ...prev,
              status: 'completed',
              phaseRemainingSeconds: 0,
              totalElapsedSeconds: totalElapsed,
              actualPhaseSpent: phaseSpent
            };
          }
        }

        return {
          ...prev,
          phaseRemainingSeconds: remaining,
          totalElapsedSeconds: totalElapsed,
          actualPhaseSpent: phaseSpent
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeLessonSession?.status, activeLessonSession?.isPaused]);

  // Persistent localStorage sync for command center
  useEffect(() => {
    localStorage.setItem('spex_lesson_timing_settings', JSON.stringify(lessonTimingSettings));
  }, [lessonTimingSettings]);

  useEffect(() => {
    if (activeLessonSession) {
      localStorage.setItem('spex_active_lesson_session', JSON.stringify(activeLessonSession));
    } else {
      localStorage.removeItem('spex_active_lesson_session');
    }
  }, [activeLessonSession]);

  useEffect(() => {
    localStorage.setItem('spex_lesson_execution_logs', JSON.stringify(lessonExecutionLogs));
  }, [lessonExecutionLogs]);

  // Persistent localStorage sync for Community Module
  useEffect(() => {
    localStorage.setItem('spex_community_resources', JSON.stringify(communityResources));
  }, [communityResources]);

  useEffect(() => {
    localStorage.setItem('spex_community_notifications', JSON.stringify(communityNotifications));
  }, [communityNotifications]);

  useEffect(() => {
    localStorage.setItem('spex_personal_library', JSON.stringify(personalLibraryItems));
  }, [personalLibraryItems]);

  // Handlers for Lesson Command Center
  const handleStartLessonSession = (sessionData: Omit<LessonSession, 'id'>) => {
    const newSession: LessonSession = {
      ...sessionData,
      id: `sess_${Date.now()}`
    };
    setActiveLessonSession(newSession);
  };

  const handleLaunchCommandCenterForPlan = (plan: LessonPlan) => {
    setActiveLessonPlanId(plan.id);
    const targetClass = teacherClasses.find((c) => c.levelName === plan.levelName) || teacherClasses[0] || { id: 'c1', name: plan.className, levelName: plan.levelName };

    const prepSecs = lessonTimingSettings.preparationMinutes * 60;
    const newSession: LessonSession = {
      id: `sess_${Date.now()}`,
      teacherId: currentUser.id,
      classId: targetClass.id,
      className: `${plan.levelName} (${plan.className || 'الفوج الأول'})`,
      date: plan.date || new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '09:00',
      sessionTitle: plan.sessionTitle,
      lessonPlanId: plan.id,
      status: 'in_progress',
      currentPhase: 'preparation',
      phaseRemainingSeconds: prepSecs,
      totalElapsedSeconds: 0,
      preparationObjective: plan.warmupPhase?.pedagogicalWarmupGame?.title || 'الإحماء العام والخاص وتجهيز التلاميذ بدﻧياً ونفسياً',
      educationalObjective: plan.generalObjective || plan.mainPhase?.learningSituation1?.description || 'تطوير المهارات الحركية والتوافق البدني',
      situation1Description: plan.mainPhase?.learningSituation1?.description || 'بناء التعلمات والتطبيق الحركي الفردي والجماعي',
      situation2Title: plan.mainPhase?.learningSituation2?.title || 'الوضعية المشكلة والتنافس',
      situation2Description: plan.mainPhase?.learningSituation2?.description || 'المنافسة المصغرة واللعب الموجه وفق القوانين',
      finalObjective: plan.coolDownPhase?.assessmentAndDialogue || 'العودة للهدوء وتفقد العتاد والتقويم الختامي',
      phaseDurations: {
        preparation: lessonTimingSettings.preparationMinutes * 60,
        situation1: lessonTimingSettings.situation1Minutes * 60,
        situation2: lessonTimingSettings.situation2Minutes * 60,
        final: lessonTimingSettings.finalMinutes * 60
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

    setActiveLessonSession(newSession);
    setCurrentTab('lesson_command_center');
  };

  const handleUpdateLessonSession = (updated: Partial<LessonSession>) => {
    setActiveLessonSession((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const handleEndLessonSession = (log?: LessonExecutionLog) => {
    if (log) {
      setLessonExecutionLogs((prev) => [log, ...prev]);
    }
    setActiveLessonSession(null);
  };

  const handleAddNotebookEntry = (entry: Omit<DailyNotebookEntry, 'id'>) => {
    const newEntry: DailyNotebookEntry = {
      ...entry,
      id: `notebook_${Date.now()}`
    };
    setDailyNotebook((prev) => [newEntry, ...prev]);
    syncNotebookEntryToDB(newEntry);
  };

  // Initial Database Load Effect from Platform Server DB
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadDBData() {
      try {
        const dbUsers = await fetchUsersFromDB();
        if (dbUsers && dbUsers.length > 0) {
          setAllUsersList((prev) => {
            const map = new Map();
            prev.forEach((u) => map.set(u.id, u));
            dbUsers.forEach((u: any) => map.set(u.id, u));
            return Array.from(map.values());
          });
        }

        const dbLessons = await fetchLessonPlansFromDB();
        if (dbLessons && dbLessons.length > 0) {
          setLessonPlans((prev) => {
            const map = new Map();
            prev.forEach((l) => map.set(l.id, l));
            dbLessons.forEach((l: any) => map.set(l.id, l));
            return Array.from(map.values());
          });
        }

        const dbMsgs = await fetchDistrictMessagesFromDB();
        if (dbMsgs && dbMsgs.length > 0) {
          setDistrictGroupMessages((prev) => {
            const map = new Map();
            prev.forEach((m) => map.set(m.id, m));
            dbMsgs.forEach((m: any) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }

        // الرسائل المباشرة وموارد وإشعارات المجتمع — كانت تُزامَن صعوداً فقط ولا تُجلب
        // عند التحميل، فتضيع لدى تغيير الجهاز أو مسح التخزين المحلي
        const dbDirectMsgs = await fetchDirectMessagesFromDB();
        if (dbDirectMsgs && dbDirectMsgs.length > 0) {
          setDirectMessages((prev) => {
            const map = new Map();
            prev.forEach((m) => map.set(m.id, m));
            dbDirectMsgs.forEach((m: any) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }

        const dbResources = await fetchCommunityResourcesFromDB();
        if (dbResources && dbResources.length > 0) {
          setCommunityResources((prev) => {
            const map = new Map();
            prev.forEach((r) => map.set(r.id, r));
            dbResources.forEach((r: any) => map.set(r.id, r));
            return Array.from(map.values());
          });
        }

        const dbNotifications = await fetchCommunityNotificationsFromDB();
        if (dbNotifications && dbNotifications.length > 0) {
          setCommunityNotifications((prev) => {
            const map = new Map();
            prev.forEach((n) => map.set(n.id, n));
            dbNotifications.forEach((n: any) => map.set(n.id, n));
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Initial DB load error:', e);
      }
    }

    loadDBData();
  }, [isAuthenticated]);

  // Auto-Save effects to LocalStorage and Platform DB for full persistence

  useEffect(() => {
    if (currentUser && isAuthenticated) {
      localStorage.setItem('spex_current_user', JSON.stringify(currentUser));
      // الحسابات التجريبية لا تُزامَن إلى قاعدة البيانات إطلاقاً (كلمة مرورها عمومية معروفة)
      if (!DEMO_USER_IDS.has(currentUser.id)) {
        syncUserToDB(currentUser);
      }
    }
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('spex_direct_messages', JSON.stringify(directMessages));
  }, [directMessages]);

  useEffect(() => {
    localStorage.setItem('spex_district_group_messages', JSON.stringify(districtGroupMessages));
  }, [districtGroupMessages]);

  useEffect(() => {
    localStorage.setItem('spex_daily_notebook', JSON.stringify(dailyNotebook));
    if (dailyNotebook.length > 0) {
      syncNotebookBatchToDB(dailyNotebook);
    }
  }, [dailyNotebook]);

  useEffect(() => {
    localStorage.setItem('spex_weekly_schedule', JSON.stringify(weeklySchedule));
  }, [weeklySchedule]);

  useEffect(() => {
    localStorage.setItem('spex_lesson_plans', JSON.stringify(lessonPlans));
    if (lessonPlans.length > 0) {
      syncLessonPlansBatchToDB(lessonPlans);
    }
  }, [lessonPlans]);

  useEffect(() => {
    localStorage.setItem('spex_teacher_classes', JSON.stringify(teacherClasses));
  }, [teacherClasses]);

  useEffect(() => {
    localStorage.setItem('spex_all_students', JSON.stringify(allStudents));
  }, [allStudents]);

  useEffect(() => {
    localStorage.setItem('spex_all_users', JSON.stringify(allUsersList));
    // لا نزامن الحسابات التجريبية المعروضة افتراضياً — فقط حسابات حقيقية أُدخلت عبر الإدارة
    const realUsers = allUsersList.filter((u) => !DEMO_USER_IDS.has(u.id));
    if (realUsers.length > 0) {
      syncUsersBatchToDB(realUsers);
    }
  }, [allUsersList]);

  useEffect(() => {
    localStorage.setItem('spex_inspector_notes', JSON.stringify(inspectorNotes));
  }, [inspectorNotes]);

  const handleAddClass = (newClassData: { name: string; levelId: string; studentCount: number; municipality?: string; schoolName?: string }) => {
    const newClassId = `cls_${Date.now()}`;
    const newClass: ClassRoom = {
      id: newClassId,
      institutionId: currentUser?.institutionId || 'inst_ainazel_1',
      teacherId: currentUser?.id || 'usr_teacher_1',
      levelId: newClassData.levelId,
      name: newClassData.name,
      studentCount: Number(newClassData.studentCount) || 25
    };

    setTeacherClasses((prev) => [...prev, newClass]);

    const levelNum = newClassData.levelId.replace('lvl_p', '');
    const newStudentsList: Student[] = Array.from({ length: Math.min(Number(newClassData.studentCount) || 25, 25) }).map((_, i) => ({
      id: `std_${newClassId}_${i + 1}`,
      classId: newClassId,
      firstName: `تلميذ ${i + 1}`,
      lastName: `قسم ${newClassData.name}`,
      gender: i % 2 === 0 ? 'ذكر' : 'أنثى',
      registrationNumber: `2025/${levelNum}0${i + 1}`
    }));

    setAllStudents((prev) => [...prev, ...newStudentsList]);
    return newClassId;
  };

  const handleDeleteClass = (classId: string) => {
    setTeacherClasses((prev) => prev.filter((c) => c.id !== classId));
    setAllStudents((prev) => prev.filter((s) => s.classId !== classId));
  };

  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
    setAllStudents((prev) => [...prev, newStudent]);
  };

  const handleDeleteStudent = (studentId: string) => {
    setAllStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleDeleteLessonPlan = (lessonId: string) => {
    setLessonPlans((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // User Management Handlers for Admin
  const handleAddUser = async (userPartial: Partial<User>) => {
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: userPartial.username || `user_${Math.floor(1000 + Math.random() * 9000)}`,
      spexId: userPartial.spexId || `SPX-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: userPartial.firstName || 'مستخدم',
      lastName: userPartial.lastName || 'جديد',
      email: userPartial.email || `user_${Date.now()}@spex.dz`,
      // بدون كلمة مرور ضمنية: الخادم يرفض إنشاء حساب بلا كلمة مرور أولية ويعيد خطأ واضحاً
      // بدل أن تُنشأ الحسابات بكلمة افتراضية لا يعلمها أحد
      password: userPartial.password || '',
      role: userPartial.role || 'teacher',
      phone: userPartial.phone || '0661234567',
      schoolName: userPartial.schoolName || 'مدرسة الشهيد بالخيري عبد القادر',
      municipality: userPartial.municipality || 'عين أزال - سطيف',
      directorateId: userPartial.directorateId || 'setif_de',
      districtId: userPartial.districtId || 'dist_setif_7',
      institutionId: userPartial.institutionId || 'inst_1',
      specialization:
        userPartial.specialization ||
        (userPartial.role === 'teacher'
          ? 'أستاذ التربية البدنية والرياضية - الطور الابتدائي'
          : userPartial.role === 'inspector'
          ? 'مفتش إدارة وابتدائيات للتربية البدنية والرياضية'
          : 'مدير مدرسة ابتدائية'),
      yearsExperience: userPartial.yearsExperience || 5,
      status: userPartial.status || 'active',
      customApiKey: userPartial.customApiKey || '',
      apiKeyStatus: userPartial.customApiKey ? 'active' : 'not_set',
      isApprovedByAdmin: true,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
    };
    // نرسل كلمة المرور للخادم ليشفّرها فوراً، ثم نستبدل الحالة المحلية بالنسخة الآمنة
    // المُعادة من الخادم بدل الاحتفاظ بكلمة المرور نص عادي في ذاكرة المتصفح
    const result = await syncUserToDB(newUser);
    if (!result.success) {
      // بدون هذا الإشعار كان المستخدم يُضاف محلياً فقط ولا يُحفظ في قاعدة البيانات إطلاقاً دون علم المشرف
      alert(`تعذر حفظ الحساب في قاعدة بيانات المنصة (لن يتمكن صاحبه من تسجيل الدخول):\n${result.error || 'خطأ غير معروف'}`);
      return;
    }
    const { password: _discard, ...safeLocalUser } = newUser;
    setAllUsersList((prev) => [result.user || safeLocalUser, ...prev]);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    // حساب تجريبي: تعديل محلي فقط ولا يُرسل للخادم أبداً (تفادي إنشاء حسابات بكلمة مرور عمومية)
    if (DEMO_USER_IDS.has(updatedUser.id)) {
      const { password: _d, ...safeDemo } = updatedUser;
      setAllUsersList((prev) => prev.map((u) => (u.id === safeDemo.id ? safeDemo : u)));
      if (currentUser.id === safeDemo.id) {
        setCurrentUser(safeDemo as User);
      }
      return;
    }

    const result = await syncUserToDB(updatedUser);
    if (!result.success) {
      // لا نحدّث الحالة المحلية عند فشل الحفظ في الخادم حتى لا يظن المستخدم أن التعديل حُفظ
      alert(`تعذر حفظ التعديلات في قاعدة بيانات المنصة:\n${result.error || 'خطأ غير معروف'}`);
      return;
    }
    const { password: _discard, ...safeLocalUser } = updatedUser;
    const finalUser = result.user || safeLocalUser;
    setAllUsersList((prev) => prev.map((u) => (u.id === finalUser.id ? finalUser : u)));
    if (currentUser.id === finalUser.id) {
      setCurrentUser(finalUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setAllUsersList((prev) => prev.filter((u) => u.id !== userId));
    deleteUserFromDB(userId);
  };

  // Active Lesson state pointer
  const [activeLessonPlanId, setActiveLessonPlanId] = useState<string | undefined>(INITIAL_LESSON_PLANS[0]?.id);

  // Active tab helper with strict role authorization
  const getEffectiveTab = (tab: NavTab, role: User['role']): NavTab => {
    const teacherTabs: NavTab[] = [
      'dashboard', 'professional_community', 'annual_plan', 'annual_schedule', 'weekly_schedule', 'learning_segments', 'daily_notebook',
      'lesson_plans', 'lesson_command_center', 'knowledge_engine', 'competency_assessment', 'gradebook', 'district_chat',
      'reports', 'settings'
    ];
    const inspectorTabs: NavTab[] = ['inspector_portal', 'professional_community', 'district_chat', 'knowledge_engine', 'reports', 'settings'];
    const directorTabs: NavTab[] = ['director_portal', 'professional_community', 'knowledge_engine', 'reports', 'settings'];
    const adminTabs: NavTab[] = ['admin_portal', 'professional_community', 'knowledge_engine', 'reports', 'settings'];

    if (role === 'teacher') return teacherTabs.includes(tab) ? tab : 'dashboard';
    if (role === 'inspector') return inspectorTabs.includes(tab) ? tab : 'inspector_portal';
    if (role === 'director') return directorTabs.includes(tab) ? tab : 'director_portal';
    if (role === 'admin') return adminTabs.includes(tab) ? tab : 'admin_portal';
    return 'dashboard';
  };

  const activeTab = getEffectiveTab(currentTab, currentUser.role);

  // AI Assistant Drawer State
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Weekly schedule handlers
  const handleAddWeeklySlot = (slotData: Omit<WeeklyScheduleSlot, 'id'>) => {
    const newSlot: WeeklyScheduleSlot = {
      ...slotData,
      id: `ws_${Date.now()}`
    };
    setWeeklySchedule((prev) => [...prev, newSlot]);
  };

  const handleDeleteWeeklySlot = (slotId: string) => {
    setWeeklySchedule((prev) => prev.filter((s) => s.id !== slotId));
  };

  // Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.role === 'inspector') {
      setCurrentTab('inspector_portal');
    } else if (user.role === 'director') {
      setCurrentTab('director_portal');
    } else if (user.role === 'admin') {
      setCurrentTab('admin_portal');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('spex_current_user');
    logoutRequest();
    setAuthView('login');
  };

  const handleSwitchUser = (user: User) => {
    handleLoginSuccess(user);
  };

  const handleUpdateNotebookStatus = (
    entryId: string,
    status: 'منجزة' | 'مؤجلة' | 'غير منجزة',
    note?: string
  ) => {
    setDailyNotebook((prev) =>
      prev.map((item) => (item.id === entryId ? { ...item, status, note: note ?? item.note } : item))
    );
  };

  const handleUpdateLessonStatus = (
    lessonId: string,
    status: 'منجزة' | 'مؤجلة' | 'غير منجزة',
    note?: string
  ) => {
    setLessonPlans((prev) =>
      prev.map((lp) =>
        lp.id === lessonId
          ? { ...lp, executionStatus: status, executionNote: note ?? lp.executionNote }
          : lp
      )
    );

    const targetLP = lessonPlans.find((l) => l.id === lessonId);
    if (!targetLP) return;

    // Automatically record and sync to Daily Notebook (الكراس اليومي)
    setDailyNotebook((prev) => {
      const existingIndex = prev.findIndex(
        (e) => e.lessonPlanId === lessonId || e.sessionId === targetLP.id || (e.className.includes(targetLP.levelName) && e.segmentId === targetLP.segmentTitle)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status,
          note: note || updated[existingIndex].note || `حالة الحصة المحدثة تلقائياً من المذكرة: ${status}`
        };
        return updated;
      } else {
        const newEntry: DailyNotebookEntry = {
          id: `nb_auto_${Date.now()}`,
          teacherId: currentUser.id,
          sessionId: targetLP.id,
          segmentId: targetLP.segmentTitle,
          classId: targetLP.className,
          className: `${targetLP.levelName} (${targetLP.className})`,
          executionDate: targetLP.date || new Date().toISOString().split('T')[0],
          timeSlot: '08:00 - 09:00',
          status: status,
          lessonPlanId: targetLP.id,
          note: note || `تسجيل تلقائي في الكراس اليومي من مذكرة الحصة: ${targetLP.sessionTitle}`
        };
        return [newEntry, ...prev];
      }
    });
  };

  const handleSaveLessonPlan = (newPlan: LessonPlan) => {
    setLessonPlans((prev) => [newPlan, ...prev]);
    setActiveLessonPlanId(newPlan.id);
    syncLessonPlanToDB(newPlan);
  };

  const handleAddKnowledgeItem = (newItem: Partial<KnowledgeItem>) => {
    const item: KnowledgeItem = {
      id: `k_${Date.now()}`,
      category: newItem.category || 'game',
      title: newItem.title || 'عنوان جديد',
      description: newItem.description || '',
      fieldName: newItem.fieldName || 'الميدان العام',
      levelName: newItem.levelName || 'جميع المستويات',
      tags: newItem.tags || ['رياضة'],
      equipment: newItem.equipment || [],
      rules: newItem.rules || '',
      duration: newItem.duration || '10 دقائق',
      approved: newItem.approved ?? false,
      createdBy: newItem.createdBy || currentUser.firstName,
      usageCount: 1,
      rating: 5.0
    };
    setKnowledgeItems((prev) => [item, ...prev]);
  };

  const handleApproveKnowledgeItem = (id: string) => {
    setKnowledgeItems((prev) =>
      prev.map((k) => (k.id === id ? { ...k, approved: true } : k))
    );
  };

  const handleAddInspectorNote = (notePartial: Partial<InspectorNote>) => {
    const note: InspectorNote = {
      id: `note_${Date.now()}`,
      inspectorId: currentUser.id,
      inspectorName: `${currentUser.firstName} ${currentUser.lastName}`,
      teacherId: notePartial.teacherId || 'usr_teacher_1',
      teacherName: notePartial.teacherName || 'أحمد بن علي',
      moduleRef: notePartial.moduleRef || 'general',
      title: notePartial.title || 'توجيه بيداغوجي جديد',
      content: notePartial.content || '',
      priority: notePartial.priority || 'هام',
      status: 'جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setInspectorNotes((prev) => [note, ...prev]);
    syncInspectorNoteToDB(note);
  };

  const handleAddInspectionVisit = (visitPartial: Partial<InspectionVisit>) => {
    const visit: InspectionVisit = {
      id: `visit_${Date.now()}`,
      inspectorId: currentUser.id,
      teacherId: visitPartial.teacherId || 'usr_teacher_1',
      institutionId: visitPartial.institutionId || 'inst_1',
      visitDate: visitPartial.visitDate || new Date().toISOString().split('T')[0],
      visitType: visitPartial.visitType || 'متابعة دورية',
      lessonObservedTitle: visitPartial.lessonObservedTitle || 'حصة بدنية',
      pedagogicalGrade: visitPartial.pedagogicalGrade || 16.0,
      positivePoints: visitPartial.positivePoints || [],
      areasForImprovement: visitPartial.areasForImprovement || [],
      recommendations: visitPartial.recommendations || [],
      officialReportGenerated: true
    };
    setInspectionVisits((prev) => [visit, ...prev]);
  };

  const handleOpenLessonPlan = (lessonId?: string) => {
    if (lessonId) {
      setActiveLessonPlanId(lessonId);
    }
    setCurrentTab('lesson_plans');
  };

  // Create and persist a real community notification for a recipient user
  const createCommunityNotification = (params: {
    userId: string;
    type: CommunityNotification['type'];
    title: string;
    message: string;
    resourceId?: string;
  }) => {
    if (!params.userId || params.userId === currentUser.id) return; // never notify self
    const notif: CommunityNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: params.userId,
      senderId: currentUser.id,
      senderUsername: currentUser.username || '',
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderAvatar: currentUser.avatar,
      type: params.type,
      title: params.title,
      message: params.message,
      resourceId: params.resourceId,
      read: false,
      createdAt: new Date().toISOString()
    };
    setCommunityNotifications((prev) => [notif, ...prev]);
    syncCommunityNotificationToDB(notif);
  };

  const handleDeleteCommunityNotification = (notificationId: string) => {
    setCommunityNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    deleteCommunityNotificationFromDB(notificationId);
  };

  const handleSendDistrictGroupMessage = (msg: { message: string; replyToId?: string }) => {
    const replyTarget = msg.replyToId ? districtGroupMessages.find((m) => m.id === msg.replyToId) : undefined;
    const newMsg: DistrictGroupMessage = {
      id: `dgm_${Date.now()}`,
      districtId: currentUser.districtId || 'dist_setif_7',
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderSchool: currentUser.schoolName,
      senderRole: currentUser.role,
      message: msg.message,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            senderName: replyTarget.senderName,
            message: replyTarget.message
          }
        : undefined
    };
    setDistrictGroupMessages((prev) => [...prev, newMsg]);
    syncDistrictMessageToDB(newMsg);
  };

  const handleSendDirectMessageFromChat = (receiverId: string, receiverName: string, messageText: string) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: currentUser.role,
      receiverId: receiverId,
      receiverName: receiverName,
      districtId: currentUser.districtId || 'dist_setif_7',
      message: messageText,
      createdAt: new Date().toISOString(),
      read: true
    };
    setDirectMessages((prev) => [...prev, newMsg]);
    // كانت رسائل دردشة المقاطعة تبقى محلية فقط وتضيع عند التحديث — نزامنها مثل رسائل المجتمع
    syncDirectMessageToDB(newMsg);
  };

  const handleToggleLikeResource = (resourceId: string) => {
    setCommunityResources((prev) =>
      prev.map((res) => {
        if (res.id !== resourceId) return res;
        const likedByUserIds = res.likedByUserIds || [];
        const alreadyLiked = likedByUserIds.includes(currentUser.id);
        const updated = {
          ...res,
          likedByUserIds: alreadyLiked
            ? likedByUserIds.filter((id) => id !== currentUser.id)
            : [...likedByUserIds, currentUser.id],
          likesCount: Math.max(0, res.likesCount + (alreadyLiked ? -1 : 1))
        };
        syncCommunityResourceToDB(updated);

        // Notify the resource's author on a NEW like only (not on unlike)
        if (!alreadyLiked) {
          const authorUser = allUsersList.find((u) => u.spexId === res.spexId);
          if (authorUser) {
            createCommunityNotification({
              userId: authorUser.id,
              type: 'like',
              title: 'إعجاب جديد بمنشورك',
              message: `أعجب ${currentUser.firstName} ${currentUser.lastName} بمنشورك "${res.title}"`,
              resourceId: res.id
            });
          }
        }
        return updated;
      })
    );
  };

  const handleToggleFollowTeacher = (targetTeacherId: string) => {
    const targetUser = allUsersList.find((u) => u.id === targetTeacherId);
    if (!targetUser) return;

    if (targetUser.districtId !== currentUser.districtId) {
      alert(`عفواً: الأستاذ ${targetUser.firstName} ${targetUser.lastName} يتبع لمقاطعة أُخرى. يشترط نظام SPEX التواجد بنفس المقاطعة التفتيشية!`);
      return;
    }

    const currentFollowing = currentUser.followingIds || [];
    const isFollowing = currentFollowing.includes(targetTeacherId);

    const updatedFollowing = isFollowing
      ? currentFollowing.filter((id) => id !== targetTeacherId)
      : [...currentFollowing, targetTeacherId];

    const updatedUser = { ...currentUser, followingIds: updatedFollowing };
    setCurrentUser(updatedUser);
    setAllUsersList((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

    // Notify the target teacher when they gain a NEW follower (not on unfollow)
    if (!isFollowing) {
      createCommunityNotification({
        userId: targetTeacherId,
        type: 'new_follower',
        title: 'متابع جديد',
        message: `بدأ ${currentUser.firstName} ${currentUser.lastName} بمتابعتك`
      });
    }
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
    if (authView === 'landing') {
      return <LandingScreen onGoToLogin={() => setAuthView('login')} />;
    }
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={() => setAuthView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <Header
        currentUser={currentUser}
        allUsers={allUsersList}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onSearchQuery={() => {}}
        notificationsCount={inspectorNotes.length + dailyNotebook.filter((n) => n.status !== 'منجزة').length}
        dailyNotebookEntries={dailyNotebook}
        onUpdateNotebookStatus={handleUpdateNotebookStatus}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        activeLessonSession={activeLessonSession}
        onOpenCommandCenter={() => setCurrentTab('lesson_command_center')}
        searchStudents={allStudents}
        searchLessonPlans={lessonPlans}
        searchKnowledgeItems={knowledgeItems}
        onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(t) => {
            setCurrentTab(t);
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
          {activeTab === 'dashboard' && (
            <TeacherDashboard
              user={currentUser}
              dailyNotebook={dailyNotebook}
              lessonPlans={lessonPlans}
              inspectorNotes={inspectorNotes}
              onNavigateTab={(t) => setCurrentTab(t)}
              onOpenAIGenerator={() => setCurrentTab('lesson_plans')}
              onUpdateNotebookStatus={handleUpdateNotebookStatus}
            />
          )}

          {activeTab === 'annual_plan' && (
            <AnnualPlanView onNavigateToAnnualSchedule={() => setCurrentTab('annual_schedule')} />
          )}

          {activeTab === 'annual_schedule' && (
            <AnnualScheduleView onNavigateToAnnualPlan={() => setCurrentTab('annual_plan')} />
          )}

          {activeTab === 'weekly_schedule' && (
            <WeeklyScheduleView
              scheduleSlots={weeklySchedule}
              onAddSlot={handleAddWeeklySlot}
              onDeleteSlot={handleDeleteWeeklySlot}
              teacherName={`${currentUser.firstName} ${currentUser.lastName}`}
              schoolName={currentUser.schoolName || 'المدرسة الابتدائية'}
              teacherClasses={teacherClasses}
            />
          )}

          {activeTab === 'learning_segments' && <LearningSegmentsView />}

          {activeTab === 'daily_notebook' && (
            <DailyNotebookView
              notebookEntries={dailyNotebook}
              lessonPlans={lessonPlans}
              onUpdateStatus={handleUpdateNotebookStatus}
              onOpenLessonPlan={(id) => handleOpenLessonPlan(id)}
              onOpenAIGeneratorForSession={() => setCurrentTab('lesson_plans')}
            />
          )}

          {activeTab === 'lesson_plans' && (
            <LessonPlanView
              lessonPlans={lessonPlans}
              activeLessonId={activeLessonPlanId}
              currentUser={currentUser}
              onSaveLessonPlan={handleSaveLessonPlan}
              onDeleteLessonPlan={handleDeleteLessonPlan}
              onUpdateLessonStatus={handleUpdateLessonStatus}
              onOpenCommandCenterForPlan={handleLaunchCommandCenterForPlan}
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
              onUpdateTimingSettings={(st) => setLessonTimingSettings(st)}
              onNavigateToLessonPlans={() => setCurrentTab('lesson_plans')}
              onAddNotebookEntry={handleAddNotebookEntry}
            />
          )}

          {activeTab === 'knowledge_engine' && (
            <KnowledgeEngineView
              knowledgeItems={knowledgeItems}
              onAddKnowledgeItem={handleAddKnowledgeItem}
            />
          )}

          {activeTab === 'competency_assessment' && (
            <CompetencyAssessmentView
              assessmentSessions={assessmentSessions}
              onSaveAssessmentSession={(s) => setAssessmentSessions((prev) => [s, ...prev])}
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

          {activeTab === 'professional_community' && (
            <ProfessionalCommunityView
              currentUser={currentUser}
              onUpdateCurrentUser={(upUser) => {
                setCurrentUser(upUser);
                setAllUsersList((prev) => prev.map((u) => (u.id === upUser.id ? upUser : u)));
              }}
              allUsersList={allUsersList}
              onUpdateAllUsers={(users) => setAllUsersList(users)}
              communityResources={communityResources}
              onAddCommunityResource={(res) => {
                setCommunityResources((prev) => [res, ...prev]);
                syncCommunityResourceToDB(res);

                // Notify the author's followers that a new resource was shared
                const followerIds = currentUser.followersIds || [];
                followerIds.forEach((followerId) => {
                  createCommunityNotification({
                    userId: followerId,
                    type: 'resource_shared',
                    title: 'منشور جديد ممن تتابعه',
                    message: `نشر ${currentUser.firstName} ${currentUser.lastName} مورداً جديداً: "${res.title}"`,
                    resourceId: res.id
                  });
                });
              }}
              onToggleLikeResource={handleToggleLikeResource}
              onSaveToPersonalLibrary={(item) => {
                setPersonalLibraryItems((prev) => [item, ...prev]);
              }}
              personalLibraryItems={personalLibraryItems}
              directMessages={directMessages as any}
              onSendDirectMessage={(msg) => {
                setDirectMessages((prev: any) => [...prev, msg]);
                syncDirectMessageToDB(msg);

                // Notify the receiver of the new direct message
                createCommunityNotification({
                  userId: msg.receiverId,
                  type: 'new_message',
                  title: 'رسالة جديدة',
                  message: `${currentUser.firstName} ${currentUser.lastName}: ${msg.message.slice(0, 80)}`
                });
              }}
              notifications={communityNotifications}
              onMarkNotificationRead={(notifId) => {
                setCommunityNotifications((prev) =>
                  prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
                );
              }}
              onDeleteNotification={handleDeleteCommunityNotification}
              onNotifyNewFollower={(targetUserId) => {
                createCommunityNotification({
                  userId: targetUserId,
                  type: 'new_follower',
                  title: 'متابع جديد',
                  message: `بدأ ${currentUser.firstName} ${currentUser.lastName} بمتابعتك`
                });
              }}
              lessonPlans={lessonPlans}
              knowledgeItems={knowledgeItems}
            />
          )}

          {activeTab === 'district_chat' && (
            <DistrictChatView
              currentUser={currentUser}
              allUsers={allUsersList}
              districts={INITIAL_DIRECTORATES[0].districts || []}
              groupMessages={districtGroupMessages}
              directMessages={directMessages}
              onSendGroupMessage={handleSendDistrictGroupMessage}
              onSendDirectMessage={handleSendDirectMessageFromChat}
              onToggleFollowTeacher={handleToggleFollowTeacher}
            />
          )}

          {activeTab === 'inspector_portal' && (
            <InspectorDashboard
              inspector={currentUser.role === 'inspector' ? currentUser : allUsersList.find((u) => u.role === 'inspector') || DEMO_USERS.find((u) => u.role === 'inspector') || DEMO_USERS[0]}
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
              onAddNote={handleAddInspectorNote}
              onAddVisit={handleAddInspectionVisit}
              onAddBroadcast={(bc) => setBroadcasts((prev) => [bc as any, ...prev])}
              onAddDirectMessage={(msg) => {
                const newMsg = {
                  id: `msg_${Date.now()}`,
                  senderId: currentUser.id,
                  senderName: `${currentUser.firstName} ${currentUser.lastName}`,
                  senderRole: currentUser.role,
                  receiverId: msg.receiverId,
                  receiverName: msg.receiverName,
                  districtId: currentUser.districtId || 'dist_setif_7',
                  message: msg.message,
                  createdAt: new Date().toISOString(),
                  read: true
                };
                setDirectMessages((prev) => [...prev, newMsg]);
                // مزامنة مثل باقي قنوات المراسلة حتى لا تضيع رسائل المفتش عند التحديث
                syncDirectMessageToDB(newMsg);
              }}
            />
          )}

          {activeTab === 'director_portal' && (
            <DirectorDashboard
              director={currentUser.role === 'director' ? currentUser : allUsersList.find((u) => u.role === 'director') || currentUser}
              teachers={allUsersList.filter((u) => u.role === 'teacher' && u.institutionId === currentUser.institutionId)}
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
            <ReportsView user={currentUser} lessonPlans={lessonPlans} inspectorNotes={inspectorNotes} />
          )}

          {activeTab === 'settings' && (
            <SettingsView currentUser={currentUser} onUpdateUser={handleUpdateUser} />
          )}
        </main>
      </div>

      {/* Floating Lesson Command Center Overlay */}
      {lessonTimingSettings.floatingOverlayEnabled && (
        <FloatingLessonOverlay
          session={activeLessonSession}
          timingSettings={lessonTimingSettings}
          onPauseResume={() =>
            handleUpdateLessonSession({ isPaused: !activeLessonSession?.isPaused })
          }
          onNextPhase={() => {
            if (!activeLessonSession) return;
            const PHASES_ORDER: Array<'preparation' | 'situation1' | 'situation2' | 'final'> = [
              'preparation',
              'situation1',
              'situation2',
              'final'
            ];
            const currIdx = PHASES_ORDER.indexOf(activeLessonSession.currentPhase);
            if (currIdx < PHASES_ORDER.length - 1) {
              const nextPhase = PHASES_ORDER[currIdx + 1];
              const nextSecs = activeLessonSession.phaseDurations[nextPhase] || 1200;
              handleUpdateLessonSession({
                currentPhase: nextPhase,
                phaseRemainingSeconds: nextSecs,
                isPaused: false
              });
            } else {
              handleEndLessonSession();
            }
          }}
          onEndSession={() => handleEndLessonSession()}
          onOpenFullCommandCenter={() => setCurrentTab('lesson_command_center')}
          onToggleSound={() =>
            setLessonTimingSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
          }
        />
      )}

      {/* Floating AI Pedagogical Assistant Drawer */}
      <AIAssistantDrawer isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />
    </div>
  );
}
