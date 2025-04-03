"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_middleware_2 = require("../../middleware/cache.middleware");
exports.adminExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            user: {
                async update({ args, query }) {
                    if (args.data.role === client_1.Role.ADMIN) {
                        const existingArtistProfile = await client.artistProfile.findUnique({
                            where: { userId: args.where.id },
                        });
                        if (existingArtistProfile) {
                            await client.artistProfile.delete({
                                where: { userId: args.where.id },
                            });
                        }
                    }
                    const result = await query(args);
                    if (args.data.isActive === false) {
                        await cache_middleware_2.client.del(`user_sessions:${args.where.id}`);
                    }
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
            artistProfile: {
                async update({ args, query }) {
                    const result = await query(args);
                    if (args.data.isActive === false) {
                        const artistProfile = await client.artistProfile.findUnique({
                            where: { id: args.where.id },
                            select: { userId: true },
                        });
                        if (artistProfile) {
                            await cache_middleware_2.client.del(`user_sessions:${artistProfile.userId}`);
                            await client.user.update({
                                where: { id: artistProfile.userId },
                                data: { currentProfile: 'USER' },
                            });
                        }
                    }
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
            },
            genre: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('genre', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async update({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('genre', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                    ]);
                    return result;
                },
                async delete({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('genre', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
            },
        },
    });
});
//# sourceMappingURL=admin.extension.js.map