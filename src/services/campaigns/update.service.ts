import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database/db.database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import {
	contacts,
	scheduleMessageCsv,
	scheduleMessages,
	schedulemessagesContacts,
	schedulemessagesSendMessages,
	schedulemessagesWhatsapp,
	templateContexts,
	whatsapps,
} from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';
import cvsReader from '@/services/csvParser.service';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';
import { validateDateTimeRange } from '@/utils/validateDateTimeRange';

import { createCron } from '../schedule/createCron';
import { ITemplateContext } from './create.service';
import createReportService from './createReport.service';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

interface IProps {
	id: number;
	title: string;
	message: string;
	send_contacts: string | null;
	contacts_ids: string | null;
	whatsapp_ids: string;
	tags: string | null;
	greetings_message: string | null;
	goodbye_message: string | null;
	repeat: string;
	research_id: string | null;
	signature: string | null;
	template_id: number | null;
	type: string;
	subject: string;
	email_color: string;
	email_template: string;
	all_contacts: boolean;
	cluster_name: string | null;
	company_id: number;
	media_path: string | null;
	media_type: string | null;
	audio_path: string | null;
	start_date: Date | null;
	end_date: Date | null;
	csv_originalname: string | null;
	csv_location: string | null;
	timezone: string;
	messaging_id: number | null;
	template_contexts: ITemplateContext[];
	restrict_ddd: boolean;
	selected_groups?: string | null;
	group_id?: number | null;
}

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}

