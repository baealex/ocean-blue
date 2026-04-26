import { DEFAULT_SERVER_HOST, DEFAULT_SERVER_PORT } from '../constants/index.js';

export interface ConnectionParams {
    serverHost: string;
    serverPort: number;
    protocol: 'http' | 'https';
    wsProtocol: 'ws' | 'wss';
    portSuffix: string;
}

/**
 * Resolve connection parameters from host and port.
 * Determines protocol (http/https, ws/wss) and port suffix based on
 * whether the host is localhost and the port number.
 */
export function resolveConnectionParams(
    host: string = DEFAULT_SERVER_HOST,
    port: number = DEFAULT_SERVER_PORT,
    protocol?: 'http' | 'https'
): ConnectionParams {
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const resolvedProtocol = protocol || (isLocalhost && port !== 443 ? 'http' : 'https');
    const wsProtocol = resolvedProtocol === 'https' ? 'wss' : 'ws';
    const portSuffix =
        (resolvedProtocol === 'https' && port === 443) ||
        (resolvedProtocol === 'http' && port === 80)
            ? ''
            : `:${port}`;

    return {
        serverHost: host,
        serverPort: port,
        protocol: resolvedProtocol,
        wsProtocol,
        portSuffix,
    };
}
