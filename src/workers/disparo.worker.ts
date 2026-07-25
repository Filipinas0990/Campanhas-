import log from '@/logs';
import {
	executarDisparo,
	enviarCallback,
	IDisparoPayload,
} from '@/services/disparo';

/**
 * Worker BullMQ do motor de disparo (Evolution).
 *
 * Recebe o payload que o PharmaFlow enfileirou via POST /disparo, executa o
 * envio em massa pela Evolution e devolve o status ao PharmaFlow (callback).
 *
 * Segue a orientação da BullMQ (igual ao campaign.worker): erros de negócio são
 * tratados aqui dentro e NÃO são relançados — só falha de infra deve subir.
 */
export default async function disparoWorker(message: unknown): Promise<void> {
	let payload: IDisparoPayload;

	try {
		payload =
			typeof message === 'string'
				? (JSON.parse(message) as IDisparoPayload)
				: (message as IDisparoPayload);
	} catch (parseError) {
		log.info({
			success: false,
			module: 'worker',
			text: `[ERROR disparo_worker] Falha no parse do job: ${parseError?.message}`,
		});
		return;
	}

	if (!payload?.instance || !Array.isArray(payload?.groups)) {
		log.info({
			success: false,
			module: 'worker',
			text: `[ERROR disparo_worker] Payload inválido (instance/groups ausentes)`,
		});
		return;
	}

	log.info({
		module: 'worker',
		success: true,
		text: `[INFO disparo_worker] Disparo ${payload.disparoId} — ${payload.groups.length} grupos, instância ${payload.instance}`,
	});

	try {
		const resultado = await executarDisparo(payload);
		await enviarCallback(payload.callbackUrl, resultado);
	} catch (error) {
		log.info({
			success: false,
			module: 'worker',
			text: `[ERROR disparo_worker] Erro no disparo ${payload.disparoId}: ${error?.message ?? 'desconhecido'}`,
			error: error?.stack ?? String(error),
		});

		// Reporta a falha total ao PharmaFlow para não deixar o disparo "pendurado".
		await enviarCallback(payload.callbackUrl, {
			disparoId: payload.disparoId,
			enviados: 0,
			falhas: payload.groups.length,
			resultados: payload.groups.map(g => ({
				jid: g.jid,
				nome: g.nome,
				status: 'erro' as const,
				erro: error?.message ?? 'erro interno no motor de disparo',
			})),
		});
	}
}
