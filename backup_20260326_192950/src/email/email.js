import PostalMime from 'postal-mime';
import emailService from '../service/email-service.js';
import accountService from '../service/account-service.js';
import settingService from '../service/setting-service.js';
import attService from '../service/att-service.js';
import constant from '../const/constant.js';
import fileUtils from '../utils/file-utils.js';
import { emailConst, isDel, settingConst } from '../const/entity-const.js';
import emailUtils from '../utils/email-utils.js';
import roleService from '../service/role-service.js';
import userService from '../service/user-service.js';
import telegramService from '../service/telegram-service.js';

export async function email(message, env, ctx) {
    try {
        const {
            receive,
            tgChatId,
            tgBotStatus,
            forwardStatus,
            forwardEmail,
            ruleEmail,
            ruleType,
            r2Domain,
            noRecipient
        } = await settingService.query({ env });

        if (receive === settingConst.receive.CLOSE) {
            message.setReject('Service suspended');
            return;
        }

        const reader = message.raw.getReader();
        let content = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            content += new TextDecoder().decode(value);
        }

        const parsedEmail = await PostalMime.parse(content);
        const account = await accountService.selectByEmailIncludeDel({ env }, message.to);

        if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
            message.setReject('Recipient not found');
            return;
        }

        let userRow = {};
        if (account) {
            userRow = await userService.selectByIdIncludeDel({ env }, account.userId);
        }

        if (account && userRow.email !== env.admin) {
            let { banEmail, availDomain } = await roleService.selectByUserId({ env }, account.userId);
            if (!roleService.hasAvailDomainPerm(availDomain, message.to)) {
                message.setReject('The recipient is not authorized to use this domain.');
                return;
            }
            if (roleService.isBanEmail(banEmail, parsedEmail.from.address)) {
                message.setReject('The recipient is disabled from receiving emails.');
                return;
            }
        }

        if (!parsedEmail.to) {
            parsedEmail.to = [{ address: message.to, name: emailUtils.getName(message.to) }];
        }

        const toName = parsedEmail.to.find(item => item.address === message.to)?.name || '';

        const params = {
            toEmail: message.to,
            toName: toName,
            sendEmail: parsedEmail.from.address,
            name: parsedEmail.from.name || emailUtils.getName(parsedEmail.from.address),
            subject: parsedEmail.subject,
            content: parsedEmail.html,
            text: parsedEmail.text,
            cc: parsedEmail.cc ? JSON.stringify(parsedEmail.cc) : '[]',
            bcc: parsedEmail.bcc ? JSON.stringify(parsedEmail.bcc) : '[]',
            recipient: JSON.stringify(parsedEmail.to),
            inReplyTo: parsedEmail.inReplyTo,
            relation: parsedEmail.references,
            messageId: parsedEmail.messageId,
            userId: account ? account.userId : 0,
            accountId: account ? account.accountId : 0,
            isDel: isDel.DELETE,
            status: emailConst.status.SAVING
        };

        const attachments = [];
        const cidAttachments = [];

        for (let item of parsedEmail.attachments) {
            let attachment = { ...item };
            attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content) + fileUtils.getExtFileName(item.filename);
            attachment.size = item.content.length ?? item.content.byteLength;
            attachments.push(attachment);
            if (attachment.contentId) {
                cidAttachments.push(attachment);
            }
        }

        let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

        attachments.forEach(attachment => {
            attachment.emailId = emailRow.emailId;
            attachment.userId = emailRow.userId;
            attachment.accountId = emailRow.accountId;
        });

        try {
            if (attachments.length > 0) {
                await attService.addAtt({ env }, attachments);
            }
        } catch (e) {
            console.error('Attachment processing error:', e);
        }

        emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);

        if (ruleType === settingConst.ruleType.RULE) {
            const emails = ruleEmail.split(',');
            if (!emails.includes(message.to)) {
                return;
            }
        }

        if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
            try {
                await telegramService.sendEmailToBot({ env }, emailRow);
            } catch (e) {
                console.error('Telegram notification failed:', e);
            }
        }

        if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {
            const emails = forwardEmail.split(',');
            await Promise.allSettled(emails.map(async email => {
                try {
                    await message.forward(email);
                } catch (e) {
                    console.error(`Forward to ${email} failed:`, e);
                }
            }));
        }

    } catch (e) {
        console.error('Email receiving error: ', e);
        throw e;
    }
}
