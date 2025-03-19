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
class MockRedisClient {
    constructor() {
        this.isOpen = false;
    }
    on(event, listener) {
        return this;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[Redis] Mock client connected');
            this.isOpen = true;
            return this;
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[Redis] Mock client disconnected');
            this.isOpen = false;
            return this;
        });
    }
    get() {
        return __awaiter(this, void 0, void 0, function* () {
            return null;
        });
    }
    set(key, value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return 'OK';
        });
    }
    del() {
        return __awaiter(this, void 0, void 0, function* () {
            return 1;
        });
    }
    keys() {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
}
exports.client = process.env.USE_REDIS_CACHE === 'true'
    ? (0, redis_1.createClient)({
        username: 'default',
        password: 'BAjFVLaluLLeQzEwR7IoOuKWUHSyJtas',
        socket: {
            host: 'redis-12768.c1.ap-southeast-1-1.ec2.redns.redis-cloud.com',
            port: 12768,
        },
    })
    : new MockRedisClient();
if (process.env.USE_REDIS_CACHE === 'true') {
    exports.client.on('error', (err) => console.error('Redis error:', err));
    exports.client.on('connect', () => console.log('[Redis] Client connected successfully'));
    exports.client.on('ready', () => console.log('[Redis] Client ready to use'));
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!exports.client.isOpen) {
                yield exports.client.connect();
                console.log('[Redis] Connection status:', exports.client.isOpen ? 'Connected' : 'Disconnected');
            }
        }
        catch (error) {
            console.error('Redis connection failed:', error);
        }
    }))();
}
else {
    console.log('[Redis] Using mock Redis client - cache disabled');
}
const cacheMiddleware = (req, res, next) => {
    if (process.env.USE_REDIS_CACHE !== 'true') {
        console.log(`[Redis] Cache disabled - bypassing cache for: ${req.originalUrl}`);
        next();
        return;
    }
    if (!exports.client.isOpen) {
        console.log(`[Redis] Client not connected - bypassing cache for: ${req.originalUrl}`);
        next();
        return;
    }
    const key = req.originalUrl;
    let responseSent = false;
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const cachedData = yield exports.client.get(key);
            if (cachedData) {
                console.log(`[Redis] Cache hit for: ${key}`);
                const parsedData = JSON.parse(cachedData);
                res.json(parsedData);
                responseSent = true;
                return;
            }
            console.log(`[Redis] Cache miss for: ${key}`);
            const originalJson = res.json;
            res.json = function (body) {
                if (!responseSent) {
                    responseSent = true;
                    console.log(`[Redis] Caching data for: ${key}`);
                    (0, exports.setCache)(key, body).catch((error) => console.error('Cache save error:', error));
                }
                return originalJson.call(this, body);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    }))();
};
exports.cacheMiddleware = cacheMiddleware;
const setCache = (key_1, data_1, ...args_1) => __awaiter(void 0, [key_1, data_1, ...args_1], void 0, function* (key, data, ttl = 3600) {
    if (process.env.USE_REDIS_CACHE !== 'true' || !exports.client.isOpen)
        return;
    try {
        console.log(`[Redis] Setting cache for ${key} with TTL ${ttl}s`);
        yield exports.client.set(key, JSON.stringify(data), { EX: ttl });
        console.log(`[Redis] Cache set successfully for ${key}`);
    }
    catch (error) {
        console.error('Cache set error:', error);
    }
});
exports.setCache = setCache;
const clearCacheForEntity = (entity, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.USE_REDIS_CACHE !== 'true' || !exports.client.isOpen)
        return;
    try {
        const patterns = [
            `/api/${entity}s*`,
            `/api/${entity}/*`,
            ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
        ];
        const adminEntities = ['user', 'artist', 'genre', 'album', 'track'];
        if (adminEntities.includes(entity)) {
            patterns.push(`/api/admin/${entity}s*`);
        }
        if (entity === 'artist') {
            patterns.push('/api/admin/artists*', '/api/artists*', '/api/artist/*', '/api/top-artists', ...(options.entityId
                ? [
                    `/api/artists/${options.entityId}/tracks*`,
                    `/api/artists/${options.entityId}/albums*`,
                ]
                : []));
        }
        if (entity === 'user') {
            patterns.push('/api/admin/users*', '/admin/api/users*', '/api/users/search*', '/api/user/following*', '/api/user/followers*', ...(options.userId
                ? [`/api/user/${options.userId}/recommended-artists`]
                : []));
        }
        if (entity === 'album') {
            patterns.push('/api/admin/albums*', '/api/albums*', '/api/album/*', '/api/top-albums');
        }
        if (entity === 'track') {
            patterns.push('/api/admin/tracks*', '/api/tracks*', '/api/track/*', '/api/top-tracks');
        }
        if (entity === 'history') {
            patterns.push('/api/top-albums', '/api/top-artists', '/api/top-tracks', ...(options.userId
                ? [`/api/user/${options.userId}/recommended-artists`]
                : []));
        }
        if (options.clearSearch) {
            patterns.push('/api/search*', '/api/*/search*', '/search-all*', `/api/${entity}s/search*`, `/api/${entity}/search*`);
        }
        for (const pattern of patterns) {
            const keys = yield exports.client.keys(pattern);
            if (keys.length) {
                yield Promise.all(keys.map((key) => exports.client.del(key)));
            }
        }
        if (entity === 'user' || entity === 'stats' || entity === 'history') {
            const statsKeys = yield exports.client.keys('/api/admin/stats*');
            if (statsKeys.length) {
                yield Promise.all(statsKeys.map((key) => exports.client.del(key)));
            }
        }
    }
    catch (error) {
        console.error(`Error clearing ${entity} cache:`, error);
    }
});
exports.clearCacheForEntity = clearCacheForEntity;
//# sourceMappingURL=cache.middleware.js.map