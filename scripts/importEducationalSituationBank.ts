import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  PrismaClient,
  SituationActivityType,
  SituationApprovalStatus,
  SituationMediaClassification,
  SituationObjectiveRelationType,
  SituationProductionEligibility,
} from '@prisma/client';

export type ImportPayload = {
  situations: any[];
  objectives: any[];
  occurrences: any[];
  families: any[];
  familyMembers: any[];
  media: any[];
};

export type ImportBatch = 'b3-source-bank' | 'g2-authored-enrichment-v1';
export const G2_PAYLOAD_SHA256 = 'C6A7CF2471D502311C820F8F7C4EC0A55E855FBD52621C1BC7D0893BBFACEC7E';
export const G2_PAYLOAD_PATH = 'tmp/g2-b6-1-4-import-payload/G2_B6_1_4_FINAL_IMPORT_PAYLOAD.json';

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)])
    );
  }
  return value;
};
export const canonicalPayloadHash = (payload: unknown): string =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(stable(payload)))
    .digest('hex')
    .toUpperCase();

export function importBatch(env: NodeJS.ProcessEnv = process.env): ImportBatch {
  const value = env.ARENASPEX_SITUATION_IMPORT_BATCH;
  if (!value || value === 'b3-source-bank') return 'b3-source-bank';
  if (value === 'g2-authored-enrichment-v1') return value;
  throw new Error(`Import refused: unsupported batch ${value}.`);
}

const root = process.cwd();
const preview = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'tmp/situation-bank-b3-1', name), 'utf8'));

export function loadImportPayload(): ImportPayload {
  return {
    situations: preview('educational_situations_import_preview_hardened.json'),
    objectives: preview('situation_objectives_import_preview_hardened.json'),
    occurrences: preview('situation_source_occurrences_import_preview_hardened.json'),
    families: preview('situation_families_import_preview_hardened.json'),
    familyMembers: preview('situation_family_members_import_preview_hardened.json'),
    media: preview('situation_media_import_preview_hardened.json'),
  };
}

export function loadG2ImportPayload(): ImportPayload {
  const raw = JSON.parse(fs.readFileSync(path.join(root, G2_PAYLOAD_PATH), 'utf8')) as Record<
    string,
    any
  >;
  if (raw.batch?.id !== 'g2-authored-enrichment-v1')
    throw new Error('G2 payload batch marker mismatch.');
  return {
    situations: raw.situations,
    objectives: raw.objectiveRelations.map((row: any) => ({
      ...row,
      relationType: row.relationship,
    })),
    occurrences: raw.sourceOccurrences,
    families: raw.families,
    familyMembers: [],
    media: raw.media,
  };
}

export function validateG2ImportPayload(payload: ImportPayload, actualHash?: string): void {
  if (actualHash && actualHash !== G2_PAYLOAD_SHA256)
    throw new Error('G2 payload SHA-256 mismatch.');
  if (
    payload.situations.length !== 32 ||
    payload.objectives.length !== 32 ||
    payload.occurrences.length !== 0 ||
    payload.families.length !== 0 ||
    payload.familyMembers.length !== 0 ||
    payload.media.length !== 0
  )
    throw new Error('G2 payload counts do not match the locked 32/32/0/0/0 contract.');
  const ids = new Set(payload.situations.map((x) => x.id));
  if (ids.size !== 32) throw new Error('Duplicate deterministic G2 situation ID.');
  const keys = new Set(payload.objectives.map((x) => `${x.situationId}|${x.objectiveId}`));
  if (keys.size !== 32) throw new Error('Duplicate G2 objective relation identity.');
  for (const row of payload.situations) {
    if (
      row.approvalStatus !== 'APPROVED' ||
      row.productionEligibility !== 'AUTO_GENERATION_ELIGIBLE' ||
      row.provenance !== 'AUTHORED_FOR_ARENASPEX' ||
      row.activityType !== 'PEDAGOGICAL_ACTIVITY'
    )
      throw new Error(`Invalid G2 governance for ${row.id}.`);
  }
  for (const row of payload.objectives) {
    if (!ids.has(row.situationId))
      throw new Error(`Unknown G2 relation situation: ${row.situationId}`);
    if (row.relationType !== 'DIRECT')
      throw new Error(`G2 relation is not DIRECT: ${row.situationId}.`);
  }
}

