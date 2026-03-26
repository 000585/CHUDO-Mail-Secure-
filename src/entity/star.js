import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export default sqliteTable('star', {
    starId: integer('star_id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(),
    emailId: integer('email_id').notNull(),
    createTime: text('create_time').default('CURRENT_TIMESTAMP')
});
