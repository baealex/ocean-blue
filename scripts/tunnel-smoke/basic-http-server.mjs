import http from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';

const requireFromServer = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const { WebSocketServer } = requireFromServer('ws');

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        req.on('data', (chunk) => {
            chunks.push(chunk);
        });

        req.on('end', () => {
            resolve(Buffer.concat(chunks));
        });

        req.on('error', reject);
    });
}

function sendJson(res, statusCode, payload, headers = {}) {
    const body = JSON.stringify(payload);

    res.writeHead(statusCode, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...headers
    });
    res.end(body);
}

export async function startBasicHttpServer() {
    const wss = new WebSocketServer({ noServer: true });
    wss.on('connection', (socket) => {
        socket.on('message', (message, isBinary) => {
            socket.send(message, { binary: isBinary });
        });
    });

    const server = http.createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', 'http://localhost');

            if (req.method === 'GET' && requestUrl.pathname === '/hello') {
                sendJson(res, 200, {
                    ok: true,
                    method: req.method,
                    pathname: requestUrl.pathname,
                    search: requestUrl.searchParams.toString(),
                    headerHost: req.headers.host || null
                });
                return;
            }

            if (req.method === 'POST' && requestUrl.pathname === '/echo-json') {
                const bodyBuffer = await readRequestBody(req);
                const parsedBody = JSON.parse(bodyBuffer.toString('utf8'));

                sendJson(res, 200, {
                    ok: true,
                    method: req.method,
                    pathname: requestUrl.pathname,
                    contentType: req.headers['content-type'] || null,
                    body: parsedBody
                });
                return;
            }

            if (req.method === 'POST' && requestUrl.pathname === '/multipart') {
                const bodyBuffer = await readRequestBody(req);

                sendJson(res, 200, {
                    ok: true,
                    contentType: req.headers['content-type'] || null,
                    bodyLength: bodyBuffer.length,
                    containsBoundary: bodyBuffer.toString('utf8').includes('baseline-boundary')
                });
                return;
            }

            if (req.method === 'GET' && requestUrl.pathname === '/events') {
                res.writeHead(200, {
                    'content-type': 'text/event-stream',
                    'cache-control': 'no-cache',
                    connection: 'keep-alive'
                });
                res.write('event: ready\n');
                res.write('data: baseline-1\n\n');

                setTimeout(() => {
                    res.write('event: done\n');
                    res.write('data: baseline-2\n\n');
                    res.end();
                }, 50);
                return;
            }

            sendJson(res, 404, {
                ok: false,
                pathname: requestUrl.pathname
            });
        } catch (error) {
            sendJson(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });

    server.on('upgrade', (req, socket, head) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost');

        if (requestUrl.pathname !== '/socket') {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve basic HTTP server port');
    }

    return {
        port: address.port,
        async close() {
            for (const socket of wss.clients) {
                socket.terminate();
            }
            await new Promise((resolve, reject) => {
                wss.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(undefined);
                });
            });
            server.close();
            await once(server, 'close');
        }
    };
}
