/** Grupo de WhatsApp destino do disparo. */
export interface IGrupoDisparo {
	jid: string; // ...@g.us
	nome?: string;
}

/** Criativo (imagem) que acompanha a oferta. */
export interface IMidiaDisparo {
	b64: string; // base64 puro (sem data:)
	mime?: string;
	rotulo?: string; // vira a legenda da imagem
}

/**
 * Payload que o PharmaFlow envia para o campanhas em POST /disparo.
 * O campanhas é motor magro: recebe tudo pronto, não consulta banco.
 */
export interface IDisparoPayload {
	disparoId: number;
	instance: string; // instância Evolution do gestor (ex.: "gestor_7")
	message?: string;
	groups: IGrupoDisparo[];
	medias?: IMidiaDisparo[];
	callbackUrl?: string; // endpoint do PharmaFlow que recebe o status
}

/** Resultado de um grupo. */
export interface IGrupoResultado {
	jid: string;
	nome?: string;
	status: 'ok' | 'erro';
	erro?: string | null;
}

/** Resultado consolidado do disparo (enviado no callback). */
export interface IDisparoResultado {
	disparoId: number;
	enviados: number;
	falhas: number;
	resultados: IGrupoResultado[];
}
