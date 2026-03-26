import orm from '../entity/orm.js';
import attachments from '../entity/attachments.js';
import { and, desc, count, eq, inArray } from 'drizzle-orm';
import { attConst } from '../const/entity-const.js';
import r2Service from './r2-service.js';

const attService = {
    async list(c, params, userId) {
        let { emailId, num, size } = params;
        size = Math.min(Number(size) || 20, 50);
        num = (Math.max(Number(num) || 1, 1) - 1) * size;

        const list = await orm(c).select().from(attachments)
            .where(and(eq(attachments.emailId, emailId), eq(attachments.userId, userId)))
            .orderBy(desc(attachments.attId))
            .limit(size).offset(num).all();

        const { total } = await orm(c).select({ total: count() }).from(attachments)
            .where(and(eq(attachments.emailId, emailId), eq(attachments.userId, userId))).get();

        return { list, total };
    },

    async addAtt(c, attachmentsList) {
        if (!attachmentsList?.length) return;
        
        // Параллельная загрузка в R2
        await Promise.all(attachmentsList.map(att => 
            r2Service.putObj(c, att.key, att.content, {
                contentType: att.mimeType,
                contentDisposition: `attachment; filename="${att.filename}"`
            })
        ));

        // Batch insert в D1
        const values = attachmentsList.map(att => ({
            userId: att.userId,
            emailId: att.emailId,
            accountId: att.accountId,
            key: att.key,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            disposition: att.disposition,
            related: att.related,
            contentId: att.contentId,
            encoding: att.encoding,
            status: attConst.status.NORMAL,
            type: att.contentId ? attConst.type.EMBED : attConst.type.ATT
        }));

        await orm(c).insert(attachments).values(values).run();
    },

    async saveSendAtt(c, attachmentsList, userId, accountId, emailId) {
        const enriched = attachmentsList.map(att => ({
            ...att,
            userId,
            accountId,
            emailId
        }));
        return this.addAtt(c, enriched);
    },

    async selectByEmailIds(c, emailIds) {
        if (!emailIds?.length) return [];
        return orm(c).select().from(attachments)
            .where(inArray(attachments.emailId, emailIds))
            .all();
    },

    async deleteByEmailId(c, emailId) {
        const list = await orm(c).select().from(attachments).where(eq(attachments.emailId, emailId)).all();
        
        // Удаление из R2
        await Promise.all(list.map(att => r2Service.delete(c, att.key)));
        
        // Удаление из D1
        await orm(c).delete(attachments).where(eq(attachments.emailId, emailId)).run();
    }
};

export default attService;
