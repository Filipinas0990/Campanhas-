import fastify, { FastifyInstance, FastifyPluginAsync } from 'fastify';

import { routes } from '@/routes';

export default function apiApp(): FastifyInstance {
	const app = fastify();

	routes.forEach((route: FastifyPluginAsync) => {
		app.register(route);
	});

	return app;
}
