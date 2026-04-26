import crypto from 'node:crypto';
import net from 'node:net';
import { createRequire } from 'node:module';

const requireFromServer = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const WebSocket = requireFromServer('ws');

const PROXY_DATA_TYPE = 1;
const PROXY_END_TYPE = 2;

function createBinaryFrame(type, id, payload = Buffer.alloc(0)) {
    const idBuffer = Buffer.from(id, 'utf8');
    const header = Buffer.alloc(2);

    header.writeUInt8(type, 0);
    header.writeUInt8(idBuffer.length, 1);

    return Buffer.concat([header, idBuffer, payload]);
}

export class TunnelBridge {
    constructor({ serverPort, token, subdomain, localPort, proxyMode = 'forward' }) {
        this.serverPort = serverPort;
        this.token = token;
        this.subdomain = subdomain;
        this.localPort = localPort;
        this.proxyMode = proxyMode;
        this.ws = null;
        this.localSockets = new Set();
        this.activeProxySockets = new Map();
        this.pendingRemoteFrames = new Map();
        this.pendingRemoteEnds = new Set();
        this.registered = false;
    }

    async connect() {
        this.ws = new WebSocket(`ws://127.0.0.1:${this.serverPort}/tunnel`);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timed out while registering tunnel ${this.subdomain}`));
            }, 10_000);

            const fail = (error) => {
                clearTimeout(timeout);
                reject(error instanceof Error ? error : new Error(String(error)));
            };

            this.ws.once('open', () => {
                this.ws.send(JSON.stringify({
                    type: 'register',
                    id: crypto.randomUUID(),
                    data: {
                        subdomain: this.subdomain,
                        token: this.token
                    }
                }));
            });

            this.ws.on('message', (buffer, isBinary) => {
                if (isBinary) {
                    this.handleBinaryMessage(Buffer.from(buffer));
                    return;
                }

                try {
                    const message = JSON.parse(buffer.toString('utf8'));

                    if (message.type === 'register_success') {
                        clearTimeout(timeout);
                        this.registered = true;
                        resolve(message.data);
                        return;
                    }

                    if (message.type === 'proxy_request') {
                        this.handleProxyRequest(message).catch((error) => {
                            this.sendJson({
                                type: 'proxy_error',
                                id: message.id,
                                error: error instanceof Error ? error.message : String(error)
                            });
                        });
                        return;
                    }

                    if (message.type === 'auth_failed' || message.type === 'error') {
                        fail(new Error(message.error || `Tunnel registration failed for ${this.subdomain}`));
                    }
                } catch (error) {
                    fail(error);
                }
            });

            this.ws.once('error', fail);
            this.ws.once('close', () => {
                if (!this.registered) {
                    fail(new Error(`Tunnel bridge closed before registration for ${this.subdomain}`));
                }
            });
        });
    }

    async handleProxyRequest(message) {
        if (this.proxyMode === 'force-error') {
            this.sendJson({
                type: 'proxy_error',
                id: message.id,
                error: 'Smoke test forced local app error'
            });
            return;
        }

        const requestBuffer = Buffer.from(message.data, 'base64');
        const socket = net.createConnection({
            host: '127.0.0.1',
            port: this.localPort
        });

        this.localSockets.add(socket);
        this.activeProxySockets.set(message.id, socket);

        socket.on('data', (chunk) => {
            this.sendBinary(PROXY_DATA_TYPE, message.id, chunk);
        });

        socket.once('end', () => {
            this.sendBinary(PROXY_END_TYPE, message.id);
            this.localSockets.delete(socket);
            this.cleanupProxySocket(message.id);
        });

        socket.once('close', () => {
            this.localSockets.delete(socket);
            this.cleanupProxySocket(message.id);
        });

        socket.once('error', (error) => {
            this.sendJson({
                type: 'proxy_error',
                id: message.id,
                error: error.message || 'Local app connection failed'
            });
            this.localSockets.delete(socket);
            this.cleanupProxySocket(message.id);
            socket.destroy();
        });

        socket.once('connect', () => {
            socket.write(requestBuffer);
            this.flushPendingRemoteFrames(message.id, socket);
        });
    }

    handleBinaryMessage(message) {
        try {
            const type = message.readUInt8(0);
            const idLen = message.readUInt8(1);
            const id = message.toString('utf8', 2, 2 + idLen);
            const payload = message.slice(2 + idLen);
            const socket = this.activeProxySockets.get(id);

            if (type === PROXY_DATA_TYPE) {
                if (socket && !socket.destroyed) {
                    socket.write(payload);
                } else {
                    const queuedFrames = this.pendingRemoteFrames.get(id) || [];
                    queuedFrames.push(payload);
                    this.pendingRemoteFrames.set(id, queuedFrames);
                }
                return;
            }

            if (type === PROXY_END_TYPE) {
                if (socket && !socket.destroyed) {
                    socket.end();
                } else {
                    this.pendingRemoteEnds.add(id);
                }
            }
        } catch {
            // Ignore invalid binary frames in smoke mode.
        }
    }

    flushPendingRemoteFrames(id, socket) {
        const queuedFrames = this.pendingRemoteFrames.get(id);
        if (queuedFrames) {
            queuedFrames.forEach((frame) => {
                socket.write(frame);
            });
            this.pendingRemoteFrames.delete(id);
        }

        if (this.pendingRemoteEnds.has(id)) {
            this.pendingRemoteEnds.delete(id);
            socket.end();
        }
    }

    cleanupProxySocket(id) {
        this.activeProxySockets.delete(id);
        this.pendingRemoteFrames.delete(id);
        this.pendingRemoteEnds.delete(id);
    }

    sendBinary(type, id, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(createBinaryFrame(type, id, payload));
    }

    sendJson(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    async close() {
        for (const socket of this.localSockets) {
            socket.destroy();
        }
        this.localSockets.clear();
        this.activeProxySockets.clear();
        this.pendingRemoteFrames.clear();
        this.pendingRemoteEnds.clear();

        if (!this.ws) {
            return;
        }

        const ws = this.ws;
        this.ws = null;

        if (ws.readyState === WebSocket.CLOSED) {
            return;
        }

        const closePromise = new Promise((resolve) => {
            ws.once('close', resolve);
        });
        ws.close();
        await closePromise;
    }
}
