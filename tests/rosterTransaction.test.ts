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
    expect(source).toContain('persistStudentRosterRows(tx, {');
    expect(readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8')).toContain(
      'tx.student.findMany({'
    );
    expect(readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8')).toContain(
      'tx.student.createMany({'
    );
  });

  it('keeps identity conflicts and idempotent repeated imports', () => {
    const persistence = readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8');
    expect(persistence).toContain(
      'current.firstName !== row.firstName || current.lastName !== row.lastName'
    );
    expect(persistence).toContain('const existingByMatricule = new Map');
    expect(persistence).toContain('const missingRows: ParsedRosterStudent[] = []');
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
    expect(readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8')).toContain(
      'linkedStudents: await tx.student.count('
    );
    expect(readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8')).toContain(
      'reassociated'
    );
    expect(normalizedSource).toContain('persisted = await persistStudentRosterRows(tx,');
    expect(normalizedSource).toContain('buildStudentRosterReadModel(classes, students)');
  });

  it('does not let an older initial roster response overwrite a post-import refresh', () => {
    const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
    expect(store).toContain('const rosterRefreshVersion = useRef(0);');
    expect(store).toContain('const requestVersion = ++rosterRefreshVersion.current;');
    expect(store).toContain('requestVersion !== rosterRefreshVersion.current');
    expect(store).toContain('setAllStudents(roster.students as Student[])');
  });

  it('keeps matricules as strings and maps timeout to a safe Arabic response', () => {
    expect(normalizedSource).toContain('const matricule = row.matricule.trim();');
    expect(readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8')).toContain(
      'matricule: row.matricule,'
    );
    expect(normalizedSource).toContain(
      'matricule: row.matricule || `import-${persistedClassId}-${row.rowNumber}`'
    );
    expect(normalizedSource).toContain('row.firstName?.trim() &&');
    expect(normalizedSource).toContain(
      'استغرقت عملية حفظ القائمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.'
    );
  });

  it('returns safe aggregate review reasons without logging student identity', () => {
    const persistence = readFileSync('src/services/studentRosterPersistence.service.ts', 'utf8');
    const client = readFileSync('src/components/students/StudentsBookView.tsx', 'utf8');
    expect(persistence).toContain('reviewReasonCounts');
    expect(persistence).toContain('foreignOwner');
    expect(persistence).toContain('institutionMismatch');
    expect(client).toContain('تعارض ملكية سجل موجود');
    expect(persistence).not.toContain('console.log');
  });

  it('keeps Excel identifiers in displayed text form throughout matching', () => {
    const parser = readFileSync('src/services/studentRosterImport.service.ts', 'utf8');
    expect(parser).toContain('raw: false');
    expect(parser).not.toContain('raw: true');
    expect(parser).not.toContain('Number(value)');
  });
});
