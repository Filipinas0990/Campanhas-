/* eslint-disable no-use-before-define */
import { relations, sql } from 'drizzle-orm';
import {
	AnyMySqlColumn,
	bigint,
	boolean,
	date,
	datetime,
	decimal,
	foreignKey,
	index,
	int,
	longtext,
	mysqlEnum,
	mysqlTable,
	text,
	tinyint,
	unique,
	varchar,
} from 'drizzle-orm/mysql-core';

// Tables
export const apiContainers = mysqlTable('api_containers', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	url: varchar('url', { length: 255 }).notNull(),
	port: int('port'),
	maxConnections: int('max_connections').default(15),
	active: boolean('active').default(true),
	createdAt: date('created_at').notNull(),
	updatedAt: date('updated_at').notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
});

export const answers = mysqlTable(
	'answers',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		research_id: bigint('research_id', { mode: 'number' })
			.notNull()
			.references(() => researchs.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		name: varchar('name', { length: 255 }).notNull(),
		rating: int('rating').notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
	},
	table => {
		return {
			research_id: index('research_id').on(table.research_id),
		};
	},
);

export const companies = mysqlTable('companies', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	whatsappLib: varchar('whatsapp_lib', { length: 255 }).default(
		'whatsapp-webjs',
	),
	planId: bigint('plan_id', { mode: 'number' }).references(() => plans.id, {
		onDelete: 'restrict',
		onUpdate: 'restrict',
	}),
	subscriptionId: bigint('subscription_id', { mode: 'number' }).references(
		(): AnyMySqlColumn => companySubscription.id,
		{
			onDelete: 'restrict',
			onUpdate: 'restrict',
		},
	),
	planType: mysqlEnum('plan_type', ['boleto', 'credito']).default('boleto'),
	mercadoPagoSubscriptionId: varchar('mercado_pago_subscription_id', {
		length: 255,
	}),
	wabBusinessId: varchar('wab_business_id', { length: 255 }),
	cnpjCpf: bigint('cnpj_cpf', { mode: 'number' }).notNull(),
	address: varchar('address', { length: 255 }),
	addressNumber: varchar('address_number', { length: 255 }),
	addressComplement: varchar('address_complement', { length: 255 }),
	neighborhood: varchar('neighborhood', { length: 255 }),
	city: varchar('city', { length: 255 }),
	state: varchar('state', { length: 255 }),
	country: varchar('country', { length: 255 }),
	logoUrl: varchar('logo_url', { length: 255 }),
	initMessage: text('init_message'),
	transferMessage: varchar('transfer_message', { length: 255 }),
	endMessage: text('end_message'),
	token: varchar('token', { length: 255 }).notNull(),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
});

export const companySubscription = mysqlTable(
	'company_subscription',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references((): AnyMySqlColumn => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		planId: bigint('plan_id', { mode: 'number' })
			.notNull()
			.references(() => plans.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		mercadoPagoSubscriptionId: varchar('mercado_pago_subscription_id', {
			length: 255,
		}),
		status: varchar('status', { length: 255 }),
		observationExpirationDate: varchar('observation_expiration_date', {
			length: 255,
		}),
		cardType: varchar('card_type', { length: 255 }),
		email: varchar('email', { length: 255 }),
		lastFourDigits: varchar('last_four_digits', { length: 4 }),
		nextPaymentDate: varchar('next_payment_date', { length: 255 }).default(
			'NULL',
		),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
			planId: index('plan_id').on(table.planId),
		};
	},
);

export const contacts = mysqlTable(
	'contacts',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull().primaryKey(),
		company_id: bigint('company_id', { mode: 'number' }).references(
			() => companies.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		name: varchar('name', { length: 255 }).notNull(),
		last_name: varchar('last_name', { length: 255 }),
		number: varchar('number', { length: 255 }),
		country: varchar('country', { length: 255 }).default('BR'),
		ddi: varchar('ddi', { length: 255 }).default('55'),
		email: varchar('email', { length: 255 }),
		cpf: varchar('cpf', { length: 11 }),
		client_company: varchar('client_company', { length: 255 }),
		state: text('state'),
		city: text('city'),
		neighborhood: text('neighborhood'),
		street_number: bigint('street_number', { mode: 'number' }),
		street_name: text('street_name'),
		zip_code: bigint('zip_code', { mode: 'number' }),
		address: longtext('address'),
		meta_id: varchar('meta_id', { length: 255 }),
		instagram_name: varchar('instagram_name', { length: 255 }),
		instagram_connection: varchar('instagram_connection', {
			length: 255,
		}),
		profile_pic_url: text('profile_pic_url'),
		group_color: varchar('group_color', { length: 255 }),
		group_contact: boolean('group_contact').default(false),
		bot_enabled: boolean('bot_enabled').default(true).notNull(),
		schedule_enabled: boolean('schedule_enabled').default(true).notNull(),
		queue_enabled: boolean('queue_enabled').default(true).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
		notes: text('notes'),
		type: varchar('type', { length: 255 }),
		telegram_chat_id: varchar('telegram_chat_id', { length: 255 }).default(
			'NULL',
		),
		is_group: boolean('is_group').default(false),
	},
	table => {
		return {
			idxNumberContacts: index('idx_number_contacts').on(table.number),
			name: index('contacts_name').on(table.name),
			is_group: index('contacts_is_group').on(table.is_group),
		};
	},
);

