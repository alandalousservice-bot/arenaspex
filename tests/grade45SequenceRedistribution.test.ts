import { describe, expect, it } from 'vitest';
import { generateAllPrimaryLevelDistributions } from '../src/services/teacherPlanning.service';

describe('Grade 4/5 learning sequence redistribution', () => {
  it.each(['lvl_p4', 'lvl_p5'] as const)(
    'generates complete 6/6/6 domain paths for %s',
    (levelId) => {
      const distribution = generateAllPrimaryLevelDistributions(
        '2026-2027',
        '2026-09-21'
      ).levels.find((level) => level.levelId === levelId)!;

      expect(distribution.sessions.length).toBe(levelId === 'lvl_p4' ? 48 : 30);
      expect(
        distribution.sessions.filter((session) => session.sessionType === 'تعلمية')
      ).toHaveLength(levelId === 'lvl_p4' ? 36 : 18);
      for (const domainId of ['f_locomotion', 'f_fundamentals', 'f_structuring']) {
        const sessions = distribution.sessions.filter((session) => session.domainId === domainId);
        const learning = sessions.filter((session) => session.sessionType === 'تعلمية');
        expect(learning.length).toBe(levelId === 'lvl_p4' ? 12 : 6);
        expect(sessions.filter((session) => session.sessionType === 'تقويم تشخيصي')).toHaveLength(
          1
        );
        expect(sessions.filter((session) => session.sessionType === 'إدماجية')).toHaveLength(2);
        expect(sessions.filter((session) => session.sessionType === 'تقويم تحصيلي')).toHaveLength(
          1
        );
      }
    }
  );

  it('keeps Grades 1–3 unchanged', () => {
    const distributions = generateAllPrimaryLevelDistributions('2026-2027', '2026-09-21').levels;
    expect(distributions.slice(0, 3).map((level) => level.sessionCount)).toEqual([34, 34, 34]);
  });
});
