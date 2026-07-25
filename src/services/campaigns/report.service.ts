import { eq, and, isNull, sql, inArray, or } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import {
	scheduleMessages,
	schedulemessagesSendMessages,
	schedulemessagesWhatsapp,
	scheduleMessageCsv,
	contacts as contactsDB,
	contactTags,
	tags,
	groups,
	whatsapps,
} from '@/migrations/schemas/schema';

interface IScheduleMessage {
	id: number;
	type: string;
	title: string;
	timezone: string;
	name: string | null;
	ticketOpen: boolean;
	number: string | null;
	status: boolean | null;
	connection: string | null;
	sended_date: string | null;
}
interface IReturn {
	status: number;
	message: string;
	datas: {
		total_sent?: number;
		total_pages?: number;
		ticket_open?: boolean;
		total_destinataries?: number;
		schedule_message: IScheduleMessage[];
	};
}

interface IProps {
	id: number;
	page: number;
	limit: number;
	company_id: number;
	export_all?: boolean;
}

export default async function reportService({
	id,
	page,
	limit,
	company_id,
	export_all = false,
}: IProps): Promise<IReturn> {
	try {
		const finalLimit = export_all ? Number.MAX_SAFE_INTEGER : limit;
		const offset = export_all ? 0 : (page - 1) * limit;

		const report: IScheduleMessage[] = [];
		const builded_where = [
			eq(scheduleMessages.company_id, company_id),
			eq(scheduleMessages.id, id),
			isNull(scheduleMessages.deletedAt),
		];

		let report_data;

		const schedule_message = await db.query.scheduleMessages.findFirst({
			columns: {
				title: true,
				type: true,
				is_running: true,
				timezone: true,
				group_id: true,
				selected_groups: true,
				tags: true,
				updatedAt: true,
			},
			where: and(...builded_where),
		});

		if (!schedule_message) {
			return {
				status: 200,
				message: 'Campanha não encontrada!',
				datas: {
					schedule_message: [],
					total_pages: 1,
					total_destinataries: 0,
					total_sent: 0,
				},
			};
		}

		let contactsWhere = isNull(contactsDB.deletedAt);

		if (schedule_message.tags) {
			const tag_ids = schedule_message.tags?.split(',').map(id => Number(id));

			const contactsWithTags = await db
				.selectDistinct({
					contact_id: contactsDB.id,
				})
				.from(contactsDB)
				.innerJoin(contactTags, eq(contactTags.contact_id, contactsDB.id))
				.innerJoin(tags, eq(contactTags.tag_id, tags.id))
				.where(
					and(
						eq(contactsDB.company_id, company_id),
						inArray(tags.id, tag_ids),
						isNull(contactsDB.deletedAt),
						isNull(contactTags.deletedAt),
						isNull(tags.deletedAt),
					),
				);

			const contactIds = contactsWithTags.map(c => c.contact_id);

			contactsWhere = and(
				isNull(contactsDB.deletedAt),
				inArray(contactsDB.id, contactIds),
			);

			const countResult = await db
				.select({ total: sql`COUNT(*)` })
				.from(schedulemessagesSendMessages)
				.innerJoin(
					contactsDB,
					eq(schedulemessagesSendMessages.contact_id, contactsDB.id),
				)
				.where(
					and(
						eq(schedulemessagesSendMessages.schedule_message_id, id),
						isNull(schedulemessagesSendMessages.deletedAt),
						contactsWhere,
					),
				);

			const total = Number(countResult[0].total || 0);

			const sentResult = await db
				.select({
					totalSent: sql`COUNT(CASE WHEN ${schedulemessagesSendMessages.is_sended} = true THEN 1 ELSE NULL END)`,
				})
				.from(schedulemessagesSendMessages)
				.innerJoin(
					contactsDB,
					eq(schedulemessagesSendMessages.contact_id, contactsDB.id),
				)
				.where(
					and(
						eq(schedulemessagesSendMessages.schedule_message_id, id),
						isNull(schedulemessagesSendMessages.deletedAt),
						contactsWhere,
					),
				);

			const totalSent = Number(sentResult[0].totalSent || 0);

			const total_pages = total > 0 ? Math.ceil(total / limit) : 1;

			try {
				const rawData = await db
					.select({
						number: schedulemessagesSendMessages.number,
						csv_id: schedulemessagesSendMessages.csv_id,
						is_sended: schedulemessagesSendMessages.is_sended,
						contact_id: schedulemessagesSendMessages.contact_id,
						sended_date: schedulemessagesSendMessages.sended_date,
						ticket_open: schedulemessagesSendMessages.ticket_open,
						contact_name: contactsDB.name,
						contact_number: contactsDB.number,
					})
					.from(schedulemessagesSendMessages)
					.innerJoin(
						contactsDB,
						eq(schedulemessagesSendMessages.contact_id, contactsDB.id),
					)
					.where(
						and(
							eq(schedulemessagesSendMessages.schedule_message_id, id),
							isNull(schedulemessagesSendMessages.deletedAt),
							contactsWhere,
						),
					)
					.limit(finalLimit)
					.offset(offset);

				const contactTagsPromises = rawData.map(async item => {
					const contactTagsData = await db
						.select({
							tag_name: tags.name,
						})
						.from(contactTags)
						.innerJoin(tags, eq(contactTags.tag_id, tags.id))
						.where(
							and(
								eq(contactTags.contact_id, item.contact_id),
								isNull(contactTags.deletedAt),
								isNull(tags.deletedAt),
							),
						);

					const tagNames = contactTagsData.map(tag => tag.tag_name).join(', ');

					report.push({
						id: item.contact_id,
						name: `${item.contact_name} - ${tagNames}`,
						number: item.contact_number,
						title: schedule_message.title,
						type: schedule_message.type,
						connection: item.number,
						sended_date: item.sended_date,
						status: item.is_sended,
						ticketOpen: item.ticket_open || false,
						timezone: schedule_message.timezone,
						isGroup: false,
					});
					return report[report.length - 1];
				});

				await Promise.all(contactTagsPromises);

				return {
					status: 200,
					message: 'Listagem de campanhas realizada com sucesso!',
					datas: {
						total_pages,
						schedule_message: report,
						total_sent: totalSent,
						total_destinataries: total,
					},
				};
			} catch (error) {
				log.error(error, 'Erro na query de tags');
				return {
					status: 500,
					message: 'Erro ao buscar dados de tags!',
					datas: {
						schedule_message: [],
						total_pages: 1,
						total_destinataries: 0,
						total_sent: 0,
					},
				};
			}
		} else {
			report_data = await db.query.schedulemessagesSendMessages.findMany({
				columns: {
					number: true,
					csv_id: true,
					is_sended: true,
					contact_id: true,
					sended_date: true,
					ticket_open: true,
				},
				with: {
					contacts: {
						columns: { id: true, name: true, number: true },
						where: isNull(contactsDB.deletedAt),
					},
					csv: {
						columns: { id: true, name: true, number: true },
						where: isNull(scheduleMessageCsv.deletedAt),
					},
				},
				where: and(
					eq(schedulemessagesSendMessages.schedule_message_id, id),
					isNull(schedulemessagesSendMessages.deletedAt),
				),
				limit: finalLimit,
				offset,
			});
		}
		if (!report_data || report_data.length === 0 || !report_data[0]) {
			return {
				status: 200,
				message: 'Relatório de campanha não encontrado!',
				datas: {
					schedule_message: [],
					total_pages: 1,
					total_destinataries: 0,
					total_sent: 0,
				},
			};
		}

		const result = await db
			.select({
				total: sql`COUNT(*)`,
				totalSent: sql`COUNT(CASE WHEN ${eq(schedulemessagesSendMessages.is_sended, true)} THEN 1 ELSE NULL END)`,
			})
			.from(schedulemessagesSendMessages)
			.where(
				and(
					eq(schedulemessagesSendMessages.schedule_message_id, id),
					isNull(schedulemessagesSendMessages.deletedAt),
				),
			);

		const { total, totalSent } = result[0];

		let total_pages = 0;
		if (export_all) {
			total_pages = 1;
		} else if (total && Number(total) > 0) {
			total_pages = Math.ceil(Number(total) / limit);
		}

		if (!report_data || report_data.length === 0) {
			return {
				status: 200,
				message: 'Nenhum dado encontrado para o relatório!',
				datas: {
					schedule_message: [],
					total_pages: 1,
					total_destinataries: 0,
					total_sent: 0,
				},
			};
		}

		if (report_data[0].csv && report_data[0].csv.length) {
			report_data[0].csv.forEach(item => {
				const reportFound = report_data.find(r => r.csv_id === item.id);

				if (reportFound && reportFound.csv_id) {
					report.push({
						id: item.id,
						name: item.name,
						number:
							reportFound.csv.find(itemCsv => itemCsv.id === reportFound.csv_id)
								?.number || null,
						type: schedule_message.type,
						title: schedule_message.title,
						status: reportFound?.is_sended,
						connection: reportFound?.number,
						timezone: schedule_message.timezone,
						sended_date: reportFound.sended_date,
						ticketOpen: reportFound?.ticket_open || false,
						isGroup: false,
					});
				}
			});
		} else if (schedule_message.group_id === -1) {
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
						eq(schedulemessagesWhatsapp.schedule_message_id, id),
						isNull(schedulemessagesWhatsapp.deletedAt),
					),
				);

			const activeWhatsapps = campaignWhatsapps.filter(
				whatsapp => whatsapp.status_id === 5,
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

			if (activeWhatsapps.length === 0) {
				return {
					status: 200,
					message: 'Nenhum WhatsApp ativo encontrado!',
					datas: {
						schedule_message: [],
						total_pages: 1,
						total_destinataries: 0,
						total_sent: 0,
					},
				};
			}

			const sendedGroupIds = report_data
				.map(item => item.csv_id)
				.filter(Boolean);
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

			if (sendedGroupIds.length > 0) {
				groupWhereConditions.push(inArray(groups.id, sendedGroupIds));
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

			const groupWhatsappIds = allGroups
				.map(g => g.whatsapp_id)
				.filter(Boolean);
			let whatsappData = [];
			if (groupWhatsappIds.length > 0) {
				whatsappData = await db
					.select({
						id: whatsapps.id,
						name: whatsapps.name,
						serializedId: whatsapps.serializedId,
					})
					.from(whatsapps)
					.where(
						and(
							inArray(whatsapps.id, groupWhatsappIds),
							isNull(whatsapps.deletedAt),
						),
					);
			}

			allGroups.forEach(group => {
				const whatsappInfo = whatsappData.find(w => w.id === group.whatsapp_id);
				const reportItem = report_data.find(
					item => item.number === group.group_id,
				);
				report.push({
					id: group.id,
					name:
						group.group_name ||
						`Grupo ${group.group_id?.split('@')[0] || 'N/A'}`,
					number: group.group_id?.split('@')[0] || 'N/A',
					type: schedule_message.type,
					title: schedule_message.title,
					status: reportItem?.is_sended ?? true,
					connection:
						whatsappInfo?.serializedId?.split('@')[0]?.split(':')[0] || 'N/A',
					timezone: schedule_message.timezone,
					sended_date: reportItem?.sended_date,
					ticketOpen: reportItem?.ticket_open || false,
					isGroup: true,
				});
			});
		} else if (
			schedule_message.selected_groups &&
			typeof schedule_message.selected_groups === 'string' &&
			schedule_message.selected_groups !== '[]'
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
							eq(schedulemessagesWhatsapp.schedule_message_id, id),
							isNull(schedulemessagesWhatsapp.deletedAt),
						),
					);

				const activeWhatsapps = campaignWhatsapps.filter(
					whatsapp => whatsapp.status_id === 5,
				);

				const ownerNumberIds = activeWhatsapps
					.map(item => item.serializedId)
					.filter((id): id is string => id !== null && id !== undefined)
					.map(serializedId => {
						const match = serializedId.match(/^(\d+):/);
						return match ? match[1] : null;
					})
					.filter((id): id is string => id !== null);

				if (activeWhatsapps.length === 0) {
					return {
						status: 200,
						message: 'Nenhum WhatsApp ativo encontrado!',
						datas: {
							schedule_message: [],
							total_pages: 1,
							total_destinataries: 0,
							total_sent: 0,
						},
					};
				}

				const parsedSelectedGroups = JSON.parse(
					schedule_message.selected_groups,
				);
				if (parsedSelectedGroups.length > 0) {
					const groupPromises = parsedSelectedGroups.map(async groupString => {
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

							return groupData.length > 0 ? groupData[0] : null;
						} catch (error) {
							log.error(
								error,
								`Erro ao processar grupo no report: ${groupString}`,
							);
							return null;
						}
					});

					const groupResults = await Promise.all(groupPromises);
					const groupsData = groupResults.filter(group => group !== null);

					const whatsappIds = groupsData
						.map(g => g.whatsapp_id)
						.filter(Boolean);
					let whatsappData = [];
					if (whatsappIds.length > 0) {
						whatsappData = await db
							.select({
								id: whatsapps.id,
								name: whatsapps.name,
								serializedId: whatsapps.serializedId,
							})
							.from(whatsapps)
							.where(
								and(
									inArray(whatsapps.id, whatsappIds),
									isNull(whatsapps.deletedAt),
								),
							);
					}

					groupsData.forEach(group => {
						const whatsappInfo = whatsappData.find(
							w => w.id === group.whatsapp_id,
						);
						const reportItem = report_data.find(
							item =>
								item.csv_id === group.id || item.number === group.group_id,
						);
						report.push({
							id: group.id,
							name:
								group.group_name ||
								`Grupo ${group.group_id?.split('@')[0] || 'N/A'}`,
							number: group.group_id?.split('@')[0] || 'N/A',
							type: schedule_message.type,
							title: schedule_message.title,
							status: reportItem?.is_sended ?? true,
							connection: whatsappInfo?.serializedId
								?.split('@')[0]
								?.split(':')[0],
							timezone: schedule_message.timezone,
							sended_date: reportItem?.sended_date,
							ticketOpen: reportItem?.ticket_open || false,
							isGroup: true,
						});
					});
				}
			} catch (error) {
				log.info({
					success: false,
					module: 'services',
					text: `Report - Error parsing selected_groups: ${error}`,
				});
			}
		} else if (
			report_data.some(
				item => item.csv_id && !item.csv?.length && !item.contacts?.length,
			)
		) {
			const groupIds = report_data
				.filter(
					item => item.csv_id && !item.csv?.length && !item.contacts?.length,
				)
				.map(item => item.csv_id);

			if (groupIds.length > 0) {
				const groupsData = await db
					.select({
						id: groups.id,
						group_name: groups.group_name,
						group_id: groups.group_id,
						whatsapp_id: groups.whatsapp_id,
					})
					.from(groups)
					.where(and(inArray(groups.id, groupIds), isNull(groups.deletedAt)));

				const whatsappIds = groupsData.map(g => g.whatsapp_id).filter(Boolean);
				let whatsappData = [];
				if (whatsappIds.length > 0) {
					whatsappData = await db
						.select({
							id: whatsapps.id,
							name: whatsapps.name,
							serializedId: whatsapps.serializedId,
						})
						.from(whatsapps)
						.where(
							and(
								inArray(whatsapps.id, whatsappIds),
								isNull(whatsapps.deletedAt),
							),
						);
				}

				report_data
					.filter(
						item => item.csv_id && !item.csv?.length && !item.contacts?.length,
					)
					.forEach(item => {
						const groupData = groupsData.find(g => g.id === item.csv_id);
						const whatsappInfo = whatsappData.find(
							w => w.id === groupData?.whatsapp_id,
						);

						report.push({
							id: item.csv_id,
							name: groupData?.group_name,
							number: groupData?.group_id?.split('@')[0] || 'N/A',
							type: schedule_message.type,
							title: schedule_message.title,
							status: item?.is_sended,
							connection:
								whatsappInfo?.serializedId?.split('@')[0]?.split(':')[0] ||
								'N/A',
							timezone: schedule_message.timezone,
							sended_date: item.sended_date,
							ticketOpen: item?.ticket_open || false,
							isGroup: true,
						});
					});
			}
		} else {
			report_data.forEach(item => {
				report.push({
					id: item?.contacts[0]?.id,
					name: item?.contacts[0]?.name,
					number: item?.contacts[0]?.number,
					title: schedule_message.title,
					type: schedule_message.type,
					connection: item?.number,
					sended_date: item?.sended_date,
					status: item?.is_sended,
					ticketOpen: item?.ticket_open || false,
					timezone: schedule_message.timezone,
					isGroup: false,
				});
			});
		}

		return {
			status: 200,
			message: 'Listagem de campanhas realizada com sucesso!',
			datas: {
				total_pages,
				schedule_message: report,
				total_sent: totalSent ? Number(totalSent) : 0,
				total_destinataries: total ? Number(total) : 1,
			},
		};
	} catch (error) {
		log.error(error, 'Error on campaign report service');

		return {
			status: 500,
			message: 'Erro interno de servidor',
			datas: {
				total_pages: 0,
				schedule_message: [],
				total_sent: 0,
				total_destinataries: 0,
			},
		};
	}
}
