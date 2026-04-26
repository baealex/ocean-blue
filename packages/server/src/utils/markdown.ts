import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { readFileSync } from 'fs';
import { join } from 'path';
import { appLogger } from '~/core/index.js';

export interface TemplateContext {
    [key: string]: any;
}

const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const processMarkdownContent = async (content: string, context: TemplateContext = {}): Promise<string> => {
    // Template processing: replace {{variable}} with context values
    let processedContent = content;

    for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
        processedContent = processedContent.replace(regex, String(value));
    }

    // Parse markdown to HTML and sanitize
    const html = await marked.parse(processedContent);

    return DOMPurify.sanitize(html);
};

export const renderPageContent = async (content: string, contentType: string, context: TemplateContext = {}): Promise<string> => {
    if (contentType === 'md' || contentType === 'markdown') {
        const markdownHtml = await processMarkdownContent(content, context);
        return wrapInMarkdownTemplate(markdownHtml);
    }

    // For HTML content, still process templates but don't parse markdown
    let processedContent = content;

    for (const [key, value] of Object.entries(context)) {
        const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
        processedContent = processedContent.replace(regex, String(value));
    }

    return processedContent;
};

export const wrapInPasswordTemplate = (): string => {
    try {
        return readFileSync(join(process.cwd(), 'public', 'password-template.html'), 'utf-8');
    } catch (error) {
        appLogger.error(`Failed to read password template: ${error}`);
        return 'Password template not found';
    }
};

export const wrapInMarkdownTemplate = (markdownHtml: string): string => {
    try {
        const template = readFileSync(join(process.cwd(), 'public', 'markdown-template.html'), 'utf-8');
        return template.replace('{{CONTENT}}', markdownHtml);
    } catch (error) {
        appLogger.error(`Failed to read markdown template: ${error}`);
        return `<html><body>${markdownHtml}</body></html>`;
    }
};
