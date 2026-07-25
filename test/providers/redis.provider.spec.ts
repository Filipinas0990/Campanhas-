import { redisClient } from '../../src/providers/redis.provider';

// eslint-disable-next-line global-require, import/no-extraneous-dependencies
jest.mock('ioredis', () => require('ioredis-mock'));

describe('redis.provider', () => {
	afterAll(async () => {
		await redisClient.quit();
	});

	it('deve expor um client ioredis singleton', () => {
		expect(redisClient).toBeDefined();
		expect(typeof redisClient.get).toBe('function');
		expect(typeof redisClient.set).toBe('function');
	});

	it('deve gravar e ler valores (round-trip)', async () => {
		await redisClient.set('test:key', 'hello', 'EX', 60);
		const value = await redisClient.get('test:key');
		expect(value).toBe('hello');
	});

	it('deve respeitar TTL ao usar EX', async () => {
		await redisClient.set('test:ttl', 'x', 'EX', 100);
		const ttl = await redisClient.ttl('test:ttl');
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(100);
	});
});
