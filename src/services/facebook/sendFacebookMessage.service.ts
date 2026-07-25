import log from '@/logs';
import { registerReportService } from '@/services/campaigns';
import sendResearch from '@/services/sendResearch.service';

import FacebookInstance from './facebookInstance';

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
	research_ids: number[];
	type: string;
	timezone: string;
	csv_contacts: boolean;
	media_path?: string | null;
	media_type?: string | null;
}

interface IContact {
	id: number;
	name: string | null;
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
	research_ids: number[] | null;
	company_id: number;
	index: number;
	schedule_message: IScheduleMessage;
}

export default async function sendFacebookMessage({
	message,
	connections,
	contact,
	research_ids,
	company_id,
	index,
	schedule_message,
}: IProps) {
	try {
		if (!contact.meta_id) {
			return;
		}

		const connection = connections[index % connections.length];

		const facebookInstance = new FacebookInstance({
			meta_page_id: connection.meta_page_id,
			meta_token: connection.meta_token,
		});

		if (research_ids && research_ids.length > 0) {
			const { success } = await sendResearch({
				contact,
				company_id,
				connections,
				index,
				research_ids,
				type: 'facebook',
				facebookInstance,
			});

			await registerReportService({
				contact,
				schedule_message,
				number: connection.name,
				is_sended: !!success,
			});
			return;
		}

		const { success } = await facebookInstance.sendTextMessage({
			meta_id: contact.meta_id as string,
			message,
		});

		if (schedule_message.media_path && schedule_message.media_type) {
			await facebookInstance.sendMediaMessage({
				meta_id: contact.meta_id,
				message,
				media: {
					media_url: schedule_message.media_path,
					mimetype: schedule_message.media_type,
				},
			});
		}

		await registerReportService({
			contact,
			schedule_message,
			number: connection.name,
			is_sended: !!success,
		});
	} catch (error) {
		await registerReportService({
			contact,
			schedule_message,
			number: 'Falha ao enviar mensagem',
			is_sended: false,
		});

		log.info({
			module: 'services',
			msg: `Erro ao formatar o texto.${error}`,
			success: false,
		});
	}
}
