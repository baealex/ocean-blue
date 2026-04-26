import type { Request, Response, NextFunction } from 'express';
import { buildUnauthorizedPayload } from '@baejino/auth';

import { authConfig } from '~/modules/auth-config.js';
import { isAuthenticatedRequest } from '~/modules/auth-guard.js';

/**
 * Middleware to require an authenticated single-instance session.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (authConfig.mode === 'open' || isAuthenticatedRequest(req)) {
    next();
    return;
  }

  res.status(401).json(buildUnauthorizedPayload());
};

/**
 * Exposes the current session state to downstream handlers.
 */
export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  res.locals.isAuthenticated = isAuthenticatedRequest(req);
  next();
};
