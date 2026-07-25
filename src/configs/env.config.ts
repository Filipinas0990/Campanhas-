import 'dotenv/config';
import { z } from 'zod';

import log from '@/logs';

const envSchema = z.object({
	NODE_ENV: z.enum(['dev', 'sta', 'test', 'prod']).default('dev'),

	FASTIFY_HOST: z.coerce.string().default('127.0.0.1'),
	FASTIFY_PORT: z.coerce.number().default(3333),

	RABBITMQ_PORT1: z.coerce.number().default(5672),
	RABBITMQ_PORT2: z.coerce.number().default(15672),
	RABBITMQ_USER: z.coerce.string().default('admin'),
	RABBITMQ_PASS: z.coerce.string().default('guest'),
	RABBITMQ_URL: z.coerce.string().default('amqp://localhost'),
	RABBITMQ_QUANTITY: z.coerce.number().default(3),
	RABBITMQ_PREFETCH: z.coerce.number().default(1),

	REDIS_HOST: z.coerce.string().default('127.0.0.1'),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_PWD: z.coerce.string().default('redispassword'),
	IS_REDIS_TLS: z.string().default('false'),

	DB_HOST: z.coerce.string().default('localhost'),
	DB_USER: z.coerce.string().default('root'),
	DB_PASSWORD: z.coerce.string().default('root'),
	DB_DATABASE: z.coerce.string().default('greenchat'),
	DB_PORT: z.coerce.number().default(3333),

	API_SCHEDULE: z.coerce.string().default('http://localhost:3005'),
	API_CAMPAIGN_INIT_CHATBOT: z.coerce.string().default('http://localhost:9010'),
	CAMPAIGN_CHATBOT_API_KEY: z.coerce.string().default('devsecret'),
	SECRET_ACCESS_KEY: z.coerce.string().default('secretkey123'),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
	log.info({
		success: false,
		module: 'system',
		msg: `ENVS inválidas!`,
	});

	throw new Error('ENVS inválidas!');
}

export default _env.data;
