import http from 'http';
import { AddressInfo } from 'net';
import open from 'open';
import chalk from 'chalk';
import configManager from './config.js';
import { resolveConnectionParams, DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT } from '@ocean-blue/shared';

export interface AuthOptions {
    serverHost?: string;
    serverPort?: number;
    serverProtocol?: 'http' | 'https';
}

export class AuthManager {
    private authCallbackPort: number;
    private authServer: http.Server | null = null;

    constructor(authCallbackPort: number = 9876) {
        this.authCallbackPort = authCallbackPort;
    }

    /**
     * Clean up existing auth server
     */
    private cleanup() {
        if (this.authServer) {
            try {
                this.authServer.close();
            } catch (error) {
                // Ignore errors during cleanup
            }
            this.authServer = null;
        }
    }

    /**
     * Get API key from local config or start auth flow if not available
     */
    public async getApiKey(options?: AuthOptions): Promise<string> {
        // Check if we already have an API key
        const existingApiKey = configManager.getApiKey();
        if (existingApiKey) {
            return existingApiKey;
        }

        console.log(chalk.yellow('Starting authentication flow...'));

        // Clean up any existing server before starting new auth flow
        this.cleanup();

        // Start local server to receive callback with API key
        const apiKey = await this.startAuthFlow(options);

        // Save the API key to config
        if (apiKey) {
            configManager.setApiKey(apiKey);
            console.log(chalk.green('✓ Authentication successful'));
        }

        return apiKey;
    }

    /**
     * Start the authentication flow by opening browser and waiting for callback
     */
    private async startAuthFlow(options?: AuthOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            let isResolved = false; // Flag to prevent race conditions

            const host = options?.serverHost || DEFAULT_SERVER_HOST;
            const port = options?.serverPort || DEFAULT_SERVER_PORT;
            const { protocol, portSuffix } = resolveConnectionParams(host, port, options?.serverProtocol);
            const authServerUrl = `${protocol}://${host}${portSuffix}/api/auth`;

            // Set a timeout for the authentication flow
            const authTimeout = setTimeout(() => {
                if (isResolved) return;
                isResolved = true;

                this.cleanup();
                reject(new Error('Authentication timed out. Please try again.'));
            }, 5 * 60 * 1000); // 5 minutes timeout

            // Helper functions to clear timeout
            const resolveWithCleanup = (apiKey: string) => {
                if (isResolved) return;
                isResolved = true;

                clearTimeout(authTimeout);
                resolve(apiKey);
            };

            const rejectWithCleanup = (error: any) => {
                if (isResolved) return;
                isResolved = true;

                clearTimeout(authTimeout);
                reject(error);
            };

            const sendSuccessResponse = (res: http.ServerResponse) => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <title>Ocean Blue Authentication</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .success { color: #4CAF50; }
                            </style>
                        </head>
                        <body>
                            <h1 class="success">Authentication Successful!</h1>
                            <p>You can now close this window and return to the terminal.</p>
                        </body>
                    </html>
                `);
            };

            const finishAuthCallback = (res: http.ServerResponse, apiKey: string | null) => {
                sendSuccessResponse(res);

                if (apiKey) {
                    setTimeout(() => {
                        this.cleanup();
                        resolveWithCleanup(apiKey);
                    }, 1000);
                    return;
                }

                this.cleanup();
                rejectWithCleanup(new Error('No API key received from authentication server'));
            };

            // Create a local server to receive the callback with the API key
            this.authServer = http.createServer((req, res) => {
                if (req.url?.startsWith('/callback')) {
                    if (req.method === 'POST') {
                        let body = '';

                        req.on('data', (chunk) => {
                            body += chunk.toString();
                        });

                        req.on('end', () => {
                            const apiKey = new URLSearchParams(body).get('apiKey');
                            finishAuthCallback(res, apiKey);
                        });

                        req.on('error', (error) => {
                            this.cleanup();
                            rejectWithCleanup(error);
                        });
                        return;
                    }

                    // Backward-compatible GET fallback
                    const address = this.authServer?.address() as AddressInfo;
                    const url = new URL(req.url, `http://localhost:${address.port}`);
                    const apiKey = url.searchParams.get('apiKey');
                    finishAuthCallback(res, apiKey);
                } else {
                    // Handle other routes
                    res.writeHead(404);
                    res.end();
                }
            });

            // Start the server with port 0 to let OS assign available port
            this.authServer.listen(0, () => {
                const address = this.authServer?.address() as AddressInfo;
                const callbackUrl = `http://localhost:${address.port}/callback`;

                // Build the auth URL with device ID and callback URL
                const deviceId = configManager.getDeviceId();
                const authUrl = `${authServerUrl}?deviceId=${deviceId}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

                console.log(chalk.blue('Opening browser for authentication...'));

                // Open the browser for authentication
                open(authUrl).catch(error => {
                    console.log(chalk.yellow('Could not open browser automatically.'));
                    console.log(chalk.yellow(`Please open this URL: ${authUrl}`));
                });
            });

            // Handle server errors
            this.authServer.on('error', (error: NodeJS.ErrnoException) => {
                console.error(chalk.red('Failed to start authentication server'));
                this.cleanup();
                rejectWithCleanup(error);
            });
        });
    }
}

export default new AuthManager();
