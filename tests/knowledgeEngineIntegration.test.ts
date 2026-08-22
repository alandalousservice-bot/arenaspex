import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';

describe('دمج المواقف التربوية داخل بنك المعرفة', () => {
  it('يوفر الرابط القديم توافقاً آمناً مع بنك المعرفة الموحد', () => {
    expect(pathToTab('/educational-situations')).toBe('knowledge_engine');
  });

  it('لا يعرض تبويباً مستقلاً للمواقف في صلاحيات الأدوار', () => {
    expect(ROLE_TABS.teacher).not.toContain('educational_situations');
    expect(ROLE_TABS.inspector).not.toContain('educational_situations');
    expect(ROLE_TABS.admin).not.toContain('educational_situations');
  });
});
