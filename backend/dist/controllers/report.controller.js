"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReport = exports.getReportById = exports.getUserReports = exports.getReports = exports.createReport = void 0;
const client_1 = require("@prisma/client");
const report_service_1 = require("../services/report.service");
const createReport = async (req, res) => {
    try {
        const { type, description, trackId, playlistId, albumId } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (!Object.values(client_1.ReportType).includes(type)) {
            res.status(400).json({ message: 'Invalid report type' });
            return;
        }
        if (!description) {
            res.status(400).json({ message: 'Description is required' });
            return;
        }
        if (!trackId && !playlistId && !albumId) {
            res.status(400).json({
                message: 'A report must be associated with a track, playlist, or album'
            });
            return;
        }
        const report = await report_service_1.ReportService.createReport(user.id, {
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
    }
    catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ message: error.message || 'Failed to create report' });
    }
};
exports.createReport = createReport;
const getReports = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Unauthorized access' });
            return;
        }
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const filters = {};
        if (req.query.type && Object.values(client_1.ReportType).includes(req.query.type)) {
            filters.type = req.query.type;
        }
        if (req.query.status && Object.values(client_1.ReportStatus).includes(req.query.status)) {
            filters.status = req.query.status;
        }
        const result = await report_service_1.ReportService.getReports(user, page, limit, filters);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
};
exports.getReports = getReports;
const getUserReports = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const result = await report_service_1.ReportService.getUserReports(user.id, page, limit);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
};
exports.getUserReports = getUserReports;
const getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        const isAdmin = user.role === client_1.Role.ADMIN;
        const report = await report_service_1.ReportService.getReportById(id, user.id, isAdmin);
        res.json(report);
    }
    catch (error) {
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
exports.getReportById = getReportById;
const resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Only administrators can resolve reports' });
            return;
        }
        if (!Object.values(client_1.ReportStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid report status' });
            return;
        }
        if (status !== client_1.ReportStatus.PENDING && !resolution) {
            res.status(400).json({ message: 'Resolution explanation is required' });
            return;
        }
        const updatedReport = await report_service_1.ReportService.resolveReport(id, user.id, {
            status,
            resolution,
        });
        res.json({
            message: 'Report has been processed',
            report: updatedReport,
        });
    }
    catch (error) {
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
exports.resolveReport = resolveReport;
//# sourceMappingURL=report.controller.js.map