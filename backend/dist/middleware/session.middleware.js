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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
const cache_middleware_1 = require("./cache.middleware");
const db_1 = __importDefault(require("../config/db"));
const SESSION_REQUIRED_PATHS = [
    '/api/tracks/:trackId/play',
    '/api/albums/:albumId/play',
    '/api/admin/users/:id/deactivate',
    '/api/user/profile',
    '/api/user/playlists',
    '/api/user/favorites',
    '/api/user/history',
];
const sessionMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const requiresSession = SESSION_REQUIRED_PATHS.some((path) => {
        const regex = new RegExp(`^${path.replace(/:\w+/g, '\\w+')}$`);
        return regex.test(req.path);
    });
    if (!requiresSession) {
        return next();
    }
    const sessionId = req.header('Session-ID');
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!sessionId || !userId) {
        const error = new Error('Unauthorized: Missing session ID or user ID');
        error.code = 'MISSING_CREDENTIALS';
        error.status = 401;
        return next(error);
    }
    try {
        const sessionData = yield cache_middleware_1.client.hGet(`user_sessions:${userId}`, sessionId);
        if (!sessionData) {
            const error = new Error('Session expired or invalid');
            error.code = 'INVALID_SESSION';
            error.status = 401;
            return next(error);
        }
        const user = yield db_1.default.user.findUnique({
            where: { id: userId },
            select: { isActive: true },
        });
        if (!(user === null || user === void 0 ? void 0 : user.isActive)) {
            yield cache_middleware_1.client.del(`user_sessions:${userId}`);
            const error = new Error('Your account has been deactivated. Please contact admin');
            error.code = 'ACCOUNT_DEACTIVATED';
            error.status = 403;
            return next(error);
        }
        yield cache_middleware_1.client.expire(`user_sessions:${userId}`, 24 * 60 * 60);
        next();
    }
    catch (error) {
        next(error);
    }
});
exports.sessionMiddleware = sessionMiddleware;
//# sourceMappingURL=session.middleware.js.map