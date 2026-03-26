const verifyUtils = {
    isEmail(str) {
        return /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(str);
    },
    isDomain(str) {
        return /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(str);
    },
    validateEmails(emails) {
        if (!Array.isArray(emails)) return false;
        return emails.every(e => this.isEmail(e));
    },
    sanitize(str, maxLength = 255) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().substring(0, maxLength).replace(/[<>]/g, '');
    },
    isValidJSON(str) {
        try { JSON.parse(str); return true; } catch { return false; }
    }
};

export default verifyUtils;