export const contactTags = mysqlTable(
	'contact_tags',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		tag_id: bigint('tag_id', { mode: 'number' }).references(() => tags.id, {
			onDelete: 'restrict',
			onUpdate: 'restrict',
		}),
		contact_id: bigint('contact_id', { mode: 'number' }).references(
			() => contacts.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		createdAt: date('created_at', { mode: 'string' }).notNull(),
		updatedAt: date('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at', { mode: 'string' }),
	},
	table => {
		return {
			tag_id: index('tag_id').on(table.tag_id),
			contact_id: index('contact_id').on(table.contact_id),
		};
	},
);

export const emailCompany = mysqlTable(
	'email_company',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		company_id: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		email: varchar('email', { length: 255 }).notNull(),
		altered_by: varchar('altered_by', { length: 255 }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			company_id: index('company_id').on(table.company_id),
		};
	},
);

export const emailCredit = mysqlTable(
	'email_credit',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		company_id: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		plan_id: bigint('plan_id', { mode: 'number' })
			.notNull()
			.references(() => plans.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		email_credit: bigint('email_credit', { mode: 'number' }).notNull(),
		email_plan: bigint('email_plan', { mode: 'number' }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			companyId: index('company_id').on(table.company_id),
			planId: index('plan_id').on(table.plan_id),
		};
	},
);

export const goodbyeMessage = mysqlTable('goodbye_message', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	message: varchar('message', { length: 255 }),
	createdAt: date('created_at', { mode: 'string' }).notNull(),
	updatedAt: date('updated_at', { mode: 'string' }),
	deletedAt: date('deleted_at', { mode: 'string' }),
});

export const greetingsMessage = mysqlTable('greetings_message', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	message: varchar('message', { length: 255 }),
	createdAt: date('created_at', { mode: 'string' }).notNull(),
	updatedAt: date('updated_at', { mode: 'string' }),
	deletedAt: date('deleted_at', { mode: 'string' }),
});

export const historicTickets = mysqlTable(
	'historic_tickets',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		ticket_id: bigint('ticket_id', { mode: 'number' })
			.notNull()
			.references((): AnyMySqlColumn => tickets.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		user_id: bigint('user_id', { mode: 'number' }),
		status_id_init: bigint('status_id_init', { mode: 'number' })
			.notNull()
			.references(() => statuses.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		status_id_end: bigint('status_id_end', { mode: 'number' })
			.notNull()
			.references(() => statuses.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			ticket_id: index('ticket_id').on(table.ticket_id),
			user_id: index('user_id').on(table.user_id),
			statusIdInit: index('status_id_init').on(table.status_id_init),
			statusIdEnd: index('status_id_end').on(table.status_id_end),
		};
	},
);

export const plans = mysqlTable('plans', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	type: varchar('type', { length: 255 }).default('mensal'),
	planDays: bigint('plan_days', { mode: 'number' }),
	paymentType: mysqlEnum('payment_type', ['boleto', 'credito']).default(
		'boleto',
	),
	mercadoPagoId: varchar('mercado_pago_id', { length: 255 }),
	mercadoPagoPlanUrl: varchar('mercado_pago_plan_url', { length: 255 }),
	mercadoPagoSubscriptionId: varchar('mercado_pago_subscription_id', {
		length: 255,
	}),
	billingDay: bigint('billing_day', { mode: 'number' }),
	name: varchar('name', { length: 255 }).notNull(),
	planPrice: decimal('plan_price', { precision: 15, scale: 2 }).notNull(),
	finalPrice: decimal('final_price', { precision: 15, scale: 2 }).notNull(),
	wabConversationPrice: decimal('wab_conversation_price', {
		precision: 15,
		scale: 2,
	}),
	userPrice: decimal('user_price', { precision: 15, scale: 2 }),
	connectionPrice: decimal('connection_price', {
		precision: 15,
		scale: 2,
	}),
	userCount: bigint('user_count', { mode: 'number' }),
	connectionCount: bigint('connection_count', { mode: 'number' }),
	smsCount: bigint('sms_count', { mode: 'number' }),
	smsPrice: decimal('sms_price', { precision: 15, scale: 2 }),
	conversationCount: bigint('conversation_count', { mode: 'number' }),
	testDays: bigint('test_days', { mode: 'number' }),
	active: boolean('active').notNull(),
	custom: boolean('custom').default(false),
	isEmail: boolean('is_email').default(false).notNull(),
	emailCount: bigint('email_count', { mode: 'number' }).notNull(),
	emailPrice: decimal('email_price', { precision: 15, scale: 2 })
		.default('0.00')
		.notNull(),
	velipCount: bigint('velip_count', { mode: 'number' }).notNull(),
	velipPrice: decimal('velip_price', { precision: 15, scale: 2 })
		.default('0.00')
		.notNull(),
	isVelip: boolean('is_velip').default(false).notNull(),
	isSms: boolean('is_sms'),
	ia: boolean('ia').default(false),
	iaPrice: decimal('ia_price', { precision: 15, scale: 2 }).default('0.00'),
	chatgpt: boolean('chatgpt').default(false),
	chatgptPrice: decimal('chatgpt_price', { precision: 15, scale: 2 }).default(
		'0.00',
	),
	chatgptTokens: bigint('chatgpt_tokens', { mode: 'number' }),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	status: varchar('status', { length: 255 }).notNull(),
	isChatshop: boolean('is_chatshop').default(false).notNull(),
	chatshopPrice: decimal('chatshop_price', { precision: 15, scale: 2 })
		.default('0.00')
		.notNull(),
});

