interface ICors {
	origin: string;
	credentials: boolean;
	methods: string[];
	allowedHeaders: string[];
}

const corsConfig: ICors = {
	origin: '*',
	credentials: false,
	methods: ['GET', 'POST', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsConfig;
