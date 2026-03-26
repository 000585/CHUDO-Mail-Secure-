import userContext from './user-context.js';
import permService from '../service/perm-service.js';

export async function adminOnly(c, next) {
    const userId = userContext.getUserId(c);
    const permKeys = await permService.userPermKeys(c, userId);
    
    const hasAdminPerm = permKeys.includes('*') || permKeys.includes('admin:full');
    
    if (!hasAdminPerm) {
        return c.json({ code: 403, msg: 'Admin permission required' }, 403);
    }
    await next();
}

export function requirePermission(permKey) {
    return async (c, next) => {
        const userId = userContext.getUserId(c);
        const permKeys = await permService.userPermKeys(c, userId);
        
        if (!permKeys.includes(permKey) && !permKeys.includes('*')) {
            return c.json({ code: 403, msg: `Permission ${permKey} required` }, 403);
        }
        await next();
    };
}
