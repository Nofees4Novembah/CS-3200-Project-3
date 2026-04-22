import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = createClient({
  url: redisUrl
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

let connected = false;

/**
 * Connects to Redis once and reuses the same client for the application lifecycle.
 */
async function connectRedis() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
}

/**
 * Closes the Redis client connection.
 */
async function closeRedis() {
  if (connected) {
    await client.quit();
    connected = false;
  }
}

/**
 * Prepares Redis for application startup by ensuring the client is connected
 * and clearing any stale keys before the cache is warmed from MongoDB.
 */
async function initializeRedisCache() {
  await connectRedis();
  try {
    await client.flushAll();
  } finally {
    await closeRedis();
  }
}

export { client, connectRedis, closeRedis, initializeRedisCache };
