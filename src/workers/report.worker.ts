import { db } from '@/database';
import log from '@/logs';
import { schedulemessagesSendMessages } from '@/migrations/schemas/schema';

export default async function reportWorker(message: string) {
	const { contacts } = JSON.parse(message);
	try {
		await db.insert(schedulemessagesSendMessages).values(contacts);
	} catch (error) {
		log.error(error, 'Error on create campaign report');
	}
}
