import BizError from '../error/biz-error.js';
import orm from '../entity/orm.js';
import { oauth } from '../entity/oauth.js';
import { eq, inArray } from 'drizzle-orm';
import userService from './user-service.js';
import loginService from './login-service.js';
import cryptoUtils from '../utils/crypto-utils.js';

const oauthService = {
    async bindUser(c, params) {
        const { email, oauthUserId, code } = params;
        const oauthRow = await this.getById(c, oauthUserId);
        if (!oauthRow) throw new BizError('OAuth user not found', 404);

        const existingUser = await userService.selectByIdIncludeDel(c, oauthRow.userId);
        if (existingUser) throw new BizError('User already bound to email', 400);

        await loginService.register(c, { email, password: cryptoUtils.genRandomPwd(), code }, true);
        const userRow = await userService.selectByEmail(c, email);
        await orm(c).update(oauth).set({ userId: userRow.userId }).where(eq(oauth.oauthUserId, oauthUserId)).run();

        const jwtToken = await loginService.login(c, { email, password: null }, true);
        return { userInfo: oauthRow, token: jwtToken };
    },

    async linuxDoLogin(c, params) {
        const { code } = params;
        const tokenRes = await fetch('https://connect.linux.do/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: c.env.linuxdo_client_id,
                client_secret: c.env.linuxdo_client_secret,
                code,
                grant_type: 'authorization_code'
            })
        });
        if (!tokenRes.ok) throw new BizError('OAuth token exchange failed', 400);
        const tokenData = await tokenRes.json();

        const userRes = await fetch('https://connect.linux.do/api/user', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (!userRes.ok) throw new BizError('Failed to get user info', 400);
        const userInfo = await userRes.json();

        const oauthData = {
            oauthUserId: String(userInfo.id),
            username: userInfo.username,
            name: userInfo.name,
            avatar: userInfo.avatar_url,
            active: userInfo.active ? 1 : 0,
            trustLevel: userInfo.trust_level,
            silenced: userInfo.silenced ? 1 : 0,
            platform: 1
        };

        const savedOAuth = await this.saveUser(c, oauthData);
        const localUser = await userService.selectByIdIncludeDel(c, savedOAuth.userId);

        if (!localUser) return { userInfo: savedOAuth, token: null, needBind: true };

        const jwtToken = await loginService.login(c, { email: localUser.email, password: null }, true);
        return { userInfo: savedOAuth, token: jwtToken, needBind: false };
    },

    async saveUser(c, userInfo) {
        const existing = await this.getById(c, userInfo.oauthUserId);
        if (!existing) {
            return await orm(c).insert(oauth).values(userInfo).returning().get();
        }
        return await orm(c).update(oauth).set(userInfo).where(eq(oauth.oauthUserId, userInfo.oauthUserId)).returning().get();
    },

    async getById(c, oauthUserId) {
        return await orm(c).select().from(oauth).where(eq(oauth.oauthUserId, oauthUserId)).get();
    },

    async clearNoBindOathUser(c) {
        await orm(c).delete(oauth).where(eq(oauth.userId, 0)).run();
    },

    async deleteByUserIds(c, userIds) {
        await orm(c).delete(oauth).where(inArray(oauth.userId, userIds)).run();
    }
};

export default oauthService;
