import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST,
  DOMAIN_ONE_P1E_FIELD_OWNERSHIP,
  P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  P1C_RELEASE_ID,
  dryRunDomainOneLegacyMigration,
  p1cFinalCompetencyId,
  type DomainOneLegacyDryRunInput,
} from '../src/domain/pedagogicalKnowledge';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { TeacherLearningPlanDomain } from '../src/types/spex';

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const correctedDomain = (gradeId: 'lvl_p3' | 'lvl_p4' | 'lvl_p5') =>
  structuredClone(
    seedTeacherLearningPlan(gradeId).domains.find(
      (domain) => domain.fieldId === 'f_locomotion'
    ) as TeacherLearningPlanDomain
  );

const historicalDomain = (gradeId: 'lvl_p3' | 'lvl_p4' | 'lvl_p5') => {
  const domain = correctedDomain(gradeId);
  domain.integrationPoints[1].afterObjectiveId = domain.objectives.at(-2)!.id;
  return domain;
};

const dryRunInput = (
  gradeId: 'lvl_p3' | 'lvl_p4' | 'lvl_p5',
  domain = historicalDomain(gradeId),
  baseline = historicalDomain(gradeId),
  extra: Partial<DomainOneLegacyDryRunInput> = {}
): DomainOneLegacyDryRunInput => ({
  gradeId,
  domainId: 'f_locomotion',
  coreReleaseId: P1C_RELEASE_ID,
  finalCompetencyId: p1cFinalCompetencyId(gradeId),
  catalog: P1C_DOMAIN_ONE_GRADES_TWO_TO_FIVE_CATALOG,
  domain,
  historicalDefaultDomain: baseline,
  ...extra,
});

