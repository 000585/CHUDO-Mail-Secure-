const fileUtils = {
    MAX_SIZE: {
        ATTACHMENT: 25 * 1024 * 1024,
        EMBED: 5 * 1024 * 1024,
        TOTAL: 50 * 1024 * 1024
    },

    getExtFileName(filename) {
        try {
            const index = filename.lastIndexOf('.');
            return index !== -1 ? filename.slice(index) : '';
        } catch (e) {
            return '';
        }
    },

    async getBuffHash(buff) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buff);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    base64ToDataStr(base64) {
        return base64.split(',')[1] || base64;
    },

    base64ToUint8Array(base64) {
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
    },

    base64ToFile(base64Data, customFilename) {
        const match = base64Data.match(/^data:(image|video)\/([a-zA-Z0-9.+-]+);base64,/);
        if (!match) throw new Error('Invalid base64 data format');
        const type = match[1];
        const ext = match[2];
        const mimeType = `${type}/${ext}`;
        const cleanBase64 = base64Data.replace(/^data:(image|video)\/[a-zA-Z0-9.+-]+;base64,/, '');
        const byteCharacters = atob(cleanBase64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
            const slice = byteCharacters.slice(offset, offset + 1024);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType });
        const filename = `${customFilename || `${type}_${Date.now()}`}.${ext}`;
        return new File([blob], filename, { type: mimeType });
    },

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    isAllowedType(mimeType, allowedTypes = []) {
        if (!allowedTypes.length) return true;
        return allowedTypes.some(type => {
            if (type.includes('*')) return mimeType.startsWith(type.replace('/*', ''));
            return mimeType === type;
        });
    }
};

export default fileUtils;
