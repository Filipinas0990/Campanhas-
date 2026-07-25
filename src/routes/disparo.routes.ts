import {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

import { envConfig, queueConfig } from '@/configs';
import log from '@/logs';
import { bullMQ } from '@/providers/bullmq.provider';
import { IDisparoPayload } from '@/services/disparo';

// Imagens em base64 deixam o corpo grande — sobe o limite só nesta rota.
const DISPARO_BODY_LIMIT = 25 * 1024 * 1024; // 25 MB

const Disparo: FastifyPluginAsync = async (server: FastifyInstance) => {
	server.post(
		'/disparo',
		{ bodyLimit: DISPARO_BODY_LIMIT },
		async (request: FastifyRequest, reply: FastifyReply) => {
			// Autenticação interna (segredo compartilhado com o PharmaFlow)
			const key = request.headers['x-internal-key'];
			if (typeof key !== 'string' || key !== envConfig.INTERNAL_API_KEY) {
				return reply.code(401).send({ message: 'não autorizado' });
			}

			const body = request.body as Partial<IDisparoPayload> | undefined;

			if (!body || typeof body.instance !== 'string' || !body.instance.trim()) {
				return reply.code(400).send({ message: 'instance é obrigatório' });
			}

			if (!Array.isArray(body.groups) || body.groups.length === 0) {
				return reply
					.code(400)
					.send({ message: 'groups é obrigatório (ao menos 1 grupo)' });
			}

			const temMensagem = !!body.message && body.message.trim().length > 0;
			const temMidia = Array.isArray(body.medias) && body.medias.length > 0;
			if (!temMensagem && !temMidia) {
				return reply.code(400).send({ message: 'informe message e/ou medias' });
			}

			try {
				await bullMQ.addJobToQueue(
					queueConfig.queues.disparo,
					JSON.stringify(body),
					{ removeOnComplete: true, removeOnFail: true },
				);

				log.info({
					module: 'system',
					success: true,
					msg: `Disparo ${body.disparoId} enfileirado (${body.groups.length} grupos, instância ${body.instance})`,
				});

				return reply.code(202).send({
					message: 'disparo enfileirado',
					disparoId: body.disparoId,
				});
			} catch (error) {
				log.info({
					module: 'system',
					success: false,
					msg: `Falha ao enfileirar disparo ${body.disparoId}`,
					error: error?.message ?? String(error),
				});

				return reply
					.code(500)
					.send({ message: 'não foi possível enfileirar o disparo' });
			}
		},
	);
};

export default fp(Disparo);
