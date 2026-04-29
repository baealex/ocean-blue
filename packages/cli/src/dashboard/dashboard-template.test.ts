import { describe, expect, it } from 'vitest';

import { getDashboardHTML } from './dashboard-template.js';

describe('dashboard request table', () => {
    it('clips long table values so IP chains cannot overlap adjacent columns', () => {
        const html = getDashboardHTML();

        expect(html).toMatch(/\.log-cell\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;/);
        expect(html).toMatch(/\.log-text\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/);
        expect(html).toContain('<span class="log-text path" title="');
        expect(html).toContain('<span class="log-text ip" title="');
    });
});
