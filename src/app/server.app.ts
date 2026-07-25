import { app, securityApp } from '@/app';
import { serverConfig } from '@/configs';
import log from '@/logs';
import { startQueues } from '@/providers/bullmq.provider';

export default async function serverApp() {
	securityApp();

	await startQueues();

	app.listen(
		{
			port: serverConfig.port,
			host: serverConfig.host,
		},
		(error: Error | null, address: string) => {
			if (error) {
				log.error(error);
				app.log.error(error);
				process.exit(1);
			}

			log.info({
				success: true,
				module: 'system',
				msg: `Server iniciado: ${address}`,
			});
		},
	);
}
