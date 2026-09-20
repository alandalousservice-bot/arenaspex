import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_INTERVENTION_STATUSES,
  interventionResourceSnapshot,
  isDiagnosticInterventionStatus,
  transitionIntervention,
  isAllowedInterventionTransition,
} from '../src/services/diagnosticIntervention.service';

describe('diagnostic intervention contract', () => {
  it('accepts only canonical lifecycle statuses', () => {
    expect(DIAGNOSTIC_INTERVENTION_STATUSES).toEqual([
      'SELECTED',
      'APPLIED',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(isDiagnosticInterventionStatus('APPLIED')).toBe(true);
    expect(isDiagnosticInterventionStatus('UNKNOWN')).toBe(false);
  });

  it('preserves lifecycle timestamps and cancellation history', () => {
    const applied = new Date('2026-09-20T10:00:00.000Z');
    const completed = transitionIntervention(
      'COMPLETED',
      { appliedAt: applied },
      new Date('2026-09-21T10:00:00.000Z')
    );
    expect(completed.appliedAt).toBe(applied);
    expect(completed.completedAt).toEqual(new Date('2026-09-21T10:00:00.000Z'));
    expect(transitionIntervention('CANCELLED')).toEqual({ status: 'CANCELLED' });
  });

  it('creates a server-owned snapshot only for approved remedial resources', () => {
    const snapshot = interventionResourceSnapshot('k_r1');
    expect(snapshot).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      remedialProblem: expect.any(String),
      targetSkill: expect.any(String),
    });
    expect(interventionResourceSnapshot('k_g1')).toBeNull();
    expect(interventionResourceSnapshot('client-injected-resource')).toBeNull();
  });

  it('blocks terminal lifecycle reversals', () => {
    expect(isAllowedInterventionTransition('SELECTED', 'APPLIED')).toBe(true);
    expect(isAllowedInterventionTransition('APPLIED', 'COMPLETED')).toBe(true);
    expect(isAllowedInterventionTransition('COMPLETED', 'SELECTED')).toBe(false);
    expect(isAllowedInterventionTransition('COMPLETED', 'APPLIED')).toBe(false);
    expect(isAllowedInterventionTransition('CANCELLED', 'SELECTED')).toBe(false);
    expect(isAllowedInterventionTransition('CANCELLED', 'APPLIED')).toBe(false);
    expect(isAllowedInterventionTransition('CANCELLED', 'COMPLETED')).toBe(false);
  });
});
