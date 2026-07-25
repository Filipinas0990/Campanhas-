/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyRequest } from 'fastify';

import { ITemplateContext } from '@/services/campaigns/create.service';

export type IFastifyRequestList = FastifyRequest<{
	Params: { id: number };
	Querystring: {
		company_id: number;
		limit: number;
		offset: number;
		page: string;
		id: number;
		type:
			| 'whatsapp'
			| 'whatsapp-oficial'
			| 'instagram'
			| 'telegram'
			| 'sms'
			| 'velip'
			| 'email';
		is_running: 'true' | 'false' | undefined;
		title: string;
		dateStart: string;
		dateEnd: string;
	};
	Body: {
		user_id: number;
		cron_id: number;
		schedule_id: string;
		schedule_candence_id: string;
		company_id: string;
		schedule_by: string;
	};
}>;

export type IFastifyRequestCreate = FastifyRequest<{
	Params: { id: string };
	Body: {
		user_id: number;
		title: string;
		message: string;
		send_contacts: string;
		contacts_ids: string;
		whatsapp_ids: string;
		tags: string;
		greetings_message: string;
		goodbye_message: string;
		repeat: string;
		research_id: string;
		signature: string;
		template_id: number;
		type: string;
		subject: string;
		email_color: string;
		email_template: string;
		timezone: string;
		all_contacts: boolean;
		cluster_name: string | null;
		is_running: boolean;
		is_sending: boolean;
		is_paused: boolean;
		company_id: number;
		chat_bot_id: string | null;
		media_path: string | null;
		media_type: string | null;
		audio_path: string | null;
		start_date: Date | null;
		end_date: Date | null;
		schedule_by: string;
		csv_location: string | null;
		csv_originalname: string | null;
		messaging_id: number | null;
		template_contexts: ITemplateContext[];
		restrict_ddd: boolean;
		selected_groups: string[] | null;
		group_id: number | null;
	};
}>;
