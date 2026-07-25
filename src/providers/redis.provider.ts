import Redis from 'ioredis';

import { queueConfig } from '@/configs';
import log from '@/logs';

const redisClient = new Redis({
	host: queueConfig.redisHost,
	port: queueConfig.redisPort,
	password: queueConfig.redisPassword,
	tls: queueConfig.tls ? {} : undefined,
	maxRetriesPerRequest: 3,
	enableOfflineQueue: false,
	retryStrategy(times: number): number {
		return Math.min(times * 500, 3000);
	},
});

redisClient.on('error', err => {
	log.info({
		module: 'provider',
		success: false,
		text: `[redis.provider] erro de conexão: ${err.message}`,
	});
});

export { redisClient };
