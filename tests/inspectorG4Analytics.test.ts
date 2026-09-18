import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Inspector G4 scoped analytics and reporting', () => {
  it('derives dashboard counts only from the inspector assignment and visit scope', () => {
    const router = read('src/server/assignmentRouter.ts');
    const dashboard = read('src/components/dashboard/InspectorDashboard.tsx');
    expect(router).toContain("'/inspector/summary'");
    expect(router).toContain("inspectorId, status: { in: ['Active', 'Changed'] }");
    expect(router).toContain('where: { inspectorId }');
    expect(router).not.toContain('pedagogicalGame.findMany({ select: { status: true } })');
    expect(router).not.toContain('educationalSituation.findMany({ select: { status: true } })');
    expect(dashboard).not.toContain('موارد بانتظار الاعتماد');
  });

  it('does not fabricate visit scores or performance percentages', () => {
    const reports = read('src/components/dashboard/inspector/InspectorReportsView.tsx');
    const dashboard = read('src/components/dashboard/InspectorDashboard.tsx');
    expect(reports).toContain('غير مسجلة');
    expect(reports).not.toContain("useState('4.5')");
    expect(reports).not.toContain("useState('8.5')");
    expect(reports).not.toContain("useState('4.0')");
    expect(reports).not.toContain('|| 16');
    expect(dashboard).not.toContain('%');
  });

  it('keeps report data assignment-scoped and preserves real print behavior', () => {
    const router = read('src/server/assignmentRouter.ts');
    const reports = read('src/components/dashboard/inspector/InspectorReportsView.tsx');
    expect(router).toContain('where: { inspectorId: req.user!.id, teacherId: { in: teacherIds } }');
    expect(reports).toContain('window.print()');
    expect(reports).toContain('visit.visitDate');
    expect(reports).toContain('visit.positivePoints');
  });
});
