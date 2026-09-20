import { describe, expect, it } from 'vitest';
import {
  assertUniqueRemedialResourceIds,
  evaluateRemedialCompatibility,
  getRemedialResource,
  listCompatibleRemedialResources,
  listRemedialResources,
} from '../src/services/diagnosticRemedialResource.service';

const p1Locomotion = { gradeLevelId: 'lvl_p1', domainId: 'f_locomotion' };

describe('diagnostic remedial resource compatibility', () => {
  it('uses explicit unique remedial IDs and recognizes the canonical resource', () => {
    assertUniqueRemedialResourceIds();
    expect(listRemedialResources()).toHaveLength(1);
    expect(getRemedialResource('k_r1')?.category).toBe('remedial');
    expect(getRemedialResource('missing')).toBeNull();
  });

  it('classifies matching grade/domain as contextual, never exact without canonical criterion metadata', () => {
    const result = evaluateRemedialCompatibility(getRemedialResource('k_r1'), p1Locomotion);
    expect(result).toMatchObject({ compatible: true, level: 'CONTEXTUAL' });
    expect(result.unavailableDimensions).toEqual(['finalCompetency', 'criterion', 'indicator']);
  });

  it('rejects wrong grade, cross-domain, and non-remedial resources', () => {
    expect(
      evaluateRemedialCompatibility(getRemedialResource('k_r1'), {
        ...p1Locomotion,
        gradeLevelId: 'lvl_p6',
      }).level
    ).toBe('INCOMPATIBLE');
    expect(
      evaluateRemedialCompatibility(getRemedialResource('k_r1'), {
        ...p1Locomotion,
        domainId: 'f_structuring',
      }).level
    ).toBe('INCOMPATIBLE');
    expect(evaluateRemedialCompatibility(null, p1Locomotion).level).toBe('INCOMPATIBLE');
  });

  it('orders compatible resources deterministically', () => {
    const resources = listCompatibleRemedialResources(p1Locomotion);
    expect(resources.map((resource) => resource.resourceId)).toEqual(['k_r1']);
    expect(resources[0].compatibility.level).toBe('CONTEXTUAL');
  });
});
