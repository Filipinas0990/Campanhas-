import axios from 'axios';

import log from '@/logs';

interface IData {
	meta_id: string;
	message: string;
	media?: {
		mimetype: string;
		media_url: string;
	};
}

class FacebookInstance {
	meta_page_id: string;
	meta_token: string;

	constructor({ meta_page_id, meta_token }) {
		this.meta_page_id = meta_page_id;
		this.meta_token = meta_token;
	}

	getApi() {
		const api = axios.create({
			baseURL: `https://graph.facebook.com/v16.0/${this.meta_page_id}`,
		});

		return api;
	}

	async getShortLivedToken({ longLivedToken }: { longLivedToken: string }) {
		try {
			const api = this.getApi();

			const { data } = await api.get(
				`?fields=access_token&access_token=${longLivedToken}`,
			);

			const token = data.access_token;

			return { token };
		} catch (error) {
			log.info({
				success: false,
				module: 'services',
				msg: `Error on getShortLivedToken: ${error?.response?.data || error}`,
			});

			return { token: null };
		}
	}

	async sendTextMessage({ meta_id, message }: IData) {
		try {
			const api = this.getApi();

			const { token } = await this.getShortLivedToken({
				longLivedToken: this.meta_token,
			});

			if (!token) {
				return { data: [], success: false };
			}

			const { data } = await api.post('/messages', {
				recipient: { id: meta_id },
				message: { msg: message },
				messaging_type: 'RESPONSE',
				access_token: token,
			});

			return { data, success: true };
		} catch (error) {
			log.info({
				success: false,
				module: 'services',
				msg: `Error on sendTextMessage: ${error.response.data}`,
			});

			return { data: [], success: false };
		}
	}

	async sendMediaMessage({ meta_id, media }: IData) {
		try {
			const api = this.getApi();

			const { token } = await this.getShortLivedToken({
				longLivedToken: this.meta_token,
			});

			if (!token) {
				return { data: [], success: false };
			}

			const { data } = await api.post('/messages', {
				recipient: { id: meta_id },
				message: {
					attachment: {
						type: media?.mimetype.split('/')[0],
						payload: {
							url: media?.media_url,
							is_reusable: 'true',
						},
					},
				},
				access_token: token,
			});

			return { data, success: true };
		} catch (error) {
			log.info({
				success: false,
				module: 'services',
				msg: `Error on sendMediaMessage: ${error.response.data}`,
			});

			return { data: [], success: false };
		}
	}
}

export default FacebookInstance;
