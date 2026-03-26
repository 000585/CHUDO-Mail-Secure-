import app from '../hono/hono.js';
import result from '../model/result.js';
import resendService from '../service/resend-service.js';
import { Webhook } from 'svix';

// Полная верификация Resend webhook через SVIX
async function verifyResendSignature(c, body) {
    const secret = c.env.RESEND_WEBHOOK_SECRET;
    
    // Если секрет не настроен - пропускаем в dev, reject в prod
    if (!secret) {
        return c.env.ENVIRONMENT === 'development';
    }
    
    const headers = {
        'svix-id': c.req.header('svix-id'),
        'svix-timestamp': c.req.header('svix-timestamp'),
        'svix-signature': c.req.header('svix-signature')
    };
    
    // Проверка наличия всех заголовков
    if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
        console.warn('Missing Svix headers');
        return false;
    }
    
    const wh = new Webhook(secret);
    
    try {
        // Криптографическая проверка подписи
        wh.verify(JSON.stringify(body), headers);
        return true;
    } catch (err) {
        console.error('Webhook verification failed:', err.message);
        return false;
    }
}

app.post('/webhooks/resend', async (c) => {
    const body = await c.req.json();
    
    const isValid = await verifyResendSignature(c, body);
    if (!isValid) {
        return c.json(result.fail('Invalid webhook signature', 401), 401);
    }
    
    const data = await resendService.handleWebhook(c, body);
    return c.json(result.ok(data));
});

app.post('/webhooks/:provider', async (c) => {
    const provider = c.req.param('provider');
    const body = await c.req.json();
    console.log(`Webhook from ${provider}:`, JSON.stringify(body).substring(0, 1000));
    return c.json(result.ok({ received: true, provider }));
});
