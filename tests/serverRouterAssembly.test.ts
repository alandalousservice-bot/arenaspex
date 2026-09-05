import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { API_PREFIX, mountApiRoutes } from '../src/server/apiAssembly';

describe('shared server API assembly', () => {
  it('mounts the canonical routes in the protected order', () => {
    const calls: unknown[][] = [];
    const app = { use: (...args: unknown[]) => calls.push(args) };
    const apiRouter = {};
    const authRouter = {};
    const assignmentRouter = {};
    const geoRouter = {};
    const requireAuth = vi.fn();
    const requireOperationalAccount = vi.fn();

    mountApiRoutes({
      app: app as never,
      apiRouter: apiRouter as never,
      authRouter: authRouter as never,
      assignmentRouter: assignmentRouter as never,
      geoRouter: geoRouter as never,
      requireAuth,
      requireOperationalAccount,
    });

    expect(calls).toEqual([
      [`${API_PREFIX}/geo`, geoRouter],
      [`${API_PREFIX}/auth`, authRouter],
      [API_PREFIX, apiRouter],
      [API_PREFIX, requireAuth, requireOperationalAccount, assignmentRouter],
    ]);
  });

  it('keeps production and Vite development on the shared contract', () => {
    const production = readFileSync('server.ts', 'utf8');
    const development = readFileSync('vite.config.ts', 'utf8');

    expect(production).toContain("from './src/server/apiAssembly.js'");
    expect(development).toContain("'./src/server/apiAssembly.ts'");
    expect(production).toContain('mountApiRoutes({');
    expect(development).toContain('mountApiRoutes({');
    expect(production).not.toContain("app.use('/api/geo'");
    expect(development).not.toContain("app.use('/api/geo'");
    expect(production).not.toContain("app.use('/api/auth'");
    expect(development).not.toContain("app.use('/api/auth'");
  });

  it('does not start a server or initialize runtime services on import', () => {
    const assembly = readFileSync('src/server/apiAssembly.ts', 'utf8');
    expect(assembly).not.toContain('listen(');
    expect(assembly).not.toContain('prisma');
    expect(assembly).not.toContain('createViteServer');
    expect(assembly).not.toContain('migrate');
  });
});
