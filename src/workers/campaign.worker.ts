/* eslint-disable @typescript-eslint/no-explicit-any */
import chillout from 'chillout';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { queueConfig } from '@/configs';
import { db } from '@/database';
import { cronSchema } from '@/database/schema';
import log from '@/logs';
import {
	goodbyeMessage,
	greetingsMessage,
	scheduleMessages,
	schedulemessagesSendMessages,
} from '@/migrations/schemas/schema';
import { bullMQ } from '@/providers/bullmq.provider';
import { sendApiOficialService } from '@/services/apiOficial';
import { sendBaileysMessage, clearCampaignCounter } from '@/services/baileys';
import { contactTreatmentService } from '@/services/campaigns';
import { handleInitChatbotService } from '@/services/chatBot';
import { getMessageWithGlobalContext } from '@/services/contexts';
import { sendFacebookMessage } from '@/services/facebook';
import { sendIntagramMessage } from '@/services/instagram';
import { createCron } from '@/services/schedule/createCron';
import { sendSMSService } from '@/services/sms';
import { parseSpintax } from '@/utils';
import { checkRepeatCampaigns } from '@/utils/checkRepeatCampaigns';
import { validateDateTimeRange } from '@/utils/validateDateTimeRange';

import { ICreateCampaignDTO } from './interfaces';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

