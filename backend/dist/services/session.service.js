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
exports.sessionService = void 0;
const client_1 = require("@prisma/client");
const pusher_1 = __importDefault(require("../config/pusher"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const crypto_1 = require("crypto");
class SessionService {
    constructor() {
        this.SESSION_TTL = 24 * 60 * 60;
    }
    saveSession(userId_1, sessionId_1, role_1) {
        return __awaiter(this, arguments, void 0, function* (userId, sessionId, role, currentProfile = 'USER') {
            yield cache_middleware_1.client.hSet(`user_sessions:${userId}`, sessionId, JSON.stringify({
                role,
                currentProfile,
                createdAt: Date.now(),
            }));
            yield cache_middleware_1.client.expire(`user_sessions:${userId}`, this.SESSION_TTL);
        });
    }
    removeSession(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield cache_middleware_1.client.hDel(`user_sessions:${userId}`, sessionId);
        });
    }
    getUserSessions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessions = yield cache_middleware_1.client.hGetAll(`user_sessions:${userId}`);
            return Object.keys(sessions);
        });
    }
    createSession(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = (0, crypto_1.randomUUID)();
            yield this.saveSession(user.id, sessionId, client_1.Role.USER, user.currentProfile);
            return sessionId;
        });
    }
    removeUserSession(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.removeSession(userId, sessionId);
        });
    }
    validateSession(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessions = yield this.getUserSessions(userId);
            if (!sessions.includes(sessionId)) {
                return false;
            }
            yield cache_middleware_1.client.expire(`user_sessions:${userId}`, this.SESSION_TTL);
            return true;
        });
    }
    updateSessionProfile(userId, sessionId, currentProfile) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionData = {
                role: client_1.Role.USER,
                currentProfile,
                createdAt: Date.now(),
            };
            yield cache_middleware_1.client.hSet(`user_sessions:${userId}`, sessionId, JSON.stringify(sessionData));
            yield cache_middleware_1.client.expire(`user_sessions:${userId}`, this.SESSION_TTL);
        });
    }
    handleAudioPlay(userId, currentSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessions = yield this.getUserSessions(userId);
            yield pusher_1.default.trigger(`user-${userId}`, 'audio-control', {
                type: 'STOP_OTHER_SESSIONS',
                currentSessionId,
            });
        });
    }
    handleArtistRequestApproval(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield pusher_1.default.trigger(`user-${userId}`, 'artist-request-status', {
                    type: 'REQUEST_APPROVED',
                    message: 'Your artist request has been approved',
                    hasPendingRequest: false,
                });
            }
            catch (error) {
                console.error('[Pusher] Error sending approval event:', error);
                throw error;
            }
        });
    }
    handleArtistRequestRejection(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[Pusher] Sending rejection event to user ${userId}`);
                yield pusher_1.default.trigger(`user-${userId}`, 'artist-request-status', {
                    type: 'REQUEST_REJECTED',
                    message: 'Your artist request has been rejected',
                    hasPendingRequest: false,
                });
                console.log(`[Pusher] Event sent successfully to user ${userId}`);
            }
            catch (error) {
                console.error('[Pusher] Error sending rejection event:', error);
                throw error;
            }
        });
    }
}
exports.sessionService = new SessionService();
//# sourceMappingURL=session.service.js.map