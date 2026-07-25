import { and, eq, inArray, isNull } from 'drizzle-orm';

// import { queueConfig } from '@/configs';
import { queueConfig } from '@/configs';
import { db } from '@/database';
import log from '@/logs';
import {
	goodbyeMessage,
	greetingsMessage,
	scheduleMessages,
} from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';
import {
	formatToIntagram,
	formatToTelegramFormat,
	formatToWhatsAppFormat,
} from '@/utils';
import campaignWorker from '@/workers/campaign.worker';

import { contactTreatmentService, getConnectionsService } from './index';

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}

export default async function startService({
	id,
}: {
	id: number;
}): Promise<IReturn> {
	log.info({ campaignId: id }, 'Starting campaign service');
	try {
		const schedule_message = await db.query.scheduleMessages.findFirst({
			where: and(
				eq(scheduleMessages.id, id),
				isNull(scheduleMessages.deletedAt),
			),
			with: {
				csv_contacts: true,
				cadence: true,
				contacts: true,
				whatsapps: true,
				template_contexts: true,
			},
		});

		log.info({
			module: 'services',
			text: `Start Service - Schedule message group_id: ${schedule_message?.group_id}, type: ${typeof schedule_message?.group_id}`,
			success: true,
		});

		log.info({
			module: 'services',
			text: `Start Service - Schedule message selected_groups: ${schedule_message?.selected_groups}, type: ${typeof schedule_message?.selected_groups}`,
			success: true,
		});

		log.info({
			module: 'services',
			text: `Schedule message group_id: ${schedule_message?.group_id}`,
			success: true,
		});

		if (!schedule_message) {
			log.info({
				success: false,
				module: 'services',
				msg: 'Campanha não encontrada!',
			});

			return {
				status: 404,
				message: 'Campanha não encontrada!',
				datas: [],
			};
		}

		if (schedule_message.is_paused) {
			log.info({
				success: true,
				module: 'services',
				msg: 'Campanha está pausada!',
			});

			return {
				status: 500,
				message: 'Campanha está pausada!',
				datas: [],
			};
		}

		// Sempre começar da página 1 quando a campanha é iniciada/reiniciada
		const page = 1;

		log.info({
			type: 'info',
			message: `[INFO] startService iniciando campanha - page resetada para: ${page}, whatsapps: ${JSON.stringify(schedule_message.whatsapps)}, total: ${schedule_message.whatsapps?.length || 0}`,
		});

		const connections_ids =
			schedule_message.whatsapps?.map(item => item.whatsapp_id) || [];

		if (connections_ids.length === 0) {
			log.info({
				type: 'error',
				message: `[ERROR] startService nenhuma conexão configurada - id: ${id}`,
			});
			log.info({
				success: false,
				module: 'services',
				text: 'Nenhuma conexão configurada para esta campanha!',
			});

			return {
				status: 400,
				message: 'Nenhuma conexão configurada para esta campanha!',
				datas: [],
			};
		}

		const research_ids: number[] | null = schedule_message?.research_id
			? schedule_message?.research_id
					.split(',')
					.map(id => Number(id))
					.filter(id => !Number.isNaN(id) && id > 0)
			: null;

		let formated_message: string = schedule_message.message;

		const greeting_messages_ids = schedule_message.greetings_message
			?.split(',')
			.map(ids => Number(ids));

		const greetings_messages =
			schedule_message.greetings_message &&
			greeting_messages_ids &&
			greeting_messages_ids?.length > 0
				? await db
						.select()
						.from(greetingsMessage)
						.where(inArray(greetingsMessage.id, greeting_messages_ids))
				: null;

		const array_of_greeting_message = greetings_messages?.map(
			message => message.message,
		);

		const goodgbye_messages_ids = schedule_message.goodbye_message
			?.split(',')
			.map(ids => Number(ids));

		const goodbye_messages =
			schedule_message.goodbye_message &&
			goodgbye_messages_ids &&
			goodgbye_messages_ids?.length > 0
				? await db
						.select()
						.from(goodbyeMessage)
						.where(inArray(goodbyeMessage.id, goodgbye_messages_ids))
				: null;

		const array_of_goodbye_message = goodbye_messages?.map(
			message => message.message,
		);

		if (schedule_message.signature) {
			formated_message = `${formated_message}\n Ass: ${schedule_message.signature}`;
		}

		switch (schedule_message.type) {
			case 'instagram':
				formated_message = formatToIntagram(formated_message);
				break;
			case 'facebook':
				formated_message = formatToIntagram(formated_message);
				break;
			case 'sms':
				formated_message = formatToIntagram(formated_message);
				break;
			case 'whatsapp':
				formated_message = formatToWhatsAppFormat(formated_message);
				break;
			case 'telagram':
				formated_message = formatToTelegramFormat(formated_message);
				break;
			default:
				formated_message = formatToWhatsAppFormat(formated_message);
		}

		let limit = 5;

		const { connections } = await getConnectionsService({
			connections_ids,
			type: schedule_message.type,
		});

		if (schedule_message.type === 'whatsapp' && connections.length > 5) {
			limit = connections.length;
		}

		const category = /agendamento/.test(schedule_message.title)
			? queueConfig.schedulers.message
			: queueConfig.schedulers.campaign;

		const { destinaries } = await contactTreatmentService({
			company_id: schedule_message.company_id,
			schedule_message,
			page,
			limit,
			category,
		});

		if (
			connections.length === 0 &&
			(schedule_message.type === 'whatsapp' ||
				schedule_message.type === 'whatsapp-oficial' ||
				schedule_message.type === 'chatbot' ||
				schedule_message.type === 'instagram' ||
				schedule_message.type === 'facebook' ||
				schedule_message.type === 'telegram')
		) {
			log.info({
				success: false,
				module: 'services',
				msg: 'Conexòes da campanha não encontradas!',
			});

			return {
				status: 500,
				message: 'Conexòes da campanha não encontradas!',
				datas: [],
			};
		}

		const fromated_schedule_message = {
			id: schedule_message.id,
			company_id: schedule_message.company_id,
			research_ids,
			chat_bot_id: schedule_message.chat_bot_id,
			type: schedule_message.type,
			contacts: schedule_message.contacts,
			media_path: schedule_message.media_path,
			media_type: schedule_message.media_type,
			audio_path: schedule_message.audio_path,
			all_contacts: schedule_message.all_contacts,
			send_contacts: schedule_message.send_contacts,
			template_id: schedule_message.template_id,
			timezone: schedule_message.timezone,
			tags: schedule_message.tags,
			greeting_messages: array_of_greeting_message,
			goodbye_messages: array_of_goodbye_message,
			template_contexts: schedule_message?.template_contexts,
			csv_contacts: !!(
				schedule_message.csv_contacts &&
				schedule_message.csv_contacts.length > 0
			),
			restrict_ddd: schedule_message.restrict_ddd,
			group_id: schedule_message.group_id,
			selected_groups: schedule_message.selected_groups
				? schedule_message.selected_groups
				: null,
		};
		log.info(
			{
				message: formated_message,
				destinaries,
				research_ids,
				connections,
				schedule_message: fromated_schedule_message,
				page: page + 1,
			},
			'Adding job to campaign queue via startService',
		);

		/*
			verifica se a ja existe uma fila para esta campanha
			para evitar criar ela duas vezes
		*/
		const campaignQueueName = `Campaign_${schedule_message.id}_${schedule_message.company_id}`;
		const queueList = await bullMQ.getQueues();
		const hasQueue = queueList.some(({ name }) => name === campaignQueueName);

		log.info({ queueList, hasQueue }, 'Checking queue existence');
		if (!hasQueue) {
			bullMQ.createQueue(campaignQueueName);
			await bullMQ.processJob(campaignQueueName, campaignWorker, 1);
		}

		await bullMQ.addJobToQueue(
			campaignQueueName,
			JSON.stringify({
				message: formated_message,
				destinaries,
				research_ids,
				connections,
				schedule_message: fromated_schedule_message,
				page: page + 1,
				category,
			}),
			{
				removeOnComplete: true,
				removeOnFail: true,
				timeout: 15000,
			},
		);

		return {
			status: 200,
			message: 'Campanhas iniciada com sucesso!',
			datas: [],
		};
	} catch (error) {
		log.error(error, 'Error on start campaign');

		return {
			status: 500,
			message: 'Erro ao inciar camapnha!',
			datas: [],
		};
	}
}
