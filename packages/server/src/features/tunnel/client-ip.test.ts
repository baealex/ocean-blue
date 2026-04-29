import { describe, expect, it } from 'vitest';

import { getRequestClientIp } from './client-ip.js';

function requestWithAddress(headers: Record<string, string | string[] | undefined>, remoteAddress?: string) {
    return {
        headers,
        socket: {
            remoteAddress
        }
    };
}

describe('getRequestClientIp', () => {
    it('uses the first x-forwarded-for address when a proxy chain is present', () => {
        const request = requestWithAddress({
            'x-forwarded-for': '203.0.113.10, 198.51.100.20, 192.0.2.30'
        });

        expect(getRequestClientIp(request)).toBe('203.0.113.10');
    });

    it('uses the first non-empty forwarded header value when headers are repeated', () => {
        const request = requestWithAddress({
            'x-forwarded-for': ['  ', '203.0.113.11, 198.51.100.21']
        });

        expect(getRequestClientIp(request)).toBe('203.0.113.11');
    });

    it('uses x-real-ip when x-forwarded-for is not present', () => {
        const request = requestWithAddress({
            'x-real-ip': '198.51.100.42'
        });

        expect(getRequestClientIp(request)).toBe('198.51.100.42');
    });

    it('uses x-real-ip when x-forwarded-for is empty', () => {
        const request = requestWithAddress({
            'x-forwarded-for': '  ',
            'x-real-ip': '198.51.100.43'
        });

        expect(getRequestClientIp(request)).toBe('198.51.100.43');
    });

    it('falls back to the socket remote address', () => {
        const request = requestWithAddress({}, '::1');

        expect(getRequestClientIp(request)).toBe('::1');
    });

    it('returns null when no address is available', () => {
        const request = requestWithAddress({});

        expect(getRequestClientIp(request)).toBeNull();
    });
});
