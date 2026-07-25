/* eslint-disable @typescript-eslint/no-explicit-any */
import { Queue, Worker } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { queueConfig } from '@/configs';
import log from '@/logs';
import { runCron } from '@/services/schedule/runCron';
// import campaignWorker from '@/workers/campaign.worker';
import reportWorker from '@/workers/report.worker';

export type JobType =
	| 'waiting'
	| 'active'
	| 'completed'
	| 'failed'
	| 'delayed'
	| 'paused';

export type JobCounts = {
	[K in JobType]?: number;
};

export interface IQueueInfo {
	name: string;
	jobCounts: JobCounts;
}

interface IConnectionOptions {
	host?: string;
	port?: number;
	password?: string;
	tls: boolean;
	maxRetriesPerRequest: number | null;
	retryStrategy: (times: number) => number;
}

const connection: IConnectionOptions = {
	host: queueConfig.redisHost,
	port: queueConfig.redisPort,
	password: queueConfig.redisPassword,
	tls: queueConfig.tls,
	maxRetriesPerRequest: null,
	retryStrategy(times: number): number {
		return Math.min(times * 1000, 3000);
	},
};

export default class Bullmq {
	private queues: { [key: string]: Queue } = {};
	private processedQueues: { [key: string]: Worker } = {};

