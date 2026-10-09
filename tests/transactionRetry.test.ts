import { afterEach, describe, expect, it, vi } from 'vitest';
import { retryTransaction } from '../src/server/transactionRetry';
describe('bounded whole transaction retries', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('waits within the budget and reports recovery without secrets', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const log = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const run = vi
      .fn()
      .mockRejectedValueOnce({ code: 'P2034', message: 'secret password token cookie' })
      .mockResolvedValue('saved');
    const pending = retryTransaction('teacher.profile', run);
    await vi.advanceTimersByTimeAsync(59);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBe('saved');
    expect(run).toHaveBeenCalledTimes(2);
    const text = JSON.stringify(log.mock.calls);
    expect(text).toContain('succeeded');
    expect(text).not.toContain('password');
  });
  it('exhausts after exactly three attempts and preserves the error', async () => {
    vi.useFakeTimers();
    const error = { code: 'P2034' };
    const run = vi.fn().mockRejectedValue(error);
    const result = retryTransaction('test', run).catch((e) => e);
    await vi.runAllTimersAsync();
    expect(await result).toBe(error);
    expect(run).toHaveBeenCalledTimes(3);
  });
  it('does not retry authorization, validation, uniqueness or connection errors', async () => {
    for (const code of ['FORBIDDEN', 'P2002', 'P1001', 'P2010']) {
      const error = { code };
      const run = vi.fn().mockRejectedValue(error);
      await expect(retryTransaction('test', run)).rejects.toBe(error);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });
});
