import { describe, expect, it } from 'vitest';
import {
  adaptEducationalSituation,
  adaptLegacyGame,
  mergePedagogicalSituationReadModels,
} from '../src/services/pedagogicalSituationReadModel.service';
import { EducationalSituation, KnowledgeItem } from '../src/types/spex';

const canonical: EducationalSituation = {
  id: 'sit-1',
  externalId: 'reference-sit-1',
  name: 'موقف قانوني',
  grade: 1,
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  objectiveIds: ['obj-1'],
  objectiveTexts: ['هدف قانوني'],
  sourceGoal: 'الهدف',
  organization: 'أفواج',
  equipment: ['أقماع'],
  origin: 'REFERENCE_SEED',
  status: 'APPROVED',
  instructions: 'تعليمات',
  motorActions: ['جري'],
};

const game: KnowledgeItem = {
  id: 'game-1',
  category: 'game',
  title: 'لعبة قديمة',
  description: 'وصف اللعبة',
  fieldId: 'f_locomotion',
  fieldName: 'الوضعيات والتنقلات',
  objectiveId: 'obj-1',
  objectiveText: 'هدف قانوني',
  tags: ['جري'],
  equipment: ['أقماع'],
  rules: 'قواعد',
  approved: true,
  status: 'APPROVED',
  ownerId: undefined,
  createdBy: 'مرجع',
  usageCount: 0,
  rating: 0,
  levelId: 'lvl_p1',
};

describe('canonical pedagogical situation read model', () => {
  it('keeps EducationalSituation canonical and preserves supported fields', () => {
    const read = adaptEducationalSituation(canonical);
    expect(read.source).toBe('EDUCATIONAL_SITUATION');
    expect(read.id).toBe('sit-1');
    expect(read.objectiveIds).toEqual(['obj-1']);
    expect(read.equipment).toEqual(['أقماع']);
    expect(read.motorActions).toEqual(['جري']);
    expect(read.provenance.externalId).toBe('reference-sit-1');
  });

  it('adapts legacy content without fabricating unsupported metadata', () => {
    const read = adaptLegacyGame(game);
    expect(read.source).toBe('LEGACY_GAME');
    expect(read.id).toBe('legacy-game:game-1');
    expect(read.objectiveIds).toEqual(['obj-1']);
    expect(read.equipment).toEqual(['أقماع']);
    expect(read.successCriteria).toBeUndefined();
    expect(read.lessonTypes).toBeUndefined();
    expect(read.provenance.canonicalSituationId).toBeUndefined();
  });

  it('suppresses only a legacy record with an explicit canonical link', () => {
    const canonicalRead = adaptEducationalSituation(canonical);
    const linkedLegacy = adaptLegacyGame({
      ...game,
      canonicalSituationId: 'sit-1',
    } as KnowledgeItem & { canonicalSituationId: string });
    const distinctLegacy = adaptLegacyGame({ ...game, id: 'game-2', title: 'نفس العنوان' });
    const merged = mergePedagogicalSituationReadModels(
      [canonicalRead],
      [linkedLegacy, distinctLegacy]
    );
    expect(merged.map((item) => item.id)).toEqual(['sit-1', 'legacy-game:game-2']);
  });

  it('does not merge records by title alone', () => {
    const canonicalRead = adaptEducationalSituation(canonical);
    const sameTitle = adaptLegacyGame({ ...game, title: canonical.name });
    expect(mergePedagogicalSituationReadModels([canonicalRead], [sameTitle])).toHaveLength(2);
  });
});
