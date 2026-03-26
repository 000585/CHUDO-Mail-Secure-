import app from '../hono/hono.js';
import { dbInit } from '../init/init.js';
import { adminOnly } from '../security/admin-guard.js';

// ИСПРАВЛЕНО: POST вместо GET, secret в body/header
app.post('/init', adminOnly, async (c) => {
    const { secret } = await c.req.json();
    const clientIP = c.req.header('CF-Connecting-IP');

    const allowedIPs = c.env.ADMIN_IPS?.split(',') || [];
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        return c.json({ code: 403, msg: 'IP not allowed' }, 403);
    }

    const tokenKey = `init_token:${secret}`;
    const tokenExists = await c.env.kv.get(tokenKey);
    if (!tokenExists) {
        return c.json({ code: 401, msg: 'Invalid or used token' }, 401);
    }

    await c.env.kv.delete(tokenKey);
    return dbInit.init(c);
});
