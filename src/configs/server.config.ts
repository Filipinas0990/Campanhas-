import { envConfig } from '@/configs';

interface IServer {
	port: number;
	host: string;
}

export const serverConfig: IServer = {
	port: envConfig.FASTIFY_PORT,
	host: envConfig.FASTIFY_HOST,
};

export default serverConfig;
