import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  authorizeImportEnvironment,
  isDirectExecution,
  loadImportPayload,
  PRODUCTION_IMPORT_CONFIRMATION,
  validateImportPayload,
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
