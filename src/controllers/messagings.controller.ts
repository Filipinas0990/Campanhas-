import { FastifyReply } from 'fastify';

import {
	IMessagingRouteCreateDTO,
	IMessagingRouteDeleteDTO,
	IMessagingRouteRunningDTO,
	IMessagingRouteUpdateDTO,
} from '@/dtos/IMessagingsRouteDTO';
import {
	createMessagingService,
	deleteMessagingService,
	restartMessagingService,
	updateMessagingService,
} from '@/services/messagings';
import runningMessagingService from '@/services/messagings/runningMessaging.service';

class CampaignsController {
	async create(
		request: IMessagingRouteCreateDTO,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { taskId, category, scheduleBy, sheduleInterval } = request.body;

		const { status, message } = await createMessagingService({
			taskId,
			category,
			scheduleBy,
			sheduleInterval,
		});

		return reply.code(status).send({ message });
	}

	async delete(
		request: IMessagingRouteDeleteDTO,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id, category } = request.params;

		const { status, message } = await deleteMessagingService({
			taskId: id,
			category,
		});

		return reply.code(status).send({ message });
	}

	async update(
		request: IMessagingRouteUpdateDTO,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;
		const { category, scheduleBy, sheduleInterval } = request.body;

		const { status, message } = await updateMessagingService({
			taskId: id,
			category,
			scheduleBy,
			sheduleInterval,
		});

		return reply.code(status).send({ message });
	}

	async restart(_, reply: FastifyReply): Promise<FastifyReply> {
		const { status, message } = await restartMessagingService();

		return reply.code(status).send({ message });
	}

	async running(
		request: IMessagingRouteRunningDTO,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;
		const { running } = request.body;

		const { status, message } = await runningMessagingService({
			id,
			running,
		});

		return reply.code(status).send({ message });
	}
}

export default new CampaignsController();
