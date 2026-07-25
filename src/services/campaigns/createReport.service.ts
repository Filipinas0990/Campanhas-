/* eslint-disable no-await-in-loop */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { and, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database';
import log from '@/logs';
import {
	contactTags,
	contacts,
	groups,
	scheduleMessageCsv,
	schedulemessagesWhatsapp,
	tags as tagsModel,
	whatsapps,
} from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';

dayjs.extend(utc);

interface IProps {
	company_id: number;
	all_contacts: boolean;
	tags: string | null;
	send_contacts: string | null;
	selected_groups?: string | null;
	type: string;
	schedule_message_id: number;
	category: string;
	restrict_ddd: boolean;
	group_id?: number | null;
}

interface IDestinary {
	id: number;
	name: string | null;
	number: string | null;
	meta_id?: string | null;
	telegram_chat_id?: string | null;
	email?: string | null;
	schedule_message_id?: number;
	cpf?: string | null;
	client_company?: string | null;
	contactId?: number;
}

export default async function createReportService({
	tags,
	send_contacts,
	all_contacts,
	selected_groups,
	company_id,
	group_id,
	type,
	schedule_message_id,
	restrict_ddd = false,
}: IProps): Promise<void> {
	log.info(
		{
			all_contacts,
			send_contacts,
			tags,
			company_id,
			type,
			schedule_message_id,
			restrict_ddd,
			selected_groups,
			group_id,
		},
		'Starting campaign report sending',
	);

	try {
		const csvCount = await db
			.select({ count: sql`COUNT(*)` })
			.from(scheduleMessageCsv)
			.where(
				and(
					eq(scheduleMessageCsv.schedule_message_id, schedule_message_id),
					isNull(scheduleMessageCsv.deletedAt),
				),
			);

		const connection = await db
			.select({
				ddd: sql`SUBSTRING(${whatsapps.serializedId}, 3, 2)`,
				serialized_id: sql`REGEXP_REPLACE(${whatsapps.serializedId}, ':.*', '')`,
				wab_business_number: whatsapps.wab_business_number,
			})
			.from(schedulemessagesWhatsapp)
			.innerJoin(
				whatsapps,
				eq(whatsapps.id, schedulemessagesWhatsapp.whatsapp_id),
			)
			.where(
				eq(schedulemessagesWhatsapp.schedule_message_id, schedule_message_id),
			);

		const dddCondition =
			restrict_ddd && connection[0]?.ddd
				? eq(sql`SUBSTRING(${contacts.number}, 3, 2)`, connection[0]?.ddd)
				: undefined;

		if (csvCount[0].count > 0) {
			const csvContacts = await db
				.select({
					id: scheduleMessageCsv.id,
					name: scheduleMessageCsv.name,
					number: scheduleMessageCsv.number,
				})
				.from(scheduleMessageCsv)
				.where(
					and(
						eq(scheduleMessageCsv.schedule_message_id, schedule_message_id),
						isNull(scheduleMessageCsv.deletedAt),
					),
				);

			const filteredCsv = csvContacts;

			if (filteredCsv.length > 0) {
				for (let i = 0; i < filteredCsv.length; i += 100) {
					const batch = filteredCsv.slice(i, i + 100);

					await bullMQ.addJobToQueue(
						queueConfig.queues.report,
						JSON.stringify({
							contacts: batch.map(item => ({
								schedule_message_id,
								number:
									(connection[0]?.serialized_id as string | null)
										?.split('@')?.[0]
										?.split(':')?.[0] ??
									connection[0]?.wab_business_number ??
									'',
								contact_id: null,
								csv_id: item.id,
								is_sended: false,
								createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
							})),
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			}

			return;
		}

		if (all_contacts) {
			const destinaries: IDestinary[] = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
				})
				.from(contacts)
				.where(
					and(
						dddCondition,
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						or(eq(contacts.type, type), isNull(contacts.type)),
						isNull(contacts.deletedAt),
						lte(sql`LENGTH(${contacts.number})`, 13),
					),
				);

			if (destinaries.length > 0) {
				for (let i = 0; i < destinaries.length; i += 100) {
					const batch = destinaries.slice(i, i + 100);

					await bullMQ.addJobToQueue(
						queueConfig.queues.report,
						JSON.stringify({
							contacts: batch.map(item => ({
								schedule_message_id,
								number:
									connection[0]?.serialized_id ??
									connection[0]?.wab_business_number ??
									'',
								contact_id: item.id,
								csv_id: null,
								is_sended: false,
								createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
							})),
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			}
		}

		const contacts_ids = (send_contacts || tags)
			?.split(',')
			.map(id => Number(id));
		if (!contacts_ids || contacts_ids.length === 0) {
			if (group_id !== -1 && !selected_groups) {
				return;
			}
		}

		if (send_contacts) {
			log.info('Processando contatos específicos (send_contacts)...');

			const destinaries: IDestinary[] = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
				})
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						inArray(contacts.id, contacts_ids),
						isNull(contacts.deletedAt),
					),
				);
			if (destinaries.length > 0) {
				for (let i = 0; i < destinaries.length; i += 100) {
					const batch = destinaries.slice(i, i + 100);

					await bullMQ.addJobToQueue(
						queueConfig.queues.report,
						JSON.stringify({
							contacts: batch.map(item => ({
								schedule_message_id,
								number:
									connection[0]?.serialized_id ??
									connection[0]?.wab_business_number ??
									'',
								contact_id: item.id,
								csv_id: null,
								is_sended: false,
								createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
							})),
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			}

			return;
		}

		if (group_id === -1) {
			try {
				const campaignWhatsapps = await db
					.select({
						whatsapp_id: schedulemessagesWhatsapp.whatsapp_id,
						serializedId: whatsapps.serializedId,
						status_id: whatsapps.statusId,
					})
					.from(schedulemessagesWhatsapp)
					.innerJoin(
						whatsapps,
						eq(whatsapps.id, schedulemessagesWhatsapp.whatsapp_id),
					)
					.where(
						and(
							eq(
								schedulemessagesWhatsapp.schedule_message_id,
								schedule_message_id,
							),
							isNull(schedulemessagesWhatsapp.deletedAt),
						),
					);

				const activeWhatsapps = campaignWhatsapps.filter(
					whatsapp => whatsapp.status_id === 5,
				);

				log.info(
					`CreateReport - Total whatsapps found: ${campaignWhatsapps.length}, Active (status 5): ${activeWhatsapps.length}`,
				);

				const whatsappIds = activeWhatsapps
					.map(item => item.whatsapp_id)
					.filter(
						(id): id is number =>
							id !== null && id !== undefined && !Number.isNaN(Number(id)),
					);

				const ownerNumberIds = activeWhatsapps
					.map(item => item.serializedId)
					.filter((id): id is string => id !== null && id !== undefined)
					.map(serializedId => {
						const match = serializedId.match(/^(\d+):/);
						return match ? match[1] : null;
					})
					.filter((id): id is string => id !== null);

				if (activeWhatsapps.length > 0) {
					const prioritizedWhatsapp = activeWhatsapps[0];
					log.info(
						`CreateReport - PRIORITIZED WHATSAPP: ID=${prioritizedWhatsapp.whatsapp_id}, SerializedId=${prioritizedWhatsapp.serializedId}, Status=${prioritizedWhatsapp.status_id}`,
					);
				}

				log.info(
					`CreateReport - Found whatsapp_ids: ${JSON.stringify(whatsappIds)}, owner_number_ids: ${JSON.stringify(ownerNumberIds)}`,
				);

				if (activeWhatsapps.length === 0) {
					log.info(
						'CreateReport - No active whatsapps found, skipping group processing',
					);
					return;
				}

				const groupWhereConditions = [
					eq(groups.company_id, company_id),
					isNull(groups.deletedAt),
				];

				if (whatsappIds.length > 0) {
					groupWhereConditions.push(inArray(groups.whatsapp_id, whatsappIds));
				}

				if (ownerNumberIds.length > 0) {
					const ownerNumberConditions = ownerNumberIds.map(
						ownerId =>
							sql`${groups.owner_number_id} LIKE ${`${ownerId}@s.whatsapp.net`}`,
					);
					groupWhereConditions.push(or(...ownerNumberConditions));
				}

				const allGroups = await db
					.select({
						id: groups.id,
						group_name: groups.group_name,
						group_id: groups.group_id,
						whatsapp_id: groups.whatsapp_id,
						owner_number_id: groups.owner_number_id,
					})
					.from(groups)
					.where(and(...groupWhereConditions));

				if (allGroups.length > 0) {
					const groupRecords = allGroups.map(group => ({
						schedule_message_id,
						number: group.group_id,
						contact_id: null,
						csv_id: group.id,
						is_sended: false,
						createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
					}));

					await bullMQ.addJobToQueue(
						queueConfig.queues.report,
						JSON.stringify({
							contacts: groupRecords,
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			} catch (error) {
				log.error(error, '[ERROR] Erro ao processar todos os grupos:');
			}
			return;
		}

		if (
			selected_groups &&
			typeof selected_groups === 'string' &&
			selected_groups.trim() !== '' &&
			selected_groups !== '[]'
		) {
			try {
				const campaignWhatsapps = await db
					.select({
						whatsapp_id: schedulemessagesWhatsapp.whatsapp_id,
						serializedId: whatsapps.serializedId,
						status_id: whatsapps.statusId,
					})
					.from(schedulemessagesWhatsapp)
					.innerJoin(
						whatsapps,
						eq(whatsapps.id, schedulemessagesWhatsapp.whatsapp_id),
					)
					.where(
						and(
							eq(
								schedulemessagesWhatsapp.schedule_message_id,
								schedule_message_id,
							),
							isNull(schedulemessagesWhatsapp.deletedAt),
						),
					);

				const activeWhatsapps = campaignWhatsapps.filter(
					whatsapp => whatsapp.status_id === 5,
				);

				log.info(
					`CreateReport - Total whatsapps found for selected groups: ${campaignWhatsapps?.length}, Active (status 5): ${activeWhatsapps.length}`,
				);

				const ownerNumberIds = activeWhatsapps
					.map(item => item.serializedId)
					.filter((id): id is string => id !== null && id !== undefined)
					.map(serializedId => {
						const match = serializedId.match(/^(\d+):/);
						return match ? match[1] : null;
					})
					.filter((id): id is string => id !== null);

				if (activeWhatsapps.length > 0) {
					const prioritizedWhatsapp = activeWhatsapps[0];
					log.info(
						`CreateReport - PRIORITIZED WHATSAPP FOR SELECTED GROUPS: ID=${prioritizedWhatsapp.whatsapp_id}, SerializedId=${prioritizedWhatsapp.serializedId}, Status=${prioritizedWhatsapp.status_id}`,
					);
				}

				log.info(
					`CreateReport - Found owner_number_ids for selected groups: ${JSON.stringify(ownerNumberIds)}`,
				);

				if (activeWhatsapps.length === 0) {
					log.info(
						'CreateReport - No active whatsapps found for selected groups, skipping group processing',
					);
					return;
				}

				const parsedGroups = JSON.parse(selected_groups);
				if (parsedGroups.length > 0) {
					const groupsData = [];

					for (const groupString of parsedGroups) {
						try {
							if (
								!groupString ||
								groupString === null ||
								groupString === 'null'
							) {
								log.info({ groupString }, 'Pulando grupo null/undefined:');
							} else {
								let groupObject;
								if (
									typeof groupString === 'string' &&
									groupString.includes('@g.us') &&
									!groupString.includes('{')
								) {
									groupObject = { number: groupString, whatsapp_id: null };
								} else if (typeof groupString === 'string') {
									groupObject = JSON.parse(groupString);
								} else {
									groupObject = groupString;
								}
								const group_id = groupObject.group_id || groupObject.number;
								const { whatsapp_id } = groupObject;

								const whereConditions = [
									eq(groups.company_id, company_id),
									eq(groups.group_id, group_id),
									isNull(groups.deletedAt),
								];

								if (whatsapp_id !== undefined && whatsapp_id !== null) {
									whereConditions.push(eq(groups.whatsapp_id, whatsapp_id));
								}

								if (ownerNumberIds.length > 0) {
									const ownerNumberConditions = ownerNumberIds.map(
										ownerId =>
											sql`${groups.owner_number_id} LIKE ${`${ownerId}@s.whatsapp.net`}`,
									);
									whereConditions.push(or(...ownerNumberConditions));
								}

								const groupData = await db
									.select({
										id: groups.id,
										group_name: groups.group_name,
										group_id: groups.group_id,
										whatsapp_id: groups.whatsapp_id,
										owner_number_id: groups.owner_number_id,
									})
									.from(groups)
									.where(and(...whereConditions))
									.limit(1);

								if (groupData.length > 0) {
									groupsData.push(groupData[0]);
								}
							}
						} catch (error) {
							log.error(error, 'Erro ao processar grupo:', groupString);
						}
					}

					log.info(
						`[CREATE_REPORT] Encontrados ${groupsData.length} grupos no banco`,
					);

					if (groupsData.length > 0) {
						const groupRecords = groupsData.map(group => ({
							schedule_message_id,
							number: group.group_id,
							contact_id: null,
							csv_id: group.id,
							is_sended: false,
							createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
						}));

						await bullMQ.addJobToQueue(
							queueConfig.queues.report,
							JSON.stringify({
								contacts: groupRecords,
							}),
							{
								removeOnComplete: true,
								removeOnFail: true,
							},
						);
					}
				}
			} catch (error) {
				log.error(error, '[ERROR] Erro ao processar grupos:');
			}
			return;
		}

		if (tags) {
			const destinaries: IDestinary[] = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
				})
				.from(contacts)
				.innerJoin(contactTags, eq(contactTags.contact_id, contacts.id))
				.innerJoin(tagsModel, eq(contactTags.tag_id, tagsModel.id))
				.where(
					and(
						dddCondition,
						eq(contacts.schedule_enabled, true),
						eq(contacts.company_id, company_id),
						inArray(tagsModel.id, contacts_ids),
						isNull(contacts.deletedAt),
						isNull(contactTags.deletedAt),
					),
				);

			if (destinaries.length > 0) {
				for (let i = 0; i < destinaries.length; i += 100) {
					const batch = destinaries.slice(i, i + 100);

					await bullMQ.addJobToQueue(
						queueConfig.queues.report,
						JSON.stringify({
							contacts: batch.map(item => ({
								schedule_message_id,
								number:
									connection[0]?.serialized_id ??
									connection[0]?.wab_business_number ??
									'',
								contact_id: item.id,
								csv_id: null,
								is_sended: false,
								createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
							})),
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			}
		}
	} catch (error) {
		log.error(error, 'Error creating campaign report');
	}
}
