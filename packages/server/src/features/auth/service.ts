import { sanitizeRedirectPath as sanitizeCommonRedirectPath } from '@baejino/auth';
import { compareSharedSecret as compareCommonSharedSecret } from '@baejino/auth/crypto';
import type { Request } from 'express';

export const compareSharedSecret = compareCommonSharedSecret;

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
