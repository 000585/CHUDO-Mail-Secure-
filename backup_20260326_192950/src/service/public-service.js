import jwtUtils from '../utils/jwt-utils.js';
import loginService from './login-service.js';
import emailService from './email-service.js';
import userService from './user-service.js';
import cryptoUtils from '../utils/crypto-utils.js';
import BizError from '../error/biz-error.js';
import kvConst from '../const/kv-const.js';

const publicService = {
    async genToken(c, params) {
        const { secret } = params;
        if (secret !== c.env.public_api_secret) {
            throw new BizError('Invalid secret', 401);
        }
        const token = cryptoUtils.genRandomPwd(32);
        await c.env.kv.put(kvConst.PUBLIC_KEY, token, { expirationTtl: 60 * 60 * 24 * 365 });
        return { token };
    },

    async emailList(c, params) {
        const { token, accountId, ...rest } = params;
        const publicToken = await c.env.kv.get(kvConst.PUBLIC_KEY);
        if (token !== publicToken) throw new BizError('Invalid token', 401);
        const account = await c.env.db.prepare('SELECT user_id FROM account WHERE account_id = ?').bind(accountId).first();
        if (!account) throw new BizError('Account not found', 404);
        return emailService.list(c, { accountId, ...rest }, account.user_id);
    },

    async addUser(c, params) {
        const { token, users } = params;
        const publicToken = await c.env.kv.get(kvConst.PUBLIC_KEY);
        if (token !== publicToken) throw new BizError('Invalid token', 401);
        const results = [];
        for (const userData of users) {
            try {
                const password = cryptoUtils.genRandomPwd();
                await loginService.register(c, { email: userData.email, password, ...userData });
                results.push({ email: userData.email, status: 'created', password });
            } catch (e) {
                results.push({ email: userData.email, status: 'error', error: e.message });
            }
        }
        return results;
    }
};

export default publicService;
