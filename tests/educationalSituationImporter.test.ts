import { describe, expect, it } from 'vitest';
import {
  loadImportPayload,
  validateImportPayload,
} from '../scripts/importEducationalSituationBank';

describe('educational situation importer validation', () => {
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
