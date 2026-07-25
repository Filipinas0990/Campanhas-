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
	tags,
	whatsapps,
} from '@/migrations/schemas/schema';

type SelectedGroup =
	| string
	| {
			group_id?: string;
			number?: string;
			whatsapp_id?: number | null;
	  };

interface ISchduleMessage {
	id: number;
	all_contacts: boolean;
	send_contacts: string | null;
	tags: string | null;
	type: string;
	csv_contacts: {
		id: number;
		name: string | null;
		number: string | null;
		schedule_message_id: number;
	}[];
	restrict_ddd: boolean;
	group_id?: number | null;
	selected_groups?: string | SelectedGroup[] | null;
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

interface IReturn {
	destinaries: IDestinary[];
	success?: boolean;
	groups?: unknown[];
	totalGroups?: number;
	totalPages?: number;
	currentPage?: number;
}

interface IProps {
	schedule_message: ISchduleMessage;
	company_id: number;
	page: number;
	limit?: number;
	category: string;
	whatsappId?: number;
}

export default async function contactTreatmentService({
	schedule_message,
	company_id,
	page,
	limit = 5,
	category,
}: IProps): Promise<IReturn> {
	log.info({
		success: true,
		module: 'services',
		msg: `Iniciando contactTreatmentService ${JSON.stringify({ company_id, page, category })}`,
	});

	try {
		const LIMIT = limit;
		let destinaries: IDestinary[] | [] = [];

		if (!schedule_message) return { destinaries: [] };

		log.info({
			success: true,
			module: 'services',
			text: `ContactTreatment - Checking group_id: ${schedule_message.group_id}, type: ${typeof schedule_message.group_id}`,
		});

		if (schedule_message.group_id === -1) {
			log.info({
				success: true,
				module: 'services',
				text: `ContactTreatment - GROUP MODE ACTIVATED! Selecting all groups from 'groups' table for company ${company_id}, page: ${page}, limit: ${LIMIT}`,
			});

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
								schedule_message.id,
							),
							isNull(schedulemessagesWhatsapp.deletedAt),
						),
					);

