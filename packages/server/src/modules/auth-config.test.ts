import { describe, expect, it } from 'vitest';

import { resolveOceanBlueAuthConfig } from './auth-config.js';

describe('resolveOceanBlueAuthConfig', () => {
    it('defaults to open mode for quick local setup', () => {
        const config = resolveOceanBlueAuthConfig({});

        expect(config.mode).toBe('open');
        expect(config.source).toBe('implicit-open');
    });

    it('uses password mode when password and session secret are configured', () => {
        const config = resolveOceanBlueAuthConfig({
            OCEAN_BLUE_AUTH_PASSWORD: 'change-me',
            OCEAN_BLUE_SESSION_SECRET: 'replace-with-long-random-secret'
        });

        expect(config.mode).toBe('password');
        expect(config.source).toBe('password');
    });

    it('still requires a dedicated session secret in password mode', () => {
        expect(() => resolveOceanBlueAuthConfig({
            OCEAN_BLUE_AUTH_PASSWORD: 'change-me'
        })).toThrow('Missing OCEAN_BLUE_SESSION_SECRET');
    });
});
