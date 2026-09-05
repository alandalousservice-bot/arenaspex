import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  batchMutationResponse,
  createBatchMutationOutcome,
  isPrismaRecordNotFoundError,
} from '../src/server/mutationOutcome';

const apiRouter = readFileSync('src/server/apiRouter.ts', 'utf8');

describe('P1-6 accurate mutation outcome reporting', () => {
  it('classifies only Prisma P2025 as an idempotent missing-record delete', () => {
    expect(isPrismaRecordNotFoundError({ code: 'P2025' })).toBe(true);
    expect(isPrismaRecordNotFoundError({ code: 'P2003' })).toBe(false);
    expect(isPrismaRecordNotFoundError(new Error('database unavailable'))).toBe(false);
    expect(isPrismaRecordNotFoundError(null)).toBe(false);
  });

  it('keeps the successful batch count compatible and accurate', () => {
    const outcome = createBatchMutationOutcome(4);
    outcome.succeeded = 2;
    outcome.skipped = 1;
    outcome.failed = 1;

    expect(batchMutationResponse(outcome)).toEqual({
      success: true,
      count: 2,
      requested: 4,
      succeeded: 2,
      skipped: 1,
      failed: 1,
    });
  });

  it('reports all-success and all-skipped batches without inflating count', () => {
    const allSuccess = createBatchMutationOutcome(3);
    allSuccess.succeeded = 3;
    expect(batchMutationResponse(allSuccess).count).toBe(3);

    const allSkipped = createBatchMutationOutcome(3);
    allSkipped.skipped = 3;
    expect(batchMutationResponse(allSkipped)).toMatchObject({
      count: 0,
      requested: 3,
      succeeded: 0,
      skipped: 3,
      failed: 0,
    });
  });

  it('defines explicit missing, deleted, forbidden, and database-failure paths', () => {
    expect(apiRouter).toContain("outcome: 'not_found'");
    expect(apiRouter).toContain("outcome: 'deleted'");
    expect(apiRouter).toContain(
      "res.status(403).json({ error: 'لا تملك الصلاحية لحذف هذا العنصر.' })"
    );
    expect(apiRouter).toContain("code: 'MUTATION_FAILED'");
    expect(apiRouter).not.toContain('catch {\n      // غير موجود مسبقاً');
  });

  it('accounts for invalid, unauthorized, and failed batch entries', () => {
    expect(apiRouter).toContain('const outcome = createBatchMutationOutcome(items.length);');
    expect(apiRouter).toContain('outcome.skipped += 1;');
    expect(apiRouter).toContain('outcome.failed += 1;');
    expect(apiRouter).toContain('return res.json(batchMutationResponse(outcome));');
    expect(apiRouter).not.toContain('res.json({ success: true, count: items.length });');
  });

  it('keeps protected admin and annual-plan deletes on explicit error paths', () => {
    expect(apiRouter).toContain("apiRouter.delete('/db/users/:id', requireRole('admin')");
    expect(apiRouter).toContain('حساب مالك المنصة محمي ولا يمكن حذفه.');
    expect(apiRouter).toContain("apiRouter.delete('/db/annual-plans/:id'");
    expect(apiRouter).toContain('Error deleting annual plan:');
  });
});
