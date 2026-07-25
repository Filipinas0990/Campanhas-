import chillout from 'chillout';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { eq, and, isNull, sql, isNotNull } from 'drizzle-orm';

import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import { scheduleMessages } from '@/migrations/schemas/schema';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';

import { createCron } from './createCron';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export async function reCreateCrons() {
	try {
		const cronList = await db
			.select()
			.from(cronSchema)
			.innerJoin(scheduleMessages, eq(cronSchema.task_id, scheduleMessages.id))
			.where(
				and(
					isNotNull(scheduleMessages.send_date),
					isNull(scheduleMessages.start_date),
					isNull(scheduleMessages.end_date),
					isNull(scheduleMessages.deletedAt),
				),
			);

		if (cronList.length > 0) {
			log.info({
				message: `Recriando crons | ${cronList.length} Crons Encontrados...`,
				type: 'warn',
			});

			await chillout.forEach(cronList, async item => {
				log.info({
					message: `Recriando Agendamento ${JSON.stringify({
						company_id: item.schedule_messages.company_id,
						title: item.schedule_messages.title,
						send_date: item.schedule_messages.send_date,
						start_date: item.schedule_messages.start_date,
						end_date: item.schedule_messages.end_date,
						is_running: item.schedule_messages.is_running,
					})}`,
					type: 'warn',
				});
				const startDate = dayjs(item.schedule_messages.send_date).utc();
				const endDate = dayjs(item.schedule_messages.send_date).add(1, 'year');

				let cronExpression = '';

				const currentDate = dayjs.utc().tz(item.schedule_messages.timezone);
				log.info({ date: currentDate.format() }, 'Current date');
				if (
					(currentDate.isAfter(startDate) || currentDate.isSame(startDate)) &&
					(currentDate.isBefore(endDate) || currentDate.isSame(endDate))
				) {
					const now = currentDate.add(1, 'minute');
					cronExpression = `${now.minute()} ${now.hour()} ${now.date()} ${now.month() + 1} *`;
				} else {
					const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
						startDate,
						item.schedule_messages.repeat || 'Não repetir',
					);
					cronExpression = `${minute} ${hour} ${day} ${month} ${dayWeek}`;
				}

				const formattedStartDate = startDate.format(`YYYY-MM-DD HH:mm:ss`);

				const formattedEndDate = endDate
					.set('hour', 21)
					.set('minute', 0)
					.set('second', 0)
					.format(`YYYY-MM-DD HH:mm:ss`);

				log.info({ formattedStartDate, formattedEndDate }, 'Formatted dates');

				await db
					.update(scheduleMessages)
					.set({
						start_date: sql`${formattedStartDate}`,
						end_date: sql`${formattedEndDate}`,
						is_paused: true,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(eq(scheduleMessages.id, Number(item.cron.task_id)));

				if (item.schedule_messages.is_running) {
					const { cron_job_id } = await createCron({
						schedule_expression: cronExpression,
						task_id: item.cron.task_id,
						timezone: item.cron.timezone,
						category: item.cron.category,
					});

					if (!cron_job_id) {
						throw new Error('Cron job ID is undefined');
					}

					await db.insert(cronSchema).values({
						job_id: cron_job_id,
						category: item.cron.category,
						task_id: item.cron.task_id,
						timezone: item.cron.timezone,
						schedule_date: cronExpression,
						schedule_by: 'cron',
					});

					await db
						.delete(cronSchema)
						.where(eq(cronSchema.job_id, item.cron.job_id));
				}
			});
		}

		const schedulesWithoutCron = await db
			.select()
			.from(scheduleMessages)
			.leftJoin(cronSchema, eq(scheduleMessages.id, cronSchema.task_id))
			.where(
				and(
					isNull(cronSchema.task_id),
					isNotNull(scheduleMessages.send_date),
					isNull(scheduleMessages.start_date),
					isNull(scheduleMessages.end_date),
					isNull(scheduleMessages.deletedAt),
				),
			);

		if (schedulesWithoutCron.length > 0) {
			log.info({
				message: `Atualizando datas de agendamentos sem crons criados | ${schedulesWithoutCron.length} encontrados...`,
				type: 'warn',
			});

			await chillout.forEach(schedulesWithoutCron, async item => {
				const startDate = dayjs(item.schedule_messages.send_date)
					.utc()
					.format(`YYYY-MM-DD HH:mm:ss`);
				const endDate = dayjs(item.schedule_messages.send_date)
					.add(1, 'year')
					.set('hour', 21)
					.set('minute', 0)
					.set('second', 0)
					.format(`YYYY-MM-DD HH:mm:ss`);

				await db
					.update(scheduleMessages)
					.set({
						start_date: sql`${startDate}`,
						end_date: sql`${endDate}`,
						is_paused: true,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(eq(scheduleMessages.id, item.schedule_messages.id));
			});
		}

		if (cronList.length && schedulesWithoutCron.length) {
			log.info({
				message: 'Agendamentos finalizados!',
				type: 'info',
			});
		} else {
			log.info({
				message: 'Sem agendamentos para recriar!',
				type: 'info',
			});
		}
	} catch (error) {
		log.error(error, 'Error on reCreateCrons');
	}
}
