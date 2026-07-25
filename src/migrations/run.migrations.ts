import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createConnection } from 'mysql2';

import { ormConfig } from '@/configs';
import log from '@/logs';
import * as schemas from '@/migrations/schemas/schema';

export default async function run() {
	const connection = createConnection({
		database: ormConfig.database,
		host: ormConfig.host,
		user: ormConfig.user,
		password: ormConfig.password,
		port: ormConfig.port,
	});

	const db = drizzle(connection, { schema: schemas, mode: 'planetscale' });

	await migrate(db, { migrationsFolder: './src/migrations/schemas' });

	log.info({
		module: 'system',
		success: true,
		msg: 'Migration rodada com sucesso!',
	});

	connection.end();

	process.exit(0);
}

run().catch(error => {
	log.info({
		module: 'system',
		success: false,
		msg: 'Ocorreu um erro ao rodar a migration!',
		error,
	});

	process.exit(1);
});
