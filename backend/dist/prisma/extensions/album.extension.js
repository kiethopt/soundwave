"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumExtension = void 0;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
async function checkAndUpdateAlbumStatus(client) {
    try {
        const now = new Date();
        const albums = await client.album.findMany({
            where: {
                isActive: false,
                releaseDate: { lte: now },
            },
            select: {
                id: true,
                title: true,
            },
        });
        if (albums.length > 0) {
            await client.album.updateMany({
                where: {
                    id: { in: albums.map((album) => album.id) },
                },
                data: { isActive: true },
            });
            await client.track.updateMany({
                where: {
                    albumId: { in: albums.map((album) => album.id) },
                    isActive: false,
                },
                data: { isActive: true },
            });
            console.log(`Auto published ${albums.length} albums: ${albums
                .map((a) => a.title)
                .join(', ')}`);
        }
    }
    catch (error) {
        console.error('Album auto publish error:', error);
    }
}
async function updateAlbumTotalTracks(client, albumId) {
    try {
        const trackCount = await client.track.count({
            where: { albumId },
        });
        await client.album.update({
            where: { id: albumId },
            data: { totalTracks: trackCount },
        });
    }
    catch (error) {
        console.error('Error updating album totalTracks:', error);
        throw error;
    }
}
exports.albumExtension = client_1.Prisma.defineExtension((client) => {
    node_cron_1.default.schedule('* * * * *', () => checkAndUpdateAlbumStatus(client));
    return client.$extends({
        query: {
            album: {
                async create({ args, query }) {
                    const releaseDate = new Date(args.data.releaseDate);
                    args.data.isActive = releaseDate <= new Date();
                    return query(args);
                },
                async update({ args, query }) {
                    if (typeof args.data === 'object' && 'releaseDate' in args.data) {
                        const releaseDate = new Date(args.data.releaseDate);
                        args.data.isActive = releaseDate <= new Date();
                    }
                    const result = await query(args);
                    if (typeof args.data === 'object') {
                        if ('coverUrl' in args.data) {
                            await client.track.updateMany({
                                where: { albumId: result.id },
                                data: { coverUrl: args.data.coverUrl },
                            });
                        }
                        if ('isActive' in args.data || 'releaseDate' in args.data) {
                            await client.track.updateMany({
                                where: { albumId: result.id },
                                data: {
                                    ...(args.data.isActive !== undefined && {
                                        isActive: args.data.isActive,
                                    }),
                                    ...(args.data.releaseDate && {
                                        releaseDate: args.data.releaseDate,
                                    }),
                                },
                            });
                        }
                    }
                    return result;
                },
            },
            track: {
                async create({ args, query }) {
                    const data = args.data;
                    if (data.album) {
                        const albumId = data.album.connect?.id;
                        if (albumId) {
                            const album = await client.album.findUnique({
                                where: { id: albumId },
                                select: { isActive: true, releaseDate: true },
                            });
                            if (album) {
                                args.data = {
                                    ...data,
                                    isActive: album.isActive,
                                    releaseDate: album.releaseDate,
                                };
                            }
                        }
                    }
                    else {
                        const releaseDate = new Date(data.releaseDate);
                        args.data = {
                            ...data,
                            isActive: releaseDate <= new Date(),
                        };
                    }
                    const result = await query(args);
                    if (result.albumId) {
                        await updateAlbumTotalTracks(client, result.albumId);
                    }
                    return result;
                },
                async update({ args, query }) {
                    const data = args.data;
                    const oldTrack = await client.track.findUnique({
                        where: args.where,
                        select: { albumId: true },
                    });
                    if (data.album &&
                        typeof data.album === 'object' &&
                        'connect' in data.album) {
                        const newAlbumId = data.album.connect?.id;
                        if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
                            const newAlbum = await client.album.findUnique({
                                where: { id: newAlbumId },
                                select: { isActive: true, releaseDate: true },
                            });
                            if (newAlbum) {
                                args.data = {
                                    ...data,
                                    isActive: newAlbum.isActive,
                                    releaseDate: newAlbum.releaseDate,
                                };
                            }
                        }
                    }
                    const result = await query(args);
                    if (oldTrack?.albumId) {
                        await updateAlbumTotalTracks(client, oldTrack.albumId);
                    }
                    if (result.albumId &&
                        result.albumId !== oldTrack?.albumId) {
                        await updateAlbumTotalTracks(client, result.albumId);
                    }
                    return result;
                },
                async delete({ args, query }) {
                    const track = await client.track.findUnique({
                        where: args.where,
                        select: { albumId: true },
                    });
                    const result = await query(args);
                    if (track?.albumId) {
                        await updateAlbumTotalTracks(client, track.albumId);
                    }
                    return result;
                },
            },
        },
    });
});
//# sourceMappingURL=album.extension.js.map