"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const node_cron_1 = __importDefault(require("node-cron"));
exports.artistExtension = client_1.Prisma.defineExtension((client) => {
    node_cron_1.default.schedule('0 0 * * *', async () => {
        try {
            const artists = await client.artistProfile.findMany({
                where: { role: 'ARTIST', isVerified: true },
                select: { id: true },
            });
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            for (const artist of artists) {
                const trackIds = await client.track
                    .findMany({
                    where: { artistId: artist.id },
                    select: { id: true },
                })
                    .then((tracks) => tracks.map((track) => track.id));
                const uniqueListeners = await client.history.findMany({
                    where: {
                        trackId: { in: trackIds },
                        type: 'PLAY',
                        createdAt: { gte: thirtyDaysAgo },
                    },
                    distinct: ['userId'],
                });
                await client.artistProfile.update({
                    where: { id: artist.id },
                    data: { monthlyListeners: uniqueListeners.length },
                });
            }
            console.log('Updated monthly listeners for all artists');
        }
        catch (error) {
            console.error('Auto update monthly listeners error:', error);
        }
    });
    return client.$extends({
        query: {
            artistProfile: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('artist-requests', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async update({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('artist-requests', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async delete({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', {
                            entityId: args.where.id,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('artist-requests', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        (0, cache_middleware_1.clearCacheForEntity)('album', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                    ]);
                    return result;
                },
            },
            album: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', {
                            entityId: args.data.artistId,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('album', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                    ]);
                    return result;
                },
                async update({ args, query }) {
                    const result = await query(args);
                    const album = await client.album.findUnique({
                        where: { id: args.where.id },
                        select: { artistId: true },
                    });
                    if (album) {
                        await Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: album.artistId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('album', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                        ]);
                    }
                    return result;
                },
                async delete({ args, query }) {
                    const album = await client.album.findUnique({
                        where: { id: args.where.id },
                        select: { artistId: true },
                    });
                    const result = await query(args);
                    if (album) {
                        await Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: album.artistId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('album', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                        ]);
                    }
                    return result;
                },
            },
            track: {
                async create({ args, query }) {
                    const result = await query(args);
                    await Promise.all([
                        (0, cache_middleware_1.clearCacheForEntity)('artist', {
                            entityId: args.data.artistId,
                            clearSearch: true,
                        }),
                        (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                        (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        args.data.albumId &&
                            (0, cache_middleware_1.clearCacheForEntity)('album', {
                                entityId: args.data.albumId,
                                clearSearch: true,
                            }),
                    ]);
                    return result;
                },
                async update({ args, query }) {
                    const result = await query(args);
                    const track = await client.track.findUnique({
                        where: { id: args.where.id },
                        select: { artistId: true, albumId: true },
                    });
                    if (track) {
                        await Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: track.artistId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            track.albumId &&
                                (0, cache_middleware_1.clearCacheForEntity)('album', {
                                    entityId: track.albumId,
                                    clearSearch: true,
                                }),
                        ]);
                    }
                    return result;
                },
                async delete({ args, query }) {
                    const track = await client.track.findUnique({
                        where: { id: args.where.id },
                        select: { artistId: true, albumId: true },
                    });
                    const result = await query(args);
                    if (track) {
                        await Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: track.artistId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            track.albumId &&
                                (0, cache_middleware_1.clearCacheForEntity)('album', {
                                    entityId: track.albumId,
                                    clearSearch: true,
                                }),
                        ]);
                    }
                    return result;
                },
            },
        },
    });
});
//# sourceMappingURL=artist.extension.js.map