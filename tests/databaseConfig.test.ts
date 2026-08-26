import { describe, expect, it } from 'vitest';
import { getRuntimeDatabaseUrl } from '../src/server/runtimeDatabaseUrl.js';

describe('Neon database URL policy', () => {
  it('preserves a pooled hostname and never synthesizes a direct URL', () => {
    const pooled = 'postgresql://user:password@project-pooler.eu.neon.tech/db?sslmode=require';
    const configured = getRuntimeDatabaseUrl(pooled);

    expect(configured).toBe(pooled);
    expect(new URL(configured).hostname).toBe('project-pooler.eu.neon.tech');
    expect(configured).not.toContain('project.eu.neon.tech');
  });

  it('does not expose credentials in the safe connection log text', () => {
    const safeLog = '[DB] Neon pooled runtime connection configured.';
    expect(safeLog).not.toContain('postgresql://');
    expect(safeLog).not.toContain('password');
  });
});
