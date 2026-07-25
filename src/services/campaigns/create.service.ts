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
	apiContainers,
	contacts,
	scheduleMessages,
	schedulemessagesContacts,
	schedulemessagesWhatsapp,
	templateContexts,
	whatsapps,
} from '@/migrations/schemas/schema';
import cvsReader from '@/services/csvParser.service';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';
import { validateDateTimeRange } from '@/utils/validateDateTimeRange';

import { createCron } from '../schedule/createCron';
import createReportService from './createReport.service';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export interface ITemplateContext {
	id?: number;
	type: string;
	order: number;
	value: string;
	global: boolean;
	template_id: number;
	schedule_message_id: number;
}

interface IProps {
	type: string;
	title: string;
	repeat: string;
	user_id: number;
	subject: string;
	message: string;
	timezone: string;
	is_paused: boolean;
	company_id: number;
	email_color: string;
	tags: string | null;
	is_sending: boolean;
	is_running: boolean;
	whatsapp_ids: string;
	all_contacts: boolean;
	restrict_ddd: boolean;
	end_date: Date | null;
	email_template: string;
	start_date: Date | null;
	signature: string | null;
	media_type: string | null;
	media_path: string | null;
	audio_path: string | null;
	chat_bot_id: number | null;
	template_id: number | null;
	research_id: string | null;
	contacts_ids: string | null;
	cluster_name: string | null;
	csv_location: string | null;
	messaging_id: number | null;
	send_contacts: string | null;
	goodbye_message: string | null;
	greetings_message: string | null;
	csv_originalname: string | null;
	template_contexts: ITemplateContext[];
	selected_groups?: string | null;
	group_id?: number | null;
}

interface IReturn {
	status: number;
	message: string;
	datas: number[];
}

