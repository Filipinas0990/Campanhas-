import axios from 'axios';
import { eq } from 'drizzle-orm';

import { db } from '@/database';
import log from '@/logs';
import { smsCredit } from '@/migrations/schemas/schema';
import { registerReportService } from '@/services/campaigns';

import { decrementSmsCreditService } from '.';

interface IScheduleMessage {
	id: number;
	company_id: number;
	research_ids: number[];
	type: string;
	csv_contacts: boolean;
	timezone: string;
}

interface IProps {
	message: string;
	contact: {
		id: number;
		name: string | null;
		number: string | null;
	};
	company_id: number;
	schedule_message: IScheduleMessage;
}
export default async function sendSMSService({
	message,
	contact,
	company_id,
	schedule_message,
}: IProps) {
	const sms_credit = await db.query.smsCredit.findFirst({
		where: eq(smsCredit.company_id, company_id),
	});

	if (!sms_credit || sms_credit?.credit <= 0 || !contact.number) {
		log.info({
			module: 'services',
			msg: `Sem crédito de SMS para empresa de ID ${company_id}`,
			success: false,
		});
		return;
	}

	const phone_number = Number(contact.number.slice(2));
	const url = `http://painel.kingsms.com.br/kingsms/api.php?acao=sendsms&login=${process.env.LOGIN_SMS}&token=${process.env.TOKEN_SMS}&numero=${phone_number}&msg=${message}`;
	try {
		axios
			.post(url)
			.then(async ({ data }) => {
				if (data.status === 'error') {
					throw new Error(data.cause);
				} else if (data.status === 'success') {
					await registerReportService({
						schedule_message,
						contact,
						number: 'SMS',
						is_sended: true,
					});
					await decrementSmsCreditService({
						company_id: schedule_message.company_id,
					});
				}
			})
			.catch(error =>
				log.info({
					module: 'services',
					msg: `Error on sendSMSService  ${error}`,
					success: false,
				}),
			);
	} catch (error) {
		log.info({
			module: 'services',
			msg: `Error on sendSMSService  ${error}`,
			success: false,
		});
	}
}
