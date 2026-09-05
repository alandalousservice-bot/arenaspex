import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatAcademicYearSelectLabel } from '../src/services/academicYear';
import { isLessonMemoEligible } from '../src/services/lessonPlanWorkflow.service';

const read = (file: string) => readFileSync(file, 'utf8');

describe('Lesson Memo session-first workspace presentation', () => {
  it('renders a planned-session workspace with the existing operational source', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const api = read('src/services/api.ts');

    expect(view).toContain('مذكرات الحصص');
    expect(view).toContain('الوثائق التنفيذية');
    expect(view).toContain('الحصص المبرمجة والمذكرات');
    expect(view).toContain(
      'fetchTeacherPlanningSessions(operationalClassId, operationalAcademicYearId)'
    );
    expect(view).toContain('findOperationalLessonPlan(');
    expect(view).toContain("currentUser?.id || ''");
    expect(view).toContain('إنشاء المذكرة');
    expect(view).toContain('فتح المذكرة');
    expect(api).toContain('/api/teacher/planning/classes/');
  });

  it('keeps teacher-visible labels human-readable and bidi-safe', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const academicYear = read('src/services/academicYear.ts');

    expect(view).toContain('formatAcademicYearLabel');
    expect(view).toContain('formatAcademicYearSelectLabel');
    expect(view).toContain('dir="ltr"');
    expect(academicYear).toContain('return `\\u200E${label}\\u200E`');
    expect(formatAcademicYearSelectLabel('2026-2027')).toBe('\u200E2026 / 2027\u200E');
    expect(formatAcademicYearSelectLabel('2026-2027').replace(/[\u200e]/g, '')).toBe('2026 / 2027');
    expect(view).toContain('formatLessonDate');
    expect(view).toContain('`${day} / ${month} / ${year}`');
    expect(view).not.toContain('{item.name} — {item.levelName || item.levelId}');
    expect(view).not.toContain('lvl_p1</option>');
  });

  it('normalizes compatibility links to the actual persisted session id', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(view).toContain(
      'const matchedById = nextSessions.find((item) => item.id === requested)'
    );
    expect(view).toContain('nextSessions.find((item) => item.referenceSessionId === requested)');
    expect(view).toContain("const nextId = resolvedRequested?.id || nextSessions[0]?.id || ''");
    expect(view).toContain('classPlannedSessionId: operationalContext?.session.id');
    expect(view).toContain('createOperationalMemo(session.id)');
    expect(view).toContain('openOperationalMemo(session, memo)');
    expect(view).toContain('setSelectedId(memo.id)');
    expect(view).toContain('setActiveLessonPlanId(memo.id)');
    expect(view).toContain("setScreenMode('saved')");
    expect(view).toContain('setShowGenerator(false)');
    expect(view).toContain('تعذر فتح المذكرة المحفوظة. أعد تحميل البيانات وحاول مرة أخرى.');
    expect(view).not.toContain(
      'classPlannedSessionId: operationalContext?.session.referenceSessionId'
    );
  });

  it('hides intro taxonomy while preserving official curriculum field labels', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(view).toContain("domainId === 'intro'");
    expect(view).toContain('displayFieldName(reference?.domainId, reference?.fieldName)');
    expect(view).not.toContain(
      '<dd className="mt-0.5">{reference?.fieldName || \'غير محدد\'}</dd>'
    );
    expect(view).toContain("const visibleFieldName = displayFieldName('', memoModel.header.field)");
  });

  it('preserves exact session context and duplicate protection', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const workflow = read('src/services/lessonPlanWorkflow.service.ts');
    const dailyNotebook = read('src/components/notebook/DailyNotebookView.tsx');
    const commandCenter = read('src/components/lesson/LessonCommandCenterView.tsx');
    const app = read('src/App.tsx');

    expect(view).toContain("query.get('classPlannedSessionId')");
    expect(view).toContain('classPlannedSessionId: operationalContext?.session.id');
    expect(view).toContain('referenceSessionId: operationalContext?.session.referenceSessionId');
    expect(workflow).toContain('plan.classPlannedSessionId === session.id');
    expect(dailyNotebook).toContain('/lesson-plans?classId=');
    expect(dailyNotebook).toContain('classPlannedSessionId=${encodeURIComponent(session.id)}');
    expect(commandCenter).toContain('onNavigateToLessonPlans');
    expect(app).toContain('activeLessonSession?.classPlannedSessionId');
    expect(app).toContain('window.location.assign(`/lesson-plans?${params.toString()}`)');
  });

  it('keeps backend ownership validation authoritative for all session ids', () => {
    const router = read('src/server/apiRouter.ts');

    expect(router).toContain('id: item.classPlannedSessionId');
    expect(router).toContain('classId: item.classId');
    expect(router).toContain('academicYearId: item.academicYearId');
    expect(router).toContain('teacherId: user.id');
    expect(router).toContain('return Boolean(planned);');
    expect(router).toContain(
      "return res.status(403).json({ error: 'الحصة التشغيلية غير موجودة ضمن أقسامك.' });"
    );
  });

  it('keeps standalone mode and official print rendering separate', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const print = read('src/services/lessonPlanExport.service.ts');

    expect(view).toContain("useState<LessonMemoMode>('operational')");
    expect(view).toContain('مذكرة مستقلة');
    expect(view).toContain('هذه المذكرة غير مرتبطة بحصة مبرمجة في الكراس اليومي.');
    expect(view).toContain('exportLessonPlanToPdf(plan)');
    expect(view).toContain('handleWordExport(plan)');
    expect(print).toContain('exportLessonPlanToPdf');
  });

  it('keeps saved-memo navigation bound to the same operational context', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(view).toContain(
      'openOperationalMemo = (session: TeacherPlanningSession, memo?: LessonPlan)'
    );
    expect(view).toContain('findOperationalLessonPlan(');
    expect(view).toContain("currentUser?.id || ''");
    expect(view).toContain(
      'classPlannedSessionId=${encodeURIComponent(scheduledContext.session.id)}&academicYearId='
    );
    expect(view).toContain(
      'classPlannedSessionId=${encodeURIComponent(scheduledContext.session.id)}'
    );
  });

  it('keeps the saved viewer stable during refresh and closes only explicitly', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(view).toContain(
      "const [screenMode, setScreenMode] = useState<'list' | 'generator' | 'saved'>"
    );
    expect(view).toContain('const [activeLessonPlanId, setActiveLessonPlanId]');
    expect(view).toContain('const [deepLinkDismissed, setDeepLinkDismissed]');
    expect(view).toContain('activeLessonPlanForContext || existingOperationalMemo');
    expect(view).toContain('const closeSavedMemo = () => {');
    expect(view).toContain("setScreenMode('list')");
    expect(view).toContain('onClick={closeSavedMemo}');
    expect(view).toContain("screenMode !== 'saved' && plannedSessionsList");
    expect(view).toContain(
      'if (deepLinkDismissed || !requestedSessionId || !operationalSession) return;'
    );
    expect(view).toContain('setActiveLessonPlanId(requestedMemo.id)');
    expect(view).toContain('تعذر تحميل المذكرة المحفوظة. أعد تحميل البيانات وحاول مرة أخرى.');
  });

  it('uses canonical session identity for memo eligibility', () => {
    expect(
      isLessonMemoEligible({
        reference: {
          domainId: 'intro',
          sessionType: 'تعارف وتنظيم',
          sessionTypeLabel: 'تعارف، تنظيم واتصال',
        },
      })
    ).toBe(false);
    expect(isLessonMemoEligible({ sessionType: 'تقويم تشخيصي' })).toBe(true);
    expect(isLessonMemoEligible({ sessionType: 'تعلمية' })).toBe(true);
    expect(isLessonMemoEligible({ sessionType: 'إدماجية' })).toBe(true);
    expect(isLessonMemoEligible({ sessionType: 'تقويم تحصيلي' })).toBe(true);
    expect(
      isLessonMemoEligible({
        domainId: 'field_1',
        sessionType: 'تعلمية',
        sessionTypeLabel: 'تعارف، تنظيم واتصال',
      })
    ).toBe(true);
  });

  it('keeps introductory sessions visible while removing memo actions', () => {
    const view = read('src/components/lesson/LessonPlanView.tsx');
    const dailyNotebook = read('src/components/notebook/DailyNotebookView.tsx');
    const commandCenter = read(
      'src/components/lesson/commandCenter/CommandCenterPreSessionSetup.tsx'
    );
    const curriculum = read('src/data/algerianCurriculum.ts');
    const planning = read('src/services/teacherPlanning.service.ts');

    expect(view).toContain('const memoEligible = isLessonMemoEligible(session);');
    expect(view).toContain('لا تتطلب مذكرة');
    expect(view).toContain('حصة تنظيمية بدون مذكرة');
    expect(view).toContain('if (!isLessonMemoEligible(operationalSession))');
    expect(view).toContain('if (!isLessonMemoEligible(scheduledContext.session))');
    expect(dailyNotebook).toContain('const memoEligible = isLessonMemoEligible(reference || {});');
    expect(dailyNotebook).toContain('>المذكرة</h2>');
    expect(dailyNotebook).toContain('memoEligible');
    expect(dailyNotebook).toContain('حصة تنظيمية بدون مذكرة');
    expect(commandCenter).toContain('isLessonMemoEligible({');
    expect(commandCenter).toContain('هذه الحصة التنظيمية لا تتطلب مذكرة');
    expect(curriculum).toContain("fieldId: 'intro'");
    expect(curriculum).toContain('isIntro: true');
    expect(planning).toContain("domainId: 'intro'");
  });

  it('keeps data generation and persistence boundaries unchanged', () => {
    const curriculum = read('src/data/algerianCurriculum.ts');
    const planning = read('src/services/teacherPlanning.service.ts');
    const view = read('src/components/lesson/LessonPlanView.tsx');

    expect(curriculum).toContain('generateAnnualTimeDistribution');
    expect(planning).toContain('buildClassPlannedSessionSeedsFromCanonicalSessions');
    expect(view).toContain('classPlannedSessionId: operationalContext?.session.id');
    expect(view).toContain('onSaveLessonPlan(plan);');
  });
});
