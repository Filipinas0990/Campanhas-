import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { app } from '@/app';
import { corsConfig } from '@/configs';

export default function securityApp() {
	app.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				objectSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:'],
			},
		},
	});

	app.register(cors, {
		origin: corsConfig.origin,
		methods: corsConfig.methods,
		credentials: corsConfig.credentials,
		allowedHeaders: corsConfig.allowedHeaders,
	});
}
