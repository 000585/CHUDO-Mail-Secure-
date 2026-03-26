import orm from '../entity/orm.js';
import setting from '../entity/setting.js';
import { eq } from 'drizzle-orm';
import kvConst from '../const/kv-const.js';
import r2Service from './r2-service.js';
import fileUtils from '../utils/file-utils.js';
import constant from '../const/constant.js';
import BizError from '../error/biz-error.js';
import { t } from '../i18n/i18n.js';

const settingService = {
    async query(c) {
        // Кэширование в KV
        const cached = await c.env.kv.get(kvConst.SETTING);
        if (cached) return JSON.parse(cached);

        const row = await orm(c).select().from(setting).get();
        if (row) {
            await c.env.kv.put(kvConst.SETTING, JSON.stringify(row), { expirationTtl: 300 });
        }
        return row || {};
    },

    async get(c) {
        return this.query(c);
    },

    async set(c, params) {
        const existing = await orm(c).select().from(setting).get();
        
        if (existing) {
            await orm(c).update(setting).set(params).where(eq(setting.settingId, existing.settingId)).run();
        } else {
            await orm(c).insert(setting).values(params).run();
        }
        
        // Инвалидируем кэш
        await c.env.kv.delete(kvConst.SETTING);
        return true;
    },

    async websiteConfig(c) {
        const row = await this.query(c);
        return {
            title: row.title,
            background: row.background,
            loginOpacity: row.loginOpacity,
            autoRefresh: row.autoRefresh,
            register: row.register,
            receive: row.receive,
            addEmail: row.addEmail,
            manyEmail: row.manyEmail,
            registerVerify: row.registerVerify,
            addEmailVerify: row.addEmailVerify,
            regKey: row.regKey,
            send: row.send,
            tgBotStatus: row.tgBotStatus,
            forwardStatus: row.forwardStatus,
            ruleType: row.ruleType,
            noRecipient: row.noRecipient,
            siteKey: row.siteKey
        };
    },

    async setBackground(c, params) {
        const { image } = params;
        if (!image) throw new BizError(t('noOsUpBack'));

        const file = fileUtils.base64ToFile(image, 'background');
        const buff = await file.arrayBuffer();
        const hash = await fileUtils.getBuffHash(buff);
        const key = constant.BACKGROUND_PREFIX + hash + fileUtils.getExtFileName(file.name);

        await r2Service.putObj(c, key, buff, {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000'
        });

        const { r2Domain } = await this.query(c);
        const backgroundUrl = `${r2Domain}/${key}`;

        await this.set(c, { background: backgroundUrl });
        return key;
    },

    async deleteBackground(c) {
        const { background } = await this.query(c);
        if (!background) return;

        const key = background.split('/').pop();
        await r2Service.delete(c, constant.BACKGROUND_PREFIX + key);
        await this.set(c, { background: null });
    },

    async refresh(c) {
        await c.env.kv.delete(kvConst.SETTING);
    }
};

export default settingService;
