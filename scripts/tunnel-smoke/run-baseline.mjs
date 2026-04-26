import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { startBasicHttpServer } from './basic-http-server.mjs';
import { startGraphqlServer } from './graphql-server.mjs';
import { TunnelBridge } from './tunnel-bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const includeObservations = process.argv.includes('--include-observations');
const requireFromServer = createRequire(path.join(repoRoot, 'packages/server/package.json'));
const WebSocket = requireFromServer('ws');

function logStep(message) {
    console.log(`\n▶ ${message}`);
}

function logSuccess(message) {
    console.log(`  ✓ ${message}`);
}

function logObservation(message) {
    console.log(`  • ${message}`);
}

function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Failed to allocate a port'));
                return;
            }

            const { port } = address;
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(port);
            });
        });
        server.once('error', reject);
    });
}

async function ensureBuiltArtifacts() {
    await access(path.join(repoRoot, 'packages/server/dist/main.js'));
    await access(path.join(repoRoot, 'packages/shared/dist/index.js'));
}

function runCommand(command, args, env = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: repoRoot,
            env: {
                ...process.env,
                ...env
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf8');
        });

        child.once('error', reject);
        child.once('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            reject(new Error([
                `Command failed: ${command} ${args.join(' ')}`,
                stdout.trim(),
                stderr.trim()
            ].filter(Boolean).join('\n')));
        });
    });
}

function startServerProcess({ port, databaseUrl }) {
    const child = spawn('node', ['packages/server/dist/main.js'], {
        cwd: repoRoot,
        env: {
            ...process.env,
            PORT: String(port),
            BASE_URL: `http://localhost:${port}`,
            DATABASE_URL: databaseUrl,
            OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH: 'true',
            LOG_LEVEL: 'error'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
        output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
        output += chunk.toString('utf8');
    });

    child.once('error', (error) => {
        console.error(error);
    });

    return { child, getOutput: () => output };
}

async function stopChildProcess(child) {
    if (!child || child.killed || child.exitCode !== null) {
        return;
    }

    const closePromise = new Promise((resolve) => {
        child.once('close', resolve);
    });

    child.kill('SIGINT');
    const timeout = delay(5_000).then(() => {
        if (child.exitCode === null) {
            child.kill('SIGKILL');
        }
    });

    await Promise.race([closePromise, timeout]);
}

function requestJson({ port, method = 'GET', path: requestPath, hostHeader, headers = {}, body, timeoutMs = 5_000 }) {
    return new Promise((resolve, reject) => {
        const normalizedHeaders = {
            Host: hostHeader,
            ...headers
        };

        if (body !== undefined && normalizedHeaders['content-length'] === undefined && normalizedHeaders['Content-Length'] === undefined) {
            normalizedHeaders['content-length'] = Buffer.byteLength(body);
        }

        const request = http.request({
            agent: false,
            host: '127.0.0.1',
            port,
            method,
            path: requestPath,
            headers: normalizedHeaders
        }, (response) => {
            const chunks = [];
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            response.on('end', () => {
                clearTimeout(timeoutId);
                const buffer = Buffer.concat(chunks);
                resolve({
                    statusCode: response.statusCode || 0,
                    headers: response.headers,
                    bodyText: buffer.toString('utf8'),
                    bodyBuffer: buffer
                });
            });
        });

        const timeoutId = setTimeout(() => {
            request.destroy(new Error(`Request timed out after ${timeoutMs}ms: ${method} ${hostHeader}${requestPath}`));
        }, timeoutMs);

        request.once('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });

        if (body) {
            request.write(body);
        }
        request.end();
    });
}

async function waitForHealth(port, serverOutput) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            const response = await requestJson({
                port,
                method: 'GET',
                path: '/health',
                hostHeader: `127.0.0.1:${port}`
            });

            if (response.statusCode === 200) {
                return;
            }
        } catch {
            // Ignore until next retry.
        }

        await delay(200);
    }

    throw new Error(`Ocean Blue server did not become healthy.\n${serverOutput()}`);
}

async function createTunnelToken(serverPort, tokenName) {
    const response = await requestJson({
        port: serverPort,
        method: 'POST',
        path: '/graphql',
        hostHeader: `127.0.0.1:${serverPort}`,
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            query: `
                mutation CreateTunnelToken($name: String!) {
                    createTunnelToken(name: $name, maxTunnels: 10) {
                        plainToken
                    }
                }
            `,
            variables: {
                name: tokenName
            }
        })
    });

    assert.equal(response.statusCode, 200, 'Expected createTunnelToken mutation to return 200');
    const payload = JSON.parse(response.bodyText);

    assert.ok(payload.data?.createTunnelToken?.plainToken, 'Expected createTunnelToken to return plainToken');
    return payload.data.createTunnelToken.plainToken;
}

