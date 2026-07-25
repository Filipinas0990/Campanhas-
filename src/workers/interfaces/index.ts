import { ITemplateContext } from '@/services/campaigns/create.service';

export interface IProps {
	message: string;
}

interface IScheduleMessages {
	id: number;
	company_id: number;
	research_ids: number[];
	type: string;
	timezone: string;
	csv_contacts: boolean;
	chat_bot_id: number;
	template_id?: number;
	template_contexts: ITemplateContext[];
	contacts?: { id: number; contact_id: number }[];
	greeting_messages: string[];
	goodbye_messages: string[];
}
interface IConnections {
	id: number;
	name: string;
	serialized_id?: string | null;
	api_container_url?: string | null;
	meta_token?: string | null;
	meta_page_id?: string | null;
	insta_id?: string | null;
	wab_token?: string | null;
	wab_business_phonenumber_id?: string | null;
	wab_business_id?: string | null;
	wab_business_number: string | null;
}

export interface IContacts {
	id: number;
	name: string | null;
	last_name: string | null;
	number: string | null;
	meta_id?: string | null;
	telegram_chat_id?: string | null;
	email?: string | null;
	schedule_message_id?: number;
	cpf?: string | null;
	client_company?: string | null;
}
export interface ICreateCampaignDTO {
	page: number;
	type: string;
	message: string;
	timezone: string;
	destinaries: IContacts[];
	connections: IConnections[];
	schedule_message: IScheduleMessages;
	messaging_id: number | null;
	contacts_id: { id: number; name: string; number: string }[];
	category: string;
}
export interface IPrivateCreateCampaignDTO {
	page: number;
	type: string;
	message: string;
	timezone: string;
	destinaries: IContacts[];
	connections: IConnections[];
	schedule_message: IScheduleMessages;
	messagings_id: number;
	contacts_id: { id: number; name: string; number: string }[];
}

export interface ICreateCadenceDTO {
	id: number;
	schedule_message: IScheduleMessages;
	page: number;
	type: string;
	message: string;
	destinaries: IContacts[];
	connections: IConnections[];
	contacts_id: { id: number; name: string; number: string }[];
}
