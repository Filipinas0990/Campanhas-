import { envConfig } from '@/configs';

interface IMicroService {
	scheduleMS: string;
}

export const serverConfig: IMicroService = {
	scheduleMS: envConfig.API_SCHEDULE,
};

export default serverConfig;
