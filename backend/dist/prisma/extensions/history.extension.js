"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_middleware_2 = require("../../middleware/cache.middleware");
exports.historyExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            history: {
                async create({ args, query }) {
                    const result = await query(args);
                    if (args.data.userId &&
                        args.data.type === 'PLAY' &&
                        args.data.completed) {
                        await Promise.all([
                            cache_middleware_2.client.del(`/api/user/${args.data.userId}/recommended-artists`),
                            cache_middleware_2.client.del('/api/top-tracks'),
                            cache_middleware_2.client.del('/api/top-albums'),
                            cache_middleware_2.client.del('/api/top-artists'),
                            (0, cache_middleware_1.clearCacheForEntity)('history', {
                                userId: args.data.userId,
                            }),
                        ]);
                    }
                    return result;
                },
                async update({ args, query }) {
                    const history = await client.history.findFirst({
                        where: args.where,
                        select: { userId: true, type: true, completed: true },
                    });
                    const result = await query(args);
                    if (history?.userId && history.type === 'PLAY') {
                        await Promise.all([
                            cache_middleware_2.client.del(`/api/user/${history.userId}/recommended-artists`),
                            cache_middleware_2.client.del('/api/top-tracks'),
                            cache_middleware_2.client.del('/api/top-albums'),
                            cache_middleware_2.client.del('/api/top-artists'),
                            (0, cache_middleware_1.clearCacheForEntity)('history', {
                                userId: history.userId,
                            }),
                        ]);
                    }
                    return result;
                },
            },
        },
    });
});
//# sourceMappingURL=history.extension.js.map