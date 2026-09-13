import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { syncLessonPlanToDB } from '../src/services/api';

const store = readFileSync('src/hooks/usePlatformStore.ts', 'utf8');
const view = readFileSync('src/components/lesson/LessonPlanView.tsx', 'utf8');
const memoService = readFileSync('src/services/lessonMemoGeneration.service.ts', 'utf8');

describe('MEMO-DEEP-CLEAN-P2A', () => {
  it('does not resolve a memo save before the server acknowledges it', async () => {
    let resolveRequest!: (value: { ok: boolean }) => void;
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolveRequest = resolve;
          })
      )
    );
    let settled = false;
    const save = syncLessonPlanToDB({ id: 'memo-p2a' }).then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(resolveRequest).toBeTypeOf('function'));
    expect(settled).toBe(false);
    resolveRequest({ ok: true });
    await save;
    expect(settled).toBe(true);
  });

  it('turns an unacknowledged HTTP response into a retryable failure', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 422 }))
    );
    await expect(syncLessonPlanToDB({ id: 'memo-p2a' })).rejects.toThrow(
      'LESSON_MEMO_PERSISTENCE_FAILED'
    );
  });

  it('awaits and deduplicates store saves by memo identity', () => {
    expect(store).toContain('await syncLessonPlanToDB(newPlan);');
    expect(store).toContain('lessonPlanSaveInFlight');
    expect(store).toContain('if (existingSave) return existingSave;');
    expect(store).toContain('setLessonPlans((prev) =>');
  });

  it('exposes acknowledged save state and preserves retry boundaries in the workspace', () => {
    expect(view).toContain("'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'");
    expect(view).toContain('await onSaveLessonPlan(nextPlan);');
    expect(view).toContain('تم حفظ المذكرة على الخادم');
    expect(view).toContain('تعذر حفظ المذكرة. لم تضِع التعديلات، ويمكنك إعادة المحاولة.');
    expect(view).toContain('if (!(await persistLessonPlan(savedPlan))) return;');
    expect(view).toContain(
      'if (!(await persistLessonPlan(saveLessonMemo(plan, existingOperationalMemo)))) return;'
    );
    expect(view).toContain("memoMode === 'operational'");
    expect(view).toContain("memoMode === 'annual'");
  });

  it('keeps scheduled ownership and regeneration guards in place', () => {
    expect(view).toContain('isOwnedOperationalSession(scheduledContext.session');
    expect(view).toContain('regenerateLessonMemo(context, selected, confirmed)');
    expect(memoService).toContain('REGENERATION_CONFIRMATION_REQUIRED');
    expect(view).toContain('saveError');
    expect(view).toContain('manualEdits');
  });
});
