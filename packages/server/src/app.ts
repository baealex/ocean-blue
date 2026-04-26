import express from 'express';
import path from 'path';
import http from 'http';
import { parseBaseUrl } from '@ocean-blue/shared';

import { mountHostRouter } from '~/core/host-router.js';
import { parseByteLimit, parsePositiveInteger } from '~/core/request-limits.js';
import { createTunnelServer } from '~/features/tunnel/index.js';
import { createTunnelProxyRouter } from '~/features/tunnel/http/proxy.router.js';
import { createMainDomainRouter } from '~/features/web/http/main-domain.router.js';
import { authConfig } from '~/modules/auth-config.js';

const isProduction = process.env.NODE_ENV === 'production';

const tunnelProxyBodyLimit = process.env.TUNNEL_PROXY_BODY_LIMIT || '10mb';
const tunnelProxyBodyLimitBytes = parseByteLimit(tunnelProxyBodyLimit, 10 * 1024 * 1024);
const tunnelProxyRateLimitWindowMs = parsePositiveInteger(process.env.TUNNEL_PROXY_RATE_LIMIT_WINDOW_MS, 60_000);
const tunnelProxyRateLimitMax = parsePositiveInteger(process.env.TUNNEL_PROXY_RATE_LIMIT_MAX, 600);

const app: express.Express = express();
app.disable('x-powered-by');

const server = http.createServer(app);
const baseUrl = process.env.BASE_URL || 'http://localhost:25830';
const { host: mainDomain } = parseBaseUrl(baseUrl);
const tunnelServer = createTunnelServer(server, { port: parseInt(process.env.PORT || '25830') });
const webDistPath = process.env.WEB_DIST_PATH || path.resolve('../web/dist');

const subdomainRouter = createTunnelProxyRouter({
    bodyLimitBytes: tunnelProxyBodyLimitBytes,
    bodyLimitLabel: tunnelProxyBodyLimit,
    rateLimitMax: tunnelProxyRateLimitMax,
    rateLimitWindowMs: tunnelProxyRateLimitWindowMs,
    tunnelServer
});
const mainDomainRouter = createMainDomainRouter({
    authConfig,
    isProduction,
    webDistPath
});

mountHostRouter({
    app,
    mainDomain,
    mainDomainRouter,
    subdomainRouter
});

export { app, server, tunnelServer };
