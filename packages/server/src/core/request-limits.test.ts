import { describe, expect, it } from 'vitest';

import { parseByteLimit, parsePositiveInteger } from './request-limits.js';

describe('request limit parsing', () => {
    it('parses positive integer values with a fallback', () => {
        expect(parsePositiveInteger('42', 10)).toBe(42);
        expect(parsePositiveInteger('0', 10)).toBe(10);
        expect(parsePositiveInteger('nope', 10)).toBe(10);
    });

    it('parses byte limits with binary units', () => {
        expect(parseByteLimit('512', 1)).toBe(512);
        expect(parseByteLimit('2kb', 1)).toBe(2048);
        expect(parseByteLimit('3mb', 1)).toBe(3 * 1024 * 1024);
        expect(parseByteLimit('bad', 99)).toBe(99);
    });
});
