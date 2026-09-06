import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
  P1A_RELEASE_ID,
  projectTeacherPlanSemantics,
  type TeacherPlanSemanticAdapterInput,
  type TeacherPlanSemanticDomainInput,
} from '../src/domain/pedagogicalKnowledge';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const canonicalPlan = seedTeacherLearningPlan('lvl_p1');
const canonicalDomain = canonicalPlan.domains.find(
  (domain) => domain.fieldId === 'f_locomotion'
)! as TeacherPlanSemanticDomainInput;

const inputFor = (
  domain: TeacherPlanSemanticDomainInput = canonicalDomain,
  overrides: Partial<TeacherPlanSemanticAdapterInput> = {}
): TeacherPlanSemanticAdapterInput => ({
  catalog: P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
  coreReleaseId: P1A_RELEASE_ID,
  gradeId: 'lvl_p1',
  domainId: 'f_locomotion',
  finalCompetencyId: 'fc_lvl_p1_f_locomotion',
  domain,
  ...overrides,
});

const withObjectives = (
  objectives: TeacherPlanSemanticDomainInput['objectives'],
  integrationPoints: TeacherPlanSemanticDomainInput['integrationPoints'] = []
): TeacherPlanSemanticDomainInput => ({
  fieldId: 'f_locomotion',
  finalCompetencyId: 'fc_lvl_p1_f_locomotion',
  objectives,
  integrationPoints,
});

const sourceObjective = (index: number, sourceReferenceId: string) => ({
  id: `fixture-objective-${index}`,
  text: `صياغة الأستاذ ${index}`,
  orderIndex: index,
  sourceReferenceId,
});

const projectCountFixture = (count: 6 | 7 | 8 | 10) => {
  const sources = [
    'f_locomotion__2',
    'f_locomotion__3',
    'f_locomotion__4',
    'f_locomotion__6',
    'f_locomotion__7',
    'f_locomotion__8',
  ];
  const objectives = Array.from({ length: count }, (_, index) =>
    sourceObjective(index + 1, sources[index % sources.length])
  );
  return projectTeacherPlanSemantics(inputFor(withObjectives(objectives)));
};

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

