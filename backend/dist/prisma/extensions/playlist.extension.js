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
exports.autoUpdateDiscoverWeeklyPlaylists = autoUpdateDiscoverWeeklyPlaylists;
exports.autoUpdateNewReleasesPlaylists = autoUpdateNewReleasesPlaylists;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const playlist_service_1 = require("../../services/playlist.service");
const systemPlaylistService = new playlist_service_1.SystemPlaylistService();
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
function autoUpdateDiscoverWeeklyPlaylists(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Playlist] Starting Discover Weekly playlists update...');
        try {
            const discoverWeeklyPlaylists = yield client.playlist.findMany({
                where: {
                    name: 'Discover Weekly',
                    type: 'SYSTEM',
                },
            });
            console.log(`[Playlist] Found ${discoverWeeklyPlaylists.length} Discover Weekly playlists`);
            if (discoverWeeklyPlaylists.length === 0) {
                console.log('[Playlist] No Discover Weekly playlists found to update');
                return;
            }
            for (const playlist of discoverWeeklyPlaylists) {
                yield systemPlaylistService.updateDiscoverWeeklyPlaylist(playlist.id);
                console.log(`[Playlist] Updated Discover Weekly playlist for user: ${playlist.userId}`);
            }
            console.log('[Playlist] All Discover Weekly playlists updated successfully');
        }
        catch (error) {
            console.error('[Playlist] Error updating Discover Weekly playlists:', error);
        }
    });
}
function autoUpdateNewReleasesPlaylists(client) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Playlist] Starting New Releases playlists update...');
        try {
            const newReleasesPlaylists = yield client.playlist.findMany({
                where: {
                    name: 'Soundwave Fresh: New Releases',
                    type: 'SYSTEM',
                },
            });
            console.log(`[Playlist] Found ${newReleasesPlaylists.length} New Releases playlists`);
            if (newReleasesPlaylists.length === 0) {
                console.log('[Playlist] No New Releases playlists found to update');
                return;
            }
            for (const playlist of newReleasesPlaylists) {
                yield systemPlaylistService.updateNewReleasesPlaylist(playlist.id);
                console.log(`[Playlist] Updated New Releases playlist for user: ${playlist.userId}`);
            }
            console.log('[Playlist] All New Releases playlists updated successfully');
        }
        catch (error) {
            console.error('[Playlist] Error updating New Releases playlists:', error);
        }
    });
}
let cronJobInitialized = false;
exports.playlistExtension = client_1.Prisma.defineExtension((client) => {
    if (!cronJobInitialized) {
        try {
            const DAILY_CRON = '0 0 * * *';
            console.log('[Playlist] Setting up daily cron schedule for Top Hits:', DAILY_CRON);
            node_cron_1.default.schedule(DAILY_CRON, () => {
                console.log(`[Playlist] Daily cron job triggered at ${new Date().toISOString()}`);
                autoUpdateGlobalPlaylist(client);
            });
            const MONDAY_CRON = '0 0 * * 1';
            console.log('[Playlist] Setting up weekly cron schedule for Discover Weekly:', MONDAY_CRON);
            node_cron_1.default.schedule(MONDAY_CRON, () => {
                console.log(`[Playlist] Monday cron job triggered at ${new Date().toISOString()}`);
                autoUpdateDiscoverWeeklyPlaylists(client);
            });
            const FRIDAY_MIDNIGHT_CRON = '0 0 * * 5';
            console.log('[Playlist] Setting up Friday midnight cron for New Releases:', FRIDAY_MIDNIGHT_CRON);
            node_cron_1.default.schedule(FRIDAY_MIDNIGHT_CRON, () => {
                console.log(`[Playlist] Friday midnight cron triggered at ${new Date().toISOString()}`);
                autoUpdateNewReleasesPlaylists(client);
            });
            const FRIDAY_NOON_CRON = '0 12 * * 5';
            console.log('[Playlist] Setting up Friday noon cron for New Releases:', FRIDAY_NOON_CRON);
            node_cron_1.default.schedule(FRIDAY_NOON_CRON, () => {
                console.log(`[Playlist] Friday noon cron triggered at ${new Date().toISOString()}`);
                autoUpdateNewReleasesPlaylists(client);
            });
            const FRIDAY_EVENING_CRON = '0 18 * * 5';
            console.log('[Playlist] Setting up Friday evening cron for New Releases:', FRIDAY_EVENING_CRON);
            node_cron_1.default.schedule(FRIDAY_EVENING_CRON, () => {
                console.log(`[Playlist] Friday evening cron triggered at ${new Date().toISOString()}`);
                autoUpdateNewReleasesPlaylists(client);
            });
            console.log('[Playlist] All cron jobs successfully scheduled');
            cronJobInitialized = true;
        }
        catch (error) {
            console.error('[Playlist] Error setting up cron jobs:', error);
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
                updateDiscoverWeeklyPlaylists() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return autoUpdateDiscoverWeeklyPlaylists(client);
                    });
                },
                updateNewReleasesPlaylists() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return autoUpdateNewReleasesPlaylists(client);
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