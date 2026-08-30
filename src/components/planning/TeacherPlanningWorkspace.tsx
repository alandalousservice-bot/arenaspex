import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { AnnualPlanView } from '../curriculum/AnnualPlanView';
import { LearningSegmentsView } from '../curriculum/LearningSegmentsView';
import { AnnualDistributionCalendar } from '../curriculum/AnnualDistributionCalendar';
import { AcademicCalendarView } from '../curriculum/AcademicCalendarView';
import { WeeklyTimetableView } from '../schedule/WeeklyTimetableView';
import {
  fetchTeacherPlanningSessions,
  fetchTeacherAnnualDistribution,
  initializeTeacherAnnualDistribution,
  updateTeacherAnnualDistributionSession,
  updateTeacherPlanningSession,
  TeacherPlanningSession,
  TeacherAnnualDistributionResponse,
} from '../../services/api';
import {
  formatAcademicYearLabel,
  getCurrentAcademicYear,
  getOperationalAcademicYearOptions,
  isOperationalAcademicYear,
  isPlanningStartDateConsistent,
} from '../../services/academicYear';
import { getAcademicCalendar } from '../../data/academicCalendars';
import {
  isValidPlanningDate,
  normalizePrimaryLevelId,
  PRIMARY_PLANNING_LEVEL_IDS,
} from '../../services/teacherPlanning.service';
import type { PrimaryLevelId } from '../../services/primaryLevel.service';
import type { ClassRoom, User } from '../../types/spex';
import type { PlanningSection } from '../../lib/routes';

interface TeacherPlanningWorkspaceProps {
  currentUser: User;
  classes: ClassRoom[];
  weeklySchedule: import('../../types/spex').WeeklyScheduleSlot[];
  onAddWeeklySlot: (slot: Omit<import('../../types/spex').WeeklyScheduleSlot, 'id'>) => void;
  onUpdateWeeklySlot: (slot: import('../../types/spex').WeeklyScheduleSlot) => void;
  onDeleteWeeklySlot: (slotId: string) => void;
}

const ACADEMIC_YEAR_PREFERENCE_KEY = 'arenaspex:selectedAcademicYear';
const sectionLabels: Record<PlanningSection, string> = {
  'annual-plan': 'المخطط السنوي',
  segments: 'المقاطع التعليمية',
  'annual-distribution': 'التوزيع السنوي',
  weekly: 'التوزيع الأسبوعي',
  calendar: 'رزنامة العطل والأعياد',
};

function localDate(value: string): string {
  return value.slice(0, 10);
}

