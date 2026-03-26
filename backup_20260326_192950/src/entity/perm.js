import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export default sqliteTable('perm', {
    permId: integer('perm_id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    permKey: text('perm_key'),
    pid: integer('pid').notNull().default(0),
    type: integer('type').notNull().default(2),
    sort: integer('sort')
});
