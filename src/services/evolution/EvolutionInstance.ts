import axios, { AxiosInstance } from 'axios';

import { envConfig } from '@/configs';
import log from '@/logs';
import { sleep } from '@/utils';

export interface IEvolutionResult {
	ok: boolean;
	status: number;
	data: unknown;
}

export interface ISendMediaParams {
	media: string; // base64 puro (sem o prefixo data:)
	mimetype: string;
	caption?: string;
	fileName?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Erros em que o pedido comprovadamente NÃO chegou na Evolution — só esses
 * podem ser repetidos. Envio de mensagem não é idempotente: em 24/09 a
 * Evolution respondeu 500 depois de já ter postado no grupo, e cada retry
 * virou mais uma mensagem em branco (12 por grupo, em 8 grupos). Resposta HTTP
 * de erro ou timeout = não sabemos se saiu, então não repete.
 */
const ERROS_ANTES_DE_CHEGAR = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

/**
 * Transporte de WhatsApp via Evolution API.
 *
 * Espelha exatamente o contrato usado pelo PharmaFlow (mesma Evolution):
 *   - texto  → POST /message/sendText/{instance}  { number, text }
 *   - mídia  → POST /message/sendMedia/{instance} { number, mediatype, mimetype, media, caption, fileName }
 *
 * `instance` é o nome da instância na Evolution (ex.: "gestor_7"). A URL base e
 * a apikey vêm do .env (EVOLUTION_API_URL / EVOLUTION_API_KEY).
 *
 * Diferente do BaileysInstance (que fala com um container Baileys HTTP próprio),
 * aqui não há `api_container_url` por conexão — a Evolution é um endpoint único.
 */
export default class EvolutionInstance {
	private instance: string;

	constructor(instance: string) {
		this.instance = instance;
	}

	private getApi(): AxiosInstance {
		return axios.create({
			baseURL: envConfig.EVOLUTION_API_URL,
			headers: {
				'Content-Type': 'application/json',
				apikey: envConfig.EVOLUTION_API_KEY,
			},
			timeout: 30000,
		});
	}

	/**
	 * Faz a requisição, repetindo só quando o pedido não chegou na Evolution
	 * (ver ERROS_ANTES_DE_CHEGAR). Nunca lança: devolve { ok:false } quando
	 * falha, para o laço de grupos decidir por grupo.
	 */
	private async request(
		path: string,
		body: Record<string, unknown>,
		label: string,
		retry = 0,
	): Promise<IEvolutionResult> {
		try {
			const api = this.getApi();
			const response = await api.post(path, body);

			return { ok: true, status: response.status, data: response.data };
		} catch (error) {
			const status = error?.response?.status ?? 0;
			const data = error?.response?.data ?? error?.message ?? String(error);

			const naoChegou = !error?.response && ERROS_ANTES_DE_CHEGAR.has(error?.code);

			if (naoChegou && retry < MAX_RETRIES) {
				log.info({
					success: false,
					module: 'services',
					msg: `Evolution ${label} falhou (${status}) — retry ${retry + 1}/${MAX_RETRIES}`,
				});

				await sleep(RETRY_DELAY_MS);

				return this.request(path, body, label, retry + 1);
			}

			log.info({
				success: false,
				module: 'services',
				msg: `Evolution ${label} falhou definitivamente (${status})`,
				error: typeof data === 'string' ? data : JSON.stringify(data),
			});

			return { ok: false, status, data };
		}
	}

	async sendText(jid: string, text: string): Promise<IEvolutionResult> {
		return this.request(
			`/message/sendText/${this.instance}`,
			{ number: jid, text },
			'sendText',
		);
	}

	async sendMedia(
		jid: string,
		params: ISendMediaParams,
	): Promise<IEvolutionResult> {
		return this.request(
			`/message/sendMedia/${this.instance}`,
			{
				number: jid,
				mediatype: 'image',
				mimetype: params.mimetype,
				media: params.media,
				caption: params.caption ?? '',
				fileName: params.fileName ?? 'oferta.png',
			},
			'sendMedia',
		);
	}
}
