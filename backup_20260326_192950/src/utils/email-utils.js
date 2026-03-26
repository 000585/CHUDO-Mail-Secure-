import { parseHTML } from 'linkedom';

const emailUtils = {
    getDomain(email) {
        if (typeof email !== 'string') return '';
        const parts = email.split('@');
        return parts.length === 2 ? parts[1] : '';
    },

    getName(email) {
        if (typeof email !== 'string') return '';
        const parts = email.trim().split('@');
        return parts.length === 2 ? parts[0] : '';
    },

    formatText(text) {
        if (!text) return '';
        return text
            .split('\n')
            .map(line => {
                return line.replace(/[\u200B-\u200F\uFEFF\u034F\u00A0\u3000\u00AD]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .join('\n')
            .replace(/\n{3,}/g, '\n')
            .trim();
    },

    htmlToText(content) {
        if (!content) return '';
        try {
            const wrappedContent = content.includes('<body')
                ? content
                : `<!DOCTYPE html><html><body>${content}</body></html>`;
            const { document } = parseHTML(wrappedContent);
            document.querySelectorAll('style, script, title').forEach(el => el.remove());
            let text = document.body.innerText;
            return this.formatText(text);
        } catch (e) {
            console.error(e);
            return '';
        }
    },

    getPreview(text, html, maxLength = 200) {
        const content = this.formatText(text) || this.htmlToText(html);
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength).trim() + '...';
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    normalize(email) {
        if (!email || typeof email !== 'string') return '';
        return email.toLowerCase().trim();
    }
};

export default emailUtils;
