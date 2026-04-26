import WebSocket, { WebSocketServer } from 'ws';
import type { Request, Response } from 'express';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { TunnelAuthService } from '../auth/tunnel-auth.service.js';
import models from '~/models.js';
import { appLogger } from '~/core/index.js';
import {
    PROXY_DATA_TYPE,
    PROXY_END_TYPE,
    parseBaseUrl,
    type TunnelMessage
} from '@ocean-blue/shared';

// H-6: Maximum pending requests
const MAX_PENDING_REQUESTS = 1000;

// H-8: Maximum concurrent WebSocket connections
const MAX_CONNECTIONS = 100;

// Map to keep track of active tunnel connections by subdomain
const activeTunnels = new Map<string, WebSocket>();

interface PendingRequest {
    res?: Response;
    socket: net.Socket;
    timer: NodeJS.Timeout;
    headersSent: boolean;
    subdomain: string;
    closeListener: () => void;
    errorListener: (err: Error) => void;
    drainListener?: () => void;
    dataListener?: (chunk: Buffer) => void;
}

type RawBodyRequest = Request & {
    rawBody?: Buffer;
};

type ForwardableRequest = Pick<http.IncomingMessage, 'headers' | 'method' | 'url' | 'httpVersion'>;

function normalizeForwardHeaders(
    headers: http.IncomingHttpHeaders,
    bodyLength: number,
    forceConnectionClose: boolean
): Record<string, string | string[]> {
    const normalizedHeaders: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
            normalizedHeaders[key] = value;
        }
    }

    if (forceConnectionClose) {
        normalizedHeaders.connection = 'close';
    }

    const hasBufferedBodyHeaders = headers['transfer-encoding'] !== undefined || headers['content-length'] !== undefined;
    if (hasBufferedBodyHeaders || bodyLength > 0) {
        delete normalizedHeaders['transfer-encoding'];
        normalizedHeaders['content-length'] = String(bodyLength);
    }

    return normalizedHeaders;
}

function buildRawHttpRequest(
    req: ForwardableRequest,
    bodyBuffer: Buffer,
    options: {
        headerBodyLength?: number;
        forceConnectionClose?: boolean;
    } = {}
): Buffer {
    const {
        headerBodyLength = bodyBuffer.length,
        forceConnectionClose = true
    } = options;
    const headers = normalizeForwardHeaders(req.headers, headerBodyLength, forceConnectionClose);
    const headerLines = Object.entries(headers)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\r\n');
    const requestHeadBuffer = Buffer.from(
        `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headerLines}\r\n\r\n`,
        'utf8'
    );

    return bodyBuffer.length > 0
        ? Buffer.concat([requestHeadBuffer, bodyBuffer])
        : requestHeadBuffer;
}

function createBinaryFrame(type: number, id: string, payload: Uint8Array = Buffer.alloc(0)): Buffer {
    const idBuffer = Buffer.from(id, 'utf8');
    const header = Buffer.alloc(2);

    header.writeUInt8(type, 0);
    header.writeUInt8(idBuffer.length, 1);

    return Buffer.concat([header, idBuffer, Buffer.from(payload)]);
}

function getRequestClientIp(req: http.IncomingMessage): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const rawIp = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded || (Array.isArray(realIp) ? realIp[0] : realIp) || req.socket.remoteAddress;
    const firstIp = rawIp?.split(',')[0]?.trim();

    return firstIp || null;
}

// Tunnel server class
export class TunnelServer {
    private wss: WebSocketServer;
    private httpServer: http.Server;
    private port: number;
    private protocol: string;
    private domain: string;
    private pendingRequests = new Map<string, PendingRequest>();
    private heartbeatInterval?: NodeJS.Timeout;
    // H-9: Cache tunnel-not-found.html
    private tunnelNotFoundHtml: string;

