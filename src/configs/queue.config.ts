import { envConfig } from '@/configs';

interface IQueue {
	redisHost: string;
	redisPort: number;
	redisPassword: string;
	tls: boolean;

	queues: {
		[key: string]: string;
	};

	schedulers: {
		[key: string]: string;
	};
}

const isRedisTls = envConfig.IS_REDIS_TLS === 'true';

const queueConfig: IQueue = {
	redisHost: envConfig.REDIS_HOST,
	redisPort: envConfig.REDIS_PORT,
	redisPassword: isRedisTls ? '' : envConfig.REDIS_PWD,
	tls: isRedisTls,

	queues: {
		campaign: 'campaign',
		message: 'message',
		report: 'report',
		cron: 'cron',
		remove: 'remove',
	},

	schedulers: {
		campaign: 'campaign',
		message: 'message',
	},
};

export default queueConfig;