export const researchs = mysqlTable('researchs', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	name: longtext('name'),
	type: varchar('type', { length: 255 }).default('buttons'),
	companyId: bigint('company_id', { mode: 'number' })
		.notNull()
		.references(() => companies.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	active: boolean('active').notNull(),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
});

export const researchsHistoric = mysqlTable('researchs_historic', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	research_id: bigint('research_id', { mode: 'number' }).notNull(),
	active: boolean('active').notNull(),
	status: varchar('status', { length: 255 }).notNull(),
	ticket_id: bigint('ticket_id', { mode: 'number' }),
	bot_interaction_history_id: bigint('bot_interaction_history_id', {
		mode: 'number',
	}),
	user_id: bigint('user_id', { mode: 'number' }),
	company_id: bigint('company_id', { mode: 'number' }).notNull(),
	answer_id: bigint('answer_id', { mode: 'number' }),
	bot: boolean('bot').default(false),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
});

export const smsCredit = mysqlTable(
	'sms_credit',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		company_id: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		plan_id: bigint('plan_id', { mode: 'number' })
			.notNull()
			.references(() => plans.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		credit: bigint('credit', { mode: 'number' }).notNull(),
		sms_plan: bigint('sms_plan', { mode: 'number' }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			company_id: index('company_id').on(table.company_id),
			plan_id: index('plan_id').on(table.plan_id),
		};
	},
);

export const schedulemessagesContacts = mysqlTable(
	'schedulemessages_contacts',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		schedule_message_id: bigint('schedule_message_id', { mode: 'number' })
			.notNull()
			.references(() => scheduleMessages.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		contact_id: bigint('contact_id', { mode: 'number' })
			.notNull()
			.references(() => contacts.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
			contact_id: index('contact_id').on(table.contact_id),
		};
	},
);

export const schedulemessagesSendMessages = mysqlTable(
	'schedulemessages_sendMessages',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		schedule_message_id: bigint('schedule_message_id', { mode: 'number' })
			.notNull()
			.references(() => scheduleMessages.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		contact_id: bigint('contact_id', { mode: 'number' }).references(
			() => contacts.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		csv_id: bigint('csv_id', { mode: 'number' }),
		number: varchar('number', { length: 255 }).notNull(),
		is_sended: boolean('is_sended'),
		ticket_open: boolean('ticket_open'),
		sended_date: date('sended_date', { mode: 'string' }),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: date('updated_at'),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
			contact_id: index('contact_id').on(table.contact_id),
			csv_id: index('csv_id').on(table.csv_id),
		};
	},
);

export const schedulemessagesWhatsapp = mysqlTable(
	'schedulemessages_whatsapp',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		schedule_message_id: bigint('schedule_message_id', { mode: 'number' })
			.notNull()
			.references(() => scheduleMessages.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		whatsapp_id: bigint('whatsapp_id', { mode: 'number' })
			.notNull()
			.references(() => whatsapps.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		createdAt: date('created_at'),
		updatedAt: date('updated_at'),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
			whatsapp_id: index('whatsapp_id').on(table.whatsapp_id),
		};
	},
);

