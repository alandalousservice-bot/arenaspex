import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import { P1FC_RELEASE_ID } from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';

const approval = KNOWLEDGE_CORE_PRODUCT_APPROVAL;
const approvedForTest = {
  ...approval,
  approvalStatus: 'approved' as const,
  approvedAt: 'test-only',
};

describe('P1J product approval review and activation control', () => {
  it('contains all 15 reviewed cells tied to the candidate', () => {
    expect(approval.reviewedCells).toHaveLength(15);
    expect(
      approval.reviewedCells.every((cell) => cell.candidateReleaseId === P1FC_RELEASE_ID)
    ).toBe(true);
  });

  it('has no HOLD or REJECT decisions in the completed review', () => {
    expect(approval.reviewSummary).toEqual({
      approve: 6,
      approveWithNote: 9,
      hold: 0,
      reject: 0,
    });
  });

  it('keeps repository approval pending and blocks candidate authority', () => {
    const result = createKnowledgeCoreRuntime({ mode: 'candidate', productApproved: true });
    expect(result.getStatus()).toMatchObject({
      authority: 'legacy',
      approvalStatus: 'pending',
      diagnostic: {
        approvalStatus: 'pending',
        authority: 'legacy',
        fallbackReason: 'PRODUCT_APPROVAL_REQUIRED',
      },
    });
  });

  it('permits explicitly configured candidate only with an approved record', () => {
    const result = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID, productApproved: true },
      { approvalRecord: approvedForTest }
    );
    expect(result.getStatus()).toMatchObject({
      authority: 'candidate',
      approvalStatus: 'approved',
      productApproved: true,
    });
  });

  it.each([
    [undefined, 'legacy'],
    ['invalid', 'legacy'],
    ['shadow', 'legacy'],
  ])('keeps authority legacy for mode %s', (mode, authority) => {
    expect(createKnowledgeCoreRuntime({ mode }).getStatus().authority).toBe(authority);
  });

  it('rolls an approved simulated candidate immediately back to legacy', () => {
    const active = createKnowledgeCoreRuntime(
      { mode: 'candidate', productApproved: true },
      { approvalRecord: approvedForTest }
    );
    expect(active.getStatus().authority).toBe('candidate');
    expect(createKnowledgeCoreRuntime({ mode: 'legacy' }).getStatus().authority).toBe('legacy');
  });

  it.each([
    ['lvl_p3:f_locomotion__7', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__6', 'MOVED_DOMAIN'],
    ['lvl_p5:f_locomotion__3', 'SPLIT_REQUIRES_REVIEW'],
  ])('retains safe historical resolution for %s', (referenceId, status) => {
    expect(
      createKnowledgeCoreRuntime({ mode: 'shadow' }).resolveObjectiveReference(referenceId)
    ).toMatchObject({ status });
  });

  it('reviews the four critical D3 corrections with notes and G5 progression as approved', () => {
    const d3 = approval.reviewedCells.filter((cell) => cell.domainId === 'f_structuring');
    expect(
      d3
        .filter((cell) => cell.gradeId !== 'lvl_p5')
        .every((cell) => cell.decision === 'APPROVE_WITH_NOTE')
    ).toBe(true);
    expect(d3.find((cell) => cell.gradeId === 'lvl_p5')?.decision).toBe('APPROVE');
    expect(d3.every((cell) => cell.differenceClassification === 'EXPECTED_CORRECTION')).toBe(true);
  });

  it('does not mutate Teacher wording, custom content, count, order, or integration placement', () => {
    const plan = seedTeacherLearningPlan('lvl_p1', {
      f_locomotion__2: { objective: 'صياغة الأستاذ الخاصة' },
    });
    const before = structuredClone(plan);
    createKnowledgeCoreRuntime({ mode: 'shadow' }).compareLegacyReference({
      gradeId: 'lvl_p1',
      domainId: 'f_locomotion',
      finalCompetency: 'مرجع قديم',
      objectiveReferenceIds: plan.domains[0].objectives.map((item) => item.sourceReferenceId || ''),
    });
    expect(plan).toEqual(before);
  });

  it('keeps executed history untouched, P1E inactive, and runtime free of persistence', () => {
    const runtimeSource = readFileSync(
      join(process.cwd(), 'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime.ts'),
      'utf8'
    );
    expect(runtimeSource).not.toMatch(/prisma|fetch\(|createMany|updateMany|deleteMany/);
    expect(runtimeSource).not.toMatch(/ClassPlannedSession|NotebookEntry|LessonPlan|Assessment/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('keeps feature dependency direction behind the runtime boundary', () => {
    const feature = readFileSync(
      join(process.cwd(), 'src/services/teacherLearningPlan.service.ts'),
      'utf8'
    );
    expect(feature).toContain('runtime/knowledgeCoreRuntime');
    expect(feature).not.toContain('p1fcCombinedSemanticRelease');
    expect(feature).not.toContain('officialCurriculum2023');
  });

  it('exposes only non-personal structured approval diagnostics', () => {
    const diagnostic = createKnowledgeCoreRuntime({ mode: 'candidate' }).getStatus().diagnostic;
    expect(diagnostic).toMatchObject({
      approvalStatus: 'pending',
      authority: 'legacy',
    });
    expect(Object.keys(diagnostic)).not.toEqual(
      expect.arrayContaining(['teacherName', 'teacherText', 'studentData', 'personalData'])
    );
  });
});
