import orm from '../entity/orm.js';
import account from '../entity/account.js';
import { and, eq, inArray, desc, count } from 'drizzle-orm';
import { isDel, accountConst } from '../const/entity-const.js';
import BizError from '../error/biz-error.js';
import emailUtils from '../utils/email-utils.js';
import { t } from '../i18n/i18n.js';
import settingService from './setting-service.js';
import roleService from './role-service.js';

const accountService = {
    async list(c, params, userId) {
        let { num, size } = params;
        size = Math.min(Number(size) || 20, 50);
        num = (Math.max(Number(num) || 1, 1) - 1) * size;

        const list = await orm(c).select().from(account)
            .where(and(eq(account.userId, userId), eq(account.isDel, isDel.NORMAL)))
            .orderBy(desc(account.sort), desc(account.accountId))
            .limit(size).offset(num).all();

        const { total } = await orm(c).select({ total: count() }).from(account)
            .where(and(eq(account.userId, userId), eq(account.isDel, isDel.NORMAL))).get();

        return { list, total };
    },

    async add(c, params, userId) {
        const { email, name } = params;
        const { addEmail, manyEmail, maxAccountCount } = await settingService.query(c);

        if (addEmail === 0) throw new BizError(t('addAccountDisabled'));

        const emailName = emailUtils.getName(email);
        const emailDomain = emailUtils.getDomain(email);

        if (!c.env.domain.includes(emailDomain)) throw new BizError(t('notExistDomain'));

        const existing = await this.selectByEmailIncludeDel(c, email);
        if (existing && existing.isDel === isDel.DELETE) throw new BizError(t('isDelAccount'));
        if (existing) throw new BizError(t('isRegAccount'));

        const userAccounts = await orm(c).select({ count: count() }).from(account)
            .where(and(eq(account.userId, userId), eq(account.isDel, isDel.NORMAL))).get();
        
        const userRole = await roleService.selectByUserId(c, userId);
        const maxAccounts = userRole?.accountCount || maxAccountCount || 10;

        if (userAccounts.count >= maxAccounts) throw new BizError(t('accountLimit'));

        const result = await orm(c).insert(account).values({
            email,
            name: name || emailName,
            userId,
            allReceive: manyEmail ? accountConst.allReceive.OPEN : accountConst.allReceive.CLOSE
        }).returning().get();

        return result;
    },

    async delete(c, params, userId) {
        const { accountId } = params;
        const accountRow = await orm(c).select().from(account)
            .where(and(eq(account.accountId, accountId), eq(account.userId, userId))).get();
        
        if (!accountRow) throw new BizError(t('noUserAccount'));
        if (accountRow.email === c.env.admin) throw new BizError(t('delMyAccount'));

        await orm(c).update(account).set({ isDel: isDel.DELETE }).where(eq(account.accountId, accountId)).run();
    },

    async setName(c, params, userId) {
        const { accountId, name } = params;
        if (name?.length > 50) throw new BizError(t('usernameLengthLimit'));
        
        await orm(c).update(account).set({ name }).where(
            and(eq(account.accountId, accountId), eq(account.userId, userId))
        ).run();
    },

    async setAllReceive(c, params, userId) {
        const { accountId, allReceive } = params;
        await orm(c).update(account).set({ allReceive }).where(
            and(eq(account.accountId, accountId), eq(account.userId, userId))
        ).run();
    },

    async setAsTop(c, params, userId) {
        const { accountId } = params;
        const maxSort = await orm(c).select({ max: count() }).from(account)
            .where(eq(account.userId, userId)).get();
        
        await orm(c).update(account).set({ sort: (maxSort?.max || 0) + 1 }).where(
            and(eq(account.accountId, accountId), eq(account.userId, userId))
        ).run();
    },

    selectByEmailIncludeDel(c, email) {
        return orm(c).select().from(account).where(eq(account.email, email)).get();
    },

    async selectByEmail(c, email, userId) {
        return orm(c).select().from(account).where(
            and(eq(account.email, email), eq(account.userId, userId), eq(account.isDel, isDel.NORMAL))
        ).get();
    },

    async allAccount(c, params) {
        let { num, size, email } = params;
        size = Math.min(Number(size) || 20, 50);
        num = (Math.max(Number(num) || 1, 1) - 1) * size;

        const conditions = [eq(account.isDel, isDel.NORMAL)];
        if (email) conditions.push(eq(account.email, email));

        const list = await orm(c).select().from(account).where(and(...conditions))
            .orderBy(desc(account.accountId)).limit(size).offset(num).all();
        
        const { total } = await orm(c).select({ total: count() }).from(account).where(and(...conditions)).get();
        
        return { list, total };
    },

    async physicsDelete(c, params) {
        const { accountIds } = params;
        const ids = accountIds.split(',').map(Number);
        await orm(c).delete(account).where(inArray(account.accountId, ids)).run();
    },

    async physicsDeleteByUserIds(c, userIds) {
        await orm(c).delete(account).where(inArray(account.userId, userIds)).run();
    },

    async restoreByEmail(c, email) {
        await orm(c).update(account).set({ isDel: isDel.NORMAL }).where(eq(account.email, email)).run();
    },

    async restoreByUserId(c, userId) {
        await orm(c).update(account).set({ isDel: isDel.NORMAL }).where(eq(account.userId, userId)).run();
    },

    async selectUserAccountCountList(c, userIds, isDel = 0) {
        return orm(c).select({ userId: account.userId, count: count() }).from(account)
            .where(and(inArray(account.userId, userIds), eq(account.isDel, isDel)))
            .groupBy(account.userId).all();
    }
};

export default accountService;
