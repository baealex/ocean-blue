import { authConfig } from '~/modules/auth-config.js';
import type { Controller } from '~/types/index.js';
import { compareSharedSecret, destroySession, regenerateSession, sanitizeRedirectPath, saveSession } from '../service.js';
import { renderLoginPage } from './login-page.js';

const SESSION_ERROR = { error: 'Session error' };

export const loginPage: Controller = async (req, res) => {
    const redirectTo = sanitizeRedirectPath(req.query.redirectTo);

    if (authConfig.mode !== 'password' || req.session?.authenticated) {
        res.redirect(303, redirectTo);
        return;
    }

    res.status(200).type('html').send(renderLoginPage({ redirectTo })).end();
};

export const loginPageSubmit: Controller = async (req, res) => {
    const redirectTo = sanitizeRedirectPath(req.body?.redirectTo);

    if (authConfig.mode !== 'password' || !authConfig.password) {
        res.redirect(303, redirectTo);
        return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!password || !compareSharedSecret(authConfig.password, password)) {
        res.status(401)
            .type('html')
            .send(renderLoginPage({ redirectTo, errorMessage: 'Invalid password' }))
            .end();
        return;
    }

    const tunnelAuth = req.session?.tunnelAuth;

    try {
        await regenerateSession(req);

        if (tunnelAuth) {
            req.session.tunnelAuth = tunnelAuth;
        }

        req.session.authenticated = true;
        await saveSession(req);
        res.redirect(303, redirectTo);
    } catch {
        res.status(500).json(SESSION_ERROR);
    }
};

export const logoutPageSubmit: Controller = async (req, res) => {
    const redirectTo = authConfig.mode === 'password' ? '/login' : '/';

    if (authConfig.mode !== 'password') {
        res.redirect(303, redirectTo);
        return;
    }

    try {
        await destroySession(req);
        res.redirect(303, redirectTo);
    } catch {
        res.status(500).json(SESSION_ERROR);
    }
};
