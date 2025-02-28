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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("./cache.middleware");
const cache_middleware_2 = require("./cache.middleware");
exports.adminExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            user: {
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        if (args.data.role === client_1.Role.ADMIN) {
                            const existingArtistProfile = yield client.artistProfile.findUnique({
                                where: { userId: args.where.id },
                            });
                            if (existingArtistProfile) {
                                yield client.artistProfile.delete({
                                    where: { userId: args.where.id },
                                });
                            }
                        }
                        const result = yield query(args);
                        if (args.data.isActive === false) {
                            yield cache_middleware_2.client.del(`user_sessions:${args.where.id}`);
                        }
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
            artistProfile: {
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        if (args.data.isActive === false) {
                            const artistProfile = yield client.artistProfile.findUnique({
                                where: { id: args.where.id },
                                select: { userId: true },
                            });
                            if (artistProfile) {
                                yield cache_middleware_2.client.del(`user_sessions:${artistProfile.userId}`);
                                yield client.user.update({
                                    where: { id: artistProfile.userId },
                                    data: { currentProfile: 'USER' },
                                });
                            }
                        }
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('artist', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
            },
            genre: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('genre', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('genre', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                        ]);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            (0, cache_middleware_1.clearCacheForEntity)('genre', {
                                entityId: args.where.id,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
                            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
                        ]);
                        return result;
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=admin.middleware.js.map