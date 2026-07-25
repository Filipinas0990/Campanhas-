import CronMS from '@/providers/cronms.provider';
import consumerScript from '@/scripts/consumer.scripts';

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

export default async function deleteMessagingService({
	taskId,
	category,
	scheduleBy,
	sheduleInterval,
}: IProps): Promise<IReturn> {
	const cronMS = new CronMS();

	const response = await cronMS.update({
		taskId,
		category,
		scheduleBy,
		sheduleInterval,
	});

	if (!response) {
		return {
			status: 500,
			message: 'Erro ao atualizar mensageria!',
		};
	}

	consumerScript();

	return {
		status: 200,
		message: 'Mensageria atualizada com sucesso!',
	};
}
