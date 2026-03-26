import app from '../hono/hono.js';
import result from '../model/result.js';
import roleService from '../service/role-service.js';
import permService from '../service/perm-service.js';
import { adminOnly } from '../security/admin-guard.js';

app.get('/role/list', adminOnly, async (c) => {
    const list = await roleService.roleList(c);
    return c.json(result.ok(list));
});

app.get('/role/tree', adminOnly, async (c) => {
    const tree = await permService.tree(c);
    return c.json(result.ok(tree));
});

app.post('/role/add', adminOnly, async (c) => {
    const body = await c.req.json();
    const role = await roleService.add(c, body);
    return c.json(result.ok(role));
});

app.put('/role/set', adminOnly, async (c) => {
    const body = await c.req.json();
    await roleService.setRole(c, body);
    return c.json(result.ok());
});

app.delete('/role/delete', adminOnly, async (c) => {
    const { roleId } = c.req.query();
    await roleService.delete(c, { roleId });
    return c.json(result.ok());
});

app.put('/role/setDefault', adminOnly, async (c) => {
    const { roleId } = await c.req.json();
    await roleService.setDefault(c, { roleId });
    return c.json(result.ok());
});
