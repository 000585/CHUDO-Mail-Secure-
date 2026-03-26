import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('user', {
    userId: integer('user_id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    type: integer('type').notNull().default(1),
    password: text('password').notNull(),
    salt: text('salt').notNull(),
    status: integer('status').notNull().default(0),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    activeTime: text('active_time'),
    isDel: integer('is_del').notNull().default(0),
    createIp: text('create_ip'),
    activeIp: text('active_ip'),
    os: text('os'),
    browser: text('browser'),
    device: text('device'),
    sort: integer('sort').notNull().default(0),
    sendCount: integer('send_count').notNull().default(0),
    regKeyId: integer('reg_key_id').default(0)
});
