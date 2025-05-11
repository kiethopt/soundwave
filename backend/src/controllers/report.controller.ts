import { Request, Response } from 'express';
import { ReportType, ReportStatus, Role } from '@prisma/client';
import { ReportService } from '../services/report.service';

// Create a new report
export const createReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, description, trackId, playlistId, albumId } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Validate report type
    if (!Object.values(ReportType).includes(type)) {
      res.status(400).json({ message: 'Invalid report type' });
      return;
    }

    // Validate mandatory fields
    if (!description) {
      res.status(400).json({ message: 'Description is required' });
      return;
    }

    // Allow OTHER type reports to not have an entity
    if (type !== ReportType.OTHER && !trackId && !playlistId && !albumId) {
      res.status(400).json({ 
        message: 'A report must be associated with a track, playlist, or album, unless it is of type OTHER.' 
      });
      return;
    }

    const report = await ReportService.createReport(user.id, {
      type,
      description,
      trackId,
      playlistId,
      albumId,
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      report,
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: error.message || 'Failed to create report' });
  }
};

// Get all reports (admin only)
export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Unauthorized access' });
      return;
    }

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    
    // Get filters from query params
    const filters: { type?: ReportType; status?: ReportStatus } = {};
    
    if (req.query.type && Object.values(ReportType).includes(req.query.type as ReportType)) {
      filters.type = req.query.type as ReportType;
    }
    
    if (req.query.status && Object.values(ReportStatus).includes(req.query.status as ReportStatus)) {
      filters.status = req.query.status as ReportStatus;
    }

    const result = await ReportService.getReports(user, page, limit, filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch reports' });
  }
};

// Get user's own reports
export const getUserReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');

    const result = await ReportService.getUserReports(user.id, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch reports' });
  }
};

// Get a single report by ID
export const getReportById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const isAdmin = user.role === Role.ADMIN;
    const report = await ReportService.getReportById(id, user.id, isAdmin);
    
    res.json(report);
  } catch (error: any) {
    console.error(`Error fetching report ${req.params.id}:`, error);
    
    if (error.message === 'Report not found') {
      res.status(404).json({ message: 'Report not found' });
      return;
    }
    
    if (error.message === 'Unauthorized access') {
      res.status(403).json({ message: 'You do not have permission to view this report' });
      return;
    }
    
    res.status(500).json({ message: error.message || 'Failed to fetch report' });
  }
};

// Resolve a report (admin only)
export const resolveReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Only administrators can resolve reports' });
      return;
    }

    // Validate resolution status
    if (!Object.values(ReportStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid report status' });
      return;
    }

    // Require resolution for resolved/rejected reports
    if (status !== ReportStatus.PENDING && !resolution) {
      res.status(400).json({ message: 'Resolution explanation is required' });
      return;
    }

    const updatedReport = await ReportService.resolveReport(id, user.id, {
      status,
      resolution,
    });

    res.json({
      message: 'Report has been processed',
      report: updatedReport,
    });
  } catch (error: any) {
    console.error(`Error resolving report ${req.params.id}:`, error);
    
    if (error.message === 'Report not found') {
      res.status(404).json({ message: 'Report not found' });
      return;
    }
    
    if (error.message === 'This report has already been processed') {
      res.status(400).json({ message: error.message });
      return;
    }
    
    res.status(500).json({ message: error.message || 'Failed to process report' });
  }
};

// Delete a report (admin only)
export const deleteReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const result = await ReportService.deleteReport(id, user.id);

    res.json({ message: result.message });
  } catch (error: any) {
    console.error(`Error deleting report ${req.params.id}:`, error);

    if (error.message === 'Report not found') {
      res.status(404).json({ message: 'Report not found' });
      return;
    }
    if (error.message.startsWith('Unauthorized')) {
      res.status(403).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: error.message || 'Failed to delete report' });
  }
}; 