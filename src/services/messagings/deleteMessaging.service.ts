import CronMS from '@/providers/cronms.provider';
import consumerScript from '@/scripts/consumer.scripts';

interface IProps {
	taskId: number;
	category: string;
}

interface IReturn {
	status: number;
	message: string;
}

export default async function deleteMessagingService({
	taskId,
	category,
}: IProps): Promise<IReturn> {
	const cronMS = new CronMS();

	const response = await cronMS.delete({
		category,
		taskId,
	});

	if (!response) {
		return {
			status: 500,
			message: 'Erro ao deletar mensageria!',
		};
	}

	consumerScript();

	return {
		status: 200,
		message: 'Mensageria deletada com sucesso!',
	};
}
