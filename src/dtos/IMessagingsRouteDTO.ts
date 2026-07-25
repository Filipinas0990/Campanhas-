import { FastifyRequest } from 'fastify';

export type IMessagingRouteCreateDTO = FastifyRequest<{
	Body: {
		taskId: number;
		category: string;
		scheduleBy: string;
		sheduleInterval: string;
	};
}>;

export type IMessagingRouteDeleteDTO = FastifyRequest<{
	Params: { id: number; category: string };
}>;

export type IMessagingRouteUpdateDTO = FastifyRequest<{
	Params: { id: number };
	Body: {
		category: string;
		scheduleBy: string;
		sheduleInterval: string;
	};
}>;

export type IMessagingRouteRunningDTO = FastifyRequest<{
	Params: { id: number };
	Body: {
		running: boolean;
	};
}>;
