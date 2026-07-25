import chillout from 'chillout';
import { and, eq, inArray } from 'drizzle-orm';
import path from 'path';

import { db } from '@/database';
import log from '@/logs';
import {
	contacts as contactsDB,
	schedulemessagesContacts,
	groups,
} from '@/migrations/schemas/schema';
import sendResearch from '@/services/sendResearch.service';
import { formatToWhatsAppFormat, sleep } from '@/utils';
import mimeTypesMap from '@/utils/mimeTypesMap';

import { registerReportService } from '../campaigns';
import BaileysInstance from './BaileysInstance';
import { IProps } from './interfaces';

const campaignConnectionCounter = new Map<number, number>();

function getConnectionIndexForCampaign(
	campaignId: number,
	contactId: number,
	connectionsLength: number,
): number {
	if (!campaignConnectionCounter.has(campaignId)) {
		campaignConnectionCounter.set(campaignId, 0);
	}

	const counter = campaignConnectionCounter.get(campaignId)!;
	const connectionIndex = counter % connectionsLength;

	campaignConnectionCounter.set(campaignId, counter + 1);

	return connectionIndex;
}

export function clearCampaignCounter(campaignId: number): void {
	campaignConnectionCounter.delete(campaignId);
}

function getMessageMedia(file_path: string) {
	let mime_type = null;

	if (typeof file_path !== 'string') {
		mime_type = null;
	}

	const last = file_path.replace(/^.*[/\\]/, '').toLowerCase();
	const ext = last.replace(/^.*\./, '').toLowerCase();

	const hasPath = last.length < file_path.length;
	const hasDot = ext.length < last.length - 1;

	if (!hasDot && hasPath) {
		mime_type = null;
	} else {
		mime_type = mimeTypesMap.get(ext);
	}

	const new_media = {
		path: file_path,
		mimetype: mime_type,
		originalname: path.basename(file_path),
	};

	return new_media;
}

export default async function sendBaileysMessage({
	message,
	connections,
	contact,
	schedule_message,
}: IProps) {
	try {
		let sended = false;
		const randomDelay = [
			2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
			13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
		];

		const connectionIndex = getConnectionIndexForCampaign(
			schedule_message.id,
			contact.id,
			connections.length,
		);
		let selectedConnection = connections[connectionIndex];

		if (contact.number?.endsWith('@g.us')) {
			const groupData = await db
				.select({
					whatsapp_id: groups.whatsapp_id,
				})
				.from(groups)
				.where(eq(groups.group_id, contact.number))
				.limit(1);

			if (groupData.length > 0 && groupData[0].whatsapp_id) {
				const correctConnection = connections.find(
					conn => conn.id === groupData[0].whatsapp_id,
				);
				if (correctConnection) {
					selectedConnection = correctConnection;
				}
			}
		}

		const baileysInstance = new BaileysInstance({
			id: selectedConnection?.id,
			url: selectedConnection?.api_container_url,
		});
		const delayTime = Math.round(Math.random() * 6);
		await sleep(randomDelay[delayTime]);

		if (
			schedule_message.research_ids &&
			schedule_message.research_ids.length > 0
		) {
			const { success, ticketOpen } = await sendResearch({
				index: connectionIndex,
				contact,
				connections,
				baileysInstance,
				type: 'whatsapp',
				company_id: schedule_message.company_id,
				research_ids: schedule_message.research_ids,
			});

			await registerReportService({
				contact,
				ticketOpen,
				schedule_message,
				is_sended: !!success,
			});

			return;
		}

		if (schedule_message.media_path) {
			const media = getMessageMedia(schedule_message.media_path);
			const isGroup = (contact.number as string)?.endsWith('@g.us');

			const { data } = await baileysInstance.sendMessage({
				type: 'media',
				...(isGroup
					? { groupId: contact.number as string }
					: { contact: contact.number as string }),
				payload: {
					media,
					api: true,
					text: formatToWhatsAppFormat(message),
					companyId: schedule_message.company_id,
				},
			});

			if (data) {
				sended = true;
			}
		} else {
			const isGroup = (contact.number as string)?.endsWith('@g.us');
			const { data } = await baileysInstance.sendMessage({
				type: 'text',
				...(isGroup
					? { groupId: contact.number as string }
					: { contact: contact.number as string }),
				payload: {
					api: true,
					text: formatToWhatsAppFormat(message),
					companyId: schedule_message.company_id,
				},
			});

			if (data) {
				sended = true;
			}
		}

		if (schedule_message.audio_path) {
			const audio = getMessageMedia(schedule_message.audio_path);
			const isGroup = (contact.number as string)?.endsWith('@g.us');

			await baileysInstance.sendMessage({
				type: 'media',
				...(isGroup
					? { groupId: contact.number as string }
					: { contact: contact.number as string }),
				payload: {
					api: true,
					media: audio,
					companyId: schedule_message.company_id,
				},
			});
		}

		if (schedule_message.contacts && schedule_message.contacts.length > 0) {
			const contacts_ids = schedule_message.contacts.map(item =>
				Number(item.contact_id),
			);

			const contacts = await db
				.select({
					name: contactsDB.name,
					number: contactsDB.number,
				})
				.from(contactsDB)
				.leftJoin(
					schedulemessagesContacts,
					eq(schedulemessagesContacts.contact_id, contactsDB.id),
				)
				.where(
					and(
						inArray(contactsDB.id, contacts_ids),
						eq(contactsDB.company_id, schedule_message.company_id),
						eq(
							schedulemessagesContacts.schedule_message_id,
							schedule_message.id,
						),
					),
				);

			if (contacts && contacts.length <= 0) {
				return;
			}

			await chillout.forEach(contacts, async item => {
				try {
					const vcard =
						'BEGIN:VCARD\n' +
						'VERSION:3.0\n' +
						`FN:${item.name}\n` +
						'ORG:;\n' +
						`TEL;type=CELL;type=VOICE;waid=${item.number}:${item.number}\n` +
						'END:VCARD';

					const isGroup = (contact.number as string)?.endsWith('@g.us');

					await baileysInstance.sendMessage({
						type: 'contact',
						...(isGroup
							? { groupId: contact.number as string }
							: { contact: contact.number as string }),
						payload: {
							contacts: {
								displayName: item.name as string,
								contacts: [{ vcard, name: item.name as string }],
							},
							api: true,
							companyId: schedule_message.company_id,
						},
					});
				} catch (error) {
					log.info({
						module: 'services',
						msg: `Erro ao enviar contato ${error}`,
						success: false,
					});
				}
			});
		}

		await registerReportService({
			contact,
			schedule_message,
			is_sended: !!sended,
		});

		log.info({
			module: 'services',
			success: true,
			msg: `Enviando mensagem da campanha: ${JSON.stringify({ companyId: schedule_message.company_id, campaign_id: schedule_message.id, contact }, null, 2)}`,
		});
	} catch (error) {
		await registerReportService({
			contact,
			schedule_message,
			is_sended: false,
		});
		log.error(error, 'Error sending message via Baileys');
	}
}
