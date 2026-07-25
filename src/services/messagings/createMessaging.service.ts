import log from '@/logs';
import CronMS from '@/providers/cronms.provider';

interface IProps {
	taskId: number;
	category: string;
	scheduleBy: string;
	sheduleInterval: string;
}

interface IReturn {
	status: number;
	message: string;
}

export default async function createMessagingService({
	category,
	taskId,
	scheduleBy,
	sheduleInterval,
}: IProps): Promise<IReturn> {
	const cronMS = new CronMS();

	const response = await cronMS.create({
		category,
		taskId,
		scheduleBy,
		sheduleInterval,
	});

	if (!response) {
		log.info({
			module: 'cron',
			success: false,
			msg: 'Ocorreu um erro ao criar o cron de mensageria!',
			data: JSON.stringify({ category, taskId, scheduleBy, sheduleInterval }),
		});

		return {
			status: 500,
			message: 'Erro ao criar mensageria!',
		};
	}

	log.info({
		module: 'cron',
		success: true,
		msg: 'Cron de mensageria criado com sucesso!',
		data: JSON.stringify({ category, taskId, scheduleBy, sheduleInterval }),
	});

	return {
		status: 200,
		message: 'Mensageria criada com sucesso!',
	};
}
