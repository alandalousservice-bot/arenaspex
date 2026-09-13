import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToTab, ROLE_TABS } from '../src/lib/routes';
import {
  KNOWLEDGE_BANK_CATEGORIES,
  selectApprovedCommunityResources,
} from '../src/components/knowledge/KnowledgeEngineView';
import {
  durationBucket,
  matchesSituationFilters,
  situationSkillTags,
} from '../src/components/educationalSituations/EducationalSituationsBankView';

describe('دمج المواقف التربوية داخل بنك المعرفة', () => {
  it('يوفر الرابط القديم توافقاً آمناً مع بنك المعرفة الموحد', () => {
    expect(pathToTab('/educational-situations')).toBe('knowledge_engine');
  });

  it('لا يعرض تبويباً مستقلاً للمواقف في صلاحيات الأدوار', () => {
    expect(KNOWLEDGE_BANK_CATEGORIES).not.toContain('game');
    expect(KNOWLEDGE_BANK_CATEGORIES).toContain('educational_situation');
    expect(ROLE_TABS.teacher).not.toContain('educational_situations');
    expect(ROLE_TABS.inspector).not.toContain('educational_situations');
    expect(ROLE_TABS.admin).not.toContain('educational_situations');
  });

  it('يعرض محرك المعرفة ثلاثة أقسام رئيسية فقط دون بنك ألعاب مستقل', () => {
    expect(KNOWLEDGE_BANK_CATEGORIES).toEqual(['objective', 'remedial', 'educational_situation']);
    const source = readFileSync('src/components/knowledge/KnowledgeEngineView.tsx', 'utf8');
    expect(source).toContain('بنك الأهداف</span>');
    expect(source).toContain('الأنشطة العلاجية');
    expect(source).toContain('المواقف التربوية');
    expect(source).not.toContain("setActiveTab('community_resource')");
    expect(source).not.toContain('بنك الألعاب التربوية');
  });

  it('يعرض الموارد التعليمية المشتركة المعتمدة فقط', () => {
    const resources = [
      {
        id: 'r1',
        title: 'مورد معتمد',
        description: '',
        authorRole: 'teacher',
        isApprovedByInspector: true,
      },
      {
        id: 'r2',
        title: 'مورد قيد المراجعة',
        description: '',
        authorRole: 'teacher',
        isApprovedByInspector: false,
      },
    ] as any;
    expect(selectApprovedCommunityResources(resources).map((resource) => resource.id)).toEqual([
      'r1',
    ]);
  });

  it('يقدم تفاصيل الهدف في نافذة بيداغوجية قابلة للفتح', () => {
    const source = readFileSync('src/components/knowledge/KnowledgeEngineView.tsx', 'utf8');
    expect(source).toContain('فتح تفاصيل الهدف');
    expect(source).toContain('aria-labelledby="objective-details-title"');
    expect(source).toContain('الكفاءة الختامية');
    expect(source).toContain('الموارد المرتبطة');
    expect(source).not.toContain('بنك الألعاب التربوية');
  });

  it('يوفر مكتبة بصرية وفلاتر تنفيذية للمواقف دون تكرار مصادر البيانات', () => {
    const source = readFileSync(
      'src/components/educationalSituations/EducationalSituationsBankView.tsx',
      'utf8'
    );
    expect(source).toContain('xl:grid-cols-3');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('شروط الإنجاز');
    expect(source).toContain('معيار النجاح');
    expect(source).toContain('مؤشرات الملاحظة');
    expect(source).toContain('التنظيم');
    expect(source).toContain('فتح التفاصيل');
  });

  it('يحسب المهارات والمدة بشكل قابل لإعادة الاستخدام', () => {
    const situation = {
      motorActions: ['الجري'],
      pedagogicalTags: ['توازن'],
      requirements: ['الانتباه'],
      lessonTypes: ['LEARNING'],
      equipment: ['أقماع'],
      durationMinutes: 45,
    } as any;
    expect(situationSkillTags(situation)).toEqual(['الجري', 'توازن', 'الانتباه']);
    expect(durationBucket(45)).toBe('medium');
    expect(
      matchesSituationFilters(situation, {
        skill: 'توازن',
        lessonType: 'LEARNING',
        equipment: 'أقماع',
        duration: 'medium',
      })
    ).toBe(true);
  });
});
