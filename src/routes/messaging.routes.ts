import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import { MessagingsController } from '@/controllers';
import {
	IMessagingRouteCreateDTO,
	IMessagingRouteDeleteDTO,
	IMessagingRouteRunningDTO,
	IMessagingRouteUpdateDTO,
} from '@/dtos/IMessagingsRouteDTO';

const Messaging: FastifyPluginAsync = async (server: FastifyInstance) => {
	server.post(
		'/messaging',
		{},
		async (request: IMessagingRouteCreateDTO, reply: FastifyReply) => {
			return MessagingsController.create(request, reply);
		},
	);

	server.delete(
		'/messaging/:id/:category',
		{},
		async (request: IMessagingRouteDeleteDTO, reply: FastifyReply) => {
			return MessagingsController.delete(request, reply);
		},
	);

	server.put(
		'/messaging/:id',
		{},
		async (request: IMessagingRouteUpdateDTO, reply: FastifyReply) => {
			return MessagingsController.update(request, reply);
		},
	);

	server.get(
		'/messaging/restart',
		{},
		async (request: IMessagingRouteUpdateDTO, reply: FastifyReply) => {
			return MessagingsController.restart(request, reply);
		},
	);

	server.put(
		'/messaging/running/:id',
		{},
		async (request: IMessagingRouteRunningDTO, reply: FastifyReply) => {
			return MessagingsController.running(request, reply);
		},
	);
};

export default fp(Messaging);