	createQueue(queueName: string): Queue {
		if (!this.queues[queueName]) {
			const queue = new Queue(queueName, { connection });
			this.queues[queueName] = queue;
			queue.on('error', error => {
				log.info({
					module: 'system',
					success: false,
					print: true,
					msg: `Queue error: ${error.message}`,
					error: error.message,
				});
			});
			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Fila ${queueName} criada com sucesso!`,
			});
			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Fila ${queueName} criada com sucesso!`,
			});
		}
		return this.queues[queueName];
	}

	async addJobToQueue(
		queueName: string,
		data: any,
		options?: any,
	): Promise<string> {
		try {
			const queue = this.queues[queueName];
			const jobId = uuidv4();

			const job = await queue.add('job', data, {
				jobId,
				...options,
			});

			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Job ${job.id} adicionado na fila ${queueName} com sucesso!`,
			});

			log.info({
				module: 'consume',
				success: true,
				print: true,
				msg: `Job adicionado com sucesso na fila ${queueName}!`,
			});
			return job.id!.toString();
		} catch (error) {
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Erro ao adicionar job na fila ${queueName}!`,
				error: error.message,
			});
			throw new Error(
				`Erro ao adicionar job na fila ${queueName}: ${error.message}`,
			);
		}
	}

	async removeQueue(queueName: string): Promise<void> {
		try {
			if (this.queues[queueName]) {
				await this.queues[queueName].drain();
				log.info({
					module: 'system',
					success: true,
					print: true,
					msg: `Drenou a fila: ${queueName}`,
				});

				const response = await this.queues[queueName].obliterate({
					force: true,
				});

				log.info({
					module: 'system',
					success: true,
					print: true,
					msg: `Obliterou a fila: ${JSON.stringify({ queueName, response }, null, 2)}`,
				});

				if (this.processedQueues[queueName]) {
					try {
						await this.processedQueues[queueName].close();
						log.info({
							module: 'system',
							success: true,
							print: true,
							text: `Worker da fila ${queueName} fechado com sucesso`,
						});
					} catch (workerError) {
						log.info({
							module: 'system',
							success: false,
							print: true,
							text: `[ERROR bullmq] Erro ao fechar worker da fila ${queueName}: ${workerError.message}`,
							error: workerError.message,
						});
					}
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { [queueName]: workerToRemove, ...restWorkers } =
						this.processedQueues;
					this.processedQueues = restWorkers;
				}

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [queueName]: _, ...rest } = this.queues;
				this.queues = rest;
				log.info({
					module: 'system',
					success: true,
					print: true,
					msg: `Fila ${queueName} e seus workers foram removidos com sucesso!`,
				});
			}
		} catch (error) {
			log.error(error, `Error removing queue ${queueName}`);
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Erro ao remover a fila ${queueName}!`,
				error: error.message,
			});
			throw new Error(`Erro ao remover a fila ${queueName}: ${error.message}`);
		}
	}

	async clearQueue(queueName: string) {
		try {
			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `INICIANDO A Limpeza da Fila: ${queueName}`,
			});
			if (this.queues[queueName]) {
				await this.queues[queueName].drain();
				return true;
			}
			log.warn({
				module: 'system',
				success: false,
				print: true,
				msg: `Fila não encontrada: ${queueName}`,
			});
			return false;
		} catch (error) {
			log.error(error, 'Error clearing queue');
			return false;
		}
	}

	async getQueues(): Promise<{ name: string; jobCounts: any }[]> {
		try {
			const queueList: IQueueInfo[] = [];

			for await (const [queueName, queue] of Object.entries(this.queues)) {
				const jobCounts = await queue.getJobCounts(
					'waiting',
					'active',
					'completed',
					'failed',
					'delayed',
					'paused',
				);

				queueList.push({
					name: queueName,
					jobCounts,
				});
			}

			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Filas listadas com sucesso!`,
			});

			return queueList;
		} catch (error) {
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Erro ao listar filas!`,
				error: error.message,
			});

			throw new Error(`Erro ao listar filas: ${error.message}`);
		}
	}

	async processJob(
		queueName: string,
		processFunction: any,
		concurrency: number = 1,
	): Promise<Worker | undefined> {
		if (this.processedQueues[queueName]) {
			return undefined;
		}

		const worker = new Worker(
			queueName,
			async job => {
				try {
					await processFunction(job.data);
				} catch (jobError) {
					log.info({
						module: 'system',
						success: false,
						print: true,
						text: `[ERROR bullmq] Erro no processamento do job na fila ${queueName}: ${jobError.message}`,
						error: jobError.stack || jobError.message,
					});
					throw jobError;
				}
			},
			{
				connection,
				removeOnComplete: { count: 0 },
				removeOnFail: { count: 0 },
				concurrency,
				stalledInterval: 30000,
			},
		);

		this.processedQueues[queueName] = worker;

		log.info({
			module: 'system',
			success: true,
			print: true,
			msg: `Worker da fila ${queueName} criado com sucesso!`,
		});

		worker.on('error', error => {
			log.info({
				module: 'system',
				success: false,
				print: true,
				text: `[ERROR bullmq] Erro no worker da fila ${queueName}: ${error.message}`,
				error: error.stack || error.message,
			});
		});

		worker.on('failed', (job: any, err) => {
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Job with ID: ${job.id} failed error: ${JSON.stringify({ err }, null, 2)}`,
				error: err.message,
			});
			log.error(err, 'Job failed with error');
		});

		worker.on('completed', job => {
			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Job with ID: ${job.id} completed`,
			});
		});

		worker.on('stalled', (job: any) => {
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Job with ID: ${job.id} has stalled`,
				error: 'Stalled job',
			});
		});

		return worker;
	}

	async close() {
		try {
			await Promise.all(Object.values(this.queues).map(queue => queue.close()));

			await Promise.all(
				Object.values(this.processedQueues).map(worker => worker.close()),
			);

			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Filas e workers fechados com sucesso!`,
			});
		} catch (error) {
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Erro ao fechar filas ou workers!`,
				error: error.message,
			});
			log.error(error, 'Error closing queues or workers');
		}
	}

	async removeJob(queueName: string, jobId: string): Promise<string> {
		try {
			const jobIdToRemove = await this.addJobToQueue(
				queueConfig.queues.remove,
				{ queueName, jobId },
			);
			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Job de remoção com ID: ${jobIdToRemove} adicionado para remover o Job ID: ${jobId}`,
			});
			return jobIdToRemove;
		} catch (error) {
			log.error(
				error,
				`Error adding removal job for Job ID ${jobId} from queue ${queueName}`,
			);
			return '';
		}
	}

	async processRemoveJob(data: any): Promise<void> {
		const { queueName, jobId } = data;
		try {
			const queue = this.createQueue(queueName);
			const job = await queue.getJob(jobId);

			if (!job) {
				log.warn({
					module: 'system',
					success: false,
					print: true,
					msg: `Job com ID ${jobId} não encontrado na fila ${queueName}`,
				});
				return;
			}

			const state = await job.getState();

			if (state !== 'active') {
				await job.remove();
			}

			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Job com ID ${jobId} removido da fila ${queueName}`,
			});
		} catch (error) {
			log.error(
				error,
				`Error removing job with ID ${jobId} from queue ${queueName}`,
			);
		}
	}

	async removeCompletedAndFailedJobs(queueName: string): Promise<void> {
		try {
			const queue = this.createQueue(queueName);

			const completedJobs = await queue.getJobs(['completed']);
			const failedJobs = await queue.getJobs(['failed']);

			const allJobs = [...completedJobs, ...failedJobs];

			for await (const job of allJobs) {
				await job.remove();
				log.info({
					module: 'system',
					success: true,
					print: true,
					msg: `Job com ID ${job.id} removido da fila ${queueName}`,
				});
			}

			log.info({
				module: 'system',
				success: true,
				print: true,
				msg: `Successfully removed ${allJobs.length} completed and failed jobs from queue ${queueName}.`,
			});
		} catch (error) {
			log.error(error, `Error removing jobs from queue ${queueName}`);
			log.info({
				module: 'system',
				success: false,
				print: true,
				msg: `Erro ao remover jobs da fila ${queueName}!`,
				error: error.message,
			});
		}
	}
}

export const bullMQ = new Bullmq();

export async function startQueues() {
	bullMQ.createQueue(queueConfig.queues.report);
	await bullMQ.processJob(queueConfig.queues.report, reportWorker, 10);

	bullMQ.createQueue(queueConfig.queues.cron);
	await bullMQ.processJob(queueConfig.queues.cron, runCron, 3);

	bullMQ.createQueue(queueConfig.queues.remove);
	await bullMQ.processJob(
		queueConfig.queues.remove,
		bullMQ.processRemoveJob.bind(bullMQ),
	);

	log.info({
		module: 'system',
		success: true,
		print: true,
		msg: `Iniciando Filas!`,
	});
}
