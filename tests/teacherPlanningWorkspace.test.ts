import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pathToTab, planningSectionForPath, ROLE_TABS, tabToPath } from '../src/lib/routes';
import { buildAcademicCalendarSlides } from '../src/components/curriculum/AcademicCalendarView';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('unified Teacher planning workspace', () => {
  it('exposes one planning route and preserves legacy section deep links', () => {
    expect(tabToPath('planning')).toBe('/planning');
    expect(pathToTab('/planning')).toBe('planning');
    expect(pathToTab('/annual-plan')).toBe('planning');
    expect(planningSectionForPath('/weekly-schedule')).toBe('weekly');
    expect(ROLE_TABS.teacher).toContain('planning');
    expect(ROLE_TABS.teacher).not.toContain('annual_plan');
    expect(ROLE_TABS.teacher).not.toContain('annual_schedule');
  });

  it('uses the four internal sections and persisted class-scoped session API', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    expect(workspace).toContain('المخطط السنوي');
    expect(workspace).toContain('المقاطع التعليمية');
    expect(workspace).toContain('التوزيع السنوي');
    expect(workspace).toContain('التوزيع الأسبوعي');
    expect(workspace).toContain('fetchTeacherPlanningSessions');
    expect(workspace).toContain('initializeTeacherAnnualDistribution');
    expect(workspace).toContain('updateTeacherPlanningSession');
    expect(workspace).toContain('WeeklyTimetableView');
    expect(workspace).toContain('weeklySchedule');
    expect(workspace).not.toContain('visibleSessions');
    expect(workspace).not.toContain('spex_weekly_schedule');
    expect(workspace).toContain('لا توجد أقسام مسندة إليك بعد.');
    expect(workspace).toContain('academicYearOptions');
    expect(workspace).toContain('getAcademicCalendar(academicYearId).schoolStart');
    expect(workspace).not.toContain("getAcademicCalendar('2026-09-06')");
    expect(workspace).toContain('arenaspex:selectedAcademicYear');
    expect(workspace).not.toContain("const ACADEMIC_YEAR_ID = '2025-2026'");
    expect(read('src/server/apiRouter.ts')).toContain('isCanonicalAcademicYearId');
    expect(read('src/server/apiRouter.ts')).toContain('isPlanningStartDateConsistent');
    expect(workspace).toContain('requestedClassId');
    expect(workspace).toContain('requestedLevelId');
    expect(workspace).toContain('القسم المطلوب غير موجود ضمن أقسامك.');
    expect(read('src/server/apiRouter.ts')).toContain('resolvePlanningReferences');
    expect(read('src/server/apiRouter.ts')).toContain('اختر تاريخاً يقع في يوم دراسي');
  });

  it('keeps annual level selection independent from class refreshes', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    const distribution = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    expect(workspace).toContain('const [selectedLevelId, setSelectedLevelId]');
    expect(workspace).toContain('initialLevelId');
    expect(workspace).toContain('onLevelChange={changeLevel}');
    expect(distribution).toContain('aria-label="اختيار مستوى التوزيع السنوي"');
    expect(distribution).toContain('aria-pressed={selectedLevelId === levelId}');
    expect(distribution).toContain('onClick={() => onLevelChange(levelId)}');
    expect(workspace).not.toContain('setSelectedLevelId(selectedClass');
  });

  it('uses the controlled date input as the generation payload', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    const distribution = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    const api = read('src/services/api.ts');
    expect(distribution).toContain('value={planningStartDate}');
    expect(workspace).toContain(
      'initializeTeacherAnnualDistribution(academicYearId, planningStartDate)'
    );
    expect(api).toContain('body: JSON.stringify({ academicYearId, planningStartDate })');
  });

  it('builds calendar slides from the authoritative academic calendar', () => {
    const slides = buildAcademicCalendarSlides('2026-2027');
    expect(
      slides.find((slide) => slide.id === 'vacations')?.events.map((event) => event.name)
    ).toEqual(['عطلة الخريف', 'عطلة الشتاء', 'عطلة الربيع']);
    expect(
      slides.find((slide) => slide.id === 'national')?.events.map((event) => event.startDate)
    ).toEqual(['2026-11-01', '2027-01-01', '2027-01-12', '2027-05-01', '2027-07-05']);
    const religious = slides.find((slide) => slide.id === 'religious')?.events;
    expect(religious?.find((event) => event.name === 'بداية شهر رمضان المبارك')).toMatchObject({
      blocksTeaching: false,
      type: 'RELIGIOUS_OBSERVANCE',
    });
  });

  it('keeps calendar navigation actions in the planning workspace', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    const distribution = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    expect(workspace).toContain("section === 'calendar'");
    expect(workspace).toContain('AcademicCalendarView');
    expect(distribution).toContain('عرض رزنامة العطل والأعياد');
    expect(workspace).toContain('const levelId = nextLevelId || selectedLevelId');
    expect(workspace).toContain("changeSection('annual-distribution')");
  });

  it('renders weekly distribution from the recurring timetable model', () => {
    const workspace = read('src/components/planning/TeacherPlanningWorkspace.tsx');
    expect(workspace).toContain('WeeklyTimetableView');
    expect(workspace).toContain('scheduleSlots={weeklySchedule}');
    expect(workspace).toContain('onAddSlot={onAddWeeklySlot}');
    expect(workspace).not.toContain('weekStart(localDate(session.plannedDate))');
  });

  it('uses the classic annual calendar presentation without changing weekly planning', () => {
    const calendar = read('src/components/curriculum/AnnualDistributionCalendar.tsx');
    expect(calendar).toContain('الشهر');
    expect(calendar).toContain('التاريخ');
    expect(calendar).toContain('نوع الحصة');
    expect(calendar).toContain('الميدان');
    expect(calendar).toContain('getCalendarEventsForDisplay');
    expect(calendar).toContain('classPlannedSessionId');
    expect(read('src/services/api.ts')).toContain('referenceSessionId');
    expect(calendar).not.toContain('الهدف التعلمي');
  });

  it('exposes professional print actions and print-only document shells for planning references', () => {
    const annualPlan = read('src/components/curriculum/AnnualPlanView.tsx');
    const segments = read('src/components/curriculum/LearningSegmentsView.tsx');
    const printCss = read('src/index.css');
    expect(annualPlan).toContain('المخطط السنوي');
    expect(annualPlan).toContain('طباعة المخطط');
    expect(annualPlan).toContain('planning-print-header');
    expect(annualPlan).toContain('print:hidden');
    expect(segments).toContain('طباعة المقاطع التعلمية');
    expect(segments).toContain('planning-print-header');
    expect(segments).toContain('OVERALL_COMPETENCY_BY_LEVEL');
    expect(segments).toContain('effectiveCurriculumObjective');
    expect(segments).toContain('sessionsList.map');
    expect(printCss).toContain('size: A4 portrait');
    expect(printCss).toContain('-webkit-print-color-adjust: exact');
    expect(printCss).toContain('page-break-inside: avoid');
  });
});
