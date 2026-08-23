/**
 * SPEX - Platform Data Store Hook
 * Owns all application domain state (users, classes, students, lesson plans,
 * daily notebook, community, command center, inspector/admin data) together with
 * localStorage persistence, platform-DB sync effects and the full set of
 * data-mutation handlers. App.tsx consumes this hook as a thin orchestrator.
 */

import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { NavTab } from '../components/layout/Sidebar';
import {
  syncUserToDB,
  deleteUserFromDB,
  syncUsersBatchToDB,
  fetchUsersFromDB,
  syncLessonPlanToDB,
  syncLessonPlansBatchToDB,
  fetchLessonPlansFromDB,
  deleteLessonPlanFromDB,
  syncNotebookEntryToDB,
  syncNotebookBatchToDB,
  deleteNotebookEntryFromDB,
  syncInspectorNoteToDB,
  syncInspectionVisitToDB,
  fetchTeacherInspectionFeed,
  fetchMyAssignedTeachers,
  syncDistrictMessageToDB,
  fetchDistrictMessagesFromDB,
  syncCommunityResourceToDB,
  syncCommunityNotificationToDB,
  deleteCommunityNotificationFromDB,
  syncDirectMessageToDB,
  fetchDirectMessagesFromDB,
  fetchCurrentSession,
  fetchPedagogicalGames,
  createPedagogicalGame,
  updatePedagogicalGame,
  submitPedagogicalGame,
  deletePedagogicalGame,
  approvePedagogicalGame,
  rejectPedagogicalGame,
  fetchStudentRoster,
} from '../services/api';
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
  DistrictBroadcast,
  DirectChatMessage,
  CommunityChatMessage,
  LessonSessionTiming,
  LessonSession,
  LessonExecutionLog,
  CommunityResource,
  CommunityNotification,
  PersonalLibraryItem,
} from '../types/spex';
import {
  INITIAL_AI_SETTINGS,
  INITIAL_BROADCASTS,
} from '../data/initialState';
import { INITIAL_KNOWLEDGE_BANK } from '../data/knowledgeBankData';

const LEGACY_DEMO_USER_IDS = new Set(['usr_admin_1', 'usr_teacher_1', 'usr_inspector_1']);

interface PlatformStoreParams {
  currentUser: User;
  setCurrentUser: Dispatch<SetStateAction<User>>;
  isAuthenticated: boolean;
  setCurrentTab: (tab: NavTab) => void;
}

