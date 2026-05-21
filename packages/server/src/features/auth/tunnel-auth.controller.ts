import type { Controller } from '~/types/index.js';
import { authConfig } from '~/modules/auth-config.js';
import { isAuthenticatedRequest } from '~/modules/auth-guard.js';
import { TunnelAuthService } from './tunnel-auth.service.js';
import { randomBytes } from 'crypto';

const AUTH_CALLBACK_PATH = '/api/auth/callback';
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;

const escapeHtml = (value: string) => {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
};

const isLocalhostCallbackUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:'
            && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]');
    } catch {
        return false;
    }
};

const createDeviceToken = async (deviceId: string) => {
    return TunnelAuthService.createTokenRecord({
        name: `Device: ${deviceId}`,
        isActive: true
    });
};

const redirectWithToken = async (res: Parameters<Controller>[1], callbackUrl: string, deviceId: string) => {
    if (!isLocalhostCallbackUrl(callbackUrl)) {
        res.status(400).json({ error: 'callbackUrl must point to localhost' });
        return;
    }

    const { plainToken } = await createDeviceToken(deviceId);
    const nonce = randomBytes(16).toString('base64');

    res.setHeader('Content-Security-Policy', [
        "default-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        `script-src 'nonce-${nonce}'`,
        `script-src-elem 'nonce-${nonce}'`,
        "form-action 'self' http://localhost:* http://127.0.0.1:*"
    ].join('; '));

    res.status(200).type('html').send(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Ocean Blue Authentication</title>
            </head>
            <body>
                <form id="token-callback-form" method="POST" action="${escapeHtml(callbackUrl)}">
                    <input type="hidden" name="apiKey" value="${escapeHtml(plainToken)}" />
                </form>
                <script nonce="${escapeHtml(nonce)}">
                    document.getElementById('token-callback-form')?.submit();
                </script>
                <noscript>
                    <p>Authentication is ready. Click the button below to continue.</p>
                    <button type="submit" form="token-callback-form">Continue</button>
                </noscript>
            </body>
        </html>
    `);
};

export const tunnelAuth: Controller = async (req, res) => {
    const { deviceId, callbackUrl } = req.query;

    if (!deviceId || !callbackUrl || typeof deviceId !== 'string' || typeof callbackUrl !== 'string') {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }

    if (!isLocalhostCallbackUrl(callbackUrl)) {
        res.status(400).json({ error: 'callbackUrl must point to localhost' });
        return;
    }

    if (authConfig.mode === 'open') {
        await redirectWithToken(res, callbackUrl, deviceId);
        return;
    }

    req.session.tunnelAuth = {
        deviceId,
        callbackUrl,
        timestamp: Date.now()
    };

    if (isAuthenticatedRequest(req)) {
        res.redirect(AUTH_CALLBACK_PATH);
        return;
    }

    res.redirect(`/login?redirectTo=${encodeURIComponent(AUTH_CALLBACK_PATH)}`);
};

export const tunnelAuthCallback: Controller = async (req, res) => {
    const tunnelAuth = req.session?.tunnelAuth;

    if (!tunnelAuth) {
        if (authConfig.mode === 'password' && !isAuthenticatedRequest(req)) {
            res.redirect(`/login?redirectTo=${encodeURIComponent(AUTH_CALLBACK_PATH)}`);
            return;
        }

        res.status(400).send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Invalid Request</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #f44336; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Invalid Authentication Request</h1>
                    <p>Please start the authentication process from the CLI tool.</p>
                </body>
            </html>
        `);
        return;
    }

    if (authConfig.mode === 'password' && !isAuthenticatedRequest(req)) {
        res.redirect(`/login?redirectTo=${encodeURIComponent(AUTH_CALLBACK_PATH)}`);
        return;
    }

    if (Date.now() - tunnelAuth.timestamp > AUTH_REQUEST_TTL_MS) {
        delete req.session.tunnelAuth;
        res.status(401).json({ error: 'Authentication expired' });
        return;
    }

    try {
        await redirectWithToken(res, tunnelAuth.callbackUrl, tunnelAuth.deviceId);
        delete req.session.tunnelAuth;
    } catch {
        res.status(500).json({ error: 'Failed to create token' });
    }
};
