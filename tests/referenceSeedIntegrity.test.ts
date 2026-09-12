import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  auditReferenceSeedOwnership,
  type ReferenceSeedRecord,
} from '../src/server/referenceSeedIntegrity';

const record = (id: string, overrides: Partial<ReferenceSeedRecord> = {}): ReferenceSeedRecord => ({
  id,
  externalId: id,
  name: `Situation ${id}`,
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'locomotion',
  objectiveIds: ['objective-1'],
  objectiveTexts: ['objective'],
  sourceGoal: 'goal',
  organization: 'organization',
  equipment: ['cones'],
  variations: null,
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  ...overrides,
});

const expected = Array.from({ length: 150 }, (_, index) => record(`seed-${index + 1}`));

describe('reference educational situation seed ownership', () => {
  it('accepts the empty database as 150 expected seed-owned IDs', () => {
    const audit = auditReferenceSeedOwnership(expected, []);
    expect(audit.expectedSeedIds).toHaveLength(150);
    expect(audit.missingIds).toHaveLength(150);
    expect(audit.exactIds).toHaveLength(0);
    expect(audit.conflictingIds).toHaveLength(0);
  });

  it('accepts exactly 150 exact seed-owned rows', () => {
    const audit = auditReferenceSeedOwnership(expected, expected);
    expect(audit.exactIds).toHaveLength(150);
    expect(audit.missingIds).toHaveLength(0);
    expect(audit.conflictingIds).toHaveLength(0);
  });

  it('ignores unrelated imported rows, including a production-like 338-row reference origin', () => {
    const extras = Array.from({ length: 188 }, (_, index) => record(`imported-${index + 1}`));
    const audit = auditReferenceSeedOwnership(expected, [...expected, ...extras]);
    expect(audit.exactIds).toHaveLength(150);
    expect(audit.missingIds).toHaveLength(0);
    expect(audit.conflictingIds).toHaveLength(0);
  });

  it('continues to tolerate hundreds of unrelated G1/G2/G3 rows', () => {
    const extras = Array.from({ length: 487 }, (_, index) => record(`historical-${index + 1}`));
    const audit = auditReferenceSeedOwnership(expected, [...expected, ...extras]);
    expect(audit.exactIds).toHaveLength(150);
    expect(audit.missingIds).toHaveLength(0);
  });

  it('reports missing seed-owned IDs without treating unrelated rows as missing', () => {
    const audit = auditReferenceSeedOwnership(expected, expected.slice(1));
    expect(audit.missingIds).toEqual(['seed-1']);
    expect(audit.conflictingIds).toHaveLength(0);
  });

  it('reports a conflicting seed-owned ID before any seed write', () => {
    const existing = [...expected.slice(1), record('seed-1', { name: 'conflict' })];
    const audit = auditReferenceSeedOwnership(expected, existing);
    expect(audit.conflictingIds).toEqual(['seed-1']);
  });

  it('is idempotent for the same seed-owned dataset', () => {
    const first = auditReferenceSeedOwnership(expected, expected);
    const second = auditReferenceSeedOwnership(expected, expected);
    expect(second).toEqual(first);
  });

  it('does not use a global EducationalSituation count or delete unrelated data', () => {
    const source = fs.readFileSync('prisma/seed.ts', 'utf8');
    const start = source.indexOf('async function seedEducationalSituations()');
    const end = source.indexOf('async function main()', start);
    const educationalSeedSource = source.slice(start, end);
    expect(educationalSeedSource).not.toContain(
      "educationalSituation.count({ where: { origin: 'REFERENCE_SEED' } })"
    );
    expect(educationalSeedSource).not.toContain('deleteMany');
    expect(educationalSeedSource).not.toContain('truncate');
  });
});
