import dayjs from 'dayjs';
import os from 'node:os';
import logger from 'pino';

const isProduction = process.env.NODE_ENV === 'prod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loggerConfig: any = {
	base: {
		pid: false,
		hostname: os.hostname(),
	},
	timestamp: () => `,"time":"${dayjs().locale('pt-br').format()}"`,
};

if (!isProduction) {
	loggerConfig.transport = {
		target: 'pino-pretty',
	};
}

const log = logger(loggerConfig);

export default log;
