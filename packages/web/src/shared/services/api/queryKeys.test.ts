import { describe, expect, it } from 'vitest';

import { tunnelQueryKeys } from './queryKeys';

describe('tunnelQueryKeys', () => {
    it('keeps all tunnel keys under one root', () => {
        expect(tunnelQueryKeys.tokens()).toEqual(['tunnel', 'tokens']);
        expect(tunnelQueryKeys.sessions()).toEqual(['tunnel', 'sessions']);
    });

    it('scopes detail keys by id', () => {
        expect(tunnelQueryKeys.token('key-1')).toEqual(['tunnel', 'tokens', 'detail', 'key-1']);
        expect(tunnelQueryKeys.sessionsByToken('key-1')).toEqual(['tunnel', 'sessions', 'by-token', 'key-1']);
    });
});
