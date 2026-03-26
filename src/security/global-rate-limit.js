import kvConst from '../const/kv-const.js';

// ИСПРАВЛЕНО: Глобальный rate limit для всех маршрутов
export function globalRateLimit(options = {}) {
    const { 
        windowMs = 60000, 
        max = 100,           // Общий лимит для API
        sensitiveMax = 10,   // Лимит для чувствительных endpoint'ов
        keyPrefix = 'global_ratelimit:' 
    } = options;

    // Чувствительные маршруты (строже)
    const sensitivePaths = [
        '/email/list',
        '/email/latest', 
        '/account/list',
        '/user/list',
        '/allEmail/list',
        '/analysis/echarts'
    ];

    return async (c, next) => {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const path = c.req.path;
        const isSensitive = sensitivePaths.some(p => path.includes(p));
        
        const limit = isSensitive ? sensitiveMax : max;
        const key = `${keyPrefix}${ip}:${path}`;

        const now = Date.now();
        const windowStart = now - windowMs;

        const record = await c.env.kv.get(key, { type: 'json' }) || { 
            requests: [], 
            count: 0,
            blocked: false 
        };

        // Если уже заблокирован
        if (record.blocked && record.blockUntil > now) {
            return c.json({
                code: 429,
                msg: 'Too many requests. Try again later.',
                retryAfter: Math.ceil((record.blockUntil - now) / 1000)
            }, 429);
        }

        // Очистка старых запросов
        record.requests = record.requests.filter(time => time > windowStart);
        record.count = record.requests.length;

        // Проверка лимита
        if (record.count >= limit) {
            // Блокировка на 5 минут при превышении
            record.blocked = true;
            record.blockUntil = now + (5 * 60 * 1000);
            
            await c.env.kv.put(key, JSON.stringify(record), { 
                expirationTtl: 600 
            });
            
            return c.json({
                code: 429,
                msg: 'Rate limit exceeded. Temporary blocked.',
                retryAfter: 300
            }, 429);
        }

        record.requests.push(now);
        record.count++;

        await c.env.kv.put(key, JSON.stringify(record), { 
            expirationTtl: Math.ceil(windowMs / 1000) + 60 
        });

        c.header('X-RateLimit-Limit', limit);
        c.header('X-RateLimit-Remaining', Math.max(0, limit - record.count));
        c.header('X-RateLimit-Reset', new Date(record.requests[0] + windowMs).toISOString());

        await next();
    };
}
