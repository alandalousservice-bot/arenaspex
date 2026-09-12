import { describe, expect, it } from 'vitest';
import { SituationObjectiveRelationType } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  authorizeImportEnvironment,
  canonicalPayloadHash,
  deterministicSituationObjectiveId,
  G2_PAYLOAD_SHA256,
  G3_B1_BUNDLE_SHA256,
  G3_PAYLOAD_PATH,
  G3_PAYLOAD_SHA256,
  G4_B3_BUNDLE_SHA256,
  G4_PAYLOAD_PATH,
  G4_PAYLOAD_SHA256,
  G4_V2_PAYLOAD_PATH,
  G4_V2_PAYLOAD_SHA256,
  G5_PAYLOAD_PATH,
  G5_PAYLOAD_SHA256,
  buildG3ImportPlan,
  buildG4V2PayloadFromV1,
  g2DomainForObjective,
  importBatch,
  isDirectExecution,
  loadG2ImportPayload,
  loadImportPayload,
  serializeObservationIndicators,
  toSituationObjectiveWriteInput,
  validateG2SituationWriteInputs,
  validateSituationObjectiveWriteInputs,
  PRODUCTION_IMPORT_CONFIRMATION,
  validateImportPayload,
  validateG2ImportPayload,
  validateG3ImportPayload,
  loadG3ImportPayload,
  loadG4ImportPayload,
  loadG4V2ImportPayload,
  loadG5ImportPayload,
  validateG4ImportPayload,
  validateG4V2ImportPayload,
  validateG5ImportPayload,
  toG4V2SituationObjectiveWriteInput,
} from '../scripts/importEducationalSituationBank';
import {
  findSuitableSituations,
  hasOrdinaryLearningRelation,
} from '../src/services/educationalSituation.selector.service';

const runLocalDryRun = (batch: string) =>
  execFileSync(
    process.execPath,
    ['node_modules/tsx/dist/cli.mjs', 'scripts/importEducationalSituationBank.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ALLOW_EDUCATIONAL_SITUATION_IMPORT: 'true',
        ARENASPEX_IMPORT_ENVIRONMENT: 'staging',
        ARENASPEX_IMPORT_DATABASE_MARKER: 'arenaspex-test',
        ARENASPEX_SITUATION_IMPORT_BATCH: batch,
        ARENASPEX_IMPORT_DRY_RUN: 'true',
      },
      encoding: 'utf8',
    }
  );