    constructor(httpServer: http.Server, options: { port: number }) {
        this.httpServer = httpServer;
        this.port = options.port;

        const baseUrl = process.env.BASE_URL || 'http://localhost:25830';
        const { protocol, host } = parseBaseUrl(baseUrl);
        this.protocol = protocol;
        this.domain = host;

        // H-9: Read tunnel-not-found.html once at startup
        try {
            this.tunnelNotFoundHtml = fs.readFileSync(path.resolve('public/tunnel-not-found.html'), 'utf8');
        } catch {
            this.tunnelNotFoundHtml = '<html><body><h1>Tunnel Not Found</h1></body></html>';
        }

        // H-2: Create WebSocket server with maxPayload limit
        this.wss = new WebSocketServer({
            noServer: true,
            maxPayload: 10 * 1024 * 1024 // 10MB
        });

        this.httpServer.on('upgrade', (request, socket, head) => {
            const upgradeSocket = socket as net.Socket;

            if (request.url === '/tunnel') {
                // H-8: Connection limit check
                if (this.wss.clients.size >= MAX_CONNECTIONS) {
                    upgradeSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
                    upgradeSocket.destroy();
                    return;
                }
                this.wss.handleUpgrade(request, upgradeSocket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
                return;
            }

            if (!this.handleUpgradeRequest(request, upgradeSocket, head)) {
                upgradeSocket.destroy();
            }
        });

        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

        this.startHeartbeat();

        this.clearAllActiveSubdomains();

        appLogger.info(`Tunnel server initialized on port ${this.port}`);
    }

    private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
        appLogger.info('New tunnel connection');

        // Heartbeat setup
        (ws as any).isAlive = true;
        (ws as any).clientIp = getRequestClientIp(req);
        ws.on('pong', () => {
            (ws as any).isAlive = true;
        });

        ws.on('message', async (message: Buffer, isBinary: boolean) => {
            if (!isBinary) {
                // Handle JSON control messages
                try {
                    const parsedMessage = JSON.parse(message.toString()) as TunnelMessage;
                    await this.handleMessage(ws, parsedMessage);
                } catch (error) {
                    appLogger.error(`Error handling JSON message: ${error}`);
                    this.sendError(ws, 'Invalid message format');
                }
            } else {
                // Handle binary data messages
                try {
                    const type = message.readUInt8(0);
                    const idLen = message.readUInt8(1);
                    const id = message.toString('utf8', 2, 2 + idLen);

                    if (type === PROXY_DATA_TYPE) { // proxy_data
                        const data = message.slice(2 + idLen);
                        this.handleProxyData(id, data, ws);
                    } else if (type === PROXY_END_TYPE) { // proxy_end
                        this.handleProxyEnd(id);
                    }
                } catch (error) {
                    appLogger.error(`Error handling binary message: ${error}`);
                }
            }
        });

        // H-5: Use once to prevent listener accumulation
        ws.once('close', () => {
            this.handleDisconnection(ws);
        });

        this.send(ws, {
            type: 'welcome',
            data: { message: 'Connected to tunnel server' }
        });
    }

    private handleUpgradeRequest(request: http.IncomingMessage, socket: net.Socket, head: Buffer): boolean {
        const subdomain = this.extractSubdomain(request.headers.host || '');
        if (!subdomain) {
            return false;
        }

        const ws = activeTunnels.get(subdomain);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            this.writeTunnelNotFoundResponse(socket, subdomain);
            return true;
        }

        if (this.pendingRequests.size >= MAX_PENDING_REQUESTS) {
            this.writeRawSocketResponse(socket, 503, 'Service Unavailable', 'Server overloaded, try again later');
            return true;
        }

        const requestId = crypto.randomUUID();
        const timeout = setTimeout(() => {
            const pending = this.pendingRequests.get(requestId);
            if (pending && !pending.headersSent) {
                appLogger.error(`[${requestId}] Upgrade request timed out.`);
                this.writeRawSocketResponse(pending.socket, 504, 'Gateway Timeout', 'Tunnel response timed out.');
            }
            this.cleanupRequest(requestId);
        }, 30000);

        const closeListener = () => {
            this.sendBinary(ws, PROXY_END_TYPE, requestId);
            this.cleanupRequest(requestId);
        };
        const errorListener = (err: Error) => {
            appLogger.error(`[${requestId}] Upgrade socket error: ${err}`);
            this.sendBinary(ws, PROXY_END_TYPE, requestId);
            this.cleanupRequest(requestId);
        };
        const dataListener = (chunk: Buffer) => {
            this.sendBinary(ws, PROXY_DATA_TYPE, requestId, chunk);
        };

        this.pendingRequests.set(requestId, {
            socket,
            timer: timeout,
            headersSent: false,
            subdomain,
            closeListener,
            errorListener,
            dataListener
        });

