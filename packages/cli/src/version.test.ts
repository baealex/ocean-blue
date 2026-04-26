import { describe, expect, it } from 'vitest';

import { CLI_VERSION } from './version';

describe('CLI_VERSION', () => {
    it('is read from package metadata', () => {
        expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
});
