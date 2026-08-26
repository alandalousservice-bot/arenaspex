import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMyAssignedTeachers } from '../src/services/api';

describe('Inspector assigned-teacher API contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unwraps the server envelope before the roster reaches Inspector components', async () => {
    const teachers = [{ id: 'teacher-1', firstName: 'A', lastName: 'Teacher' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, teachers }),
      })
    );

    const result = await fetchMyAssignedTeachers();

    expect(result).toEqual(teachers);
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown as { teachers?: unknown }).teachers).toBeUndefined();
  });

  it('returns an empty roster for a malformed or missing teachers field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, teachers: { data: [] } }),
      })
    );

    await expect(fetchMyAssignedTeachers()).resolves.toEqual([]);
  });
});
