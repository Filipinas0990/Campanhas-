import axios from 'axios';
import 'dayjs/locale/pt-br';
import { eq, and } from 'drizzle-orm';

import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';

import { startService } from '../campaigns';

const getCronJobByTaskId = async ({
	task_id,
}: {
	task_id: string;
	category: string;
}) => {
	try {
		const cron_job = await db
			.select()
			.from(cronSchema)
			.where(and(eq(cronSchema.task_id, task_id)));

		return { cron_job };
	} catch (error) {
		log.info({
			type: 'error',
			message: `Error on getCronJobByTaskId: ${error}`,
		});
		return { error };
	}
};

export async function runCron({
	category,
	task_id,
	contact_id,
}: {
	contact_id?: string;
	category: string;
	task_id: string;
}) {
	try {
		switch (category) {
			case 'campaign':
			case 'message':
				await startService({ id: Number(task_id) });
				break;
			case 'crm-automation':
				await axios.post(
					`${process.env.API_CRM}/crm/automation/start`,
					{
						automation_id: task_id,
						contact_id,
					},
					{
						headers: {
							secretkey: process.env.SECRET_KEY,
						},
					},
				);
				break;
			case 'sync-history-messsages':
				await axios.post(
					`${process.env.API_CAMPAIGN_INIT_CHATBOT}/connection/disablesync`,
					{
						connection_id: task_id,
					},
					{
						headers: {
							secretkey: process.env.SECRET_KEY,
						},
					},
				);
				break;
			case 'all':
				log.info({ category }, 'Running a schedule task');
				break;
			default:
				throw new Error('Invalid category');
		}

		await getCronJobByTaskId({
			task_id,
			category,
		});
	} catch (error) {
		log.error(error, 'Error on runCron');
	}
}
