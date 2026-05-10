import { randomBytes, timingSafeEqual } from 'node:crypto';
import { sanitizeRedirectPath as sanitizeCommonRedirectPath } from '@baejino/auth';
import { compareSharedSecret as compareCommonSharedSecret } from '@baejino/auth/crypto';
import type { Request } from 'express';

export const compareSharedSecret = compareCommonSharedSecret;


const CSRF_TOKEN_BYTES = 32;

export const getOrCreateCsrfToken = (req: Request) => {
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(CSRF_TOKEN_BYTES).toString('base64url');
    }

    return req.session.csrfToken;
};

const readSubmittedCsrfToken = (req: Request) => {
    const headerValue = req.get('x-csrf-token');
    if (headerValue) {
        return headerValue;
    }

    const bodyValue = req.body?.csrfToken;
    return typeof bodyValue === 'string' ? bodyValue : undefined;
};

export const verifyCsrfToken = (req: Request) => {
    const expected = req.session?.csrfToken;
    const submitted = readSubmittedCsrfToken(req);

    if (!expected || !submitted) {
        return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const submittedBuffer = Buffer.from(submitted);

    return expectedBuffer.length === submittedBuffer.length
        && timingSafeEqual(expectedBuffer, submittedBuffer);
};

export const sanitizeRedirectPath = (value: unknown) =>
    sanitizeCommonRedirectPath(value, {
        fallbackPath: '/',
        loginPath: '/login',
        allowedAbsoluteHosts: ['localhost', '127.0.0.1', '::1']
    });

export const regenerateSession = async (req: Request) => {
    await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};

export const saveSession = async (req: Request) => {
    await new Promise<void>((resolve, reject) => {
        req.session.save((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};

export const destroySession = async (req: Request) => {
    if (!req.session) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        req.session.destroy((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
};
