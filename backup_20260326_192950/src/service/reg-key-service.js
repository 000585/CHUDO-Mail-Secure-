import orm from '../entity/orm.js';
import regKey from '../entity/reg-key.js';
import { and, desc, count, eq, sql } from 'drizzle-orm';
import BizError from '../error/biz-error.js';
import { t } from '../i18n/i18n.js';
import dayjs from 'dayjs';

const regKeyService = {
    async add(c, params, userId) {
        let { count: keyCount, roleId, expireTime } = params;
        
        if (!keyCount || keyCount <= 0) throw new BizError(t('regKeyUseCount'));
        if (!expireTime) throw new BizError(t('emptyRegKeyExpire'));

        const code = this.generateCode();
        
        const existing = await orm(c).select().from(regKey).where(eq(regKey.code, code)).get();
        if (existing) throw new BizError(t('isExistRegKye'));

        return await orm(c).insert(regKey).values({
            code,
            count: keyCount,
            roleId,
            expireTime,
            userId,
            usedCount: 0
        }).returning().get();
    },

    async list(c, params) {
        let { num, size } = params;
        size = Math.min(Number(size) || 20, 50);
        num = (Math.max(Number(num) || 1, 1) - 1) * size;

        const list = await orm(c).select().from(regKey)
            .orderBy(desc(regKey.regKeyId))
            .limit(size).offset(num).all();

        const { total } = await orm(c).select({ total: count() }).from(regKey).get();

        return { list, total };
    },

    async delete(c, params) {
        const { regKeyId } = params;
        await orm(c).delete(regKey).where(eq(regKey.regKeyId, regKeyId)).run();
    },

    async clearNotUse(c) {
        const expired = dayjs().format('YYYY-MM-DD HH:mm:ss');
        await orm(c).delete(regKey).where(
            and(eq(regKey.usedCount, 0), sql`${regKey.expireTime} < ${expired}`)
        ).run();
    },

    async history(c, params) {
        const { regKeyId } = params;
        // История использования через userService
        const userService = (await import('./user-service.js')).default;
        return userService.listByRegKeyId(c, regKeyId);
    },

    async selectByCode(c, code) {
        return orm(c).select().from(regKey).where(eq(regKey.code, code)).get();
    },

    // ИСПРАВЛЕНО: Atomic decrement с проверкой
    async reduceCount(c, code, amount = 1) {
        const result = await c.env.db.prepare(`
            UPDATE reg_key 
            SET count = count - ?, used_count = used_count + ?
            WHERE code = ? AND count >= ?
            RETURNING *
        `).bind(amount, amount, code, amount).first();
        
        if (!result) throw new BizError(t('noRegKeyCount'));
        return result;
    },

    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};

export default regKeyService;
