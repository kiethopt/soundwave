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
    password: 'OIiJohR2wCpl3G6rxhfX81YneBXFASPn',
    socket: {
        host: 'redis-14705.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
        port: 14705,
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
        next();
        return;
    }
    const key = req.originalUrl;
    exports.client
        .get(key)
        .then((cachedData) => {
        if (cachedData) {
            console.log('Serving from cache:', key);
            res.json(JSON.parse(cachedData));
            return;
        }
        const originalJson = res.json;
        res.json = function (body) {
            (0, exports.setCache)(key, body);
            return originalJson.call(res, body);
        };
        next();
    })
        .catch((error) => {
        console.error('Redis error:', error);
        next();
    });
};
exports.cacheMiddleware = cacheMiddleware;
const setCache = (key_1, data_1, ...args_1) => __awaiter(void 0, [key_1, data_1, ...args_1], void 0, function* (key, data, ttl = 600) {
    if (process.env.USE_REDIS_CACHE === 'false')
        return;
    try {
        yield exports.client.set(key, JSON.stringify(data), { EX: ttl });
    }
    catch (error) {
        console.error('Error setting cache:', error);
    }
});
exports.setCache = setCache;
const clearCacheForEntity = (entity, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.USE_REDIS_CACHE === 'false')
        return;
    try {
        const patterns = [
            `/api/${entity}s*`,
            ...(options.entityId ? [`/api/${entity}s/${options.entityId}*`] : []),
            `/api/${entity}s/play*`,
            `/api/${entity}/play*`,
        ];
        if (options.clearSearch) {
            patterns.push('/api/search*', '/api/*/search*', '/search-all*', '/api/users/search-all*', '/api/user/search-all*', `/api/${entity}s/search*`, `/api/${entity}/search*`);
        }
        for (const pattern of patterns) {
            const keys = yield exports.client.keys(pattern);
            if (keys.length) {
                console.log(`Clearing cache for pattern: ${pattern}, keys:`, keys);
                yield Promise.all(keys.map((key) => exports.client.del(key)));
            }
        }
        const additionalPatterns = [
            '*play*',
            '*search*',
        ];
        for (const pattern of additionalPatterns) {
            const keys = yield exports.client.keys(pattern);
            if (keys.length) {
                console.log(`Clearing additional cache for pattern: ${pattern}, keys:`, keys);
                yield Promise.all(keys.map((key) => exports.client.del(key)));
            }
        }
    }
    catch (error) {
        console.error(`Error clearing ${entity} cache:`, error);
    }
});
exports.clearCacheForEntity = clearCacheForEntity;
//# sourceMappingURL=cache.middleware.js.map