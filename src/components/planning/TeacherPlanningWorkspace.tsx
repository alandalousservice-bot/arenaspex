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
  fetchClassPlanningConfiguration,
  initializeTeacherAnnualDistribution,
  updateClassPlanningConfiguration,
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
  const [error, setError] = useState('');
  const [grade4WeeklyScheduleMode, setGrade4WeeklyScheduleMode] = useState<'TWO_45' | 'ONE_90'>(
    'ONE_90'
  );
  const [grade4ModeSaving, setGrade4ModeSaving] = useState(false);
  const sessionsRequestId = useRef(0);

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  useEffect(() => {
    if (requestedClassId && requestedSection === 'weekly') {
      if (!selectedClassId && classes.some((item) => item.id === requestedClassId)) {
        setSelectedClassId(requestedClassId);
        setError('');
      } else if (!classes.some((item) => item.id === requestedClassId) && classes.length) {
        setSelectedClassId('');
        setError('القسم المطلوب غير موجود ضمن أقسامك.');
      }
      return;
    }
    if (
      !selectedClassId &&
      classes.length &&
      !['annual-plan', 'segments', 'calendar'].includes(section)
    ) {
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
    if (!selectedClassId || section === 'annual-distribution') {
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
    fetchTeacherAnnualDistribution(academicYearId, selectedClassId || undefined)
      .then((result) => {
        if (cancelled || !result) return;
        setAnnualGeneration(result);
        setPlanningStartDate(result.planningStartDate);
        const selectedLevel = result.levels.find((item) => item.levelId === 'lvl_p4');
        if (selectedLevel?.grade4WeeklyScheduleMode)
          setGrade4WeeklyScheduleMode(selectedLevel.grade4WeeklyScheduleMode);
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
  }, [academicYearId, section, selectedClassId]);

  useEffect(() => {
    if (
      section !== 'annual-distribution' ||
      !selectedClass ||
      normalizePrimaryLevelId(selectedClass.levelId) !== 'lvl_p4'
    )
      return;
    let cancelled = false;
    fetchClassPlanningConfiguration(selectedClass.id, academicYearId)
      .then((result) => {
        if (!cancelled) setGrade4WeeklyScheduleMode(result.effectiveGrade4WeeklyScheduleMode);
      })
      .catch(() => {
        if (!cancelled) setGrade4WeeklyScheduleMode('ONE_90');
      });
    return () => {
      cancelled = true;
    };
  }, [academicYearId, section, selectedClass]);

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
    if (!['annual-plan', 'segments', 'calendar'].includes(section)) {
      const matchingClass = classes.find((item) => normalizePrimaryLevelId(item.levelId) === next);
      setSelectedClassId(matchingClass?.id || '');
    }
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
    if (!['annual-plan', 'segments', 'calendar'].includes(next) && selectedClassId) {
      nextParams.set('classId', selectedClassId);
    }
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
        const scopedResult = await fetchTeacherAnnualDistribution(academicYearId, selectedClassId);
        if (scopedResult) setAnnualGeneration(scopedResult);
      }
      if (selectedClassId && section !== 'annual-distribution') {
        const requestId = ++sessionsRequestId.current;
        const classResult = await fetchTeacherPlanningSessions(selectedClassId, academicYearId);
        if (requestId === sessionsRequestId.current) setSessions(classResult.sessions);
      }
    } catch (reason: unknown) {
      const annualError = reason as Error & {
        annualDistribution?: TeacherAnnualDistributionResponse;
      };
      if (annualError.annualDistribution) {
        setAnnualGeneration(annualError.annualDistribution);
        if (selectedClassId && section !== 'annual-distribution') {
          const requestId = ++sessionsRequestId.current;
          const classResult = await fetchTeacherPlanningSessions(
            selectedClassId,
            academicYearId
          ).catch(() => null);
          if (classResult && requestId === sessionsRequestId.current)
            setSessions(classResult.sessions);
        }
      }
      setError(reason instanceof Error ? reason.message : 'تعذر إنشاء التوزيع.');
    } finally {
      setLoading(false);
    }
  };

  const operationalView = section === 'weekly';
  const changeGrade4Mode = async (mode: 'TWO_45' | 'ONE_90') => {
    if (!selectedClass || selectedClass.levelId !== 'lvl_p4') return;
    setGrade4WeeklyScheduleMode(mode);
    setGrade4ModeSaving(true);
    setError('');
    try {
      await updateClassPlanningConfiguration(selectedClass.id, academicYearId, mode);
      const result = await fetchTeacherAnnualDistribution(academicYearId, selectedClass.id);
      if (result) setAnnualGeneration(result);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ نمط جدولة السنة الرابعة.');
    } finally {
      setGrade4ModeSaving(false);
    }
  };

  return (
    <div
      className="workspace-page workspace-page--planning space-y-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <header className="workspace-header rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600">فضاء الأستاذ</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
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
          {(operationalView || section === 'annual-distribution') && (
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
          {section === 'annual-distribution' &&
            selectedClass &&
            normalizePrimaryLevelId(selectedClass.levelId) === 'lvl_p4' && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                نمط حصص السنة الرابعة
                <select
                  value={grade4WeeklyScheduleMode}
                  disabled={grade4ModeSaving}
                  onChange={(event) =>
                    void changeGrade4Mode(event.target.value as 'TWO_45' | 'ONE_90')
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <option value="ONE_90">حصة واحدة · 90 دقيقة</option>
                  <option value="TWO_45">حصتان · 45 دقيقة</option>
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
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold ${section === item ? 'workspace-tab-active' : 'border border-slate-200 bg-white text-slate-600'}`}
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

      {section === 'annual-distribution' && (
        <AnnualDistributionCalendar
          currentUser={currentUser}
          selectedLevelId={selectedLevelId}
          academicYearId={academicYearId}
          planningStartDate={planningStartDate}
          loading={loading}
          error={error}
          annualGeneration={annualGeneration}
          onLevelChange={changeLevel}
          onPlanningStartDateChange={setPlanningStartDate}
          onInitialize={() => void initialize()}
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