export function assertNoG2SemanticConflicts(
  existingSituations: Array<Record<string, any>>,
  existingRelations: Array<Record<string, any>>,
  payload: ImportPayload
): void {
  const existingById = new Map(existingSituations.map((row) => [row.id, row]));
  for (const row of payload.situations) {
    const existing = existingById.get(row.id);
    if (!existing) continue;
    const expected = {
      name: row.title,
      gradeId: row.gradeId,
      domainId: row.domainId,
      activityType: row.activityType,
      approvalStatus: row.approvalStatus,
      productionEligibility: row.productionEligibility,
      organization: row.description ?? '',
      sourceGoal: row.title,
    };
    if (Object.entries(expected).some(([key, value]) => existing[key] !== value))
      throw new Error(`G2 semantic conflict for existing situation ${row.id}.`);
  }
  const relationByKey = new Map(
    existingRelations.map((row) => [`${row.situationId}|${row.objectiveId}`, row])
  );
  for (const row of payload.objectives) {
    const existing = relationByKey.get(`${row.situationId}|${row.objectiveId}`);
    if (existing && existing.relationType !== row.relationType)
      throw new Error(`G2 relation conflict for ${row.situationId}|${row.objectiveId}.`);
    const other = existingRelations.find(
      (candidate) =>
        candidate.situationId === row.situationId && candidate.objectiveId !== row.objectiveId
    );
    if (other) throw new Error(`G2 objective conflict for ${row.situationId}.`);
  }
}

export function validateImportPayload(payload: ImportPayload): void {
  if (
    payload.situations.length !== 188 ||
    payload.objectives.length !== 392 ||
    payload.occurrences.length !== 188
  )
    throw new Error('Import payload counts do not match the approved B3.1 totals.');
  if (
    payload.families.length !== 0 ||
    payload.familyMembers.length !== 0 ||
    payload.media.length !== 0
  )
    throw new Error('Unexpected family or media rows in approved payload.');
  const situationIds = new Set(payload.situations.map((x) => x.id));
  if (situationIds.size !== payload.situations.length)
    throw new Error('Duplicate deterministic situation ID.');
  const relationKeys = new Set(payload.objectives.map((x) => `${x.situationId}|${x.objectiveId}`));
  if (relationKeys.size !== payload.objectives.length)
    throw new Error('Duplicate situation/objective relation key.');
  const occurrenceIds = new Set(payload.occurrences.map((x) => x.id));
  if (occurrenceIds.size !== payload.occurrences.length)
    throw new Error('Duplicate deterministic occurrence ID.');
  for (const row of payload.objectives)
    if (!situationIds.has(row.situationId))
      throw new Error(`Unknown relation situation: ${row.situationId}`);
  for (const row of payload.occurrences)
    if (!situationIds.has(row.situationId))
      throw new Error(`Unknown occurrence situation: ${row.situationId}`);
  for (const row of payload.situations)
    if (
      !['APPROVED'].includes(row.approvalStatus) ||
      !['AUTO_GENERATION_ELIGIBLE', 'REVIEW_ONLY', 'SOURCE_ARCHIVE_ONLY'].includes(
        row.productionEligibility
      )
    )
      throw new Error(`Invalid governance values for ${row.id}`);
}

export const PRODUCTION_IMPORT_CONFIRMATION = 'I_UNDERSTAND_THIS_WRITES_TO_ARENASPEX_PRODUCTION';

export function isDirectExecution(importMetaUrl: string, argv1?: string): boolean {
  if (!argv1) return false;
  const currentFile = path.normalize(path.resolve(fileURLToPath(importMetaUrl)));
  const invokedFile = path.normalize(path.resolve(argv1));
  return process.platform === 'win32'
    ? currentFile.toLowerCase() === invokedFile.toLowerCase()
    : currentFile === invokedFile;
}

