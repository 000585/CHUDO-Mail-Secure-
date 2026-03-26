import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('account', {
    accountId: integer('account_id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    name: text('name'),
    status: integer('status').notNull().default(0),
    latestEmailTime: text('latest_email_time'),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    userId: integer('user_id').notNull(),
    isDel: integer('is_del').notNull().default(0),
    allReceive: integer('all_receive').notNull().default(0),
    sort: integer('sort').notNull().default(0)
});
