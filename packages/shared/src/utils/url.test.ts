import { describe, expect, it } from 'vitest';

import { parseBaseUrl } from './url';

describe('parseBaseUrl', () => {
    it('returns protocol and host for a public base URL', () => {
        expect(parseBaseUrl('https://ocean.example.com')).toEqual({
            protocol: 'https',
            host: 'ocean.example.com'
        });
    });

    it('keeps the port in the host', () => {
        expect(parseBaseUrl('http://localhost:25830')).toEqual({
            protocol: 'http',
            host: 'localhost:25830'
        });
    });
});
