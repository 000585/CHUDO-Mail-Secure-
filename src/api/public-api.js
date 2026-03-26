import app from '../hono/hono.js';
import result from '../model/result.js';
import publicService from '../service/public-service.js';
import { rateLimit } from '../security/rate-limit.js';

app.post('/public/genToken', rateLimit({ windowMs: 3600000, max: 10 }), async (c) => {
    const data = await publicService.genToken(c, await c.req.json());
    return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
    const list = await publicService.emailList(c, await c.req.json());
    return c.json(result.ok(list));
});

app.post('/public/addUser', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
    await publicService.addUser(c, await c.req.json());
    return c.json(result.ok());
});
