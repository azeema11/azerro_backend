import Redis from 'ioredis';

// Create a single Redis instance using the REDIS_URL from the environment
// Defaults to the redis container hostname for docker-compose setups
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

redisClient.on('connect', () => {
    console.log('Successfully connected to Redis');
});

export default redisClient;
