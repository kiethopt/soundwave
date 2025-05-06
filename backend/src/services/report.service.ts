import { PrismaClient, ReportType, ReportStatus, Role, NotificationType, RecipientType } from '@prisma/client';
import { reportSelect } from '../utils/prisma-selects';

const prisma = new PrismaClient();

interface CreateReportData {
  type: ReportType;
  description: string;
  trackId?: string;
  playlistId?: string;
  albumId?: string;
}

interface ResolveReportData {
  status: ReportStatus;
  resolution: string;
}

export class ReportService {
  static async createReport(userId: string, data: CreateReportData) {
    if (!data.trackId && !data.playlistId && !data.albumId) {
      throw new Error('A report must be associated with a track, playlist, or album');
    }

    // Check if entity exists
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

    // Create the report
    const report = await prisma.report.create({
      data: {
        type: data.type,
        description: data.description,
        reporterId: userId,
        trackId: data.trackId,
        playlistId: data.playlistId,
        albumId: data.albumId,
      },
      select: reportSelect,
    });

    // Get entity name for notification
    let entityName = 'content';
    let entityType = 'unknown';
    
    if (data.trackId) {
      const track = await prisma.track.findUnique({
        where: { id: data.trackId },
        select: { title: true }
      });
      entityName = track?.title || 'track';
      entityType = 'track';
    } else if (data.albumId) {
      const album = await prisma.album.findUnique({
        where: { id: data.albumId },
        select: { title: true }
      });
      entityName = album?.title || 'album';
      entityType = 'album';
    } else if (data.playlistId) {
      const playlist = await prisma.playlist.findUnique({
        where: { id: data.playlistId },
        select: { name: true }
      });
      entityName = playlist?.name || 'playlist';
      entityType = 'playlist';
    }

    // Send notification to all admins
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN }
    });

    // Create notification for each admin
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          type: NotificationType.NEW_REPORT_SUBMITTED,
          message: `New ${data.type} report submitted for ${entityType} "${entityName}"`,
          recipientType: RecipientType.USER,
          userId: admin.id,
          senderId: userId,
          trackId: data.trackId,
          albumId: data.albumId,
        }
      });
    }

    return report;
  }

  static async getReports(
    user: any,
    page: number = 1,
    limit: number = 10,
    filters: { type?: ReportType; status?: ReportStatus } = {}
  ) {
    // Only admins can view all reports
    if (user.role !== Role.ADMIN) {
      throw new Error('Unauthorized access');
    }

    const whereCondition: any = { ...filters };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: reportSelect,
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

  static async getUserReports(
    userId: string, 
    page: number = 1, 
    limit: number = 10
  ) {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { reporterId: userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: reportSelect,
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

  static async getReportById(id: string, userId: string, isAdmin: boolean) {
    const report = await prisma.report.findUnique({
      where: { id },
      select: reportSelect,
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Check if user has access to this report
    if (!isAdmin && report.reporter.id !== userId) {
      throw new Error('Unauthorized access');
    }

    return report;
  }

  static async resolveReport(
    id: string,
    adminId: string,
    data: ResolveReportData
    ) {
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
                name: true
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

        // Check if report is already resolved
        if (report.status !== ReportStatus.PENDING) {
        throw new Error('This report has already been processed');
        }

        // Update the report
        const updatedReport = await prisma.report.update({
        where: { id },
        data: {
            status: data.status,
            resolution: data.resolution,
            resolverId: adminId,
            resolvedAt: new Date(),
        },
        select: reportSelect,
        });

        // If it's a copyright violation that's being resolved as valid, deactivate the track
        if (
        report.type === ReportType.COPYRIGHT_VIOLATION &&
        data.status === ReportStatus.RESOLVED &&
        report.trackId &&
        report.track?.isActive
        ) {
        await prisma.track.update({
            where: { id: report.trackId },
            data: { isActive: false },
        });
        } else if (
        report.type === ReportType.COPYRIGHT_VIOLATION &&
        data.status === ReportStatus.RESOLVED &&
        report.albumId &&
        report.album?.isActive
        ) {
        await prisma.album.update({
            where: { id: report.albumId },
            data: { isActive: false },
        });

        // Get entity name for notification
        let entityName = 'content';
        let entityType = 'unknown';
        
        if (report.trackId && report.track) {
        entityName = report.track.title || 'track';
        entityType = 'track';
        } else if (report.albumId && report.album) {
        entityName = report.album.title || 'album';
        entityType = 'album';
        } else if (report.playlistId && report.playlist) {
        entityName = report.playlist.name || 'playlist';
        entityType = 'playlist';
        }

        // Create notification for the report submitter
        const statusText = data.status === ReportStatus.RESOLVED ? 'resolved' : 'rejected';
        await prisma.notification.create({
        data: {
            type: NotificationType.REPORT_RESOLVED,
            message: `Your report for ${entityType} "${entityName}" has been ${statusText}`,
            recipientType: RecipientType.USER,
            userId: report.reporter.id,
            senderId: adminId,
            trackId: report.trackId,
            albumId: report.albumId,
        }
        });

        return updatedReport;
    }
}
}