describe('educational situation importer validation', () => {
  it('loads and validates the locked G4 payload from its exact path', () => {
    const payload = loadG4ImportPayload();
    expect(G4_PAYLOAD_PATH).toBe('tmp/g4-end-to-end/G4_B4_FINAL_IMPORT_PAYLOAD.json');
    expect(payload.metadata).toMatchObject({
      payloadVersion: 'g4-production-v1',
      payloadKind: 'G4_EDUCATIONAL_SITUATION_IMPORT',
      gradeId: 'lvl_p4',
      generatedFromBundleSha256: G4_B3_BUNDLE_SHA256,
    });
    expect(payload.payloadSha256).toBe(G4_PAYLOAD_SHA256);
    expect(() => validateG4ImportPayload(payload, G4_PAYLOAD_SHA256)).not.toThrow();
    expect(payload.situations).toHaveLength(79);
    expect(payload.objectives).toHaveLength(165);
    expect(payload.occurrences).toHaveLength(58);
  });

  it('rejects G4 metadata drift before the write boundary', () => {
    const payload = loadG4ImportPayload();
    expect(() =>
      validateG4ImportPayload({
        ...payload,
        metadata: { ...payload.metadata, gradeId: 'lvl_p3' },
      })
    ).toThrow(/metadata mismatch/i);
  });

  it('preserves G4 assessment relations and rejects authored occurrences', () => {
    const payload = loadG4ImportPayload();
    expect(payload.objectives.filter((row) => row.relationType === 'ASSESSMENT')).toHaveLength(64);
    const authored = payload.situations.find((row) => row.kind === 'AUTHORED')!;
    expect(() =>
      validateG4ImportPayload({
        ...payload,
        occurrences: [
          ...payload.occurrences.slice(0, -1),
          {
            id: `occurrence:lvl_p4:${authored.domainId}:${authored.id}`,
            situationId: authored.id,
            sourceDomain: authored.domainId,
          },
        ],
      })
    ).toThrow(/authored G4 source occurrence/i);
  });

  it('accepts and preserves the first-class ASSESSMENT relation without coercion', () => {
    const row = {
      id: 'relation:assessment-situation:G3-D1-OBJ-01',
      situationId: 'assessment-situation',
      objectiveId: 'G3-D1-OBJ-01',
      relationType: 'ASSESSMENT',
    };
    expect(SituationObjectiveRelationType.ASSESSMENT).toBe('ASSESSMENT');
    expect(toSituationObjectiveWriteInput(row).relationType).toBe('ASSESSMENT');
    expect(validateSituationObjectiveWriteInputs([row])).toBeUndefined();
  });

  it('excludes assessment-only situations from ordinary learning selection while retaining mixed evidence', () => {
    const base = {
      name: 'test',
      grade: 3,
      fieldId: 'f_locomotion',
      fieldName: 'field',
      objectiveIds: ['G3-D1-OBJ-01'],
      objectiveTexts: ['objective'],
      sourceGoal: '',
      organization: '',
      equipment: [],
      origin: 'REFERENCE_SEED' as const,
      status: 'APPROVED' as const,
      productionEligibility: 'AUTO_GENERATION_ELIGIBLE' as const,
    };
    expect(
      hasOrdinaryLearningRelation({ ...base, id: 'assessment-only', relationTypes: ['ASSESSMENT'] })
    ).toBe(false);
    expect(
      hasOrdinaryLearningRelation({
        ...base,
        id: 'mixed-evidence',
        relationTypes: ['ASSESSMENT', 'DIRECT'],
      })
    ).toBe(true);
    expect(hasOrdinaryLearningRelation({ ...base, id: 'legacy-without-relations' })).toBe(true);
    expect(
      findSuitableSituations(
        [
          { ...base, id: 'assessment-only', relationTypes: ['ASSESSMENT'] },
          { ...base, id: 'direct', relationTypes: ['DIRECT'] },
        ],
        {
          grade: 3,
          fieldId: 'f_locomotion',
          objectiveId: 'G3-D1-OBJ-01',
          objectiveText: 'objective',
        }
      ).map((item) => item.id)
    ).toEqual(['direct']);
  });
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
    expect(g2DomainForObjective('G2-D1-OBJ-01')).toBe('f_locomotion');
    expect(g2DomainForObjective('G2-D2-OBJ-05')).toBe('f_fundamentals');
    expect(g2DomainForObjective('G2-D3-OBJ-02')).toBe('f_structuring');
    expect(loadG2ImportPayload().situations.every((row) => row.fieldId && row.domainId)).toBe(true);
  });

  it('generates the existing deterministic relation-id convention for all G2 links', () => {
    const payload = loadG2ImportPayload();
    const relationIds = payload.objectives.map((row) => row.id);
    const situationIds = new Set(payload.situations.map((row) => row.id));

    expect(relationIds).toHaveLength(32);
    expect(relationIds.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(relationIds).size).toBe(32);
    expect(relationIds.some((id) => situationIds.has(id))).toBe(false);
    expect(
      payload.objectives.every(
        (row) => row.id === deterministicSituationObjectiveId(row.situationId, row.objectiveId)
      )
    ).toBe(true);
    expect(payload.objectives.every((row) => row.relationType === 'DIRECT')).toBe(true);
  });

  it('keeps G2 relation ids deterministic and independent of input order', () => {
    const first = loadG2ImportPayload().objectives;
    const second = loadG2ImportPayload().objectives;
    const reordered = [...first].reverse();
    const key = (row: (typeof first)[number]) => `${row.situationId}|${row.objectiveId}`;
    const ids = (rows: typeof first) => new Map(rows.map((row) => [key(row), row.id]));

    expect(ids(first)).toEqual(ids(second));
    expect(ids(first)).toEqual(ids(reordered));
  });

  it('rejects relation inputs without ids before the importer prewrite marker', () => {
    const payload = loadG2ImportPayload();
    const invalid = payload.objectives.map((row, index) =>
      index === 0 ? { ...row, id: undefined } : row
    );

    expect(() => validateSituationObjectiveWriteInputs(invalid)).toThrow(
      /Invalid SituationObjective write input/
    );
    expect(() => validateG2ImportPayload({ ...payload, objectives: invalid })).toThrow(
      /Invalid SituationObjective write input/
    );
  });

  it('validates every generated G2 relation against the Prisma write contract', () => {
    const payload = loadG2ImportPayload();

    expect(() => validateG2SituationWriteInputs(payload.situations)).not.toThrow();
    expect(() => validateSituationObjectiveWriteInputs(payload.objectives)).not.toThrow();
    expect(payload.objectives).toHaveLength(32);
    expect(payload.objectives.filter((row) => !row.id)).toHaveLength(0);
    expect(new Set(payload.objectives.map((row) => row.id)).size).toBe(32);
    expect(
      payload.objectives.filter(
        (row) => !payload.situations.some((situation) => situation.id === row.situationId)
      )
    ).toHaveLength(0);
    expect(
      payload.objectives.filter(
        (row) =>
          !payload.situations.some(
            (situation) =>
              situation.id === row.situationId && situation.canonicalObjectiveId === row.objectiveId
          )
      )
    ).toHaveLength(0);
  });

  it('preserves B3 relation ids and the locked G2 payload hash/counts', () => {
    const b3 = loadImportPayload();
    const g2 = loadG2ImportPayload();
    const rawG2 = JSON.parse(
      fs.readFileSync('tmp/g2-b6-1-4-import-payload/G2_B6_1_4_FINAL_IMPORT_PAYLOAD.json', 'utf8')
    );

    expect(b3.objectives[0].id).toBe(
      `relation:${b3.objectives[0].situationId}:${b3.objectives[0].objectiveId}`
    );
    expect(g2.situations).toHaveLength(32);
    expect(g2.objectives).toHaveLength(32);
    expect(g2.occurrences).toHaveLength(0);
    expect(g2.families).toHaveLength(0);
    expect(g2.media).toHaveLength(0);
    expect(canonicalPayloadHash(rawG2)).toBe(G2_PAYLOAD_SHA256);
  });

  it('serializes observation indicators losslessly for the existing String field', () => {
    const indicators = ['أول مؤشر', 'ثاني مؤشر'];
    const serialized = serializeObservationIndicators(indicators);
    expect(serialized).toBe(JSON.stringify(indicators));
    expect(JSON.parse(serialized!)).toEqual(indicators);
    expect(serializeObservationIndicators([])).toBeNull();
    expect(serializeObservationIndicators('legacy text')).toBe('legacy text');
    expect(
      loadG2ImportPayload().situations.every(
        (row) => typeof row.observationIndicators === 'string' || row.observationIndicators === null
      )
    ).toBe(false);
    expect(
      loadG2ImportPayload().situations.every(
        (row) => typeof serializeObservationIndicators(row.observationIndicators) === 'string'
      )
    ).toBe(true);
  });

  it('preserves the authoritative G2 difficulty through both write paths', () => {
    const payload = loadG2ImportPayload();
    const source = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
    const difficulties = payload.situations.map((row) => row.difficulty);

    expect(difficulties).toHaveLength(32);
    expect(difficulties.filter((value) => typeof value === 'string')).toHaveLength(32);
    expect(difficulties.filter((value) => value == null)).toHaveLength(0);
    expect(new Set(difficulties)).toEqual(new Set(['basic', 'controlled']));
    expect(
      payload.situations.filter(
        (row) => row.domainId === 'f_locomotion' && row.difficulty === 'basic'
      )
    ).toHaveLength(9);
    expect(
      payload.situations.filter(
        (row) => row.domainId === 'f_fundamentals' && row.difficulty === 'basic'
      )
    ).toHaveLength(4);
    expect(
      payload.situations.filter(
        (row) => row.domainId === 'f_structuring' && row.difficulty === 'basic'
      )
    ).toHaveLength(2);
    expect((source.match(/difficulty: row\.difficulty \?\? null/g) ?? []).length).toBe(3);
    expect(() => validateG2SituationWriteInputs(payload.situations)).not.toThrow();
    expect(() =>
      validateG2SituationWriteInputs(
        payload.situations.map((row, index) => (index === 0 ? { ...row, difficulty: 12 } : row))
      )
    ).toThrow(/difficulty/);
  });

  it('keeps the complete authored-field preservation audit closed', () => {
    const source = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
    for (const mapping of [
      'name: row.title',
      'grade: gradeNumber(row.gradeId)',
      'fieldId: row.fieldId ?? row.domainId',
      'fieldName: domainNames[row.domainId] ?? row.domainId',
      'objectiveIds: row.canonicalObjectiveId ? [row.canonicalObjectiveId] : []',
      'objectiveTexts: row.canonicalObjectiveText ? [row.canonicalObjectiveText] : []',
      'sourceGoal: row.title',
      "organization: row.description ?? ''",
      'equipment: row.equipment ?? []',
      "origin: row.provenance ?? 'REFERENCE_SEED'",
      'activityType: row.activityType',
      'approvalStatus: row.approvalStatus',
      'productionEligibility: row.productionEligibility',
      'lessonTypes: row.lessonTypes ?? []',
      'executionConditions: row.executionConditions',
      'successCriteria: row.successCriteria',
      'observationIndicators: serializeObservationIndicators(row.observationIndicators)',
      'motorActions: row.motorActions ?? []',
      'pedagogicalTags: row.pedagogicalTags ?? []',
      'difficulty: row.difficulty ?? null',
      'gradeId: row.gradeId',
      'domainId: row.domainId',
    ])
      expect(source).toContain(mapping);
    expect([]).toHaveLength(0);
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

describe('G3 production importer mode', () => {
  const payload = loadG3ImportPayload();

  it('resolves the exact locked payload path and SHA', () => {
    expect(G3_PAYLOAD_PATH).toBe('tmp/g3-b2-production-payload/G3_B2_FINAL_IMPORT_PAYLOAD.json');
    expect(importBatch({ ARENASPEX_SITUATION_IMPORT_BATCH: 'g3-production-v1' })).toBe(
      'g3-production-v1'
    );
    expect(payload.payloadSha256).toBe(G3_PAYLOAD_SHA256);
    expect(payload.metadata?.generatedFromBundleSha256).toBe(G3_B1_BUNDLE_SHA256);
  });

  it('accepts the exact metadata, counts, governance, and all four relation types', () => {
    expect(() => validateG3ImportPayload(payload, G3_PAYLOAD_SHA256)).not.toThrow();
    expect(payload.metadata).toMatchObject({
      payloadVersion: 'g3-production-v1',
      payloadKind: 'G3_EDUCATIONAL_SITUATION_IMPORT',
      gradeId: 'lvl_p3',
    });
    expect(payload.situations).toHaveLength(117);
    expect(payload.objectives).toHaveLength(273);
    expect(payload.occurrences).toHaveLength(90);
    expect(payload.objectives.filter((row) => row.relationType === 'DIRECT')).toHaveLength(93);
    expect(payload.objectives.filter((row) => row.relationType === 'SUPPORTIVE')).toHaveLength(76);
    expect(payload.objectives.filter((row) => row.relationType === 'INTEGRATIVE')).toHaveLength(62);
    expect(payload.objectives.filter((row) => row.relationType === 'ASSESSMENT')).toHaveLength(42);
    expect(payload.families).toHaveLength(0);
    expect(payload.familyMembers).toHaveLength(0);
    expect(payload.media).toHaveLength(0);
  });

  it('rejects wrong SHA, metadata, counts, and governance before prewrite', () => {
    expect(() => validateG3ImportPayload(payload, 'WRONG')).toThrow(/SHA-256/);
    expect(() =>
      validateG3ImportPayload({ ...payload, metadata: { ...payload.metadata, gradeId: 'lvl_p2' } })
    ).toThrow(/metadata/);
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        metadata: { ...payload.metadata, payloadKind: 'WRONG' },
      })
    ).toThrow(/metadata/);
    expect(() =>
      validateG3ImportPayload({ ...payload, situations: payload.situations.slice(0, 116) })
    ).toThrow(/117\/273\/90/);
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === 0 ? { ...row, productionEligibility: 'REVIEW_ONLY' } : row
        ),
      })
    ).toThrow(/governance/);
  });

  it('rejects invalid situation fields, difficulty, and double-stringified indicators', () => {
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === 0 ? { ...row, fieldId: undefined } : row
        ),
      })
    ).toThrow(/Invalid G3 EducationalSituation/);
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === 0 ? { ...row, fieldId: 'invalid-field' } : row
        ),
      })
    ).toThrow(/Invalid G3 EducationalSituation/);
    const authoredIndex = payload.situations.findIndex((row) => row.kind === 'AUTHORED');
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === authoredIndex ? { ...row, difficulty: null } : row
        ),
      })
    ).toThrow(/difficulty/);
    const indicatorIndex = payload.situations.findIndex(
      (row) => typeof row.observationIndicators === 'string'
    );
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        situations: payload.situations.map((row, index) =>
          index === indicatorIndex
            ? { ...row, observationIndicators: JSON.stringify(row.observationIndicators) }
            : row
        ),
      })
    ).toThrow(/double-stringified/);
    expect(() => validateG3ImportPayload(payload)).not.toThrow();
    expect(
      payload.situations.filter((row) => row.kind === 'SOURCE' && row.difficulty === null)
    ).toHaveLength(90);
  });

  it('preserves ASSESSMENT without coercion and rejects relation identity errors', () => {
    expect(payload.objectives.filter((row) => row.relationType === 'ASSESSMENT')).toHaveLength(42);
    expect(payload.objectives.filter((row) => row.relationship !== row.relationType)).toHaveLength(
      0
    );
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        objectives: payload.objectives.map((row, index) =>
          index === 0 ? { ...row, id: 'wrong-id' } : row
        ),
      })
    ).toThrow(/deterministic G3 relation ID/);
    expect(() =>
      validateG3ImportPayload({
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
    ).toThrow(/Duplicate (G3|SituationObjective)/);
  });

  it('rejects occurrence identity errors and authored occurrences', () => {
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        occurrences: payload.occurrences.map((row, index) =>
          index === 0 ? { ...row, id: 'wrong-occurrence' } : row
        ),
      })
    ).toThrow(/deterministic G3 occurrence ID/);
    const authored = payload.situations.find((row) => row.kind === 'AUTHORED');
    expect(authored).toBeDefined();
    expect(() =>
      validateG3ImportPayload({
        ...payload,
        occurrences: payload.occurrences.map((row, index) =>
          index === 0
            ? {
                ...row,
                id: `occurrence:lvl_p3:${authored!.domainId}:${authored!.id}`,
                situationId: authored!.id,
              }
            : row
        ),
      })
    ).toThrow(/Authored G3/);
    expect(() => validateG3ImportPayload({ ...payload, families: [{}] })).toThrow(/117\/273\/90/);
  });

  it('plans isolated dry-run creates, exact no-ops, and conflicts without writes', () => {
    const empty = buildG3ImportPlan({ situations: [], relations: [], occurrences: [] }, payload);
    expect(empty).toMatchObject({
      situations: { create: 117, noOp: 0, conflict: 0 },
      relations: { create: 273, noOp: 0, conflict: 0 },
      occurrences: { create: 90, noOp: 0, conflict: 0 },
      conflicts: [],
    });
    const exact = buildG3ImportPlan(
      {
        situations: payload.situations,
        relations: payload.objectives,
        occurrences: payload.occurrences,
      },
      payload
    );
    expect(exact).toMatchObject({
      situations: { create: 0, noOp: 117, conflict: 0 },
      relations: { create: 0, noOp: 273, conflict: 0 },
      occurrences: { create: 0, noOp: 90, conflict: 0 },
    });
    const conflict = buildG3ImportPlan(
      {
        situations: [{ ...payload.situations[0], name: 'conflict' }],
        relations: [],
        occurrences: [],
      },
      payload
    );
    expect(conflict.situations.conflict).toBe(1);
    expect(conflict.conflicts[0]).toContain(payload.situations[0].id);
  });

  it('keeps the production guard and transaction safety requirements', () => {
    const source = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
    expect(source).toContain("batch === 'g3-production-v1'");
    expect(source).toContain('await prisma.$transaction');
    expect(source).toContain('IMPORT_PREWRITE');
    expect(source).toContain('IMPORT_COMMIT_OK');
    expect(() =>
      authorizeImportEnvironment({
        ALLOW_EDUCATIONAL_SITUATION_IMPORT: 'true',
        ARENASPEX_IMPORT_ENVIRONMENT: 'production',
        ARENASPEX_IMPORT_DATABASE_MARKER: 'arenaspex-production',
      } as NodeJS.ProcessEnv)
    ).toThrow();
  });

  it('leaves the established B3 and G2 mode contracts unchanged', () => {
    expect(importBatch({ ARENASPEX_SITUATION_IMPORT_BATCH: 'b3-source-bank' })).toBe(
      'b3-source-bank'
    );
    expect(importBatch({ ARENASPEX_SITUATION_IMPORT_BATCH: 'g2-authored-enrichment-v1' })).toBe(
      'g2-authored-enrichment-v1'
    );
    expect(() => validateImportPayload(loadImportPayload())).not.toThrow();
    expect(() => validateG2ImportPayload(loadG2ImportPayload(), G2_PAYLOAD_SHA256)).not.toThrow();
  });

  it('keeps source and authored provenance counts exact', () => {
    expect(payload.situations.filter((row) => row.kind === 'SOURCE')).toHaveLength(90);
    expect(payload.situations.filter((row) => row.kind === 'AUTHORED')).toHaveLength(27);
    expect(
      payload.occurrences.every(
        (row) =>
          payload.situations.find((situation) => situation.id === row.situationId)?.kind ===
          'SOURCE'
      )
    ).toBe(true);
  });

  it('rejects an unknown relation type without coercion', () => {
    const invalid = {
      ...payload,
      objectives: payload.objectives.map((row, index) =>
        index === 0 ? { ...row, relationType: 'UNKNOWN' } : row
      ),
    };
    expect(() => validateG3ImportPayload(invalid)).toThrow(/SituationObjective|relation/i);
  });

  it('rejects relations that reference an unknown situation', () => {
    const invalid = {
      ...payload,
      objectives: payload.objectives.map((row, index) =>
        index === 0 ? { ...row, situationId: 'missing-g3-situation' } : row
      ),
    };
    expect(() => validateG3ImportPayload(invalid)).toThrow(/Unknown G3 relation situation/i);
  });
});

