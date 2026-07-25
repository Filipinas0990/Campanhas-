import consumerScript from '@/scripts/consumer.scripts';

interface IReturn {
	status: number;
	message: string;
}

export default async function restartMessagingService(): Promise<IReturn> {
	consumerScript();

	return {
		status: 200,
		message: 'Mensageria reiniciada com sucesso!',
	};
}
