import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Inspector workspace information architecture', () => {
  it('defines role-specific Inspector routes and navigation entries', () => {
    const routes = read('src/lib/routes.ts');
    const sidebar = read('src/components/layout/Sidebar.tsx');
    for (const pathName of [
      '/inspector/teachers',
      '/inspector/approvals',
      '/inspector/visits',
      '/inspector/curriculum-audit',
      '/inspector/guidance',
      '/inspector/communication',
    ])
      expect(routes).toContain(pathName);
    expect(sidebar).toContain("label: 'الأساتذة'");
    expect(sidebar).toContain('مراجعة الموارد');
    expect(sidebar).toContain('التواصل المباشر مع الأستاذ');
    const inspectorBlock = sidebar.slice(
      sidebar.indexOf("if (userRole === 'inspector')"),
      sidebar.indexOf("if (userRole === 'director')")
    );
    expect(inspectorBlock).not.toContain("label: 'التواصل المهني'");
  });

  it('keeps dedicated modules separate from the home dashboard', () => {
    const page = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    expect(page).toContain('InspectorPendingAssignments');
    expect(page).toContain('InspectorResourceValidationView');
    expect(page).toContain('InspectorReportsView');
    expect(page).toContain('InspectorCurriculumAuditView');
    expect(page).toContain('InspectorBroadcastsView');
    expect(page).toContain('InspectorDirectChat');
    expect(read('src/App.tsx')).toContain('InspectorWorkspacePage');
  });

  it('keeps the accepted assignment roster server-authoritative', () => {
    const source = read('src/server/assignmentRouter.ts');
    expect(source).toContain("status: { in: ['Active', 'Changed'] }");
    expect(source).toContain('req.user!.id');
  });
});
