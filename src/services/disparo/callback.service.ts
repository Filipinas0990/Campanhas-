import axios from 'axios';

import { envConfig } from '@/configs';
import log from '@/logs';

import { IDisparoResultado } from './interfaces';

/**
 * Devolve o status do disparo ao PharmaFlow. A URL vem no payload
 * (`callbackUrl`); a autenticação é o mesmo segredo interno (x-internal-key).
 * Falha de callback não derruba o disparo — apenas registra no log.
 */
export async function enviarCallback(
	callbackUrl: string | undefined,
	resultado: IDisparoResultado,
): Promise<void> {
	if (!callbackUrl) {
		log.info({
			module: 'services',
			success: true,
			msg: `Disparo ${resultado.disparoId} sem callbackUrl — status não reportado`,
		});
		return;
	}

	try {
		await axios.post(callbackUrl, resultado, {
			headers: {
				'Content-Type': 'application/json',
				'x-internal-key': envConfig.INTERNAL_API_KEY,
			},
			timeout: 15000,
		});

		log.info({
			module: 'services',
			success: true,
			msg: `Callback do disparo ${resultado.disparoId} enviado ao PharmaFlow`,
		});
	} catch (error) {
		log.info({
			module: 'services',
			success: false,
			msg: `Falha ao enviar callback do disparo ${resultado.disparoId}`,
			error: error?.response?.data
				? JSON.stringify(error.response.data)
				: (error?.message ?? String(error)),
		});
	}
}
