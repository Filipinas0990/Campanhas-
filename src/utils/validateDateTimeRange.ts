import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import log from '@/logs';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

type InDateTimeRange = {
	currentDateTime?: Date;
	startDateTime: Date;
	endDateTime: Date;
	timeZone: string;
};

type DateTimeValidationResult = {
	isWithinDateAndTimeRange: boolean;
	isWithScheduleNextDateAndTime: boolean;
	startScheduleDateTime: dayjs.Dayjs;
};

export const validateDateTimeRange = (
	input: InDateTimeRange,
): DateTimeValidationResult => {
	try {
		if (!input.startDateTime || !input.endDateTime) {
			throw new Error('Start and end date/time must be provided.');
		}

		const currentDateTime = input.currentDateTime
			? dayjs(input.currentDateTime).utc().tz(input.timeZone)
			: dayjs().utc().tz(input.timeZone);

		const startDate = dayjs(input.startDateTime).utc().tz(input.timeZone);
		const endDate = dayjs(input.endDateTime).utc().tz(input.timeZone);

		// Verifica se está dentro do intervalo de datas
		const isWithinDateRange = currentDateTime.isBetween(
			startDate,
			endDate,
			'day',
			'[]',
		);

		// Compara os horários
		const currentTime = currentDateTime.format('HH:mm');
		const startTime = startDate.format('HH:mm');
		const endTime = endDate.format('HH:mm');

		const isWithinTimeRange = dayjs(`2000-01-01 ${currentTime}`).isBetween(
			dayjs(`2000-01-01 ${startTime}`),
			dayjs(`2000-01-01 ${endTime}`),
			'minute',
			'[)',
		);

		// Verifica se há agenda para o próximo dia
		const nextDay = currentDateTime.add(1, 'day');
		const isWithScheduleNextDateAndTime = nextDay.isBetween(
			startDate,
			endDate,
			'day',
			'[]',
		);

		let startScheduleDateTime: dayjs.Dayjs;

		if (isWithinDateRange && isWithinTimeRange) {
			// Está dentro do intervalo de data e hora
			startScheduleDateTime = currentDateTime;
		} else if (
			isWithinDateRange &&
			!isWithinTimeRange &&
			currentDateTime.isBefore(endDate)
		) {
			// Dentro do intervalo de datas, mas fora do horário permitido
			startScheduleDateTime = startDate
				.set('year', currentDateTime.year())
				.set('month', currentDateTime.month())
				.set('date', currentDateTime.date());

			// Se o horário calculado já passou, ajusta para o próximo dia
			if (startScheduleDateTime.isBefore(currentDateTime)) {
				startScheduleDateTime = startScheduleDateTime.add(1, 'day');
			}
		} else {
			// Está após o final do intervalo
			startScheduleDateTime = startDate;
		}

		// Log para debug
		log.info({
			module: 'consume',
			success: true,
			msg: `Datas de envio da campanha ${JSON.stringify(
				{
					currentDateTime: currentDateTime.tz(input.timeZone).format(),
					startDateTime: startDate.tz(input.timeZone).format(),
					endDateTime: endDate.tz(input.timeZone).format(),
					startScheduleDateTime: startScheduleDateTime
						.tz(input.timeZone)
						.format(),
					isWithinDateRange,
					isWithinTimeRange,
					isWithScheduleNextDateAndTime,
				},
				null,
				2,
			)}`,
		});

		return {
			isWithinDateAndTimeRange: isWithinDateRange && isWithinTimeRange,
			isWithScheduleNextDateAndTime,
			startScheduleDateTime,
		};
	} catch (error) {
		throw new Error(error.message || 'Error validating date/time range.');
	}
};