export const scheduleMessages = mysqlTable(
	'schedule_messages',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		company_id: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		messagings_id: bigint('messagings_id', { mode: 'number' }).references(
			() => messagings.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		title: varchar('title', { length: 255 }).notNull(),
		subject: text('subject'),
		message: text('message').notNull(),
		start_date: datetime('start_date').default(sql`NULL`),
		send_date: datetime('send_date').default(sql`NULL`),
		end_date: datetime('end_date').default(sql`NULL`),
		type: varchar('type', { length: 255 }).notNull(),
		media_path: varchar('media_path', { length: 255 }),
		media_type: varchar('media_type', { length: 255 }),
		audio_path: varchar('audio_path', { length: 255 }),
		page: varchar('page', { length: 255 }).default('1').notNull(),
		csv_name: varchar('csv_name', { length: 255 }),
		send_contacts: longtext('send_contacts'),
		all_contacts: boolean('all_contacts').default(false).notNull(),
		tags: varchar('tags', { length: 255 }),
		chat_bot_id: bigint('chat_bot_id', { mode: 'number' }).references(
			() => bots.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		is_running: boolean('is_running').notNull(),
		is_sending: boolean('is_sending').notNull(),
		is_paused: boolean('is_paused').notNull(),
		repeat: varchar('repeat', { length: 255 }),
		signature: varchar('signature', { length: 255 }),
		timezone: varchar('timezone', { length: 255 })
			.default('America/Sao_Paulo')
			.notNull(),
		research_id: varchar('research_id', { length: 255 }),
		goodbye_message: varchar('goodbye_message', { length: 255 }),
		greetings_message: varchar('greetings_message', { length: 255 }),
		velip_campaign_id: text('velip_campaign_id'),
		velip_campaign_begin_date: date('velip_campaign_begin_date', {
			mode: 'string',
		}),
		velip_campaign_end_date: date('velip_campaign_end_date', {
			mode: 'string',
		}),
		createdAt: datetime('created_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: datetime('updated_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
		template_id: bigint('template_id', { mode: 'number' }).references(
			() => templates.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		email_color: varchar('email_color', { length: 255 }),
		email_template: varchar('email_template', { length: 255 }),
		cluster_name: varchar('cluster_name', { length: 255 }),
		restrict_ddd: boolean('restrict_ddd').default(false).notNull(),
		created_by: bigint('created_by', { mode: 'number' }).references(
			() => users.id,
			{ onDelete: 'set null', onUpdate: 'restrict' },
		),
		group_id: bigint('group_id', { mode: 'number' }),
		selected_groups: longtext('selected_groups'),
	},
	table => {
		return {
			company_id: index('company_id').on(table.company_id),
			group_id: index('group_id').on(table.group_id),
		};
	},
);

export const scheduleMessageCadence = mysqlTable(
	'schedule_message_cadence',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		schedule_message_id: bigint('schedule_message_id', { mode: 'number' })
			.notNull()
			.references(() => scheduleMessages.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		interval: bigint('interval', { mode: 'number' }).notNull(),
		minutes: bigint('minutes', { mode: 'number' }),
		hours: bigint('hours', { mode: 'number' }),
		message: text('message').notNull(),
		media_type: text('media_type'),
		media_path: varchar('media_path', { length: 255 }),
		is_sending: boolean('is_sending'),
		start_date: date('start_date'),
		end_date: date('end_date'),
		page: varchar('page', { length: 255 }).default('1').notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at')
			.default(sql`CURRENT_TIMESTAMP`)
			.default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
		};
	},
);

export const scheduleMessageCsv = mysqlTable(
	'schedule_message_csv',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		schedule_message_id: bigint('schedule_message_id', { mode: 'number' })
			.notNull()
			.references(() => scheduleMessages.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		name: varchar('name', { length: 255 }),
		number: varchar('number', { length: 255 }),
		createdAt: date('created_at').notNull(),
		updatedAt: date('updated_at'),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
		};
	},
);

export const statuses = mysqlTable(
	'statuses',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		tag: varchar('tag', { length: 255 }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			tag: unique('tag').on(table.tag),
		};
	},
);

