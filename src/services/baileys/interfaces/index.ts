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

interface IContact {
	id: number;
	name: string | null;
	number: string | null;
	meta_id?: string | null;
	telegram_chat_id?: string | null;
	email?: string | null;
	schedule_message_id?: number;
	whatsapp_id?: number;
}

export interface IScheduleMessage {
	id: number;
	company_id: number;
	timezone: string;
	research_ids: number[];
	type: string;
	csv_contacts: boolean;
	contacts?: { id: number; contact_id: number }[];
	audio_path?: string | null;
	media_path?: string | null;
	group_id?: number | null;
	selected_groups?: string | null;
}
export interface IProps {
	message: string;
	connections: IConnections[];
	contact: IContact;
	groupId?: string | null;
	index: number;
	schedule_message: IScheduleMessage;
}
