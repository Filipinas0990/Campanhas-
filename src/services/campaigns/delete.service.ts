import { eq, and, isNull } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import {
	scheduleMessages,
	scheduleMessageCsv,
	schedulemessagesWhatsapp,
	schedulemessagesContacts,
	schedulemessagesSendMessages,
} from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}

interface IProps {
	id: number;
}

export default async function deleteService({ id }: IProps): Promise<IReturn> {
	try {
		log.info({ campaignId: id }, 'Deleting campaign');
		const builded_where = [
			eq(scheduleMessages.id, id),
			isNull(scheduleMessages.deletedAt),
		];

		const schedule_message = await db.query.scheduleMessages.findFirst({
			columns: {
				id: true,
			},
			where: and(...builded_where),
		});

		if (!schedule_message) {
			return {
				status: 404,
				message: 'Campanha não encontrada!',
				datas: [],
			};
		}

		const cronExists = await db
			.select()
			.from(cronSchema)
			.where(eq(cronSchema.task_id, schedule_message.id.toString()));

		if (cronExists.length > 0) {
			await bullMQ.removeJob(queueConfig.queues.cron, cronExists[0].job_id);
		}

		await db
			.delete(cronSchema)
			.where(and(eq(cronSchema.task_id, schedule_message.id.toString())));

		await db
			.update(scheduleMessageCsv)
			.set({ deletedAt: new Date() })
			.where(eq(scheduleMessageCsv.schedule_message_id, id));

		await db
			.update(schedulemessagesWhatsapp)
			.set({ deletedAt: new Date() })
			.where(eq(schedulemessagesWhatsapp.schedule_message_id, id));

		await db
			.update(schedulemessagesContacts)
			.set({ deletedAt: new Date() })
			.where(eq(schedulemessagesContacts.schedule_message_id, id));
		await db
			.update(schedulemessagesSendMessages)
			.set({ deletedAt: new Date() })
			.where(eq(schedulemessagesSendMessages.schedule_message_id, id));

		await db
			.update(scheduleMessages)
			.set({ deletedAt: new Date() })
			.where(eq(scheduleMessages.id, id));

		return {
			status: 200,
			message: 'Campanha deletada com sucesso!',
			datas: [],
		};
	} catch (error) {
		log.error(error, 'Error on delete campaign service');

		return {
			status: 500,
			message: 'Erro ao deletar campanha!',
			datas: [],
		};
	}
}
