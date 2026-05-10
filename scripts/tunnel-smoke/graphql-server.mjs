import http from 'node:http';
import { once } from 'node:events';

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

export async function startGraphqlServer() {
    const server = http.createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', 'http://localhost');

            if (req.method !== 'POST' || requestUrl.pathname !== '/graphql') {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not Found' }));
                return;
            }

            const bodyBuffer = await readRequestBody(req);
            const parsedBody = JSON.parse(bodyBuffer.toString('utf8'));

            const responseBody = JSON.stringify({
                data: {
                    ping: 'pong',
                    echoQuery: parsedBody.query,
                    echoVariables: parsedBody.variables || null
                }
            });

            res.writeHead(200, {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(responseBody)
            });
            res.end(responseBody);
        } catch (error) {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal Server Error'
            }));
        }
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');

    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve GraphQL server port');
    }

    return {
        port: address.port,
        async close() {
            server.close();
            await once(server, 'close');
        }
    };
}
