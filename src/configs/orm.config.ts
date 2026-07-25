import { envConfig } from '@/configs';

interface IOrm {
	host: string;
	user: string;
	password: string;
	database: string;
	port: number;
}

const ormConfig: IOrm = {
	host: envConfig.DB_HOST,
	user: envConfig.DB_USER,
	password: envConfig.DB_PASSWORD,
	database: envConfig.DB_DATABASE,
	port: envConfig.DB_PORT,
};

export default ormConfig;
