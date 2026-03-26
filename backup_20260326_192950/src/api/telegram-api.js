import app from '../hono/hono.js';
import telegramService from '../service/telegram-service.js';

app.get('/telegram/getEmail/:token', async (c) => {
    const content = await telegramService.getEmailContent(c, c.req.param());
    c.header('Cache-Control', 'public, max-age=604800, immutable');
    c.header('X-Frame-Options', 'DENY');
    c.header('Content-Security-Policy', "default-src 'self'");
    return c.html(content);
});
