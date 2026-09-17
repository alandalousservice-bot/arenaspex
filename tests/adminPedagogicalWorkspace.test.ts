import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const routes = readFileSync('src/lib/routes.ts', 'utf8');
const approvals = readFileSync('src/components/dashboard/AdminApprovalsPage.tsx', 'utf8');
const knowledge = readFileSync('src/components/knowledge/KnowledgeEngineView.tsx', 'utf8');
const api = readFileSync('src/services/api.ts', 'utf8');

describe('Admin pedagogical workspace', () => {
  it('groups the three pedagogical responsibilities in the sidebar', () => {
    expect(sidebar).toContain('الإدارة البيداغوجية');
    expect(sidebar).toContain('المناهج والمراجع');
    expect(sidebar).toContain('بنك المعرفة');
    expect(sidebar).toContain('الاعتمادات والمراجعة');
  });
  it('preserves canonical routes and the single Admin approval backend', () => {
    expect(routes).toContain('/admin/curriculum');
    expect(routes).toContain('/admin/approvals');
    expect(approvals).toContain('fetchAdminModerationOverview');
    expect(approvals).toContain('reviewAdminModerationItem');
    expect(api).toContain('/api/admin/resource-approvals');
  });
  it('keeps the exact Knowledge Bank taxonomy without a games tab', () => {
    expect(knowledge).toContain('بنك الأهداف');
    expect(knowledge).toContain('الأنشطة العلاجية');
    expect(knowledge).toContain('المواقف التربوية');
    expect(knowledge).not.toContain("setActiveTab('game')");
  });
});
