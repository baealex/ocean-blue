import { buildAuthSessionResponse } from '@baejino/auth';
import type { Controller } from '~/types/index.js';
import { authConfig } from '~/modules/auth-config.js';
import { destroySession, getOrCreateCsrfToken, verifyCsrfToken } from './service.js';

const SESSION_ERROR = { error: 'Session error' };
const CSRF_ERROR = { error: 'Invalid security token' };

const buildSessionResponse = (req: Parameters<Controller>[0], authenticated: boolean) => ({
    ...buildAuthSessionResponse(authConfig, authenticated),
    ...(req.session ? { csrfToken: getOrCreateCsrfToken(req) } : {})
});

export const sessionStatus: Controller = async (req, res) => {
    res.json(buildSessionResponse(req, Boolean(req.session?.authenticated)));
};

export const logout: Controller = async (req, res) => {
    if (authConfig.mode === 'password') {
        if (!verifyCsrfToken(req)) {
            res.status(403).json(CSRF_ERROR);
            return;
        }

        try {
            await destroySession(req);
        } catch {
            res.status(500).json(SESSION_ERROR);
            return;
        }
    }

    res.json(buildSessionResponse(req, false));
};
