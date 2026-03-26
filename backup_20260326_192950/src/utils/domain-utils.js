const domainUtils = {
    toOssDomain(domain) {
        if (!domain) return null;
        let result = domain.trim();
        if (!result.startsWith('http')) result = 'https://' + result;
        if (result.endsWith('/')) result = result.slice(0, -1);
        return result;
    },

    getOrigin(url) {
        try { return new URL(url).origin; } catch { return ''; }
    },

    isAllowedDomain(domain, allowedList) {
        if (!Array.isArray(allowedList) || allowedList.length === 0) return true;
        const normalized = domain.toLowerCase().trim();
        return allowedList.some(d => normalized === d.toLowerCase().trim());
    }
};

export default domainUtils;
