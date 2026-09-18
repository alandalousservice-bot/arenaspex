import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

describe('Inspector G6 control-center presentation contract', () => {
  it('keeps one coherent Inspector navigation without misleading authority labels', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    expect(sidebar).toContain("label: 'الأساتذة'");
    expect(sidebar).toContain("label: 'مراجعة الموارد'");
    expect(sidebar).toContain("label: 'الزيارات والتوجيه'");
    expect(sidebar).toContain("label: 'بنك المعرفة'");
    expect(sidebar).not.toContain('مركز اعتمادات الموارد');
    expect(sidebar).not.toContain('بنك المعرفة والاعتماد');
    const inspectorBlock = sidebar.slice(
      sidebar.indexOf("if (userRole === 'inspector')"),
      sidebar.indexOf("if (userRole === 'director')")
    );
    expect(inspectorBlock).not.toContain("label: 'التواصل المهني'");
  });

  it('preserves the shared routes and Inspector role workspace', () => {
    const routes = read('src/lib/routes.ts');
    const app = read('src/App.tsx');
    const workspace = read('src/components/dashboard/InspectorWorkspacePage.tsx');
    for (const route of [
      '/inspector',
      '/inspector/teachers',
      '/inspector/visits',
      '/inspector/communication',
    ])
      expect(routes).toContain(route);
    expect(app).toContain('InspectorWorkspacePage');
    expect(workspace).toContain('InspectorResourceValidationView');
    expect(workspace).toContain('InspectorReportsView');
    expect(workspace).not.toContain('اعتماد الموارد');
  });

  it('does not introduce export, approval, or fake settings controls', () => {
    const sidebar = read('src/components/layout/Sidebar.tsx');
    const settings = read('src/components/settings/SettingsView.tsx');
    const inspectorBlock = sidebar.slice(
      sidebar.indexOf("if (userRole === 'inspector')"),
      sidebar.indexOf("if (userRole === 'director')")
    );
    expect(inspectorBlock).not.toContain('التقارير والتصدير');
    expect(settings).not.toContain('إعدادات النظام');
  });
});
