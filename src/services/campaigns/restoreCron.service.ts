/* eslint-disable no-continue */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { eq, and, isNull } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database/db.database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import { scheduleMessages } from '@/migrations/schemas/schema';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';
import { validateDateTimeRange } from '@/utils/validateDateTimeRange';

import { createCron } from '../schedule/createCron';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

interface IProps {
	company_id?: number;
}

interface IReturn {
	status: number;
	message: string;
	datas: {
		processed: number;
		restored: number;
		errors: number;
		skipped: number;
	};
}

export default async function restoreCronService({
	company_id,
}: IProps): Promise<IReturn> {
	try {
		const scope = company_id
			? `empresa de id ${company_id}`
			: 'todas as empresas';
		log.info({
			success: true,
			module: 'services',
			msg: `Iniciando restauração de crons para ${scope}`,
		});

		const whereConditions = [
			eq(scheduleMessages.is_sending, true),
			isNull(scheduleMessages.deletedAt),
		];

		if (company_id) {
			whereConditions.push(eq(scheduleMessages.company_id, company_id));
		}

		const campaigns = await db
			.select()
			.from(scheduleMessages)
			.where(and(...whereConditions));

		if (!campaigns || campaigns.length === 0) {
			return {
				status: 200,
				message: 'Nenhuma campanha agendada encontrada para restauração',
				datas: {
					processed: 0,
					restored: 0,
					errors: 0,
					skipped: 0,
				},
			};
		}

		let processedCount = 0;
		let restoredCount = 0;
		let errorCount = 0;
		let skippedCount = 0;

		log.info({
			success: true,
			module: 'services',
			msg: `Encontradas ${campaigns.length} campanhas para verificação`,
		});

		for (const scheduleMessage of campaigns) {
			try {
				processedCount++;

				log.info({
					success: true,
					module: 'services',
					msg: `Processando campanha ${processedCount}/${campaigns.length}: ${scheduleMessage.title} (ID: ${scheduleMessage.id})`,
				});

				const now = dayjs();
				const startDate = dayjs(scheduleMessage.start_date).tz(
					scheduleMessage.timezone || 'America/Sao_Paulo',
				);

				if (startDate.isBefore(now)) {
					log.info({
						success: false,
						module: 'services',
						msg: `Campanha ${scheduleMessage.id} agendada para o passado. Pulando...`,
					});
					skippedCount++;
					continue;
				}

				if (!scheduleMessage.start_date || !scheduleMessage.end_date) {
					log.info({
						success: false,
						module: 'services',
						msg: `Campanha ${scheduleMessage.id} sem datas definidas. Pulando...`,
					});
					skippedCount++;
					continue;
				}
				let cronExpression = '';
				const currentDate = dayjs
					.utc()
					.tz(scheduleMessage.timezone || 'America/Sao_Paulo');

				const validate = validateDateTimeRange({
					startDateTime: scheduleMessage.start_date,
					endDateTime: scheduleMessage.end_date,
					timeZone: scheduleMessage.timezone || 'America/Sao_Paulo',
				});

				if (validate.isWithinDateAndTimeRange) {
					const cronNow =
						scheduleMessage.start_date === scheduleMessage.end_date
							? validate.startScheduleDateTime
							: currentDate.add(1, 'minute');
					cronExpression = `${cronNow.minute()} ${cronNow.hour()} ${cronNow.date()} ${cronNow.month() + 1} *`;
				} else {
					const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
						validate.startScheduleDateTime,
						scheduleMessage.repeat || '',
					);
					cronExpression = `${minute} ${hour} ${day} ${month} ${dayWeek}`;
				}

				const category = /agendamento/.test(scheduleMessage.title || '')
					? queueConfig.schedulers.message
					: queueConfig.schedulers.campaign;

				const { cron_job_id } = await createCron({
					category,
					schedule_expression: cronExpression,
					task_id: scheduleMessage.id.toString(),
					timezone: scheduleMessage.timezone || 'America/Sao_Paulo',
				});

				if (!cron_job_id) {
					throw new Error('Falha ao criar cron job');
				}

				await db
					.update(cronSchema)
					.set({
						job_id: cron_job_id,
						schedule_date: cronExpression,
						schedule_by: category,
						is_pending: true,
					})
					.where(eq(cronSchema.task_id, scheduleMessage.id.toString()));

				restoredCount++;
				log.info({
					success: true,
					module: 'services',
					msg: `✅ Cron restaurado para campanha ${scheduleMessage.title} (ID: ${scheduleMessage.id})`,
				});
			} catch (campaignError) {
				errorCount++;

				log.error(campaignError, 'Error processing campaign in restoreCron');
			}
		}

		const summary = {
			processed: processedCount,
			restored: restoredCount,
			errors: errorCount,
			skipped: skippedCount,
		};

		log.info({
			success: true,
			module: 'services',
			msg: `Restauração finalizada para empresa ${company_id}. Resumo: ${JSON.stringify(summary)}`,
		});

		return {
			status: 200,
			message: `Restauração finalizada: ${restoredCount}/${processedCount} crons restaurados`,
			datas: summary,
		};
	} catch (error) {
		log.error(error, 'Error on restoreCron service');
		log.info({
			success: false,
			module: 'services',
			msg: `Erro ao restaurar crons para empresa ${company_id}: ${error}`,
		});
		return {
			status: 500,
			message: 'Erro interno do servidor',
			datas: {
				processed: 0,
				restored: 0,
				errors: 1,
				skipped: 0,
			},
		};
	}
}
