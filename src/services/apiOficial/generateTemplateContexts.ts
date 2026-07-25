/* eslint-disable no-continue */
import { and, eq, isNull, or } from 'drizzle-orm';

import { db } from '@/database';
import { globalContexts } from '@/migrations/schemas/schema';
import { IContacts } from '@/workers/interfaces';

import { ITemplateContext } from '../campaigns/create.service';
import {
	getReservedGlobalContext,
	IGlobalContext,
} from '../contexts/getMessageWithGlobalContext.service';

export async function generateTemplateContexts({
	company_id,
	template_contexts,
	contact,
}: {
	company_id: number;
	template_contexts: ITemplateContext[];
	contact: IContacts;
}): Promise<string[]> {
	const contexts: string[] = [];
	template_contexts.sort((a, b) => a.order - b.order);

	for await (const context of template_contexts) {
		if (context.global) {
			const globalContextsData = await db
				.select()
				.from(globalContexts)
				.where(
					and(
						or(
							eq(globalContexts.companyId, company_id),
							isNull(globalContexts.companyId),
						),
						eq(globalContexts.name, context.value),
					),
				);
			if (!globalContextsData.length) {
				continue;
			}

			if (globalContextsData[0].value) {
				const reservedContext = await getReservedGlobalContext({
					company_id,
					contact,
					context: globalContextsData[0] as IGlobalContext,
				});

				if (!reservedContext && reservedContext !== '') {
					continue;
				}

				const cleanContext = reservedContext.replace(/\r?\n|\r/g, '');

				contexts.push(cleanContext);
				continue;
			}
		}

		const cleanContext = context.value.replace(/\r?\n|\r/g, '');
		contexts.push(cleanContext);
	}

	return contexts;
}
