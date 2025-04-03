"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_middleware_2 = require("../../middleware/cache.middleware");
exports.userExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            userFollow: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        cache_middleware_2.client.del(`/api/user/following`),
                        cache_middleware_2.client.del(`/api/user/followers`),
                        (0, cache_middleware_1.clearCacheForEntity)('user', {
                            entityId: args.data.followerId,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('user', {
                            entityId: (args.data.followingUserId ||
                                args.data.followingArtistId ||
                                ''),
                            clearSearch: true,
                        }),
                    ]);
                    return result;
                },
                async delete({ args, query }) {
                    const followInfo = await client.userFollow.findFirst({
                        where: args.where,
                        select: {
                            followerId: true,
                            followingUserId: true,
                            followingArtistId: true,
                        },
                    });
                    const result = await query(args);
                    if (followInfo) {
                        const followerId = followInfo.followerId;
                        const followingId = followInfo.followingUserId || followInfo.followingArtistId;
                        const followingKeys = await cache_middleware_2.client.keys(`/api/user/following*userId=${followerId}*`);
                        const followerKeys = await cache_middleware_2.client.keys(`/api/user/followers*userId=${followingId}*`);
                        await Promise.all([
                            ...(followingKeys.length
                                ? followingKeys.map((k) => cache_middleware_2.client.del(k))
                                : []),
                            ...(followerKeys.length
                                ? followerKeys.map((k) => cache_middleware_2.client.del(k))
                                : []),
                            cache_middleware_2.client.del(`/api/user/following?userId=${followerId}`),
                            cache_middleware_2.client.del(`/api/user/followers?userId=${followingId}`),
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: followerId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: followingId,
                                clearSearch: true,
                            }),
                        ]);
                    }
                    return result;
                },
            },
            user: {
                async update({ args, query }) {
                    const result = await query(args);
                    if ('id' in args.where) {
                        await Promise.all([
                            cache_middleware_2.client.del(`/api/users/${args.where.id}/followers`),
                            cache_middleware_2.client.del(`/api/users/${args.where.id}/following`),
                            cache_middleware_2.client.del(`/api/user/${args.where.id}/recommended-artists`),
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                        ]);
                    }
                    return result;
                },
            },
            history: {
                async create({ args, query }) {
                    const result = await query(args);
                    if (args.data.userId && args.data.type === 'PLAY') {
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
                        select: { userId: true, type: true },
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
//# sourceMappingURL=user.extension.js.map