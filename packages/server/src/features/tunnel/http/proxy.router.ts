import express from 'express';
import type { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { captureRawBody } from '~/core/request-limits.js';
import type { TunnelServer } from '../tunnel.service.js';

export function createTunnelProxyRouter({
    bodyLimitBytes,
    bodyLimitLabel,
    rateLimitMax,
    rateLimitWindowMs,
    tunnelServer
}: {
    bodyLimitBytes: number;
    bodyLimitLabel: string;
    rateLimitMax: number;
    rateLimitWindowMs: number;
    tunnelServer: TunnelServer;
}): Router {
    const router = express.Router();

    router.use(rateLimit({
        windowMs: rateLimitWindowMs,
        max: rateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).type('text/plain').send('Too many tunnel requests, please try again later.');
        }
    }));

    router.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    router.use((req, res, next) => {
        if (!tunnelServer.hasActiveTunnelForHostname(req.headers.host || '')) {
            void tunnelServer.handleRequest(req, res).catch(next);
            return;
        }

        next();
    });
    router.use(captureRawBody(bodyLimitBytes, bodyLimitLabel));
    router.use((req, res, next) => {
        void tunnelServer.handleRequest(req, res).catch(next);
    });

    return router;
}
