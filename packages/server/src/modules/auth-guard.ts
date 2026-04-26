import type { NextFunction, Request, RequestHandler, Response } from 'express';
import session from 'express-session';
import { buildUnauthorizedGraphqlPayload, buildUnauthorizedPayload, type AuthConfig } from '@baejino/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const isAuthenticatedRequest = (req: Request) => Boolean(req.session?.authenticated);

export const createSessionMiddleware = (authConfig: AuthConfig): RequestHandler => {
    if (authConfig.mode !== 'password') {
        return (_req, _res, next) => next();
    }

    return session({
        secret: authConfig.sessionSecret,
        name: authConfig.cookieName,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000
        }
    });
};

export const requireSessionForWrite = (authConfig: AuthConfig): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (authConfig.mode === 'open' || isAuthenticatedRequest(req)) {
            next();
            return;
        }

        res.status(401).set(JSON_HEADERS).json(buildUnauthorizedPayload()).end();
    };
};

export const requireSessionForGraphql = (authConfig: AuthConfig): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (authConfig.mode === 'open' || isAuthenticatedRequest(req)) {
            next();
            return;
        }

        res.status(401).set(JSON_HEADERS).json(buildUnauthorizedGraphqlPayload()).end();
    };
};
