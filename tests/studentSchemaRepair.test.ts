import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync('prisma/migrations/20260823200000_repair_student_roster_schema/migration.sql', 'utf8');
const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');
const oldMigration = readFileSync('prisma/migrations/20260823120000_student_roster_import/migration.sql', 'utf8');

describe('student roster schema repair', () => {
  it('creates the exact quoted roster tables and identity constraint', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "Student"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "StudentClass"');
    expect(migration).toContain('"Student_institutionId_matricule_key"');
    expect(migration).toContain('"StudentClass_teacherId_fkey"');
  });

  it('is forward-only and non-destructive', () => {
    expect(migration).not.toMatch(/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
    expect(oldMigration).toContain('CREATE TABLE "StudentClass"');
  });

  it('maps missing roster schema errors to a safe import response', () => {
    expect(apiRouter).toContain("error as { code?: string })?.code === 'P2021'");
    expect(apiRouter).toContain('قاعدة بيانات قوائم التلاميذ غير مهيأة بعد');
  });
});
