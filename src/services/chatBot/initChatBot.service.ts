import axios from 'axios';

import { envConfig } from '@/configs';
import log from '@/logs';
import { IContacts } from '@/workers/interfaces';

import { IConnections } from '../campaigns/getConnections.service';

interface IReturn {
	success: boolean;
	error: Error | null;
}

export default async function initChatBotService({
	connectionType,
	connection,
	company_id,
	contact,
	chat_bot_id,
	template_id,
}: {
	connectionType: string;
	company_id: number;
	connection: IConnections;
	contact: IContacts;
	chat_bot_id: number;
	template_id: number;
}): Promise<IReturn> {
	try {
		const { data } = await axios.post(
			`${envConfig.API_CAMPAIGN_INIT_CHATBOT}/campaignchatbot/init`,
			{
				connection,
				contact,
				company_id,
				connectionType,
				chat_bot_id,
				template_id,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'campaign-chatbot-api-key': envConfig.CAMPAIGN_CHATBOT_API_KEY,
				},
			},
		);

		log.info(
			{
				connectionType,
				connection,
				company_id,
				contact,
				chat_bot_id,
				template_id,
				data,
			},
			'Initializing chat bot service',
		);

		return { success: data.success, error: null };
	} catch (error) {
		return { success: false, error };
	}
}
