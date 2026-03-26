import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('reg_key', {
    regKeyId: integer('reg_key_id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    count: integer('count').notNull(),
    usedCount: integer('used_count').notNull().default(0),
    roleId: integer('role_id').notNull(),
    expireTime: text('expire_time').notNull(),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    userId: integer('user_id').notNull()
});
