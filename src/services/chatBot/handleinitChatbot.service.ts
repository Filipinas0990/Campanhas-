import log from '@/logs';
import { sleep } from '@/utils';
import { IContacts } from '@/workers/interfaces';

import { IScheduleMessage } from '../baileys/interfaces';
import { registerReportService } from '../campaigns';
import { IConnections } from '../campaigns/getConnections.service';
import initChatBotService from './initChatBot.service';

export default async function handleInitChatbotService({
	chat_bot_id,
	companyId,
	destinatary,
	connections,
	schedule_message,
	template_id,
}: {
	chat_bot_id: number;
	destinatary: IContacts;
	companyId: number;
	connections: IConnections[];
	schedule_message: IScheduleMessage;
	template_id: number;
}): Promise<void> {
	const randomDelay = [
		2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000,
		14000, 15000, 16000, 17000, 18000, 19000, 20000,
	];

	const delayTime = Math.round(Math.random() * 6);
	await sleep(randomDelay[delayTime]);

	const { success, error } = await initChatBotService({
		connectionType: connections[0].type as string,
		contact: destinatary,
		connection: connections[0],
		company_id: companyId,
		chat_bot_id,
		template_id,
	});

	if (!success) {
		await registerReportService({
			contact: destinatary,
			schedule_message,
			number: 'Falha ao enviar mensagem',
			is_sended: false,
		});

		log.info({
			module: 'services',
			success: false,
			msg: `Erro ao iniciar chatbot:\n ${JSON.stringify(error, null, 2)}`,
		});
		return;
	}

	await registerReportService({
		contact: destinatary,
		schedule_message,
		number: connections[0].serialized_id?.split(':')[0] as string,
		is_sended: !!success,
	});
}
