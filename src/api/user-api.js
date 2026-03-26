import app from '../hono/hono.js';
import userService from '../service/user-service.js';
import result from '../model/result.js';
import userContext from '../security/user-context.js';
import accountService from '../service/account-service.js';
import { adminOnly } from '../security/admin-guard.js';

app.delete('/user/delete', adminOnly, async (c) => {
    await userService.physicsDelete(c, c.req.query());
    return c.json(result.ok());
});

app.put('/user/setPwd', adminOnly, async (c) => {
    await userService.setPwd(c, await c.req.json());
    return c.json(result.ok());
});

app.put('/user/setStatus', adminOnly, async (c) => {
    await userService.setStatus(c, await c.req.json());
    return c.json(result.ok());
});

app.put('/user/setType', adminOnly, async (c) => {
    await userService.setType(c, await c.req.json());
    return c.json(result.ok());
});

app.get('/user/list', adminOnly, async (c) => {
    const data = await userService.list(c, c.req.query(), userContext.getUserId(c));
    return c.json(result.ok(data));
});

app.post('/user/add', adminOnly, async (c) => {
    await userService.add(c, await c.req.json());
    return c.json(result.ok());
});

app.put('/user/resetSendCount', adminOnly, async (c) => {
    await userService.resetSendCount(c, await c.req.json());
    return c.json(result.ok());
});

app.put('/user/restore', adminOnly, async (c) => {
    await userService.restore(c, await c.req.json());
    return c.json(result.ok());
});

app.get('/user/allAccount', adminOnly, async (c) => {
    const data = await accountService.allAccount(c, c.req.query());
    return c.json(result.ok(data));
});

app.delete('/user/deleteAccount', adminOnly, async (c) => {
    await accountService.physicsDelete(c, c.req.query());
    return c.json(result.ok());
});
