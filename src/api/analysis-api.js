import app from '../hono/hono.js';
import result from '../model/result.js';
import analysisService from '../service/analysis-service.js';
import { adminOnly } from '../security/admin-guard.js';

app.get('/analysis/echarts', adminOnly, async (c) => {
    const { timeZone } = c.req.query();
    const data = await analysisService.echarts(c, { timeZone });
    return c.json(result.ok(data));
});
