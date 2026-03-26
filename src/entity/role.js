import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('role', {
    roleId: integer('role_id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    key: text('key'),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    sort: integer('sort').default(0),
    description: text('description'),
    userId: integer('user_id'),
    isDefault: integer('is_default').default(0),
    sendCount: integer('send_count'),
    sendType: text('send_type').notNull().default('count'),
    accountCount: integer('account_count'),
    banEmail: text('ban_email').default(''),
    availDomain: text('avail_domain').default('')
});
