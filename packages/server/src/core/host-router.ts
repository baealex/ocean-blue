import type { Express, Router } from 'express';

function isMainHost(hostname: string, mainDomain: string): boolean {
    return hostname === mainDomain || hostname.startsWith('localhost:') || hostname.startsWith('127.0.0.1:');
}

function isSubdomainHost(hostname: string, mainDomain: string): boolean {
    const hostParts = hostname.split('.');
    const domainParts = mainDomain.split('.');

    return hostParts.length === domainParts.length + 1 && hostParts.slice(1).join('.') === mainDomain;
}

export function mountHostRouter({
    app,
    mainDomain,
    mainDomainRouter,
    subdomainRouter
}: {
    app: Express;
    mainDomain: string;
    mainDomainRouter: Router;
    subdomainRouter: Router;
}) {
    app.use((req, res, next) => {
        const hostname = req.headers.host || '';

        if (isMainHost(hostname, mainDomain)) {
            return mainDomainRouter(req, res, next);
        }

        if (isSubdomainHost(hostname, mainDomain)) {
            return subdomainRouter(req, res, next);
        }

        next();
    });
}
