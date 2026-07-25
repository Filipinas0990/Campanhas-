import dayjs from 'dayjs';

import { validateDateTimeRange } from '@/utils/validateDateTimeRange';

// jest.mock('@/logs', () => ({
// 	log.info: jest.fn(),
// }));

describe('validateDateTimeRange - Custom Cases', () => {
	const timeZone = 'America/Sao_Paulo';

	it('Caso 1: Fora do intervalo de data, mas dentro do intervalo de hora. Agendamento ajustado para o próximo dia válido.', () => {
		const startDateTime = dayjs('2024-11-29 13:00').utc().toDate();
		const endDateTime = dayjs('2024-11-30 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-28 14:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(true);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-29 13:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 2: Fora do intervalo de data e hora. Agendamento ajustado para o próximo dia dentro do intervalo de horário válido.', () => {
		const startDateTime = dayjs('2024-11-30 17:00').utc().toDate();
		const endDateTime = dayjs('2024-11-30 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-28 14:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(false);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-30 17:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 3: Dentro do intervalo de data, mas fora do intervalo de hora. Agendamento ajustado para o próximo horário válido dentro do intervalo.', () => {
		const startDateTime = dayjs('2024-11-28 17:00').utc().toDate();
		const endDateTime = dayjs('2024-11-30 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-29 14:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(true);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-29 17:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 4: Dentro do intervalo de data, mas antes do início do horário. Agendamento ajustado para o início do intervalo.', () => {
		const startDateTime = dayjs('2024-11-28 13:00').utc().toDate();
		const endDateTime = dayjs('2024-11-28 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-28 12:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(false);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-28 13:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 5: Dentro do intervalo de data e horário, sem ajustes necessários', () => {
		const startDateTime = dayjs('2024-11-28 13:00').utc().toDate();
		const endDateTime = dayjs('2024-11-28 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-28 14:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(true);
		expect(result.isWithScheduleNextDateAndTime).toBe(false);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-28 14:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 6: O horário de início está no mesmo dia, mas já passou o horário. Sem agenda para o próximo dia.', () => {
		const startDateTime = dayjs('2024-11-28 13:00').utc().toDate();
		const endDateTime = dayjs('2024-11-28 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-28 22:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(false);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-28 13:00').utc().tz(timeZone).format(),
		);
	});

	it('Caso 7: Dentro do intervalo de data, mas fora do intervalo de hora no próximo dia. Agendamento ajustado para o horário válido', () => {
		const startDateTime = dayjs('2024-11-29 13:00').utc().toDate();
		const endDateTime = dayjs('2024-11-30 21:00').utc().toDate();
		const currentDateTime = dayjs('2024-11-29 22:00').utc().toDate();

		const result = validateDateTimeRange({
			currentDateTime,
			startDateTime,
			endDateTime,
			timeZone,
		});

		expect(result.isWithinDateAndTimeRange).toBe(false);
		expect(result.isWithScheduleNextDateAndTime).toBe(true);
		expect(dayjs(result.startScheduleDateTime).format()).toBe(
			dayjs('2024-11-30 13:00').utc().tz(timeZone).format(),
		);
	});
});