export function usePlatformStore({
  currentUser,
  setCurrentUser,
  isAuthenticated,
  setCurrentTab,
}: PlatformStoreParams) {
  // App domain state with persistent LocalStorage backup
  const [allUsersList, setAllUsersList] = useState<User[]>(() => {
    const saved = localStorage.getItem('spex_all_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((u) => !LEGACY_DEMO_USER_IDS.has(u.id)) : [];
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  // User-scoped Data Initialization & State Management
  const [teacherClasses, setTeacherClasses] = useState<ClassRoom[]>(() => {
    if (!currentUser?.id) return [];
    const saved =
      localStorage.getItem(`spex_teacher_classes_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [allStudents, setAllStudents] = useState<Student[]>(() => {
    if (!currentUser?.id) return [];
    const saved =
      localStorage.getItem(`spex_all_students_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [dailyNotebook, setDailyNotebook] = useState<DailyNotebookEntry[]>(() => {
    if (!currentUser?.id) return [];
    const saved =
      localStorage.getItem(`spex_daily_notebook_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleSlot[]>(() => {
    const saved = localStorage.getItem('spex_weekly_schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>(() => {
    if (!currentUser?.id) return [];
    const saved =
      localStorage.getItem(`spex_lesson_plans_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => {
    return INITIAL_KNOWLEDGE_BANK;
  });

  const refreshStudentRoster = async () => {
    const roster = await fetchStudentRoster();
    setTeacherClasses(roster.classes as ClassRoom[]);
    setAllStudents(roster.students as Student[]);
    return roster;
  };

  useEffect(() => {
    let active = true;
    const loadGames = async () => {
      try {
        const scopes: Array<'public' | 'mine' | 'pending'> =
          currentUser.role === 'teacher' ? ['public', 'mine'] : ['public', 'pending'];
        const rows = (
          await Promise.all(scopes.map((scope) => fetchPedagogicalGames(scope)))
        ).flat() as KnowledgeItem[];
        if (!active) return;
        const dynamic = rows.map((game) => ({
          ...game,
          category: 'game' as const,
          approved: game.status === 'APPROVED' && game.approved,
          approvalStatus:
            game.status === 'PENDING_APPROVAL'
              ? ('PENDING_APPROVAL' as const)
              : (game.status as KnowledgeItem['approvalStatus']),
          tags: game.tags || ['اقتراح لعبة تربوية'],
          usageCount: game.usageCount || 0,
          rating: game.rating || 0,
          createdBy: game.createdBy || 'اقتراح',
        }));
        setKnowledgeItems((prev) => [
          ...prev.filter((item) => item.origin !== 'AI_GENERATED' && !item.ownerId),
          ...dynamic,
        ]);
      } catch {
        // Offline mode keeps static reference content available; dynamic records remain server-authoritative.
      }
    };
    void loadGames();
    return () => {
      active = false;
    };
  }, [currentUser.id, currentUser.role]);

  const [inspectorNotes, setInspectorNotes] = useState<InspectorNote[]>(() => {
    if (!currentUser?.id) return [];
    const saved =
      localStorage.getItem(`spex_inspector_notes_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [inspectionVisits, setInspectionVisits] = useState<InspectionVisit[]>(() => {
    if (!currentUser?.id) return [];
    return [];
  });

  const [teacherInspectorFeed, setTeacherInspectorFeed] = useState<{
    inspector: { id: string; displayName: string } | null;
    guidance: InspectorNote[];
    visits: InspectionVisit[];
  }>({ inspector: null, guidance: [], visits: [] });
  const [assignedTeachers, setAssignedTeachers] = useState<User[]>([]);

  const refreshAssignedTeachers = async () => {
    if (currentUser.role !== 'inspector') return;
    try {
      const rows = await fetchMyAssignedTeachers();
      setAssignedTeachers(rows || []);
    } catch {
      setAssignedTeachers([]);
    }
  };

  useEffect(() => {
    let active = true;
    if (currentUser.role === 'teacher') {
      void fetchTeacherInspectionFeed().then((feed) => {
        if (active) setTeacherInspectorFeed({ inspector: feed.inspector || null, guidance: feed.guidance || [], visits: feed.visits || [] });
      }).catch(() => {
        if (active) setTeacherInspectorFeed({ inspector: null, guidance: [], visits: [] });
      });
    } else {
      setTeacherInspectorFeed({ inspector: null, guidance: [], visits: [] });
    }
    if (currentUser.role === 'inspector') {
      void fetchMyAssignedTeachers().then((rows) => { if (active) setAssignedTeachers(rows || []); }).catch(() => { if (active) setAssignedTeachers([]); });
    } else {
      setAssignedTeachers([]);
    }
    return () => { active = false; };
  }, [currentUser.id, currentUser.role]);

  const [assessmentSessions, setAssessmentSessions] = useState<CompetencyAssessmentSession[]>(
    () => {
      if (!currentUser?.id) return [];
      return [];
    }
  );

  const [broadcasts, setBroadcasts] = useState<DistrictBroadcast[]>(INITIAL_BROADCASTS);
  const [directMessages, setDirectMessages] = useState<DirectChatMessage[]>(() => {
    if (currentUser?.id) {
      const savedUser = localStorage.getItem(`spex_direct_messages_${currentUser.id}`);
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          void e;
        }
      }
    }
    return [];
  });

  const [communityResources, setCommunityResources] = useState<CommunityResource[]>(() => {
    const saved = localStorage.getItem('spex_community_resources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [communityNotifications, setCommunityNotifications] = useState<CommunityNotification[]>(
    () => {
      const saved = localStorage.getItem('spex_community_notifications');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          void e;
        }
      }
      return [];
    }
  );

  const [personalLibraryItems, setPersonalLibraryItems] = useState<PersonalLibraryItem[]>(() => {
    const saved = localStorage.getItem('spex_personal_library');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [districtGroupMessages, setDistrictGroupMessages] = useState<DistrictGroupMessage[]>(() => {
    const saved = localStorage.getItem('spex_district_group_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [aiSettings, setAiSettings] = useState<AISetting>(INITIAL_AI_SETTINGS);
  const [aiLogs] = useState<AILog[]>([]);

  // Lesson Command Center Domain State & Persistent Settings
  const [lessonTimingSettings, setLessonTimingSettings] = useState<LessonSessionTiming>(() => {
    const saved = localStorage.getItem('spex_lesson_timing_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
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
      voiceAnnouncements: true,
      autoLogToNotebook: true,
    };
  });

  const [activeLessonSession, setActiveLessonSession] = useState<LessonSession | null>(() => {
    const saved = localStorage.getItem('spex_active_lesson_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return null;
  });

  const [lessonExecutionLogs, setLessonExecutionLogs] = useState<LessonExecutionLog[]>(() => {
    const saved = localStorage.getItem('spex_lesson_execution_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        void e;
      }
    }
    return [];
  });

  const [activeLessonPlanId, setActiveLessonPlanId] = useState<string | undefined>(undefined);

  // Ticker Interval effect for live session countdown
  useEffect(() => {
    if (
      !activeLessonSession ||
      activeLessonSession.status !== 'in_progress' ||
      activeLessonSession.isPaused
    ) {
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
          [currentPhase]: (prev.actualPhaseSpent[currentPhase] || 0) + 1,
        };

        if (remaining <= 0) {
          // Automatic Phase Transition
          const PHASES_ORDER: Array<'preparation' | 'situation1' | 'situation2' | 'final'> = [
            'preparation',
            'situation1',
            'situation2',
            'final',
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
              actualPhaseSpent: phaseSpent,
            };
          } else {
            // Reached end of final phase
            return {
              ...prev,
              status: 'completed',
              phaseRemainingSeconds: 0,
              totalElapsedSeconds: totalElapsed,
              actualPhaseSpent: phaseSpent,
            };
          }
        }

        return {
          ...prev,
          phaseRemainingSeconds: remaining,
          totalElapsedSeconds: totalElapsed,
          actualPhaseSpent: phaseSpent,
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

  // Initial Database Load Effect from Platform Server DB
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadDBData() {
      try {
        await refreshStudentRoster();
        const dbUsers = await fetchUsersFromDB();
        if (dbUsers && dbUsers.length > 0) {
          setAllUsersList((prev) => {
            const map = new Map();
            prev.forEach((u) => map.set(u.id, u));
            dbUsers.filter((u: any) => !LEGACY_DEMO_USER_IDS.has(u.id)).forEach((u: any) => map.set(u.id, u));
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

        const dbDirectMsgs = await fetchDirectMessagesFromDB();
        if (dbDirectMsgs && dbDirectMsgs.length > 0) {
          setDirectMessages((prev) => {
            const map = new Map();
            prev.forEach((m) => map.set(m.id, m));
            dbDirectMsgs.forEach((m: any) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Initial DB load error:', e);
      }
    }

    loadDBData();
  }, [isAuthenticated]);

  // Real-time chat polling & cross-tab sync
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncDirectMessages = async () => {
      try {
        const dbDirectMsgs = await fetchDirectMessagesFromDB();
        if (dbDirectMsgs && dbDirectMsgs.length > 0) {
          setDirectMessages((prev) => {
            const map = new Map();
            prev.forEach((m) => map.set(m.id, m));
            dbDirectMsgs.forEach((m: any) => map.set(m.id, m));
            if (map.size === prev.length) return prev;
            return Array.from(map.values());
          });
        }
      } catch (e) {
        void e;
      }
    };

    const interval = setInterval(syncDirectMessages, 2500);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spex_direct_messages_shared' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDirectMessages(parsed);
        } catch (err) {
          void err;
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated]);

  // Auto-Save effects to LocalStorage and Platform DB for full persistence

  useEffect(() => {
    if (currentUser && isAuthenticated) {
      localStorage.setItem('spex_current_user', JSON.stringify(currentUser));
      syncUserToDB(currentUser);
    }
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    if (directMessages.length > 0) {
      localStorage.setItem('spex_direct_messages_shared', JSON.stringify(directMessages));
      if (currentUser?.id) {
        localStorage.setItem(
          `spex_direct_messages_${currentUser.id}`,
          JSON.stringify(directMessages)
        );
      }
    }
  }, [directMessages, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('spex_district_group_messages', JSON.stringify(districtGroupMessages));
  }, [districtGroupMessages]);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`spex_daily_notebook_${currentUser.id}`, JSON.stringify(dailyNotebook));
      if (dailyNotebook.length > 0) {
        syncNotebookBatchToDB(dailyNotebook);
      }
    }
  }, [dailyNotebook, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('spex_weekly_schedule', JSON.stringify(weeklySchedule));
  }, [weeklySchedule]);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`spex_lesson_plans_${currentUser.id}`, JSON.stringify(lessonPlans));
      if (lessonPlans.length > 0) {
        syncLessonPlansBatchToDB(lessonPlans);
      }
    }
  }, [lessonPlans, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(
        `spex_teacher_classes_${currentUser.id}`,
        JSON.stringify(teacherClasses)
      );
    }
  }, [teacherClasses, currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`spex_all_students_${currentUser.id}`, JSON.stringify(allStudents));
    }
  }, [allStudents, currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('spex_all_users', JSON.stringify(allUsersList));
    if (allUsersList.length > 0) {
      syncUsersBatchToDB(allUsersList);
    }
  }, [allUsersList]);

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(
        `spex_inspector_notes_${currentUser.id}`,
        JSON.stringify(inspectorNotes)
      );
    }
  }, [inspectorNotes, currentUser?.id]);

  // Handlers for Lesson Command Center
  const handleStartLessonSession = (sessionData: Omit<LessonSession, 'id'>) => {
    const newSession: LessonSession = {
      ...sessionData,
      id: `sess_${Date.now()}`,
    };
    setActiveLessonSession(newSession);
  };

  const handleLaunchCommandCenterForPlan = (plan: LessonPlan) => {
    setActiveLessonPlanId(plan.id);
    const targetClass = teacherClasses.find((c) => c.levelName === plan.levelName) ||
      teacherClasses[0] || { id: 'c1', name: plan.className, levelName: plan.levelName };

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
      preparationObjective:
        plan.warmupPhase?.pedagogicalWarmupGame?.title ||
        'الإحماء العام والخاص وتجهيز التلاميذ بدﻧياً ونفسياً',
      educationalObjective:
        plan.generalObjective ||
        plan.mainPhase?.learningSituation1?.description ||
        'تطوير المهارات الحركية والتوافق البدني',
      situation1Description:
        plan.mainPhase?.learningSituation1?.description ||
        'بناء التعلمات والتطبيق الحركي الفردي والجماعي',
      situation2Title: plan.mainPhase?.learningSituation2?.title || 'الوضعية المشكلة والتنافس',
      situation2Description:
        plan.mainPhase?.learningSituation2?.description ||
        'المنافسة المصغرة واللعب الموجه وفق القوانين',
      finalObjective:
        plan.coolDownPhase?.assessmentAndDialogue || 'العودة للهدوء وتفقد العتاد والتقويم الختامي',
      phaseDurations: {
        preparation: lessonTimingSettings.preparationMinutes * 60,
        situation1: lessonTimingSettings.situation1Minutes * 60,
        situation2: lessonTimingSettings.situation2Minutes * 60,
        final: lessonTimingSettings.finalMinutes * 60,
      },
      actualPhaseSpent: {
        preparation: 0,
        situation1: 0,
        situation2: 0,
        final: 0,
      },
      startedAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      isPaused: false,
      contingencyMode: 'normal',
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
      id: `notebook_${Date.now()}`,
    };
    setDailyNotebook((prev) => [newEntry, ...prev]);
    syncNotebookEntryToDB(newEntry);
  };

  const handleAddClass = (newClassData: {
    name: string;
    levelId: string;
    studentCount: number;
    municipality?: string;
    schoolName?: string;
  }) => {
    const newClassId = `cls_${Date.now()}`;
    const newClass: ClassRoom = {
      id: newClassId,
      institutionId: currentUser?.institutionId || 'inst_ainazel_1',
      teacherId: currentUser?.id || '',
      levelId: newClassData.levelId,
      name: newClassData.name,
      studentCount: 0,
    };

    setTeacherClasses((prev) => [...prev, newClass]);
    return newClassId;
  };

  const handleDeleteClass = (classId: string) => {
    setTeacherClasses((prev) => prev.filter((c) => c.id !== classId));
    setAllStudents((prev) => prev.filter((s) => s.classId !== classId));
  };

  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    setAllStudents((prev) => [...prev, newStudent]);
  };

  const handleDeleteStudent = (studentId: string) => {
    setAllStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleDeleteLessonPlan = (lessonId: string) => {
    setLessonPlans((prev) => prev.filter((l) => l.id !== lessonId));
    deleteLessonPlanFromDB(lessonId);
  };

  const handleDeleteNotebookEntry = (entryId: string) => {
    setDailyNotebook((prev) => prev.filter((e) => e.id !== entryId));
    deleteNotebookEntryFromDB(entryId);
  };

  // User Management Handlers for Admin
  const handleAddUser = async (userPartial: Partial<User>) => {
    if (!userPartial.firstName?.trim() || !userPartial.lastName?.trim() || !userPartial.email?.trim() || !userPartial.password) {
      window.alert('يرجى إدخال الاسم واللقب والبريد وكلمة المرور قبل إنشاء الحساب.');
      return;
    }
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: userPartial.username || `user_${Math.floor(1000 + Math.random() * 9000)}`,
      spexId: userPartial.spexId || `SPX-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: userPartial.firstName.trim(),
      lastName: userPartial.lastName.trim(),
      email: userPartial.email.trim(),
      // بدون كلمة مرور ضمنية: الخادم يرفض إنشاء حساب بلا كلمة مرور أولية ويعيد خطأ واضحاً
      // (يظهره التنبيه الموجود في هذا المعالج) بدل ضبط كلمة افتراضية لا يعلمها أحد
      password: userPartial.password || '',
      role: userPartial.role || 'teacher',
      phone: userPartial.phone?.trim() || undefined,
      schoolName: userPartial.role === 'inspector' ? undefined : userPartial.schoolName?.trim() || undefined,
      municipality: userPartial.role === 'inspector' ? undefined : userPartial.municipality?.trim() || undefined,
      directorateId: userPartial.directorateId || '',
      districtId: userPartial.role === 'inspector' ? userPartial.districtId || '' : '',
      institutionId: userPartial.role === 'inspector' ? undefined : userPartial.institutionId || undefined,
      specialization: userPartial.specialization?.trim() || undefined,
      yearsExperience: userPartial.yearsExperience,
      status: userPartial.status || 'active',
      customApiKey: userPartial.customApiKey || '',
      apiKeyStatus: userPartial.customApiKey ? 'active' : 'not_set',
      isApprovedByAdmin: true,
    };
    // نرسل كلمة المرور للخادم ليشفّرها فوراً، ثم نستبدل الحالة المحلية بالنسخة الآمنة
    // المُعادة من الخادم بدل الاحتفاظ بكلمة المرور نص عادي في ذاكرة المتصفح
    const result = await syncUserToDB(newUser);
    if (!result.success || !result.user) {
      console.warn('DB user create failed:', result.error);
      window.alert(result.error || 'تعذر إنشاء الحساب على الخادم.');
      return;
    }
    setAllUsersList((prev) => [result.user, ...prev]);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const result = await syncUserToDB(updatedUser);
    if (!result.success || !result.user) {
      // لا نحدّث الحالة المحلية — فالتفعيل/التعديل لم يُحفظ فعلاً على الخادم
      console.warn('DB user update failed:', result.error);
      window.alert(result.error || 'تعذر حفظ التغييرات على الخادم.');
      return;
    }
    const finalUser = result.user;
    setAllUsersList((prev) => prev.map((u) => (u.id === finalUser.id ? finalUser : u)));
    if (currentUser.id === finalUser.id) {
      setCurrentUser(finalUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setAllUsersList((prev) => prev.filter((u) => u.id !== userId));
    deleteUserFromDB(userId);
  };

  // Weekly schedule handlers
  const handleAddWeeklySlot = (slotData: Omit<WeeklyScheduleSlot, 'id'>) => {
    const newSlot: WeeklyScheduleSlot = {
      ...slotData,
      id: `ws_${Date.now()}`,
    };
    setWeeklySchedule((prev) => [...prev, newSlot]);
  };

  const handleDeleteWeeklySlot = (slotId: string) => {
    setWeeklySchedule((prev) => prev.filter((s) => s.id !== slotId));
  };

  const handleUpdateNotebookStatus = (
    entryId: string,
    status: 'منجزة' | 'مؤجلة' | 'غير منجزة',
    note?: string
  ) => {
    setDailyNotebook((prev) =>
      prev.map((item) =>
        item.id === entryId ? { ...item, status, note: note ?? item.note } : item
      )
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
        (e) =>
          e.lessonPlanId === lessonId ||
          e.sessionId === targetLP.id ||
          (e.className.includes(targetLP.levelName) && e.segmentId === targetLP.segmentTitle)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status,
          note:
            note ||
            updated[existingIndex].note ||
            `حالة الحصة المحدثة تلقائياً من المذكرة: ${status}`,
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
          note: note || `تسجيل تلقائي في الكراس اليومي من مذكرة الحصة: ${targetLP.sessionTitle}`,
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
      origin: newItem.origin || 'TEACHER',
      approvalStatus: newItem.approvalStatus || (newItem.approved ? 'APPROVED' : 'DRAFT'),
      ownerId: currentUser.id,
      fieldId: newItem.fieldId,
      fieldName: newItem.fieldName,
      levelName: newItem.levelName || 'جميع المستويات',
      levelIds: newItem.levelIds,
      tags: newItem.tags || ['رياضة'],
      equipment: newItem.equipment || [],
      rules: newItem.rules || '',
      duration: newItem.duration || '10 دقائق',
      approved: newItem.approved ?? false,
      createdBy: newItem.createdBy || currentUser.firstName,
      usageCount: newItem.usageCount || 0,
      rating: newItem.rating || 0,
    };
    setKnowledgeItems((prev) => [item, ...prev]);
    if (item.category === 'game' && item.approvalStatus === 'DRAFT')
      void createPedagogicalGame({ ...item, id: item.id }).catch(() => undefined);
  };

  const handleUpdateKnowledgeItem = (id: string, patch: Partial<KnowledgeItem>) => {
    setKnowledgeItems((prev) =>
      prev.map((item) =>
        item.id === id &&
        item.ownerId === currentUser.id &&
        (item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED')
          ? {
              ...item,
              ...patch,
              ownerId: item.ownerId,
              approved: false,
              approvalStatus: item.approvalStatus,
            }
          : item
      )
    );
    const existing = knowledgeItems.find((item) => item.id === id);
    if (existing) void updatePedagogicalGame(id, { ...existing, ...patch }).catch(() => undefined);
  };

  const handleSubmitKnowledgeItem = (id: string) => {
    setKnowledgeItems((prev) =>
      prev.map((item) =>
        item.id === id &&
        item.ownerId === currentUser.id &&
        (item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED')
          ? {
              ...item,
              approvalStatus: 'PENDING_APPROVAL' as const,
              approved: false,
              submittedAt: new Date().toISOString(),
            }
          : item
      )
    );
    void submitPedagogicalGame(id).catch(() => undefined);
  };

  const handleDeleteKnowledgeItem = (id: string) => {
    const existing = knowledgeItems.find((item) => item.id === id);
    if (
      !existing ||
      existing.ownerId !== currentUser.id ||
      (existing.approvalStatus !== 'DRAFT' && existing.approvalStatus !== 'REJECTED')
    )
      return;
    setKnowledgeItems((prev) => prev.filter((item) => item.id !== id));
    void deletePedagogicalGame(id).catch(() => undefined);
  };

  const handleApproveKnowledgeItem = (id: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'inspector') return;
    setKnowledgeItems((prev) =>
      prev.map((k) =>
        k.id === id &&
        (k.approvalStatus === 'PENDING_APPROVAL' || k.approvalStatus === 'PENDING_REVIEW')
          ? {
              ...k,
              approved: true,
              approvalStatus: 'APPROVED' as const,
              reviewedById: currentUser.id,
            }
          : k
      )
    );
    void approvePedagogicalGame(id).catch(() => undefined);
  };

  const handleRejectKnowledgeItem = (id: string, rejectionReason: string) => {
    if (
      (currentUser.role !== 'admin' && currentUser.role !== 'inspector') ||
      !rejectionReason.trim()
    )
      return;
    setKnowledgeItems((prev) =>
      prev.map((item) =>
        item.id === id &&
        (item.approvalStatus === 'PENDING_APPROVAL' || item.approvalStatus === 'PENDING_REVIEW')
          ? {
              ...item,
              approved: false,
              approvalStatus: 'REJECTED' as const,
              rejectionReason: rejectionReason.trim(),
              reviewedById: currentUser.id,
            }
          : item
      )
    );
    void rejectPedagogicalGame(id, rejectionReason).catch(() => undefined);
  };

  const handleAddInspectorNote = (notePartial: Partial<InspectorNote>) => {
    const note: InspectorNote = {
      id: `note_${Date.now()}`,
      inspectorId: currentUser.id,
      inspectorName: `${currentUser.firstName} ${currentUser.lastName}`,
      teacherId: notePartial.teacherId || '',
      teacherName: notePartial.teacherName || 'أستاذ',
      moduleRef: notePartial.moduleRef || 'general',
      title: notePartial.title || 'توجيه بيداغوجي جديد',
      content: notePartial.content || '',
      priority: notePartial.priority || 'هام',
      status: 'جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInspectorNotes((prev) => [note, ...prev]);
    syncInspectorNoteToDB(note);
  };

  const handleAddInspectionVisit = (visitPartial: Partial<InspectionVisit>) => {
    const visit: InspectionVisit = {
      id: `visit_${Date.now()}`,
      inspectorId: currentUser.id,
      teacherId: visitPartial.teacherId || '',
      institutionId: visitPartial.institutionId || '',
      visitDate: visitPartial.visitDate || new Date().toISOString().split('T')[0],
      visitType: visitPartial.visitType || 'متابعة دورية',
      lessonObservedTitle: visitPartial.lessonObservedTitle || 'حصة بدنية',
      pedagogicalGrade: visitPartial.pedagogicalGrade || 16.0,
      positivePoints: visitPartial.positivePoints || [],
      areasForImprovement: visitPartial.areasForImprovement || [],
      recommendations: visitPartial.recommendations || [],
      officialReportGenerated: true,
    };
    setInspectionVisits((prev) => [visit, ...prev]);
    void syncInspectionVisitToDB(visit).catch(() => undefined);
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
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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
      createdAt: new Date().toISOString(),
    };
    setCommunityNotifications((prev) => [notif, ...prev]);
    syncCommunityNotificationToDB(notif);
  };

  const handleDeleteCommunityNotification = (notificationId: string) => {
    setCommunityNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    deleteCommunityNotificationFromDB(notificationId);
  };

  const handleSendDistrictGroupMessage = (msg: { message: string; replyToId?: string }) => {
    const replyTarget = msg.replyToId
      ? districtGroupMessages.find((m) => m.id === msg.replyToId)
      : undefined;
    const newMsg: DistrictGroupMessage = {
      id: `dgm_${Date.now()}`,
      districtId: currentUser.districtId || '',
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
            message: replyTarget.message,
          }
        : undefined,
    };
    setDistrictGroupMessages((prev) => [...prev, newMsg]);
    syncDistrictMessageToDB(newMsg);
  };

  const handleSendDirectMessageFromChat = (
    receiverId: string,
    receiverName: string,
    messageText: string
  ) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: currentUser.role,
      receiverId: receiverId,
      receiverName: receiverName,
      districtId: currentUser.districtId || '',
      message: messageText,
      createdAt: new Date().toISOString(),
      read: true,
    };
    setDirectMessages((prev) => [...prev, newMsg]);
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
          likesCount: Math.max(0, res.likesCount + (alreadyLiked ? -1 : 1)),
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
              resourceId: res.id,
            });
          }
        }
        return updated;
      })
    );
  };

  const handleToggleApproveResource = (resourceId: string) => {
    setCommunityResources((prev) =>
      prev.map((res) => {
        if (res.id !== resourceId) return res;
        const updated = {
          ...res,
          isApprovedByInspector: !res.isApprovedByInspector,
        };
        syncCommunityResourceToDB(updated);
        return updated;
      })
    );
  };

  const handleToggleFollowTeacher = (targetTeacherId: string) => {
    const targetUser = allUsersList.find((u) => u.id === targetTeacherId);
    if (!targetUser) return;

    if (targetUser.districtId !== currentUser.districtId) {
      alert(
        `عفواً: الأستاذ ${targetUser.firstName} ${targetUser.lastName} يتبع لمقاطعة أُخرى. يشترط نظام SPEX التواجد بنفس المقاطعة التفتيشية!`
      );
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
        message: `بدأ ${currentUser.firstName} ${currentUser.lastName} بمتابعتك`,
      });
    }
  };

  // Community orchestration handlers (moved from App.tsx JSX inline handlers)
  const handleUpdateCurrentUser = (upUser: User) => {
    setCurrentUser(upUser);
    setAllUsersList((prev) => prev.map((u) => (u.id === upUser.id ? upUser : u)));
  };

  const handleAddCommunityResource = (res: CommunityResource) => {
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
        resourceId: res.id,
      });
    });
  };

  const handleSaveToPersonalLibrary = (item: PersonalLibraryItem) => {
    setPersonalLibraryItems((prev) => [item, ...prev]);
  };

  const handleSendDirectMessage = (msg: CommunityChatMessage) => {
    setDirectMessages((prev) => [...prev, msg as unknown as DirectChatMessage]);
    syncDirectMessageToDB(msg);

    // Notify the receiver of the new direct message
    createCommunityNotification({
      userId: msg.receiverId,
      type: 'new_message',
      title: 'رسالة جديدة',
      message: `${currentUser.firstName} ${currentUser.lastName}: ${msg.message.slice(0, 80)}`,
    });
  };

  const handleMarkNotificationRead = (notificationId: string) => {
    setCommunityNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const handleNotifyNewFollower = (targetUserId: string) => {
    createCommunityNotification({
      userId: targetUserId,
      type: 'new_follower',
      title: 'متابع جديد',
      message: `بدأ ${currentUser.firstName} ${currentUser.lastName} بمتابعتك`,
    });
  };

  // Inspector orchestration handlers (moved from App.tsx JSX inline handlers)
  const handleAddBroadcast = (bc: Partial<DistrictBroadcast>) => {
    setBroadcasts((prev) => [bc as DistrictBroadcast, ...prev]);
  };

  const handleAddDirectMessageFromInspector = (msg: {
    receiverId: string;
    receiverName: string;
    message: string;
  }) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderRole: currentUser.role,
      receiverId: msg.receiverId,
      receiverName: msg.receiverName,
      districtId: currentUser.districtId || '',
      message: msg.message,
      createdAt: new Date().toISOString(),
      read: true,
    };
    setDirectMessages((prev) => [...prev, newMsg]);
  };

  // Command center / timing handlers
  const handleSaveAssessmentSession = (s: CompetencyAssessmentSession) => {
    setAssessmentSessions((prev) => [s, ...prev]);
  };

  const handleUpdateTimingSettings = (st: LessonSessionTiming) => {
    setLessonTimingSettings(st);
  };

  const handleToggleSound = () => {
    setLessonTimingSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Re-fetch the current session user from the server (used by pending-approval screen)
  const refreshSessionUser = async () => {
    const res = await fetchCurrentSession();
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setAllUsersList((prev) => prev.map((u) => (u.id === res.user.id ? res.user : u)));
    }
  };

  return {
    // State
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
    // Command center handlers
    handleStartLessonSession,
    handleLaunchCommandCenterForPlan,
    handleUpdateLessonSession,
    handleEndLessonSession,
    handleAddNotebookEntry,
    handleUpdateTimingSettings,
    handleToggleSound,
    // Teacher domain handlers
    handleAddClass,
    handleDeleteClass,
    handleAddStudent,
    refreshStudentRoster,
    handleDeleteStudent,
    handleDeleteLessonPlan,
    handleDeleteNotebookEntry,
    handleAddWeeklySlot,
    handleDeleteWeeklySlot,
    handleUpdateNotebookStatus,
    handleUpdateLessonStatus,
    handleSaveLessonPlan,
    handleSaveAssessmentSession,
    // Knowledge & Inspector handlers
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
    // Admin handlers
    handleAddUser,
    handleUpdateUser,
    handleDeleteUser,
    // Community handlers
    createCommunityNotification,
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
    // Navigation-adjacent handlers
    handleOpenLessonPlan,
    refreshSessionUser,
  };
}