export function authorizeImportEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (env.ALLOW_EDUCATIONAL_SITUATION_IMPORT !== 'true')
    throw new Error('Import refused: ALLOW_EDUCATIONAL_SITUATION_IMPORT=true is required.');
  const environment = env.ARENASPEX_IMPORT_ENVIRONMENT?.toLowerCase();
  const databaseMarker = env.ARENASPEX_IMPORT_DATABASE_MARKER;
  if (!environment || !['test', 'development', 'staging', 'production'].includes(environment))
    throw new Error('Import refused: unsupported import environment.');
  if (!databaseMarker)
    throw new Error('Import refused: non-production database identity is not proven.');

  const verifiedProject = env.ARENASPEX_VERIFIED_NEON_PROJECT;
  const verifiedBranch = env.ARENASPEX_VERIFIED_NEON_BRANCH;
  const verifiedDatabase = env.ARENASPEX_VERIFIED_NEON_DATABASE;
  if (environment === 'production') {
    if (databaseMarker !== 'arenaspex-production')
      throw new Error('Import refused: production database marker mismatch.');
    if (env.ALLOW_EDUCATIONAL_SITUATION_PRODUCTION_IMPORT !== 'true')
      throw new Error('Import refused: explicit production authorization is required.');
    if (env.ARENASPEX_PRODUCTION_IMPORT_CONFIRMATION !== PRODUCTION_IMPORT_CONFIRMATION)
      throw new Error('Import refused: production confirmation mismatch.');
    if (
      verifiedProject !== 'mute-paper-46197165' ||
      verifiedBranch !== 'production' ||
      verifiedDatabase !== 'neondb'
    )
      throw new Error('Import refused: verified production Neon identity is required.');
    return;
  }
  if (/production|prod/i.test(databaseMarker))
    throw new Error('Import refused: non-production environment cannot target production.');
  if (verifiedBranch === 'production')
    throw new Error('Import refused: non-production environment targets production.');
}

const domainNames: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};
const gradeNumber = (id: string) => Number(id.replace('lvl_p', ''));

