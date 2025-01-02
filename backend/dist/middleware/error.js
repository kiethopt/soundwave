"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = exports.errorHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const library_1 = require("@prisma/client/runtime/library");
const jsonwebtoken_1 = require("jsonwebtoken");
const errorHandler = (err, req, res, next) => {
    var _a;
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        type: err.constructor.name,
    });
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            const isAlbumRoute = req.originalUrl.includes('/albums');
            res.status(400).json({
                message: isAlbumRoute
                    ? 'File quá lớn. Kích thước tối đa cho ảnh cover là 5MB'
                    : 'File quá lớn. Kích thước tối đa cho file audio là 10MB',
            });
            return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            res.status(400).json({
                message: 'Số lượng file vượt quá giới hạn cho phép',
            });
            return;
        }
    }
    if (err instanceof library_1.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            res.status(409).json({
                message: 'Dữ liệu đã tồn tại trong hệ thống',
                field: (_a = err.meta) === null || _a === void 0 ? void 0 : _a.target,
            });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({
                message: 'Không tìm thấy dữ liệu',
            });
            return;
        }
    }
    if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        res.status(401).json({
            message: 'Token không hợp lệ',
        });
        return;
    }
    if (err instanceof jsonwebtoken_1.TokenExpiredError) {
        res.status(401).json({
            message: 'Token đã hết hạn',
        });
        return;
    }
    if (err instanceof jsonwebtoken_1.NotBeforeError) {
        res.status(401).json({
            message: 'Token chưa có hiệu lực',
        });
        return;
    }
    if (err.message === 'Chỉ chấp nhận file audio' ||
        err.message === 'Chỉ chấp nhận file ảnh') {
        res.status(400).json({
            message: err.message,
        });
        return;
    }
    res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};
exports.errorHandler = errorHandler;
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};
exports.getErrorMessage = getErrorMessage;
//# sourceMappingURL=error.js.map