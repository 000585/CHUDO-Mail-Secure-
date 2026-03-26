import orm from '../entity/orm.js';
import { email } from '../entity/email.js';
import { and, eq, gt, lt, inArray, desc, asc, count, sql } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const.js';
import BizError from '../error/biz-error.js';
import attService from './att-service.js';
import telegramService from './telegram-service.js';
import settingService from './setting-service.js';
import verifyUtils from '../utils/verify-utils.js';
import emailUtils from '../utils/email-utils.js';
import fileUtils from '../utils/file-utils.js';
import constant from '../const/constant.js';
import DOMPurify from 'isomorphic-dompurify';

const emailService = {
    async list(c, params, userId) {
        let { emailId, type, accountId, size, timeSort } = params;
        size = Math.min(Number(size) || 20, 50);
        emailId = Number(emailId) || (Number(timeSort) ? 0 : 9999999999);
        type = Number(type);
        accountId = Number(accountId);
        userId = Number(userId);

        if (!accountId || isNaN(accountId)) throw new BizError('Account ID required', 400);

        const conditions = [
            eq(email.accountId, accountId),
            eq(email.userId, userId),
            eq(email.type, type),
            eq(email.isDel, isDel.NORMAL),
            eq(email.status, emailConst.status.RECEIVE)
        ];

        if (Number(timeSort)) {
            conditions.push(gt(email.emailId, emailId));
        } else {
            conditions.push(lt(email.emailId, emailId));
        }

        const query = orm(c).select().from(email).where(and(...conditions));
        if (Number(timeSort)) {
            query.orderBy(asc(email.emailId));
        } else {
            query.orderBy(desc(email.emailId));
        }

        const [list, totalRow] = await Promise.all([
            query.limit(size).all(),
            orm(c).select({ total: count() }).from(email)
                .where(and(eq(email.accountId, accountId), eq(email.userId, userId), eq(email.type, type), eq(email.isDel, isDel.NORMAL)))
                .get(),
        ]);

        await this.emailAddAtt(c, list);
        return { list, total: totalRow?.total || 0, hasMore: list.length === size };
    },

    async send(c, params, userId) {
        const { accountId, name, receiveEmail = [], subject, text, content, attachments = [], replyTo } = params;

        if (!Array.isArray(receiveEmail) || receiveEmail.length === 0) throw new BizError('At least one recipient required', 400);
        if (!verifyUtils.validateEmails(receiveEmail)) throw new BizError('Invalid email address in recipients', 400);
        if (receiveEmail.length > 50) throw new BizError('Too many recipients (max 50)', 400);

        const { send: sendEnabled, domainList } = await settingService.query(c);
        if (sendEnabled === 0) throw new BizError('Sending is disabled', 403);

        const accountRow = await c.env.db.prepare('SELECT * FROM account WHERE account_id = ? AND user_id = ? AND is_del = 0')
            .bind(accountId, userId).first();
        if (!accountRow) throw new BizError('Sender account not found', 404);

        const senderDomain = emailUtils.getDomain(accountRow.email);
        if (!domainList.includes(`@${senderDomain}`)) throw new BizError('Domain not authorized', 403);

        let totalSize = 0;
        for (const att of attachments) {
            const size = att.content?.length || 0;
            totalSize += size;
            if (size > fileUtils.MAX_SIZE.ATTACHMENT) throw new BizError(`Attachment too large: ${att.filename}`, 400);
        }
        if (totalSize > fileUtils.MAX_SIZE.TOTAL) throw new BizError('Total attachments size exceeds 50MB', 400);

        let processedContent = content;
        const inlineImages = [];
        if (content && content.includes('data:image')) {
            const imgRegex = /<img[^>]+src="(data:image\/[^;]+;base64,[^"]+)"/g;
            let match, imgIndex = 0;
            while ((match = imgRegex.exec(content)) !== null) {
                try {
                    const base64Data = match[1];
                    const file = fileUtils.base64ToFile(base64Data, `image_${imgIndex}`);
                    const buff = await file.arrayBuffer();
                    const hash = await fileUtils.getBuffHash(buff);
                    const key = constant.ATTACHMENT_PREFIX + hash + fileUtils.getExtFileName(file.name);
                    const cid = `img_${imgIndex}_${hash.substring(0, 8)}`;
                    processedContent = processedContent.replace(base64Data, `cid:${cid}`);
                    inlineImages.push({
                        key, filename: file.name, mimeType: file.type, size: file.size,
                        content: buff, contentId: cid
                    });
                    imgIndex++;
                } catch (e) { console.error('Failed to process inline image:', e); }
            }
        }

        const sanitizedContent = DOMPurify.sanitize(processedContent, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img'],
            ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'cid'],
            ALLOW_DATA_ATTR: false,
        });

        const emailData = {
            sendEmail: accountRow.email,
            name: verifyUtils.sanitize(name) || emailUtils.getName(accountRow.email),
            subject: verifyUtils.sanitize(subject, 998),
            content: sanitizedContent,
            text: verifyUtils.sanitize(text, 10000),
            accountId, userId,
            status: emailConst.status.SENT,
            type: emailConst.type.SEND,
            recipient: JSON.stringify(receiveEmail.map(e => ({ address: emailUtils.normalize(e), name: '' }))),
            inReplyTo: replyTo || ''
        };

        const result = await orm(c).insert(email).values(emailData).returning().get();
        if (attachments.length > 0 || inlineImages.length > 0) {
            await attService.saveSendAtt(c, [...attachments, ...inlineImages], userId, accountId, result.emailId);
        }

        try {
            await telegramService.sendEmailToBot(c, result);
        } catch (e) { console.error('Telegram notification failed:', e); }

        result.attList = [...attachments, ...inlineImages];
        return [result];
    },

    async receive(c, params, cidAttList = [], r2Domain = '') {
        let content = params.content || '';
        if (cidAttList && cidAttList.length > 0) {
            for (const att of cidAttList) {
                const cid = att.contentId?.replace(/^<|>$/g, '');
                if (cid) {
                    content = content.replace(new RegExp(`cid:${cid}`, 'g'), `${r2Domain}/${att.key}`);
                }
            }
        }
        
        const sanitizedContent = DOMPurify.sanitize(content, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
            ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'style', 'border', 'cellpadding', 'cellspacing', 'width', 'height'],
            ALLOW_DATA_ATTR: false,
        });
        
        const emailData = { ...params, content: sanitizedContent };
        return await orm(c).insert(email).values(emailData).returning().get();
    },

    async completeReceive(c, status, emailId) {
        return await orm(c).update(email).set({ status, isDel: status === emailConst.status.NOONE ? isDel.DELETE : isDel.NORMAL })
            .where(eq(email.emailId, emailId)).returning().get();
    },

    async delete(c, params, userId) {
        const { emailIds } = params;
        if (!emailIds) throw new BizError('Email IDs required', 400);
        const ids = String(emailIds).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length === 0) throw new BizError('No valid email IDs', 400);
        if (ids.length > 100) throw new BizError('Too many emails (max 100)', 400);
        await orm(c).update(email).set({ isDel: isDel.DELETE })
            .where(and(eq(email.userId, userId), inArray(email.emailId, ids))).run();
    },

    async read(c, params, userId) {
        const { emailIds } = params;
        if (!emailIds) return;
        const ids = String(emailIds).split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (ids.length === 0) return;
        await orm(c).update(email).set({ unread: emailConst.unread.READ })
            .where(and(eq(email.userId, userId), inArray(email.emailId, ids))).run();
    },

    async completeReceiveAll(c) {
        await c.env.db.prepare(`UPDATE email SET status = ${emailConst.status.RECEIVE}, is_del = ${isDel.NORMAL}
            WHERE status = ${emailConst.status.SAVING} AND EXISTS (SELECT 1 FROM account WHERE account_id = email.account_id AND is_del = 0)`).run();
        await c.env.db.prepare(`UPDATE email SET status = ${emailConst.status.NOONE}, is_del = ${isDel.DELETE}
            WHERE status = ${emailConst.status.SAVING} AND NOT EXISTS (SELECT 1 FROM account WHERE account_id = email.account_id AND is_del = 0)`).run();
    },

    async emailAddAtt(c, list) {
        const emailIds = list.map(item => item.emailId).filter(Boolean);
        if (emailIds.length === 0) return;
        const attList = await attService.selectByEmailIds(c, emailIds);
        list.forEach(row => {
            row.attList = attList.filter(a => a.emailId === row.emailId);
        });
    },

    async selectUserEmailCountList(c, userIds, type, del = isDel.NORMAL) {
        const result = await orm(c).select({ userId: email.userId, count: count() }).from(email)
            .where(and(inArray(email.userId, userIds), eq(email.type, type), eq(email.isDel, del)))
            .groupBy(email.userId);
        return result;
    },
    async physicsDeleteUserIds(c, userIds) {
        await orm(c).delete(email).where(inArray(email.userId, userIds)).run();
    },
    async physicsDeleteByAccountId(c, accountId) {
        await orm(c).delete(email).where(eq(email.accountId, accountId)).run();
    },
    async restoreByUserId(c, userId) {
        // restore soft-deleted emails
    },
    async updateEmailStatus(c, params) {
        // used by resend-service
    }
};

export default emailService;
