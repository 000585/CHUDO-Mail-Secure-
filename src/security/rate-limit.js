import kvConst from '../const/kv-const.js';

export function rateLimit(options = {}) {
    const { windowMs = 60000, max = 10, keyPrefix = 'ratelimit:' } = options;
    
    return async (c, next) => {
        const ip = c.req.header('CF-Connecting-IP') || 'unknown';
        const path = c.req.path;
        const key = `${keyPrefix}${ip}:${path}`;
        
        const now = Date.now();
        const windowStart = now - windowMs;
        
        const record = await c.env.kv.get(key, { type: 'json' }) || { requests: [], count: 0 };
        
        record.requests = record.requests.filter(time => time > windowStart);
        record.count = record.requests.length;
        
        if (record.count >= max) {
            return c.json({ 
                code: 429, 
                msg: `Rate limit exceeded. Try again in ${Math.ceil((record.requests[0] + windowMs - now) / 1000)}s` 
            }, 429);
        }
        
        record.requests.push(now);
        record.count++;
        
        await c.env.kv.put(key, JSON.stringify(record), { expirationTtl: Math.ceil(windowMs / 1000) + 60 });
        
        c.header('X-RateLimit-Limit', max);
        c.header('X-RateLimit-Remaining', Math.max(0, max - record.count));
        c.header('X-RateLimit-Reset', new Date(record.requests[0] + windowMs).toISOString());
        
        await next();
    };
}