				const activeWhatsapps = campaignWhatsapps.filter(
					whatsapp => whatsapp.status_id === 5,
				);

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Total whatsapps found: ${campaignWhatsapps.length}, Active (status 5): ${activeWhatsapps.length}`,
				});

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
					log.info({
						success: true,
						module: 'services',
						text: `ContactTreatment - PRIORITIZED WHATSAPP: ID=${prioritizedWhatsapp.whatsapp_id}, SerializedId=${prioritizedWhatsapp.serializedId}, Status=${prioritizedWhatsapp.status_id}`,
					});
				}

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Found whatsapp_ids: ${JSON.stringify(whatsappIds)}, owner_number_ids: ${JSON.stringify(ownerNumberIds)}`,
				});

				if (activeWhatsapps.length === 0) {
					log.info({
						success: true,
						module: 'services',
						text: `ContactTreatment - No active whatsapps found, returning empty groups array`,
					});

					return {
						success: true,
						destinaries: [],
						groups: [],
						totalGroups: 0,
						totalPages: 0,
						currentPage: page,
					};
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
					const ownerNumberCondition = or(...ownerNumberConditions);
					if (ownerNumberCondition) {
						groupWhereConditions.push(ownerNumberCondition);
					}
				}

				const groupRows = await db
					.select({
						id: groups.id,
						name: groups.group_name,
						number: groups.group_id,
						whatsapp_id: groups.whatsapp_id,
						owner_number_id: groups.owner_number_id,
					})
					.from(groups)
					.where(and(...groupWhereConditions));

				const totalGroups = groupRows.length;
				const offset = (page - 1) * LIMIT;

				if (offset >= totalGroups) {
					log.info({
						success: true,
						module: 'services',
						text: `All groups mode (page ${page}): No more groups (total: ${totalGroups})`,
					});
					return { destinaries: [] };
				}

				const paginatedGroups = groupRows.slice(offset, offset + LIMIT);

				log.info({
					success: true,
					module: 'services',
					text: `All groups mode (page ${page}): Returning ${paginatedGroups.length}/${totalGroups} groups`,
				});

				destinaries = paginatedGroups.map(group => ({
					id: group.id,
					name: group.name || `Grupo ${String(group.number).split('@')[0]}`,
					number: group.number,
					meta_id: null,
					telegram_chat_id: null,
					email: null,
					whatsapp_id: group.whatsapp_id,
				}));
				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Found ${destinaries.length} groups for campaign ${schedule_message.id} (all groups mode)`,
				});

				return { destinaries };
			} catch (error) {
				log.info({
					success: false,
					module: 'services',
					text: `[ERROR contactTreatment] Error fetching groups for company ${company_id}: ${error.message}`,
				});
				return { destinaries: [] };
			}
		}
		log.info(
			schedule_message.selected_groups,
			'schedule_mesasdasdsage.selected_groups',
		);

		let parsedSelectedGroups: SelectedGroup[] = [];
		if (schedule_message.selected_groups) {
			try {
				if (typeof schedule_message.selected_groups === 'string') {
					parsedSelectedGroups = JSON.parse(schedule_message.selected_groups);
				} else if (Array.isArray(schedule_message.selected_groups)) {
					parsedSelectedGroups = schedule_message.selected_groups;
				}
			} catch (error) {
				log.info({
					success: false,
					module: 'services',
					text: `ContactTreatment - Error parsing selected_groups: ${error}`,
				});
			}
		}

		if (parsedSelectedGroups.length > 0) {
			log.info({
				success: true,
				module: 'services',
				text: `ContactTreatment - SPECIFIC GROUPS MODE ACTIVATED! Selecting specific groups: ${parsedSelectedGroups.join(', ')}`,
			});

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
								schedule_message.id,
							),
							isNull(schedulemessagesWhatsapp.deletedAt),
						),
					);

				const activeWhatsapps = campaignWhatsapps.filter(
					whatsapp => whatsapp.status_id === 5,
				);

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Total whatsapps found for specific groups: ${campaignWhatsapps.length}, Active (status 5): ${activeWhatsapps.length}`,
				});

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
					log.info({
						success: true,
						module: 'services',
						text: `ContactTreatment - PRIORITIZED WHATSAPP FOR SPECIFIC GROUPS: ID=${prioritizedWhatsapp.whatsapp_id}, SerializedId=${prioritizedWhatsapp.serializedId}, Status=${prioritizedWhatsapp.status_id}`,
					});
				}

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Found owner_number_ids for specific groups: ${JSON.stringify(ownerNumberIds)}`,
				});

				if (activeWhatsapps.length === 0) {
					log.info({
						success: true,
						module: 'services',
						text: `ContactTreatment - No active whatsapps found for specific groups, returning empty groups array`,
					});

					return {
						success: true,
						destinaries: [],
						groups: [],
						totalGroups: 0,
						totalPages: 0,
						currentPage: page,
					};
				}

				const startIndex = (page - 1) * (limit || 5);
				const endIndex = startIndex + (limit || 5);
				const paginatedGroups = parsedSelectedGroups.slice(
					startIndex,
					endIndex,
				);

				const groupPromises = paginatedGroups.map(async groupString => {
					try {
						let groupObject;
						if (typeof groupString === 'string') {
							try {
								groupObject = JSON.parse(groupString);
							} catch (parseError) {
								groupObject = { group_id: groupString };
							}
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
							const ownerNumberCondition = or(...ownerNumberConditions);
							if (ownerNumberCondition) {
								whereConditions.push(ownerNumberCondition);
							}
						}

						const groupData = await db
							.select({
								id: groups.id,
								name: groups.group_name,
								number: groups.group_id,
								whatsapp_id: groups.whatsapp_id,
								owner_number_id: groups.owner_number_id,
							})
							.from(groups)
							.where(and(...whereConditions))
							.limit(1);

						return groupData.length > 0 ? groupData[0] : null;
					} catch (error) {
						log.error(error, `Erro ao processar grupo: ${groupString}`);
						return null;
					}
				});

				const groupResults = await Promise.all(groupPromises);
				const groupRows = groupResults.filter(group => group !== null);

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Found ${groupRows.length} specific groups for company ${company_id}`,
				});

				destinaries = groupRows.map(group => ({
					id: group.id,
					name: group.name || `Grupo ${String(group.number).split('@')[0]}`,
					number: group.number,
					meta_id: null,
					telegram_chat_id: null,
					email: null,
					whatsapp_id: group.whatsapp_id,
				}));

				log.info({
					success: true,
					module: 'services',
					text: `ContactTreatment - Found ${destinaries.length} specific groups for company ${company_id}. Groups: ${JSON.stringify(destinaries)}`,
				});

				return { destinaries };
			} catch (error) {
				log.info({
					success: false,
					module: 'services',
					text: `[ERROR contactTreatment] Error fetching specific groups for company ${company_id}: ${error.message}`,
				});
				return { destinaries: [] };
			}
		}

		const connection = await db
			.select({ ddd: sql`SUBSTRING(${whatsapps.serializedId}, 3, 2)` })
			.from(schedulemessagesWhatsapp)
			.innerJoin(
				whatsapps,
				eq(whatsapps.id, schedulemessagesWhatsapp.whatsapp_id),
			)
			.where(
				eq(schedulemessagesWhatsapp.schedule_message_id, schedule_message.id),
			);

		log.info({
			module: 'services',
			text: `ContactTreatment - schedule_message.send_contacts: "${schedule_message.send_contacts}", tags: "${schedule_message.tags}"`,
			success: true,
		});

		const contacts_ids = (
			schedule_message.send_contacts || schedule_message.tags
		)
			?.split(',')
			.map(id => Number(id));

		log.info({
			module: 'services',
			text: `ContactTreatment - contacts_ids: ${JSON.stringify(contacts_ids)}`,
			success: true,
		});

		const csvCheck = await db
			.select({
				id: scheduleMessageCsv.id,
				name: scheduleMessageCsv.name,
				number: scheduleMessageCsv.number,
			})
			.from(scheduleMessageCsv)
			.where(
				and(
					eq(scheduleMessageCsv.schedule_message_id, schedule_message.id),
					isNull(scheduleMessageCsv.deletedAt),
				),
			)
			.limit(LIMIT)
			.offset((page - 1) * LIMIT);

		log.info({
			module: 'services',
			text: `CSV check: ${csvCheck.length} registros encontrados para campanha ${schedule_message.id}`,
			success: true,
		});

		if (csvCheck.length > 0) {
			log.info({
				module: 'services',
				text: `ContactTreatment - CSV MODE: Processando ${csvCheck.length} contatos de CSV para página ${page}`,
				success: true,
			});

			return { destinaries: csvCheck };
		}

		if (schedule_message.all_contacts) {
			log.info({
				module: 'services',
				text: `ContactTreatment - ALL CONTACTS MODE: company_id=${company_id}, type=${schedule_message.type}, restrict_ddd=${schedule_message.restrict_ddd}`,
				success: true,
			});
			const totalContacts = await db
				.select({ count: sql`COUNT(*)` })
				.from(contacts)
				.where(
					and(eq(contacts.company_id, company_id), isNull(contacts.deletedAt)),
				);

			const contactsWithScheduleEnabled = await db
				.select({ count: sql`COUNT(*)` })
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						isNull(contacts.deletedAt),
					),
				);

			const contactsWithCorrectType = await db
				.select({ count: sql`COUNT(*)` })
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						or(eq(contacts.type, schedule_message.type), isNull(contacts.type)),
						isNull(contacts.deletedAt),
					),
				);

			const contactsWithValidNumber = await db
				.select({ count: sql`COUNT(*)` })
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						or(eq(contacts.type, schedule_message.type), isNull(contacts.type)),
						lte(sql`LENGTH(${contacts.number})`, 13),
						isNull(contacts.deletedAt),
					),
				);

			log.info({
				module: 'services',
				text: `ContactTreatment - DEBUG: Total contacts=${totalContacts[0]?.count}, With schedule_enabled=${contactsWithScheduleEnabled[0]?.count}, With correct type=${contactsWithCorrectType[0]?.count}, With valid number=${contactsWithValidNumber[0]?.count}`,
				success: true,
			});

			if (connection.length > 0) {
				log.info({
					module: 'services',
					text: `ContactTreatment - Connection DDD: ${connection[0].ddd}`,
					success: true,
				});
			}

			const contactDDDs = await db
				.select({
					number: contacts.number,
					ddd: sql`SUBSTRING(${contacts.number}, 3, 2)`,
				})
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						eq(contacts.schedule_enabled, true),
						or(eq(contacts.type, schedule_message.type), isNull(contacts.type)),
						isNull(contacts.deletedAt),
					),
				);

			log.info({
				module: 'services',
				text: `ContactTreatment - Contact DDDs: ${JSON.stringify(contactDDDs)}`,
				success: true,
			});

			const conditions = [
				eq(contacts.company_id, company_id),
				eq(contacts.schedule_enabled, true),
				or(eq(contacts.type, schedule_message.type), isNull(contacts.type)),
				lte(sql`LENGTH(${contacts.number})`, 13),
				isNull(contacts.deletedAt),
			];
			if (schedule_message.restrict_ddd && connection.length > 0) {
				conditions.push(
					eq(sql`SUBSTRING(${contacts.number}, 3, 2)`, connection[0].ddd),
				);
			}

			destinaries = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					last_name: contacts.last_name,
					notes: contacts.notes,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
					cpf: contacts.cpf,
					client_company: contacts.client_company,
				})
				.from(contacts)
				.where(and(...conditions))
				.limit(LIMIT)
				.offset((page - 1) * LIMIT);

			log.info({
				module: 'services',
				text: `ContactTreatment - Found ${destinaries.length} contacts for company ${company_id} (all contacts mode)`,
				success: true,
			});

			if (destinaries.length === 0) {
				log.info({
					module: 'services',
					text: `ContactTreatment - No contacts found. Check if contacts have schedule_enabled=true and meet criteria`,
					success: false,
				});
			}

			log.info({
				module: 'services',
				text: `ContactTreatment - Final result: ${destinaries.length} contacts to return`,
				success: true,
			});

			return { destinaries };
		}

		if (schedule_message.csv_contacts.length > 0) {
			destinaries = await db
				.select({
					id: scheduleMessageCsv.id,
					name: scheduleMessageCsv.name,
					number: scheduleMessageCsv.number,
				})
				.from(scheduleMessageCsv)
				.where(
					and(
						eq(scheduleMessageCsv.schedule_message_id, schedule_message.id),
						isNull(scheduleMessageCsv.deletedAt),
					),
				)
				.limit(LIMIT)
				.offset((page - 1) * LIMIT);

			return { destinaries };
		}

		if (schedule_message.send_contacts && contacts_ids) {
			log.info({
				module: 'services',
				text: `ContactTreatment - send_contacts MODE: contacts_ids=${JSON.stringify(contacts_ids)}, page=${page}, limit=${LIMIT}`,
				success: true,
			});

			destinaries = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					last_name: contacts.last_name,
					notes: contacts.notes,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
					cpf: contacts.cpf,
					client_company: contacts.client_company,
				})
				.from(contacts)
				.where(
					and(
						eq(contacts.company_id, company_id),
						category === queueConfig.schedulers.campaign
							? eq(contacts.schedule_enabled, true)
							: undefined,
						inArray(contacts.id, contacts_ids),
						isNull(contacts.deletedAt),
					),
				)
				.limit(LIMIT)
				.offset((page - 1) * LIMIT);

			log.info({
				module: 'services',
				text: `ContactTreatment - send_contacts RESULT: Found ${destinaries.length} destinaries`,
				success: true,
			});

			return { destinaries };
		}

		if (schedule_message.tags && contacts_ids) {
			destinaries = await db
				.selectDistinct({
					id: contacts.id,
					name: contacts.name,
					last_name: contacts.last_name,
					notes: contacts.notes,
					number: contacts.number,
					meta_id: contacts.meta_id,
					telegram_chat_id: contacts.telegram_chat_id,
					email: contacts.email,
					cpf: contacts.cpf,
					client_company: contacts.client_company,
				})
				.from(contacts)
				.innerJoin(contactTags, eq(contactTags.contact_id, contacts.id))
				.innerJoin(tags, eq(contactTags.tag_id, tags.id))
				.where(
					and(
						schedule_message.restrict_ddd
							? eq(sql`SUBSTRING(${contacts.number}, 3, 2)`, connection[0].ddd)
							: undefined,
						eq(contacts.schedule_enabled, true),
						eq(contacts.company_id, company_id),
						inArray(tags.id, contacts_ids),
						isNull(contacts.deletedAt),
						isNull(tags.deletedAt),
						isNull(contactTags.deletedAt),
						lte(sql`LENGTH(${contacts.number})`, 13),
					),
				)
				.limit(LIMIT)
				.offset((page - 1) * LIMIT);

			if (destinaries.length === 0) {
				const dddCondition = schedule_message.restrict_ddd
					? sql`AND SUBSTRING(${contacts.number}, 3, 2) = ${connection[0]?.ddd ?? ''}`
					: sql``;

				const [diagnostic] = await db
					.select({
						tagged: sql`COUNT(DISTINCT ${contacts.id})`,
						notDeleted: sql`COUNT(DISTINCT CASE WHEN ${contacts.deletedAt} IS NULL AND ${tags.deletedAt} IS NULL AND ${contactTags.deletedAt} IS NULL THEN ${contacts.id} END)`,
						scheduleEnabled: sql`COUNT(DISTINCT CASE WHEN ${contacts.deletedAt} IS NULL AND ${tags.deletedAt} IS NULL AND ${contactTags.deletedAt} IS NULL AND ${contacts.schedule_enabled} = true THEN ${contacts.id} END)`,
						validNumber: sql`COUNT(DISTINCT CASE WHEN ${contacts.deletedAt} IS NULL AND ${tags.deletedAt} IS NULL AND ${contactTags.deletedAt} IS NULL AND ${contacts.schedule_enabled} = true AND LENGTH(${contacts.number}) <= 13 THEN ${contacts.id} END)`,
						eligible: sql`COUNT(DISTINCT CASE WHEN ${contacts.deletedAt} IS NULL AND ${tags.deletedAt} IS NULL AND ${contactTags.deletedAt} IS NULL AND ${contacts.schedule_enabled} = true AND LENGTH(${contacts.number}) <= 13 ${dddCondition} THEN ${contacts.id} END)`,
					})
					.from(contacts)
					.innerJoin(contactTags, eq(contactTags.contact_id, contacts.id))
					.innerJoin(tags, eq(contactTags.tag_id, tags.id))
					.where(
						and(
							eq(contacts.company_id, company_id),
							inArray(tags.id, contacts_ids),
						),
					);

				log.info({
					module: 'services',
					text: 'ContactTreatment - TAGS empty',
					campaignId: schedule_message.id,
					companyId: company_id,
					tags: contacts_ids,
					page,
					counts: {
						tagged: diagnostic?.tagged ?? 0,
						notDeleted: diagnostic?.notDeleted ?? 0,
						scheduleEnabled: diagnostic?.scheduleEnabled ?? 0,
						validNumber: diagnostic?.validNumber ?? 0,
						eligible: diagnostic?.eligible ?? 0,
					},
					restrictDdd: schedule_message.restrict_ddd,
					ddd: connection[0]?.ddd ?? null,
					success: false,
				});
			}

			return { destinaries };
		}

		return { destinaries: [] };
	} catch (error) {
		log.error(error, 'Error on contactTreatment service');
		return { destinaries: [] };
	}
}
