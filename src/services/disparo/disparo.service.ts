/*
 * O envio é SEQUENCIAL de propósito: há um sleep entre cada mensagem (pacing
 * anti-ban) e a ordem por grupo importa. Paralelizar (Promise.all) estouraria
 * o limite da Evolution / do WhatsApp — por isso desabilitamos no-await-in-loop.
 */
/* eslint-disable no-await-in-loop */
import log from '@/logs';
import { EvolutionInstance } from '@/services/evolution';
import { sleep } from '@/utils';

import {
	IDisparoPayload,
	IDisparoResultado,
	IGrupoResultado,
} from './interfaces';

// Intervalo entre envios para não estourar o limite da Evolution / do WhatsApp.
const DELAY_ENTRE_ENVIOS_MS = 3000;

function resumoErro(data: unknown): string {
	const txt = typeof data === 'string' ? data : JSON.stringify(data);
	return txt.slice(0, 200);
}

/**
 * Executa um disparo pela Evolution. Em cada grupo: manda a mensagem como texto
 * (uma vez) e, em seguida, cada criativo como imagem com a própria legenda —
 * exatamente como o PharmaFlow faz. O grupo conta como enviado se ao menos uma
 * peça chegou.
 *
 * Diferente do PharmaFlow, aqui o resultado não vai pro banco: é devolvido para
 * o worker mandar de volta ao PharmaFlow via callback.
 */
export async function executarDisparo(
	payload: IDisparoPayload,
): Promise<IDisparoResultado> {
	const evolution = new EvolutionInstance(payload.instance);
	const resultados: IGrupoResultado[] = [];
	const medias = payload.medias ?? [];
	const mensagem = payload.message?.trim() ?? '';

	let enviados = 0;
	let falhas = 0;

	for (const grupo of payload.groups) {
		const erros: string[] = [];
		let algoChegou = false;

		try {
			// 1) A mensagem (só uma vez por grupo)
			if (mensagem) {
				const r = await evolution.sendText(grupo.jid, mensagem);
				if (r.ok) algoChegou = true;
				else erros.push(`texto: ${resumoErro(r.data)}`);
				await sleep(DELAY_ENTRE_ENVIOS_MS);
			}

			// 2) Cada criativo, com a própria legenda
			for (const midia of medias) {
				const r = await evolution.sendMedia(grupo.jid, {
					media: midia.b64,
					mimetype: midia.mime || 'image/png',
					caption: midia.rotulo ?? '',
				});
				if (r.ok) algoChegou = true;
				else erros.push(`${midia.rotulo ?? 'imagem'}: ${resumoErro(r.data)}`);
				await sleep(DELAY_ENTRE_ENVIOS_MS);
			}
		} catch (err) {
			erros.push(err instanceof Error ? err.message : String(err));
		}

		if (algoChegou) {
			enviados += 1;
			resultados.push({
				jid: grupo.jid,
				nome: grupo.nome,
				status: 'ok',
				erro: erros.length
					? `parcial — ${erros.join(' | ')}`.slice(0, 500)
					: null,
			});
		} else {
			falhas += 1;
			resultados.push({
				jid: grupo.jid,
				nome: grupo.nome,
				status: 'erro',
				erro: (erros.join(' | ') || 'sem resposta da Evolution').slice(0, 500),
			});
		}
	}

	log.info({
		module: 'services',
		success: true,
		msg: `Disparo ${payload.disparoId} concluído: ${enviados} enviados, ${falhas} falhas (instância ${payload.instance})`,
	});

	return { disparoId: payload.disparoId, enviados, falhas, resultados };
}