export default async function createService({
	tags,
	type,
	title,
	repeat,
	user_id,
	message,
	subject,
	end_date,
	timezone,
	is_paused,
	signature,
	start_date,
	media_type,
	company_id,
	group_id,
	is_running,
	audio_path,
	media_path,
	is_sending,
	research_id,
	template_id,
	email_color,
	chat_bot_id,
	all_contacts,
	cluster_name,
	whatsapp_ids,
	csv_location,
	contacts_ids,
	messaging_id,
	restrict_ddd,
	send_contacts,
	email_template,
	goodbye_message,
	csv_originalname,
	greetings_message,
	template_contexts,
	selected_groups,
}: IProps): Promise<IReturn> {
	try {
		log.info({
			success: true,
			module: 'services',
			msg: `Datas Ao criar campanha ${JSON.stringify(
				{
					title,
					timezone,
					start_date,
					start_date_parsed: dayjs(start_date)
						.utc()
						.tz(timezone)
						.format('YYYY-MM-DD HH:mm:ss'),
					end_date,
					end_date_parsed: dayjs(end_date)
						.utc()
						.tz(timezone)
						.format('YYYY-MM-DD HH:mm:ss'),
				},
				null,
				2,
			)}`,
		});
		const schedule_message = await db.insert(scheduleMessages).values({
			tags,
			type,
			title,
			repeat,
			subject,
			message,
			timezone,
			is_paused,
			signature,
			page: '1',
			media_path,
			company_id,
			is_running,
			audio_path,
			media_type,
			is_sending,
			email_color,
			chat_bot_id,
			research_id,
			template_id,
			cluster_name,
			all_contacts,
			send_contacts,
			email_template,
			goodbye_message,
			greetings_message,
			created_by: user_id,
			createdAt: sql`CURRENT_TIMESTAMP`,
			updatedAt: sql`CURRENT_TIMESTAMP`,
			csv_name: csv_originalname || null,
			restrict_ddd: Boolean(restrict_ddd),
			messagings_id: messaging_id || null,
			group_id: group_id || null,
			selected_groups: selected_groups || null,
			end_date: sql`${dayjs(end_date).utc().format('YYYY-MM-DD HH:mm:ss')}`,
			start_date: sql`${dayjs(start_date).utc().format('YYYY-MM-DD HH:mm:ss')}`,
		});

		log.info({
			success: true,
			module: 'services',
			text: `CreateService - Campaign saved with group_id: ${group_id}`,
		});

		if (csv_location) {
			let connection = null;

			if (type === 'whatsapp') {
				const whatsapps_ids =
					whatsapp_ids?.split(',')?.map(whatsapp => Number(whatsapp)) || [];

				if (whatsapps_ids.length > 0) {
					connection = await db
						.select({
							id: whatsapps.id,
							serialized_id: whatsapps.serializedId,
							api_container_url: apiContainers.url,
						})
						.from(whatsapps)
						.where(
							and(
								eq(whatsapps.companyId, company_id),
								inArray(whatsapps.id, whatsapps_ids),
							),
						)
						.leftJoin(
							apiContainers,
							eq(apiContainers.id, whatsapps.apiContainerId),
						);
				}

				if (!connection || connection.length === 0) {
					throw new Error('Nenhum whatsapp encontrado');
				}
			}
			const validConnection = connection?.find(
				conn => conn.serialized_id && conn.serialized_id.trim() !== '',
			);
			const connectionSerializedId = validConnection?.serialized_id || null;

			await cvsReader({
				schedule_message_id: schedule_message[0].insertId,
				awsFileUrl: csv_location,
				connection: connectionSerializedId?.split('@')[0]?.split(':')[0],
			});

			await db
				.update(scheduleMessages)
				.set({
					csv_name: csv_originalname || null,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(scheduleMessages.id, schedule_message[0].insertId));
		}

		if (template_contexts && template_contexts.length > 0) {
			const bulkInsert = template_contexts.map(context => {
				return {
					template_id: context.template_id,
					schedule_message_id: schedule_message[0].insertId,
					order: context.order,
					value: context.value,
					global: context.global,
					type: context.type,
					createdAt: sql`CURRENT_TIMESTAMP`,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				};
			});

			await db.insert(templateContexts).values(bulkInsert);
		}

		let cronExpression = '';
		const currentDate = dayjs.utc().tz(timezone);

		if (!start_date || !end_date) {
			throw new Error('Start date and end date must be provided');
		}

		const validate = validateDateTimeRange({
			startDateTime: start_date,
			endDateTime: end_date,
			timeZone: timezone,
		});

		if (validate.isWithinDateAndTimeRange) {
			const now =
				start_date === end_date
					? validate.startScheduleDateTime
					: currentDate.add(1, 'minute');
			cronExpression = `${now.minute()} ${now.hour()} ${now.date()} ${now.month() + 1} *`;
		} else {
			const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
				validate.startScheduleDateTime,
				repeat,
			);
			cronExpression = `${minute} ${hour} ${day} ${month} ${dayWeek}`;
		}

		const category = /agendamento/.test(title)
			? queueConfig.schedulers.message
			: queueConfig.schedulers.campaign;

		const { cron_job_id } = await createCron({
			category,
			schedule_expression: cronExpression,
			task_id: schedule_message[0].insertId.toString(),
			timezone,
		});

		if (!cron_job_id) {
			throw new Error('Cron job ID is undefined');
		}

		await db.insert(cronSchema).values({
			job_id: cron_job_id,
			category: queueConfig.schedulers.campaign,
			task_id: schedule_message[0].insertId.toString(),
			timezone,
			schedule_date: cronExpression,
			schedule_by: category,
		});

		const whatsapps_ids =
			whatsapp_ids?.split(',')?.map(whatsapp => Number(whatsapp)) || [];

		if (whatsapps_ids.length > 0) {
			const values = await db
				.select({ id: whatsapps.id })
				.from(whatsapps)
				.where(inArray(whatsapps.id, whatsapps_ids));

			const ids = values.map(value => value.id);

			if (ids.length) {
				await Promise.all(
					ids.map(async whatsapp_id => {
						await db.insert(schedulemessagesWhatsapp).values({
							schedule_message_id: schedule_message[0].insertId,
							whatsapp_id,
							createdAt: sql`CURRENT_TIMESTAMP`,
						});
					}),
				);
			}
		}

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
						schedule_message_id: schedule_message[0].insertId,
						contact_id: contactId,
						createdAt: sql`CURRENT_TIMESTAMP`,
					});
				});
			}
		}

		await createReportService({
			all_contacts,
			company_id,
			send_contacts,
			selected_groups,
			group_id,
			schedule_message_id: schedule_message[0].insertId,
			tags,
			type,
			category,
			restrict_ddd: Boolean(restrict_ddd),
		});

		return { status: 200, message: 'Created', datas: [] };
	} catch (error) {
		log.error(error, 'Error on create campaign service');

		return { status: 500, message: 'Internal Server error', datas: [] };
	}
}