describe('P1E Domain 1 legacy migration design and dry run', () => {
  it('contains the exact 14 replacement and 7 isolated product-decision entries', () => {
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.referenceReplacementTable).toHaveLength(14);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.unresolvedProductDecisions).toHaveLength(7);
    expect(
      DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.referenceReplacementTable.every(
        (item) =>
          item.decisionStatus === 'APPROVED_REPLACEMENT' &&
          item.canonicalLearningRequirementIds.length > 0 &&
          item.replacementWording.length > 0
      )
    ).toBe(true);
    expect(
      DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.unresolvedProductDecisions.every(
        (item) => item.decisionStatus === 'PENDING_PRODUCT_DECISION'
      )
    ).toBe(true);
  });

  it.each(['lvl_p3', 'lvl_p4', 'lvl_p5'] as const)(
    'classifies untouched old %s defaults as candidates while isolating unresolved cases',
    (gradeId) => {
      const result = dryRunDomainOneLegacyMigration(dryRunInput(gradeId));
      expect(result.futureWriteCandidate).toBe(true);
      expect(result.requiresReview).toBe(true);
      expect(
        result.objectiveActions.some(
          (item) => item.classification === 'SAFE_DEFAULT_REFERENCE_REPLACEMENT'
        )
      ).toBe(true);
      expect(
        result.objectiveActions.some((item) => item.classification === 'AMBIGUOUS_REVIEW_REQUIRED')
      ).toBe(true);
    }
  );

  it('proposes identity-only remap for edited wording and preserves the wording', () => {
    const baseline = historicalDomain('lvl_p3');
    const edited = structuredClone(baseline);
    edited.objectives[0].text = 'صياغة الأستاذ الخاصة بالهدف';
    const before = structuredClone(edited);
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', edited, baseline));
    expect(result.objectiveActions[0]).toMatchObject({
      classification: 'SAFE_DEFAULT_PLAN_REMAP',
      origin: 'PLATFORM_DEFAULT_TEXT_EDITED',
      writeAllowedInFuture: true,
    });
    expect(result.objectiveActions[0].preservedFields).toContain('objective wording');
    expect(edited).toEqual(before);
  });

  it.each([
    [
      'situations',
      (domain: TeacherLearningPlanDomain) => {
        domain.objectives[0].situations = [
          {
            situationId: 'fixture-situation',
            name: 'وضعية من إنشاء الأستاذ',
            organization: 'تنظيم آمن',
            equipment: [],
          },
        ];
      },
    ],
    [
      'notes',
      (domain: TeacherLearningPlanDomain) => {
        domain.objectives[0].teacherNotes = 'ملاحظة الأستاذ';
      },
    ],
  ] as const)('preserves teacher-added %s during a semantic proposal', (_, mutate) => {
    const baseline = historicalDomain('lvl_p3');
    const edited = structuredClone(baseline);
    mutate(edited);
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', edited, baseline));
    expect(result.objectiveActions[0].classification).toBe('SAFE_DEFAULT_PLAN_REMAP');
    expect(result.objectiveActions[0].proposedAction.toLowerCase()).toContain('preserve');
  });

  it('preserves a teacher-created objective and a changed objective count', () => {
    const baseline = historicalDomain('lvl_p3');
    const edited = structuredClone(baseline);
    edited.objectives.push({ id: 'teacher-custom', text: 'هدف خاص', orderIndex: 8 });
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', edited, baseline));
    expect(result.objectiveActions).toHaveLength(8);
    expect(result.objectiveActions.at(-1)).toMatchObject({
      classification: 'TEACHER_CUSTOM_PRESERVE',
      writeAllowedInFuture: false,
    });
  });

  it('preserves teacher ordering and does not normalize the plan back to seven objectives', () => {
    const baseline = historicalDomain('lvl_p4');
    const edited = structuredClone(baseline);
    [edited.objectives[0], edited.objectives[1]] = [edited.objectives[1], edited.objectives[0]];
    const originalOrder = edited.objectives.map((item) => item.id);
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p4', edited, baseline));
    expect(result.objectiveActions[0].origin).toBe('PLATFORM_DEFAULT_STRUCTURALLY_EDITED');
    expect(edited.objectives.map((item) => item.id)).toEqual(originalOrder);
  });

  it('preserves a manually moved Integration 2', () => {
    const baseline = historicalDomain('lvl_p3');
    const edited = structuredClone(baseline);
    edited.integrationPoints[1].afterObjectiveId = edited.objectives[4].id;
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', edited, baseline));
    expect(result.integrationActions[1]).toMatchObject({
      classification: 'TEACHER_MODIFIED_PRESERVE',
      writeAllowedInFuture: false,
      afterSemanticIdentity: edited.objectives[4].id,
    });
  });

  it('detects only the untouched historical Integration 2 fallback as a repair candidate', () => {
    const domain = historicalDomain('lvl_p3');
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', domain, domain));
    expect(result.integrationActions[1]).toMatchObject({
      classification: 'LEGACY_DEFAULT_INTEGRATION_PLACEMENT',
      beforeSemanticIdentity: domain.objectives[5].id,
      afterSemanticIdentity: domain.objectives[6].id,
      writeAllowedInFuture: true,
    });
  });

  it('constrains every action when execution or document history exists', () => {
    const result = dryRunDomainOneLegacyMigration(
      dryRunInput('lvl_p3', undefined, undefined, {
        historicalDependencies: {
          classPlannedSessionIds: ['cps-fixture'],
          notebookEntryIds: ['notebook-fixture'],
          lessonPlanIds: ['lesson-fixture'],
        },
      })
    );
    expect(result.planClassification).toBe('EXECUTED_HISTORY_PRESERVE');
    expect(result.futureWriteCandidate).toBe(false);
    expect(
      [...result.objectiveActions, ...result.integrationActions].every(
        (item) => item.classification === 'EXECUTED_HISTORY_PRESERVE' && !item.writeAllowedInFuture
      )
    ).toBe(true);
  });

  it('requires review when a claimed legacy reference lacks stable generator identity', () => {
    const baseline = historicalDomain('lvl_p5');
    const ambiguous = structuredClone(baseline);
    ambiguous.objectives[0].id = 'unknown-lineage';
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p5', ambiguous, baseline));
    expect(result.objectiveActions[0].classification).toBe('AMBIGUOUS_REVIEW_REQUIRED');
    expect(result.objectiveActions[0].writeAllowedInFuture).toBe(false);
  });

  it('rejects an unsupported legacy shape without authorizing a future write', () => {
    const domain = historicalDomain('lvl_p3');
    domain.fieldId = 'unsupported-domain';
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3', domain));
    expect(result.planClassification).toBe('UNSUPPORTED_LEGACY_SHAPE');
    expect(result.requiresReview).toBe(true);
    expect(result.futureWriteCandidate).toBe(false);
  });

  it('classifies an already reconciled corrected plan as NO_ACTION and is idempotent', () => {
    const corrected = correctedDomain('lvl_p3');
    const manifestRows = [
      ...DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.referenceReplacementTable,
      ...DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.unresolvedProductDecisions,
    ];
    const reconciled = {
      ...corrected,
      objectives: corrected.objectives.map((objective) => ({
        ...objective,
        objectiveConceptId: manifestRows.find(
          (item) =>
            item.gradeId === 'lvl_p3' && item.legacyReferenceId === objective.sourceReferenceId
        )?.canonicalObjectiveConceptId,
      })),
    } as TeacherLearningPlanDomain;
    const input = dryRunInput('lvl_p3', reconciled, structuredClone(reconciled));
    const first = dryRunDomainOneLegacyMigration(input);
    const second = dryRunDomainOneLegacyMigration(input);
    expect(first).toEqual(second);
    expect(first.planClassification).toBe('NO_ACTION');
    expect(first.objectiveActions.every((item) => item.classification === 'NO_ACTION')).toBe(true);
  });

  it('simulates semantic coverage without using improvement as migration authority', () => {
    const result = dryRunDomainOneLegacyMigration(dryRunInput('lvl_p3'));
    expect(result.beforeCoverage.status).toBe('unmapped');
    expect(['partial', 'complete']).toContain(result.afterCoverage.status);
    expect(result.requiresReview).toBe(true);
  });

  it('defines field-level ownership with teacher and history preservation', () => {
    expect(DOMAIN_ONE_P1E_FIELD_OWNERSHIP).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'objective wording', futurePolicy: 'PRESERVE' }),
        expect.objectContaining({ field: 'order', futurePolicy: 'PRESERVE' }),
        expect.objectContaining({ field: 'teacherNotes', futurePolicy: 'PRESERVE' }),
        expect.objectContaining({ ownership: 'HISTORICAL_SNAPSHOT', futurePolicy: 'PRESERVE' }),
      ])
    );
  });

  it('is deterministic, side-effect-free, and never mutates its input', () => {
    const input = dryRunInput('lvl_p4');
    const before = structuredClone(input.domain);
    expect(dryRunDomainOneLegacyMigration(input)).toEqual(dryRunDomainOneLegacyMigration(input));
    expect(input.domain).toEqual(before);
  });

  it('has no runtime activation, Prisma, API, or UI import outside knowledge-core tests', () => {
    const references = sourceFiles(join(process.cwd(), 'src'))
      .filter((path) => !path.includes(join('domain', 'pedagogicalKnowledge')))
      .filter((path) =>
        /dryRunDomainOneLegacyMigration|DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST/.test(
          readFileSync(path, 'utf8')
        )
      );
    expect(references).toEqual([]);
  });
});
