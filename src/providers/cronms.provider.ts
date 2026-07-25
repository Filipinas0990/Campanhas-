import axios from 'axios';

import { microserviceConfig } from '@/configs';
import log from '@/logs';

interface ICreateUpdateProps {
	taskId: number;
	category: string;
	scheduleBy: string;
	scheduleDate?: string;
	sheduleInterval?: string;
}

interface IDeleteProps {
	category: string;
	taskId: number;
}

export default class CronMS {
	constructor() {}

	async create({
		category,
		taskId,
		scheduleDate,
		sheduleInterval,
		scheduleBy,
	}: ICreateUpdateProps): Promise<boolean> {
		try {
			await axios.post(`${microserviceConfig.scheduleMS}/create`, {
				category,
				task_id: taskId,
				schedule_date: scheduleDate,
				schedule_interval: sheduleInterval,
				schedule_by: scheduleBy,
			});

			log.info({
				module: 'cron',
				success: true,
				msg: `Agendamento criado com sucesso.`,
				data: JSON.stringify({
					category,
					task_id: taskId,
					schedule_date: scheduleDate,
					schedule_interval: sheduleInterval,
					schedule_by: scheduleBy,
				}),
			});

			return true;
		} catch (error) {
			log.info({
				module: 'cron',
				success: false,
				msg: `Erro ao criar agendamento.`,
				error: String(error),
				data: JSON.stringify({
					category,
					task_id: taskId,
					schedule_date: scheduleDate,
					schedule_interval: sheduleInterval,
					schedule_by: scheduleBy,
				}),
			});

			return false;
		}
	}

	async delete({ category, taskId }: IDeleteProps): Promise<boolean> {
		try {
			await axios.delete(`${microserviceConfig.scheduleMS}/delete`, {
				data: {
					category,
					tasks_ids: [taskId],
				},
			});

			log.info({
				module: 'cron',
				success: true,
				msg: `Agendamento deletado com sucesso.`,
				data: JSON.stringify({
					category,
					task_id: taskId,
				}),
			});

			return true;
		} catch (error) {
			log.info({
				module: 'cron',
				success: false,
				msg: `Erro ao deletar agendamento.`,
				error: String(error),
				data: JSON.stringify({
					category,
					task_id: taskId,
				}),
			});

			return false;
		}
	}

	async update({
		category,
		taskId,
		scheduleDate,
		sheduleInterval,
		scheduleBy,
	}: ICreateUpdateProps): Promise<boolean> {
		try {
			await axios.put(`${microserviceConfig.scheduleMS}/update`, {
				category,
				task_id: taskId,
				schedule_date: scheduleDate,
				schedule_interval: sheduleInterval,
				schedule_by: scheduleBy,
			});

			log.info({
				module: 'cron',
				success: true,
				msg: `Agendamento atualizado com sucesso.`,
				data: JSON.stringify({
					category,
					task_id: taskId,
					schedule_date: scheduleDate,
					schedule_interval: sheduleInterval,
					schedule_by: scheduleBy,
				}),
			});

			return true;
		} catch (error) {
			log.info({
				module: 'cron',
				success: false,
				msg: `Erro ao atualizar agendamento.`,
				error: String(error),
				data: JSON.stringify({
					category,
					task_id: taskId,
					schedule_date: scheduleDate,
					schedule_interval: sheduleInterval,
					schedule_by: scheduleBy,
				}),
			});

			return false;
		}
	}
}
