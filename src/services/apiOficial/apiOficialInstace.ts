/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

import log from '@/logs';

interface ITemplate {
	messaging_product: string;
	preview_url: boolean;
	recipient_type: string;
	to: string;
	type: string;
	template: {
		name: string;
		language: { code: string };
		components: any;
	};
}
interface IData {
	template: ITemplate;
}

class ApiOficialInstace {
	phone_number_id: string;
	wab_token: string;

	constructor({ phone_number_id, wab_token }) {
		this.phone_number_id = phone_number_id;
		this.wab_token = wab_token;
	}

	getApi() {
		const api = axios.create({
			baseURL: `https://graph.facebook.com/v20.0/`,
		});

		return api;
	}

	async sendTemplate({ template }: IData) {
		try {
			const api = this.getApi();

			const { data } = await api.post(
				`${this.phone_number_id}/messages`,
				{
					...template,
				},
				{ headers: { Authorization: `Bearer ${this.wab_token}` } },
			);

			return { data, success: true };
		} catch (error) {
			const axiosError = axios.isAxiosError(error) ? error : null;
			log.error(
				{
					err: error,
					context: {
						phone_number_id: this.phone_number_id,
						template_name: template.template.name,
						template_language: template.template.language?.code,
						recipient: template.to,
					},
					meta_response: axiosError
						? {
								status: axiosError.response?.status,
								data: axiosError.response?.data,
								headers: axiosError.response?.headers,
							}
						: null,
				},
				'Error on sendTemplate',
			);

			return { data: [], success: false };
		}
	}
}

export default ApiOficialInstace;
