import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/database';
import log from '@/logs';
import {
	messagings,
	messagingsInterval,
	scheduleMessages,
} from '@/migrations/schemas/schema';
import { startService } from '@/services/campaigns';

dayjs.extend(utc);
dayjs.extend(timezone);

interface IProps {
	id: number;
	running: boolean;
}

interface IReturn {
	status: number;
	message: string;
}

export default async function runningMessagingService({
	id,
	running,
}: IProps): Promise<IReturn> {
	try {
		const messagingsIntervals = await db.query.messagingsInterval.findFirst({
			where: and(
				eq(messagings.id, id),
				isNull(messagings.deletedAt),
				isNull(messagingsInterval.deletedAt),
			),
			columns: {
				id: true,
				messagingId: true,
			},
		});

		if (!messagingsIntervals) {
			return {
				status: 500,
				message: 'Não foi possivel encontrar o interval da mensageria!',
			};
		}

		await db
			.update(messagings)
			.set({
				running,
			})
			.where(eq(messagings.id, messagingsIntervals.messagingId));

		log.info({
			module: 'consume',
			success: true,
			msg: `${running ? 'Abrindo' : 'Fechando'} menssageria de ID: ${id}!`,
		});

		if (running) {
			const schedules_messages = await db.query.scheduleMessages.findMany({
				columns: { id: true, start_date: true, timezone: true },
				with: { cadence: true },
				where: and(
					eq(scheduleMessages.is_running, false),
					eq(scheduleMessages.messagings_id, messagingsIntervals.messagingId),
					isNull(scheduleMessages.deletedAt),
				),
			});

			if (schedules_messages.length >= 0) {
				await Promise.all(
					schedules_messages.map(schedule_message => {
						const now = dayjs.utc().tz(schedule_message.timezone);
						const sendDate = dayjs(schedule_message.start_date)
							.utc()
							.tz(schedule_message.timezone);

						if (sendDate.isBefore(now) || sendDate.isSame(now)) {
							log.info({
								module: 'services',
								success: true,
								msg: `Campanha ID: ${schedule_message.id} iniciada!`,
							});

							return startService({ id: schedule_message.id });
						}

						return log.info({
							module: 'services',
							success: true,
							msg: `Mensageria ID: ${messagingsIntervals.messagingId} ignorando camapanha ID:${schedule_message.id}!`,
						});
					}),
				);
			}
		}

		return {
			status: 200,
			message: 'Mensageria atualizada com sucesso!',
		};
	} catch (error) {
		return {
			status: 500,
			message: 'Erro ao atualizar o rodando da mensageria!',
		};
	}
}
