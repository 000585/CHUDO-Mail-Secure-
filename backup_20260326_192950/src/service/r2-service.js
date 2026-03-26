import s3Service from './s3-service.js';
import settingService from './setting-service.js';
import kvObjService from './kv-obj-service.js';

const r2Service = {
    async storageType(c) {
        const setting = await settingService.query(c);
        const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;
        if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) return 'S3';
        if (c.env.r2) return 'R2';
        return 'KV';
    },

    async putObj(c, key, content, metadata) {
        const storageType = await this.storageType(c);
        if (storageType === 'KV') {
            await kvObjService.putObj(c, key, content, metadata);
        } else if (storageType === 'R2') {
            await c.env.r2.put(key, content, { httpMetadata: { ...metadata } });
        } else if (storageType === 'S3') {
            await s3Service.putObj(c, key, content, metadata);
        }
    },

    async getObj(c, key) {
        return await c.env.r2.get(key);
    },

    async delete(c, key) {
        const storageType = await this.storageType(c);
        if (storageType === 'KV') {
            await kvObjService.deleteObj(c, key);
        } else if (storageType === 'R2') {
            await c.env.r2.delete(key);
        } else if (storageType === 'S3') {
            await s3Service.deleteObj(c, key);
        }
    }
};

export default r2Service;
