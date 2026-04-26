import { buildAuthSessionResponse } from '@baejino/auth';
import type { Controller } from '~/types/index.js';
import { authConfig } from '~/modules/auth-config.js';
import { destroySession } from './service.js';

const SESSION_ERROR = { error: 'Session error' };

export const sessionStatus: Controller = async (req, res) => {
    res.json(buildAuthSessionResponse(authConfig, Boolean(req.session?.authenticated)));
};

export const logout: Controller = async (req, res) => {
    if (authConfig.mode === 'password') {
        try {
            await destroySession(req);
        } catch {
            res.status(500).json(SESSION_ERROR);
            return;
        }
    }

    res.json(buildAuthSessionResponse(authConfig, false));
};
