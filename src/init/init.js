import settingService from '../service/setting-service.js';
import emailUtils from '../utils/email-utils.js';
import { emailConst } from '../const/entity-const.js';

const dbInit = {
    async init(c) {
        const secret = c.req.param('secret');
        if (secret !== c.env.jwt_secret) {
            return c.text('❌ JWT secret mismatch');
        }

        // ИСПРАВЛЕНО: Транзакционные миграции
        await c.env.db.batch([
            // Initial tables
            `CREATE TABLE IF NOT EXISTS user (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                type INTEGER DEFAULT 1 NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                status INTEGER DEFAULT 0 NOT NULL,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                active_time DATETIME,
                is_del INTEGER DEFAULT 0 NOT NULL,
                create_ip TEXT,
                active_ip TEXT,
                os TEXT,
                browser TEXT,
                device TEXT,
                sort INTEGER DEFAULT 0 NOT NULL,
                send_count INTEGER DEFAULT 0 NOT NULL,
                reg_key_id INTEGER DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS account (
                account_id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                name TEXT,
                status INTEGER DEFAULT 0 NOT NULL,
                latest_email_time DATETIME,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER NOT NULL,
                is_del INTEGER DEFAULT 0 NOT NULL,
                all_receive INTEGER DEFAULT 0 NOT NULL,
                sort INTEGER DEFAULT 0 NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS email (
                email_id INTEGER PRIMARY KEY AUTOINCREMENT,
                send_email TEXT,
                name TEXT,
                to_email TEXT,
                to_name TEXT,
                account_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                subject TEXT,
                content TEXT,
                text TEXT,
                cc TEXT DEFAULT '[]',
                bcc TEXT DEFAULT '[]',
                recipient TEXT NOT NULL DEFAULT '[]',
                message_id TEXT NOT NULL DEFAULT '',
                in_reply_to TEXT NOT NULL DEFAULT '',
                relation TEXT NOT NULL DEFAULT '',
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_del INTEGER DEFAULT 0 NOT NULL,
                type INTEGER DEFAULT 0 NOT NULL,
                status INTEGER DEFAULT 0 NOT NULL,
                resend_email_id TEXT,
                message TEXT,
                unread INTEGER DEFAULT 0 NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS attachments (
                att_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_id INTEGER NOT NULL,
                account_id INTEGER NOT NULL,
                key TEXT NOT NULL,
                filename TEXT,
                mime_type TEXT,
                size INTEGER,
                disposition TEXT,
                related TEXT,
                content_id TEXT,
                encoding TEXT,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                status INTEGER DEFAULT 0 NOT NULL,
                type INTEGER DEFAULT 0 NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS star (
                star_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_id INTEGER NOT NULL,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS role (
                role_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                key TEXT,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                sort INTEGER DEFAULT 0,
                description TEXT,
                user_id INTEGER,
                is_default INTEGER DEFAULT 0,
                send_count INTEGER,
                send_type TEXT DEFAULT 'count' NOT NULL,
                account_count INTEGER,
                ban_email TEXT DEFAULT '',
                avail_domain TEXT DEFAULT ''
            )`,
            `CREATE TABLE IF NOT EXISTS perm (
                perm_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                perm_key TEXT,
                pid INTEGER DEFAULT 0 NOT NULL,
                type INTEGER DEFAULT 2 NOT NULL,
                sort INTEGER
            )`,
            `CREATE TABLE IF NOT EXISTS role_perm (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER,
                perm_id INTEGER
            )`,
            `CREATE TABLE IF NOT EXISTS setting (
                setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
                register INTEGER NOT NULL,
                receive INTEGER NOT NULL,
                add_email INTEGER NOT NULL,
                many_email INTEGER NOT NULL,
                title TEXT NOT NULL,
                auto_refresh INTEGER NOT NULL,
                register_verify INTEGER NOT NULL,
                add_email_verify INTEGER NOT NULL,
                resend_tokens TEXT DEFAULT '{}' NOT NULL,
                send INTEGER DEFAULT 0 NOT NULL,
                r2_domain TEXT,
                site_key TEXT,
                secret_key TEXT,
                background TEXT,
                login_opacity REAL DEFAULT 0.90 NOT NULL,
                tg_bot_token TEXT,
                tg_chat_id TEXT,
                tg_bot_status INTEGER DEFAULT 1,
                forward_status INTEGER DEFAULT 1,
                forward_email TEXT,
                rule_type INTEGER DEFAULT 0,
                rule_email TEXT,
                no_recipient INTEGER DEFAULT 0,
                custom_domain TEXT,
                bucket TEXT,
                endpoint TEXT,
                region TEXT,
                s3_access_key TEXT,
                s3_secret_key TEXT,
                force_path_style INTEGER DEFAULT 0,
                max_account_count INTEGER DEFAULT 10,
                tg_msg_to TEXT DEFAULT 'show',
                tg_msg_from TEXT DEFAULT 'show',
                tg_msg_text TEXT DEFAULT 'show'
            )`,
            `CREATE TABLE IF NOT EXISTS reg_key (
                reg_key_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                count INTEGER NOT NULL,
                used_count INTEGER DEFAULT 0 NOT NULL,
                role_id INTEGER NOT NULL,
                expire_time TEXT NOT NULL,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS oauth (
                oauth_user_id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 0 NOT NULL,
                username TEXT,
                name TEXT,
                avatar TEXT,
                active INTEGER DEFAULT 0,
                trust_level INTEGER,
                silenced INTEGER DEFAULT 0,
                platform INTEGER NOT NULL,
                create_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ]);

        // Seed default data
        await this.seedData(c);
        
        await settingService.refresh(c);
        return c.text('✅ Database initialized successfully');
    },

    async seedData(c) {
        // Default role
        const defaultRole = await c.env.db.prepare(`SELECT 1 FROM role WHERE role_id = 1`).first();
        if (!defaultRole) {
            await c.env.db.prepare(`INSERT INTO role (role_id, name, is_default, send_type, account_count) 
                VALUES (1, 'User', 1, 'ban', 10)`).run();
        }

        // Default perms
        const defaultPerms = await c.env.db.prepare(`SELECT 1 FROM perm WHERE perm_id = 1`).first();
        if (!defaultPerms) {
            await c.env.db.prepare(`INSERT INTO perm (perm_id, name, perm_key, pid, type, sort) VALUES
                (1, 'Email', NULL, 0, 0, 0),
                (2, 'Delete Email', 'email:delete', 1, 2, 1),
                (3, 'Send Email', 'email:send', 1, 2, 0),
                (4, 'Settings', '', 0, 1, 2),
                (5, 'Delete User', 'my:delete', 4, 2, 0),
                (6, 'All Users', NULL, 0, 1, 3),
                (7, 'View User', 'user:query', 6, 2, 0),
                (8, 'Change Password', 'user:set-pwd', 6, 2, 2),
                (9, 'Change Status', 'user:set-status', 6, 2, 3),
                (10, 'Change Role', 'user:set-type', 6, 2, 4),
                (11, 'Delete User', 'user:delete', 6, 2, 7),
                (12, 'Role', '', 0, 1, 5),
                (13, 'View Role', 'role:query', 12, 2, 0),
                (14, 'Change Role', 'role:set', 12, 2, 1),
                (15, 'Delete Role', 'role:delete', 12, 2, 2),
                (16, 'System Settings', '', 0, 1, 6),
                (17, 'View Settings', 'setting:query', 16, 2, 0),
                (18, 'Change Settings', 'setting:set', 16, 2, 1),
                (19, 'Email Address', '', 0, 0, 1),
                (20, 'View Email', 'account:query', 19, 2, 0),
                (21, 'Add Email', 'account:add', 19, 2, 1),
                (22, 'Delete Email', 'account:delete', 19, 2, 2),
                (23, 'Add User', 'user:add', 6, 2, 1),
                (24, 'Reset Send Count', 'user:reset-send', 6, 2, 6),
                (25, 'All Mail', '', 0, 1, 4),
                (26, 'View Email', 'all-email:query', 25, 2, 0),
                (27, 'Delete Email', 'all-email:delete', 25, 2, 0),
                (28, 'Add Role', 'role:add', 12, 2, -1)
            `).run();
        }

        // Default role-perm mappings
        const defaultRolePerms = await c.env.db.prepare(`SELECT 1 FROM role_perm WHERE id = 100`).first();
        if (!defaultRolePerms) {
            await c.env.db.prepare(`INSERT INTO role_perm (id, role_id, perm_id) VALUES
                (100, 1, 2), (101, 1, 19), (102, 1, 20), (103, 1, 21), (104, 1, 22),
                (105, 1, 4), (106, 1, 5), (107, 1, 1), (108, 1, 3)
            `).run();
        }

        // Default settings
        const defaultSettings = await c.env.db.prepare(`SELECT 1 FROM setting WHERE setting_id = 1`).first();
        if (!defaultSettings) {
            await c.env.db.prepare(`INSERT INTO setting (
                register, receive, add_email, many_email, title, auto_refresh, register_verify, add_email_verify
            ) VALUES (0, 0, 0, 0, 'CHUDO Mail Secure', 0, 1, 1)`).run();
        }
    }
};

export { dbInit };
