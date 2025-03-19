import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';

class MockRedisClient {
  isOpen = false;

  // Thêm phương thức on để giải quyết lỗi 1
  on(event: string, listener: (err: Error) => void): this {
    // Không làm gì cả - chỉ là mock
    return this;
  }

  async connect() {
    console.log('[Redis] Mock client connected');
    this.isOpen = true;
    return this;
  }

  async disconnect() {
    console.log('[Redis] Mock client disconnected');
    this.isOpen = false;
    return this;
  }

  async get() {
    return null;
  }

  // Sửa cách khai báo set để phù hợp với cách gọi ở hàm setCache
  async set(key: string, value: string, options?: any) {
    return 'OK';
  }

  async del() {
    return 1;
  }

  async keys() {
    return [];
  }
}

// Type assertion để TypeScript không phàn nàn
export const client =
  process.env.USE_REDIS_CACHE === 'true'
    ? createClient({
        username: 'default',
        password: 'BAjFVLaluLLeQzEwR7IoOuKWUHSyJtas',
        socket: {
          host: 'redis-12768.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com',
          port: 12768,
        },
      })
    : (new MockRedisClient() as unknown as RedisClientType);

if (process.env.USE_REDIS_CACHE === 'true') {
  // Đã được định danh kiểu rõ ràng tham số err
  client.on('error', (err: Error) => console.error('Redis error:', err));
  client.on('connect', () =>
    console.log('[Redis] Client connected successfully')
  );
  client.on('ready', () => console.log('[Redis] Client ready to use'));

  // Kết nối Redis nếu cache được bật
  (async () => {
    try {
      if (!client.isOpen) {
        await client.connect();
        console.log(
          '[Redis] Connection status:',
          client.isOpen ? 'Connected' : 'Disconnected'
        );
      }
    } catch (error) {
      console.error('Redis connection failed:', error);
    }
  })();
} else {
  console.log('[Redis] Using mock Redis client - cache disabled');
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
        const parsedData = JSON.parse(cachedData);
        res.json(parsedData);
        responseSent = true;
        return;
      }

      console.log(`[Redis] Cache miss for: ${key}`);

      // Lưu JSON gốc
      const originalJson = res.json;
      res.json = function (body: any) {
        if (!responseSent) {
          responseSent = true; // Tránh set cache nhiều lần
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

export const setCache = async (key: string, data: any, ttl: number = 3600) => {
  if (process.env.USE_REDIS_CACHE !== 'true' || !client.isOpen) return;

  try {
    console.log(`[Redis] Setting cache for ${key} with TTL ${ttl}s`);
    await client.set(key, JSON.stringify(data), { EX: ttl });
    console.log(`[Redis] Cache set successfully for ${key}`);
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
