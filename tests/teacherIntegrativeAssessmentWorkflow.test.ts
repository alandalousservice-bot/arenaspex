import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const view = readFileSync('src/components/assessment/AssessmentNotebookView.tsx', 'utf8');

describe('teacher Integrative assessment workflow', () => {
  it('uses server evidence labels and localized pedagogical context', () => {
    expect(view).toContain('إدماجية ${session.integration.number}');
    expect(view).toContain("'إدماجية'");
    expect(view).toContain('domainLabel(activeSession.gradeLevelId, activeSession.domainId)');
    expect(view).toContain('activeSession.integration.coveredReferences.map');
    expect(view).toContain('assessmentCatalog?.finalCompetency.label');
  });

  it('loads standalone options from the authoritative API and submits only the point id', () => {
    expect(view).toContain('fetchTeacherIntegrativeAssessmentOptions');
    expect(view).toContain('selectedIntegrationPointId');
    expect(view).toContain(
      "integrationPointId: manualType === 'INTEGRATIVE' ? selectedIntegrationPointId : null"
    );
    expect(view).not.toContain('coveredReferenceIds:');
    expect(view).not.toContain('integrativeEvidenceSnapshot:');
  });

  it('does not expose raw assessment or domain identifiers in teacher presentation', () => {
    expect(view).not.toContain('{activeSession.assessmentType} · {activeSession.domainId}');
    expect(view).not.toContain('{session.assessmentType} · {session.assessedAt.slice(0, 10)}');
    expect(view).not.toContain('integrationPointId}</');
  });

  it('keeps loading, error, empty, and disabled submission states explicit', () => {
    expect(view).toContain('integrativeOptionsLoading');
    expect(view).toContain('integrativeOptionsError');
    expect(view).toContain('لا تتوفر نقطة إدماجية صالحة لهذا السياق.');
    expect(view).toContain('disabled={');
  });
});