export default async function updateService({
	id,
	company_id,
	repeat,
	research_id,
	signature,
	subject,
	tags,
	template_id,
	title,
	type,
	email_color,
	email_template,
	goodbye_message,
	greetings_message,
	message,
	send_contacts,
	media_path,
	media_type,
	all_contacts,
	audio_path,
	cluster_name,
	start_date,
	end_date,
	whatsapp_ids,
	contacts_ids,
	csv_originalname,
	csv_location,
	messaging_id,
	timezone,
	template_contexts,
	restrict_ddd,
	selected_groups,
	group_id,
}: IProps): Promise<IReturn> {
	try {
		log.info({
			success: true,
			module: 'services',
			msg: `Datas Ao atualizar campanha ${JSON.stringify(
				{
					title,
					id,
					timezone,
					start_date,
					start_date_parsed: start_date,
					end_date,
					end_date_parsed: end_date,
				},
				null,
				2,
			)}`,
		});

		const campaignQueueName = `Campaign_${id}_${company_id}`;
		await bullMQ.clearQueue(campaignQueueName);

		const schedule_message = await db
			.select({
				id: scheduleMessages.id,
				media_path: scheduleMessages.media_path,
				audio_path: scheduleMessages.audio_path,
				media_type: scheduleMessages.media_type,
				tags: scheduleMessages.tags,
				send_contacts: scheduleMessages.send_contacts,
				all_contacts: scheduleMessages.all_contacts,
				csv_name: scheduleMessages.csv_name,
				restrict_ddd: scheduleMessages.restrict_ddd,
			})
			.from(scheduleMessages)
			.where(eq(scheduleMessages.id, id));

		if (!schedule_message || schedule_message.length === 0) {
			return { status: 404, message: 'Not Found', datas: [] };
		}

		const oldSm = schedule_message[0];
		const isCsvCampaign = oldSm.csv_name != null;

		const currentWhatsappConnections = await db
			.select({ whatsapp_id: schedulemessagesWhatsapp.whatsapp_id })
			.from(schedulemessagesWhatsapp)
			.innerJoin(
				whatsapps,
				eq(whatsapps.id, schedulemessagesWhatsapp.whatsapp_id),
			)
			.where(
				and(
					eq(schedulemessagesWhatsapp.schedule_message_id, id),
					eq(whatsapps.companyId, company_id),
				),
			);

		const currentWhatsappIds = currentWhatsappConnections
			.map(conn => conn.whatsapp_id)
			.sort((a, b) => a - b);
		const newWhatsappIds =
			whatsapp_ids
				?.split(',')
				.map(id => Number(id))
				.filter(id => !Number.isNaN(id))
				.sort((a, b) => a - b) || [];

		const whatsapps_ids = newWhatsappIds;
		if (
			whatsapps_ids.length > 0 &&
			JSON.stringify(currentWhatsappIds) !== JSON.stringify(newWhatsappIds)
		) {
			await db
				.delete(schedulemessagesWhatsapp)
				.where(eq(schedulemessagesWhatsapp.schedule_message_id, id));

			const values = await db
				.select({ id: whatsapps.id })
				.from(whatsapps)
				.where(inArray(whatsapps.id, whatsapps_ids));

			const ids = values.map(value => value.id);

			if (ids.length) {
				ids.map(async whatsapp_id => {
					await db.insert(schedulemessagesWhatsapp).values({
						schedule_message_id: schedule_message[0].id,
						whatsapp_id,
						createdAt: sql`CURRENT_TIMESTAMP`,
					});
				});
			}

			log.info({
				module: 'services',
				text: `WhatsApp connections updated for campaign ${id}: from ${currentWhatsappIds.length} to ${newWhatsappIds.length} connections`,
				success: true,
			});
		} else if (whatsapps_ids.length === 0 && currentWhatsappIds.length > 0) {
			log.info({
				module: 'services',
				text: `Preserving existing WhatsApp connections for campaign ${id}: ${currentWhatsappIds.length} connections unchanged`,
				success: true,
			});
		}

		await db
			.delete(schedulemessagesContacts)
			.where(eq(schedulemessagesContacts.schedule_message_id, id));

		const myContacts =
			contacts_ids?.split(',')?.map(contact => Number(contact)) || [];

		if (myContacts.length > 0) {
			const values = await db
				.select({ id: contacts.id })
				.from(contacts)
				.where(inArray(contacts.id, myContacts));

			const ids = values.map(value => value.id);

			if (ids.length) {
				ids.map(async contactId => {
					await db.insert(schedulemessagesContacts).values({
						schedule_message_id: schedule_message[0].id,
						contact_id: contactId,
						createdAt: sql`CURRENT_TIMESTAMP`,
					});
				});
			}
		}

		if (template_contexts && template_contexts.length > 0) {
			await db
				.delete(templateContexts)
				.where(eq(templateContexts.schedule_message_id, id));

			const bulkInsert = template_contexts.map(context => {
				return {
					template_id: context.template_id,
					schedule_message_id: id,
					order: context.order,
					value: context.value,
					type: context.type,
					global: context.global,
					createdAt: sql`CURRENT_TIMESTAMP`,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				};
			});

			await db.insert(templateContexts).values(bulkInsert);
		}

		const validate = validateDateTimeRange({
			startDateTime: start_date,
			endDateTime: end_date,
			timeZone: timezone,
		});

		let cronExpression = '';
		const currentDate = dayjs.utc().tz(timezone);

		if (!start_date || !end_date) {
			throw new Error('Start date and end date must be provided');
		}

		if (validate.isWithinDateAndTimeRange) {
			const now =
				start_date === end_date
					? validate.startScheduleDateTime
					: currentDate.add(1, 'minute');
			if (dayjs(start_date).isSame(end_date)) {
				const uniqueJobId = `unique:${id}:${now.valueOf()}`;
				await bullMQ.add(
					queueConfig.queues.cron,
					{
						task_id: id.toString(),
						type: 'campaign',
						timezone,
					},
					{
						jobId: uniqueJobId,
						delay: Math.max(0, now.diff(currentDate, 'ms')),
					},
				);
				log.info({
					success: true,
					module: 'services',
					text: `Job único criado para campanha ${id} em ${now.format()}`,
				});
				cronExpression = `0 ${now.minute()} ${now.hour()} ${now.date()} ${now.month() + 1} *`;
			} else {
				cronExpression = `${now.minute()} ${now.hour()} ${now.date()} ${now.month() + 1} *`;
			}
		} else {
			const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
				validate.startScheduleDateTime,
				repeat,
			);
			cronExpression = `${minute} ${hour} ${day} ${month} ${dayWeek}`;
		}

		const cronExists = await db
			.select()
			.from(cronSchema)
			.where(eq(cronSchema.task_id, id.toString()));

		if (cronExists.length > 0) {
			log.info(
				`Cron existente removido! ${JSON.stringify({ schedule_id: id, title })}`,
			);

			await bullMQ.removeJob(queueConfig.queues.cron, cronExists[0].job_id);
		}

		const category = /agendamento/.test(title)
			? queueConfig.schedulers.message
			: queueConfig.schedulers.campaign;

		const { cron_job_id } = await createCron({
			category,
			schedule_expression: cronExpression,
			task_id: id.toString(),
			timezone,
		});

		await db
			.update(cronSchema)
			.set({
				job_id: cron_job_id,
				schedule_date: cronExpression,
				is_pending: true,
				updated_at: sql`CURRENT_TIMESTAMP`,
			})
			.where(eq(cronSchema.task_id, id.toString()));

		const removeCsv = Boolean(all_contacts || tags || send_contacts);

		await db
			.update(scheduleMessages)
			.set({
				title,
				message,
				signature: signature || null,
				start_date: sql`${dayjs(start_date).utc().format('YYYY-MM-DD HH:mm:ss')}`,
				end_date: sql`${dayjs(end_date).utc().format('YYYY-MM-DD HH:mm:ss')}`,
				repeat,
				research_id: research_id && research_id.length > 0 ? research_id : null,
				tags: tags && tags.length > 0 ? tags : null,
				send_contacts,
				template_id,
				all_contacts,
				cluster_name,
				company_id,
				csv_name: removeCsv
					? null
					: csv_originalname || schedule_message[0].csv_name,
				subject,
				email_color,
				email_template,
				goodbye_message,
				greetings_message,
				is_paused: false,
				timezone,
				is_sending: false,
				is_running:
					validate.isWithinDateAndTimeRange &&
					dayjs(start_date).isSame(end_date),
				media_path,
				media_type: media_path && media_type,
				audio_path,
				page: '1',
				messagings_id: messaging_id || null,
				updatedAt: sql`CURRENT_TIMESTAMP`,
				restrict_ddd: Boolean(restrict_ddd),
				group_id: group_id || null,
				selected_groups: selected_groups || null,
			})
			.where(eq(scheduleMessages.id, schedule_message[0].id));

		if (csv_location) {
			log.info({
				module: 'services',
				text: `Re-processando CSV em update para campanha ${id}: location ${csv_location}, originalname ${csv_originalname}`,
				success: true,
			});

			try {
				await cvsReader({
					schedule_message_id: id,
					awsFileUrl: csv_location,
				});

				const csvCount = await db
					.select({ count: sql`COUNT(*)` })
					.from(scheduleMessageCsv)
					.where(eq(scheduleMessageCsv.schedule_message_id, id));

				const updatedCount = csvCount[0].count;

				log.info({
					module: 'services',
					text: `cvsReader em update: ${updatedCount} registros para campanha ${id}`,
					success: true,
				});

				await db
					.update(scheduleMessages)
					.set({
						csv_name: csv_originalname || null,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(eq(scheduleMessages.id, id));

				log.info({
					module: 'services',
					text: `CSV name setado em update para campanha ${id}`,
					success: true,
				});

				await createReportService({
					schedule_message_id: id,
					tags,
					send_contacts,
					all_contacts,
					company_id,
					type,
					category,
					restrict_ddd: Boolean(restrict_ddd),
					selected_groups,
					group_id,
				});
			} catch (error) {
				log.info({
					module: 'services',
					text: `Erro ao re-processar CSV em update para campanha ${id}: ${error.message}`,
					success: false,
				});

				await db
					.update(scheduleMessages)
					.set({
						csv_name: csv_originalname || null,
						updatedAt: sql`CURRENT_TIMESTAMP`,
					})
					.where(eq(scheduleMessages.id, id));

				log.info({
					module: 'services',
					text: `CSV name setado mesmo com erro em update para campanha ${id}`,
					success: true,
				});

				await createReportService({
					schedule_message_id: id,
					tags,
					send_contacts,
					all_contacts,
					company_id,
					type,
					category,
					restrict_ddd: Boolean(restrict_ddd),
					selected_groups,
					group_id,
				});
			}
		} else {
			const normalizedTags = tags === '' ? null : tags;
			const hasContactChange =
				send_contacts !== oldSm.send_contacts ||
				normalizedTags !== oldSm.tags ||
				all_contacts !== oldSm.all_contacts ||
				Boolean(restrict_ddd) !== oldSm.restrict_ddd;

			if (hasContactChange) {
				if (isCsvCampaign) {
					log.info({
						module: 'services',
						text: `Atualizando campanha CSV ${id}: Preservando scheduleMessageCsv, deletando apenas sendMessages devido a mudança em contatos`,
						success: true,
					});
					await db
						.delete(schedulemessagesSendMessages)
						.where(eq(schedulemessagesSendMessages.schedule_message_id, id));
				} else {
					await db
						.delete(scheduleMessageCsv)
						.where(eq(scheduleMessageCsv.schedule_message_id, id));
					await db
						.delete(schedulemessagesSendMessages)
						.where(eq(schedulemessagesSendMessages.schedule_message_id, id));
				}

				await createReportService({
					schedule_message_id: id,
					tags: normalizedTags,
					send_contacts,
					all_contacts,
					company_id,
					type,
					category,
					restrict_ddd: Boolean(restrict_ddd),
					selected_groups,
					group_id,
				});
			} else {
				await db
					.update(schedulemessagesSendMessages)
					.set({ number: '-', is_sended: false, sended_date: null })
					.where(eq(schedulemessagesSendMessages.schedule_message_id, id));

				if (isCsvCampaign) {
					log.info({
						module: 'services',
						text: `Atualizando campanha CSV ${id}: Repopulando relatório de contatos existentes`,
						success: true,
					});
					await createReportService({
						schedule_message_id: id,
						tags: normalizedTags,
						send_contacts,
						all_contacts,
						company_id,
						type,
						category,
						restrict_ddd: Boolean(restrict_ddd),
						selected_groups,
						group_id,
					});
				}
			}
		}

		log.info({
			success: true,
			module: 'services',
			msg: `Schedule message ${id} updated`,
		});

		return { status: 200, message: 'Created', datas: [] };
	} catch (error) {
		log.error(error, 'Error on update campaign service');
		return { status: 500, message: 'Internal Server error', datas: [] };
	}
}
