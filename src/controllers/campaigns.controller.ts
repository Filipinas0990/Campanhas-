import { FastifyReply } from 'fastify';

import {
	createService,
	deleteService,
	listService,
	pauseService,
	playService,
	reportService,
	showService,
	startService,
	updateService,
	restoreCronService,
} from '@/services/campaigns';

import { IFastifyRequestCreate, IFastifyRequestList } from './interfaces';

class CampaignsController {
	async show(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;
		const { company_id } = request.query;

		const { status, datas, message } = await showService({
			id: Number(id),
			company_id: Number(company_id),
		});

		return reply.code(status).send({ datas, message });
	}

	async list(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const {
			company_id,
			limit,
			offset,
			type,
			is_running,
			title,
			dateStart,
			dateEnd,
		} = request.query;

		const { status, datas, message } = await listService({
			company_id: Number(company_id),
			limit: Number(limit),
			offset: Number(offset),
			type,
			is_running,
			title,
			dateStart,
			dateEnd,
		});

		return reply.code(status).send({ datas, message });
	}

	async report(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;
		const { company_id, page, limit: queryLimit } = request.query;

		const { status, datas, message } = await reportService({
			id: Number(id),
			company_id: Number(company_id),
			page: Number(page) || 1,
			limit: Number(queryLimit) || 100,
		});

		return reply.code(status).send({
			message,
			total_sent: datas.total_sent,
			total_pages: datas.total_pages,
			ticket_open: datas.ticket_open,
			schedule_message: datas.schedule_message,
			total_destinataries: datas.total_destinataries,
		});
	}

	async create(
		request: IFastifyRequestCreate,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const {
			tags,
			type,
			title,
			repeat,
			user_id,
			subject,
			message,
			end_date,
			timezone,
			signature,
			media_type,
			company_id,
			audio_path,
			media_path,
			start_date,
			chat_bot_id,
			template_id,
			email_color,
			research_id,
			contacts_ids,
			cluster_name,
			messaging_id,
			all_contacts,
			csv_location,
			whatsapp_ids,
			restrict_ddd,
			send_contacts,
			email_template,
			goodbye_message,
			csv_originalname,
			greetings_message,
			template_contexts,
			group_id,
			selected_groups,
		} = request.body;

		const { status, message: info } = await createService({
			tags,
			type,
			title,
			repeat,
			subject,
			user_id,
			message,
			end_date,
			timezone,
			signature,
			media_type,
			start_date,
			media_path,
			audio_path,
			template_id,
			research_id,
			email_color,
			restrict_ddd,
			all_contacts,
			messaging_id,
			cluster_name,
			contacts_ids,
			whatsapp_ids,
			csv_location,
			send_contacts,
			email_template,
			goodbye_message,
			is_paused: false,
			is_sending: true,
			csv_originalname,
			greetings_message,
			is_running: false,
			template_contexts,
			company_id: Number(company_id),
			chat_bot_id: chat_bot_id ? Number(chat_bot_id) : null,
			group_id:
				group_id !== undefined && group_id !== null ? Number(group_id) : null,
			selected_groups,
		});

		return reply.code(status).send({ message: info });
	}

	async update(
		request: IFastifyRequestCreate,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;
		const {
			tags,
			type,
			title,
			repeat,
			message,
			subject,
			timezone,
			end_date,
			signature,
			start_date,
			media_path,
			media_type,
			company_id,
			audio_path,
			template_id,
			research_id,
			email_color,
			messaging_id,
			csv_location,
			contacts_ids,
			all_contacts,
			whatsapp_ids,
			restrict_ddd,
			cluster_name,
			send_contacts,
			email_template,
			goodbye_message,
			csv_originalname,
			greetings_message,
			template_contexts,
			group_id,
			selected_groups,
		} = request.body;

		const { status, message: info } = await updateService({
			id: Number(id),
			tags,
			type,
			title,
			repeat,
			message,
			subject,
			end_date,
			timezone,
			signature,
			audio_path,
			media_type,
			media_path,
			start_date,
			template_id,
			research_id,
			email_color,
			contacts_ids,
			cluster_name,
			csv_location,
			messaging_id,
			all_contacts,
			restrict_ddd,
			whatsapp_ids,
			send_contacts,
			email_template,
			goodbye_message,
			csv_originalname,
			template_contexts,
			greetings_message,
			company_id: Number(company_id),
			selected_groups,
			group_id:
				group_id !== undefined && group_id !== null ? Number(group_id) : null,
		});

		return reply.code(status).send({ message: info });
	}

	async delete(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { id } = request.params;

		const { datas, message, status } = await deleteService({
			id: Number(id),
		});

		return reply.code(status).send({ message, datas });
	}

	async startCampaing(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { schedule_id } = request.body;

		const { datas, message, status } = await startService({
			id: Number(schedule_id),
		});

		return reply.code(status).send({ message, datas });
	}

	async pause(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { schedule_id, company_id } = request.body;

		const { datas, message, status } = await pauseService({
			schedule_id: Number(schedule_id),
			company_id: Number(company_id),
		});

		return reply.code(status).send({ message, datas });
	}

	async play(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { cron_id, user_id, schedule_id, company_id } = request.body;

		const { datas, message, status } = await playService({
			user_id,
			schedule_id: Number(schedule_id),
			company_id: Number(company_id),
			cron_id,
		});

		return reply.code(status).send({ message, datas });
	}

	async restoreCron(
		request: IFastifyRequestList,
		reply: FastifyReply,
	): Promise<FastifyReply> {
		const { company_id } = request.body;

		const { datas, message, status } = await restoreCronService({
			company_id: company_id ? Number(company_id) : undefined,
		});

		return reply.code(status).send({
			success: status === 200,
			message,
			datas,
		});
	}
}

export default new CampaignsController();
