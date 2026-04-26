import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import net from 'net';
import chalk from 'chalk';
import { TunnelConfig, TunnelMessage, ProxyRequestMessage } from './types.js';
import authManager from './auth.js';
import configManager from './config.js';
import DashboardServer from './dashboard/dashboard-server.js';
import { CLI_VERSION } from './version.js';
import { resolveConnectionParams, DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT } from '@ocean-blue/shared';

// Custom Binary Protocol Message Types
const PROXY_DATA_TYPE = 1;
const PROXY_END_TYPE = 2;

class TunnelClient {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private dashboard: DashboardServer | null = null;
    private pingTimeout: NodeJS.Timeout | null = null;
    private authRetryAttempts = 0;
    private maxAuthRetryAttempts = 1;
    private isReauthenticating = false;
    private shouldReconnect = true;
    private activeProxySockets = new Map<string, net.Socket>();
    private pendingRemoteFrames = new Map<string, Buffer[]>();
    private pendingRemoteEnds = new Set<string>();

    constructor(private config: TunnelConfig) {
        this.config = {
            serverHost: DEFAULT_SERVER_HOST,
            serverPort: DEFAULT_SERVER_PORT,
            ...config
        };
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const { wsProtocol, portSuffix } = resolveConnectionParams(
                this.config.serverHost,
                this.config.serverPort,
                this.config.serverProtocol
            );
            const wsUrl = `${wsProtocol}://${this.config.serverHost}${portSuffix}/tunnel`;

            this.ws = new WebSocket(wsUrl, {
                perMessageDeflate: {
                    threshold: 1024, // Only compress messages larger than 1KB
                    concurrencyLimit: 10
                }
            });

            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.register();
                this.startHeartbeat();
                resolve();
            });

            this.ws.on('ping', () => {
                this.heartbeat();
            });

            this.ws.on('message', (data: Buffer, isBinary: boolean) => {
                if (isBinary) {
                    this.handleBinaryMessage(Buffer.from(data));
                    return;
                }

                try {
                    const message: TunnelMessage = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    // Ignore invalid messages silently in UI mode
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.clearHeartbeat();
                if (this.shouldReconnect) {
                    this.attemptReconnect();
                }
            });

            this.ws.on('error', (error) => {
                if (!this.isConnected) {
                    reject(error);
                } else {
                    console.log(chalk.red(`Connection error: ${error.message}`));
                    this.dashboard?.updateStatus('error');
                }
            });
        });
    }

    private register() {
        const subdomain = this.config.subdomain || `tunnel-${Math.random().toString(36).substring(2, 8)}`;
        const message: TunnelMessage = {
            type: 'register',
            id: uuidv4(),
            data: {
                subdomain,
                token: this.config.apiKey,
                clientVersion: CLI_VERSION
            }
        };
        this.sendMessage(message);
    }

    private handleMessage(message: TunnelMessage) {
        switch (message.type) {
            case 'register_success':
                this.handleRegistrationSuccess(message.data);
                break;
            case 'proxy_request':
                this.handleProxyRequest(message as ProxyRequestMessage);
                break;
            case 'auth_failed':
                this.handleAuthFailed((message as any).error);
                break;
            case 'error':
                this.handleFatalServerError((message as any).error || (message as any).data?.message || 'Unknown server error');
                break;
            case 'proxy_error':
                console.log(chalk.red(`Proxy error: ${(message as any).error}`));
                break;
            default:
            // console.warn(chalk.yellow('Unknown message type:'), message.type);
        }
    }

    private handleBinaryMessage(message: Buffer) {
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
        } catch (error) {
            // Ignore invalid binary frames in UI mode
        }
    }

    private flushPendingRemoteFrames(id: string, socket: net.Socket) {
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

    private cleanupProxySocket(id: string) {
        this.activeProxySockets.delete(id);
        this.pendingRemoteFrames.delete(id);
        this.pendingRemoteEnds.delete(id);
    }

    private async handleRegistrationSuccess(data: any) {
        // Start dashboard server with auto-assigned port (0 = OS assigns available port)
        this.dashboard = new DashboardServer(0);
        const dashboardPort = await this.dashboard.start({
            subdomain: data.subdomain,
            publicUrl: data.url,
            localPort: this.config.localPort
        });

        const dashboardUrl = `http://localhost:${dashboardPort}`;

        // Simple CLI output
        console.log('');
        console.log(chalk.green('✓ Tunnel connected successfully!'));
        console.log('');
        console.log(chalk.cyan('  Public URL:   ') + chalk.bold.white(data.url));
        console.log(chalk.cyan('  Local:        ') + chalk.bold.white(`localhost:${this.config.localPort}`));
        console.log(chalk.cyan('  Dashboard:    ') + chalk.bold.white(dashboardUrl));
        console.log('');
        console.log(chalk.gray('Open the dashboard URL manually when you need it.'));
        console.log('');
    }

    private async handleAuthFailed(error: string) {
        console.log(chalk.red('\n❌ Authentication failed:'), error || 'Invalid or expired tunnel key.');

        // Check if we've already tried to re-authenticate
        if (this.authRetryAttempts >= this.maxAuthRetryAttempts) {
            console.log(chalk.red('\n💡 Please create a new tunnel key:'));
            console.log('   1. Open the Ocean Blue dashboard');
            console.log('   2. Create a new tunnel key');
            console.log('   3. Run the tunnel command with the new key\n');
            this.disconnect();
            setTimeout(() => process.exit(1), 1000);
            return;
        }

        this.authRetryAttempts++;
        this.isReauthenticating = true;

        // Close current connection
        if (this.ws) {
            this.ws.close();
        }

        try {
            console.log(chalk.yellow('\n🔄 Re-authenticating...'));

            // Clear the old API key to force new auth flow
            configManager.setApiKey('');

            // Get new API key through auth flow (this will trigger startAuthFlow)
            const newApiKey = await authManager.getApiKey({
                serverHost: this.config.serverHost,
                serverPort: this.config.serverPort,
                serverProtocol: this.config.serverProtocol
            });

            // Update config with new API key
            this.config.apiKey = newApiKey;

            console.log(chalk.green('\n✓ Reconnecting...\n'));

            // Reset reconnect attempts on successful re-auth
            this.reconnectAttempts = 0;
            this.isReauthenticating = false;

            // Reconnect with new API key
            await this.connect();
        } catch (authError) {
            this.isReauthenticating = false;
            console.error(chalk.red('\n❌ Re-authentication failed'));
            console.log(chalk.red('\n💡 Please create a new tunnel key:'));
            console.log('   1. Open the Ocean Blue dashboard');
            console.log('   2. Create a new tunnel key');
            console.log('   3. Run the tunnel command with the new key\n');
            this.disconnect();
            setTimeout(() => process.exit(1), 1000);
        }
    }

    private handleFatalServerError(error: string) {
        console.log(chalk.red(`Server error: ${error}`));

        if (error.includes('already owned by another token')) {
            console.log(chalk.yellow('Use a different --subdomain or delete the old tunnel key that owns it.'));
        }

        this.shouldReconnect = false;
        this.dashboard?.updateStatus('error');
        this.disconnect();
        setTimeout(() => process.exit(1), 100);
    }

    private handleProxyRequest(message: ProxyRequestMessage) {
        const { id, data, clientIP } = message;
        const requestBuffer = Buffer.from(data, 'base64');
        // Start measuring from when we receive the message (not when socket connects)
        const startTime = Date.now();

        // Parse the raw HTTP request to extract method and path
        let method = 'GET';
        let path = '/';

        try {
            const requestString = requestBuffer.toString('utf8');
            const firstLine = requestString.split('\r\n')[0];
            [method, path] = firstLine.split(' ');
        } catch (err) {
            // If parsing fails, just continue with defaults
        }

        const socket = new net.Socket();
        this.activeProxySockets.set(id, socket);

        let totalResponseSize = 0;
        let responseStatus = 0;
        let hasTrackedResponse = false;

        // Register error handler before connecting to prevent unhandled errors
        socket.on('error', (err) => {
            // Track error response in dashboard
            if (this.dashboard && !hasTrackedResponse) {
                this.dashboard.addRequest({
                    ip: clientIP || 'unknown',
                    method: method || 'GET',
                    path: path || '/',
                    status: 502,
                    requestSize: requestBuffer.length,
                    responseSize: 0,
                    timeMs: Date.now() - startTime
                });
                hasTrackedResponse = true;
            }

            // Error messages are still sent as JSON
            this.sendMessage({
                type: 'proxy_error',
                error: err.message || 'Local connection failed',
                id
            });
            this.cleanupProxySocket(id);
            socket.destroy();
        });

        socket.on('data', (chunk) => {
            totalResponseSize += chunk.length;

            // Try to parse HTTP status from first response chunk
            if (!hasTrackedResponse) {
                try {
                    const responseString = chunk.toString('utf8');
                    const statusMatch = responseString.match(/^HTTP\/\d\.\d (\d{3})/);
                    if (statusMatch) {
                        responseStatus = parseInt(statusMatch[1], 10);
                    }
                } catch (err) {
                    // Ignore parsing errors
                }
            }

            // CUSTOM BINARY PROTOCOL:
            // [type (1 byte: 1=data)]
            // [id_len (1 byte)]
            // [id (utf8 string)]
            // [chunk (raw buffer)]
            const idBuffer = Buffer.from(id, 'utf8');
            const header = Buffer.alloc(2);
            header.writeUInt8(PROXY_DATA_TYPE, 0); // Type 1: PROXY_DATA
            header.writeUInt8(idBuffer.length, 1);
            this.sendMessage(Buffer.concat([header, idBuffer, chunk]));

            // H-7: Backpressure - pause local socket if WS buffer is full
            if (this.ws && this.ws.bufferedAmount > 1024 * 1024) {
                socket.pause();
                const checkDrain = () => {
                    if (this.ws && this.ws.bufferedAmount < 512 * 1024) {
                        socket.resume();
                    } else {
                        setTimeout(checkDrain, 50);
                    }
                };
                setTimeout(checkDrain, 50);
            }
        });

        socket.on('end', () => {
            // Track response completion in dashboard
            if (this.dashboard && !hasTrackedResponse) {
                this.dashboard.addRequest({
                    ip: clientIP || 'unknown',
                    method: method || 'GET',
                    path: path || '/',
                    status: responseStatus || 200,
                    requestSize: requestBuffer.length,
                    responseSize: totalResponseSize,
                    timeMs: Date.now() - startTime
                });
                hasTrackedResponse = true;
            }

            // CUSTOM BINARY PROTOCOL:
            // [type (1 byte: 2=end)]
            // [id_len (1 byte)]
            // [id (utf8 string)]
            const idBuffer = Buffer.from(id, 'utf8');
            const header = Buffer.alloc(2);
            header.writeUInt8(PROXY_END_TYPE, 0); // Type 2: PROXY_END
            header.writeUInt8(idBuffer.length, 1);
            this.sendMessage(Buffer.concat([header, idBuffer]));
            this.cleanupProxySocket(id);
        });

        socket.once('close', () => {
            this.cleanupProxySocket(id);
        });

        // Connect to local server after all event handlers are registered
        socket.connect(this.config.localPort, 'localhost', () => {
            // Send the request to local server
            socket.write(requestBuffer);
            this.flushPendingRemoteFrames(id, socket);
        });
    }

    private sendMessage(message: TunnelMessage | Buffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            if (Buffer.isBuffer(message)) {
                this.ws.send(message);
            } else {
                this.ws.send(JSON.stringify(message));
            }
        }
    }

    private attemptReconnect() {
        // Skip reconnection if re-authentication is in progress
        if (this.isReauthenticating) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log(chalk.red('Max reconnection attempts reached. Exiting.'));
            this.dashboard?.updateStatus('disconnected');
            this.disconnect();
            setTimeout(() => process.exit(1), 2000);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);

        console.log(chalk.yellow(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`));
        this.dashboard?.updateStatus('reconnecting');

        setTimeout(() => {
            this.connect().catch((error) => {
                console.log(chalk.red(`Reconnection failed: ${error.message}`));
            });
        }, delay);
    }

    private heartbeat() {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
        }

        // Terminate the connection if a ping is not received within 30 seconds + 5s grace period.
        // The 'ws' library automatically sends a pong frame back for each ping.
        this.pingTimeout = setTimeout(() => {
            if (this.ws) {
                console.log(chalk.yellow('Heartbeat timeout. Reconnecting...'));
                this.dashboard?.updateStatus('reconnecting');
                this.ws.terminate();
            }
        }, 30000 + 5000);
    }

    private clearHeartbeat() {
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }
    }

    private startHeartbeat() {
        this.heartbeat(); // Start the timer immediately
    }

    public disconnect() {
        this.shouldReconnect = false;
        this.dashboard?.stop();
        this.activeProxySockets.forEach((socket) => {
            socket.destroy();
        });
        this.activeProxySockets.clear();
        this.pendingRemoteFrames.clear();
        this.pendingRemoteEnds.clear();
        if (this.ws) {
            this.ws.close();
        }
        this.clearHeartbeat();
    }
}

export { TunnelClient };
export default TunnelClient;
