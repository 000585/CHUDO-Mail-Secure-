import app from '../hono/hono.js';
import emailService from '../service/email-service.js';
import result from '../model/result.js';
import { adminOnly } from '../security/admin-guard.js';

app.get('/allEmail/list', adminOnly, async (c) => {
    const data = await emailService.allList(c, c.req.query());
    return c.json(result.ok(data));
});

app.delete('/allEmail/delete', adminOnly, async (c) => {
    const list = await emailService.physicsDelete(c, c.req.query());
    return c.json(result.ok(list));
});

app.delete('/allEmail/batchDelete', adminOnly, async (c) => {
    await emailService.batchDelete(c, c.req.query());
    return c.json(result.ok());
});

app.get('/allEmail/latest', adminOnly, async (c) => {
    const list = await emailService.allEmailLatest(c, c.req.query());
    return c.json(result.ok(list));
});
