import {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

import { bullMQ } from '@/providers/bullmq.provider';

const Campaigns: FastifyPluginAsync = async (server: FastifyInstance) => {
	server.get(
		'/ping',
		{},
		async (request: FastifyRequest, reply: FastifyReply) => {
			return reply.code(200).send('Você pingou esse microserviço!');
		},
	);

	server.get(
		'/test',
		{},
		async (request: FastifyRequest, reply: FastifyReply) => {
			await bullMQ.addJobToQueue(
				'private',
				JSON.stringify({
					contacts: [1, 2, 3],
				}),
			);
			return reply.code(200).send('Você pingou esse microserviço!');
		},
	);
};

export default fp(Campaigns);
