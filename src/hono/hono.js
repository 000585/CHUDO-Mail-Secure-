import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import result from '../model/result.js';
import { getCspNonce } from '../security/csp-nonce.js';

const app = new Hono();

// CORS - строгий без fallback
app.use('*', cors({
    origin: (origin, c) => {
        const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',') || ['https://chudo-mail.pages.dev'];
        if (!allowedOrigins.includes(origin)) {
            return null;
        }
        return origin;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
}));

// PATCH: CSP с nonce для inline styles
app.use('*', async (c, next) => {
    const nonce = getCspNonce(c);
    await secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
        xFrameOptions: 'DENY',
        xContentTypeOptions: 'nosniff',
        referrerPolicy: 'strict-origin-when-cross-origin',
    })(c, next);
});

app.onError((err, c) => {
    if (err.name === 'BizError') {
        console.log(`[BizError] ${err.message}`);
    } else {
        console.error(`[SystemError]`, err);
    }

    if (err.message?.includes("Cannot read properties of undefined (reading 'get')")) {
        return c.json(result.fail('KV database not bound', 502));
    }
    if (err.message?.includes("Cannot read properties of undefined (reading 'prepare')")) {
        return c.json(result.fail('D1 database not bound', 502));
    }

    const isDev = c.env.ENVIRONMENT === 'development';
    return c.json(result.fail(
        isDev ? err.message : 'Internal server error',
        err.code || 500
    ));
});

export default app;
