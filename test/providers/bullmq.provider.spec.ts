import { Queue } from 'bullmq';

import log from '@/logs';

import Bullmq from '../../src/providers/bullmq.provider';

describe('bullmqProvider', () => {
	let bullmq: Bullmq;
	let publicQueue: Queue;
	let privateQueue: Queue;
	let reportQueue: Queue;

	beforeEach(() => {
		bullmq = new Bullmq();
		publicQueue = bullmq.createQueue('public');
		privateQueue = bullmq.createQueue('private');
		reportQueue = bullmq.createQueue('report');
	});

	afterAll(async () => {
		try {
			await bullmq.close();
		} catch (error) {
			log.error(error, 'Error closing bullmq in test');
		}
	});

	it('should be defined', () => {
		expect(bullmq).toBeDefined();
	});

	it('should create three queues', async () => {
		expect(publicQueue).toBeDefined();
		expect(privateQueue).toBeDefined();
		expect(reportQueue).toBeDefined();
	});

	it('should add processFunction to a queue', async () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const mockPublicWorker = async (_message: string) => {};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const mockPrivateWorker = async (_message: string) => {};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const mockReportWorker = async (_message: string) => {};

		const publicWorkerJob = await bullmq.processJob(
			publicQueue.name,
			mockPublicWorker,
		);
		const privateWorkerJob = await bullmq.processJob(
			privateQueue.name,
			mockPrivateWorker,
		);
		const reportWorkerJob = await bullmq.processJob(
			reportQueue.name,
			mockReportWorker,
		);

		expect(publicWorkerJob).toBeDefined();
		expect(privateWorkerJob).toBeDefined();
		expect(reportWorkerJob).toBeDefined();
	});

	it('should add a job to a queue', async () => {
		const message = `{"messagings_id":null,"message":"Mensagem de testet","destinaries":[{"id":1,"name":"Diego Pereira","last_name":null,"notes":null,"number":"558896781666","meta_id":null,"telegram_chat_id":null,"email":null,"cpf":null,"client_company":null}],"research_ids":null,"connections":[{"id":3,"name":"OI","serialized_id":"558888093584:13@s.whatsapp.net","api_container_url":"http://localhost:4001/"}],"schedule_message":{"id":127,"company_id":1,"research_ids":null,"chat_bot_id":null,"type":"whatsapp","contacts":[],"media_path":null,"media_type":null,"audio_path":null,"all_contacts":false,"send_contacts":"1","template_id":null,"timezone":"America/Sao_Paulo","tags":"","template_contexts":[],"csv_contacts":false},"page":2}`;

		const publicWorkerJob = await bullmq.addJobToQueue('public', message);
		const privateWorkerJob = await bullmq.addJobToQueue('private', message);
		const reportWorkerJob = await bullmq.addJobToQueue('report', message);

		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		expect(publicWorkerJob).toBeDefined();
		expect(privateWorkerJob).toBeDefined();
		expect(reportWorkerJob).toBeDefined();
		expect(publicWorkerJob).toMatch(uuidRegex);
		expect(privateWorkerJob).toMatch(uuidRegex);
		expect(reportWorkerJob).toMatch(uuidRegex);
	});
});
