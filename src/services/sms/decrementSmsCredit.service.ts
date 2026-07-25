import { eq } from 'drizzle-orm';

import { db } from '@/database';
import log from '@/logs';
import { smsCredit } from '@/migrations/schemas/schema';

export default async function decrementSmsCreditService({ company_id }) {
	try {
		const sms_credit = await db.query.smsCredit.findFirst({
			where: eq(smsCredit.company_id, company_id),
		});

		if (!sms_credit || sms_credit?.credit <= 0) {
			log.info({
				module: 'services',
				msg: `Sem crédito de SMS para empresa de ID ${company_id}`,
				success: false,
			});
			return;
		}

		await db
			.update(smsCredit)
			.set({
				credit: sms_credit.credit - 1,
			})
			.where(eq(smsCredit.company_id, company_id));
	} catch (error) {
		log.info({
			module: 'services',
			msg: `Error on decrementSmsCreditService  ${error}`,
			success: false,
		});
	}
}
