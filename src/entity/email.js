import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const email = sqliteTable('email', {
    emailId: integer('email_id').primaryKey({ autoIncrement: true }),
    sendEmail: text('send_email'),
    name: text('name'),
    toEmail: text('to_email'),
    toName: text('to_name'),
    accountId: integer('account_id').notNull(),
    userId: integer('user_id').notNull(),
    subject: text('subject'),
    content: text('content'),
    text: text('text'),
    cc: text('cc').default('[]'),
    bcc: text('bcc').default('[]'),
    recipient: text('recipient').notNull().default('[]'),
    messageId: text('message_id').notNull().default(''),
    inReplyTo: text('in_reply_to').notNull().default(''),
    relation: text('relation').notNull().default(''),
    createTime: text('create_time').default('CURRENT_TIMESTAMP'),
    isDel: integer('is_del').notNull().default(0),
    type: integer('type').notNull().default(0),
    status: integer('status').notNull().default(0),
    resendEmailId: text('resend_email_id'),
    message: text('message'),
    unread: integer('unread').notNull().default(0)
});
