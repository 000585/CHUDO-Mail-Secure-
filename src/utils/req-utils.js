import { UAParser } from 'ua-parser-js';

const reqUtils = {
    getIp(c) {
        return c.req.header('CF-Connecting-IP') ||
            c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
            'Unknown';
    },

    getCountry(c) {
        return c.req.header('CF-IPCountry') || 'Unknown';
    },

    getUserAgent(c) {
        const ua = c.req.header('user-agent') || '';
        const parser = new UAParser(ua);
        const { browser, device, os } = parser.getResult();
        let browserInfo = browser.name ? browser.name + ' ' + browser.version : '';
        let osInfo = os.name ? os.name + os.version : '';
        let deviceInfo = 'Desktop';
        if (device.vendor || device.model) {
            const vendor = device.vendor || '';
            const model = device.model || '';
            const type = device.type || '';
            const namePart = [vendor, model].filter(Boolean).join(' ');
            const typePart = type ? ` (${type})` : '';
            deviceInfo = (namePart + typePart).trim();
        }
        return { browser: browserInfo, device: deviceInfo, os: osInfo };
    },

    getRequestInfo(c) {
        const ua = c.req.header('user-agent') || '';
        const { browser, os, device } = this.getUserAgent(c);
        return {
            ip: this.getIp(c),
            country: this.getCountry(c),
            browser, os, device,
            ua: ua.substring(0, 500)
        };
    }
};

export default reqUtils;
