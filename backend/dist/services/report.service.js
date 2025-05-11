"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const prisma = new client_1.PrismaClient();
class ReportService {
    static async createReport(userId, data) {
        if (!data.trackId && !data.playlistId && !data.albumId && data.type !== client_1.ReportType.OTHER) {
            throw new Error('A report must be associated with a track, playlist, or album, unless it is of type OTHER.');
        }
        if (data.trackId) {
            const track = await prisma.track.findUnique({
                where: { id: data.trackId }
            });
            if (!track) {
                throw new Error('Track not found');
            }
        }
        if (data.playlistId) {
            const playlist = await prisma.playlist.findUnique({
                where: { id: data.playlistId }
            });
            if (!playlist) {
                throw new Error('Playlist not found');
            }
        }
        if (data.albumId) {
            const album = await prisma.album.findUnique({
                where: { id: data.albumId }
            });
            if (!album) {
                throw new Error('Album not found');
            }
        }
        const report = await prisma.report.create({
            data: {
                type: data.type,
                description: data.description,
                reporterId: userId,
                trackId: data.trackId,
                playlistId: data.playlistId,
                albumId: data.albumId,
            },
            select: prisma_selects_1.reportSelect,
        });
        let entityName = 'content';
        let entityType = 'unknown';
        if (data.trackId) {
            const track = await prisma.track.findUnique({
                where: { id: data.trackId },
                select: { title: true }
            });
            entityName = track?.title || 'track';
            entityType = 'track';
        }
        else if (data.albumId) {
            const album = await prisma.album.findUnique({
                where: { id: data.albumId },
                select: { title: true }
            });
            entityName = album?.title || 'album';
            entityType = 'album';
        }
        else if (data.playlistId) {
            const playlist = await prisma.playlist.findUnique({
                where: { id: data.playlistId },
                select: { name: true }
            });
            entityName = playlist?.name || 'playlist';
            entityType = 'playlist';
        }
        else if (data.type === client_1.ReportType.OTHER) {
            entityName = 'Platform Issue/General Feedback';
            entityType = 'platform';
        }
        const admins = await prisma.user.findMany({
            where: { role: client_1.Role.ADMIN }
        });
        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    type: client_1.NotificationType.NEW_REPORT_SUBMITTED,
                    message: `New ${data.type} report submitted for ${entityType === 'platform' ? entityName : `${entityType} "${entityName}"`}`,
                    recipientType: client_1.RecipientType.USER,
                    userId: admin.id,
                    senderId: userId,
                    trackId: data.trackId,
                    albumId: data.albumId,
                }
            });
        }
        return report;
    }
    static async getReports(user, page = 1, limit = 10, filters = {}) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new Error('Unauthorized access');
        }
        const whereCondition = { ...filters };
        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: whereCondition,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: prisma_selects_1.reportSelect,
            }),
            prisma.report.count({ where: whereCondition }),
        ]);
        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getUserReports(userId, page = 1, limit = 10) {
        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: { reporterId: userId },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: prisma_selects_1.reportSelect,
            }),
            prisma.report.count({ where: { reporterId: userId } }),
        ]);
        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getReportById(id, userId, isAdmin) {
        const report = await prisma.report.findUnique({
            where: { id },
            select: prisma_selects_1.reportSelect,
        });
        if (!report) {
            throw new Error('Report not found');
        }
        if (!isAdmin && report.reporter.id !== userId) {
            throw new Error('Unauthorized access');
        }
        return report;
    }
    static async resolveReport(id, adminId, data) {
        const report = await prisma.report.findUnique({
            where: { id },
            include: {
                track: {
                    select: {
                        id: true,
                        isActive: true,
                        title: true
                    }
                },
                album: {
                    select: {
                        id: true,
                        isActive: true,
                        title: true
                    }
                },
                playlist: {
                    select: {
                        id: true,
                        name: true,
                        isAIGenerated: true,
                        userId: true
                    }
                },
                reporter: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
        });
        if (!report) {
            throw new Error('Report not found');
        }
        if (report.status !== client_1.ReportStatus.PENDING) {
            throw new Error('This report has already been processed');
        }
        const updatedReport = await prisma.report.update({
            where: { id },
            data: {
                status: data.status,
                resolution: data.resolution,
                resolverId: adminId,
                resolvedAt: new Date(),
            },
            select: prisma_selects_1.reportSelect,
        });
        let entityName = 'content';
        let entityType = 'unknown';
        if (report.trackId && report.track) {
            entityName = report.track.title || 'track';
            entityType = 'track';
        }
        else if (report.albumId && report.album) {
            entityName = report.album.title || 'album';
            entityType = 'album';
        }
        else if (report.playlistId && report.playlist) {
            entityName = report.playlist.name || 'playlist';
            entityType = 'playlist';
        }
        else if (report.type === client_1.ReportType.OTHER) {
            entityName = 'Platform Issue/General Feedback';
            entityType = 'platform';
        }
        if (data.status === client_1.ReportStatus.RESOLVED) {
            if (report.trackId && report.track?.isActive) {
                await prisma.track.update({
                    where: { id: report.trackId },
                    data: { isActive: false },
                });
            }
            else if (report.albumId && report.album?.isActive) {
                await prisma.album.update({
                    where: { id: report.albumId },
                    data: { isActive: false },
                });
                await prisma.track.updateMany({
                    where: { albumId: report.albumId },
                    data: { isActive: false },
                });
            }
        }
        const statusText = data.status === client_1.ReportStatus.RESOLVED ? 'resolved' : 'rejected';
        await prisma.notification.create({
            data: {
                type: client_1.NotificationType.REPORT_RESOLVED,
                message: `Your report for ${entityType === 'platform' ? entityName : `${entityType} "${entityName}"`} has been ${statusText}`,
                recipientType: client_1.RecipientType.USER,
                userId: report.reporter.id,
                senderId: adminId,
                trackId: report.trackId,
                albumId: report.albumId,
            }
        });
        if (data.status === client_1.ReportStatus.RESOLVED &&
            report.type === client_1.ReportType.AI_GENERATION_ISSUE &&
            report.playlistId &&
            report.playlist?.isAIGenerated &&
            report.playlist.userId) {
            await prisma.notification.create({
                data: {
                    type: client_1.NotificationType.REPORT_RESOLVED,
                    message: `Based on user feedback, we'll be improving our AI playlist generation. Thank you for your patience.`,
                    recipientType: client_1.RecipientType.USER,
                    userId: report.playlist.userId,
                    senderId: adminId,
                }
            });
        }
        return updatedReport;
    }
    static async deleteReport(reportId, adminId) {
        const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
        if (!adminUser || adminUser.role !== client_1.Role.ADMIN) {
            throw new Error('Unauthorized: Only admins can delete reports.');
        }
        const report = await prisma.report.findUnique({
            where: { id: reportId },
        });
        if (!report) {
            throw new Error('Report not found');
        }
        await prisma.report.delete({
            where: { id: reportId },
        });
        return { message: `Report ${reportId} deleted successfully by admin ${adminId}.` };
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=report.service.js.map