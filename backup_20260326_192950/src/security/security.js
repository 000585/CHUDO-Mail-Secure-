import jwtUtils from '../utils/jwt-utils.js';
import userContext from './user-context.js';
import constant from '../const/constant.js';
import app from '../hono/hono.js';

// ИСПРАВЛЕНО: Точное совпадение путей
const excludePaths = new Set(['/login', '/register', '/init', '/public/genToken', '/public/emailList', '/public/addUser']);

app.use('*', async (c, next) => {
    const path = c.req.path;
    
    // Проверяем точное совпадение или начало с /init/, /public/
    const isExcluded = excludePaths.has(path) || 
                      path.startsWith('/init/') || 
                      path.startsWith('/public/') ||
                      path === '/oauth/linuxDo/login' ||
                      path === '/oauth/bindUser';

    if (isExcluded) {
        return next();
    }

    const token = c.req.header(constant.TOKEN_HEADER);
    if (!token) {
        return c.json({ code: 401, msg: 'Unauthorized' }, 401);
    }

    try {
        const payload = await jwtUtils.verifyToken(c, token);
        if (!payload) {
            return c.json({ code: 401, msg: 'Invalid or expired token' }, 401);
        }
        
        userContext.setUserId(c, payload.userId);
        await next();
    } catch (err) {
        return c.json({ code: 401, msg: 'Invalid token' }, 401);
    }
});

export default app;
