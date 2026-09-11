import fs from 'node:fs';
import path from 'node:path';
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

function nonProductionGuard(): void {
  if (process.env.ALLOW_EDUCATIONAL_SITUATION_IMPORT !== 'true')
    throw new Error('Import refused: ALLOW_EDUCATIONAL_SITUATION_IMPORT=true is required.');
  const environment = process.env.ARENASPEX_IMPORT_ENVIRONMENT;
  if (!environment || !['test', 'development', 'staging'].includes(environment.toLowerCase()))
    throw new Error(
      'Import refused: ARENASPEX_IMPORT_ENVIRONMENT must be test, development, or staging.'
    );
  const databaseMarker = process.env.ARENASPEX_IMPORT_DATABASE_MARKER;
  if (!databaseMarker || /production|prod/i.test(databaseMarker))
    throw new Error('Import refused: non-production database identity is not proven.');
}

const domainNames: Record<string, string> = {
  f_locomotion: 'الوضعيات والتنقلات',
  f_fundamentals: 'الحركات القاعدية',
  f_structuring: 'الهيكلة والبناء',
};
const gradeNumber = (id: string) => Number(id.replace('lvl_p', ''));

export async function importEducationalSituationBank(
  prisma: PrismaClient,
  payload = loadImportPayload()
): Promise<{ situations: number; objectives: number; occurrences: number }> {
  nonProductionGuard();
  validateImportPayload(payload);
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
            objectiveIds: [],
            objectiveTexts: [],
            sourceGoal: row.title,
            organization: row.description ?? '',
            equipment: [],
            origin: 'REFERENCE_SEED',
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient();
  importEducationalSituationBank(prisma)
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .finally(() => prisma.$disconnect());
}
