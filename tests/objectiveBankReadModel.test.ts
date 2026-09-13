import { describe, expect, it } from 'vitest';
import { INITIAL_KNOWLEDGE_BANK } from '../src/data/knowledgeBankData';
import {
  buildObjectiveBankReadModel,
  filterObjectiveBankReadModel,
} from '../src/services/objectiveBankReadModel.service';

describe('Objective Bank G2 read model', () => {
  const model = buildObjectiveBankReadModel(INITIAL_KNOWLEDGE_BANK);

  it('uses the canonical registry and identifies adoption from the actual section sequence', () => {
    const adopted = model.find((item) => item.canonicalObjectiveId === 'G1-D2-OBJ-01');
    expect(adopted).toMatchObject({
      gradeId: 'lvl_p1',
      domainId: 'f_fundamentals',
      adoptionStatus: 'UNUSED',
    });
    expect(model.every((item) => item.canonicalObjectiveId)).toBe(true);

    const linkedReference = {
      ...INITIAL_KNOWLEDGE_BANK.find((item) => item.category === 'objective')!,
      id: 'qa-linked-objective',
      objectiveId: 'G1-D2-OBJ-01',
    };
    expect(
      buildObjectiveBankReadModel([...INITIAL_KNOWLEDGE_BANK, linkedReference]).find(
        (item) => item.canonicalObjectiveId === 'G1-D2-OBJ-01'
      )?.adoptionStatus
    ).toBe('ADOPTED');
  });

  it('does not mark an objective outside the current section as adopted', () => {
    const unused = model.find((item) => item.adoptionStatus === 'UNUSED');
    expect(unused).toBeDefined();
    expect(unused?.adoptedInCurrentSection).toBe(false);
  });

  it('keeps alternative wording read-only and attached to the stable canonical objective', () => {
    const canonical = INITIAL_KNOWLEDGE_BANK.find((item) => item.category === 'objective')!;
    const alternative = {
      ...canonical,
      id: 'qa-alternative-wording',
      title: 'صياغة تعليمية بديلة للاختبار',
      description: 'صياغة تعليمية بديلة للاختبار',
      objectiveId: 'G1-D2-OBJ-01',
    };
    const result = buildObjectiveBankReadModel([...INITIAL_KNOWLEDGE_BANK, alternative]);
    const objective = result.find((item) => item.canonicalObjectiveId === 'G1-D2-OBJ-01')!;
    expect(objective.alternativeWording).toEqual([
      expect.objectContaining({
        objectiveId: 'G1-D2-OBJ-01',
        wording: 'صياغة تعليمية بديلة للاختبار',
      }),
    ]);
    expect(result.filter((item) => item.canonicalObjectiveId === 'G1-D2-OBJ-01')).toHaveLength(1);
  });

  it('does not infer equivalent objectives from same-domain membership', () => {
    expect(model.every((item) => item.alternativeObjectives.length === 0)).toBe(true);
  });

  it('supports grade, domain, final-competency and adoption filters', () => {
    expect(
      filterObjectiveBankReadModel(model, { gradeId: 'lvl_p2' }).every(
        (item) => item.gradeId === 'lvl_p2'
      )
    ).toBe(true);
    expect(
      filterObjectiveBankReadModel(model, { domainId: 'f_structuring' }).every(
        (item) => item.domainId === 'f_structuring'
      )
    ).toBe(true);
    const competency = model.find((item) => item.finalCompetency)?.finalCompetency;
    expect(
      filterObjectiveBankReadModel(model, { finalCompetency: competency }).every(
        (item) => item.finalCompetency === competency
      )
    ).toBe(true);
    expect(
      filterObjectiveBankReadModel(model, { adoptionStatus: 'ADOPTED' }).every(
        (item) => item.adoptionStatus === 'ADOPTED'
      )
    ).toBe(true);
  });

  it('searches wording and supported pedagogical metadata only', () => {
    const objective = model[0];
    expect(filterObjectiveBankReadModel(model, { search: objective.wording })).toContain(objective);
    expect(filterObjectiveBankReadModel(model, { search: objective.requirements[0] })).toContain(
      objective
    );
    expect(filterObjectiveBankReadModel(model, { search: 'المنهاج الرسمي ينص' })).toHaveLength(0);
  });

  it('derives progression, requirements and learner acquisition only from existing fields', () => {
    const objective = model[0];
    expect(objective.progression).toContain('مرحلة');
    expect(objective.progression).not.toContain('الحصة');
    expect(objective.requirements).toEqual(objective.resourceLabels);
    expect(objective.learnerAcquisition).toBe(objective.learningContent);
    expect(objective.whyThisObjective).not.toContain('المنهاج الرسمي ينص');
    expect(objective.criteria.length).toBeGreaterThan(0);
    expect(objective.indicators.length).toBeGreaterThan(0);
  });

  it('does not mutate the source knowledge bank or canonical objects', () => {
    const before = JSON.stringify(INITIAL_KNOWLEDGE_BANK);
    const first = model[0];
    first.requirements.push('لا ينبغي أن يعود للمصدر');
    expect(JSON.stringify(INITIAL_KNOWLEDGE_BANK)).toBe(before);
  });
});
