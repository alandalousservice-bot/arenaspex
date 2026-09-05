export type BatchMutationOutcome = {
  requested: number;
  succeeded: number;
  skipped: number;
  failed: number;
};

/** Prisma's explicit "record not found" code for a delete race. */
export function isPrismaRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  );
}

export function createBatchMutationOutcome(requested: number): BatchMutationOutcome {
  return { requested, succeeded: 0, skipped: 0, failed: 0 };
}

export function batchMutationResponse(outcome: BatchMutationOutcome) {
  return { success: true, count: outcome.succeeded, ...outcome };
}
