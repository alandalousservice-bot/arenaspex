import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/server/apiRouter.ts', 'utf8');
const normalizedSource = source.replace(/\s+/g, ' ');

describe('student roster persistence transaction', () => {
  it('uses a bounded production timeout instead of Prisma default 5s', () => {
    expect(source).toContain('maxWait: 10000, timeout: 25000');
    expect(source).toContain("code?: string })?.code === 'P2028'");
  });

  it('resolves the class once and performs a bulk matricule lookup', () => {
    expect(source.match(/studentClass\.findUnique\(/g)?.length).toBe(1);
    expect(normalizedSource).toContain(
      'tx.student.findMany({ where: { institutionId, matricule: { in: matricules } } })'
    );
    expect(source).toContain('tx.student.createMany({');
  });

  it('keeps identity conflicts and idempotent repeated imports', () => {
    expect(normalizedSource).toContain(
      'current.firstName !== row.firstName || current.lastName !== row.lastName'
    );
    expect(source).toContain('const existingByMatricule = new Map');
    expect(source).toContain('const missingRows: ParsedRosterStudent[] = []');
  });

  it('resolves a canonical owned class before writing student classId', () => {
    expect(normalizedSource).toContain(
      'tx.studentClass.findFirst({ where: { teacherId: req.user!.id, institutionId, levelId, name: className }'
    );
    expect(normalizedSource).toContain('const persistedClassId = assignedClass?.id || classId;');
    expect(normalizedSource).toContain('classId: persistedClassId');
    expect(normalizedSource).toContain('classId: summary.classId');
  });

  it('returns a committed roster count and exposes the shared read model', () => {
    expect(normalizedSource).toContain('const persistedStudents = await tx.student.count(');
    expect(normalizedSource).toContain('linkedStudents: persistedStudents');
    expect(normalizedSource).toContain('buildStudentRosterReadModel(classes, students)');
  });

  it('keeps matricules as strings and maps timeout to a safe Arabic response', () => {
    expect(normalizedSource).toContain('const matricule = row.matricule.trim();');
    expect(normalizedSource).toContain(
      'matricule: row.matricule || `import-${persistedClassId}-${row.rowNumber}`'
    );
    expect(normalizedSource).toContain('row.firstName?.trim() &&');
    expect(normalizedSource).toContain(
      'استغرقت عملية حفظ القائمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.'
    );
  });
});
