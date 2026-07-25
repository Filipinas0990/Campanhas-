import axios from 'axios';

import { redisClient } from '../../../src/providers/redis.provider';
import { getMetaTemplate } from '../../../src/services/apiOficial/getMetaTemplate.service';

// eslint-disable-next-line global-require, import/no-extraneous-dependencies
jest.mock('ioredis', () => require('ioredis-mock'));
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('getMetaTemplate', () => {
	beforeEach(async () => {
		await redisClient.flushall();
		jest.clearAllMocks();
	});

	afterAll(async () => {
		await redisClient.quit();
	});

	it('deve retornar do cache (HIT) sem chamar a Meta', async () => {
		const cached = {
			name: 'promo',
			language: 'pt_BR',
			components: [{ type: 'BODY', text: 'oi' }],
		};
		await redisClient.set(
			'meta_template:biz123:promo:pt_BR',
			JSON.stringify(cached),
			'EX',
			600,
		);

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'promo',
			template_language: 'pt_BR',
		});

		expect(result).toEqual(cached);
		expect(mockedAxios.get).not.toHaveBeenCalled();
	});

	it('em MISS, busca da Meta e grava no cache com TTL 600s', async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: {
				data: [
					{ name: 'outro', language: 'pt_BR', components: [] },
					{ name: 'promo', language: 'pt_BR', components: [{ type: 'BODY' }] },
					{ name: 'promo', language: 'en_US', components: [] },
				],
			},
		});

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token-abc',
			template_name: 'promo',
			template_language: 'pt_BR',
		});

		expect(result).toEqual({
			name: 'promo',
			language: 'pt_BR',
			components: [{ type: 'BODY' }],
		});

		expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		expect(mockedAxios.get).toHaveBeenCalledWith(
			'https://graph.facebook.com/v20.0/biz123/message_templates?limit=20&name=promo',
			{ headers: { Authorization: 'Bearer token-abc' } },
		);

		const stored = await redisClient.get('meta_template:biz123:promo:pt_BR');
		expect(stored).toBe(
			JSON.stringify({
				name: 'promo',
				language: 'pt_BR',
				components: [{ type: 'BODY' }],
			}),
		);
		const ttl = await redisClient.ttl('meta_template:biz123:promo:pt_BR');
		expect(ttl).toBeGreaterThan(595);
		expect(ttl).toBeLessThanOrEqual(600);
	});

	it('quando template_language é null, casa qualquer idioma e usa "any" na chave', async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: { data: [{ name: 'promo', language: 'es_ES', components: [] }] },
		});

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'promo',
			template_language: null,
		});

		expect(result).toEqual({
			name: 'promo',
			language: 'es_ES',
			components: [],
		});
		const stored = await redisClient.get('meta_template:biz123:promo:any');
		expect(stored).not.toBeNull();
	});

	it('quando não encontra, cacheia NOT_FOUND por 60s e retorna null', async () => {
		mockedAxios.get.mockResolvedValueOnce({
			data: { data: [{ name: 'outro', language: 'pt_BR' }] },
		});

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'inexistente',
			template_language: 'pt_BR',
		});

		expect(result).toBeNull();
		const stored = await redisClient.get(
			'meta_template:biz123:inexistente:pt_BR',
		);
		expect(stored).toBe('NOT_FOUND');
		const ttl = await redisClient.ttl('meta_template:biz123:inexistente:pt_BR');
		expect(ttl).toBeGreaterThan(55);
		expect(ttl).toBeLessThanOrEqual(60);
	});

	it('HIT em NOT_FOUND retorna null sem chamar a Meta', async () => {
		await redisClient.set(
			'meta_template:biz123:inexistente:pt_BR',
			'NOT_FOUND',
			'EX',
			60,
		);

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'inexistente',
			template_language: 'pt_BR',
		});

		expect(result).toBeNull();
		expect(mockedAxios.get).not.toHaveBeenCalled();
	});

	it('se redis.get falhar, faz fetch direto e retorna resultado', async () => {
		const getSpy = jest
			.spyOn(redisClient, 'get')
			.mockRejectedValueOnce(new Error('redis down'));
		mockedAxios.get.mockResolvedValueOnce({
			data: { data: [{ name: 'promo', language: 'pt_BR', components: [] }] },
		});

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'promo',
			template_language: 'pt_BR',
		});

		expect(result).toEqual({
			name: 'promo',
			language: 'pt_BR',
			components: [],
		});
		expect(mockedAxios.get).toHaveBeenCalledTimes(1);
		getSpy.mockRestore();
	});

	it('se redis.set falhar após fetch, ainda retorna o resultado', async () => {
		const setSpy = jest
			.spyOn(redisClient, 'set')
			.mockRejectedValueOnce(new Error('redis down'));
		mockedAxios.get.mockResolvedValueOnce({
			data: { data: [{ name: 'promo', language: 'pt_BR', components: [] }] },
		});

		const result = await getMetaTemplate({
			wab_business_id: 'biz123',
			wab_token: 'token',
			template_name: 'promo',
			template_language: 'pt_BR',
		});

		expect(result).toEqual({
			name: 'promo',
			language: 'pt_BR',
			components: [],
		});
		setSpy.mockRestore();
	});

	it('erro HTTP da Meta NÃO é engolido (propaga)', async () => {
		const httpError = new Error('429');
		mockedAxios.get.mockRejectedValueOnce(httpError);

		await expect(
			getMetaTemplate({
				wab_business_id: 'biz123',
				wab_token: 'token',
				template_name: 'promo',
				template_language: 'pt_BR',
			}),
		).rejects.toThrow('429');
	});
});
