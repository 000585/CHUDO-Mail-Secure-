import app from './hono.js';
import { globalRateLimit } from '../security/global-rate-limit.js';
import { nonceMiddleware } from '../security/csp-nonce.js';
import '../api/login-api.js';
import '../api/init-api.js';
import '../api/email-api.js';
import '../api/user-api.js';
import '../api/setting-api.js';
import '../api/reg-key-api.js';
import '../api/star-api.js';
import '../api/account-api.js';
import '../api/my-api.js';
import '../api/all-email-api.js';
import '../api/role-api.js';
import '../api/analysis-api.js';
import '../api/oauth-api.js';
import '../api/telegram-api.js';
import '../api/webhook-api.js';
import '../api/public-api.js';
import '../security/security.js';

// Global rate limiting
app.use('/api/*', globalRateLimit({
    windowMs: 60000,
    max: 100,
    sensitiveMax: 20
}));

// PATCH: CSP nonce middleware для HTML endpoints
app.use('/telegram/getEmail/*', nonceMiddleware());

export default app;
