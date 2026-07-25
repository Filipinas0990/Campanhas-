import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

import CampaignController from '@/controllers/campaigns.controller';
import {
	IFastifyRequestCreate,
	IFastifyRequestList,
} from '@/controllers/interfaces';

const Campaigns: FastifyPluginAsync = async (server: FastifyInstance) => {
	// Listar
	server.get(
		'/campaign',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.list(request, reply);
		},
	);

	// Mostrar
	server.get(
		'/campaign/:id',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.show(request, reply);
		},
	);

	// Relatório
	server.get(
		'/campaign/report/:id',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.report(request, reply);
		},
	);

	// Cadastrar
	server.post(
		'/campaign',
		{},
		async (request: IFastifyRequestCreate, reply: FastifyReply) => {
			return CampaignController.create(request, reply);
		},
	);

	// Iniciar
	// server.post(
	// 	'/campaign/start',
	// 	{},
	// 	async (request: IFastifyRequestList, reply: FastifyReply) => {
	// 		return CampaignController.startCampaing(request, reply);
	// 	},
	// );

	server.post(
		'/campaign/play',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.play(request, reply);
		},
	);

	server.post(
		'/campaign/pause',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.pause(request, reply);
		},
	);

	// Restaurar cron de campanha
	server.post(
		'/campaign/restore-cron',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.restoreCron(request, reply);
		},
	);

	// Atualizar
	server.put(
		'/campaign/edit/:id',
		{},
		async (request: IFastifyRequestCreate, reply: FastifyReply) => {
			return CampaignController.update(request, reply);
		},
	);

	// Deletar
	server.delete(
		'/campaign/delete/:id',
		{},
		async (request: IFastifyRequestList, reply: FastifyReply) => {
			return CampaignController.delete(request, reply);
		},
	);

	// // Pausar
	// server.patch(
	// 	'/campaign/pause/:id',
	// 	{},
	// 	async (request: IFastifyRequestCreate, reply: FastifyReply) => {
	// 		return CampaignController.create(request, reply);
	// 	},
	// );

	// Iniciar
};

export default fp(Campaigns);
