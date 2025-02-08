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
exports.authorize = exports.authenticate = exports.authExtension = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const cache_middleware_1 = require("./cache.middleware");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
exports.authExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            user: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('user', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
            },
        },
    });
});
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ message: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield db_1.default.user.findUnique({
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
});
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const user = req.user;
            if (!user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            if (!user.isActive) {
                res.status(403).json({
                    message: 'Your account has been deactivated',
                    code: 'ACCOUNT_DEACTIVATED',
                });
                return;
            }
            if (user.role === client_1.Role.ADMIN) {
                return next();
            }
            if (roles.includes(client_1.Role.ARTIST)) {
                if (((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) &&
                    ((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.isActive) &&
                    user.currentProfile !== 'ARTIST') {
                    res.status(403).json({
                        message: 'Please switch to Artist profile to access this page',
                        code: 'SWITCH_TO_ARTIST_PROFILE',
                    });
                    return;
                }
                if (user.currentProfile === 'ARTIST' &&
                    ((_c = user.artistProfile) === null || _c === void 0 ? void 0 : _c.isVerified) &&
                    ((_d = user.artistProfile) === null || _d === void 0 ? void 0 : _d.isActive)) {
                    return next();
                }
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
    });
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map