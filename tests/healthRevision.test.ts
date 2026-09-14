import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');

describe('public health deployment revision', () => {
  it('exposes only the non-sensitive Render commit revision with a safe fallback', () => {
    expect(server).toContain('revision: process.env.RENDER_GIT_COMMIT ?? null');
    expect(server).toContain("app.get('/health'");
    expect(server).toContain('res.status(200).json');
    expect(server).not.toContain('process.env.DATABASE_URL');
    expect(server).not.toContain('process.env.RENDER_API_KEY');
    expect(server).not.toContain('Authorization');
  });

  it('keeps health public and preserves the existing response fields', () => {
    expect(server).toContain(
      '// Render health check: lightweight and does not require authentication or a DB round-trip.'
    );
    expect(server).toContain('ok: true');
    expect(server).toContain("service: 'spex'");
    expect(server).toContain("environment: process.env.NODE_ENV || 'development'");
    expect(server).toContain('timestamp: new Date().toISOString()');
  });
});
