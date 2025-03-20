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
exports.playlistExtension = void 0;
exports.autoUpdateGlobalPlaylist = autoUpdateGlobalPlaylist;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const playlist_service_1 = require("../../services/playlist.service");
function findGlobalPlaylist(client) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const globalPlaylist = yield client.playlist.findFirst({
                where: {
                    name: 'Soundwave Hits: Trending Right Now',
                },
            });
            if (!globalPlaylist) {
                console.log('[Playlist] Global playlist not found');
                return null;
            }
            return globalPlaylist;
        }
        catch (error) {
            console.error('[Playlist] Error finding global playlist:', error);
            return null;
        }
    });
}
function autoUpdateGlobalPlaylist(client) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('[Playlist] Starting global playlist update...');
        try {
            console.log('[Playlist] Finding global playlist...');
            const globalPlaylist = yield findGlobalPlaylist(client);
            if (!globalPlaylist) {
                console.log('[Playlist] Global playlist not found, creating new one...');
                const recommendedPlaylist = yield (0, playlist_service_1.generateGlobalRecommendedPlaylist)(20);
                const newPlaylist = yield client.playlist.create({
                    data: {
                        name: 'Soundwave Hits: Trending Right Now',
                        description: 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                        totalTracks: recommendedPlaylist.tracks.length,
                        totalDuration: recommendedPlaylist.totalDuration,
                        coverUrl: recommendedPlaylist.coverUrl,
                        userId: (_a = (yield client.user.findFirst({ where: { role: 'ADMIN' } }))) === null || _a === void 0 ? void 0 : _a.id,
                    },
                });
                for (let i = 0; i < recommendedPlaylist.tracks.length; i++) {
                    yield client.playlistTrack.create({
                        data: {
                            playlistId: newPlaylist.id,
                            trackId: recommendedPlaylist.tracks[i].id,
                            trackOrder: i,
                        },
                    });
                }
                console.log('[Playlist] Created new global playlist with ID:', newPlaylist.id);
                return;
            }
            console.log('[Playlist] Global playlist found:', globalPlaylist.id);
            if (globalPlaylist.type !== 'SYSTEM') {
                yield client.playlist.update({
                    where: { id: globalPlaylist.id },
                    data: {
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                    },
                });
                console.log('[Playlist] Updated global playlist to SYSTEM type');
            }
            console.log('[Playlist] Generating recommended tracks...');
            const recommendedPlaylist = yield (0, playlist_service_1.generateGlobalRecommendedPlaylist)(20);
            console.log('[Playlist] Recommended tracks generated, count:', recommendedPlaylist.tracks.length, 'First few tracks:', recommendedPlaylist.tracks.slice(0, 2).map((t) => t.id));
            console.log('[Playlist] Deleting existing playlist tracks...');
            yield client.playlistTrack.deleteMany({
                where: { playlistId: globalPlaylist.id },
            });
            console.log('[Playlist] Existing playlist tracks deleted');
            console.log('[Playlist] Adding new tracks to playlist...');
            for (let i = 0; i < recommendedPlaylist.tracks.length; i++) {
                yield client.playlistTrack.create({
                    data: {
                        playlistId: globalPlaylist.id,
                        trackId: recommendedPlaylist.tracks[i].id,
                        trackOrder: i,
                    },
                });
            }
            console.log('[Playlist] Added', recommendedPlaylist.tracks.length, 'tracks to playlist');
            console.log('[Playlist] Updating playlist metadata...');
            yield client.playlist.update({
                where: { id: globalPlaylist.id },
                data: {
                    totalTracks: recommendedPlaylist.tracks.length,
                    totalDuration: recommendedPlaylist.totalDuration,
                    updatedAt: new Date(),
                },
            });
            console.log('[Playlist] Playlist metadata updated');
            console.log('[Playlist] Global playlist updated successfully');
        }
        catch (error) {
            console.error('[Playlist] Error updating global playlist:', error);
        }
    });
}
let cronJobInitialized = false;
exports.playlistExtension = client_1.Prisma.defineExtension((client) => {
    if (!cronJobInitialized) {
        const CRON_EXPRESSION = '0 0 * * *';
        console.log('[Playlist] Setting up cron schedule:', CRON_EXPRESSION);
        try {
            node_cron_1.default.schedule(CRON_EXPRESSION, () => {
                console.log(`[Playlist] Cron job triggered at ${new Date().toISOString()}`);
                autoUpdateGlobalPlaylist(client);
            });
            console.log('[Playlist] Cron job successfully scheduled');
            cronJobInitialized = true;
        }
        catch (error) {
            console.error('[Playlist] Error setting up cron job:', error);
        }
    }
    return client.$extends({
        model: {
            playlist: {
                updateGlobalPlaylist() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return autoUpdateGlobalPlaylist(client);
                    });
                },
            },
        },
        query: {
            playlist: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        return result;
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=playlist.extension.js.map