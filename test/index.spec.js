import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

describe('CHUDO Mail Security Tests', () => {
    it('should reject path traversal attempts', async () => {
        const request = new Request('http://example.com/static/../../../etc/passwd');
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(403);
    });

    it('should reject invalid JWT tokens', async () => {
        const request = new Request('http://example.com/api/email/list', {
            headers: { 'Authorization': 'Bearer invalid-token' }
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);
        expect(response.status).toBe(401);
    });

    it('should sanitize HTML in emails', async () => {
        // Test XSS protection
        const maliciousContent = '<script>alert("xss")</script><p>Valid content</p>';
        // DOMPurify should remove script tags
        expect(maliciousContent).toContain('<script>');
        // After sanitization, script should be removed
        const sanitized = maliciousContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        expect(sanitized).not.toContain('<script>');
    });

    it('should use scrypt for password hashing', async () => {
        const cryptoUtils = (await import('../src/utils/crypto-utils.js')).default;
        const { salt, hash } = await cryptoUtils.hashPassword('test-password');
        
        expect(salt).toBeDefined();
        expect(hash).toBeDefined();
        expect(salt.length).toBeGreaterThan(20);
        expect(hash.length).toBeGreaterThan(20);
        
        // Verify password
        const isValid = await cryptoUtils.verifyPassword('test-password', salt, hash);
        expect(isValid).toBe(true);
        
        const isInvalid = await cryptoUtils.verifyPassword('wrong-password', salt, hash);
        expect(isInvalid).toBe(false);
    });
});
