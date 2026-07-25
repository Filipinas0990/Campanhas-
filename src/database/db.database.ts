import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { ormConfig } from '@/configs';
import * as schemas from '@/migrations/schemas/schema';

// const connection = createConnection({
// 	database: ormConfig.database,
// 	host: ormConfig.host,
// 	user: ormConfig.user,
// 	password: ormConfig.password,
// 	port: ormConfig.port,
// 	enableKeepAlive: true,
// });

const connection = mysql.createPool({
	database: ormConfig.database,
	host: ormConfig.host,
	user: ormConfig.user,
	password: ormConfig.password,
	port: ormConfig.port,
	enableKeepAlive: true,
});

export const db = drizzle(connection, {
	schema: schemas,
	mode: 'planetscale',
	logger: false,
});
