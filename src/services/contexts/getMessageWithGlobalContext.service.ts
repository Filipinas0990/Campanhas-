/* eslint-disable no-case-declarations */
/* eslint-disable no-continue */
import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/database';
import log from '@/logs';
import { companies, globalContexts } from '@/migrations/schemas/schema';
import { IContacts } from '@/workers/interfaces';

interface IProps {
	company_id: number;
	contact: IContacts;
	message: string;
}

export interface IGlobalContext {
	id: number;
	name: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	type: string;
	companyId: number;
	value: string | null;
}

interface IGetReservedGlobalContextsProps {
	company_id: number;
	contact: IContacts;
	context: IGlobalContext;
}

const CONTACT_PREFIX = 'CONTACT_';
const COMPANY_PREFIX = 'COMPANY_';

const CONTACT_FIELDS = {
	CONTACT_NAME: 'name',
	CONTACT_LASTNAME: 'last_name',
	CONTACT_PHONE: 'number',
	CONTACT_EMAIL: 'email',
	CONTACT_DOCUMENT: 'cpf',
	CONTACT_COMPANY: 'client_company',
};

const COMPANY_FIELDS = {
	COMPANY_NAME: 'name',
	COMPANY_DOCUMENT: 'cnpjCpf',
	COMPANY_ADDRESS: 'address',
	COMPANY_CITY: 'city',
	COMPANY_STATE: 'state',
	COMPANY_COUNTRY: 'country',
	COMPANY_NEIGHBORHOOD: 'neighborhood',
};

async function getCompany(company_id: number) {
	const company = await db
		.select({
			name: companies.name,
			cnpjCpf: companies.cnpjCpf,
			address: companies.address,
			city: companies.city,
			state: companies.state,
			country: companies.country,
			neighborhood: companies.neighborhood,
		})
		.from(companies)
		.where(eq(companies.id, company_id));

	return company.length ? company[0] : null;
}

export async function getReservedGlobalContext({
	company_id,
	contact,
	context,
}: IGetReservedGlobalContextsProps) {
	if (context.name.includes(CONTACT_PREFIX)) {
		const fieldName = CONTACT_FIELDS[context.name];
		if (fieldName) {
			return contact[fieldName];
		}

		return '';
	}

	if (context.name.includes(COMPANY_PREFIX)) {
		const company = await getCompany(company_id);
		const fieldName = COMPANY_FIELDS[context.name];
		if (fieldName && company) {
			return company[fieldName];
		}

		return '';
	}

	return context.value;
}

export default async function getMessageWithGlobalContext({
	company_id,
	contact,
	message,
}: IProps): Promise<string> {
	try {
		const match = /{{(.*?)}}/g;
		let matches = match.exec(message);
		let formatedMessage = message;
		const allMatches: string[] = [];

		while (matches !== null) {
			allMatches.push(matches[1]);
			matches = match.exec(message);
		}

		if (!allMatches.length) {
			return message;
		}

		const globalContextsData = await db
			.select()
			.from(globalContexts)
			.where(
				and(
					or(
						eq(globalContexts.companyId, company_id),
						isNull(globalContexts.companyId),
					),
					inArray(globalContexts.name, allMatches),
				),
			);

		if (!globalContextsData.length) {
			return message;
		}

		for await (const context of globalContextsData) {
			try {
				const reservedContext = await getReservedGlobalContext({
					company_id,
					contact,
					context: context as IGlobalContext,
				});

				if (!reservedContext && reservedContext !== '') {
					continue;
				}

				formatedMessage = formatedMessage.replace(
					new RegExp(`{{${context.name}}}`, 'g'),
					`${reservedContext}`,
				);
			} catch (errors) {
				log.error(errors, 'Error processing reserved context');
			}
		}

		return formatedMessage;
	} catch (error) {
		log.error(error, 'Error on getMessageWithGlobalContext service');
		return message;
	}
}
