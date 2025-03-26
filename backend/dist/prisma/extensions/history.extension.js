"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../../middleware/cache.middleware");
const cache_middleware_2 = require("../../middleware/cache.middleware");
const playlistService = __importStar(require("../../services/playlist.service"));
const userLastUpdateTime = new Map();
const UPDATE_INTERVAL = 30 * 60 * 1000;
const throttledPlaylistUpdate = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const now = Date.now();
    const lastUpdate = userLastUpdateTime.get(userId) || 0;
    if (now - lastUpdate > UPDATE_INTERVAL) {
        try {
            yield playlistService.updateVibeRewindPlaylist(userId);
            userLastUpdateTime.set(userId, now);
            console.log(`[HistoryExtension] Updated Vibe Rewind playlist for user ${userId}`);
        }
        catch (error) {
            console.error(`[HistoryExtension] Error updating Vibe Rewind playlist: ${error}`);
        }
    }
});
exports.historyExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            history: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        if (args.data.userId &&
                            args.data.type === 'PLAY' &&
                            args.data.completed) {
                            yield Promise.all([
                                cache_middleware_2.client.del(`/api/user/${args.data.userId}/recommended-artists`),
                                cache_middleware_2.client.del('/api/top-tracks'),
                                cache_middleware_2.client.del('/api/top-albums'),
                                cache_middleware_2.client.del('/api/top-artists'),
                                (0, cache_middleware_1.clearCacheForEntity)('history', {
                                    userId: args.data.userId,
                                }),
                            ]);
                            throttledPlaylistUpdate(args.data.userId);
                        }
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const history = yield client.history.findFirst({
                            where: args.where,
                            select: { userId: true, type: true, completed: true },
                        });
                        const result = yield query(args);
                        if ((history === null || history === void 0 ? void 0 : history.userId) && history.type === 'PLAY') {
                            yield Promise.all([
                                cache_middleware_2.client.del(`/api/user/${history.userId}/recommended-artists`),
                                cache_middleware_2.client.del('/api/top-tracks'),
                                cache_middleware_2.client.del('/api/top-albums'),
                                cache_middleware_2.client.del('/api/top-artists'),
                                (0, cache_middleware_1.clearCacheForEntity)('history', {
                                    userId: history.userId,
                                }),
                            ]);
                            const isCompleted = typeof args.data === 'object' &&
                                'completed' in args.data &&
                                args.data.completed === true;
                            if (isCompleted) {
                                throttledPlaylistUpdate(history.userId);
                            }
                        }
                        return result;
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=history.extension.js.map