describe('P1B read-only Teacher Plan semantic adapter', () => {
  it('resolves the canonical seven-objective plan deterministically', () => {
    const result = projectTeacherPlanSemantics(inputFor());
    expect(result.objectiveResolutions).toHaveLength(7);
    expect(
      result.objectiveResolutions.every((item) => item.resolutionStatus === 'source_reference')
    ).toBe(true);
    expect(result.coverageStatus).toBe('complete');
    expect(result.coveredRequirements).toHaveLength(4);
  });

  it('resolves a stable sourceReferenceId without using wording identity', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(withObjectives([sourceObjective(1, 'f_locomotion__2')]))
    );
    expect(result.objectiveResolutions[0]).toMatchObject({
      resolutionStatus: 'source_reference',
      objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:1',
    });
  });

  it('resolves an approved legacy alias after source-reference lookup', () => {
    const catalog: PedagogicalKnowledgeCatalog = {
      ...P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
      aliases: [
        ...P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.aliases,
        {
          legacyId: 'legacy:g1:d1:objective:1',
          canonicalId: 'objective-concept:lvl_p1:f_locomotion:1',
          reason: 'Reviewed historical fixture alias.',
        },
      ],
    };
    const result = projectTeacherPlanSemantics(
      inputFor(withObjectives([sourceObjective(1, 'legacy:g1:d1:objective:1')]), { catalog })
    );
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('alias');
  });

  it('keeps teacher-edited wording mapped when the stable source reference remains', () => {
    const objective = { ...canonicalDomain.objectives[0], text: 'صياغة شخصية مختلفة تمامًا' };
    const result = projectTeacherPlanSemantics(inputFor(withObjectives([objective])));
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('source_reference');
  });

  it('keeps a custom objective without a reference unmapped and non-blocking', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        withObjectives([
          { id: 'custom-1', text: 'هدف خاص', orderIndex: 1, sourceReferenceId: null },
        ])
      )
    );
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('unmapped');
    expect(result.errors).toEqual([]);
  });

  it('classifies an invalid explicit semantic reference as ambiguous', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        withObjectives([
          {
            ...sourceObjective(1, 'f_locomotion__2'),
            objectiveConceptId: 'objective-concept:unknown',
          },
        ])
      )
    );
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('ambiguous');
    expect(result.objectiveResolutions[0].learningRequirementIds).toEqual([]);
    expect(result.warnings.some((item) => item.code === 'invalid_semantic_reference')).toBe(true);
  });

  it('detects an ambiguous alias without selecting either target', () => {
    const catalog: PedagogicalKnowledgeCatalog = {
      ...P1A_GRADE_ONE_DOMAIN_ONE_CATALOG,
      aliases: [
        ...P1A_GRADE_ONE_DOMAIN_ONE_CATALOG.aliases,
        {
          legacyId: 'ambiguous-ref',
          canonicalId: 'objective-concept:lvl_p1:f_locomotion:1',
          reason: 'Fixture A',
        },
        {
          legacyId: 'ambiguous-ref',
          canonicalId: 'objective-concept:lvl_p1:f_locomotion:2',
          reason: 'Fixture B',
        },
      ],
    };
    const result = projectTeacherPlanSemantics(
      inputFor(withObjectives([sourceObjective(1, 'ambiguous-ref')]), { catalog })
    );
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('ambiguous');
    expect(result.warnings.some((item) => item.code === 'ambiguous_alias')).toBe(true);
  });

  it('rejects a concept from the wrong requested grade/domain scope', () => {
    const domain = withObjectives([
      {
        ...sourceObjective(1, 'ignored'),
        objectiveConceptId: 'objective-concept:lvl_p1:f_locomotion:1',
      },
    ]);
    const result = projectTeacherPlanSemantics(
      inputFor(
        { ...domain, fieldId: 'f_manipulation' },
        { gradeId: 'lvl_p2', domainId: 'f_manipulation' }
      )
    );
    expect(result.coverageStatus).toBe('indeterminate');
    expect(result.objectiveResolutions[0].resolutionStatus).toBe('ambiguous');
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining(['wrong_grade', 'wrong_domain', 'mismatched_final_competency'])
    );
  });

  it('reports unknown release and mismatched final competency as structured errors', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        { ...canonicalDomain, finalCompetencyId: 'fc:wrong' },
        { coreReleaseId: 'knowledge-core:missing', finalCompetencyId: 'fc:wrong' }
      )
    );
    expect(result.coverageStatus).toBe('indeterminate');
    expect(result.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'unknown_release',
        'wrong_grade',
        'wrong_domain',
        'mismatched_final_competency',
      ])
    );
  });

  it('detects duplicate TeacherObjective IDs', () => {
    const first = sourceObjective(1, 'f_locomotion__2');
    const result = projectTeacherPlanSemantics(inputFor(withObjectives([first, { ...first }])));
    expect(result.errors.some((item) => item.code === 'duplicate_teacher_objective_id')).toBe(true);
    expect(result.coverageStatus).toBe('indeterminate');
  });

  it('reports a broken integration anchor without throwing', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        withObjectives(
          [sourceObjective(1, 'f_locomotion__2')],
          [
            {
              id: 'integration-broken',
              afterObjectiveId: 'missing',
              orderIndex: 1,
              label: 'إدماجية 1',
            },
          ]
        )
      )
    );
    expect(result.errors.some((item) => item.code === 'broken_integration_anchor')).toBe(true);
  });

  it('reports an integration point with no preceding objective', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        withObjectives(
          [sourceObjective(1, 'f_locomotion__2')],
          [{ id: 'integration-empty', afterObjectiveId: null, orderIndex: 1, label: 'إدماجية 1' }]
        )
      )
    );
    expect(
      result.errors.some((item) => item.code === 'integration_without_preceding_objectives')
    ).toBe(true);
  });

  it('detects canonical Objective 7 outside both current integration cycles', () => {
    const result = projectTeacherPlanSemantics(inputFor());
    const warning = result.warnings.find(
      (item) => item.code === 'objective_outside_integration_cycles'
    );
    expect(warning?.relatedIds).toContain(canonicalDomain.objectives[6].id);
    expect(result.integrationCycles).toHaveLength(2);
  });

  it('reports partial coverage through the existing Coverage Engine', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(
        withObjectives([
          sourceObjective(1, 'f_locomotion__2'),
          sourceObjective(2, 'f_locomotion__4'),
        ])
      )
    );
    expect(result.coverageStatus).toBe('partial');
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it('reports unmapped coverage when no objective resolves', () => {
    const result = projectTeacherPlanSemantics(
      inputFor(withObjectives([{ id: 'custom-only', text: 'هدف خاص', orderIndex: 1 }]))
    );
    expect(result.coverageStatus).toBe('unmapped');
    expect(result.unmappedObjectives).toHaveLength(1);
  });

  it.each([6, 7, 8, 10] as const)(
    'keeps equivalent %i-objective Teacher Plan fixtures semantically complete',
    (count) => {
      const result = projectCountFixture(count);
      expect(result.objectiveResolutions).toHaveLength(count);
      expect(result.coverageStatus).toBe('complete');
      expect(result.coveredRequirements).toHaveLength(4);
    }
  );

  it('recalculates cycles read-only when the second integration anchor moves', () => {
    const moved = {
      ...canonicalDomain,
      integrationPoints: canonicalDomain.integrationPoints.map((point, index) =>
        index === 1 ? { ...point, afterObjectiveId: canonicalDomain.objectives[6].id } : point
      ),
    };
    const result = projectTeacherPlanSemantics(inputFor(moved));
    expect(result.integrationCycles[1].teacherObjectiveIds).toContain(
      canonicalDomain.objectives[6].id
    );
    expect(
      result.warnings.some((item) => item.code === 'objective_outside_integration_cycles')
    ).toBe(false);
  });

  it('returns identical projections for identical inputs', () => {
    const input = inputFor();
    expect(projectTeacherPlanSemantics(input)).toEqual(projectTeacherPlanSemantics(input));
  });

  it('does not mutate Teacher Plan input', () => {
    const domain = structuredClone(canonicalDomain);
    const before = structuredClone(domain);
    projectTeacherPlanSemantics(inputFor(domain));
    expect(domain).toEqual(before);
  });

  it('exposes diagnostic and summative scopes as the full approved requirement set', () => {
    const result = projectTeacherPlanSemantics(inputFor());
    expect(result.diagnosticScope.learningRequirements).toHaveLength(4);
    expect(result.summativeScope.learningRequirements).toHaveLength(4);
    expect(result.diagnosticScope.finalCompetency?.id).toBe('fc_lvl_p1_f_locomotion');
  });

  it('has no production import or runtime wiring outside the knowledge-core boundary', () => {
    const projectRoot = process.cwd();
    const forbiddenImports = sourceFiles(join(projectRoot, 'src'))
      .filter((path) => !path.includes(`${join('domain', 'pedagogicalKnowledge')}`))
      .filter((path) => readFileSync(path, 'utf8').includes('teacherPlanSemanticAdapter'));
    expect(forbiddenImports).toEqual([]);
  });
});
