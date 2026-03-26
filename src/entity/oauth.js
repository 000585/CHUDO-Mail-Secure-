import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const oauth = sqliteTable('oauth', {
    oauthUserId: text('oauth_user_id').primaryKey(),
    userId: integer('user_id').notNull().default(0),
    username: text('username'),
    name: text('name'),
    avatar: text('avatar'),
    active: integer('active').default(0),
    trustLevel: integer('trust_level'),
    silenced: integer('silenced').default(0),
    platform: integer('platform').notNull(),
    createTime: text('create_time').default('CURRENT_TIMESTAMP')
});
