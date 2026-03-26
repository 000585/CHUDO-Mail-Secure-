import { scryptAsync } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';

const CRYPTO_CONFIG = {
    SCRYPT_N: 32768,
    SCRYPT_R: 8,
    SCRYPT_P: 1,
    SALT_LENGTH: 32,
    KEY_LENGTH: 32,
};

const saltHashUtils = {
    generateSalt() {
        return randomBytes(CRYPTO_CONFIG.SALT_LENGTH);
    },

    async hashPassword(password) {
        const salt = this.generateSalt();
        const passwordBuffer = new TextEncoder().encode(password);
        
        const hash = await scryptAsync(
            passwordBuffer,
            salt,
            {
                N: CRYPTO_CONFIG.SCRYPT_N,
                r: CRYPTO_CONFIG.SCRYPT_R,
                p: CRYPTO_CONFIG.SCRYPT_P,
                dkLen: CRYPTO_CONFIG.KEY_LENGTH
            }
        );
        
        return {
            salt: this.bufferToBase64(salt),
            hash: this.bufferToBase64(hash)
        };
    },

    async genHashPassword(password, saltBase64) {
        const salt = this.base64ToBuffer(saltBase64);
        const passwordBuffer = new TextEncoder().encode(password);
        
        const hash = await scryptAsync(
            passwordBuffer,
            salt,
            {
                N: CRYPTO_CONFIG.SCRYPT_N,
                r: CRYPTO_CONFIG.SCRYPT_R,
                p: CRYPTO_CONFIG.SCRYPT_P,
                dkLen: CRYPTO_CONFIG.KEY_LENGTH
            }
        );
        
        return this.bufferToBase64(hash);
    },

    async verifyPassword(inputPassword, saltBase64, storedHashBase64) {
        const computedHash = await this.genHashPassword(inputPassword, saltBase64);
        return this.timingSafeEqual(storedHashBase64, computedHash);
    },

    timingSafeEqual(a, b) {
        if (a.length !== b.length) return false;
        
        const aBuf = new TextEncoder().encode(a);
        const bBuf = new TextEncoder().encode(b);
        
        let result = 0;
        for (let i = 0; i < aBuf.length; i++) {
            result |= aBuf[i] ^ bBuf[i];
        }
        return result === 0;
    },

    genRandomPwd(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const bytes = randomBytes(length);
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(bytes[i] % chars.length);
        }
        return result;
    },

    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    base64ToBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
};

export default saltHashUtils;
