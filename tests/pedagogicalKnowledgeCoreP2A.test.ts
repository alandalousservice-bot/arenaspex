import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANNUAL_PLAN_REFERENCE } from '../src/data/annualPlanReference';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import {
  canonicalAnnualPlanDomainId,
  resolveAnnualPlanReferenceReadModel,
  resolveAnnualPlanTeacherValue,
} from '../src/services/annualPlanReferenceReadModel';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const candidate = () =>
  createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: P1FC_RELEASE_ID });

const cells = [1, 2, 3, 4, 5].flatMap((grade) =>
  ['f_locomotion', 'f_fundamentals', 'f_structuring'].map((domainId) => [`lvl_p${grade}`, domainId])
);

describe('P2A Annual Plan Knowledge Core read model integration', () => {
  it.each(cells)('resolves canonical %s / %s deterministically', (gradeId, domainId) => {
    const runtime = candidate();
    const first = resolveAnnualPlanReferenceReadModel(gradeId, runtime);
    const second = resolveAnnualPlanReferenceReadModel(gradeId, runtime);
    const expected = runtime
      .getAnnualPlanReference(gradeId)!
      .domains.find((item) => item.domain.domainId === domainId)!;
    const actual = first.domains.find((item) => item.fieldId === domainId)!;
    expect(first).toEqual(second);
    expect(actual.fieldName).toBe(expected.domain.label);
    expect(actual.finalCompetency).toBe(expected.finalCompetency.label);
    expect(actual.components).toBe(expected.components.map((item) => item.label).join('\n'));
  });

  it('keeps G5 D1 and D2 separate by identity, never keywords', () => {
    const model = resolveAnnualPlanReferenceReadModel('lvl_p5', candidate());
    expect(model.domains[0].finalCompetency).toBe(
      'ينجز مختلف الوضعيات والتنقلات في الرياضات الفردية والألعاب الجماعية محافظا على ترابطها، ويلائم وضعية جسمه حسب الموقف.'
    );
    expect(model.domains[1].finalCompetency).toBe(
      'ينجز حركات قاعدية متعلقة بالجري والوثب والرمي بطريقة سليمة.'
    );
    expect(model.domains[2].finalCompetency).toBe(
      'يمارس بعض الرياضات الجماعية وفق مبادئ اللعبة والتقنيات الأساسية.'
    );
    expect(model.domains[0].finalCompetency).not.toBe(model.domains[1].finalCompetency);
  });

  it('preserves legacy-derived resources, criteria, indicators, and time with provenance', () => {
    const model = resolveAnnualPlanReferenceReadModel('lvl_p1', candidate());
    model.domains.forEach((domain, index) => {
      const legacy = ANNUAL_PLAN_REFERENCE.lvl_p1.domains[index];
      expect(domain.knowledgeResources).toBe(legacy.knowledgeResources);
      expect(domain.transversalResources).toBe(legacy.transversalResources);
      expect(domain.evaluationCriteria).toBe(legacy.evaluationCriteria);
      expect(domain.time).toBe(legacy.time);
    });
    expect(model.provenance.authority).toBe('candidate');
    expect(model.provenance.preservedDerivedFields).toContain('evaluationCriteria');
  });

  it('gives editable Teacher customization precedence without mutating it', () => {
    const values = {
      f_locomotion__final: { finalCompetency: 'صياغة الأستاذ الخاصة' },
      f_locomotion__components: { components: 'مركبات الأستاذ الخاصة' },
    };
    const before = structuredClone(values);
    expect(resolveAnnualPlanTeacherValue('f_locomotion__components', 'مرجع', true, values)).toBe(
      'مركبات الأستاذ الخاصة'
    );
    expect(
      resolveAnnualPlanTeacherValue('f_locomotion__knowledge', 'النص المرجعي', true, values)
    ).toBe('النص المرجعي');
    expect(values).toEqual(before);
  });

  it('preserves clear/reset read semantics without automatic reset', () => {
    expect(resolveAnnualPlanTeacherValue('comprehensive', 'مرجع', true, { __cleared: {} })).toBe(
      ''
    );
    expect(resolveAnnualPlanTeacherValue('comprehensive', 'مرجع', false, {})).toBe('مرجع');
  });

  it('keeps legacy and shadow Annual Plan output legacy-authoritative', () => {
    const legacy = resolveAnnualPlanReferenceReadModel(
      'lvl_p3',
      createKnowledgeCoreRuntime({ mode: 'legacy' })
    );
    const shadow = resolveAnnualPlanReferenceReadModel(
      'lvl_p3',
      createKnowledgeCoreRuntime({ mode: 'shadow', releaseId: P1FC_RELEASE_ID })
    );
    expect(legacy).toEqual(shadow);
    expect(legacy.provenance.authority).toBe('legacy');
    expect(legacy.domains.map((item) => item.finalCompetency)).toEqual(
      ANNUAL_PLAN_REFERENCE.lvl_p3.domains.map((item) => item.finalCompetency)
    );
  });

  it('uses runtime fail-closed decisions for unknown and unapproved releases', () => {
    const unknown = createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: 'unknown' });
    const pending = { ...KNOWLEDGE_CORE_PRODUCT_APPROVAL, approvalStatus: 'pending' as const };
    const unapproved = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
      { approvalRecord: pending }
    );
    expect(resolveAnnualPlanReferenceReadModel('lvl_p2', unknown).provenance.authority).toBe(
      'legacy'
    );
    expect(resolveAnnualPlanReferenceReadModel('lvl_p2', unapproved).provenance.authority).toBe(
      'legacy'
    );
  });

  it('requires the explicit Annual Plan approval scope', () => {
    const teacherOnly = {
      ...KNOWLEDGE_CORE_PRODUCT_APPROVAL,
      approvalScope: ['teacher_learning_plan_reference_reads'],
    };
    const runtime = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
      { approvalRecord: teacherOnly }
    );
    expect(runtime.getStatus().authority).toBe('candidate');
    expect(resolveAnnualPlanReferenceReadModel('lvl_p1', runtime).provenance.authority).toBe(
      'legacy'
    );
  });

  it('uses runtime fail-closed decisions for invalid validation', () => {
    const invalid = structuredClone(P1FC_COMBINED_SEMANTIC_CATALOG) as PedagogicalKnowledgeCatalog;
    invalid.domains = invalid.domains.slice(1);
    const runtime = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
      {
        getRelease: () => ({
          catalog: invalid,
          validation: validateP1FCCombinedRelease(invalid),
          productApprovedByDefault: false,
        }),
      }
    );
    expect(resolveAnnualPlanReferenceReadModel('lvl_p1', runtime).provenance.authority).toBe(
      'legacy'
    );
  });

  it('normalizes only the established structural alias', () => {
    expect(canonicalAnnualPlanDomainId('f_structure')).toBe('f_structuring');
    expect(canonicalAnnualPlanDomainId('f_locomotion')).toBe('f_locomotion');
  });

  it('preserves moved/split semantic decisions without aliases', () => {
    const runtime = candidate();
    expect(runtime.resolveObjectiveReference('lvl_p3:f_locomotion__7').status).toBe('MOVED_DOMAIN');
    expect(runtime.resolveObjectiveReference('lvl_p5:f_locomotion__6').status).toBe('MOVED_DOMAIN');
    expect(runtime.resolveObjectiveReference('lvl_p5:f_locomotion__3').status).toBe(
      'SPLIT_REQUIRES_REVIEW'
    );
  });

  it('uses only the runtime boundary and performs no writes or direct source imports', () => {
    const service = readFileSync(
      join(process.cwd(), 'src/services/annualPlanReferenceReadModel.ts'),
      'utf8'
    );
    expect(service).toContain('runtime.getAnnualPlanReference');
    expect(service).not.toContain('p1fcCombinedSemanticRelease');
    expect(service).not.toContain('officialCurriculum2023');
    expect(service).not.toMatch(/prisma|createMany|updateMany|deleteMany|upsert/);
    expect(service).not.toMatch(/includes\([^)]*(جري|وثب|رمي)/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('keeps Prisma migrations and public routes untouched', () => {
    expect(readdirSync(join(process.cwd(), 'prisma/migrations')).length).toBeGreaterThan(0);
    const server = readFileSync(join(process.cwd(), 'src/server/apiRouter.ts'), 'utf8');
    expect(server).not.toContain('annual-plan-reference-read-model');
  });

  it('supplies browser runtime mode through safe build constants without exposing other env', () => {
    const vite = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8');
    const runtime = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts'),
      'utf8'
    );
    expect(vite).toContain('__ARENASPEX_KNOWLEDGE_CORE_MODE__');
    expect(vite).toContain('__ARENASPEX_KNOWLEDGE_CORE_RELEASE_ID__');
    expect(runtime).toContain('typeof __ARENASPEX_KNOWLEDGE_CORE_MODE__');
    const defineBlock = vite.match(/define:\s*\{([\s\S]*?)\n\s*\},\n\s*plugins:/)?.[1] || '';
    expect(defineBlock).not.toMatch(/DATABASE_URL|API_KEY|SECRET|TOKEN/);
  });
});
