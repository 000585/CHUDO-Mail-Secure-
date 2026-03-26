import emailUtils from '../utils/email-utils.js';

export default function emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText) {
    let template = `<b>${escapeHtml(email.subject)}</b>`;

    if (tgMsgFrom === 'only-name') {
        template += `\n\nFrom: ${escapeHtml(email.name)}`;
    }
    if (tgMsgFrom === 'show') {
        template += `\n\nFrom: ${escapeHtml(email.name)} &lt;${escapeHtml(email.sendEmail)}&gt;`;
    }
    if (tgMsgTo === 'show') {
        template += `\nTo: ${escapeHtml(email.toEmail)}`;
    }

    const text = (emailUtils.formatText(email.text) || emailUtils.htmlToText(email.content))
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    if (tgMsgText === 'show') {
        template += `\n\n${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`;
    }
    return template;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
