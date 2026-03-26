import app from '../hono/hono.js';
import result from '../model/result.js';
import resendService from '../service/resend-service.js';

app.post('/webhooks/resend', async (c) => {
    const body = await c.req.json();
    const data = await resendService.handleWebhook(c, body);
    return c.json(result.ok(data));
});

app.post('/webhooks/:provider', async (c) => {
    const provider = c.req.param('provider');
    const body = await c.req.json();
    console.log(`Webhook from ${provider}:`, JSON.stringify(body).substring(0, 1000));
    return c.json(result.ok({ received: true, provider }));
});