export const tickets = mysqlTable(
	'tickets',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		id_historic_ticket: bigint('id_historic_ticket', {
			mode: 'number',
		}).references((): AnyMySqlColumn => historicTickets.id, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
		company_id: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		connection_id: bigint('connection_id', { mode: 'number' }).references(
			() => whatsapps.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		queue_id: bigint('queue_id', { mode: 'number' }),
		status_id: bigint('status_id', { mode: 'number' })
			.notNull()
			.references(() => statuses.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		contact_id: bigint('contact_id', { mode: 'number' })
			.notNull()
			.references(() => contacts.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		wab_ticket: boolean('wab_ticket').default(false),
		attendant_user_id: bigint('attendant_user_id', { mode: 'number' }),
		closed_by_user_id: bigint('closed_by_user_id', { mode: 'number' }),
		serialized_id: varchar('serialized_id', { length: 255 }),
		wab_phone_id: varchar('wab_phone_id', { length: 255 }),
		pinned: boolean('pinned').default(false),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
		telegram_bot_id: varchar('telegram_bot_id', { length: 255 }),
		type: varchar('type', { length: 255 }).default('whatsapp'),
		ocurrence: varchar('ocurrence', { length: 255 }),
		insta_id: varchar('insta_id', { length: 255 }),
		last_message: datetime('last_message', { mode: 'string' }),
	},
	table => {
		return {
			company_id: index('tickets_company_id').on(table.company_id),
			status_id: index('status_id').on(table.status_id),
			contact_id: index('contact_id').on(table.contact_id),
			closedByUserId: index('closed_by_user_id').on(table.closed_by_user_id),
			idxSerializedIdTickets: index('idx_serialized_id_tickets').on(
				table.serialized_id,
			),
			createdAt: index('tickets_created_at').on(table.createdAt),
			updatedAt: index('tickets_updated_at').on(table.updatedAt),
		};
	},
);

export const tags = mysqlTable(
	'tags',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull().primaryKey(),
		company_id: bigint('company_id', { mode: 'number' }).references(
			() => companies.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		name: varchar('name', { length: 255 }).notNull(),
		color: varchar('color', { length: 255 }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			company_id: index('company_id').on(table.company_id),
		};
	},
);

export const templates = mysqlTable(
	'templates',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		name: varchar('name', { length: 255 }).notNull(),
		metaTemplateId: varchar('meta_template_id', { length: 255 }),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		whatsappId: bigint('whatsapp_id', { mode: 'number' })
			.notNull()
			.references(() => whatsapps.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		businessId: varchar('business_id', { length: 255 }),
		status: varchar('status', { length: 255 }),
		category: varchar('category', { length: 255 }),
		language: varchar('language', { length: 255 }),
		headerText: text('header_text'),
		headerMediaPath: longtext('header_media_path'),
		bodyText: text('body_text'),
		footerText: text('footer_text'),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
		};
	},
);

export const whatsapps = mysqlTable(
	'whatsapps',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		serializedId: varchar('serialized_id', { length: 255 }),

		authBaileys: text('auth_baileys'),
		type: varchar('type', { length: 255 }).default('whatsapp-webjs'),
		contactsJson: longtext('contacts_json'),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		apiContainerId: bigint('api_container_id', { mode: 'number' }).references(
			() => apiContainers.id,
			{
				onDelete: 'restrict',
				onUpdate: 'restrict',
			},
		),
		answerType: varchar('answer_type', { length: 255 }).default('number'),
		name: varchar('name', { length: 255 }).notNull(),
		wabToken: varchar('wab_token', { length: 255 }),
		session: text('session'),
		qrcode: text('qrcode'),
		wab_business_number: varchar('wab_business_number', { length: 2555 }),
		wabBusinessPhonenumberId: varchar('wab_business_phonenumber_id', {
			length: 255,
		}),
		wab_business_id: varchar('wab_business_id', { length: 255 }),
		statusId: bigint('status_id', { mode: 'number' })
			.notNull()
			.references(() => statuses.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		greetingMessage: text('greeting_message'),
		battery: varchar('battery', { length: 255 }),
		plugged: boolean('plugged'),
		default: boolean('default'),
		wabConnection: boolean('wab_connection').default(false),
		instaId: varchar('insta_id', { length: 255 }),
		meta_page_id: varchar('meta_page_id', { length: 255 }),
		meta_token: varchar('meta_token', { length: 255 }),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
		telegramToken: varchar('telegram_token', { length: 255 }),
		telegramBotId: varchar('telegram_bot_id', { length: 255 }),
		telegramBotName: varchar('telegram_bot_name', { length: 255 }).default(
			'NULL',
		),
		groups: boolean('groups').default(false),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
			statusId: index('status_id').on(table.statusId),
			idxSerializedIdWhatsapps: index('idx_serialized_id_whatsapps').on(
				table.serializedId,
			),
		};
	},
);

export const messagings = mysqlTable('messagings', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	module: varchar('module', { length: 255 }).notNull(),
	consumers: bigint('consumers', { mode: 'number' }).notNull(),
	running: boolean('running').notNull(),
	timezone: varchar('timezone', { length: 255 }).notNull(),
	active: boolean('active').notNull(),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
});

export const messagingsInterval = mysqlTable(
	'messagings_interval',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		messagingId: bigint('messaging_id', { mode: 'number' })
			.notNull()
			.references(() => messagings.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		day: varchar('day', { length: 255 }).notNull(),
		timeIni: varchar('time_ini', { length: 255 }).notNull(),
		timeFin: varchar('time_fin', { length: 255 }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			messagingId: index('messaging_id').on(table.messagingId),
		};
	},
);

export const globalContexts = mysqlTable('global_contexts', {
	id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
	companyId: bigint('company_id', { mode: 'number' })
		.notNull()
		.references(() => companies.id, {
			onDelete: 'restrict',
			onUpdate: 'restrict',
		}),
	name: varchar('name', { length: 255 }).notNull(),
	value: text('value'),
	type: varchar('type', { length: 255 }).notNull().default('text'),
	createdAt: datetime('created_at', { mode: 'string' }).notNull(),
	updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
	deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
});

