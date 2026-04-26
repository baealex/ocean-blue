import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AddressInfo } from 'net';
import { getDashboardHTML } from './dashboard-template.js';

export interface DashboardConfig {
    port?: number;
    subdomain?: string;
    publicUrl?: string;
    localPort?: number;
}

export interface RequestLog {
    id: string;
    timestamp: number;
    ip: string;
    method: string;
    path: string;
    status: number;
    requestSize: number;
    responseSize: number;
    timeMs: number;
}

export interface DashboardData {
    config: DashboardConfig;
    status: string;
    stats: {
        totalRequests: number;
        totalDataTransferred: number;
        avgResponseTime: number;
    };
    requests: RequestLog[];
}

export class DashboardServer {
    private server: http.Server | null = null;
    private wss: WebSocketServer | null = null;
    private port: number;
    private clients: Set<WebSocket> = new Set();
    private data: DashboardData;

    constructor(port: number = 0) {
        this.port = port;
        this.data = {
            config: {},
            status: 'connecting',
            stats: {
                totalRequests: 0,
                totalDataTransferred: 0,
                avgResponseTime: 0
            },
            requests: []
        };
    }

    public async start(config: DashboardConfig): Promise<number> {
        this.data.config = config;
        this.data.status = 'connected';

        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleHttpRequest(req, res);
            });

            // WebSocket server
            this.wss = new WebSocketServer({ server: this.server });
            this.wss.on('connection', (ws) => {
                this.clients.add(ws);

                // Send initial data
                ws.send(JSON.stringify({
                    type: 'init',
                    data: this.data
                }));

                ws.on('close', () => {
                    this.clients.delete(ws);
                });
            });

            this.server.listen(this.port, () => {
                const address = this.server?.address() as AddressInfo;
                resolve(address.port);
            });

            this.server.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    // Try next port
                    this.port++;
                    this.server?.close();
                    this.start(config).then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            });
        });
    }

    private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(getDashboardHTML());
        } else if (req.url === '/favicon.ico') {
            res.writeHead(204);
            res.end();
        } else if (req.url === '/api/data') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.data));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    public updateStatus(status: string) {
        this.data.status = status;
        this.broadcast({
            type: 'status',
            data: status
        });
    }

    public addRequest(request: Omit<RequestLog, 'id' | 'timestamp'>) {
        const log: RequestLog = {
            ...request,
            id: Math.random().toString(36).substring(2, 11),
            timestamp: Date.now()
        };

        this.data.requests.unshift(log);

        // Keep a bounded history in memory. The browser dashboard renders one
        // page at a time, so this can be larger than the visible row count.
        if (this.data.requests.length > 5000) {
            this.data.requests = this.data.requests.slice(0, 5000);
        }

        // Update stats
        this.data.stats.totalRequests++;
        this.data.stats.totalDataTransferred += request.requestSize + request.responseSize;

        const totalTime = this.data.requests.reduce((sum, r) => sum + r.timeMs, 0);
        this.data.stats.avgResponseTime = Math.round(totalTime / this.data.requests.length);

        this.broadcast({
            type: 'request',
            data: log
        });

        this.broadcast({
            type: 'stats',
            data: this.data.stats
        });
    }

    private broadcast(message: any) {
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    public stop() {
        this.clients.forEach(client => {
            client.close();
        });
        this.clients.clear();
        this.wss?.close();
        this.server?.close();
    }

    public getPort(): number {
        return this.port;
    }
}

export default DashboardServer;
