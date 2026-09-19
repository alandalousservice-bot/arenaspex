import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

describe('ADMIN-ACCOUNT-G1 mutation boundary', () => {
  it('keeps non-self account mutation Admin-only', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('if (!isSelf && !isManager)');
    expect(api).toContain("if (!isSelf && req.user!.role === 'inspector')");
    expect(api).toContain('privilegedAccountMutation');
  });

  it('separates privileged account fields from ordinary profile patches', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).toContain('buildUserWriteData(');
    expect(api).toContain('privilegedAccountMutation');
    expect(api).toContain('delete data.role');
    expect(api).toContain('delete data.status');
    expect(api).toContain('delete data.isApprovedByAdmin');
    expect(api).toContain('passwordHash');
    expect(api).not.toContain('data.passwordHash = input.passwordHash');
  });

  it('uses the explicit Admin client contract and preserves self profile sync', () => {
    const api = read('src/services/api.ts');
    const store = read('src/hooks/usePlatformStore.ts');
    expect(api).toContain('syncAdminUserToDB');
    expect(api).toContain('privilegedAccountMutation: true');
    expect(store).toContain('handleAdminUpdateUser');
    expect(store).toContain('syncUserToDB(updatedUser)');
  });

  it('does not add a pedagogical mutation path', () => {
    const api = read('src/server/apiRouter.ts');
    expect(api).not.toContain('TeacherObjective.update');
    expect(api).not.toContain('AnnualPlan.update');
    expect(api).not.toContain('StudentAttendance.update');
  });
});
