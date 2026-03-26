import app from './hono/hono.js';
import { email } from './email/email.js';
import userService from './service/user-service.js';
import emailService from './service/email-service.js';
import oauthService from './service/oauth-service.js';

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);

        // API routes
        if (url.pathname.startsWith('/api/')) {
            url.pathname = url.pathname.replace('/api', '');
            req = new Request(url.toString(), req);
            return app.fetch(req, env, ctx);
        }

        // Static files and attachments - ИСПРАВЛЕНО: защита от path traversal
        if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/attachments/')) {
            let safePath = url.pathname.substring(1);
            
            // Нормализация и проверка пути
            safePath = safePath.replace(/\0/g, '').replace(/\\/g, '/');
            const normalizedPath = safePath.replace(/^(\.\.(\/|\\|$))+/, '');
            
            const allowedPrefixes = ['static/', 'attachments/'];
            const isAllowed = allowedPrefixes.some(prefix => 
                normalizedPath === prefix || normalizedPath.startsWith(prefix + '/')
            );
            
            if (!isAllowed || normalizedPath.includes('..')) {
                return new Response('Forbidden', { status: 403 });
            }

            const obj = await env.r2.get(normalizedPath);
            if (obj) {
                return new Response(obj.body, {
                    headers: {
                        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
                        'Cache-Control': 'public, max-age=31536000',
                        'X-Content-Type-Options': 'nosniff',
                    },
                });
            }
            return new Response('Not found', { status: 404 });
        }

        return env.assets.fetch(req);
    },

    email: email,

    async scheduled(c, env, ctx) {
        console.log('Running scheduled tasks...');
        await oauthService.clearNoBindOathUser({ env });
        await userService.resetDaySendCount({ env });
        await emailService.completeReceiveAll({ env });
    },
};
