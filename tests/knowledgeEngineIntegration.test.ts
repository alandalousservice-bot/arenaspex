import { describe, expect, it } from 'vitest';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';
import { selectApprovedCommunityResources } from '../src/components/knowledge/KnowledgeEngineView';

describe('دمج المواقف التربوية داخل بنك المعرفة', () => {
  it('يوفر الرابط القديم توافقاً آمناً مع بنك المعرفة الموحد', () => {
    expect(pathToTab('/educational-situations')).toBe('knowledge_engine');
  });

  it('لا يعرض تبويباً مستقلاً للمواقف في صلاحيات الأدوار', () => {
    expect(ROLE_TABS.teacher).not.toContain('educational_situations');
    expect(ROLE_TABS.inspector).not.toContain('educational_situations');
    expect(ROLE_TABS.admin).not.toContain('educational_situations');
  });

  it('يعرض الموارد التعليمية المشتركة المعتمدة فقط', () => {
    const resources = [
      { id: 'r1', title: 'مورد معتمد', description: '', authorRole: 'teacher', isApprovedByInspector: true },
      { id: 'r2', title: 'مورد قيد المراجعة', description: '', authorRole: 'teacher', isApprovedByInspector: false },
    ] as any;
    expect(selectApprovedCommunityResources(resources).map((resource) => resource.id)).toEqual(['r1']);
  });
});
