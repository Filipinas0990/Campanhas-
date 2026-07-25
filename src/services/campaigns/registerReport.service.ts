import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { and, eq } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import { schedulemessagesSendMessages } from '@/migrations/schemas/schema';

dayjs.extend(utc);
dayjs.extend(timezone);

interface IScheduleMessage {
	id: number;
	type: string;
	timezone: string;
	company_id: number;
	research_ids: number[];
	csv_contacts: boolean;
	group_id?: number | null;
	selected_groups?: string | null;
}

interface IContact {
	id: number;
	name: string | null;
	number: string | null;
}

interface IProps {
	contact: IContact;
	is_sended: boolean;
	ticketOpen?: boolean | undefined;
	schedule_message: IScheduleMessage;
	number: string | null;
}

export default async function registerReportService({
	contact,
	ticketOpen,
	schedule_message,
	is_sended = false,
}: IProps) {
	try {
		const commonSet = {
			is_sended,
			ticket_open: ticketOpen || false,
			sended_date: dayjs()
				.tz(schedule_message.timezone)
				.format('YYYY-MM-DD HH:mm:ss'),
		};

		const isGroup = contact.number?.endsWith('@g.us');
		let whereClause;

		if (isGroup) {
			whereClause = and(
				eq(
					schedulemessagesSendMessages.schedule_message_id,
					schedule_message.id,
				),
				eq(schedulemessagesSendMessages.csv_id, contact.id),
			);
		} else {
			whereClause = and(
				eq(
					schedulemessagesSendMessages.schedule_message_id,
					schedule_message.id,
				),
				eq(schedulemessagesSendMessages.contact_id, contact.id),
			);
		}

		let result = await db
			.update(schedulemessagesSendMessages)
			.set(commonSet)
			.where(whereClause);

		if (!isGroup && result[0]?.affectedRows === 0) {
			whereClause = and(
				eq(
					schedulemessagesSendMessages.schedule_message_id,
					schedule_message.id,
				),
				eq(schedulemessagesSendMessages.csv_id, contact.id),
			);

			result = await db
				.update(schedulemessagesSendMessages)
				.set(commonSet)
				.where(whereClause);
		}
	} catch (error) {
		log.info({
			module: 'services',
			msg: `Error on register report ${error}`,
			success: false,
		});
	}
}
