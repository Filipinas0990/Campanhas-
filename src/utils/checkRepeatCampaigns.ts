import dayjs from 'dayjs';

import log from '@/logs';

export const checkRepeatCampaigns = (
	startDateTime: dayjs.Dayjs,
	repeat: string,
): {
	day: string;
	minute: string;
	hour: string;
	month: string;
	dayWeek: string;
} => {
	const minute = String(startDateTime.get('minute'));
	const hour = String(startDateTime.get('hour'));
	let day = '*';
	let month = '*';
	let dayWeek = '*';

	log.info({ StartDate: startDateTime.format() }, 'Check Repeat Campaigns');

	switch (repeat) {
		case 'Diariamente': {
			break;
		}
		case 'Semanalmente': {
			dayWeek = String(startDateTime.get('day'));
			break;
		}
		case 'Quinzenal': {
			let scheduleDay = startDateTime.get('date');
			const currentDate = new Date();
			const currentYear = currentDate.getFullYear();
			const currentMonth = currentDate.getMonth();

			const lastDayInMonth = new Date(
				currentYear,
				currentMonth + 1,
				0,
			).getDate();

			if (scheduleDay > 15) {
				scheduleDay -= 15;
			} else {
				scheduleDay = Math.min(scheduleDay + 15, lastDayInMonth);
			}

			day = String(startDateTime.get('date')).concat(String(`,${scheduleDay}`));
			break;
		}
		case 'Mensal': {
			const currentDate = new Date();
			const currentYear = currentDate.getFullYear();
			const currentMonth = currentDate.getMonth();

			const lastDayInMonth = new Date(
				currentYear,
				currentMonth + 1,
				0,
			).getDate();

			if (startDateTime.get('date') > lastDayInMonth) {
				day = String(lastDayInMonth);
				break;
			}

			day = String(startDateTime.get('date'));
			break;
		}
		case 'Trimestral': {
			const scheduleDay = startDateTime.get('date');
			const currentDate = new Date();
			const currentYear = currentDate.getFullYear();

			const getLastDayOfMonth = (year, month) =>
				new Date(year, month + 1, 0).getDate();

			const quarterlyMonths = [0, 3, 6, 9];
			const daysInQuarterMonths = quarterlyMonths.map(month => {
				const lastDayOfMonth = getLastDayOfMonth(currentYear, month);
				return scheduleDay > lastDayOfMonth ? lastDayOfMonth : scheduleDay;
			});

			const formattedMonths = quarterlyMonths.map(month => month + 1);

			day = daysInQuarterMonths.join(',');
			month = formattedMonths.join(',');

			break;
		}

		case 'Semestral': {
			let scheduleMonth = startDateTime.get('month');

			if (scheduleMonth > 5) {
				scheduleMonth -= 6;
			} else {
				scheduleMonth += 6;
			}

			month = String(`${startDateTime.get('month') + 1},${scheduleMonth + 1}`);

			break;
		}
		default: {
			day = String(startDateTime.get('date'));
			month = String(startDateTime.get('month') + 1);
		}
	}

	return {
		day,
		minute,
		hour,
		month,
		dayWeek,
	};
};
