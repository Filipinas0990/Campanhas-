import axios from 'axios';
import csvParser from 'csv-parser';
import { SQL, sql } from 'drizzle-orm';

import { db } from '@/database/db.database';
import log from '@/logs';
import { scheduleMessageCsv } from '@/migrations/schemas/schema';

interface IProps {
	ddi: string;
	ddd: string;
	nome: string;
	whatsapp: string;
}

type IPropsCsv = {
	schedule_message_id: number;
	name: string;
	number: string;
	createdAt: SQL;
};

export default async function cvsReader({ awsFileUrl, schedule_message_id }) {
	try {
		const { data } = await axios.get(awsFileUrl, { responseType: 'stream' });

		const csvData: IPropsCsv[] = [];

		return new Promise<void>((resolve, reject) => {
			data
				.pipe(
					csvParser({
						separator: ';',
						mapHeaders: ({ header }) => header.toLowerCase().trim(),
					}),
				)
				.on('data', async (data: IProps) => {
					try {
						if (data.nome && data.ddd && data.ddi && data.whatsapp) {
							const correct_number = data.ddi + data.ddd + data.whatsapp;

							csvData.push({
								schedule_message_id,
								name: data.nome,
								number: correct_number,
								createdAt: sql`CURRENT_TIMESTAMP`,
							});
						}
					} catch (error) {
						log.info({
							success: false,
							module: 'services',
							msg: `Error reading row on cvsReader: ${error.message}`,
						});
					}
				})
				.on('end', async () => {
					try {
						await db.transaction(async trx => {
							await trx.insert(scheduleMessageCsv).values(csvData);
						});

						log.info({
							success: true,
							module: 'services',
							text: `Terminou a leitura do Csv: ${csvData.length} registros inseridos`,
						});

						resolve();
					} catch (error) {
						log.info({
							success: false,
							module: 'services',
							msg: `Erro ao fazer a inserção em lote: ${error.message}`,
						});
						reject(error);
					}
				})
				.on('error', error => {
					reject(error);
				});
		});
	} catch (error) {
		log.error(error, 'Error on CSV parser service');
		throw new Error('Erro ao fazer a leitura do arquivo da AWS');
	}
}
