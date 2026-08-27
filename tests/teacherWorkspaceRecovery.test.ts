import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

describe('Teacher workspace recovery route inventory', () => {
  const teacherRoutes = {
    '/dashboard': 'dashboard',
    '/planning': 'planning',
    '/daily-notebook': 'daily_notebook',
    '/lesson-plans': 'lesson_plans',
    '/lesson-command-center': 'lesson_command_center',
    '/knowledge-engine': 'knowledge_engine',
    '/assessment': 'competency_assessment',
    '/gradebook': 'gradebook',
    '/assessment-notebook': 'gradebook',
    '/community': 'professional_hub',
    '/reports': 'reports',
    '/settings': 'settings',
  } as const;

  it('keeps every existing Teacher module directly reachable', () => {
    for (const [path, tab] of Object.entries(teacherRoutes)) {
      expect(pathToTab(path), path).toBe(tab);
      expect(ROLE_TABS.teacher).toContain(tab);
    }
  });

  it('keeps consolidated planning deep links reachable without losing sections', () => {
    expect(pathToTab('/annual-plan')).toBe('planning');
    expect(pathToTab('/learning-segments')).toBe('planning');
    expect(pathToTab('/annual-schedule')).toBe('planning');
    expect(pathToTab('/weekly-schedule')).toBe('planning');
  });
});
