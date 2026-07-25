import { sql } from 'drizzle-orm';
import {
	boolean,
	date,
	int,
	mysqlTable,
	varchar,
} from 'drizzle-orm/mysql-core';

export const cronSchema = mysqlTable('cron', {
	id: int('id').primaryKey().autoincrement(),
	job_id: varchar('job_id', { length: 256 }).notNull(),
	category: varchar('category', { length: 256 }).notNull(),
	task_id: varchar('task_id', { length: 256 }).notNull(),
	is_pending: boolean('is_pending').notNull().default(true),
	timezone: varchar('timezone', { length: 256 }).notNull(),
	schedule_date: varchar('schedule_date', { length: 256 }).notNull(),
	schedule_by: varchar('schedule_by', { length: 256 }).notNull(),
	created_at: date('created_at').default(sql`CURRENT_TIMESTAMP`),
	updated_at: date('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const scriptSchema = mysqlTable('run_script', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 256 }).notNull(),
	run: boolean('run').notNull().default(false),
	created_at: date('created_at').default(sql`CURRENT_TIMESTAMP`),
	updated_at: date('updated_at').default(sql`CURRENT_TIMESTAMP`),
	deleted_at: date('deleted_at'),
});