export async function importEducationalSituationBank(
  prisma: PrismaClient,
  payload = loadImportPayload(),
  batch: ImportBatch = importBatch()
): Promise<{ situations: number; objectives: number; occurrences: number }> {
  authorizeImportEnvironment();
  if (batch === 'g2-authored-enrichment-v1') validateG2ImportPayload(payload);
  else validateImportPayload(payload);
  if (batch === 'g2-authored-enrichment-v1') {
    const ids = payload.situations.map((row) => row.id);
    const existing = await prisma.educationalSituation.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        gradeId: true,
        domainId: true,
        activityType: true,
        approvalStatus: true,
        productionEligibility: true,
        organization: true,
        sourceGoal: true,
      },
    });
    const relations = await prisma.situationObjective.findMany({
      where: { situationId: { in: ids } },
      select: { situationId: true, objectiveId: true, relationType: true },
    });
    assertNoG2SemanticConflicts(existing, relations, payload);
  }
  await prisma.$transaction(
    async (tx) => {
      for (const row of payload.situations)
        await tx.educationalSituation.upsert({
          where: { id: row.id },
          update: {
            name: row.title,
            approvalStatus: row.approvalStatus as SituationApprovalStatus,
            productionEligibility: row.productionEligibility as SituationProductionEligibility,
            activityType: row.activityType as SituationActivityType,
            lessonTypes: row.lessonTypes ?? [],
            executionConditions: row.executionConditions,
            successCriteria: row.successCriteria,
            observationIndicators: row.observationIndicators,
            motorActions: row.motorActions ?? [],
            pedagogicalTags: row.pedagogicalTags ?? [],
            gradeId: row.gradeId,
            domainId: row.domainId,
          },
          create: {
            id: row.id,
            externalId: row.id,
            name: row.title,
            grade: gradeNumber(row.gradeId),
            fieldId: row.domainId,
            fieldName: domainNames[row.domainId] ?? row.domainId,
            objectiveIds: row.canonicalObjectiveId ? [row.canonicalObjectiveId] : [],
            objectiveTexts: row.canonicalObjectiveText ? [row.canonicalObjectiveText] : [],
            sourceGoal: row.title,
            organization: row.description ?? '',
            equipment: row.equipment ?? [],
            origin: row.provenance ?? 'REFERENCE_SEED',
            status: 'APPROVED',
            approvalStatus: row.approvalStatus as SituationApprovalStatus,
            productionEligibility: row.productionEligibility as SituationProductionEligibility,
            activityType: row.activityType as SituationActivityType,
            lessonTypes: row.lessonTypes ?? [],
            executionConditions: row.executionConditions,
            successCriteria: row.successCriteria,
            observationIndicators: row.observationIndicators,
            motorActions: row.motorActions ?? [],
            pedagogicalTags: row.pedagogicalTags ?? [],
            gradeId: row.gradeId,
            domainId: row.domainId,
          },
        });
      for (const row of payload.objectives)
        await tx.situationObjective.upsert({
          where: {
            situationId_objectiveId: { situationId: row.situationId, objectiveId: row.objectiveId },
          },
          update: { relationType: row.relationType as SituationObjectiveRelationType },
          create: {
            id: row.id,
            situationId: row.situationId,
            objectiveId: row.objectiveId,
            relationType: row.relationType as SituationObjectiveRelationType,
          },
        });
      for (const row of payload.occurrences)
        await tx.situationSourceOccurrence.upsert({
          where: { id: row.id },
          update: {
            sourceFile: row.sourceFile,
            sourceLesson: row.sourceLesson,
            sourceLessonType: row.sourceLessonType,
            originalSourceObjective: row.originalSourceObjective,
            originalTitle: row.originalTitle,
            originalDescription: row.originalDescription,
            provenance: row.provenance,
          },
          create: row,
        });
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    }
  );
  return {
    situations: payload.situations.length,
    objectives: payload.objectives.length,
    occurrences: payload.occurrences.length,
  };
}

async function main(): Promise<void> {
  console.log('IMPORT_START');
  const batch = importBatch();
  console.log(`IMPORT_BATCH=${batch}`);
  authorizeImportEnvironment();
  console.log('IMPORT_GUARD_OK');
  const raw =
    batch === 'g2-authored-enrichment-v1'
      ? JSON.parse(fs.readFileSync(path.join(root, G2_PAYLOAD_PATH), 'utf8'))
      : null;
  if (batch === 'g2-authored-enrichment-v1' && canonicalPayloadHash(raw) !== G2_PAYLOAD_SHA256)
    throw new Error('G2 payload SHA-256 mismatch.');
  const payload =
    batch === 'g2-authored-enrichment-v1' ? loadG2ImportPayload() : loadImportPayload();
  if (batch === 'g2-authored-enrichment-v1') validateG2ImportPayload(payload, G2_PAYLOAD_SHA256);
  else validateImportPayload(payload);
  console.log('IMPORT_PAYLOAD_OK');
  if (process.env.ARENASPEX_IMPORT_DRY_RUN === 'true') {
    console.log(JSON.stringify({ dryRun: true, ...payloadCounts(payload) }));
    console.log('IMPORT_DONE');
    return;
  }
  console.log('IMPORT_PREWRITE');
  const prisma = new PrismaClient();
  try {
    const result = await importEducationalSituationBank(prisma, payload);
    console.log('IMPORT_COMMIT_OK');
    console.log(JSON.stringify(result));
    console.log('IMPORT_DONE');
  } finally {
    await prisma.$disconnect();
  }
}

const payloadCounts = (payload: ImportPayload) => ({
  situations: payload.situations.length,
  objectives: payload.objectives.length,
  occurrences: payload.occurrences.length,
});

if (isDirectExecution(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    console.error('IMPORT_FAILED');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
