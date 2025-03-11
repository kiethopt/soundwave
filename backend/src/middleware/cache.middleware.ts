import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

export const client = createClient({
  username: 'default',
  password: 'BAjFVLaluLLeQzEwR7IoOuKWUHSyJtas',
  socket: {
    host: 'redis-12768.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com',
    port: 12768,
  },
});

client.on('error', (err) => console.error('Redis error:', err));

// Kết nối Redis nếu cache được bật
if (process.env.USE_REDIS_CACHE === 'true') {
  (async () => {
    try {
      if (!client.isOpen) {
        await client.connect();
      }
    } catch (error) {
      console.error('Redis connection failed:', error);
    }
  })();
}

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.USE_REDIS_CACHE !== 'true') {
    console.log(
      `[Redis] Cache disabled - bypassing cache for: ${req.originalUrl}`
    );
    next();
    return;
  }

  if (!client.isOpen) {
    console.log(
      `[Redis] Client not connected - bypassing cache for: ${req.originalUrl}`
    );
    next();
    return;
  }

  const key = req.originalUrl;
  let responseSent = false;

  (async () => {
    try {
      const cachedData = await client.get(key);

      if (cachedData) {
        console.log(`[Redis] Cache hit for: ${key}`);
        res.json(JSON.parse(cachedData));
        responseSent = true;
        return;
      }

      console.log(`[Redis] Cache miss for: ${key}`);

      const originalJson = res.json;
      res.json = function (body: any) {
        if (!responseSent) {
          console.log(`[Redis] Caching data for: ${key}`);
          setCache(key, body).catch((error) =>
            console.error('Cache save error:', error)
          );
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  })();
};

export const setCache = async (key: string, data: any, ttl: number = 600) => {
  if (process.env.USE_REDIS_CACHE !== 'true' || !client.isOpen) return;

  try {
    await client.set(key, JSON.stringify(data), { EX: ttl });
  } catch (error) {
    console.error('Cache set error:', error);
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
  if (process.env.USE_REDIS_CACHE !== 'true' || !client.isOpen) return;

  try {
    // Tạo danh sách các pattern cần xóa
    const patterns = [
      `/api/${entity}s*`,
      `/api/${entity}/*`,
      ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
    ];

    // Thêm xử lý cho các entity có endpoint admin
    const adminEntities = ['user', 'artist', 'genre', 'album', 'track'];
    if (adminEntities.includes(entity)) {
      patterns.push(`/api/admin/${entity}s*`);
    }

    // Xử lý entity đặc biệt
    if (entity === 'artist') {
      patterns.push(
        '/api/admin/artists*',
        '/api/artists*',
        '/api/artist/*',
        '/api/top-artists',
        ...(options.entityId
          ? [
              `/api/artists/${options.entityId}/tracks*`,
              `/api/artists/${options.entityId}/albums*`,
            ]
          : [])
      );
    }

    if (entity === 'user') {
      patterns.push(
        '/api/admin/users*',
        '/admin/api/users*',
        '/api/users/search*',
        '/api/user/following*',
        '/api/user/followers*',
        ...(options.userId
          ? [`/api/user/${options.userId}/recommended-artists`]
          : [])
      );
    }

    if (entity === 'album') {
      patterns.push(
        '/api/admin/albums*',
        '/api/albums*',
        '/api/album/*',
        '/api/top-albums'
      );
    }

    if (entity === 'track') {
      patterns.push(
        '/api/admin/tracks*',
        '/api/tracks*',
        '/api/track/*',
        '/api/top-tracks'
      );
    }

    if (entity === 'history') {
      patterns.push(
        '/api/top-albums',
        '/api/top-artists',
        '/api/top-tracks',
        ...(options.userId
          ? [`/api/user/${options.userId}/recommended-artists`]
          : [])
      );
    }

    if (options.clearSearch) {
      patterns.push(
        '/api/search*',
        '/api/*/search*',
        '/search-all*',
        `/api/${entity}s/search*`,
        `/api/${entity}/search*`
      );
    }

    for (const pattern of patterns) {
      const keys = await client.keys(pattern);
      if (keys.length) {
        await Promise.all(keys.map((key) => client.del(key)));
      }
    }

    if (entity === 'user' || entity === 'stats' || entity === 'history') {
      const statsKeys = await client.keys('/api/admin/stats*');
      if (statsKeys.length) {
        await Promise.all(statsKeys.map((key) => client.del(key)));
      }
    }
  } catch (error) {
    console.error(`Error clearing ${entity} cache:`, error);
  }
};
