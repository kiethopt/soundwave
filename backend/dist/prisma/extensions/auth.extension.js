"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
exports.authExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            user: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('user', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async update({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('user', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async delete({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('user', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
            },
        },
    });
});
//# sourceMappingURL=auth.extension.js.map