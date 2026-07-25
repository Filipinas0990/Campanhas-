import axios from 'axios';

import log from '@/logs';
import { redisClient } from '@/providers/redis.provider';

interface IMetaTemplateComponent {
	type: string;
	[key: string]: unknown;
}

export interface IMetaTemplate {
	name: string;
	language: string;
	components: IMetaTemplateComponent[];
	[key: string]: unknown;
}

interface IProps {
	wab_business_id: string;
	wab_token: string;
	template_name: string;
	template_language?: string | null;
}

const TEMPLATE_TTL_SECONDS = 600;
const NOT_FOUND_TTL_SECONDS = 60;
const NOT_FOUND_SENTINEL = 'NOT_FOUND';

function buildKey({
	wab_business_id,
	template_name,
	template_language,
}: Pick<IProps, 'wab_business_id' | 'template_name' | 'template_language'>) {
	return `meta_template:${wab_business_id}:${template_name}:${template_language ?? 'any'}`;
}

export async function getMetaTemplate({
	wab_business_id,
	wab_token,
	template_name,
	template_language,
}: IProps): Promise<IMetaTemplate | null> {
	const key = buildKey({ wab_business_id, template_name, template_language });

	let cached: string | null = null;
	try {
		cached = await redisClient.get(key);
	} catch (err) {
		log.info({
			module: 'services',
			success: false,
			text: `[getMetaTemplate] erro no redis.get (${key}): ${(err as Error).message}. Seguindo sem cache.`,
		});
	}

	if (cached) {
		if (cached === NOT_FOUND_SENTINEL) {
			log.info({
				module: 'services',
				success: true,
				text: `[getMetaTemplate] cache HIT (NOT_FOUND) ${key}`,
			});
			return null;
		}
		try {
			const parsed = JSON.parse(cached) as IMetaTemplate;
			log.info({
				module: 'services',
				success: true,
				text: `[getMetaTemplate] cache HIT ${key}`,
			});
			return parsed;
		} catch (err) {
			log.info({
				module: 'services',
				success: false,
				text: `[getMetaTemplate] valor corrompido em ${key}: ${(err as Error).message}. Refazendo fetch.`,
			});
		}
	} else {
		log.info({
			module: 'services',
			success: true,
			text: `[getMetaTemplate] cache MISS ${key}`,
		});
	}

	const url = `https://graph.facebook.com/v20.0/${wab_business_id}/message_templates?limit=20&name=${encodeURIComponent(template_name)}`;
	const { data } = await axios.get(url, {
		headers: { Authorization: `Bearer ${wab_token}` },
	});

	const found = data.data.find(
		(item: IMetaTemplate) =>
			item.name === template_name &&
			(!template_language || item.language === template_language),
	);

	if (!found) {
		try {
			await redisClient.set(
				key,
				NOT_FOUND_SENTINEL,
				'EX',
				NOT_FOUND_TTL_SECONDS,
			);
		} catch (err) {
			log.info({
				module: 'services',
				success: false,
				text: `[getMetaTemplate] erro no redis.set NOT_FOUND (${key}): ${(err as Error).message}`,
			});
		}
		return null;
	}

	try {
		await redisClient.set(
			key,
			JSON.stringify(found),
			'EX',
			TEMPLATE_TTL_SECONDS,
		);
	} catch (err) {
		log.info({
			module: 'services',
			success: false,
			text: `[getMetaTemplate] erro no redis.set (${key}): ${(err as Error).message}`,
		});
	}

	return found as IMetaTemplate;
}
