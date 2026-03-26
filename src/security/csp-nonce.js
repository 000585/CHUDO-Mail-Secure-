// Middleware для CSP nonce
export function nonceMiddleware() {
    return async (c, next) => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        c.set('cspNonce', nonce);
        await next();
    };
}

// Helper для получения nonce в шаблонах
export function getCspNonce(c) {
    return c.get('cspNonce') || '';
}
