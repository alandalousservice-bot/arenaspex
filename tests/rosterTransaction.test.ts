import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('student roster persistence transaction', () => {
  it('uses a bounded production timeout instead of Prisma default 5s', () => {
    expect(source).toContain('maxWait: 10000, timeout: 25000');
    expect(source).toContain("code?: string })?.code === 'P2028'");
  });

  it('resolves the class once and performs a bulk matricule lookup', () => {
    expect(source.match(/studentClass\.findUnique\(/g)?.length).toBe(1);
    expect(source).toContain('tx.student.findMany({ where: { institutionId, matricule: { in: matricules } } })');
    expect(source).toContain('tx.student.createMany({');
  });

  it('keeps identity conflicts and idempotent repeated imports', () => {
    expect(source).toContain('current.firstName !== row.firstName || current.lastName !== row.lastName');
    expect(source).toContain('const existingByMatricule = new Map');
    expect(source).toContain('const missingRows: ParsedRosterStudent[] = []');
  });

  it('keeps matricules as strings and maps timeout to a safe Arabic response', () => {
    expect(source).toContain('const matricule = row.matricule.trim()');
    expect(source).toContain('استغرقت عملية حفظ القائمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.');
  });
});
