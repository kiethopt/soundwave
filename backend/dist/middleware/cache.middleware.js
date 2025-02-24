"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCacheForEntity = exports.setCache = exports.cacheMiddleware = exports.client = void 0;
const redis_1 = require("redis");
exports.client = (0, redis_1.createClient)({
    username: 'default',
    password: 'BAjFVLaluLLeQzEwR7IoOuKWUHSyJtas',
    socket: {
        host: 'redis-12768.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com',
        port: 12768,
    },
});
exports.client.on('error', (err) => console.log('Redis Client Error', err));
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.client.connect();
        console.log('Connected to Redis');
    }
    catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
}))();
const cacheMiddleware = (req, res, next) => {
    if (process.env.USE_REDIS_CACHE === 'false') {
        console.log('[Redis] Cache is disabled - bypassing middleware');
        next();
        return;
    }
    const key = req.originalUrl;
    let responseSent = false;
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log(`[Redis] Checking cache for key: ${key}`);
            const cachedData = yield exports.client.get(key);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${key}`);
                console.log('[Redis] Serving data from cache');
                res.json(JSON.parse(cachedData));
                responseSent = true;
                return;
            }
            console.log(`[Redis] Cache miss for key: ${key}`);
            console.log('[Redis] Fetching data from database');
            const originalJson = res.json;
            res.json = function (body) {
                if (!responseSent) {
                    console.log(`[Redis] Caching new data for key: ${key}`);
                    (0, exports.setCache)(key, body).catch((error) => console.error('[Redis] Cache save error:', error));
                }
                return originalJson.call(this, body);
            };
            next();
        }
        catch (error) {
            console.error('[Redis] Middleware error:', error);
            next();
        }
    }))();
};
exports.cacheMiddleware = cacheMiddleware;
const setCache = (key_1, data_1, ...args_1) => __awaiter(void 0, [key_1, data_1, ...args_1], void 0, function* (key, data, ttl = 600) {
    if (process.env.USE_REDIS_CACHE === 'false')
        return;
    try {
        console.log(`[Redis] Setting cache for key: ${key} (TTL: ${ttl}s)`);
        yield exports.client.set(key, JSON.stringify(data), { EX: ttl });
        console.log(`[Redis] Cache set successfully for key: ${key}`);
    }
    catch (error) {
        console.error('[Redis] Error setting cache:', error);
    }
});
exports.setCache = setCache;
const clearCacheForEntity = (entity, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.USE_REDIS_CACHE === 'false')
        return;
    try {
        console.log(`[Redis] Clearing cache for entity: ${entity}`);
        const patterns = [
            `/api/${entity}s*`,
            `/api/${entity}/*`,
            ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
        ];
        if (entity === 'user') {
            patterns.push('/api/admin/users*', '/admin/api/users*', '/api/users/search*', '/api/user/following*', '/api/user/followers*');
        }
        if (entity === 'artist') {
            patterns.push('/api/admin/artists*', '/api/artists*', '/api/artist/*');
        }
        if (entity === 'artist-requests') {
            patterns.push('/api/admin/artist-requests*', '/api/artist-requests*', '/api/users/check-artist-request*');
        }
        if (entity === 'album') {
            patterns.push('/api/admin/albums*', '/api/albums*', '/api/album/*');
        }
        if (entity === 'track') {
            patterns.push('/api/admin/tracks*', '/api/tracks*', '/api/track/*');
        }
        if (options.clearSearch) {
            patterns.push('/api/search*', '/api/*/search*', '/search-all*', `/api/${entity}s/search*`, `/api/${entity}/search*`);
        }
        for (const pattern of patterns) {
            const keys = yield exports.client.keys(pattern);
            if (keys.length) {
                console.log(`[Redis] Clearing ${keys.length} keys for pattern: ${pattern}`);
                yield Promise.all(keys.map((key) => exports.client.del(key)));
            }
        }
        if (entity === 'user' || entity === 'stats') {
            const statsKeys = yield exports.client.keys('/api/admin/stats*');
            if (statsKeys.length) {
                console.log(`[Redis] Clearing stats cache`);
                yield Promise.all(statsKeys.map((key) => exports.client.del(key)));
            }
        }
    }
    catch (error) {
        console.error(`[Redis] Error clearing ${entity} cache:`, error);
    }
});
exports.clearCacheForEntity = clearCacheForEntity;
//# sourceMappingURL=cache.middleware.js.map