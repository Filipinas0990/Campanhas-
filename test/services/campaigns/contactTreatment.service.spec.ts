import { db } from '@/database';
import contactTreatmentService from '@/services/campaigns/contactTreatment.service';

jest.mock('@/logs', () => ({
	__esModule: true,
	default: {
		info: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('@/database', () => ({
	db: {
		select: jest.fn(),
		selectDistinct: jest.fn(),
	},
}));

const mockDb = db as unknown as {
	select: jest.Mock;
	selectDistinct: jest.Mock;
};

type QueryTerminal = 'where' | 'offset';

function makeQuery(result: unknown[], terminal: QueryTerminal) {
	const query = {
		from: jest.fn(),
		innerJoin: jest.fn(),
		where: jest.fn(),
		limit: jest.fn(),
		offset: jest.fn(),
	};

	query.from.mockReturnValue(query);
	query.innerJoin.mockReturnValue(query);
	query.where.mockReturnValue(terminal === 'where' ? result : query);
	query.limit.mockReturnValue(query);
	query.offset.mockReturnValue(result);

	return query;
}

describe('contactTreatmentService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('exclui atendimentos abertos antes de paginar contatos por tags', async () => {
		const firstPageContacts = [
			{ id: 6, name: 'Contato 6', number: '5588999990006' },
			{ id: 7, name: 'Contato 7', number: '5588999990007' },
			{ id: 8, name: 'Contato 8', number: '5588999990008' },
			{ id: 9, name: 'Contato 9', number: '5588999990009' },
			{ id: 10, name: 'Contato 10', number: '5588999990010' },
		];

		mockDb.select
			.mockReturnValueOnce(makeQuery([{ ddd: '88' }], 'where'))
			.mockReturnValueOnce(makeQuery([], 'offset'));

		const tagsQuery = makeQuery(firstPageContacts, 'offset');
		mockDb.selectDistinct.mockReturnValueOnce(tagsQuery);

		const result = await contactTreatmentService({
			company_id: 1,
			page: 1,
			limit: 5,
			category: 'campaign',
			schedule_message: {
				id: 10,
				all_contacts: false,
				send_contacts: null,
				tags: '100,200',
				type: 'whatsapp',
				csv_contacts: [],
				restrict_ddd: false,
			},
		});

		expect(tagsQuery.limit).toHaveBeenCalledWith(5);
		expect(tagsQuery.offset).toHaveBeenCalledWith(0);
		expect(mockDb.select).toHaveBeenCalledTimes(2);
		expect(result.destinaries).toEqual(firstPageContacts);
	});
});
