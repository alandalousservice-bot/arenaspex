import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const settings = readFileSync('src/components/settings/SettingsView.tsx', 'utf8');
const router = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('role-specific inspector settings', () => {
  it('keeps teacher institution fields behind the teacher-only branch', () => {
    expect(settings).toContain('const isInspector = currentUser.role === \'inspector\';');
    expect(settings).toContain('{!isInspector && (');
    expect(settings).toContain('اسم المدرسة الابتدائية / مكان العمل');
    expect(settings).toContain('الانتساب الإداري والتفتيشي');
  });

  it('renders persisted administrative identifiers safely without defaults', () => {
    expect(settings).toContain("{directorateDisplayName}");
    expect(settings).toContain("{districtName || districtId || 'غير محددة'}");
    expect(settings).toContain("'غير محددة'");
    expect(settings).not.toContain("districtId || 'dist_setif_7'");
  });

  it('does not submit inspector-controlled affiliation fields', () => {
    expect(settings).toContain("...(isInspector ? {} : {");
    expect(router).toContain("if (isSelf && req.user!.role === 'inspector')");
    expect(router).toContain('delete user.directorateId');
    expect(router).toContain('delete user.districtId');
    expect(router).toContain('delete user.institutionId');
  });
});
