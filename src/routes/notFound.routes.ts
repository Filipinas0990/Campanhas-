import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

const NotFound = async (server: FastifyInstance) => {
	server.setNotFoundHandler((_: FastifyRequest, reply: FastifyReply) => {
		return reply
			.code(404)
			.type('application/json')
			.send({ message: 'Rota não encontrada no servidor!' });
	});
};

export default fp(NotFound);
