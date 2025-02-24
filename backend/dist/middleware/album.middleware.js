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
exports.albumExtension = void 0;
const client_1 = require("@prisma/client");
exports.albumExtension = client_1.Prisma.defineExtension((client) => {
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        const now = new Date();
        try {
            yield client.$transaction([
                client.album.updateMany({
                    where: {
                        releaseDate: { lte: now },
                        isActive: false,
                    },
                    data: { isActive: true },
                }),
                client.track.updateMany({
                    where: {
                        releaseDate: { lte: now },
                        isActive: false,
                        albumId: null,
                    },
                    data: { isActive: true },
                }),
            ]);
        }
        catch (error) {
            console.error('Release date check error:', error);
        }
    }), 1000 * 60 * 60);
    return client.$extends({
        query: {
            album: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const releaseDate = new Date(args.data.releaseDate);
                        args.data.isActive = releaseDate <= new Date();
                        return query(args);
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        if (typeof args.data === 'object' && 'releaseDate' in args.data) {
                            const releaseDate = new Date(args.data.releaseDate);
                            args.data.isActive = releaseDate <= new Date();
                        }
                        const result = yield query(args);
                        if (typeof args.data === 'object') {
                            if ('coverUrl' in args.data) {
                                yield client.track.updateMany({
                                    where: { albumId: result.id },
                                    data: { coverUrl: args.data.coverUrl },
                                });
                            }
                            if ('isActive' in args.data || 'releaseDate' in args.data) {
                                yield client.track.updateMany({
                                    where: { albumId: result.id },
                                    data: Object.assign(Object.assign({}, (args.data.isActive !== undefined && {
                                        isActive: args.data.isActive,
                                    })), (args.data.releaseDate && {
                                        releaseDate: args.data.releaseDate,
                                    })),
                                });
                            }
                        }
                        return result;
                    });
                },
            },
            track: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        var _b;
                        const data = args.data;
                        if (data.album) {
                            const albumId = (_b = data.album.connect) === null || _b === void 0 ? void 0 : _b.id;
                            if (albumId) {
                                const album = yield client.album.findUnique({
                                    where: { id: albumId },
                                    select: { isActive: true, releaseDate: true },
                                });
                                if (album) {
                                    args.data = Object.assign(Object.assign({}, data), { isActive: album.isActive, releaseDate: album.releaseDate });
                                }
                            }
                        }
                        else {
                            const releaseDate = new Date(data.releaseDate);
                            args.data = Object.assign(Object.assign({}, data), { isActive: releaseDate <= new Date() });
                        }
                        const result = yield query(args);
                        if (result.albumId) {
                            yield updateAlbumTotalTracks(client, result.albumId);
                        }
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        var _b;
                        const data = args.data;
                        const oldTrack = yield client.track.findUnique({
                            where: args.where,
                            select: { albumId: true },
                        });
                        if (data.album &&
                            typeof data.album === 'object' &&
                            'connect' in data.album) {
                            const newAlbumId = (_b = data.album.connect) === null || _b === void 0 ? void 0 : _b.id;
                            if (newAlbumId && newAlbumId !== (oldTrack === null || oldTrack === void 0 ? void 0 : oldTrack.albumId)) {
                                const newAlbum = yield client.album.findUnique({
                                    where: { id: newAlbumId },
                                    select: { isActive: true, releaseDate: true },
                                });
                                if (newAlbum) {
                                    args.data = Object.assign(Object.assign({}, data), { isActive: newAlbum.isActive, releaseDate: newAlbum.releaseDate });
                                }
                            }
                        }
                        const result = yield query(args);
                        if (oldTrack === null || oldTrack === void 0 ? void 0 : oldTrack.albumId) {
                            yield updateAlbumTotalTracks(client, oldTrack.albumId);
                        }
                        if (result.albumId &&
                            result.albumId !== (oldTrack === null || oldTrack === void 0 ? void 0 : oldTrack.albumId)) {
                            yield updateAlbumTotalTracks(client, result.albumId);
                        }
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const track = yield client.track.findUnique({
                            where: args.where,
                            select: { albumId: true },
                        });
                        const result = yield query(args);
                        if (track === null || track === void 0 ? void 0 : track.albumId) {
                            yield updateAlbumTotalTracks(client, track.albumId);
                        }
                        return result;
                    });
                },
            },
        },
    });
});
function updateAlbumTotalTracks(client, albumId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const trackCount = yield client.track.count({
                where: { albumId },
            });
            yield client.album.update({
                where: { id: albumId },
                data: { totalTracks: trackCount },
            });
        }
        catch (error) {
            console.error('Error updating album totalTracks:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=album.middleware.js.map