async function observeWebSocket(port, hostHeader) {
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/socket`, {
            headers: {
                Host: hostHeader
            }
        });

        let settled = false;
        const timeoutId = setTimeout(() => {
            finish({ supported: false, detail: 'timeout' });
            ws.terminate();
        }, 5_000);
        const finish = (result) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            resolve(result);
        };

        ws.once('open', () => {
            ws.send('baseline-ws');
        });

        ws.once('message', (message) => {
            const echoed = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
            finish({ supported: true, detail: `echo:${echoed}` });
            ws.close();
        });

        ws.once('error', (error) => {
            finish({ supported: false, detail: error.message });
        });

        ws.once('close', (code) => {
            finish({ supported: false, detail: `closed:${code}` });
        });
    });
}

async function main() {
    await ensureBuiltArtifacts();

    const tempDir = await mkdtemp(path.join(tmpdir(), 'ocean-blue-smoke-'));
    const databaseUrl = `file:${path.join(tempDir, 'baseline.db')}`;
    const serverPort = await getAvailablePort();
    const basicServer = await startBasicHttpServer();
    const graphqlServer = await startGraphqlServer();
    const suffix = Math.random().toString(36).slice(2, 8);
    const cleanupTasks = [];

    cleanupTasks.push(() => basicServer.close());
    cleanupTasks.push(() => graphqlServer.close());

    let serverProcess = null;
    let httpBridge = null;
    let graphqlBridge = null;
    try {
        logStep('Preparing temporary database');
        await runCommand(pnpmCommand, ['-F', '@ocean-blue/server', 'exec', 'prisma', 'migrate', 'deploy'], {
            DATABASE_URL: databaseUrl
        });
        logSuccess('Prisma migrations applied to a temp SQLite database');

        logStep('Starting Ocean Blue server in open auth mode');
        serverProcess = startServerProcess({ port: serverPort, databaseUrl });
        await waitForHealth(serverPort, serverProcess.getOutput);
        logSuccess(`Ocean Blue server is healthy on port ${serverPort}`);

        logStep('Creating a tunnel token for smoke requests');
        const token = await createTunnelToken(serverPort, `Baseline smoke ${suffix}`);
        logSuccess('Tunnel token issued through GraphQL');

        const httpSubdomain = `baseline-http-${suffix}`;
        httpBridge = new TunnelBridge({
            serverPort,
            token,
            subdomain: httpSubdomain,
            localPort: basicServer.port
        });
        await httpBridge.connect();
        logSuccess(`HTTP tunnel registered for ${httpSubdomain}.localhost:${serverPort}`);

        logStep('P0: GET and JSON POST should succeed through the tunnel');
        const getResponse = await requestJson({
            port: serverPort,
            method: 'GET',
            path: '/hello?name=baseline',
            hostHeader: `${httpSubdomain}.localhost:${serverPort}`
        });
        assert.equal(getResponse.statusCode, 200, 'Expected tunneled GET to succeed');
        const getPayload = JSON.parse(getResponse.bodyText);
        assert.equal(getPayload.pathname, '/hello');
        assert.equal(getPayload.search, 'name=baseline');
        logSuccess('Tunneled GET request works');

        const postPayload = {
            hello: 'world',
            nested: {
                value: 7
            }
        };
        const postResponse = await requestJson({
            port: serverPort,
            method: 'POST',
            path: '/echo-json',
            hostHeader: `${httpSubdomain}.localhost:${serverPort}`,
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(postPayload)
        });
        assert.equal(postResponse.statusCode, 200, 'Expected tunneled JSON POST to succeed');
        const postBody = JSON.parse(postResponse.bodyText);
        assert.deepEqual(postBody.body, postPayload);
        logSuccess('Tunneled JSON POST works');

        const graphqlSubdomain = `baseline-graphql-${suffix}`;
        graphqlBridge = new TunnelBridge({
            serverPort,
            token,
            subdomain: graphqlSubdomain,
            localPort: graphqlServer.port
        });
        await graphqlBridge.connect();

        logStep('P0: GraphQL POST should keep working through the tunnel');
        const graphqlResponse = await requestJson({
            port: serverPort,
            method: 'POST',
            path: '/graphql',
            hostHeader: `${graphqlSubdomain}.localhost:${serverPort}`,
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                query: 'query Smoke($name: String!) { ping echoQuery echoVariables }',
                variables: {
                    name: 'baseline'
                }
            })
        });
        assert.equal(graphqlResponse.statusCode, 200, 'Expected tunneled GraphQL POST to succeed');
        const graphqlBody = JSON.parse(graphqlResponse.bodyText);
        assert.equal(graphqlBody.data.ping, 'pong');
        assert.equal(graphqlBody.data.echoVariables.name, 'baseline');
        logSuccess('Tunneled GraphQL POST works');

        logStep('P0: WebSocket upgrade should echo through the tunnel');
        const websocketBaseline = await observeWebSocket(serverPort, `${httpSubdomain}.localhost:${serverPort}`);
        assert.equal(websocketBaseline.supported, true, `Expected tunneled WebSocket upgrade to succeed (${websocketBaseline.detail})`);
        assert.equal(websocketBaseline.detail, 'echo:baseline-ws');
        logSuccess('Tunneled WebSocket echo works');

        logStep('P0: Unknown subdomain should still return a fast 404');
        const missingResponse = await requestJson({
            port: serverPort,
            method: 'GET',
            path: '/missing',
            hostHeader: `missing-${suffix}.localhost:${serverPort}`
        });
        assert.equal(missingResponse.statusCode, 404, 'Expected missing subdomain to return 404');
        assert.match(missingResponse.bodyText, /Tunnel Not Found|Tunnel for .* not found/i);
        logSuccess('Missing subdomain contract is stable');

        if (includeObservations) {
            logStep('P1 observations: multipart, SSE, WebSocket');

            try {
                const multipartBody = [
                    '--baseline-boundary',
                    'Content-Disposition: form-data; name="file"; filename="smoke.txt"',
                    'Content-Type: text/plain',
                    '',
                    'baseline-file-body',
                    '--baseline-boundary--',
                    ''
                ].join('\r\n');
                const multipartResponse = await requestJson({
                    port: serverPort,
                    method: 'POST',
                    path: '/multipart',
                    hostHeader: `${httpSubdomain}.localhost:${serverPort}`,
                    headers: {
                        'content-type': 'multipart/form-data; boundary=baseline-boundary'
                    },
                    body: multipartBody
                });
                logObservation(`multipart status=${multipartResponse.statusCode} body=${multipartResponse.bodyText}`);
            } catch (error) {
                logObservation(`multipart observation failed: ${error instanceof Error ? error.message : String(error)}`);
            }

            try {
                const sseResponse = await requestJson({
                    port: serverPort,
                    method: 'GET',
                    path: '/events',
                    hostHeader: `${httpSubdomain}.localhost:${serverPort}`
                });
                logObservation(`sse status=${sseResponse.statusCode} body=${JSON.stringify(sseResponse.bodyText)}`);
            } catch (error) {
                logObservation(`sse observation failed: ${error instanceof Error ? error.message : String(error)}`);
            }

            try {
                const websocketObservation = await observeWebSocket(serverPort, `${httpSubdomain}.localhost:${serverPort}`);
                logObservation(`websocket supported=${websocketObservation.supported} detail=${websocketObservation.detail}`);
            } catch (error) {
                logObservation(`websocket observation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        logStep('P0: Disconnecting a tunnel should fall back to 404');
        await httpBridge.close();
        httpBridge = null;
        const disconnectedResponse = await requestJson({
            port: serverPort,
            method: 'GET',
            path: '/hello',
            hostHeader: `${httpSubdomain}.localhost:${serverPort}`
        });
        assert.equal(disconnectedResponse.statusCode, 404, 'Expected disconnected tunnel to return 404');
        logSuccess('Disconnected tunnel contract is stable');

        console.log('\n✅ Ocean Blue tunnel baseline smoke checks passed');
    } finally {
        await Promise.allSettled([
            httpBridge?.close(),
            graphqlBridge?.close()
        ]);

        if (serverProcess) {
            await stopChildProcess(serverProcess.child);
        }

        for (const cleanupTask of cleanupTasks.reverse()) {
            await cleanupTask();
        }

        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error('\n❌ Tunnel baseline smoke test failed');
    console.error(error);
    process.exit(1);
});
