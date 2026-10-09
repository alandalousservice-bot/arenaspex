/** Retry whole transactions only. Never retry statements in an aborted transaction. */
export async function retryTransaction<T>(operation: string, run: () => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await run();
      if (attempt > 1) log('succeeded', operation, attempt, maxAttempts);
      return result;
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2034') throw error;
      if (attempt === maxAttempts) {
        log('exhausted', operation, attempt, maxAttempts);
        throw error;
      }
      // 40–79ms, then 80–119ms; total added wait <=198ms.
      const delayMs = attempt * 40 + Math.floor(Math.random() * 40);
      log('retry', operation, attempt, maxAttempts, delayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
function log(
  outcome: string,
  operation: string,
  attempt: number,
  maxAttempts: number,
  delayMs?: number
) {
  // Operation names are static code labels, never user/request values.
  process.stdout.write(
    `[TransactionTelemetry] ${JSON.stringify({ event: 'transaction.conflict', operation, outcome, attempt, maxAttempts, delayMs, timestamp: new Date().toISOString(), instanceId: process.env.RENDER_INSTANCE_ID, gitCommit: process.env.RENDER_GIT_COMMIT })}\n`
  );
}
