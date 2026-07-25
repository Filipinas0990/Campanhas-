import axios from 'axios';
import { and, eq, isNull } from 'drizzle-orm';

import { envConfig } from '@/configs';
import { db } from '@/database';
import log from '@/logs';
import { templates } from '@/migrations/schemas/schema';
import { registerReportService } from '@/services/campaigns';

import {
	ApiOficialInstace,
	generateTemplateComponets,
	getMetaTemplate,
} from '.';
import { ITemplateContext } from '../campaigns/create.service';
import { generateTemplateContexts } from './generateTemplateContexts';

interface IConnections {
	id: number;
	name: string;
	serialized_id?: string | null;
	api_container_url?: string | null;
	meta_token?: string | null;
	meta_page_id?: string | null;
	insta_id?: string | null;
	wab_token?: string | null;
	wab_business_phonenumber_id?: string | null;
	wab_business_id?: string | null;
	wab_business_number: string | null;
}

interface IScheduleMessage {
	id: number;
	company_id: number;
	timezone: string;
	research_ids: number[];
	type: string;
	csv_contacts: boolean;
	media_path?: string | null;
	media_type?: string | null;
	template_id?: number | null;
	template_contexts: ITemplateContext[];
}

interface IContact {
	id: number;
	name: string | null;
	last_name: string | null;
	number: string | null;
	meta_id?: string | null;
	telegram_chat_id?: string | null;
	email?: string | null;
	schedule_message_id?: number;
}

interface IProps {
	message: string;
	connections: IConnections[];
	contact: IContact;
	index: number;
	schedule_message: IScheduleMessage;
}

export default async function sendApiOficialService({
	index,
	contact,
	connections,
	schedule_message,
}: IProps) {
	let connection: IConnections | undefined;
	let template:
		| {
				name: string;
				language?: string | null;
		  }
		| null
		| undefined;
	let metaTemplateUrl: string | null = null;

	try {
		log.info({
			module: 'services',
			success: true,
			text: `[sendApiOficial] Iniciando envio para contato: ${contact.number}, template_id: ${schedule_message.template_id}`,
		});

		if (!schedule_message.template_id) {
			log.info({
				module: 'services',
				success: false,
				text: '[sendApiOficial] template_id ausente, abortando',
			});
			return;
		}

		connection = connections[index % connections.length];

		const apiOficialInstace = new ApiOficialInstace({
			phone_number_id: connection.wab_business_phonenumber_id as string,
			wab_token: connection.wab_token as string,
		});

		template = await db.query.templates.findFirst({
			where: and(
				eq(templates.id, schedule_message.template_id),
				isNull(templates.deletedAt),
			),
		});

		if (!template) {
			log.info({
				module: 'services',
				msg: 'Erro on sendApiOficialService  Template não encontrado!',
				success: false,
			});

			return;
		}

		metaTemplateUrl = `https://graph.facebook.com/v20.0/${connection.wab_business_id}/message_templates?limit=20&name=${encodeURIComponent(template.name)}`;

		const findTemplate = await getMetaTemplate({
			wab_business_id: connection.wab_business_id as string,
			wab_token: connection.wab_token as string,
			template_name: template.name,
			template_language: template.language,
		});

		if (!findTemplate) {
			log.info({
				module: 'services',
				msg: 'Erro on sendApiOficialService  Template não encontrado!',
				success: false,
			});
			await registerReportService({
				schedule_message,
				contact,
				number: 'Template não encontrado na Meta',
				is_sended: false,
			});
			return;
		}

		let contexts: string[] = [];
		// generate contexts

		if (
			schedule_message?.template_contexts &&
			schedule_message?.template_contexts?.length > 0
		) {
			contexts = await generateTemplateContexts({
				company_id: schedule_message.company_id,
				template_contexts: schedule_message.template_contexts,
				contact,
			});
		}

		const components = await generateTemplateComponets({
			components: findTemplate?.components,
			contact_name: contact?.name as string,
			wab_token: connection.wab_token as string,
			phone_number_id: connection.wab_business_phonenumber_id as string,
			contexts,
		});
		const formated_template = {
			type: 'template',
			preview_url: false,
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: contact.number as string,
			template: {
				name: findTemplate.name,
				language: { code: findTemplate?.language },
				components,
			},
		};

		const serializedId = contact.number;
		const whatsappId = connection.wab_business_phonenumber_id as string;
		const message = {
			payload: {
				companyId: schedule_message.company_id,
			},
			...formated_template,
		};

		axios
			.post(
				`${envConfig.API_CAMPAIGN_INIT_CHATBOT}/connection/campaign-cache`,
				{
					message,
					whatsappId,
					serializedId,
				},
				{
					headers: {
						'Content-Type': 'application/json',
						secretkey: envConfig.SECRET_ACCESS_KEY,
					},
				},
			)
			.catch(error => {
				log.info({
					module: 'services',
					msg: `Erro ao enviar para campaign-cache: ${error.message}`,
					success: false,
				});
			});

		log.info({
			module: 'services',
			success: true,
			text: `[sendApiOficial] Enviando template "${findTemplate.name}" para ${contact.number}`,
		});

		const { success } = await apiOficialInstace.sendTemplate({
			template: formated_template,
		});

		log.info({
			module: 'services',
			success: !!success,
			text: `[sendApiOficial] Resultado do envio para ${contact.number}: ${success ? 'SUCESSO' : 'FALHA'}`,
		});

		await registerReportService({
			schedule_message,
			contact,
			number: success
				? (connection.wab_business_number as string)
				: 'Falha ao enviar mensagem',
			is_sended: !!success,
		});
	} catch (error) {
		const axiosError = axios.isAxiosError(error) ? error : null;
		await registerReportService({
			schedule_message,
			contact,
			number: 'Falha ao enviar mensagem',
			is_sended: false,
		});
		log.error(
			{
				err: error,
				context: {
					contact_id: contact.id,
					contact_number: contact.number,
					schedule_message_id: schedule_message.id,
					template_id: schedule_message.template_id,
					connection_index: index % connections.length,
					connection_id: connection?.id,
					connection_name: connection?.name,
					wab_business_id: connection?.wab_business_id,
					wab_business_phonenumber_id: connection?.wab_business_phonenumber_id,
				},
				meta_request: {
					template_name: template?.name,
					template_language: template?.language,
					url: metaTemplateUrl,
				},
				meta_response: axiosError
					? {
							status: axiosError.response?.status,
							data: axiosError.response?.data,
							headers: axiosError.response?.headers,
						}
					: null,
			},
			'Error on sendApiOficialService',
		);
	}
}
