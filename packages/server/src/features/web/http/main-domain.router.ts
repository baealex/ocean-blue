import express from 'express';
import type { Router } from 'express';
import path from 'path';
import helmet from 'helmet';
import { createHandler } from 'graphql-http/lib/use/express';
import { NoSchemaIntrospectionCustomRule } from 'graphql';
import type { AuthConfig } from '@baejino/auth';

import { logger } from '~/core/index.js';
import { depthLimitRule } from '~/core/graphql-depth-limit.js';
import { createSessionMiddleware, isAuthenticatedRequest, requireCsrfForGraphqlMutation, requireSessionForGraphql } from '~/modules/auth-guard.js';
import { authLimiter } from '~/features/auth/auth.router.js';
import { loginPage, loginPageSubmit, logoutPageSubmit } from '~/features/auth/http/pages.js';
import apiRouter from '~/features/http/api.router.js';
import schema from '~/schema/index.js';

const LOGIN_ROUTE_PATH = '/login';

function shouldBlockClientRoute(requestPath: string, authenticated: boolean, authConfig: AuthConfig): boolean {
    if (authConfig.mode !== 'password' || authenticated) {
        return false;
    }

    if (
        requestPath === LOGIN_ROUTE_PATH
        || requestPath === '/health'
        || requestPath.startsWith('/api')
        || requestPath.startsWith('/graphql')
    ) {
        return false;
    }

    return path.extname(requestPath) === '';
}

export function createMainDomainRouter({
    authConfig,
    isProduction,
    webDistPath
}: {
    authConfig: AuthConfig;
    isProduction: boolean;
    webDistPath: string;
}): Router {
    const router = express.Router();
    const securityHeaders = helmet({
        contentSecurityPolicy: isProduction
            ? undefined
            : {
                directives: {
                    'upgrade-insecure-requests': null
                }
            },
        hsts: isProduction ? undefined : false
    });

    router.use(logger);
    router.use(securityHeaders);
    router.use(createSessionMiddleware(authConfig));
    router.use(express.json({ limit: '100mb' }));
    router.use(express.urlencoded({ extended: false }));

    router.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
    });
    router.get('/login', (req, res, next) => {
        void loginPage(req, res).catch(next);
    });
    router.post('/login', authLimiter, (req, res, next) => {
        void loginPageSubmit(req, res).catch(next);
    });
    router.post('/logout', (req, res, next) => {
        void logoutPageSubmit(req, res).catch(next);
    });
    router.use((req, res, next) => {
        if (!shouldBlockClientRoute(req.path, isAuthenticatedRequest(req), authConfig)) {
            next();
            return;
        }

        const redirectTarget = encodeURIComponent(req.originalUrl || req.url || '/');
        res.redirect(303, `${LOGIN_ROUTE_PATH}?redirectTo=${redirectTarget}`);
    });
    router.use(express.static(webDistPath, { extensions: ['html'] }));
    router.use('/graphql', requireSessionForGraphql(authConfig), requireCsrfForGraphqlMutation(authConfig), createHandler({
        schema,
        context: (req) => ({
            authMode: authConfig.mode,
            isAuthenticated: isAuthenticatedRequest(req.raw),
            req: req.raw
        }),
        validationRules: (_req, _args, specifiedRules) => [
            ...specifiedRules,
            ...(isProduction ? [NoSchemaIntrospectionCustomRule] : []),
            depthLimitRule(5)
        ]
    }));
    router.use('/api', apiRouter);
    router.get('/{*splat}', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ message: 'Not Found' });
        }
        res.sendFile(path.join(webDistPath, 'index.html'));
    });

    return router;
}
