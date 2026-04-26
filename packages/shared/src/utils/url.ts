import { URL } from 'node:url';

/**
 * Parse base URL to extract protocol and host
 */
export function parseBaseUrl(baseUrl: string) {
    const url = new URL(baseUrl);
    return {
        protocol: url.protocol.replace(':', ''),
        host: url.host
    };
}
