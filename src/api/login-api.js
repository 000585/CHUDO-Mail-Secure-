import app from '../hono/hono.js';
import loginService from '../service/login-service.js';
import result from '../model/result.js';
import userContext from '../security/user-context.js';
import { rateLimit } from '../security/rate-limit.js';

app.post('/login', rateLimit({ windowMs: 60000, max: 5 }), async (c) => {
    const token = await loginService.login(c, await c.req.json());
    return c.json(result.ok({ token: token }));
});

app.post('/register', rateLimit({ windowMs: 60000, max: 3 }), async (c) => {
    const jwt = await loginService.register(c, await c.req.json());
    return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
    await loginService.logout(c, userContext.getUserId(c));
    return c.json(result.ok());
});
