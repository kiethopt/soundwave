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
    // Allow OTHER type reports to not have an entity
    if (!data.trackId && !data.playlistId && !data.albumId && data.type !== ReportType.OTHER) {
      throw new Error('A report must be associated with a track, playlist, or album, unless it is of type OTHER.');
    }

    // Check if entity exists, only if an ID is provided
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
    } else if (data.type === ReportType.OTHER) {
      // For general feedback/platform issues
      entityName = 'Platform Issue/General Feedback';
      entityType = 'platform';
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
          message: `New ${data.type} report submitted for ${entityType === 'platform' ? entityName : `${entityType} "${entityName}"`}`,
          recipientType: RecipientType.USER,
          userId: admin.id,
          senderId: userId,
          trackId: data.trackId, // Will be null for general reports
          albumId: data.albumId, // Will be null for general reports
          // playlistId is missing in the original notification data, adding it if it exists in schema.prisma
          // Let's check schema.prisma for Notification model, it doesn't have playlistId.
          // So we keep it as is for now.
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

        // Get entity name and type for notification
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
        } else if (report.type === ReportType.OTHER) {
          // For general feedback/platform issues that were resolved/rejected
          entityName = 'Platform Issue/General Feedback';
          entityType = 'platform';
        }

        // Different handling based on entity type and report status
        if (data.status === ReportStatus.RESOLVED) {
          // For tracks and albums, hide them when report is resolved
          if (report.trackId && report.track?.isActive) {
            await prisma.track.update({
              where: { id: report.trackId },
              data: { isActive: false },
            });
          } else if (report.albumId && report.album?.isActive) {
            // Deactivate the album
            await prisma.album.update({
              where: { id: report.albumId },
              data: { isActive: false },
            });
            // Also deactivate all tracks in that album
            await prisma.track.updateMany({
              where: { albumId: report.albumId },
              data: { isActive: false },
            });
          }
          // Note: For playlists, we don't hide them, just notify
        }

        // Create notification for the report submitter
        const statusText = data.status === ReportStatus.RESOLVED ? 'resolved' : 'rejected';
        await prisma.notification.create({
          data: {
            type: NotificationType.REPORT_RESOLVED,
            message: `Your report for ${entityType === 'platform' ? entityName : `${entityType} "${entityName}"`} has been ${statusText}`,
            recipientType: RecipientType.USER,
            userId: report.reporter.id,
            senderId: adminId,
            trackId: report.trackId,
            albumId: report.albumId,
            // Again, playlistId not in Notification model as per schema.prisma
          }
        });

        // For AI Playlist reports that are resolved, send additional notification to the playlist owner
        if (data.status === ReportStatus.RESOLVED && 
            report.type === ReportType.AI_GENERATION_ISSUE && 
            report.playlistId && 
            report.playlist?.isAIGenerated &&
            report.playlist.userId) {
          await prisma.notification.create({
            data: {
              type: NotificationType.REPORT_RESOLVED,
              message: `Based on user feedback, we'll be improving our AI playlist generation. Thank you for your patience.`,
              recipientType: RecipientType.USER,
              userId: report.playlist.userId,
              senderId: adminId,
            }
          });
        }

        return updatedReport;
    }

  static async deleteReport(reportId: string, adminId: string) {
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser || adminUser.role !== Role.ADMIN) {
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