import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPLETE_ANNUAL_CURRICULUM } from '../src/data/algerianCurriculum';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import {
  createKnowledgeCoreRuntime,
  knowledgeCoreConfigFromEnvironment,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { getRegisteredKnowledgeCoreRelease } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreReleaseRegistry';
import {
  compareKnowledgeCoreCell,
  evaluateRuntimeIntegrationGate,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreShadowComparison';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

const runtime = (mode?: string, productApproved = false, releaseId: string = P1FC_RELEASE_ID) =>
  createKnowledgeCoreRuntime({ mode, productApproved, releaseId });

const legacySnapshots = Object.values(COMPLETE_ANNUAL_CURRICULUM).flatMap((grade) =>
  Object.values(grade.fields).map((field) => ({
    gradeId: grade.levelId,
    domainId: field.fieldId,
    finalCompetency: field.finalCompetency,
  }))
);

describe('P1G guarded read-only Knowledge Core runtime', () => {
  it.each([
    ['unset', undefined],
    ['explicit', 'legacy'],
  ])('%s configuration keeps legacy authority', (_label, mode) => {
    expect(runtime(mode).getStatus()).toMatchObject({
      effectiveMode: 'legacy',
      authority: 'legacy',
    });
  });

  it('invalid mode fails closed with structured reason', () => {
    expect(runtime('bad').getStatus().diagnostic.fallbackReason).toBe('INVALID_MODE');
  });

  it('unknown release fails closed', () => {
    expect(runtime('shadow', false, 'unknown').getStatus()).toMatchObject({
      effectiveMode: 'legacy',
      diagnostic: { fallbackReason: 'UNKNOWN_RELEASE' },
    });
  });

  it('candidate without product approval fails closed', () => {
    expect(runtime('candidate').getStatus().diagnostic.fallbackReason).toBe(
      'PRODUCT_APPROVAL_REQUIRED'
    );
  });

  it('candidate works only with explicit simulated approval', () => {
    expect(runtime('candidate', true).getStatus()).toMatchObject({
      effectiveMode: 'candidate',
      authority: 'candidate',
      productApproved: true,
    });
  });

  it('shadow evaluates the candidate but keeps legacy authoritative', () => {
    const shadow = runtime('shadow');
    expect(shadow.getStatus()).toMatchObject({ authority: 'legacy', candidateParticipates: true });
    expect(shadow.getReleaseMetadata()?.id).toBe(P1FC_RELEASE_ID);
  });

  it('loads and validates the candidate once through the explicit registry', () => {
    const registered = getRegisteredKnowledgeCoreRelease(P1FC_RELEASE_ID);
    expect(registered?.validation).toMatchObject({
      activationEligible: true,
      semanticCoverageComplete: true,
    });
  });

  it('invalid candidate validation fails closed at runtime', () => {
    const invalid = structuredClone(P1FC_COMBINED_SEMANTIC_CATALOG) as PedagogicalKnowledgeCatalog;
    invalid.domains = invalid.domains.slice(1);
    const guarded = createKnowledgeCoreRuntime(
      { mode: 'shadow', releaseId: P1FC_RELEASE_ID },
      {
        getRelease: () => ({
          catalog: invalid,
          validation: validateP1FCCombinedRelease(invalid),
          productApprovedByDefault: false,
        }),
      }
    );
    expect(guarded.getStatus().diagnostic.fallbackReason).toBe('CANDIDATE_VALIDATION_FAILED');
  });

  it('makes all 15 cells queryable in shadow mode', () => {
    const shadow = runtime('shadow');
    expect(
      legacySnapshots.filter((item) => shadow.getGradeDomainCell(item.gradeId, item.domainId))
        .length
    ).toBe(15);
  });

  it('reports complete semantic coverage while authority remains legacy', () => {
    const shadow = runtime('shadow');
    for (const snapshot of legacySnapshots) {
      const cell = shadow.getGradeDomainCell(snapshot.gradeId, snapshot.domainId)!;
      const result = shadow.evaluateCoverage(
        snapshot.gradeId,
        snapshot.domainId,
        cell.objectiveConcepts.map((item) => item.id)
      );
      expect(result.semanticStatus).toBe('COMPLETE');
    }
    expect(shadow.getStatus().authority).toBe('legacy');
  });

  it.each([
    ['lvl_p3:f_locomotion__7', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__6', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__3', 'SPLIT_REQUIRES_REVIEW'],
  ])('resolves %s informationally as %s', (id, status) => {
    expect(runtime('shadow').resolveObjectiveReference(id).status).toBe(status);
  });

  it('does not use moved-domain or split references as false coverage aliases', () => {
    const shadow = runtime('shadow');
    for (const id of [
      'lvl_p3:f_locomotion__7',
      'lvl_p5:f_locomotion__6',
      'lvl_p5:f_locomotion__3',
    ]) {
      expect(shadow.evaluateCoverage(id.slice(0, 6), 'f_locomotion', [id]).semanticStatus).toBe(
        'UNMAPPED'
      );
    }
  });

  it('classifies the reviewed 15-cell wording differences as expected corrections', () => {
    const shadow = runtime('shadow');
    const comparisons = legacySnapshots.map((item) => shadow.compareLegacyReference(item)!);
    expect(comparisons).toHaveLength(15);
    expect(comparisons.every((item) => item.status === 'EXPECTED_CORRECTION')).toBe(true);
    expect(evaluateRuntimeIntegrationGate(comparisons)).toEqual({
      result: 'PASS',
      unexpectedCriticalConflicts: 0,
    });
  });

  it('blocks Gate I for an unexplained conflict', () => {
    const cell = runtime('shadow').getGradeDomainCell('lvl_p1', 'f_locomotion')!;
    const conflict = compareKnowledgeCoreCell(
      { gradeId: 'unknown-grade', domainId: 'unknown-domain', finalCompetency: 'unreviewed' },
      cell
    );
    expect(conflict.status).toBe('CONFLICT');
    expect(evaluateRuntimeIntegrationGate([conflict]).result).toBe('BLOCK');
  });

  it('preserves Teacher wording, custom objectives, count, order, and integration placement', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ الخاصة' },
    });
    const before = structuredClone(plan);
    const shadow = runtime('shadow');
    for (const domain of plan.domains) {
      shadow.compareLegacyReference({
        gradeId: plan.levelId,
        domainId: domain.fieldId,
        finalCompetency: COMPLETE_ANNUAL_CURRICULUM.lvl_p1.fields[domain.fieldId].finalCompetency,
        objectiveReferenceIds: domain.objectives.flatMap((item) =>
          item.sourceReferenceId ? [item.sourceReferenceId] : []
        ),
      });
    }
    expect(plan).toEqual(before);
  });

  it('has no persistence surface and protects executed history', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/prisma|fetch\(|localStorage|createMany|updateMany|deleteMany/);
    expect(source).not.toMatch(/ClassPlannedSession|NotebookEntry|LessonPlan|Assessment/);
  });

  it('rolls shadow and simulated candidate back to legacy by configuration', () => {
    expect(runtime('shadow').getStatus().candidateParticipates).toBe(true);
    expect(runtime('candidate', true).getStatus().authority).toBe('candidate');
    expect(runtime('legacy').getStatus()).toMatchObject({
      authority: 'legacy',
      candidateParticipates: false,
    });
  });

  it('invalid environment configuration resolves to legacy without approval', () => {
    const config = knowledgeCoreConfigFromEnvironment({
      ARENASPEX_KNOWLEDGE_CORE_MODE: 'invalid',
      ARENASPEX_KNOWLEDGE_CORE_PRODUCT_APPROVED: 'false',
    });
    expect(createKnowledgeCoreRuntime(config).getStatus().authority).toBe('legacy');
  });

  it('allows only the narrow Teacher Learning Plan feature to import the boundary', () => {
    const featureFiles = walk(join(process.cwd(), 'src')).filter((file) =>
      /[\\/](components|services)[\\/]/.test(file)
    );
    const directCandidate = featureFiles.filter((file) =>
      readFileSync(file, 'utf8').includes('p1fcCombinedSemanticRelease')
    );
    const directSource = featureFiles.filter((file) =>
      readFileSync(file, 'utf8').includes('officialCurriculum2023')
    );
    const boundaryConsumers = featureFiles
      .filter((file) => readFileSync(file, 'utf8').includes('knowledgeCoreRuntime'))
      .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'));
    expect(directCandidate).toEqual([]);
    expect(directSource).toEqual([]);
    expect(boundaryConsumers).toEqual(['src/services/teacherLearningPlan.service.ts']);
  });

  it('keeps the source immutable and P1E inactive', () => {
    expect(Object.isFrozen(P1FC_COMBINED_SEMANTIC_CATALOG)).toBe(true);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });
});