export const bots = mysqlTable(
	'bots',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		active: tinyint('active').default(1).notNull(),
		type: varchar('type', { length: 255 }).default('whatsapp').notNull(),
		exitMessage: varchar('exit_message', { length: 255 }),
		offlineMessage: text('offline_message'),
		hasInterval: tinyint('has_interval').default(0),
		intervalMessage: text('interval_message'),
		timezone: varchar('timezone', { length: 255 }).default('America/Sao_Paulo'),
		onlineIni: varchar('online_ini', { length: 255 }),
		onlineFin: varchar('online_fin', { length: 255 }),
		responseTimer: int('response_timer').default(3).notNull(),
		monIni: varchar('mon_ini', { length: 255 }),
		monFin: varchar('mon_fin', { length: 255 }),
		tueIni: varchar('tue_ini', { length: 255 }),
		tueFin: varchar('tue_fin', { length: 255 }),
		wedIni: varchar('wed_ini', { length: 255 }),
		wedFin: varchar('wed_fin', { length: 255 }),
		thuIni: varchar('thu_ini', { length: 255 }),
		thuFin: varchar('thu_fin', { length: 255 }),
		friIni: varchar('fri_ini', { length: 255 }),
		friFin: varchar('fri_fin', { length: 255 }),
		satIni: varchar('sat_ini', { length: 255 }),
		satFin: varchar('sat_fin', { length: 255 }),
		sunIni: varchar('sun_ini', { length: 255 }),
		sunFin: varchar('sun_fin', { length: 255 }),
		exitMessageText: text('exit_message_text'),
		sendExitMessage: tinyint('send_exit_message').default(0),
		openingHours: tinyint('opening_hours').default(0),
		defaultBot: tinyint('default_bot').default(0),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: datetime('deleted_at', { mode: 'string' }),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
		};
	},
);

