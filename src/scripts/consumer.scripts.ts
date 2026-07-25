import { exec } from 'child_process';

import log from '@/logs';

export default function consumerScript(): void {
	exec('pm2 restart campaign-greenchat-consumer');

	log.info({
		module: 'consume',
		success: true,
		msg: 'PM2 do consumer reiniciado!',
	});
}
