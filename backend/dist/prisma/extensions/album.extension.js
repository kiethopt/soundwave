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
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const albumsToPublish = await client.album.findMany({
            where: {
                isActive: false,
                releaseDate: {
                    gte: twoMinutesAgo,
                    lte: now,
                },
                updatedAt: {
                    lt: twoMinutesAgo,
                },
            },
            select: {
                id: true,
                title: true,
            },
        });
        if (albumsToPublish.length > 0) {
            const albumIds = albumsToPublish.map((album) => album.id);
            await client.album.updateMany({
                where: {
                    id: { in: albumIds },
                },
                data: { isActive: true },
            });
            await client.track.updateMany({
                where: {
                    albumId: { in: albumIds },
                    isActive: false,
                },
                data: { isActive: true },
            });
            console.log(`Auto published ${albumsToPublish.length} albums: ${albumsToPublish
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
    node_cron_1.default.schedule('* * * * *', () => {
        console.log('Running cron job to check and update album status...');
        checkAndUpdateAlbumStatus(client);
    });
    return client.$extends({
        query: {
            album: {
                async create({ args, query }) {
                    const releaseDate = new Date(args.data.releaseDate);
                    args.data.isActive = releaseDate <= new Date();
                    return query(args);
                },
                async update({ args, query }) {
                    if (typeof args.data === 'object' && args.data !== null && 'releaseDate' in args.data && args.data.releaseDate !== undefined) {
                        const releaseDate = new Date(args.data.releaseDate);
                        if (!('isActive' in args.data)) {
                            args.data.isActive = releaseDate <= new Date();
                        }
                    }
                    const result = await query(args);
                    if (typeof args.data === 'object' && args.data !== null) {
                        if ('coverUrl' in args.data && args.data.coverUrl !== undefined) {
                            await client.track.updateMany({
                                where: { albumId: result.id },
                                data: { coverUrl: args.data.coverUrl },
                            });
                        }
                        const trackUpdateData = {};
                        let shouldUpdateTracks = false;
                        if ('isActive' in args.data && args.data.isActive !== undefined) {
                            trackUpdateData.isActive = args.data.isActive;
                            shouldUpdateTracks = true;
                        }
                        if ('releaseDate' in args.data && args.data.releaseDate !== undefined) {
                            trackUpdateData.releaseDate = args.data.releaseDate;
                            shouldUpdateTracks = true;
                        }
                        if (shouldUpdateTracks) {
                            await client.track.updateMany({
                                where: { albumId: result.id },
                                data: trackUpdateData,
                            });
                        }
                    }
                    return result;
                },
            },
            track: {
                async create({ args, query }) {
                    const data = args.data;
                    if (data.album?.connect?.id) {
                        const albumId = data.album.connect.id;
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
                        else {
                            console.warn(`Album with id ${albumId} not found when creating track.`);
                            const releaseDate = new Date(data.releaseDate);
                            args.data = {
                                ...data,
                                isActive: releaseDate <= new Date(),
                            };
                        }
                    }
                    else if (data.releaseDate) {
                        const releaseDate = new Date(data.releaseDate);
                        args.data = {
                            ...data,
                            isActive: releaseDate <= new Date(),
                        };
                    }
                    else {
                        args.data = { ...data, isActive: true };
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
                    let newAlbumId = undefined;
                    if (data.album?.connect?.id) {
                        newAlbumId = data.album.connect.id;
                    }
                    else if (data.album && typeof data.album === 'string') {
                        newAlbumId = data.album;
                    }
                    if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
                        const newAlbum = await client.album.findUnique({
                            where: { id: newAlbumId },
                            select: { isActive: true, releaseDate: true },
                        });
                        if (newAlbum) {
                            args.data = {
                                ...data,
                                isActive: data.isActive !== undefined ? data.isActive : newAlbum.isActive,
                                releaseDate: data.releaseDate !== undefined ? data.releaseDate : newAlbum.releaseDate,
                            };
                        }
                        else {
                            console.warn(`New album with id ${newAlbumId} not found during track update.`);
                            if (data.releaseDate) {
                                const releaseDate = new Date(data.releaseDate);
                                args.data = {
                                    ...data,
                                    isActive: data.isActive !== undefined ? data.isActive : releaseDate <= new Date(),
                                };
                            }
                        }
                    }
                    else if (data.releaseDate && !newAlbumId && !oldTrack?.albumId) {
                        const releaseDate = new Date(data.releaseDate);
                        if (data.isActive === undefined) {
                            args.data = {
                                ...data,
                                isActive: releaseDate <= new Date(),
                            };
                        }
                    }
                    const result = await query(args);
                    if (oldTrack?.albumId && newAlbumId !== oldTrack.albumId) {
                        await updateAlbumTotalTracks(client, oldTrack.albumId);
                    }
                    if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
                        await updateAlbumTotalTracks(client, newAlbumId);
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