export const TeacherPlanningWorkspace: React.FC<TeacherPlanningWorkspaceProps> = ({
  currentUser,
  classes,
  weeklySchedule,
  onAddWeeklySlot,
  onUpdateWeeklySlot,
  onDeleteWeeklySlot,
}) => {
  const params = new URLSearchParams(window.location.search);
  const requestedSection = params.get('section') as PlanningSection | null;
  const requestedClassId = params.get('classId') || '';
  const requestedLevelId = params.get('levelId') || '';
  const initialLevelId = normalizePrimaryLevelId(requestedLevelId) || PRIMARY_PLANNING_LEVEL_IDS[0];
  const [section, setSection] = useState<PlanningSection>(
    requestedSection && sectionLabels[requestedSection] ? requestedSection : 'annual-plan'
  );
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (requestedClassId && classes.some((item) => item.id === requestedClassId))
      return requestedClassId;
    if (requestedClassId) return '';
    return (
      classes.find((item) => normalizePrimaryLevelId(item.levelId) === initialLevelId)?.id ||
      classes[0]?.id ||
      ''
    );
  });
  const [academicYearId, setAcademicYearId] = useState(() => {
    const stored =
      params.get('academicYearId') ||
      window.localStorage.getItem(ACADEMIC_YEAR_PREFERENCE_KEY) ||
      '';
    return isOperationalAcademicYear(stored) ? stored : getCurrentAcademicYear();
  });
  const [selectedLevelId, setSelectedLevelId] = useState<PrimaryLevelId>(initialLevelId);
  const academicYearOptions = useMemo(() => getOperationalAcademicYearOptions(), []);
  const [planningStartDate, setPlanningStartDate] = useState(
    () => getAcademicCalendar(academicYearId).schoolStart
  );
  const [sessions, setSessions] = useState<TeacherPlanningSession[]>([]);
  const [annualGeneration, setAnnualGeneration] =
    useState<TeacherAnnualDistributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const sessionsRequestId = useRef(0);

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  useEffect(() => {
    if (requestedClassId && ['annual-distribution', 'weekly'].includes(requestedSection || '')) {
      if (!selectedClassId && classes.some((item) => item.id === requestedClassId)) {
        setSelectedClassId(requestedClassId);
        setError('');
      } else if (!classes.some((item) => item.id === requestedClassId) && classes.length) {
        setSelectedClassId('');
        setError('القسم المطلوب غير موجود ضمن أقسامك.');
      }
      return;
    }
    if (!selectedClassId && classes.length && section !== 'annual-distribution') {
      setSelectedClassId(
        classes.find((item) => normalizePrimaryLevelId(item.levelId) === selectedLevelId)?.id ||
          classes[0].id
      );
    }
  }, [
    classes,
    requestedClassId,
    requestedLevelId,
    requestedSection,
    section,
    selectedClassId,
    selectedLevelId,
  ]);

  useEffect(() => {
    if (!selectedClassId || section !== 'annual-distribution') {
      setSessions([]);
      return;
    }
    let cancelled = false;
    const requestId = ++sessionsRequestId.current;
    setLoading(true);
    setError('');
    fetchTeacherPlanningSessions(selectedClassId, academicYearId)
      .then((result) => {
        if (!cancelled && requestId === sessionsRequestId.current) setSessions(result.sessions);
      })
      .catch((reason: unknown) => {
        if (!cancelled && requestId === sessionsRequestId.current)
          setError(reason instanceof Error ? reason.message : 'تعذر تحميل التوزيع.');
      })
      .finally(() => {
        if (!cancelled && requestId === sessionsRequestId.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, section, academicYearId]);

  useEffect(() => {
    if (section !== 'annual-distribution') return;
    let cancelled = false;
    setLoading(true);
    fetchTeacherAnnualDistribution(academicYearId)
      .then((result) => {
        if (cancelled || !result) return;
        setAnnualGeneration(result);
        setPlanningStartDate(result.planningStartDate);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل التوزيع.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [academicYearId, section]);

  useEffect(() => {
    window.localStorage.setItem(ACADEMIC_YEAR_PREFERENCE_KEY, academicYearId);
  }, [academicYearId]);

  const changeAcademicYear = (next: string) => {
    setAcademicYearId(next);
    setPlanningStartDate(getAcademicCalendar(next).schoolStart);
    setSessions([]);
    setAnnualGeneration(null);
    setError('');
  };

  const changeLevel = (next: PrimaryLevelId) => {
    setSelectedLevelId(next);
    const matchingClass = classes.find((item) => normalizePrimaryLevelId(item.levelId) === next);
    setSelectedClassId(matchingClass?.id || '');
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('levelId', next);
    window.history.replaceState({}, '', `/planning?${nextParams.toString()}`);
  };

  const changeSection = (next: PlanningSection, context?: { levelId?: string }) => {
    setSection(next);
    const nextLevelId = normalizePrimaryLevelId(context?.levelId);
    if (nextLevelId) setSelectedLevelId(nextLevelId);
    const nextParams = new URLSearchParams({ section: next });
    const levelId = nextLevelId || selectedLevelId;
    if (levelId) nextParams.set('levelId', levelId);
    if (selectedClassId) nextParams.set('classId', selectedClassId);
    nextParams.set('academicYearId', academicYearId);
    window.history.replaceState({}, '', `/planning?${nextParams.toString()}`);
  };

  const initialize = async () => {
    if (!planningStartDate) return;
    if (!isPlanningStartDateConsistent(academicYearId, planningStartDate)) {
      setError(
        `لا يمكن أن يسبق تاريخ بداية الحصص الدخول المدرسي الرسمي للتلاميذ: ${getAcademicCalendar(academicYearId).schoolStart}.`
      );
      return;
    }
    if (!isValidPlanningDate(planningStartDate)) {
      setError('اختر تاريخاً يقع في يوم دراسي صالح لبداية حصص التلاميذ.');
      return;
    }
    if (
      (sessions.length || annualGeneration) &&
      !window.confirm('سيتم إعادة حساب تواريخ التوزيع مع الحفاظ على هوية الحصص. هل تريد المتابعة؟')
    )
      return;
    setLoading(true);
    setError('');
    ++sessionsRequestId.current;
    try {
      const result = await initializeTeacherAnnualDistribution(
        academicYearId,
        planningStartDate,
        true
      );
      setAnnualGeneration(result);
      if (selectedClassId) {
        const requestId = ++sessionsRequestId.current;
        const classResult = await fetchTeacherPlanningSessions(selectedClassId, academicYearId);
        if (requestId === sessionsRequestId.current) setSessions(classResult.sessions);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر إنشاء التوزيع.');
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (
    session: TeacherPlanningSession,
    updates: Partial<
      Pick<TeacherPlanningSession, 'plannedDate' | 'startTime' | 'venue' | 'operationalNote'>
    >
  ) => {
    setSaving(session.id);
    setError('');
    try {
      const result = await updateTeacherPlanningSession(session.classId, session.id, updates);
      setSessions((current) =>
        current.map((item) => (item.id === session.id ? result.session : item))
      );
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ التعديل.');
    } finally {
      setSaving(null);
    }
  };

  const updateLevelSession = async (
    session: import('../../services/api').TeacherAnnualDistributionSession,
    plannedDate: string
  ) => {
    setSaving(session.id);
    setError('');
    try {
      const result = await updateTeacherAnnualDistributionSession(
        academicYearId,
        session.levelId || selectedLevelId,
        session.referenceSessionId,
        plannedDate
      );
      setAnnualGeneration(result);
      setPlanningStartDate(result.planningStartDate);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ تعديل توزيع المستوى.');
    } finally {
      setSaving(null);
    }
  };

  const operationalView = section === 'annual-distribution' || section === 'weekly';
  const annualSelectedClass =
    selectedClass && normalizePrimaryLevelId(selectedClass.levelId) === selectedLevelId
      ? selectedClass
      : null;
  const annualSessions = useMemo(() => {
    const levelSessions =
      annualGeneration?.levels.find((level) => level.levelId === selectedLevelId)?.sessions || [];
    const materializedByReference = new Map(
      sessions.map((session) => [session.referenceSessionId, session] as const)
    );
    return levelSessions.map((session) => {
      const materialized = materializedByReference.get(session.referenceSessionId);
      return materialized ? { ...session, id: materialized.id } : session;
    });
  }, [annualGeneration, selectedLevelId, sessions]);

  return (
    <div
      className="workspace-page workspace-page--planning space-y-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <header className="workspace-header rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">فضاء الأستاذ</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
              <Calendar className="h-6 w-6 text-blue-600" /> التخطيط البيداغوجي
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              مرجع بيداغوجي موحد وتوزيع تشغيلي محفوظ لكل قسم.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            السنة الدراسية
            <select
              dir="ltr"
              value={academicYearId}
              onChange={(event) => changeAcademicYear(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              {academicYearOptions.map((option) => (
                <option key={option} value={option}>
                  {formatAcademicYearLabel(option)}
                </option>
              ))}
            </select>
          </label>
          {operationalView && (
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              القسم
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <option value="">اختر قسماً</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <nav
          className="workspace-tabs mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4"
          aria-label="أقسام التخطيط"
        >
          {(Object.keys(sectionLabels) as PlanningSection[]).map((item) => (
            <button
              key={item}
              onClick={() => changeSection(item)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${section === item ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
            >
              {sectionLabels[item]}
            </button>
          ))}
        </nav>
      </header>

      {section === 'annual-plan' && (
        <AnnualPlanView
          currentUser={currentUser}
          academicYearId={academicYearId}
          onNavigateToAnnualSchedule={() => changeSection('annual-distribution')}
        />
      )}
      {section === 'segments' && (
        <LearningSegmentsView
          currentUser={currentUser}
          academicYearId={academicYearId}
          onNavigateToDistribution={(levelId) => changeSection('annual-distribution', { levelId })}
        />
      )}

      {operationalView &&
        !selectedClass &&
        section !== 'weekly' &&
        section !== 'annual-distribution' && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-lg font-extrabold text-slate-900">لا توجد أقسام مسندة إليك بعد.</h2>
            <p className="mt-2 text-sm text-slate-500">
              أنشئ أو راجع إسناد القسم من فضاء القسم والتلاميذ.
            </p>
            <button
              onClick={() => window.location.assign('/gradebook')}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white"
            >
              فضاء القسم والتلاميذ
            </button>
          </div>
        )}

      {section === 'annual-distribution' && (
        <AnnualDistributionCalendar
          currentUser={currentUser}
          selectedClass={annualSelectedClass}
          selectedLevelId={selectedLevelId}
          academicYearId={academicYearId}
          planningStartDate={planningStartDate}
          sessions={annualSessions}
          loading={loading}
          saving={saving}
          error={error}
          annualGeneration={annualGeneration}
          onLevelChange={changeLevel}
          onPlanningStartDateChange={setPlanningStartDate}
          onInitialize={() => void initialize()}
          onUpdateDate={(session, plannedDate) => void updateLevelSession(session, plannedDate)}
          onNavigateToCalendar={() => changeSection('calendar')}
        />
      )}

      {section === 'calendar' && (
        <AcademicCalendarView
          academicYearId={academicYearId}
          onNavigateToDistribution={() => changeSection('annual-distribution')}
        />
      )}

      {section === 'weekly' && (
        <WeeklyTimetableView
          scheduleSlots={weeklySchedule}
          teacherClasses={classes}
          academicYearId={academicYearId}
          currentUser={currentUser}
          teacherName={`${currentUser.firstName} ${currentUser.lastName}`.trim()}
          schoolName={currentUser.schoolName}
          onAddSlot={onAddWeeklySlot}
          onUpdateSlot={onUpdateWeeklySlot}
          onDeleteSlot={onDeleteWeeklySlot}
        />
      )}
    </div>
  );
};
