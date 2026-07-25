/* eslint-disable import-helpers/order-imports */
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { eq, and, isNull, sql } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import { scheduleMessages } from '@/migrations/schemas/schema';
import 'dayjs/locale/pt-br';
import { bullMQ } from '@/providers/bullmq.provider';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';

import { validateDateTimeRange } from '@/utils/validateDateTimeRange';
import { createCron } from '../schedule/createCron';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}

interface IProps {
	user_id: number;
	schedule_id: number;
	company_id: number;
	cron_id: number;
}

export default async function playService({
	schedule_id,
	company_id,
}: IProps): Promise<IReturn> {
	try {
		const builded_where = [
			eq(scheduleMessages.company_id, company_id),
			eq(scheduleMessages.id, schedule_id),
			isNull(scheduleMessages.deletedAt),
		];
		const schedule_message = await db.query.scheduleMessages.findFirst({
			columns: {
				id: true,
				title: true,
				start_date: true,
				end_date: true,
				timezone: true,
				repeat: true,
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

		let cronExpression = '';

		const currentDate = dayjs.utc().tz(schedule_message.timezone);

		if (!schedule_message.start_date || !schedule_message.end_date) {
			return {
				status: 400,
				message: 'Datas de início e fim são obrigatórias!',
				datas: [],
			};
		}

		const validate = validateDateTimeRange({
			startDateTime: schedule_message.start_date,
			endDateTime: schedule_message.end_date,
			timeZone: schedule_message.timezone,
		});

		if (validate.isWithinDateAndTimeRange) {
			const now =
				schedule_message.start_date === schedule_message.end_date
					? validate.startScheduleDateTime
					: currentDate.add(1, 'minute');
			cronExpression = `${now.minute()} ${now.hour()} ${now.date()} ${now.month() + 1} *`;
		} else {
			const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
				validate.startScheduleDateTime,
				schedule_message.repeat || '',
			);
			cronExpression = `${minute} ${hour} ${day} ${month} ${dayWeek}`;
		}

		const cronExists = await db
			.select()
			.from(cronSchema)
			.where(eq(cronSchema.task_id, schedule_message.id.toString()));

		if (cronExists) {
			await bullMQ.removeJob(queueConfig.queues.cron, cronExists[0].job_id);
		}

		const category = /agendamento/.test(schedule_message.title)
			? queueConfig.schedulers.message
			: queueConfig.schedulers.campaign;

		const { cron_job_id } = await createCron({
			category,
			task_id: schedule_message.id.toString(),
			schedule_expression: cronExpression,
			timezone: schedule_message.timezone,
		});

		await db
			.update(cronSchema)
			.set({
				job_id: cron_job_id,
				schedule_date: cronExpression,
				updated_at: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(cronSchema.task_id, schedule_message.id.toString()));

		await db
			.update(scheduleMessages)
			.set({
				is_paused: false,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			})
			.where(and(...builded_where));

		return {
			status: 200,
			message: 'Camapnha agendada com sucesso!',
			datas: [],
		};
	} catch (error) {
		log.info({
			success: false,
			module: 'services',
			msg: `Erro ao resumir camapnha! ${error}`,
		});

		return {
			status: 500,
			message: 'Erro ao resumir camapnha',
			datas: [],
		};
	}
}
