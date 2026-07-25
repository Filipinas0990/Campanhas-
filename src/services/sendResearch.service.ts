import chillout from 'chillout';
import dayjs from 'dayjs';
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/database';
import log from '@/logs';
import {
	researchs as researchsDb,
	tickets,
	researchsHistoric,
	historicTickets,
} from '@/migrations/schemas/schema';
import { BaileysInstance } from '@/services/baileys';
import { FacebookInstance } from '@/services/facebook';
import { InstagramInstance } from '@/services/instagram';
import { formatToIntagram } from '@/utils';

interface IConnections {
	id: number;
	name: string;
	insta_id?: string | null;
	wab_token?: string | null;
	meta_token?: string | null;
	meta_page_id?: string | null;
	serialized_id?: string | null;
	wab_business_id?: string | null;
	api_container_url?: string | null;
	wab_business_number: string | null;
	wab_business_phonenumber_id?: string | null;
}

interface IContact {
	id: number;
	name: string | null;
	email?: string | null;
	number: string | null;
	meta_id?: string | null;
	schedule_message_id?: number;
	telegram_chat_id?: string | null;
}

interface IProps {
	type: string;
	index: number;
	contact: IContact;
	company_id: number;
	research_ids: number[];
	connections: IConnections[];
	baileysInstance?: BaileysInstance;
	facebookInstance?: FacebookInstance;
	instagramInstance?: InstagramInstance;
}

interface IReturn {
	success: boolean;
	ticketOpen?: boolean;
}

export default async function sendResearch({
	type,
	index,
	contact,
	company_id,
	connections,
	research_ids,
	baileysInstance,
	facebookInstance,
	instagramInstance,
}: IProps): Promise<IReturn> {
	try {
		const existentTicket = await db.query.tickets.findFirst({
			where: and(eq(tickets.contact_id, contact.id), ne(tickets.status_id, 3)),
		});

		if (existentTicket && existentTicket.id) {
			return {
				success: true,
				ticketOpen: true,
			};
		}

		const historics: number[] = [];

		const connection = connections[index % connections.length];

		const researchs = await db.query.researchs.findMany({
			where: and(
				inArray(researchsDb.id, research_ids),
				isNull(researchsDb.deletedAt),
			),
			with: {
				answers: true,
			},
		});

		if (type === 'telegram' || type === 'whatspp-ofical') {
			return { success: false };
		}

		const ticket = await db.insert(tickets).values({
			type,
			serialized_id:
				type !== 'instagram' && type !== 'telegram' && type !== 'facebook'
					? connection.serialized_id
					: null,
			status_id: 7,
			company_id,
			contact_id: contact.id,
			connection_id: connection.id,
			insta_id: connection.insta_id,
			wab_ticket: false,
			attendant_user_id: null,
			closed_by_user_id: null,
			pinned: null,
			queue_id: null,
			createdAt: sql`CURRENT_DATE`,
		});

		const historic_ticket = await db.insert(historicTickets).values({
			ticket_id: ticket[0].insertId,
			user_id: null,
			status_id_init: 7,
			status_id_end: 7,
			createdAt: sql`CURRENT_DATE`,
		});

		await db
			.update(tickets)
			.set({
				id_historic_ticket: historic_ticket[0].insertId,
			})
			.where(eq(tickets.id, ticket[0].insertId));

		await chillout.forEach(researchs, async research => {
			const researchHistoric = await db.insert(researchsHistoric).values({
				ticket_id: ticket[0].insertId,
				research_id: research.id,
				status: 'pending',
				company_id,
				user_id: null,
				active: true,
				answer_id: null,
				createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
				updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
			});

			historics.push(researchHistoric[0].insertId);
		});

		const question_text = formatToIntagram(researchs[0].name as string);

		const first_research = researchs[0];

		let text_options = '';

		first_research.answers
			.map(answer => {
				return {
					rating: answer.rating,
					msg: answer.name,
				};
			})
			.forEach(answer => {
				text_options += `${answer.rating} - ${formatToIntagram(answer.text)}\n`;
			});

		const message = `${question_text}\n${text_options.trim()}`;

		switch (type) {
			case 'instagram':
				await instagramInstance?.sendTextMessage({
					meta_id: contact.meta_id as string,
					message,
				});
				break;
			case 'facebook':
				await facebookInstance?.sendTextMessage({
					meta_id: contact.meta_id as string,
					message,
				});
				break;
			case 'telegram':
				log.info({
					success: true,
					module: 'services',
					msg: 'Telegram não implementado',
				});
				break;
			case 'whatsapp':
				await baileysInstance?.sendMessage({
					type: 'text',
					contact: contact.number as string,
					payload: {
						api: false,
						msg: message,
					},
				});

				break;
			default:
				log.info({
					success: false,
					module: 'services',
					msg: `Tipo de pesquisa desconhecido: ${type}`,
				});
				break;
		}

		await db
			.update(researchsHistoric)
			.set({
				status: 'sent',
			})
			.where(eq(researchsHistoric.id, historics[0]));

		const historic_ticket_2 = await db.insert(historicTickets).values({
			ticket_id: ticket[0].insertId,
			user_id: null,
			status_id_init: 7,
			status_id_end: 7,
			createdAt: sql`CURRENT_DATE`,
		});

		await db
			.update(tickets)
			.set({
				id_historic_ticket: historic_ticket_2[0].insertId,
				status_id: 7,
			})
			.where(eq(tickets.id, ticket[0].insertId));

		return { success: true };
	} catch (error) {
		log.error(error, 'Error on sendResearch service');

		return { success: false };
	}
}
