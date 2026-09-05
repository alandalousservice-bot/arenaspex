import type { Application, RequestHandler, Router } from 'express';

export const API_PREFIX = '/api';

export type ApiAssemblyDependencies = {
  app: Application;
  apiRouter: Router;
  authRouter: Router;
  assignmentRouter: Router;
  geoRouter: Router;
  requireAuth: RequestHandler;
  requireOperationalAccount: RequestHandler;
};

/**
 * Mounts the canonical ArenaSpex API surface in its stable order.
 * Environment-specific middleware (security, limits, Vite/static assets) stays
 * in the corresponding server entry point.
 */
export function mountApiRoutes({
  app,
  apiRouter,
  authRouter,
  assignmentRouter,
  geoRouter,
  requireAuth,
  requireOperationalAccount,
}: ApiAssemblyDependencies) {
  app.use(`${API_PREFIX}/geo`, geoRouter);
  app.use(`${API_PREFIX}/auth`, authRouter);
  app.use(API_PREFIX, apiRouter);
  app.use(API_PREFIX, requireAuth, requireOperationalAccount, assignmentRouter);
}
