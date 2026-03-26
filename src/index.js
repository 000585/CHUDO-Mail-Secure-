import app from './hono/hono.js';
import { email } from './email/email.js';
import userService from './service/user-service.js';
import emailService from './service/email-service.js';
import oauthService from './service/oauth-service.js';
import jwtUtils from './utils/jwt-utils.js';

// ИСПРАВЛЕНО: Усиленная нормализация пути
function normalizePath(input) {
    // Декодировать URL encoding полностью (двойное декодирование для обходов)
    let decoded = input;
    while (decoded.includes('%')) {
        try {
            const newDecoded = decodeURIComponent(decoded);
            if (newDecoded === decoded) break;
            decoded = newDecoded;
        } catch {
            break;
        }
    }
    
    // Удалить null bytes
    decoded = decoded.replace(/\0/g, '');
    
    // Заменить обратные слеши
    decoded = decoded.replace(/\\/g, '/');
    
    // Разбить и отфильтровать опасные сегменты
    const segments = decoded.split('/').filter(seg => seg && seg !== '.' && seg !== '..');
    
    return segments.join('/');
}

// ИСПРАВЛЕНО: Проверка ownership для attachments
async function checkAttachmentAccess(c, normalizedPath) {
    // Только для attachments/
    if (!normalizedPath.startsWith('attachments/')) {
        return true; // static/ не требует auth
    }
    
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return false;
    }
    
    const payload = await jwtUtils.verifyToken(c, token);
    if (!payload?.userId) {
        return false;
    }
    
    // Проверка: файл принадлежит пользователю через БД
    try {
        const fileRecord = await c.env.db.prepare(
            'SELECT user_id FROM attachments WHERE key = ? LIMIT 1'
        ).bind(normalizedPath).first();
        
        if (!fileRecord) {
            return false; // Файл не найден в БД
        }
        
        return String(fileRecord.user_id) === String(payload.userId);
    } catch (err) {
        console.error('Attachment auth check failed:', err);
        return false;
    }
}

export default {
    async fetch(req, env, ctx) {
        const url = new URL(req.url);

        // API routes
        if (url.pathname.startsWith('/api/')) {
            url.pathname = url.pathname.replace('/api', '');
            req = new Request(url.toString(), req);
            return app.fetch(req, env, ctx);
        }

        // Static files and attachments - ИСПРАВЛЕНО: усиленная защита
        if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/attachments/')) {
            // Нормализация пути
            let safePath = url.pathname.substring(1);
            const normalizedPath = normalizePath(safePath);
            
            // Строгая проверка префикса
            const allowedPrefixes = ['static/', 'attachments/'];
            const isAllowed = allowedPrefixes.some(prefix => 
                normalizedPath === prefix || normalizedPath.startsWith(prefix)
            );
            
            if (!isAllowed) {
                return new Response('Forbidden', { status: 403 });
            }

            // ИСПРАВЛЕНО: Проверка авторизации для attachments
            if (normalizedPath.startsWith('attachments/')) {
                const hasAccess = await checkAttachmentAccess({ req, env }, normalizedPath);
                if (!hasAccess) {
                    return new Response('Forbidden', { status: 403 });
                }
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