describe('G4 relation metadata contract v2', () => {
  const v1 = JSON.parse(fs.readFileSync(G4_PAYLOAD_PATH, 'utf8')) as Record<string, any>;
  const v2 = loadG4V2ImportPayload();

  it('loads the versioned payload and preserves the frozen v1 artifact', () => {
    expect(G4_V2_PAYLOAD_PATH).toBe(
      'tmp/g4-c6-relation-contract/G4_C6_FINAL_IMPORT_PAYLOAD_V2.json'
    );
    expect(v2.payloadSha256).toBe(G4_V2_PAYLOAD_SHA256);
    expect(() => validateG4V2ImportPayload(v2, G4_V2_PAYLOAD_SHA256)).not.toThrow();
    expect(v2.situations).toHaveLength(79);
    expect(v2.objectives).toHaveLength(165);
    expect(v2.occurrences).toHaveLength(58);
    expect(v2.metadata).toMatchObject({
      payloadVersion: 'g4-production-v2',
      derivedFromPayloadSha256: G4_PAYLOAD_SHA256,
    });
    expect(fs.readFileSync(G4_PAYLOAD_PATH, 'utf8')).toContain('g4-production-v1');
  });

  it('uses null only for non-quantitative confidence and preserves categorical semantics in evidence', () => {
    expect(v2.objectives.every((row) => row.confidence === null)).toBe(true);
    expect(
      v2.objectives.filter((row) => row.evidence.adjudicationBasis === 'ADJUDICATED')
    ).toHaveLength(144);
    expect(
      v2.objectives.filter((row) => row.evidence.adjudicationBasis === 'AUTHORED_DIRECT')
    ).toHaveLength(21);
    expect(v2.objectives.every((row) => typeof row.evidence.rationale === 'string')).toBe(true);
    expect(() => toG4V2SituationObjectiveWriteInput(v1.relations[0])).toThrow(
      /numeric.*confidence/i
    );
  });

  it('accepts numeric confidence and JSON evidence without coercion', () => {
    const row = {
      ...v2.objectives[0],
      confidence: 0.875,
      evidence: { nested: { source: 'review' }, values: [1, true, null] },
    };
    expect(toG4V2SituationObjectiveWriteInput(row)).toMatchObject(row);
    expect(() => toG4V2SituationObjectiveWriteInput({ ...row, confidence: 'ADJUDICATED' })).toThrow(
      /numeric.*confidence/i
    );
  });

  it('keeps relation identity, counts, split, and order stable from v1 to v2', () => {
    expect(v2.objectives.map((row) => row.id)).toEqual(v1.relations.map((row) => row.id));
    expect(v2.objectives.map((row) => `${row.situationId}|${row.objectiveId}`)).toEqual(
      v1.relations.map((row) => `${row.situationId}|${row.objectiveId}`)
    );
    expect(v2.objectives.filter((row) => row.relationType === 'DIRECT')).toHaveLength(72);
    expect(v2.objectives.filter((row) => row.relationType === 'INTEGRATIVE')).toHaveLength(29);
    expect(v2.objectives.filter((row) => row.relationType === 'ASSESSMENT')).toHaveLength(64);
    const first = `${JSON.stringify(buildG4V2PayloadFromV1(v1), null, 2)}\n`;
    const second = `${JSON.stringify(buildG4V2PayloadFromV1(v1), null, 2)}\n`;
    expect(first).toBe(second);
    expect(first).toBe(fs.readFileSync(G4_V2_PAYLOAD_PATH, 'utf8'));
  });

  it('plans exact v2 relations as no-ops and detects metadata conflicts', () => {
    const fields = ['id', 'situationId', 'objectiveId', 'relationType', 'confidence', 'evidence'];
    const plan = buildG3ImportPlan(
      { situations: v2.situations, relations: v2.objectives, occurrences: v2.occurrences },
      v2,
      fields
    );
    expect(plan).toMatchObject({ relations: { create: 0, noOp: 165, conflict: 0 } });
    const conflict = buildG3ImportPlan(
      {
        situations: v2.situations,
        relations: v2.objectives.map((row, index) =>
          index === 0 ? { ...row, evidence: { changed: true } } : row
        ),
        occurrences: v2.occurrences,
      },
      v2,
      fields
    );
    expect(conflict.relations.conflict).toBe(1);
  });
});

