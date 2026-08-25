import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync('src/components/dashboard/AdminCurriculumPage.tsx', 'utf8');
const router = readFileSync('src/server/apiRouter.ts', 'utf8');
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');
const curriculum = readFileSync('src/data/algerianCurriculum.ts', 'utf8');
const annual = readFileSync('src/data/annualPlanReference.ts', 'utf8');

describe('protected admin curriculum workspace', () => {
  it('preserves the official grades, canonical domains, and reference sources', () => {
    for (const grade of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])
      expect(curriculum).toContain(grade);
    for (const field of ['f_locomotion', 'f_fundamentals', 'f_structuring'])
      expect(curriculum).toContain(field);
    expect(page).toContain('COMPLETE_ANNUAL_CURRICULUM');
    expect(page).toContain('ANNUAL_PLAN_REFERENCE');
    expect(annual).toContain('ANNUAL_PLAN_REFERENCE');
  });

  it('keeps curriculum reads and overrides protected and separate', () => {
    expect(workspace).toContain("pathname === '/admin/curriculum'");
    expect(workspace).toContain('AdminCurriculumPage');
    expect(router).toContain('/admin/curriculum/overrides');
    expect(router).toContain("get('/admin/curriculum/overrides', requireRole('admin')");
    expect(router).toContain('prisma.annualPlan.findMany');
    expect(page).toContain('TEACHER_OVERRIDE');
    expect(page).not.toContain('onChangeText');
    expect(page).not.toContain('saveAnnualPlan');
  });

  it('provides the required read-only sections and diagnostics', () => {
    for (const label of [
      'بنية المنهاج',
      'المخطط السنوي المرجعي',
      'المقاطع التعلمية',
      'الأهداف والكفاءات',
      'تشخيص التغطية البيداغوجية',
      'تخصيصات الأساتذة',
      'معلومات النسخة والمرجع',
    ])
      expect(page).toContain(label);
    expect(page).toContain('buildKnowledgeCoverage');
    expect(page).toContain('EMPTY');
    expect(page).toContain('LOW');
    expect(page).toContain('ADEQUATE');
    expect(page).toContain('مرجع رسمي');
  });
});
