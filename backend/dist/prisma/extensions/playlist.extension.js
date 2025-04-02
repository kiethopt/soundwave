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
exports.registerPlaylistCronJobs = exports.playlistExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const node_cron_1 = __importDefault(require("node-cron"));
const playlist_service_1 = require("../../services/playlist.service");
exports.playlistExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            playlist: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: result.id,
                                clearSearch: true,
                            }),
                            args.data.userId
                                ? (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: args.data.userId,
                                    clearSearch: false,
                                })
                                : Promise.resolve(),
                        ]);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            result.userId
                                ? (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: result.userId,
                                    clearSearch: false,
                                })
                                : Promise.resolve(),
                        ]);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const playlist = yield client.playlist.findUnique({
                            where: { id: args.where.id },
                            select: { userId: true },
                        });
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (playlist === null || playlist === void 0 ? void 0 : playlist.userId)
                                ? (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: playlist.userId,
                                    clearSearch: false,
                                })
                                : Promise.resolve(),
                        ]);
                        return result;
                    });
                },
            },
            playlistTrack: {
                createMany(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        if ('data' in args &&
                            Array.isArray(args.data) &&
                            args.data.length > 0) {
                            const playlistId = args.data[0].playlistId;
                            yield (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: playlistId,
                                clearSearch: true,
                            });
                        }
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const track = yield client.playlistTrack.findUnique({
                            where: args.where,
                            select: { playlistId: true },
                        });
                        const result = yield query(args);
                        if (track) {
                            yield (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: track.playlistId,
                                clearSearch: true,
                            });
                        }
                        return result;
                    });
                },
                deleteMany(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        let playlistId;
                        if (args.where && 'playlistId' in args.where) {
                            playlistId = args.where.playlistId;
                        }
                        const result = yield query(args);
                        if (playlistId) {
                            yield (0, cache_middleware_1.clearCacheForEntity)('playlist', {
                                entityId: playlistId,
                                clearSearch: true,
                            });
                        }
                        else {
                            yield (0, cache_middleware_1.clearCacheForEntity)('playlist', { clearSearch: true });
                        }
                        return result;
                    });
                },
            },
        },
    });
});
node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[Cron] Starting nightly update of system playlists');
    try {
        const result = yield (0, playlist_service_1.updateAllSystemPlaylists)();
        if (result.success) {
            console.log('[Cron] Successfully updated all system playlists');
        }
        else {
            console.error(`[Cron] System playlist update completed with ${result.errors.length} errors`);
            if (result.errors.length > 0) {
                const sampleErrors = result.errors.slice(0, 3);
                console.error('[Cron] Sample errors:', JSON.stringify(sampleErrors, null, 2));
                if (result.errors.length > 3) {
                    console.error(`[Cron] ...and ${result.errors.length - 3} more errors`);
                }
            }
        }
    }
    catch (error) {
        console.error('[Cron] Critical error updating system playlists:', error);
    }
}));
const registerPlaylistCronJobs = () => {
    console.log('[Cron] System playlist update job has been registered for midnight (00:00)');
};
exports.registerPlaylistCronJobs = registerPlaylistCronJobs;
//# sourceMappingURL=playlist.extension.js.map