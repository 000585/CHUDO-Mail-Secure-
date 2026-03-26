import app from '../hono/hono.js';
import result from '../model/result.js';
import oauthService from '../service/oauth-service.js';

app.post('/oauth/linuxDo/login', async (c) => {
    const { code } = await c.req.json();
    const loginInfo = await oauthService.linuxDoLogin(c, { code });
    return c.json(result.ok(loginInfo));
});

app.put('/oauth/bindUser', async (c) => {
    const body = await c.req.json();
    const loginInfo = await oauthService.bindUser(c, body);
    return c.json(result.ok(loginInfo));
});
