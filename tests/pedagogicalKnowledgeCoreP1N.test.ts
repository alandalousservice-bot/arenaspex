import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST } from '../src/domain/pedagogicalKnowledge/migrations/domainOneLegacyP1E.manifest';
import {
  P1FC_COMBINED_SEMANTIC_CATALOG,
  P1FC_RELEASE_ID,
  validateP1FCCombinedRelease,
} from '../src/domain/pedagogicalKnowledge/releases/p1fcCombinedSemanticRelease';
import { createKnowledgeCoreRuntime } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntime';
import {
  buildKnowledgeCoreRuntimeDiagnostic,
  emitKnowledgeCoreRuntimeDiagnosticOnce,
  KNOWLEDGE_CORE_RUNTIME_DIAGNOSTIC_FIELDS,
} from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntimeDiagnostic';
import { KNOWLEDGE_CORE_PRODUCT_APPROVAL } from '../src/domain/pedagogicalKnowledge/runtime/knowledgeCoreProductApproval';
import { seedTeacherLearningPlan } from '../src/services/teacherLearningPlan.service';
import type { PedagogicalKnowledgeCatalog } from '../src/domain/pedagogicalKnowledge/types';

const candidate = () =>
  createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: P1FC_RELEASE_ID });

describe('P1N safe runtime activation diagnostics', () => {
  it('reports approved valid candidate authority', () => {
    expect(buildKnowledgeCoreRuntimeDiagnostic(candidate())).toEqual({
      requestedMode: 'candidate',
      effectiveMode: 'candidate',
      authority: 'candidate',
      releaseId: P1FC_RELEASE_ID,
      approvalStatus: 'approved',
      validationStatus: 'PASS',
      fallbackReason: null,
    });
  });

  it('reports legacy defaults without changing authority', () => {
    expect(buildKnowledgeCoreRuntimeDiagnostic(createKnowledgeCoreRuntime())).toMatchObject({
      requestedMode: 'legacy',
      effectiveMode: 'legacy',
      authority: 'legacy',
      validationStatus: 'NOT_REQUESTED',
      fallbackReason: null,
    });
  });

  it('reports shadow while legacy remains authoritative', () => {
    expect(
      buildKnowledgeCoreRuntimeDiagnostic(
        createKnowledgeCoreRuntime({ mode: 'shadow', releaseId: P1FC_RELEASE_ID })
      )
    ).toMatchObject({ requestedMode: 'shadow', effectiveMode: 'shadow', authority: 'legacy' });
  });

  it('makes unknown release fallback visible', () => {
    expect(
      buildKnowledgeCoreRuntimeDiagnostic(
        createKnowledgeCoreRuntime({ mode: 'candidate', releaseId: 'unknown' })
      )
    ).toMatchObject({
      requestedMode: 'candidate',
      effectiveMode: 'legacy',
      authority: 'legacy',
      fallbackReason: 'UNKNOWN_RELEASE',
    });
  });

  it('makes unapproved release fallback visible', () => {
    const pending = { ...KNOWLEDGE_CORE_PRODUCT_APPROVAL, approvalStatus: 'pending' as const };
    const runtime = createKnowledgeCoreRuntime(
      { mode: 'candidate', releaseId: P1FC_RELEASE_ID },
      { approvalRecord: pending }
    );
    expect(buildKnowledgeCoreRuntimeDiagnostic(runtime)).toMatchObject({
      effectiveMode: 'legacy',
      approvalStatus: 'pending',
      fallbackReason: 'PRODUCT_APPROVAL_REQUIRED',
    });
  });

  it('makes validation failure fallback visible', () => {
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
    expect(buildKnowledgeCoreRuntimeDiagnostic(runtime)).toMatchObject({
      effectiveMode: 'legacy',
      validationStatus: 'FAIL',
      fallbackReason: 'CANDIDATE_VALIDATION_FAILED',
    });
  });

  it('uses an exact technical-field allowlist and contains no personal or free text', () => {
    const event = buildKnowledgeCoreRuntimeDiagnostic(candidate());
    expect(Object.keys(event)).toEqual(KNOWLEDGE_CORE_RUNTIME_DIAGNOSTIC_FIELDS);
    expect(JSON.stringify(event)).not.toMatch(
      /teacher|student|school|district|objective|situation|notes|token|secret|cookie|database|apiKey/i
    );
  });

  it('emits one structured line per runtime initialization lifecycle', () => {
    const runtime = candidate();
    const lines: string[] = [];
    emitKnowledgeCoreRuntimeDiagnosticOnce(runtime, (line) => lines.push(line));
    emitKnowledgeCoreRuntimeDiagnosticOnce(runtime, (line) => lines.push(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      `[KnowledgeCoreRuntime] ${JSON.stringify(buildKnowledgeCoreRuntimeDiagnostic(runtime))}`
    );
  });

  it('does not change Teacher plan behavior or introduce persistence and keeps P1E inactive', () => {
    expect(seedTeacherLearningPlan('lvl_p1', {}, candidate()).domains).toHaveLength(3);
    const diagnosticSource = readFileSync(
      join(
        process.cwd(),
        'src/domain/pedagogicalKnowledge/runtime/knowledgeCoreRuntimeDiagnostic.ts'
      ),
      'utf8'
    );
    expect(diagnosticSource).not.toMatch(/prisma|createMany|updateMany|deleteMany/);
    expect(DOMAIN_ONE_LEGACY_P1E_MIGRATION_MANIFEST.status).toBe('reviewed_not_activated');
  });

  it('keeps feature imports behind the runtime and excludes direct official-source imports', () => {
    const service = readFileSync(
      join(process.cwd(), 'src/services/teacherLearningPlan.service.ts'),
      'utf8'
    );
    expect(service).not.toContain('p1fcCombinedSemanticRelease');
    expect(service).not.toContain('officialCurriculum2023');
  });

  it('wires the singleton diagnostic once at server startup without an endpoint', () => {
    const server = readFileSync(join(process.cwd(), 'server.ts'), 'utf8');
    expect(
      server.match(/emitKnowledgeCoreRuntimeDiagnosticOnce\(knowledgeCoreRuntime/g)
    ).toHaveLength(1);
    expect(server).not.toMatch(/app\.(get|post|put|patch|delete)\([^\n]*knowledge.?core/i);
  });
});
