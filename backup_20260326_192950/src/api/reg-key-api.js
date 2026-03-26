import app from '../hono/hono.js';
import result from '../model/result.js';
import regKeyService from '../service/reg-key-service.js';
import userContext from '../security/user-context.js';
import { adminOnly } from '../security/admin-guard.js';

app.post('/regKey/add', adminOnly, async (c) => {
    await regKeyService.add(c, await c.req.json(), await userContext.getUserId(c));
    return c.json(result.ok());
});

app.get('/regKey/list', adminOnly, async (c) => {
    const list = await regKeyService.list(c, c.req.query());
    return c.json(result.ok(list));
});

app.delete('/regKey/delete', adminOnly, async (c) => {
    await regKeyService.delete(c, c.req.query());
    return c.json(result.ok());
});

app.delete('/regKey/clearNotUse', adminOnly, async (c) => {
    await regKeyService.clearNotUse(c);
    return c.json(result.ok());
});

app.get('/regKey/history', adminOnly, async (c) => {
    const list = await regKeyService.history(c, c.req.query());
    return c.json(result.ok(list));
});
