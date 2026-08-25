import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, RefreshCw, Save, BookOpen, NotebookPen } from 'lucide-react';
import { AnnualPlanView } from '../curriculum/AnnualPlanView';
import { LearningSegmentsView } from '../curriculum/LearningSegmentsView';
import { PE_LEVELS } from '../../data/algerianCurriculum';
import {
  fetchTeacherPlanningSessions,
  initializeTeacherPlanningSessions,
  updateTeacherPlanningSession,
  TeacherPlanningSession,
} from '../../services/api';
import { canonicalPlanningSessions } from '../../services/teacherPlanning.service';
import type { ClassRoom, User } from '../../types/spex';
import type { PlanningSection } from '../../lib/routes';

interface TeacherPlanningWorkspaceProps {
  currentUser: User;
  classes: ClassRoom[];
}

const ACADEMIC_YEAR_ID = '2025-2026';
const sectionLabels: Record<PlanningSection, string> = {
  'annual-plan': 'المخطط السنوي',
  segments: 'المقاطع التعليمية',
  'annual-distribution': 'التوزيع السنوي',
  weekly: 'التوزيع الأسبوعي',
};

function localDate(value: string): string {
  return value.slice(0, 10);
}

function weekStart(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

export const TeacherPlanningWorkspace: React.FC<TeacherPlanningWorkspaceProps> = ({
  currentUser,
  classes,
}) => {
  const params = new URLSearchParams(window.location.search);
  const requestedSection = params.get('section') as PlanningSection | null;
  const [section, setSection] = useState<PlanningSection>(
    requestedSection && sectionLabels[requestedSection] ? requestedSection : 'annual-plan'
  );
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [planningStartDate, setPlanningStartDate] = useState('');
  const [week, setWeek] = useState('');
  const [sessions, setSessions] = useState<TeacherPlanningSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const referenceSessions = useMemo(
    () =>
      selectedClass && planningStartDate
        ? canonicalPlanningSessions(selectedClass.levelId, planningStartDate)
        : [],
    [selectedClass, planningStartDate]
  );
  const referencesById = useMemo(
    () => new Map(referenceSessions.map((item) => [item.referenceSessionId, item])),
    [referenceSessions]
  );

  useEffect(() => {
    if (!selectedClassId || !['annual-distribution', 'weekly'].includes(section)) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchTeacherPlanningSessions(selectedClassId, ACADEMIC_YEAR_ID)
      .then((result) => {
        if (!cancelled) setSessions(result.sessions);
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
  }, [selectedClassId, section]);

  const changeSection = (next: PlanningSection) => {
    setSection(next);
    window.history.replaceState({}, '', `/planning?section=${next}`);
  };

  const initialize = async () => {
    if (!selectedClassId || !planningStartDate) return;
    setLoading(true);
    setError('');
    try {
      const result = await initializeTeacherPlanningSessions(
        selectedClassId,
        ACADEMIC_YEAR_ID,
        planningStartDate
      );
      setSessions(result.sessions);
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

  const visibleSessions = useMemo(() => {
    if (section !== 'weekly' || !week) return sessions;
    return sessions.filter((session) => weekStart(localDate(session.plannedDate)) === week);
  }, [section, sessions, week]);

  const operationalView = section === 'annual-distribution' || section === 'weekly';

  return (
    <div className="space-y-5 animate-in fade-in duration-200" dir="rtl">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
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
          className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4"
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
          onNavigateToAnnualSchedule={() => changeSection('annual-distribution')}
        />
      )}
      {section === 'segments' && (
        <LearningSegmentsView
          onNavigateToDistribution={() => changeSection('annual-distribution')}
        />
      )}

      {operationalView && !selectedClass && (
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

      {operationalView && selectedClass && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{selectedClass.name}</h2>
              <p className="text-xs text-slate-500">
                {PE_LEVELS.find((level) => level.id === selectedClass.levelId)?.name ||
                  selectedClass.levelId}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold text-slate-600">
                بداية التخطيط
                <input
                  type="date"
                  value={planningStartDate}
                  onChange={(event) => setPlanningStartDate(event.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
                />
              </label>
              <button
                onClick={initialize}
                disabled={!planningStartDate || loading}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> تهيئة التوزيع المحفوظ
              </button>
              {section === 'weekly' && (
                <label className="text-xs font-bold text-slate-600">
                  بداية الأسبوع
                  <input
                    type="date"
                    value={week}
                    onChange={(event) => setWeek(event.target.value)}
                    className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"
                  />
                </label>
              )}
            </div>
          </div>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {loading && (
            <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">
              جارٍ تحميل الجلسات المحفوظة...
            </p>
          )}
          {!loading && sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              اختر تاريخ بداية صريحاً ثم اضغط «تهيئة التوزيع المحفوظ» لبدء هذا القسم.
            </div>
          )}
          {!loading && sessions.length > 0 && visibleSessions.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600">
              لا توجد حصص محفوظة في هذا الأسبوع.
            </div>
          )}
          <div className="grid gap-3">
            {visibleSessions.map((session) => {
              const reference = referencesById.get(session.referenceSessionId);
              return (
                <article
                  key={session.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <CalendarDays className="h-4 w-4 text-blue-600" /> الحصة{' '}
                        {reference?.sequenceIndex ?? '—'} · {session.durationMinutes} دقيقة ·{' '}
                        <span className="text-emerald-700">{session.status}</span>
                      </div>
                      <h3 className="mt-2 font-extrabold text-slate-900">
                        {reference?.objective || 'اختر تاريخ البداية لعرض المرجع البيداغوجي.'}
                      </h3>
                      {reference && (
                        <p className="mt-1 text-xs text-slate-500">
                          {reference.sessionTypeLabel} · المقطع {reference.learningSectionId}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() =>
                          window.location.assign(
                            `/lesson-plans?classId=${session.classId}&classPlannedSessionId=${session.id}`
                          )
                        }
                        className="flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 font-bold text-blue-700"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> المذكرة
                      </button>
                      <button
                        onClick={() =>
                          window.location.assign(
                            `/daily-notebook?classId=${session.classId}&classPlannedSessionId=${session.id}`
                          )
                        }
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 font-bold text-slate-700"
                      >
                        <NotebookPen className="h-3.5 w-3.5" /> الكراس اليومي
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {(['plannedDate', 'startTime', 'venue', 'operationalNote'] as const).map(
                      (field) => (
                        <label key={field} className="text-[11px] font-bold text-slate-500">
                          {field === 'plannedDate'
                            ? 'التاريخ'
                            : field === 'startTime'
                              ? 'التوقيت'
                              : field === 'venue'
                                ? 'المكان'
                                : 'ملاحظة تشغيلية'}
                          <input
                            type={
                              field === 'plannedDate'
                                ? 'date'
                                : field === 'startTime'
                                  ? 'time'
                                  : 'text'
                            }
                            value={
                              field === 'plannedDate'
                                ? localDate(session.plannedDate)
                                : session[field] || ''
                            }
                            placeholder={field === 'venue' ? 'غير محدد' : ''}
                            onBlur={(event) => {
                              const value = event.target.value || null;
                              const update =
                                field === 'plannedDate'
                                  ? { plannedDate: value || localDate(session.plannedDate) }
                                  : { [field]: value };
                              void updateSession(session, update);
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-normal text-slate-800"
                          />{' '}
                        </label>
                      )
                    )}
                    <span className="flex items-end gap-1 text-[11px] font-bold text-slate-400">
                      <Save className="h-3.5 w-3.5" />{' '}
                      {saving === session.id ? 'جارٍ الحفظ' : 'يحفظ تلقائياً عند مغادرة الحقل'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
