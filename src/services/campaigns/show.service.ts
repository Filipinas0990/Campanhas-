import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import {
	contacts,
	scheduleMessages,
	schedulemessagesContacts,
	schedulemessagesWhatsapp,
	templateContexts,
} from '@/migrations/schemas/schema';

interface IScheduleMessage {
	id: number;
	title: string;
	message: string;
	send_date: string;
	type: string;
	is_running: boolean;
	is_paused: boolean;
	repeat: string | null;
	send_contacts: { value: number; label: string }[];
	research_id: string | null;
	tags: string | null;
	goodbye_message: number[] | undefined;
	greetings_message: number[] | undefined;
	audio_path: string | null;
	media_path: string | null;
	csv_name: string | null;
	template_id: number | null;
	all_contacts: boolean;
	whatsapps: { whatsappId: number }[];
	cadence: [
		{
			id: number;
			interval: number;
			message: string;
			media_path: string | null;
			media: { nanme: string }[];
		}[],
	];
	whatsapp_ids: number[];
	contacts_ids: number[];
	group_id: number | null;
	selected_groups: string | null;
}
interface IReturn {
	status: number;
	message: string;
	datas: {
		schedule_message: IScheduleMessage | [];
	};
}
interface IProps {
	company_id: number;
	id: number;
}
export default async function showService({
	company_id,
	id,
}: IProps): Promise<IReturn> {
	try {
		const builded_where = [
			eq(scheduleMessages.company_id, company_id),
			eq(scheduleMessages.id, id),
			isNull(scheduleMessages.deletedAt),
		];

		const schedules_message = await db.query.scheduleMessages.findFirst({
			columns: {
				id: true,
				title: true,
				message: true,
				start_date: true,
				end_date: true,
				type: true,
				is_running: true,
				is_paused: true,
				repeat: true,
				send_contacts: true,
				research_id: true,
				tags: true,
				goodbye_message: true,
				greetings_message: true,
				audio_path: true,
				media_path: true,
				csv_name: true,
				template_id: true,
				all_contacts: true,
				messagings_id: true,
				timezone: true,
				chat_bot_id: true,
				restrict_ddd: true,
				group_id: true,
				selected_groups: true,
			},
			with: {
				template_contexts: {
					columns: {
						id: true,
						order: true,
						schedule_message_id: true,
						global: true,
						template_id: true,
						value: true,
					},
					where: isNull(templateContexts.deletedAt),
				},
				whatsapps: {
					columns: { whatsapp_id: true },
					where: isNull(schedulemessagesWhatsapp.deletedAt),
				},
				contacts: {
					columns: { contact_id: true },
					where: isNull(schedulemessagesContacts.deletedAt),
				},
			},
			where: and(...builded_where),
		});

		if (!schedules_message) {
			return {
				status: 404,
				message: 'Campanha não encontrada!',
				datas: { schedule_message: [] },
			};
		}

		const contacts_id_to_send = schedules_message.send_contacts
			?.split(',')
			.map(item => Number(item));

		let send_contacts: { label: string; value: number }[] = [];

		if (contacts_id_to_send) {
			send_contacts = await db
				.select({
					value: contacts.id,
					label: contacts.name,
				})
				.from(contacts)
				.where(inArray(contacts.id, contacts_id_to_send));
		}

		const formatted_schedule_message = {
			...schedules_message,
			goodbye_message: schedules_message.goodbye_message
				?.split(',')
				.map(item => Number(item)),
			greetings_message: schedules_message.greetings_message
				?.split(',')
				.map(item => Number(item)),
			send_contacts,
			tags: schedules_message.tags
				?.split(',')
				.map(item => Number(item))
				.filter(value => value),
			research_id: schedules_message.research_id
				?.split(',')
				.map(item => Number(item))
				.filter(value => value),
			whatsapp_ids: schedules_message.whatsapps?.map(item => item.whatsapp_id),
			contacts_ids: schedules_message.contacts?.map(item => item.contact_id),
			group_id: schedules_message.group_id,
			selected_groups: schedules_message.selected_groups,
		};

		return {
			status: 200,
			message: 'Listagem de campanhas realizada com sucesso!',
			datas: {
				schedule_message:
					formatted_schedule_message as unknown as IScheduleMessage,
			},
		};
	} catch (error) {
		log.info({
			success: false,
			module: 'services',
			msg: `Erro ao buscar campanha ${error}!`,
		});

		return {
			status: 500,
			message: 'Listagem de campanhas realizada com erro!',
			datas: { schedule_message: [] },
		};
	}
}
