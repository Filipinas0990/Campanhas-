import dayjs from 'dayjs';
import { and, between, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import { scheduleMessages, templates } from '@/migrations/schemas/schema';

interface IReturn {
	status: number;
	message: string;
	datas: {
		schedule_messages: any; // eslint-disable-line @typescript-eslint/no-explicit-any
		total: number;
	};
}

interface IProps {
	company_id: number;
	limit: number;
	offset: number;
	type:
		| 'whatsapp'
		| 'whatsapp-oficial'
		| 'instagram'
		| 'facebook'
		| 'telegram'
		| 'sms'
		| 'velip'
		| 'email'
		| undefined;
	is_running: 'true' | 'false' | undefined;
	title: string | '';
	dateStart: string | '';
	dateEnd: string | '';
}

export default async function listService({
	company_id,
	limit,
	offset,
	type,
	is_running,
	title,
	dateStart,
	dateEnd,
}: IProps): Promise<IReturn> {
	try {
		const builded_where = [
			eq(scheduleMessages.company_id, company_id),
			isNull(scheduleMessages.deletedAt),
		];

		if (title) {
			const lowerCaseTitle = `%${title.toLocaleLowerCase()}%`;
			builded_where.push(
				sql`LOWER(${scheduleMessages.title}) LIKE ${lowerCaseTitle}`,
			);
		}

		if (is_running) {
			builded_where.push(
				eq(scheduleMessages.is_running, is_running === 'true'),
			);
		}

		if (type) {
			builded_where.push(eq(scheduleMessages.type, type));
		}

		if (dateStart) {
			const formattedDateStart = dayjs(dateStart).startOf('day').toDate();
			if (dateEnd) {
				const formattedDateEnd = dayjs(dateEnd).endOf('day').toDate();
				builded_where.push(
					between(
						scheduleMessages.start_date,
						formattedDateStart,
						formattedDateEnd,
					),
				);
			} else {
				builded_where.push(
					gte(scheduleMessages.start_date, formattedDateStart),
				);
			}
		}
		const schedulesMessages = await db
			.selectDistinct({
				id: scheduleMessages.id,
				type: scheduleMessages.type,
				title: scheduleMessages.title,
				template_name: templates.name,
				repeat: scheduleMessages.repeat,
				message: scheduleMessages.message,
				end_date: scheduleMessages.end_date,
				is_paused: scheduleMessages.is_paused,
				start_date: scheduleMessages.start_date,
				is_running: scheduleMessages.is_running,
				greetings_message: scheduleMessages.greetings_message,
				goodbye_message: scheduleMessages.goodbye_message,
				group_id: scheduleMessages.group_id,
				tags: scheduleMessages.tags,
				all_contacts: scheduleMessages.all_contacts,
				selected_groups: scheduleMessages.selected_groups,
				send_contacts: scheduleMessages.send_contacts,
				timezone: scheduleMessages.timezone,
			})
			.from(scheduleMessages)
			.where(and(...builded_where))
			.leftJoin(templates, eq(templates.id, scheduleMessages.template_id))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(scheduleMessages.start_date));

		const total_schedules = await db
			.select({
				total: count(scheduleMessages.id),
			})
			.from(scheduleMessages)
			.where(and(...builded_where));

		const formattedSchedules = schedulesMessages.map(schedule => {
			// Identificar o tipo de campanha
			let campaignType = '';

			if (schedule.tags) {
				campaignType = '  → Tags';
			} else if (schedule.send_contacts) {
				campaignType = '  → Contatos específicos';
			} else if (schedule.all_contacts) {
				campaignType = '  → Todos os contatos';
			} else if (schedule.group_id === -1) {
				campaignType = '  → Todos os grupos';
			} else if (schedule.selected_groups) {
				campaignType = '  → Grupos selecionados';
			} else if (schedule.group_id && schedule.group_id !== -1) {
				campaignType = '  → Grupo específico';
			}

			const formatted = {
				...schedule,
				title: `${schedule.title}  ${campaignType}`,
				start_date: schedule.start_date
					? new Date(schedule.start_date).toISOString()
					: null,
				end_date: schedule.end_date
					? new Date(schedule.end_date).toISOString()
					: null,
			};

			return formatted;
		});

		return {
			status: 200,
			message: 'Listagem de campanhas realizada com sucesso!',
			datas: {
				schedule_messages: formattedSchedules,
				total: total_schedules[0]?.total,
			},
		};
	} catch (error) {
		log.error(error, 'Error on list campaigns service');

		return {
			status: 500,
			message: 'Listagem de campanhas realizada com erro!',
			datas: { schedule_messages: [], total: 0 },
		};
	}
}
