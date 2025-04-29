"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.optionalAuthenticate = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ message: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await db_1.default.user.findUnique({
            where: { id: decoded.id },
            select: prisma_selects_1.userSelect,
        });
        if (!user) {
            res.status(401).json({ message: 'Invalid token' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({
                message: 'Your account has been deactivated',
                code: 'ACCOUNT_DEACTIVATED',
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            next();
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const user = await db_1.default.user.findUnique({
                where: { id: decoded.id },
                select: prisma_selects_1.userSelect,
            });
            if (user && user.isActive) {
                req.user = user;
            }
            next();
        }
        catch (error) {
            console.error('Invalid token provided:', error);
            next();
        }
    }
    catch (error) {
        console.error('Error in optional authentication:', error);
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
const authorize = (roles) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            if (user.role === client_1.Role.ADMIN) {
                return next();
            }
            if (roles.includes(client_1.Role.ARTIST)) {
                if (!user.artistProfile?.isVerified) {
                    res.status(403).json({
                        message: 'Your artist profile is not verified yet',
                        code: 'ARTIST_NOT_VERIFIED',
                    });
                    return;
                }
                if (!user.artistProfile?.isActive) {
                    res.status(403).json({
                        message: 'Your artist profile has been deactivated. Please contact admin',
                        code: 'ARTIST_DEACTIVATED',
                    });
                    return;
                }
                if (user.currentProfile !== 'ARTIST') {
                    res.status(403).json({
                        message: 'Please switch to Artist profile to access this page',
                        code: 'SWITCH_TO_ARTIST_PROFILE',
                    });
                    return;
                }
                return next();
            }
            if (roles.includes(client_1.Role.USER) && user.role === client_1.Role.USER) {
                return next();
            }
            res.status(403).json({
                message: 'You do not have permission to perform this action',
            });
        }
        catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map