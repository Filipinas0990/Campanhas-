import { eq, and, isNull, sql } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import { scheduleMessages } from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}
interface IProps {
	schedule_id: number;
	company_id: number;
}

export default async function pauseService({
	schedule_id,
	company_id,
}: IProps): Promise<IReturn> {
	try {
		const builded_where = [
			eq(scheduleMessages.id, schedule_id),
			eq(scheduleMessages.company_id, company_id),
			isNull(scheduleMessages.deletedAt),
		];

		const campaignQueueName = `Campaign_${schedule_id}_${company_id}`;
		await bullMQ.removeQueue(campaignQueueName);

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

		await db
			.update(scheduleMessages)
			.set({
				is_paused: true,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(and(...builded_where));

		const cronExists = await db
			.select()
			.from(cronSchema)
			.where(eq(cronSchema.task_id, schedule_message.id.toString()));

		if (cronExists.length > 0) {
			await bullMQ.removeJob(queueConfig.queues.cron, cronExists[0].job_id);
		}

		return {
			status: 200,
			message: 'Listagem de campanhas realizada com sucesso!',
			datas: [],
		};
	} catch (error) {
		log.info({
			success: false,
			module: 'services',
			msg: `Listagem de campanhas realizada com erro!`,
		});

		return {
			status: 500,
			message: 'Listagem de campanhas realizada com erro!',
			datas: [],
		};
	}
}
