import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

export const client = createClient({
  username: 'default',
  password: 'OIiJohR2wCpl3G6rxhfX81YneBXFASPn',
  socket: {
    host: 'redis-14705.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
    port: 14705,
  },
});

client.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.USE_REDIS_CACHE !== 'true') {
    next();
    return;
  }

  const key = req.originalUrl;
  client
    .get(key)
    .then((cachedData) => {
      if (cachedData) {
        console.log('Serving from cache:', key);
        res.json(JSON.parse(cachedData));
        return;
      }

      const originalJson = res.json;
      res.json = function (body: any) {
        setCache(key, body);
        return originalJson.call(res, body);
      };
      next();
    })
    .catch((error) => {
      console.error('Redis error:', error);
      next();
    });
};

export const setCache = async (key: string, data: any, ttl: number = 600) => {
  if (process.env.USE_REDIS_CACHE !== 'true') return;

  try {
    await client.set(key, JSON.stringify(data), { EX: ttl });
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const clearCacheForEntity = async (
  entity: string,
  options: {
    userId?: string;
    adminId?: string;
    entityId?: string;
    clearSearch?: boolean;
  }
) => {
  if (process.env.USE_REDIS_CACHE !== 'true') return;

  try {
    // Tạo danh sách patterns cần xóa
    const patterns = [
      `/api/${entity}s*`, // Xóa cache của entity
      ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
      `/api/${entity}s/play*`, // Thêm pattern cho route play
      `/api/${entity}/play*`, // Thêm pattern cho route play (số ít)
    ];

    // Nếu clearSearch = true, thêm các pattern liên quan đến tìm kiếm
    if (options.clearSearch) {
      patterns.push(
        '/api/search*', // Cache của các route search
        '/api/*/search*', // Cache của các route search con
        '/search-all*', // Cache của searchAll
        '/api/users/search-all*', // Cache của user search
        '/api/user/search-all*', // Cache của user search
        `/api/${entity}s/search*`, // Cache của entity search
        `/api/${entity}/search*` // Cache của entity search (số ít)
      );
    }

    // Xóa cache cho từng pattern
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length) {
        console.log(`Clearing cache for pattern: ${pattern}, keys:`, keys);
        await Promise.all(keys.map((key) => client.del(key)));
      }
    }

    // Xóa thêm các cache liên quan đến play và search
    const additionalPatterns = [
      '*play*', // Bất kỳ key nào có chứa 'play'
      '*search*', // Bất kỳ key nào có chứa 'search'
    ];

    for (const pattern of additionalPatterns) {
      const keys = await client.keys(pattern);
      if (keys.length) {
        console.log(
          `Clearing additional cache for pattern: ${pattern}, keys:`,
          keys
        );
        await Promise.all(keys.map((key) => client.del(key)));
      }
    }
  } catch (error) {
    console.error(`Error clearing ${entity} cache:`, error);
  }
};
