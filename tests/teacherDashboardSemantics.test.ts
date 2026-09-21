import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeNotebookExecutionStats } from '../src/services/teacherDashboard.service';
import { formatLocalDate } from '../src/services/localDate';

const dashboard = readFileSync('src/components/dashboard/TeacherDashboard.tsx', 'utf8');
const kpis = readFileSync('src/components/dashboard/teacher/TeacherKpiGrid.tsx', 'utf8');
const schedule = readFileSync('src/components/dashboard/teacher/DailyScheduleList.tsx', 'utf8');

describe('Teacher Dashboard G3-B1/B2 semantics and resilience', () => {
  it('does not label a daily formula as annual execution', () => {
    expect(kpis).not.toContain('نسبة تنفيذ المخطط السنوي');
    expect(kpis).toContain('المذكرات المنشأة');
    expect(dashboard).toContain('formatLocalDate()');
  });

  it('preserves today completion arithmetic and safe zero denominator', () => {
    expect(computeNotebookExecutionStats([])).toMatchObject({
      completedCount: 0,
      totalSessions: 1,
      executionPercentage: 0,
    });
    expect(
      computeNotebookExecutionStats([{ status: 'منجزة' }, { status: 'مبرمجة' }] as never)
    ).toMatchObject({ completedCount: 1, executionPercentage: 50 });
    expect(dashboard).toContain("session.status === 'منجزة'");
  });

  it('uses the Daily Notebook local-date authority and distinct states', () => {
    expect(formatLocalDate(new Date('2026-01-01T23:30:00-05:00'))).toBe('2026-01-02');
    expect(dashboard).not.toContain('toISOString().slice(0, 10)');
    expect(dashboard).toContain("todayLoadState === 'loading'");
    expect(dashboard).toContain('تعذر تحميل حصص اليوم');
    expect(dashboard).toContain('إعادة المحاولة');
    expect(schedule).toContain('جارٍ تحميل حصص اليوم');
    expect(schedule).toContain('لا توجد حصص مبرمجة اليوم');
  });

  it('fails closed on any class request error and retries the authoritative fetch', () => {
    expect(dashboard).toContain('Promise.all(');
    expect(dashboard).toContain("setTodayLoadState('error')");
    expect(dashboard).toContain('setRetryNonce((value) => value + 1)');
    expect(dashboard).not.toContain('.catch(() => setTodaySessions([]))');
  });
});
