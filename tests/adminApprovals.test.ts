import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const router = readFileSync('src/server/apiRouter.ts', 'utf8');
const page = readFileSync('src/components/dashboard/AdminApprovalsPage.tsx', 'utf8');
const overview = readFileSync('src/components/dashboard/AdminOverview.tsx', 'utf8');
const workspace = readFileSync('src/components/dashboard/AdminWorkspacePage.tsx', 'utf8');

describe('unified admin resource approvals', () => {
  it('normalizes only real user-submitted game and situation lifecycles', () => {
    expect(router).toContain('/admin/resource-approvals');
    expect(router).toContain('prisma.pedagogicalGame.findMany');
    expect(router).toContain('prisma.educationalSituation.findMany');
    expect(router).toContain("origin: { not: 'REFERENCE_SEED' }");
    expect(router).toContain('status: { in: [...moderationStatuses] }');
    expect(router).toContain("source: 'USER_SUBMITTED_RESOURCE'");
    expect(router).not.toContain('model ResourceApproval');
  });

  it('protects transitions, reviewer identity, and rejection reasons server-side', () => {
    expect(router).toContain(
      "post('/admin/resource-approvals/:resourceType/:id/review', requireRole('admin')"
    );
    expect(router).toContain("status: 'PENDING_APPROVAL'");
    expect(router).toContain('req.user!.id');
    expect(router).toContain('سبب الرفض إلزامي');
    expect(router).toContain('updateMany');
    expect(router).toContain("'APPROVED'");
    expect(router).toContain("'REJECTED'");
  });

  it('provides queue controls, detail review, and synchronized overview counters', () => {
    for (const label of [
      'مركز اعتمادات الموارد',
      'بانتظار المراجعة',
      'معتمدة',
      'مرفوضة',
      'مراجعة',
      'اعتماد',
      'رفض',
    ])
      expect(page).toContain(label);
    expect(page).toContain('fetchAdminModerationOverview');
    expect(page).toContain('reviewAdminModerationItem');
    expect(overview).toContain('fetchAdminModerationOverview');
    expect(overview).toContain('value: moderationPendingCount');
    expect(workspace).toContain("pathname === '/admin/approvals'");
  });
});
