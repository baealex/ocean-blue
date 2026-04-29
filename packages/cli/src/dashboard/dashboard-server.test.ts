import http from 'http';
import { AddressInfo } from 'net';
import { describe, expect, it } from 'vitest';

import { DASHBOARD_HOST, DashboardServer } from './dashboard-server.js';

function getDashboardData(port: number): Promise<{ status: string }> {
    return new Promise((resolve, reject) => {
        const req = http.get({
            hostname: DASHBOARD_HOST,
            port,
            path: '/api/data'
        }, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk.toString();
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
    });
}

describe('DashboardServer', () => {
    it('binds the dashboard to the loopback interface only', async () => {
        const dashboard = new DashboardServer(0);

        try {
            const port = await dashboard.start({});
            const address = dashboard.getAddress() as AddressInfo;

            expect(address.address).toBe(DASHBOARD_HOST);
            expect(dashboard.getPort()).toBe(port);

            const data = await getDashboardData(port);
            expect(data.status).toBe('connected');
        } finally {
            dashboard.stop();
        }
    });
});
