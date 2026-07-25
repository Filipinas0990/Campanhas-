import { inArray, eq, and, isNull } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import {
	apiContainers,
	bots,
	botsWhatsapps,
	whatsapps,
} from '@/migrations/schemas/schema';

interface IProps {
	connections_ids: number[];
	type: string;
}

export interface IConnections {
	id: number;
	name: string;
	serialized_id?: string | null;
	api_container_url?: string | null;
	meta_token?: string | null;
	meta_page_id?: string | null;
	isnta_id?: string | null;
	wab_token?: string | null;
	wab_business_phonenumber_id?: string | null;
	wab_business_id?: string | null;
	wab_business_number?: string | null;
	botsWhatsapps_id?: number | null;
	bot_id?: number | null;
	type?: string | null;
	questions_id?: number | null;
	questions_test?: string | null;
	questions_type?: string | null;
}

interface IReturn {
	connections: IConnections[];
}

export default async function getConnectionsService({
	connections_ids,
	type,
}: IProps): Promise<IReturn> {
	try {
		let connections: IConnections[] = [];

		switch (type) {
			case 'chatbot':
				connections = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						serialized_id: whatsapps.serializedId,
						api_container_url: apiContainers.url,
						botsWhatsapps_id: botsWhatsapps.id,
						bot_id: bots.id,
						type: whatsapps.type,
						meta_token: whatsapps.meta_token,
						meta_page_id: whatsapps.meta_page_id,
						insta_id: whatsapps.instaId,
						wab_token: whatsapps.wabToken,
						wab_business_phonenumber_id: whatsapps.wabBusinessPhonenumberId,
						wab_business_id: whatsapps.wab_business_id,
						wab_business_number: whatsapps.wab_business_number,
					})
					.from(whatsapps)
					.leftJoin(
						apiContainers,
						eq(apiContainers.id, whatsapps.apiContainerId),
					)
					.innerJoin(botsWhatsapps, eq(botsWhatsapps.whatsappId, whatsapps.id))
					.innerJoin(bots, eq(bots.id, botsWhatsapps.botId))
					.where(
						and(
							inArray(whatsapps.id, connections_ids),
							eq(bots.active, 1),
							isNull(bots.deletedAt),
							isNull(whatsapps.deletedAt),
							isNull(botsWhatsapps.deletedAt),
							isNull(apiContainers.deletedAt),
						),
					);

				return { connections };
			case 'whatsapp':
				connections = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						serialized_id: whatsapps.serializedId,
						api_container_url: apiContainers.url,
					})
					.from(whatsapps)
					.leftJoin(
						apiContainers,
						eq(apiContainers.id, whatsapps.apiContainerId),
					)
					.where(
						and(
							eq(whatsapps.type, 'baileys'),
							inArray(whatsapps.id, connections_ids),
						),
					);

				return { connections };

			case 'instagram':
				connections = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						meta_token: whatsapps.meta_token,
						meta_page_id: whatsapps.meta_page_id,
						insta_id: whatsapps.instaId,
					})
					.from(whatsapps)
					.where(
						and(
							eq(whatsapps.type, 'instagram'),
							inArray(whatsapps.id, connections_ids),
						),
					);

				return { connections };

			case 'facebook':
				connections = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						meta_token: whatsapps.meta_token,
						meta_page_id: whatsapps.meta_page_id,
						insta_id: whatsapps.instaId,
					})
					.from(whatsapps)
					.where(
						and(
							eq(whatsapps.type, 'facebook'),
							inArray(whatsapps.id, connections_ids),
						),
					);

				return { connections };

			case 'whatsapp-oficial':
				connections = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						wab_token: whatsapps.wabToken,
						wab_business_phonenumber_id: whatsapps.wabBusinessPhonenumberId,
						wab_business_id: whatsapps.wab_business_id,
						wab_business_number: whatsapps.wab_business_number,
					})
					.from(whatsapps)
					.where(
						and(
							eq(whatsapps.type, 'whatsapp-oficial'),
							inArray(whatsapps.id, connections_ids),
						),
					);

				return { connections };

			case 'telegram':
				return { connections: [] };

			case 'sms':
				return { connections: [] };

			case 'email':
				return { connections: [] };

			default:
				log.info({
					success: false,
					module: 'services',
					msg: 'Tipo de conexão desconhecida!',
				});
				return { connections: [] };
		}
	} catch (error) {
		log.info({
			success: false,
			module: 'services',
			msg: `Error on get connections ${error}`,
		});

		return { connections: [] };
	}
}
