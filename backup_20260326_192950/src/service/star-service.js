import orm from '../entity/orm.js';
import star from '../entity/star.js';
import { and, desc, count, eq } from 'drizzle-orm';
import BizError from '../error/biz-error.js';
import { t } from '../i18n/i18n.js';

const starService = {
    async add(c, params, userId) {
        const { emailId } = params;
        const existing = await orm(c).select().from(star).where(
            and(eq(star.emailId, emailId), eq(star.userId, userId))
        ).get();
        
        if (existing) return existing;
        
        return await orm(c).insert(star).values({ emailId, userId }).returning().get();
    },

    async list(c, params, userId) {
        let { num, size } = params;
        size = Math.min(Number(size) || 20, 50);
        num = (Math.max(Number(num) || 1, 1) - 1) * size;

        const list = await orm(c).select().from(star)
            .where(eq(star.userId, userId))
            .orderBy(desc(star.starId))
            .limit(size).offset(num).all();

        const { total } = await orm(c).select({ total: count() }).from(star)
            .where(eq(star.userId, userId)).get();

        return { list, total };
    },

    async cancel(c, params, userId) {
        const { emailId } = params;
        await orm(c).delete(star).where(
            and(eq(star.emailId, emailId), eq(star.userId, userId))
        ).run();
    }
};

export default starService;