export default async function campaignWorker(message: any): Promise<void> {
	log.info({
		module: 'worker',
		success: true,
		text: `[INFO campaign_worker] Iniciando processamento de job de campanha`,
	});

	try {
		// Parse payload primeiro para evitar erros síncronos fora do try
		let payload: ICreateCampaignDTO;
		try {
			if (typeof message === 'string') {
				payload = JSON.parse(message) as ICreateCampaignDTO;
			} else {
				payload = message as ICreateCampaignDTO;
			}
		} catch (parseError) {
			log.info({
				success: false,
				module: 'worker',
				text: `[ERROR campaign_worker] Erro ao fazer parse da mensagem: ${parseError.message}`,
			});
			return; // Retorna sem lançar erro
		}

		log.info({
			module: 'consume',
			success: true,
			text: `Campanha de ID: ${payload.schedule_message.id} para ${payload.destinaries.length} destinatários`,
		});

		if (payload && payload.destinaries && payload.destinaries.length > 0) {
			await chillout.forEach(payload.destinaries, async (contact, index) => {
				const scheduleMsg = await db
					.selectDistinct({
						id: schedulemessagesSendMessages.id,
						schedule_message: scheduleMessages.message,
						contact_id: schedulemessagesSendMessages.contact_id,
						is_sended: schedulemessagesSendMessages.is_sended,
					})
					.from(schedulemessagesSendMessages)
					.innerJoin(
						scheduleMessages,
						eq(
							schedulemessagesSendMessages.schedule_message_id,
							scheduleMessages.id,
						),
					)
					.where(
						and(
							eq(
								schedulemessagesSendMessages.schedule_message_id,
								payload.schedule_message.id,
							),
							eq(schedulemessagesSendMessages.contact_id, contact.id),
							eq(schedulemessagesSendMessages.is_sended, true),
						),
					);

				if (scheduleMsg.length > 0) {
					log.info({
						module: 'consume',
						success: true,
						text: `Campanha de ID: ${payload.schedule_message.id} encontrou um contato ja enviado!: ${JSON.stringify({ scheduleMsg }, null, 2)}`,
					});
					return;
				}

				const formattedMessage = await getMessageWithGlobalContext({
					contact,
					company_id: payload.schedule_message.company_id,
					message: payload.message,
				});

				let parsedSpintaxMessage = await parseSpintax(
					formattedMessage,
					payload.schedule_message.greeting_messages,
					payload.schedule_message.goodbye_messages,
				);

				if (
					payload.category === queueConfig.schedulers.campaign &&
					!payload.destinaries.every(
						(dest: any) => dest.number && dest.number.length === 18,
					) &&
					!/agendamento/i.test(payload.schedule_message.title || '') &&
					!(
						payload.schedule_message.selected_groups &&
						payload.schedule_message.selected_groups !== null &&
						payload.schedule_message.selected_groups !== '[]'
					) &&
					payload.schedule_message.group_id !== -1
				) {
					parsedSpintaxMessage += `\n\n ${process.env.MESSAGE_FIXED_CAMPAIGN}`;
				}

				switch (payload.schedule_message.type) {
					case 'chatbot':
						await handleInitChatbotService({
							chat_bot_id: payload.schedule_message.chat_bot_id,
							destinatary: contact,
							companyId: payload.schedule_message.company_id,
							connections: payload.connections,
							schedule_message: payload.schedule_message,
							template_id: payload.schedule_message.template_id || 0,
						});
						break;

					case 'whatsapp':
						await sendBaileysMessage({
							contact,
							message: parsedSpintaxMessage,
							connections: payload.connections,
							schedule_message: payload.schedule_message,
						});
						break;

					case 'instagram':
						await sendIntagramMessage({
							index,
							contact,
							message: parsedSpintaxMessage,
							connections: payload.connections,
							schedule_message: payload.schedule_message,
							company_id: payload.schedule_message.company_id,
							research_ids: payload.schedule_message.research_ids,
						});
						break;

					case 'facebook':
						await sendFacebookMessage({
							index,
							contact,
							message: parsedSpintaxMessage,
							connections: payload.connections,
							schedule_message: payload.schedule_message,
							company_id: payload.schedule_message.company_id,
							research_ids: payload.schedule_message.research_ids,
						});
						break;

					case 'whatsapp-oficial':
						await sendApiOficialService({
							index,
							message: parsedSpintaxMessage,
							contact,
							connections: payload.connections,
							schedule_message: payload.schedule_message,
						});

						break;

					case 'telegram':
						log.info({
							module: 'services',
							text: `Tipo de camapanha não implementado, tipo: ${payload.schedule_message.type}`,
							success: false,
						});
						return;

					case 'sms':
						await sendSMSService({
							contact,
							message: parsedSpintaxMessage,
							schedule_message: payload.schedule_message,
							company_id: payload.schedule_message.company_id,
						});

						break;

					case 'email':
						log.info({
							module: 'services',
							text: `Tipo de camapanha não implementado, tipo: ${payload.schedule_message.type}`,
							success: false,
						});
						return;

					default:
						log.info({
							module: 'services',
							text: `Tipo de camapanha não implementado, tipo: ${payload.schedule_message.type}`,
							success: false,
						});
				}
			});

			await db
				.update(scheduleMessages)
				.set({
					page: payload.page.toString(),
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(scheduleMessages.id, payload.schedule_message.id));

			const schedule_message = await db.query.scheduleMessages.findFirst({
				columns: {
					id: true,
					type: true,
					tags: true,
					title: true,
					all_contacts: true,
					send_contacts: true,
					is_paused: true,
					repeat: true,
					start_date: true,
					end_date: true,
					page: true,
					audio_path: true,
					company_id: true,
					media_path: true,
					media_type: true,
					template_id: true,
					greetings_message: true,
					goodbye_message: true,
					research_id: true,
					timezone: true,
					restrict_ddd: true,
					chat_bot_id: true,
					group_id: true,
					selected_groups: true,
				},
				where: and(
					eq(scheduleMessages.id, payload.schedule_message.id),
					isNull(scheduleMessages.deletedAt),
				),
				with: {
					cadence: true,
					contacts: true,
					csv_contacts: true,
					template_contexts: true,
				},
			});

			if (!schedule_message || schedule_message.is_paused) {
				return;
			}

			log.info({
				module: 'worker',
				text: `Worker - Schedule message group_id: ${schedule_message?.group_id}, type: ${typeof schedule_message?.group_id}`,
				success: true,
			});

			let limit = 5;

			if (
				schedule_message.type === 'whatsapp' &&
				payload.connections.length > 5
			) {
				limit = payload.connections.length;
			}
			const { destinaries } = await contactTreatmentService({
				schedule_message,
				company_id: payload.schedule_message.company_id,
				page: Number(payload.page),
				limit,
				category: payload.category,
				whatsappId: payload.connections[0].id,
			});

			const greeting_messages_ids = schedule_message.greetings_message
				?.split(',')
				.map(ids => Number(ids));

			const greetings_messages =
				schedule_message.greetings_message &&
				greeting_messages_ids &&
				greeting_messages_ids?.length > 0
					? await db
							.select()
							.from(greetingsMessage)
							.where(inArray(greetingsMessage.id, greeting_messages_ids))
					: null;

			const array_of_greeting_message = greetings_messages?.map(
				message => message.message,
			);

			const goodgbye_messages_ids = schedule_message.goodbye_message
				?.split(',')
				.map(ids => Number(ids));

			const goodbye_messages =
				schedule_message.goodbye_message &&
				goodgbye_messages_ids &&
				goodgbye_messages_ids?.length > 0
					? await db
							.select()
							.from(goodbyeMessage)
							.where(inArray(goodbyeMessage.id, goodgbye_messages_ids))
					: null;

			const array_of_goodbye_message = goodbye_messages?.map(
				message => message.message,
			);

			if (!schedule_message.start_date || !schedule_message.end_date) {
				log.info({
					success: false,
					module: 'consume',
					text: `Campanha de ID: ${payload.schedule_message.id} não encontrada!`,
				});
				return;
			}

			const validate = validateDateTimeRange({
				startDateTime: schedule_message.start_date,
				endDateTime: schedule_message.end_date,
				timeZone: schedule_message.timezone,
			});

			const campaignQueueName = `Campaign_${schedule_message.id}_${schedule_message.company_id}`;
			const isSpecificGroups =
				schedule_message.selected_groups &&
				schedule_message.selected_groups !== null &&
				schedule_message.selected_groups !== '[]';
			const hasMorePages = destinaries.length >= limit;
			const shouldProcessDestinaries = destinaries.length > 0;

			if (
				destinaries.length > 0 &&
				validate.isWithinDateAndTimeRange &&
				shouldProcessDestinaries
			) {
				const research_ids: number[] | null = schedule_message?.research_id
					? schedule_message?.research_id.split(',').map(id => Number(id))
					: null;

				const fromated_schedule_message = {
					id: schedule_message.id,
					company_id: schedule_message.company_id,
					research_ids,
					chat_bot_id: schedule_message.chat_bot_id,
					type: schedule_message.type,
					contacts: schedule_message.contacts,
					media_path: schedule_message.media_path,
					media_type: schedule_message.media_type,
					audio_path: schedule_message.audio_path,
					all_contacts: schedule_message.all_contacts,
					send_contacts: schedule_message.send_contacts,
					template_id: schedule_message.template_id,
					timezone: schedule_message.timezone,
					greeting_messages: array_of_greeting_message,
					goodbye_messages: array_of_goodbye_message,
					tags: schedule_message.tags,
					csv_contacts: !!(
						schedule_message.csv_contacts &&
						schedule_message.csv_contacts.length > 0
					),
					group_id: schedule_message.group_id,
					selected_groups: schedule_message.selected_groups,
					template_contexts: schedule_message.template_contexts,
				};

				log.info({
					module: 'worker',
					text: 'Chegou pra adicionar a fila',
					success: true,
					data: {
						shouldProcessDestinaries,
						hasMorePages,
						destinariesCount: destinaries?.length,
						limit,
						page: payload?.page,
						isSpecificGroups,
						selected_groups: schedule_message?.selected_groups,
					},
				});

				if (destinaries.length > 0) {
					log.info({
						module: 'worker',
						text: `Enqueuing next page job - page: ${Number(payload.page) + 1} (${destinaries.length} destinaries, hasMorePages: ${hasMorePages})`,
						success: true,
					});
					await bullMQ.addJobToQueue(
						campaignQueueName,
						JSON.stringify({
							message: payload.message,
							destinaries,
							schedule_message: fromated_schedule_message,
							connections: payload.connections,
							page: Number(payload.page) + 1,
							category: payload.category,
						}),
						{
							removeOnComplete: true,
							removeOnFail: true,
						},
					);
				}
			} else if (
				destinaries.length > 0 &&
				validate.isWithScheduleNextDateAndTime
			) {
				log.info(
					{
						formated_date: validate.startScheduleDateTime.format(),
					},
					'Data de remarcação do cron',
				);

				const { day, minute, hour, month, dayWeek } = checkRepeatCampaigns(
					validate.startScheduleDateTime,
					schedule_message.repeat || '',
				);

				const { cron_job_id, cron_expression } = await createCron({
					category: payload.category,
					schedule_expression: `${minute} ${hour} ${day} ${month} ${dayWeek}`,
					task_id: schedule_message.id.toString(),
					timezone: schedule_message.timezone,
				});

				const currentDateTime = dayjs()
					.utc()
					.tz(String(schedule_message.timezone));

				log.info({
					module: 'consume',
					success: true,
					text: `campanha "${schedule_message.title}" de id: ${schedule_message.id} não finalizada no dia ${currentDateTime.format()} criando novo job. Expression: ${cron_expression} `,
				});

				await db
					.update(cronSchema)
					.set({
						job_id: cron_job_id,
						schedule_date: `${minute} ${hour} ${day} ${month} ${dayWeek}`,
					})
					.where(eq(cronSchema.task_id, schedule_message.id.toString()));
			} else {
				try {
					await db
						.update(cronSchema)
						.set({ is_pending: false })
						.where(eq(cronSchema.task_id, schedule_message.id.toString()));

					await db
						.update(scheduleMessages)
						.set({
							is_running: true,
							is_sending: false,
							is_paused: true,
							updatedAt: sql`CURRENT_TIMESTAMP`,
						})
						.where(eq(scheduleMessages.id, schedule_message.id));

					const all_sended = await db
						.select({ id: schedulemessagesSendMessages.id })
						.from(schedulemessagesSendMessages)
						.where(
							and(
								eq(
									schedulemessagesSendMessages.schedule_message_id,
									schedule_message.id,
								),
								eq(schedulemessagesSendMessages.is_sended, false),
							),
						);

					const count = all_sended && all_sended.length ? all_sended.length : 0;

					log.info({
						module: 'services',
						success: true,
						text: `Campanha "${schedule_message.title}" de ID: ${schedule_message.id} com ${count} contatos sem enviar!`,
					});

					log.info({
						success: true,
						module: 'services',
						text: `Finalizou a campanha "${schedule_message.title}" de ID: ${schedule_message.id}`,
					});

					clearCampaignCounter(schedule_message.id);
				} catch (error) {
					log.info({
						success: false,
						module: 'services',
						text: `Erro no envio da campanha "${schedule_message.title}" de ID: ${schedule_message.id} - ${JSON.stringify(error, null, 2)}`,
					});
				}
			}
		}
	} catch (error) {
		log.info({
			success: false,
			module: 'worker',
			text: `[ERROR campaign_worker] Erro crítico no worker da campanha: ${error?.message || 'Erro desconhecido'}`,
			error: error?.stack || 'Stack trace não disponível',
		});

		// IMPORTANTE: Não lançar erro aqui! Segundo documentação BullMQ,
		// erros na função do worker devem ser tratados internamente
		// O evento 'error' do worker é apenas para problemas de conexão/infraestrutura
	} finally {
		log.info({
			module: 'worker',
			success: true,
			text: `[INFO campaign_worker] Finalizando processamento de job de campanha`,
		});
	}
}
