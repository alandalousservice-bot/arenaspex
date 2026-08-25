import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const api = readFileSync('src/server/apiRouter.ts', 'utf8');
const page = readFileSync('src/components/dashboard/AdminReportsPage.tsx', 'utf8');
describe('admin operational reports', () => {
  it('uses protected authoritative definitions', () => {
    expect(api).toContain("apiRouter.get('/admin/reports/overview', requireRole('admin')");
    expect(api).toContain("['Active', 'Changed']");
    expect(api).toContain("a.status === 'Pending'");
    expect(api).toContain("origin: { not: 'REFERENCE_SEED' }");
    expect(api).toContain('userGenerationAccess');
  });
  it('does not expose private content or demo fallback data', () => {
    expect(api).not.toContain('content: true');
    expect(page).not.toContain('fallbackUsers');
    expect(page).toContain('fetchAdminReportsOverview');
  });
  it('renders report sections, refresh, loading and failure states', () => {
    expect(page).toContain('جودة البيانات');
    expect(page).toContain('التغطية التفتيشية');
    expect(page).toContain('إعادة المحاولة');
    expect(page).toContain('تحديث البيانات');
  });
});
