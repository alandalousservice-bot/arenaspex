import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getLearningSectionComponents } from '../src/data/domainOneLearningSectionReference';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1FC_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import {
  resolveTeacherLearningPlan,
  seedTeacherLearningPlan,
  teacherLearningPlanSchema,
} from '../src/services/teacherLearningPlan.service';

const candidate = createKnowledgeCoreRuntime({
  mode: 'candidate',
  releaseId: P1FC_RELEASE_ID,
});

const allComponentIds = (entry: {
  objectives?: readonly { competencyComponentIds?: readonly string[] }[];
  integrationPoints?: readonly { competencyComponentIds?: readonly string[] }[];
  diagnostic?: { competencyComponentIds?: readonly string[] };
  summative?: { competencyComponentIds?: readonly string[] };
}) => [
  ...(entry.objectives || []).flatMap((item) => item.competencyComponentIds || []),
  ...(entry.integrationPoints || []).flatMap((item) => item.competencyComponentIds || []),
  ...(entry.diagnostic?.competencyComponentIds || []),
  ...(entry.summative?.competencyComponentIds || []),
];

describe('P1M production D2/D3 competency-component compatibility regression', () => {
  it('reproduces the old empty-validator mismatch and proves candidate seeding no longer throws', () => {
    const d2CandidateIds = candidate
      .getGradeDomainCell('lvl_p1', 'f_fundamentals')!
      .components.map((item) => item.id);
    const preHotfixAllowedIds = new Set(
      getLearningSectionComponents('lvl_p1', 'f_fundamentals').map((item) => item.id)
    );
    expect(preHotfixAllowedIds.size).toBe(0);
    expect(d2CandidateIds.every((id) => !preHotfixAllowedIds.has(id))).toBe(true);
    expect(() => seedTeacherLearningPlan('lvl_p1', {}, candidate)).not.toThrow();
  });

  it.each(['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5'])(
    'reads all three candidate cells for %s without a ZodError',
    (levelId) => {
      const plan = seedTeacherLearningPlan(levelId, {}, candidate);
      expect(plan.domains).toHaveLength(3);
      expect(() => teacherLearningPlanSchema.parse(plan)).not.toThrow();
    }
  );

  it.each(['f_locomotion', 'f_fundamentals', 'f_structuring'])(
    'keeps %s competency components in their canonical Grade × Domain cell',
    (domainId) => {
      for (const levelId of ['lvl_p1', 'lvl_p2', 'lvl_p3', 'lvl_p4', 'lvl_p5']) {
        const domain = seedTeacherLearningPlan(levelId, {}, candidate).domains.find(
          (item) => item.fieldId === domainId
        )!;
        expect(allComponentIds(domain).length).toBeGreaterThan(0);
        expect(
          allComponentIds(domain).every(
            (id) =>
              candidate.resolveCompetencyComponentReference(levelId, domainId, id).status ===
              'CANONICAL'
          )
        ).toBe(true);
      }
    }
  );

  it.each(['f_fundamentals', 'f_structuring'])(
    'validates seven objectives, both integrations, diagnostic, and summative for %s',
    (domainId) => {
      const domain = seedTeacherLearningPlan('lvl_p1', {}, candidate).domains.find(
        (item) => item.fieldId === domainId
      )!;
      expect(domain.objectives).toHaveLength(7);
      expect(domain.integrationPoints).toHaveLength(2);
      expect(domain.diagnostic?.competencyComponentIds).toHaveLength(3);
      expect(domain.summative?.competencyComponentIds).toHaveLength(3);
      expect(allComponentIds(domain).every((id) => id.includes(`:${domainId}:`))).toBe(true);
    }
  );

  it('keeps strict validation for arbitrary IDs but preserves them on compatible historical reads', () => {
    const plan = seedTeacherLearningPlan('lvl_p1');
    const historical = structuredClone(plan);
    historical.domains[1].objectives[0].competencyComponentIds = ['legacy:unknown:component'];
    expect(teacherLearningPlanSchema.safeParse(historical).success).toBe(false);
    const before = structuredClone(historical);
    const resolved = resolveTeacherLearningPlan('lvl_p1', historical);
    expect(resolved.domains[1].objectives[0].competencyComponentIds).toEqual([
      'legacy:unknown:component',
    ]);
    expect(historical).toEqual(before);
  });

  it('classifies canonical, moved-domain, and unknown component identities without rewriting', () => {
    const canonicalId = candidate.getGradeDomainCell('lvl_p1', 'f_fundamentals')!.components[0].id;
    expect(
      candidate.resolveCompetencyComponentReference('lvl_p1', 'f_fundamentals', canonicalId).status
    ).toBe('CANONICAL');
    expect(
      candidate.resolveCompetencyComponentReference('lvl_p1', 'f_structuring', canonicalId).status
    ).toBe('MOVED_DOMAIN');
    expect(
      candidate.resolveCompetencyComponentReference(
        'lvl_p1',
        'f_fundamentals',
        'legacy:unknown:component'
      ).status
    ).toBe('UNKNOWN');
  });

  it.each([
    ['lvl_p3:f_locomotion__7', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__6', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__3', 'SPLIT_REQUIRES_REVIEW'],
  ])('preserves objective reconciliation %s as %s', (id, status) => {
    expect(candidate.resolveObjectiveReference(id).status).toBe(status);
  });

  it('preserves Teacher wording, custom objectives, count/order, and manual integration placement', () => {
    const plan = seedTeacherLearningPlan(
      'lvl_p1',
      { f_fundamentals__2: { objective: 'صياغة الأستاذ الخاصة' } },
      candidate
    );
    plan.domains[0].integrationPoints[0].objective = 'إدماج الأستاذ الخاص';
    const before = structuredClone(plan);
    const resolved = resolveTeacherLearningPlan('lvl_p1', plan);
    expect(resolved.domains.map((domain) => domain.objectives.map((item) => item.text))).toEqual(
      before.domains.map((domain) => domain.objectives.map((item) => item.text))
    );
    expect(resolved.domains.map((domain) => domain.objectives.map((item) => item.id))).toEqual(
      before.domains.map((domain) => domain.objectives.map((item) => item.id))
    );
    expect(
      resolved.domains.map((domain) =>
        domain.integrationPoints.map((item) => ({
          id: item.id,
          afterObjectiveId: item.afterObjectiveId,
          orderIndex: item.orderIndex,
        }))
      )
    ).toEqual(
      before.domains.map((domain) =>
        domain.integrationPoints.map((item) => ({
          id: item.id,
          afterObjectiveId: item.afterObjectiveId,
          orderIndex: item.orderIndex,
        }))
      )
    );
    expect(resolved.domains[0].integrationPoints[0].objective).toBe('إدماج الأستاذ الخاص');
  });

  it('leaves legacy and shadow output unchanged while candidate succeeds', () => {
    const legacy = createKnowledgeCoreRuntime({ mode: 'legacy' });
    const shadow = createKnowledgeCoreRuntime({ mode: 'shadow' });
    expect(seedTeacherLearningPlan('lvl_p1', {}, legacy)).toEqual(
      seedTeacherLearningPlan('lvl_p1', {}, shadow)
    );
    expect(() => seedTeacherLearningPlan('lvl_p1', {}, candidate)).not.toThrow();
  });

  it('keeps the hotfix read-only, P1E inactive, and feature imports guarded', () => {
    const service = readFileSync(
      join(process.cwd(), 'src/services/teacherLearningPlan.service.ts'),
      'utf8'
    );
    const runtime = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts'),
      'utf8'
    );
    expect(`${service}\n${runtime}`).not.toMatch(/prisma|createMany|updateMany|deleteMany/);
    expect(runtime).not.toMatch(/ClassPlannedSession|NotebookEntry|LessonPlan|Assessment/);
    expect(service).not.toContain('p1fcCombinedSemanticRelease');
    expect(service).not.toContain('officialCurriculum2023');
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });
});
