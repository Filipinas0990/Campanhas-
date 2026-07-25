import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { queueConfig } from '@/configs';
import log from '@/logs';
import { bullMQ } from '@/providers/bullmq.provider';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export async function createCron({
	category,
	schedule_expression,
	task_id,
	timezone,
	contact_id,
	startDate,
	endDate,
}: {
	category: string;
	schedule_expression: string;
	task_id: string;
	timezone: string;
	contact_id?: number;
	startDate?: Date;
	endDate?: Date;
}) {
	try {
		const jobId = await bullMQ.addJobToQueue(
			queueConfig.queues.cron,
			{
				category,
				task_id,
				contact_id,
			},
			{
				repeat: {
					pattern: schedule_expression,
					tz: timezone,
					startDate: startDate || new Date(),
					endDate,
				},
				removeOnComplete: 10,
				removeOnFail: 5,
			},
		);

		if (!jobId) {
			bullMQ.removeJob(queueConfig.queues.cron, jobId);
			throw new Error('Error on create cron job');
		}

		return {
			cron_job_id: jobId,
			cron_expression: schedule_expression,
		};
	} catch (error) {
		log.error(error, 'Error on createCron service');
		return { error };
	}
}