export const botsInteractionHistory = mysqlTable(
	'bots_interaction_history',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		ticketId: bigint('ticket_id', { mode: 'number' }).references(
			() => tickets.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		status: varchar('status', { length: 255 })
			.default('NÃO_INICIADO')
			.notNull(),
		contactId: bigint('contact_id', { mode: 'number' })
			.notNull()
			.references(() => contacts.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		botId: bigint('bot_id', { mode: 'number' })
			.notNull()
			.references(() => bots.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		fatherBotId: bigint('father_bot_id', { mode: 'number' }).references(
			() => bots.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		questionId: bigint('question_id', { mode: 'number' }).references(
			() => questions.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		integrationId: bigint('integration_id', { mode: 'number' }),
		answerId: bigint('answer_id', { mode: 'number' }),
		iaId: bigint('ia_id', { mode: 'number' }),
		actionId: bigint('action_id', { mode: 'number' }),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		contextAnswerId: bigint('context_answer_id', { mode: 'number' }),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
			contactId: index('contact_id').on(table.contactId),
			botId: index('bot_id').on(table.botId),
			questionId: index('question_id').on(table.questionId),
			answerId: index('answer_id').on(table.answerId),
		};
	},
);

export const botsWhatsapps = mysqlTable(
	'bots_whatsapps',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		botId: bigint('bot_id', { mode: 'number' })
			.notNull()
			.references(() => bots.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		whatsappId: bigint('whatsapp_id', { mode: 'number' })
			.notNull()
			.references(() => whatsapps.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).default('NULL'),
		deletedAt: datetime('deleted_at', { mode: 'string' }).default('NULL'),
	},
	table => {
		return {
			botId: index('bot_id').on(table.botId),
			whatsappId: index('whatsapp_id').on(table.whatsappId),
		};
	},
);

export const profiles = mysqlTable(
	'profiles',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		tag: varchar('tag', { length: 255 }).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: datetime('deleted_at', { mode: 'string' }),
	},
	table => {
		return {
			tag: unique('tag').on(table.tag),
		};
	},
);

export const questions = mysqlTable(
	'questions',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		companyId: bigint('company_id', { mode: 'number' })
			.notNull()
			.references(() => companies.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		botsId: bigint('bots_id', { mode: 'number' })
			.notNull()
			.references(() => bots.id, { onDelete: 'restrict', onUpdate: 'restrict' })
			.references(() => bots.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		active: tinyint('active').default(1).notNull(),
		msg: text('text'),
		openTicketFeedMeta: tinyint('open_ticket_feed_meta').default(0),
		replyPost: tinyint('reply_post').default(0),
		replyPostText: text('reply_post_text'),
		isTrigger: tinyint('is_trigger').default(0),
		field: varchar('field', { length: 255 }),
		useContextFields: text('use_context_fields'),
		saveContactCustomField: tinyint('save_contact_custom_field').default(0),
		updateContact: tinyint('update_contact').default(0),
		type: varchar('type', { length: 255 }).default('multiple').notNull(),
		answerType: varchar('answer_type', { length: 255 }).default('list'),
		mediaPath: varchar('media_path', { length: 255 }),
		mediaType: varchar('media_type', { length: 255 }),
		answerParentId: bigint('answer_parent_id', { mode: 'number' }),
		sonQuestionId: bigint('son_question_id', { mode: 'number' }),
		integrationId: bigint('integration_id', { mode: 'number' }),
		actionId: bigint('action_id', { mode: 'number' }),
		iaId: bigint('ia_id', { mode: 'number' }),
		conditionalId: bigint('conditional_id', { mode: 'number' }),
		contextsId: varchar('contexts_id', { length: 255 }).default('').notNull(),
		chatbotContextIdUpdate: bigint('chatbot_context_id_update', {
			mode: 'number',
		}),
		first: tinyint('first').default(0),
		skipContact: tinyint('skip_contact').default(0),
		delayTime: bigint('delay_time', { mode: 'number' }),
		position: text('position'),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: datetime('deleted_at', { mode: 'string' }),
		globalContextId: bigint('global_context_id', { mode: 'number' }).references(
			() => globalContexts.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
	},
	table => {
		return {
			companyId: index('company_id').on(table.companyId),
			botsId: index('bots_id').on(table.botsId),
			questionsSonQuestionIdForeignIdx: foreignKey({
				columns: [table.sonQuestionId],
				foreignColumns: [table.id],
				name: 'questions_son_question_id_foreign_idx',
			})
				.onUpdate('restrict')
				.onDelete('restrict'),
		};
	},
);

export const users = mysqlTable(
	'users',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		profileId: bigint('profile_id', { mode: 'number' })
			.notNull()
			.references(() => profiles.id, {
				onDelete: 'restrict',
				onUpdate: 'restrict',
			}),
		companyId: bigint('company_id', { mode: 'number' }).references(
			() => companies.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		configId: bigint('config_id', { mode: 'number' }),
		name: varchar('name', { length: 255 }).notNull(),
		email: varchar('email', { length: 255 }).notNull(),
		emailToken: varchar('email_token', { length: 255 }),
		emailVerified: tinyint('email_verified').default(1),
		passwordHash: varchar('password_hash', { length: 255 }).notNull(),
		recoveryToken: varchar('recovery_token', { length: 255 }),
		recoveryExpiryDate: datetime('recovery_expiry_date', { mode: 'string' }),
		lastAuthorChangeId: bigint('last_author_change_id', { mode: 'number' }),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: datetime('deleted_at', { mode: 'string' }),
		imageUrl: varchar('image_url', { length: 255 }),
	},
	table => {
		return {
			profileId: index('profile_id').on(table.profileId),
			companyId: index('company_id').on(table.companyId),
			usersLastAuthorChangeIdForeignIdx: foreignKey({
				columns: [table.lastAuthorChangeId],
				foreignColumns: [table.id],
				name: 'users_last_author_change_id_foreign_idx',
			})
				.onUpdate('restrict')
				.onDelete('restrict'),
			emailDeletedAt: unique('email_deleted_at').on(
				table.email,
				table.deletedAt,
			),
		};
	},
);

export const templateContexts = mysqlTable(
	'template_contexts',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull(),
		template_id: bigint('template_id', { mode: 'number' }).references(
			() => templates.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		schedule_message_id: bigint('schedule_message_id', {
			mode: 'number',
		}).references(() => scheduleMessages.id, {
			onDelete: 'restrict',
			onUpdate: 'restrict',
		}),
		order: int('order').notNull(),
		value: varchar('value', { length: 255 }).notNull(),
		type: varchar('type', { length: 255 }).default('body').notNull(),
		global: boolean('global').default(false).notNull(),
		createdAt: datetime('created_at', { mode: 'string' }).notNull(),
		updatedAt: datetime('updated_at', { mode: 'string' }).notNull(),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			schedule_message_id: index('schedule_message_id').on(
				table.schedule_message_id,
			),
			template_id: index('template_id').on(table.template_id),
		};
	},
);

// Relations
export const researcRelations = relations(researchs, ({ many }) => ({
	answers: many(answers),
}));

export const answersRelation = relations(answers, ({ one }) => ({
	researrch: one(researchs, {
		fields: [answers.research_id],
		references: [researchs.id],
	}),
}));

export const scheduleMessageRelations = relations(
	scheduleMessages,
	({ many, one }) => ({
		cadence: many(scheduleMessageCadence),
		whatsapps: many(schedulemessagesWhatsapp),
		contacts: many(schedulemessagesContacts),
		sended_messages: many(schedulemessagesSendMessages),
		csv_contacts: many(scheduleMessageCsv),
		template: one(templates, {
			fields: [scheduleMessages.template_id],
			references: [templates.id],
		}),
		template_contexts: many(templateContexts),
	}),
);

export const scheduleMessageCadenceRelation = relations(
	scheduleMessageCadence,
	({ one }) => ({
		schedulemessage: one(scheduleMessages, {
			fields: [scheduleMessageCadence.schedule_message_id],
			references: [scheduleMessages.id],
		}),
	}),
);

export const contactsRelations = relations(contacts, ({ many, one }) => ({
	contactTags: many(contactTags),
	scheduleSendedMessages: one(schedulemessagesSendMessages, {
		fields: [contacts.id],
		references: [schedulemessagesSendMessages.contact_id],
	}),
}));

export const tagRelations = relations(tags, ({ many }) => ({
	contactTags: many(contactTags),
}));

export const contactsTagsRelations = relations(contactTags, ({ one }) => ({
	contact: one(contacts, {
		fields: [contactTags.contact_id],
		references: [contacts.id],
	}),
	tag: one(tags, {
		fields: [contactTags.tag_id],
		references: [tags.id],
	}),
}));

export const scheduleMessagesWhatsAppRelation = relations(
	schedulemessagesWhatsapp,
	({ one }) => ({
		schedulemessage: one(scheduleMessages, {
			fields: [schedulemessagesWhatsapp.schedule_message_id],
			references: [scheduleMessages.id],
		}),
		whatsapps: one(whatsapps, {
			fields: [schedulemessagesWhatsapp.whatsapp_id],
			references: [whatsapps.id],
		}),
	}),
);

export const scheduleMessagesContactsRelation = relations(
	schedulemessagesContacts,
	({ one }) => ({
		schedulemessage: one(scheduleMessages, {
			fields: [schedulemessagesContacts.schedule_message_id],
			references: [scheduleMessages.id],
		}),
	}),
);

export const scheduleMessagesSendMessageRelation = relations(
	schedulemessagesSendMessages,
	({ one, many }) => ({
		contacts: many(contacts),
		csv: many(scheduleMessageCsv),
		schedulemessage: one(scheduleMessages, {
			fields: [schedulemessagesSendMessages.schedule_message_id],
			references: [scheduleMessages.id],
		}),
	}),
);

export const scheduleMessageCsvRelation = relations(
	scheduleMessageCsv,
	({ one }) => ({
		schedulemessage: one(scheduleMessages, {
			fields: [scheduleMessageCsv.schedule_message_id],
			references: [scheduleMessages.id],
		}),
		report: one(schedulemessagesSendMessages, {
			fields: [scheduleMessageCsv.schedule_message_id],
			references: [schedulemessagesSendMessages.schedule_message_id],
		}),
	}),
);

export const messagingsRelation = relations(messagings, ({ many }) => ({
	messagingsInterval: many(messagingsInterval),
}));

export const messagingsIntervalRelation = relations(
	messagingsInterval,
	({ one }) => ({
		messaging: one(messagings, {
			fields: [messagingsInterval.messagingId],
			references: [messagings.id],
		}),
	}),
);

export const templateContextsRelations = relations(
	templateContexts,
	({ one }) => ({
		template: one(templates, {
			fields: [templateContexts.template_id],
			references: [templates.id],
		}),
		scheduleMessage: one(scheduleMessages, {
			fields: [templateContexts.schedule_message_id],
			references: [scheduleMessages.id],
		}),
	}),
);

export const groups = mysqlTable(
	'groups',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().notNull().primaryKey(),
		group_name: varchar('group_name', { length: 255 }),
		owner_number_id: varchar('owner_number_id', { length: 255 }),
		group_picture_url: text('group_picture_url'),
		group_id: varchar('group_id', { length: 255 }),
		company_id: bigint('company_id', { mode: 'number' }).references(
			() => companies.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		whatsapp_id: bigint('whatsapp_id', { mode: 'number' }).references(
			() => whatsapps.id,
			{ onDelete: 'restrict', onUpdate: 'restrict' },
		),
		pinned: boolean('pinned').default(false),
		muted: boolean('muted').default(false),
		group_ticket: boolean('group_ticket').default(false),
		current_ticket_id: varchar('current_ticket_id', { length: 255 }),
		createdAt: datetime('created_at', { mode: 'string' }),
		updatedAt: datetime('updated_at', { mode: 'string' }),
		deletedAt: date('deleted_at').default(sql`CURRENT_TIMESTAMP`),
	},
	table => {
		return {
			company_id: index('groups_company_id').on(table.company_id),
			whatsapp_id: index('groups_whatsapp_id').on(table.whatsapp_id),
			group_id: index('groups_group_id').on(table.group_id),
		};
	},
);
