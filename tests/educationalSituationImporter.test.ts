import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  authorizeImportEnvironment,
  canonicalPayloadHash,
  G2_PAYLOAD_SHA256,
  importBatch,
  isDirectExecution,
  loadG2ImportPayload,
  loadImportPayload,
  PRODUCTION_IMPORT_CONFIRMATION,
  validateImportPayload,
  validateG2ImportPayload,
} from '../scripts/importEducationalSituationBank';

describe('educational situation importer validation', () => {
  it('recognizes direct execution across Windows and POSIX path formats', () => {
    expect(
      isDirectExecution(
        'file:///D:/arenaspex/scripts/importEducationalSituationBank.ts',
        'D:\\arenaspex\\scripts\\importEducationalSituationBank.ts'
      )
    ).toBe(process.platform === 'win32');
    const currentFile = path.resolve('scripts/importEducationalSituationBank.ts');
    expect(isDirectExecution(pathToFileURL(currentFile).href, currentFile)).toBe(true);
    expect(
      isDirectExecution(pathToFileURL(currentFile).href, path.resolve('scripts/other.ts'))
    ).toBe(false);
    expect(isDirectExecution(pathToFileURL(currentFile).href)).toBe(false);
  });
  const base = {
    ALLOW_EDUCATIONAL_SITUATION_IMPORT: 'true',
    ARENASPEX_IMPORT_ENVIRONMENT: 'staging',
    ARENASPEX_IMPORT_DATABASE_MARKER: 'arenaspex-staging',
  } as NodeJS.ProcessEnv;

  it('keeps staging authorization separate from production authorization', () => {
    expect(() => authorizeImportEnvironment(base)).not.toThrow();
    expect(() =>
      authorizeImportEnvironment({ ...base, ARENASPEX_IMPORT_ENVIRONMENT: 'production' })
    ).toThrow();
    expect(() =>
      authorizeImportEnvironment({
        ...base,
        ARENASPEX_IMPORT_DATABASE_MARKER: 'arenaspex-production',
      })
    ).toThrow();
  });

  it('requires every independent production authorization condition', () => {
    const production = {
      ...base,
      ARENASPEX_IMPORT_ENVIRONMENT: 'production',
      ARENASPEX_IMPORT_DATABASE_MARKER: 'arenaspex-production',
      ALLOW_EDUCATIONAL_SITUATION_PRODUCTION_IMPORT: 'true',
      ARENASPEX_PRODUCTION_IMPORT_CONFIRMATION: PRODUCTION_IMPORT_CONFIRMATION,
      ARENASPEX_VERIFIED_NEON_PROJECT: 'mute-paper-46197165',
      ARENASPEX_VERIFIED_NEON_BRANCH: 'production',
      ARENASPEX_VERIFIED_NEON_DATABASE: 'neondb',
    } as NodeJS.ProcessEnv;
    expect(() => authorizeImportEnvironment(production)).not.toThrow();
    for (const key of [
      'ALLOW_EDUCATIONAL_SITUATION_PRODUCTION_IMPORT',
      'ARENASPEX_PRODUCTION_IMPORT_CONFIRMATION',
      'ARENASPEX_VERIFIED_NEON_PROJECT',
      'ARENASPEX_VERIFIED_NEON_BRANCH',
      'ARENASPEX_VERIFIED_NEON_DATABASE',
    ]) {
      const missing = { ...production };
      delete missing[key];
      expect(() => authorizeImportEnvironment(missing)).toThrow();
    }
    expect(() =>
      authorizeImportEnvironment({
        ...production,
        ARENASPEX_PRODUCTION_IMPORT_CONFIRMATION: 'wrong',
      })
    ).toThrow();
    expect(() =>
      authorizeImportEnvironment({
        ...production,
        ARENASPEX_VERIFIED_NEON_BRANCH: 'arenaspex-staging',
      })
    ).toThrow();
  });

  it('uses bounded transaction limits for the finite staging import', () => {
    const source = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
    expect(source).toContain('maxWait: 10_000');
    expect(source).toContain('timeout: 120_000');
  });
  it('accepts the hardened payload shape and approved counts', () =>
    expect(() => validateImportPayload(loadImportPayload())).not.toThrow());

  it('accepts the locked authored G2 payload and its canonical hash', () => {
    const raw = JSON.parse(
      fs.readFileSync('tmp/g2-b6-1-4-import-payload/G2_B6_1_4_FINAL_IMPORT_PAYLOAD.json', 'utf8')
    );
    expect(importBatch({ ARENASPEX_SITUATION_IMPORT_BATCH: 'g2-authored-enrichment-v1' })).toBe(
      'g2-authored-enrichment-v1'
    );
    expect(canonicalPayloadHash(raw)).toBe(G2_PAYLOAD_SHA256);
    expect(() => validateG2ImportPayload(loadG2ImportPayload(), G2_PAYLOAD_SHA256)).not.toThrow();
  });

  it('rejects G2 governance, relation, count, and duplicate violations', () => {
    const payload = loadG2ImportPayload();
    expect(() =>
      validateG2ImportPayload({ ...payload, situations: payload.situations.slice(0, 31) })
    ).toThrow(/32\/32\/0\/0\/0/);
    expect(() =>
      validateG2ImportPayload({ ...payload, occurrences: [{ id: 'unexpected' }] })
    ).toThrow(/32\/32\/0\/0\/0/);
    expect(() =>
      validateG2ImportPayload({
        ...payload,
        situations: payload.situations.map((x, i) =>
          i === 1 ? { ...x, id: payload.situations[0].id } : x
        ),
      })
    ).toThrow(/Duplicate deterministic/);
    expect(() =>
      validateG2ImportPayload({
        ...payload,
        situations: payload.situations.map((x, i) =>
          i === 0 ? { ...x, approvalStatus: 'PENDING_REVIEW' } : x
        ),
      })
    ).toThrow(/governance/);
    expect(() =>
      validateG2ImportPayload({
        ...payload,
        objectives: payload.objectives.map((x, i) =>
          i === 0 ? { ...x, relationType: 'SUPPORTIVE' } : x
        ),
      })
    ).toThrow(/not DIRECT/);
    expect(() => validateG2ImportPayload(payload, 'WRONG')).toThrow(/SHA-256/);
  });
  it('rejects duplicate situation IDs and duplicate relation keys', () => {
    const payload = loadImportPayload();
    expect(() =>
      validateImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === 1 ? { ...row, id: payload.situations[0].id } : row
        ),
      })
    ).toThrow(/Duplicate deterministic situation ID/);
    expect(() =>
      validateImportPayload({
        ...payload,
        objectives: payload.objectives.map((row, index) =>
          index === 1
            ? {
                ...row,
                situationId: payload.objectives[0].situationId,
                objectiveId: payload.objectives[0].objectiveId,
              }
            : row
        ),
      })
    ).toThrow(/Duplicate situation\/objective relation key/);
  });
});