        socket.on('data', dataListener);
        socket.once('close', closeListener);
        socket.once('error', errorListener);

        const requestHeadBuffer = buildRawHttpRequest(request, Buffer.alloc(0), {
            headerBodyLength: 0,
            forceConnectionClose: false
        });
        const requestBuffer = head.length > 0
            ? Buffer.concat([requestHeadBuffer, head])
            : requestHeadBuffer;

        const clientIP = request.headers['x-forwarded-for']
            || request.headers['x-real-ip']
            || socket.remoteAddress
            || 'unknown';
        const displayIP = Array.isArray(clientIP) ? clientIP[0] : clientIP;

        appLogger.info(`[${requestId}] New upgrade request from ${displayIP}: ${request.method} ${request.url} for ${subdomain}`);

        this.send(ws, {
            type: 'proxy_request',
            id: requestId,
            data: requestBuffer.toString('base64'),
            clientIP: displayIP,
            timestamp: Date.now()
        });

        return true;
    }

    // H-7: Backpressure handling on server side
    private handleProxyData(id: string, data: Buffer, ws: WebSocket): void {
        const pending = this.pendingRequests.get(id);
        if (pending) {
            const { socket } = pending;

            // Check if socket is still writable
            if (!socket.destroyed && socket.writable) {
                try {
                    const canContinue = socket.write(data);
                    // Mark headers as sent after first successful write
                    pending.headersSent = true;

                    // H-7: Backpressure - pause WS if socket buffer is full
                    if (!canContinue) {
                        ws.pause();
                        if (!pending.drainListener) {
                            pending.drainListener = () => {
                                ws.resume();
                            };
                            socket.once('drain', pending.drainListener);
                        }
                    }
                } catch (error) {
                    appLogger.error(`[${id}] Error writing to socket: ${error}`);
                    this.cleanupRequest(id);
                }
            } else {
                appLogger.warn(`[${id}] Socket is not writable, cleaning up`);
                this.cleanupRequest(id);
            }
        }
    }

    private handleProxyEnd(id: string): void {
        const pending = this.pendingRequests.get(id);
        if (pending) {
            const { socket } = pending;
            try {
                if (!socket.destroyed && socket.writable) {
                    socket.end();
                }
            } catch (error) {
                appLogger.error(`[${id}] Error ending socket: ${error}`);
            } finally {
                this.cleanupRequest(id);
            }
        }
    }

    // H-5: Remove socket listeners on cleanup
    private cleanupRequest(id: string): void {
        const pending = this.pendingRequests.get(id);
        if (pending) {
            clearTimeout(pending.timer);
            if (pending.dataListener) {
                pending.socket.removeListener('data', pending.dataListener);
            }
            pending.socket.removeListener('close', pending.closeListener);
            pending.socket.removeListener('error', pending.errorListener);
            if (pending.drainListener) {
                pending.socket.removeListener('drain', pending.drainListener);
            }
            this.pendingRequests.delete(id);
        }
    }

    private writeRawSocketResponse(socket: net.Socket, statusCode: number, statusText: string, body: string, contentType = 'text/plain'): void {
        if (socket.destroyed || !socket.writable) {
            return;
        }

        const response = `HTTP/1.1 ${statusCode} ${statusText}\r\nContent-Type: ${contentType}\r\nContent-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
        socket.write(response);
        socket.end();
    }

    private writeTunnelNotFoundResponse(socket: net.Socket, subdomain: string): void {
        try {
            this.writeRawSocketResponse(socket, 404, 'Not Found', this.tunnelNotFoundHtml, 'text/html; charset=utf-8');
        } catch (error) {
            appLogger.error(`Error serving tunnel-not-found.html: ${error}`);
            this.writeRawSocketResponse(socket, 404, 'Not Found', `Tunnel for ${subdomain} not found.`);
        }
    }

    private extractSubdomain(hostname: string): string | null {
        const escapedDomain = this.domain.replaceAll('.', '\\.');
        const subdomainMatch = hostname.match(new RegExp(`^([^.]+)\\.${escapedDomain}$`));

        return subdomainMatch ? subdomainMatch[1] : null;
    }

    private async handleMessage(ws: WebSocket, message: TunnelMessage): Promise<void> {
        switch (message.type) {
            case 'register':
                await this.handleRegister(ws, message.id, message.data);
                break;
            case 'proxy_error': {
                const { id, error } = message as { id: string; error: string };
                const pending = this.pendingRequests.get(id);
                if (pending) {
                    const { socket, headersSent } = pending;
                    try {
                        if (!headersSent && !socket.destroyed && socket.writable) {
                            const errorResponse = `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: ${error.length + 15}\r\n\r\nTunnel error: ${error}`;
                            socket.write(errorResponse);
                        }
                        if (!socket.destroyed && socket.writable) {
                            socket.end();
                        }
                    } catch (err) {
                        appLogger.error(`[${id}] Error writing proxy error response: ${err}`);
                    } finally {
                        this.cleanupRequest(id);
                    }
                }
                break;
            }
            default:
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }

    private async handleRegister(ws: WebSocket, id: string, data: any): Promise<void> {
        const { token, subdomain } = data;
        const clientIp = (ws as any).clientIp || null;
        const clientVersion = typeof data.clientVersion === 'string' && data.clientVersion.trim()
            ? data.clientVersion.trim()
            : null;

        if (!token || !subdomain) {
            this.sendError(ws, 'Missing tunnel key or subdomain', id);
            return;
        }

        // Get token info
        const tokenInfo = await TunnelAuthService.getTokenInfo(token);

        if (!tokenInfo) {
            this.send(ws, {
                type: 'auth_failed',
                id,
                error: 'Invalid or expired tunnel key. Please create a new key and try again.'
            });
            ws.close();
            return;
        }

        // H-15: Check maxTunnels limit
        if (tokenInfo.currentTunnels >= tokenInfo.maxTunnels) {
            this.send(ws, {
                type: 'error',
                id,
                error: `Maximum tunnel limit (${tokenInfo.maxTunnels}) reached. Close existing tunnels or increase the limit.`
            });
            ws.close();
            return;
        }

        // Check if subdomain is currently connected. A stale DB session can be
        // reused, but an open WebSocket must keep ownership until it disconnects.
        const existingWs = activeTunnels.get(subdomain);
        if (existingWs && existingWs.readyState === WebSocket.OPEN) {
            this.send(ws, {
                type: 'error',
                id,
                error: `Subdomain '${subdomain}' is already connected. Disconnect the existing connection first.`
            });
            ws.close();
            return;
        }

        if (existingWs) {
            activeTunnels.delete(subdomain);
        }

        // Check if subdomain is already known in storage
        const existingSession = await models.tunnelSession.findUnique({
            where: { subdomain }
        });

        if (existingSession) {
            if (existingSession.tokenId !== tokenInfo.tokenId) {
                if (existingSession.isActive) {
                    await models.tunnelToken.findUnique({ where: { id: existingSession.tokenId } })
                        .then((previousToken) => {
                            if (!previousToken) return null;

                            return models.tunnelToken.update({
                                where: { id: existingSession.tokenId },
                                data: { currentTunnels: Math.max(0, previousToken.currentTunnels - 1) }
                            });
                        })
                        .catch(err => {
                            appLogger.error(`Failed to release previous tunnel count for ${subdomain}: ${err}`);
                        });
                }

                appLogger.info(`Subdomain reassigned: ${subdomain} from ${existingSession.tokenId} to ${tokenInfo.tokenId}`);
            }

            // No active connection exists, so reuse the subdomain for this token.
            await models.tunnelSession.update({
                where: { id: existingSession.id },
                data: {
                    tokenId: tokenInfo.tokenId,
                    clientIp,
                    clientVersion,
                    lastActive: new Date(),
                    isActive: true
                }
            });
        } else {
            // New subdomain, create TunnelSession
            try {
                await models.tunnelSession.create({
                    data: {
                        subdomain,
                        tokenId: tokenInfo.tokenId,
                        clientIp,
                        clientVersion,
                        isActive: true,
                        lastActive: new Date()
                    }
                });
            } catch (error) {
                appLogger.error(`Error creating tunnel session: ${error}`);
                this.send(ws, {
                    type: 'error',
                    id,
                    error: 'Failed to register subdomain'
                });
                ws.close();
                return;
            }
        }

        try {
            await models.tunnelToken.update({
                where: { id: tokenInfo.tokenId },
                data: { currentTunnels: { increment: 1 } }
            });
        } catch (error) {
            appLogger.error(`Error updating tunnel count: ${error}`);
            this.send(ws, {
                type: 'error',
                id,
                error: 'Failed to reserve tunnel capacity'
            });
            ws.close();
            return;
        }

        // Register the tunnel
        activeTunnels.set(subdomain, ws);
        (ws as any).subdomain = subdomain;
        (ws as any).tokenId = tokenInfo.tokenId;

        this.send(ws, {
            id,
            type: 'register_success',
            data: {
                subdomain,
                url: `${this.protocol}://${subdomain}.${this.domain}`
            }
        });

        appLogger.info(`Tunnel registered: ${subdomain}.${this.domain}`);
    }

    private handleDisconnection(ws: WebSocket): void {
        const subdomain = (ws as any).subdomain;
        if (subdomain) {
            activeTunnels.delete(subdomain);
            appLogger.info(`Tunnel disconnected: ${subdomain}`);
            const tokenId = (ws as any).tokenId;

            // Update TunnelSession to mark as inactive
            models.tunnelSession.update({
                where: { subdomain },
                data: { isActive: false }
            }).catch(err => {
                appLogger.error(`Failed to update tunnel session for ${subdomain}: ${err}`);
            });

            if (tokenId) {
                models.tunnelToken.findUnique({ where: { id: tokenId } })
                    .then((token) => {
                        if (!token) return null;

                        return models.tunnelToken.update({
                            where: { id: tokenId },
                            data: { currentTunnels: Math.max(0, token.currentTunnels - 1) }
                        });
                    })
                    .catch(err => {
                        appLogger.error(`Failed to update tunnel count for ${subdomain}: ${err}`);
                    });
            }

            // Clean up only pending requests for this specific subdomain
            const requestsToCleanup: string[] = [];
            this.pendingRequests.forEach((pending, id) => {
                if (pending.subdomain === subdomain) {
                    requestsToCleanup.push(id);
                }
            });

            appLogger.info(`Cleaning up ${requestsToCleanup.length} pending requests for subdomain: ${subdomain}`);

            requestsToCleanup.forEach(id => {
                const pending = this.pendingRequests.get(id);
                if (pending && !pending.headersSent) {
                    const errorResponse = `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nContent-Length: 23\r\n\r\nTunnel disconnected`;
                    try {
                        if (!pending.socket.destroyed && pending.socket.writable) {
                            pending.socket.write(errorResponse);
                            pending.socket.end();
                        }
                    } catch (error) {
                        appLogger.error(`[${id}] Error writing disconnection response: ${error}`);
                    }
                }
                this.cleanupRequest(id);
            });
        }
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if ((ws as any).isAlive === false) {
                    appLogger.info(`Terminating dead connection for subdomain: ${(ws as any).subdomain || 'unknown'}`);
                    ws.terminate();
                    return;
                }

                (ws as any).isAlive = false;
                ws.ping(() => { }); // Send ping, no-op callback
            });
        }, 30000); // 30 seconds
    }

    public async handleRequest(req: Request, res: Response) {
        const hostname = req.headers.host || '';
        const subdomain = this.extractSubdomain(hostname);

        if (!subdomain) {
            return false; // Not a tunneled request
        }
        const ws = activeTunnels.get(subdomain);

        if (!ws || ws.readyState !== WebSocket.OPEN) {
            this.writeTunnelNotFoundResponse(req.socket as net.Socket, subdomain);
            return true;
        }

        // H-6: Pending requests limit
        if (this.pendingRequests.size >= MAX_PENDING_REQUESTS) {
            const socket = req.socket as net.Socket;
            const msg = 'Server overloaded, try again later';
            this.writeRawSocketResponse(socket, 503, 'Service Unavailable', msg);
            return true;
        }

        // H-3: Cryptographically secure request ID
        const requestId = crypto.randomUUID();

        const socket = req.socket as net.Socket;

        const timeout = setTimeout(() => {
            const pending = this.pendingRequests.get(requestId);
            if (pending && !pending.headersSent) {
                appLogger.error(`[${requestId}] Request timed out.`);
                try {
                    if (!pending.socket.destroyed && pending.socket.writable) {
                        const timeoutResponse = `HTTP/1.1 504 Gateway Timeout\r\nContent-Type: text/plain\r\nContent-Length: 26\r\n\r\nTunnel response timed out.`;
                        pending.socket.write(timeoutResponse);
                        pending.socket.end();
                    }
                } catch (error) {
                    appLogger.error(`[${requestId}] Error writing timeout response: ${error}`);
                }
            }
            this.cleanupRequest(requestId);
        }, 30000); // 30 seconds timeout

        // H-5: Store listener references for cleanup
        const closeListener = () => {
            this.cleanupRequest(requestId);
        };
        const errorListener = (err: Error) => {
            appLogger.error(`[${requestId}] Socket error: ${err}`);
            this.cleanupRequest(requestId);
        };

        this.pendingRequests.set(requestId, {
            res,
            socket,
            timer: timeout,
            headersSent: false,
            subdomain,
            closeListener,
            errorListener
        });

        // H-5: Use once to prevent listener accumulation
        socket.once('close', closeListener);
        socket.once('error', errorListener);

        try {
            // Extract client IP
            const clientIP = req.headers['x-forwarded-for'] ||
                req.headers['x-real-ip'] ||
                req.socket.remoteAddress ||
                'unknown';

            const rawBody = (req as RawBodyRequest).rawBody;
            const bodyBuffer = Buffer.isBuffer(rawBody)
                ? rawBody
                : Buffer.alloc(0);
            const requestBuffer = buildRawHttpRequest(req, bodyBuffer);

            const displayIP = Array.isArray(clientIP) ? clientIP[0] : clientIP;
            appLogger.info(`[${requestId}] New request from ${displayIP}: ${req.method} ${req.url} for ${subdomain}, size: ${requestBuffer.length}`);

            this.send(ws, {
                type: 'proxy_request',
                id: requestId,
                data: requestBuffer.toString('base64'),
                clientIP: Array.isArray(clientIP) ? clientIP[0] : clientIP,
                timestamp: Date.now()
            });
        } catch (err) {
            appLogger.error(`[${requestId}] Error reading request body: ${err}`);
            this.sendError(ws, 'Error reading request body', requestId);
            this.cleanupRequest(requestId);
            try {
                if (!socket.destroyed && socket.writable) {
                    const errorResponse = `HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/plain\r\nContent-Length: 36\r\n\r\nServer error while reading request`;
                    socket.write(errorResponse);
                    socket.end();
                }
            } catch (writeError) {
                appLogger.error(`[${requestId}] Error writing error response: ${writeError}`);
            }
        }

        return true;
    }

    public hasActiveTunnelForHostname(hostname: string): boolean {
        const escapedDomain = this.domain.replaceAll('.', '\\.');
        const subdomainMatch = hostname.match(new RegExp(`^([^.]+)\\.${escapedDomain}$`));

        if (!subdomainMatch) {
            return false;
        }

        const subdomain = subdomainMatch[1];
        const ws = activeTunnels.get(subdomain);

        return Boolean(ws && ws.readyState === WebSocket.OPEN);
    }

    private async clearAllActiveSubdomains(): Promise<void> {
        activeTunnels.clear();

        // Mark all tunnel sessions as inactive on server start
        await models.tunnelSession.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        }).catch(err => {
            appLogger.error(`Failed to clear active tunnel sessions: ${err}`);
        });

        await models.tunnelToken.updateMany({
            data: { currentTunnels: 0 }
        }).catch(err => {
            appLogger.error(`Failed to reset tunnel counts: ${err}`);
        });

        appLogger.info('Cleared all active tunnels on server start');
    }

    private send(ws: WebSocket, message: TunnelMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private sendBinary(ws: WebSocket, type: number, id: string, payload: Uint8Array = Buffer.alloc(0)): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(createBinaryFrame(type, id, payload));
        }
    }

    private sendError(ws: WebSocket, error: string, id?: string): void {
        this.send(ws, { type: 'error', error, id });
    }

    public close(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Clean up all pending request timers
        this.pendingRequests.forEach((pending, id) => {
            clearTimeout(pending.timer);
        });
        this.pendingRequests.clear();

        this.wss.close();
        activeTunnels.clear();
        appLogger.info('Tunnel server closed');
    }
}

export function createTunnelServer(httpServer: http.Server, options: { port: number }): TunnelServer {
    return new TunnelServer(httpServer, options);
}
