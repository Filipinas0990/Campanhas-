import axios from 'axios';

import log from '@/logs';
import { sleep } from '@/utils';

interface IData {
	type: 'text' | 'media' | 'contact';
	contact?: string;
	groupId?: string;
	payload: {
		contacts?: {
			displayName: string;
			contacts: { vcard: string; name: string }[];
		};
		text?: string | null;
		api: boolean;
		media?: { path: string; originalname: string; mimetype: string | null };
		companyId: number;
	};
}
class BaileysInstance {
	url: string;
	id: number;

	constructor({ url, id }) {
		this.url = url;
		this.id = id;
	}

	getApi() {
		const api = axios.create({
			baseURL: this.url,
			headers: {
				'Content-Type': 'application/json',
				secretKey: process.env.BAILEYS_API_SECRET_KEY,
			},
		});

		return api;
	}

	async sendMessage(apiData: IData, retry = 0) {
		try {
			const api = this.getApi();

			const { data } = await api.post(`/message/send/${this.id}`, {
				...apiData,
				isCampaign: true,
			});

			return { data };
		} catch (error) {
			if (retry < 3) {
				log.info({
					success: false,
					module: 'services',
					msg: `Error on sendMessage: ${error?.response?.data?.message || error} - Retrying... ${retry + 1}`,
				});

				await sleep(2000);

				return this.sendMessage(apiData, retry + 1);
			}

			log.info({
				success: false,
				module: 'services',
				msg: `Error on sendMessage: ${error?.response?.data?.message || error}`,
			});

			throw new Error(error);
		}
	}

	async checkContact(contact: string) {
		try {
			const api = this.getApi();

			const response = await api.post(`/contact/check/${this.id}`, {
				contact,
			});

			return response.data;
		} catch (error) {
			log.info({
				success: false,
				module: 'services',
				msg: `Error on checkContact: ${error.message}`,
			});

			throw new Error(error?.response?.data?.message || error.message);
		}
	}
}

export default BaileysInstance;
