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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("./cache.middleware");
const node_cron_1 = __importDefault(require("node-cron"));
exports.artistExtension = client_1.Prisma.defineExtension((client) => {
    node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const artists = yield client.artistProfile.findMany({
                where: { role: 'ARTIST', isVerified: true },
                select: { id: true },
            });
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            for (const artist of artists) {
                const trackIds = yield client.track
                    .findMany({
                    where: { artistId: artist.id },
                    select: { id: true },
                })
                    .then((tracks) => tracks.map((track) => track.id));
                const uniqueListeners = yield client.history.findMany({
                    where: {
                        trackId: { in: trackIds },
                        type: 'PLAY',
                        createdAt: { gte: thirtyDaysAgo },
                    },
                    distinct: ['userId'],
                });
                yield client.artistProfile.update({
                    where: { id: artist.id },
                    data: { monthlyListeners: uniqueListeners.length },
                });
            }
            console.log('Updated monthly listeners for all artists');
        }
        catch (error) {
            console.error('Auto update monthly listeners error:', error);
        }
    }));
    return client.$extends({
        query: {
            artistProfile: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('artist-requests', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('artist-requests', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
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
                    });
                },
            },
            album: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: args.data.artistId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('album', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        const album = yield client.album.findUnique({
                            where: { id: args.where.id },
                            select: { artistId: true },
                        });
                        if (album) {
                            yield Promise.all([
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
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const album = yield client.album.findUnique({
                            where: { id: args.where.id },
                            select: { artistId: true },
                        });
                        const result = yield query(args);
                        if (album) {
                            yield Promise.all([
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
                    });
                },
            },
            track: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
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
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        const track = yield client.track.findUnique({
                            where: { id: args.where.id },
                            select: { artistId: true, albumId: true },
                        });
                        if (track) {
                            yield Promise.all([
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
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const track = yield client.track.findUnique({
                            where: { id: args.where.id },
                            select: { artistId: true, albumId: true },
                        });
                        const result = yield query(args);
                        if (track) {
                            yield Promise.all([
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
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=artist.middleware.js.map