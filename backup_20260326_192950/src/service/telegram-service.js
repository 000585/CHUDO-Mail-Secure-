import orm from '../entity/orm.js';
import { email } from '../entity/email.js';
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils.js';
import emailMsgTemplate from '../template/email-msg.js';
import emailHtmlTemplate from '../template/email-html.js';
import emailTextTemplate from '../template/email-text.js';
import settingService from './setting-service.js';

const telegramService = {
    async getEmailContent(c, params) {
        const { token } = params;
        const result = await jwtUtils.verifyToken(c, token);
        if (!result) return emailTextTemplate('Access denied');

        const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();
        if (!emailRow) return emailTextTemplate('Email not found');

        const { r2Domain } = await settingService.query(c);
        if (emailRow.content) {
            return emailHtmlTemplate(emailRow.content, r2Domain);
        }
        return emailTextTemplate(emailRow.text || '');
    },

    async sendEmailToBot(c, emailRow) {
        const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);
        if (!tgBotToken || !tgChatId) return;

        const chatIds = tgChatId.split(',').map(id => id.trim());
        const jwtToken = await jwtUtils.generateToken(c, { emailId: emailRow.emailId }, 60 * 60 * 24 * 7);
        const webAppUrl = customDomain
            ? `${customDomain}/api/telegram/getEmail/${jwtToken}`
            : `${new URL(c.req.url).origin}/api/telegram/getEmail/${jwtToken}`;

        const messageText = emailMsgTemplate(emailRow, tgMsgTo, tgMsgFrom, tgMsgText);

        // ИСПРАВЛЕНО: Параллельная отправка вместо последовательной
        await Promise.allSettled(chatIds.map(async chatId => {
            try {
                const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        parse_mode: 'HTML',
                        text: messageText,
                        reply_markup: {
                            inline_keyboard: [[{
                                text: '📧 Open Email',
                                web_app: { url: webAppUrl }
                            }]]
                        }
                    })
                });
                if (!res.ok) console.error(`Telegram send failed: ${await res.text()}`);
            } catch (e) {
                console.error(`Telegram error: ${e.message}`);
            }
        }));
    }
};

export default telegramService;
