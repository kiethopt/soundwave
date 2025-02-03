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
  if (process.env.USE_REDIS_CACHE === 'false') {
    console.log('[Redis] Cache is disabled - bypassing middleware');
    next();
    return;
  }

  const key = req.originalUrl;
  let responseSent = false;

  (async () => {
    try {
      console.log(`[Redis] Checking cache for key: ${key}`);
      const cachedData = await client.get(key);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${key}`);
        res.json(JSON.parse(cachedData));
        responseSent = true;
        return;
      }
      console.log(`[Redis] Cache miss for key: ${key}`);

      const originalJson = res.json;
      res.json = function (body: any) {
        if (!responseSent) {
          console.log(`[Redis] Caching data for key: ${key}`);
          setCache(key, body).catch((error) =>
            console.error('[Redis] Cache save error:', error)
          );
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('[Redis] Middleware error:', error);
      next();
    }
  })();
};

export const setCache = async (key: string, data: any, ttl: number = 600) => {
  if (process.env.USE_REDIS_CACHE === 'false') return;

  try {
    console.log(`[Redis] Setting cache for key: ${key} (TTL: ${ttl}s)`);
    await client.set(key, JSON.stringify(data), { EX: ttl });
    console.log(`[Redis] Cache set successfully for key: ${key}`);
  } catch (error) {
    console.error('[Redis] Error setting cache:', error);
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
  if (process.env.USE_REDIS_CACHE === 'false') return;

  try {
    console.log(`[Redis] Clearing cache for entity: ${entity}`);

    // Tạo danh sách các pattern cần xóa
    const patterns = [
      `/api/${entity}s*`, // Xóa cache của entity (số nhiều)
      ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
      `/api/${entity}s/play*`, // Pattern cho route play (số nhiều)
      `/api/${entity}/play*`, // Pattern cho route play (số ít)
    ];

    if (options.clearSearch) {
      patterns.push(
        '/api/search*', // Cache các route search tổng
        '/api/*/search*', // Cache các route search con
        '/search-all*', // Cache của searchAll
        '/api/users/search-all*', // Cache của user search
        '/api/user/search-all*', // Cache của user search (số ít)
        `/api/${entity}s/search*`, // Cache của entity search (số nhiều)
        `/api/${entity}/search*` // Cache của entity search (số ít)
      );
    }

    // Xóa cache cho từng pattern
    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length) {
        console.log(
          `[Redis] Clearing ${keys.length} keys for pattern: ${pattern}`
        );
        await Promise.all(keys.map((key) => client.del(key)));
      }
    }

    // Xóa thêm cache liên quan đến play và search
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
    console.error(`[Redis] Error clearing ${entity} cache:`, error);
  }
};
