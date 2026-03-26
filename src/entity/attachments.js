import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('attachments', {
    attId: integer('att_id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(),
    emailId: integer('email_id').notNull(),
    accountId: integer('account_id').notNull(),
    key: text('key').notNull(),
    filename: text('filename'),
    mimeType: text('mime_type'),
    size: integer('size'),
    disposition: text('disposition'),
    related: text('related'),
    contentId: text('content_id'),
    encoding: text('encoding'),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    status: integer('status').notNull().default(0),
    type: integer('type').notNull().default(0)
});