describe('importer lifecycle markers', () => {
  const importerSource = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
  const mainSource = importerSource.slice(importerSource.indexOf('async function main'));
  const markerLines = (output: string) =>
    output.split(/\r?\n/).filter((line) => line.startsWith('IMPORT_'));

  it('emits one PREWRITE marker in the G3 dry-run', () => {
    const lines = markerLines(runLocalDryRun('g3-production-v1'));
    expect(lines).toEqual([
      'IMPORT_START',
      'IMPORT_BATCH=g3-production-v1',
      'IMPORT_GUARD_OK',
      'IMPORT_PAYLOAD_OK',
      'IMPORT_PREWRITE',
      'IMPORT_DONE',
    ]);
  });

  it('does not emit COMMIT_OK in the G3 dry-run', () => {
    expect(runLocalDryRun('g3-production-v1')).not.toContain('IMPORT_COMMIT_OK');
  });

  it('reports the G3 dry-run plan with zero writes', () => {
    const output = runLocalDryRun('g3-production-v1');
    const result = JSON.parse(output.split(/\r?\n/).find((line) => line.startsWith('{'))!);
    expect(result.dryRun).toBe(true);
    expect(result.planned).toMatchObject({
      situations: { create: 117, noOp: 0, conflict: 0 },
      relations: { create: 273, noOp: 0, conflict: 0 },
      occurrences: { create: 90, noOp: 0, conflict: 0 },
    });
    expect(result).not.toHaveProperty('writes');
  });

  it('keeps PREWRITE before the mocked real-write call and COMMIT_OK after it', () => {
    const prewrite = mainSource.indexOf("console.log('IMPORT_PREWRITE')");
    const dryRun = mainSource.indexOf("if (process.env.ARENASPEX_IMPORT_DRY_RUN === 'true')");
    const writeCall = mainSource.indexOf('importEducationalSituationBank(prisma, payload)');
    const commit = mainSource.indexOf("console.log('IMPORT_COMMIT_OK')");
    const done = mainSource.lastIndexOf("console.log('IMPORT_DONE')");
    expect(prewrite).toBeGreaterThanOrEqual(0);
    expect(prewrite).toBeLessThan(dryRun);
    expect(dryRun).toBeLessThan(writeCall);
    expect(writeCall).toBeLessThan(commit);
    expect(commit).toBeLessThan(done);
  });

  it('rejects an invalid SHA before the lifecycle write boundary', () => {
    const payload = loadG3ImportPayload();
    expect(() => validateG3ImportPayload(payload, 'WRONG')).toThrow(/SHA-256/);
    expect(importerSource.indexOf('validateG3ImportPayload')).toBeLessThan(
      importerSource.indexOf("console.log('IMPORT_PREWRITE')")
    );
  });

  it('rejects an invalid payload before PREWRITE can be reached', () => {
    const payload = loadG3ImportPayload();
    expect(() =>
      validateG3ImportPayload({ ...payload, situations: payload.situations.slice(0, 116) })
    ).toThrow(/117\/273\/90/);
    expect(mainSource.indexOf('validateG3ImportPayload')).toBeLessThan(
      mainSource.indexOf("console.log('IMPORT_PREWRITE')")
    );
  });

  it('keeps guard failure before PREWRITE', () => {
    expect(() =>
      authorizeImportEnvironment({
        ALLOW_EDUCATIONAL_SITUATION_IMPORT: 'true',
        ARENASPEX_IMPORT_ENVIRONMENT: 'production',
        ARENASPEX_IMPORT_DATABASE_MARKER: 'wrong-marker',
      } as NodeJS.ProcessEnv)
    ).toThrow();
    expect(mainSource.indexOf('authorizeImportEnvironment()')).toBeLessThan(
      mainSource.indexOf("console.log('IMPORT_PREWRITE')")
    );
  });

  it('does not place COMMIT_OK on a failed post-PREWRITE path', () => {
    const writeCall = mainSource.indexOf('importEducationalSituationBank(prisma, payload)');
    const commit = mainSource.indexOf("console.log('IMPORT_COMMIT_OK')");
    expect(mainSource).toMatch(
      /try\s*\{\s*const result = await importEducationalSituationBank\(prisma, payload\)/
    );
    expect(mainSource).toContain('finally');
    expect(commit).toBeGreaterThan(writeCall);
  });

  it('keeps the B3 source-bank dry-run lifecycle compatible', () => {
    expect(markerLines(runLocalDryRun('b3-source-bank'))).toEqual([
      'IMPORT_START',
      'IMPORT_BATCH=b3-source-bank',
      'IMPORT_GUARD_OK',
      'IMPORT_PAYLOAD_OK',
      'IMPORT_PREWRITE',
      'IMPORT_DONE',
    ]);
  });

  it('keeps the G2 authored dry-run lifecycle compatible', () => {
    expect(markerLines(runLocalDryRun('g2-authored-enrichment-v1'))).toEqual([
      'IMPORT_START',
      'IMPORT_BATCH=g2-authored-enrichment-v1',
      'IMPORT_GUARD_OK',
      'IMPORT_PAYLOAD_OK',
      'IMPORT_PREWRITE',
      'IMPORT_DONE',
    ]);
  });

  it('emits the G4 dry-run lifecycle and plans the frozen payload without writes', () => {
    const lines = markerLines(runLocalDryRun('g4-production-v1'));
    expect(lines).toEqual([
      'IMPORT_START',
      'IMPORT_BATCH=g4-production-v1',
      'IMPORT_GUARD_OK',
      'IMPORT_PAYLOAD_OK',
      'IMPORT_PREWRITE',
      'IMPORT_DONE',
    ]);
    const output = runLocalDryRun('g4-production-v1');
    const result = JSON.parse(output.split(/\r?\n/).find((line) => line.startsWith('{'))!);
    expect(result.planned).toMatchObject({
      situations: { create: 79, noOp: 0, conflict: 0 },
      relations: { create: 165, noOp: 0, conflict: 0 },
      occurrences: { create: 58, noOp: 0, conflict: 0 },
    });
    expect(result).not.toHaveProperty('writes');
    expect(output).not.toContain('IMPORT_COMMIT_OK');
  });

  it('emits PREWRITE exactly once in the direct execution flow', () => {
    expect(mainSource.match(/console\.log\('IMPORT_PREWRITE'\)/g)).toHaveLength(1);
  });

  it('keeps lifecycle marker ordering deterministic', () => {
    const output = markerLines(runLocalDryRun('g3-production-v1'));
    expect(output.indexOf('IMPORT_START')).toBeLessThan(
      output.indexOf('IMPORT_BATCH=g3-production-v1')
    );
    expect(output.indexOf('IMPORT_BATCH=g3-production-v1')).toBeLessThan(
      output.indexOf('IMPORT_GUARD_OK')
    );
    expect(output.indexOf('IMPORT_GUARD_OK')).toBeLessThan(output.indexOf('IMPORT_PAYLOAD_OK'));
    expect(output.indexOf('IMPORT_PAYLOAD_OK')).toBeLessThan(output.indexOf('IMPORT_PREWRITE'));
    expect(output.indexOf('IMPORT_PREWRITE')).toBeLessThan(output.indexOf('IMPORT_DONE'));
  });
});

describe('G5 production importer contract', () => {
  const payload = loadG5ImportPayload();
  const source = fs.readFileSync('scripts/importEducationalSituationBank.ts', 'utf8');
  const replaceRelation = (patch: Record<string, unknown>) => ({
    ...payload,
    objectives: payload.objectives.map((row, index) => (index === 0 ? { ...row, ...patch } : row)),
  });

  it('recognizes g5-production-v1 and loads the exact payload path', () => {
    expect(importBatch({ ARENASPEX_SITUATION_IMPORT_BATCH: 'g5-production-v1' })).toBe(
      'g5-production-v1'
    );
    expect(G5_PAYLOAD_PATH).toBe('tmp/g5-end-to-end/G5_FINAL_IMPORT_PAYLOAD.json');
    expect(payload.metadata).toMatchObject({
      payloadVersion: 'g5-production-v1',
      payloadKind: 'G5_EDUCATIONAL_SITUATION_IMPORT',
      gradeId: 'lvl_p5',
    });
  });

  it('rejects a wrong payload version', () => {
    expect(() =>
      validateG5ImportPayload({
        ...payload,
        metadata: { ...payload.metadata, payloadVersion: 'g4-production-v1' },
      })
    ).toThrow(/metadata/i);
  });

  it('rejects a wrong grade', () => {
    expect(() =>
      validateG5ImportPayload({ ...payload, metadata: { ...payload.metadata, gradeId: 'lvl_p4' } })
    ).toThrow(/metadata/i);
  });

  it('rejects a SHA mismatch', () => {
    expect(() => validateG5ImportPayload(payload, 'WRONG')).toThrow(/SHA-256/i);
    expect(G5_PAYLOAD_SHA256).toMatch(/^[A-F0-9]{64}$/);
  });

  it('validates deterministic situation and relation IDs', () => {
    expect(() => validateG5ImportPayload(payload, G5_PAYLOAD_SHA256)).not.toThrow();
    expect(payload.situations.every((row) => row.id)).toBe(true);
    expect(
      payload.objectives.every((row) => row.id === `relation:${row.situationId}:${row.objectiveId}`)
    ).toBe(true);
  });

  it('accepts every canonical G5 objective ID in the frozen payload', () => {
    expect(new Set(payload.objectives.map((row) => row.objectiveId)).size).toBe(35);
  });

  it('rejects foreign objective IDs', () => {
    expect(() => validateG5ImportPayload(replaceRelation({ objectiveId: 'G4-D1-OBJ-01' }))).toThrow(
      /canonical objective/i
    );
  });

  it('rejects legacy session objective IDs', () => {
    expect(() =>
      validateG5ImportPayload(replaceRelation({ objectiveId: 'session:G5-D1-OBJ-01' }))
    ).toThrow(/canonical objective/i);
  });

  it('preserves DIRECT relations', () => {
    expect(payload.objectives.every((row) => row.relationType === 'DIRECT')).toBe(true);
  });

  it('supports SUPPORTIVE relations without coercion', () => {
    const modified = replaceRelation({ relationType: 'SUPPORTIVE' });
    modified.metadata = { ...modified.metadata, relationTypes: { DIRECT: 71, SUPPORTIVE: 1 } };
    expect(() => validateG5ImportPayload(modified)).not.toThrow();
    expect(modified.objectives[0].relationType).toBe('SUPPORTIVE');
  });

  it('supports INTEGRATIVE relations without coercion', () => {
    const modified = replaceRelation({ relationType: 'INTEGRATIVE' });
    modified.metadata = { ...modified.metadata, relationTypes: { DIRECT: 71, INTEGRATIVE: 1 } };
    expect(() => validateG5ImportPayload(modified)).not.toThrow();
    expect(modified.objectives[0].relationType).toBe('INTEGRATIVE');
  });

  it('supports ASSESSMENT relations without coercion', () => {
    const modified = replaceRelation({ relationType: 'ASSESSMENT' });
    modified.metadata = { ...modified.metadata, relationTypes: { DIRECT: 71, ASSESSMENT: 1 } };
    expect(() => validateG5ImportPayload(modified)).not.toThrow();
    expect(modified.objectives[0].relationType).toBe('ASSESSMENT');
  });

  it('preserves null confidence', () => {
    expect(payload.objectives.every((row) => row.confidence === null)).toBe(true);
  });

  it('supports numeric confidence', () => {
    expect(
      toG4V2SituationObjectiveWriteInput({ ...payload.objectives[0], confidence: 0.9 })
    ).toMatchObject({ confidence: 0.9 });
  });

  it('rejects string confidence', () => {
    expect(() =>
      toG4V2SituationObjectiveWriteInput({ ...payload.objectives[0], confidence: 'ADJUDICATED' })
    ).toThrow(/numeric.*confidence/i);
  });

  it('requires evidence as an object and preserves it exactly', () => {
    const evidence = { adjudicationBasis: 'ADJUDICATED', nested: { reviewed: true } };
    const row = toG4V2SituationObjectiveWriteInput({ ...payload.objectives[0], evidence });
    expect(row.evidence).toEqual(evidence);
    expect(() => validateG5ImportPayload(replaceRelation({ evidence: 'stringified' }))).toThrow(
      /evidence/i
    );
  });

  it('preserves evidence.adjudicationBasis', () => {
    expect(payload.objectives.map((row) => row.evidence.adjudicationBasis)).toEqual(
      expect.arrayContaining(['ADJUDICATED', 'AUTHORED_DIRECT'])
    );
  });

  it('detects exact evidence conflicts in import planning', () => {
    const fields = ['id', 'situationId', 'objectiveId', 'relationType', 'confidence', 'evidence'];
    const exact = buildG3ImportPlan(
      {
        situations: payload.situations,
        relations: payload.objectives,
        occurrences: payload.occurrences,
      },
      payload,
      fields
    );
    expect(exact.relations.conflict).toBe(0);
    const conflict = buildG3ImportPlan(
      {
        situations: payload.situations,
        relations: payload.objectives.map((row, index) =>
          index === 0 ? { ...row, evidence: { changed: true } } : row
        ),
        occurrences: payload.occurrences,
      },
      payload,
      fields
    );
    expect(conflict.relations.conflict).toBe(1);
  });

  it('round-trips observationIndicators without double stringification', () => {
    const authored = payload.situations.find((row) => row.kind === 'AUTHORED')!;
    expect(typeof authored.observationIndicators).toBe('string');
    expect(authored.observationIndicators).not.toMatch(/^\s*"\[/);
    expect(
      payload.situations
        .filter((row) => row.kind === 'SOURCE')
        .every((row) => row.observationIndicators === null)
    ).toBe(true);
  });

  it('round-trips source and authored difficulty according to contract', () => {
    expect(
      payload.situations
        .filter((row) => row.kind === 'SOURCE')
        .every((row) => row.difficulty === null)
    ).toBe(true);
    expect(
      payload.situations
        .filter((row) => row.kind === 'AUTHORED')
        .every((row) => typeof row.difficulty === 'string')
    ).toBe(true);
  });

  it('preserves exact fieldId and domainId', () => {
    expect(payload.situations.every((row) => row.fieldId === row.domainId)).toBe(true);
    expect(new Set(payload.situations.map((row) => row.fieldId))).toEqual(
      new Set(['f_locomotion', 'f_fundamentals', 'f_structuring'])
    );
  });

  it('preserves source and authored provenance', () => {
    expect(
      payload.situations
        .filter((row) => row.kind === 'SOURCE')
        .every((row) => row.provenance === 'EXTRACTED_FROM_PROJECT_REFERENCE_DATASET')
    ).toBe(true);
    expect(
      payload.situations
        .filter((row) => row.kind === 'AUTHORED')
        .every((row) => row.provenance === 'AUTHORED_FOR_ARENASPEX')
    ).toBe(true);
  });

  it('preserves governance and activity type', () => {
    expect(payload.metadata.governanceCounts).toEqual({
      AUTO_GENERATION_ELIGIBLE: 42,
      SOURCE_ARCHIVE_ONLY: 30,
    });
    expect(
      payload.situations
        .filter((row) => row.kind === 'SOURCE')
        .every((row) => row.activityType === 'GAME')
    ).toBe(true);
    expect(
      payload.situations
        .filter((row) => row.kind === 'AUTHORED')
        .every((row) => row.activityType === 'PEDAGOGICAL_ACTIVITY')
    ).toBe(true);
  });

  it('validates deterministic source occurrence IDs and excludes authored occurrences', () => {
    expect(
      payload.occurrences.every(
        (row) => row.id === `occurrence:lvl_p5:${row.sourceDomain}:${row.situationId}`
      )
    ).toBe(true);
    expect(
      payload.occurrences.every(
        (row) =>
          !payload.situations.find((s) => s.id === row.situationId)?.kind ||
          payload.situations.find((s) => s.id === row.situationId)?.kind === 'SOURCE'
      )
    ).toBe(true);
  });

  it('gives authored situations no fabricated source occurrence', () => {
    const authoredIds = new Set(
      payload.situations.filter((row) => row.kind === 'AUTHORED').map((row) => row.id)
    );
    expect(payload.occurrences.some((row) => authoredIds.has(row.situationId))).toBe(false);
  });

  it('runs g5 dry-run with zero writes', () => {
    const output = runLocalDryRun('g5-production-v1');
    expect(output).not.toContain('IMPORT_COMMIT_OK');
    expect(output).toContain('"dryRun":true');
  });

  it('emits the required dry-run lifecycle in order', () => {
    expect(
      runLocalDryRun('g5-production-v1')
        .split(/\r?\n/)
        .filter((line) => line.startsWith('IMPORT_'))
    ).toEqual([
      'IMPORT_START',
      'IMPORT_BATCH=g5-production-v1',
      'IMPORT_GUARD_OK',
      'IMPORT_PAYLOAD_OK',
      'IMPORT_PREWRITE',
      'IMPORT_DONE',
    ]);
  });

  it('keeps the transaction boundary in the real import path', () => {
    expect(source).toContain('await prisma.$transaction');
    expect(source).toContain("console.log('IMPORT_COMMIT_OK')");
  });

  it('plans an exact existing payload as no-ops', () => {
    const fields = ['id', 'situationId', 'objectiveId', 'relationType', 'confidence', 'evidence'];
    expect(
      buildG3ImportPlan(
        {
          situations: payload.situations,
          relations: payload.objectives,
          occurrences: payload.occurrences,
        },
        payload,
        fields
      )
    ).toMatchObject({
      situations: { noOp: 72, conflict: 0 },
      relations: { noOp: 72, conflict: 0 },
      occurrences: { noOp: 30, conflict: 0 },
    });
  });

  it('detects situation conflicts before writing', () => {
    const fields = ['id', 'name', 'gradeId', 'domainId', 'activityType'];
    const conflict = buildG3ImportPlan(
      {
        situations: payload.situations.map((row, index) =>
          index === 0 ? { ...row, name: 'changed' } : row
        ),
        relations: [],
        occurrences: [],
      },
      payload,
      fields
    );
    expect(conflict.situations.conflict).toBe(1);
  });

  it('retains G4 v2 regression coverage', () => {
    expect(loadG4V2ImportPayload().metadata.payloadVersion).toBe('g4-production-v2');
    expect(() =>
      validateG4V2ImportPayload(loadG4V2ImportPayload(), G4_V2_PAYLOAD_SHA256)
    ).not.toThrow();
  });

  it('retains G4 v1 regression coverage', () => {
    expect(loadG4ImportPayload().metadata.payloadVersion).toBe('g4-production-v1');
    expect(() => validateG4ImportPayload(loadG4ImportPayload(), G4_PAYLOAD_SHA256)).not.toThrow();
  });

  it('retains G3 regression coverage', () => {
    expect(loadG3ImportPayload().metadata.payloadVersion).toBe('g3-production-v1');
    expect(() => validateG3ImportPayload(loadG3ImportPayload(), G3_PAYLOAD_SHA256)).not.toThrow();
  });

  it('retains G2 regression coverage', () => {
    expect(loadG2ImportPayload().situations).toHaveLength(32);
    expect(() => validateG2ImportPayload(loadG2ImportPayload(), G2_PAYLOAD_SHA256)).not.toThrow();
  });

  it('retains B3 source-bank regression coverage', () => {
    expect(loadImportPayload().situations.length).toBeGreaterThan(0);
    expect(() => validateImportPayload(loadImportPayload())).not.toThrow();
  });
});
