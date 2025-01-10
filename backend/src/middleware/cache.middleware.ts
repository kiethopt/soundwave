import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

// Khởi tạo Redis client
export const client = createClient({
  username: 'default',
  password: 'OIiJohR2wCpl3G6rxhfX81YneBXFASPn',
  socket: {
    host: 'redis-14705.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
    port: 14705,
  },
});

// Xử lý lỗi kết nối Redis
client.on('error', (err) => console.log('Redis Client Error', err));

// Kết nối đến Redis
(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

/**
 * Middleware để cache response của các route GET
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export const cacheMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

  if (!useRedisCache) {
    console.log('Redis cache is disabled. Skipping cache middleware.');
    next();
    return;
  }

  const key = req.originalUrl || req.url;

  try {
    const cachedData = await client.get(key);
    if (cachedData) {
      console.log('Serving from Redis cache:', key);
      res.json(JSON.parse(cachedData));
      return;
    }

    console.log('Cache miss:', key);

    // Ghi đè phương thức res.json để lưu dữ liệu vào cache
    const originalJson = res.json;
    res.json = (body: any) => {
      setCache(key, body); // Lưu dữ liệu vào cache
      return originalJson.call(res, body);
    };

    next();
  } catch (error) {
    console.error('Redis error:', error);
    next(); // Tiếp tục xử lý request mà không sử dụng cache
  }
};

/**
 * Hàm để lưu dữ liệu vào cache
 * @param key - Key để lưu cache
 * @param data - Dữ liệu cần lưu
 */
export const setCache = async (key: string, data: any, ttl: number = 600) => {
  const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

  if (!useRedisCache) {
    console.log('Redis cache is disabled. Skipping setCache.');
    return;
  }

  try {
    const serializedData = JSON.stringify(data);
    await client.set(key, serializedData, { EX: ttl });
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Hàm để xóa tất cả cache liên quan đến tìm kiếm album
 */
export const clearSearchCache = async (
  pattern: string = '/api/albums/search*'
) => {
  const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

  if (!useRedisCache) {
    console.log('Redis cache is disabled. Skipping clearSearchCache.');
    return;
  }

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Error clearing search cache:', error);
  }
};
