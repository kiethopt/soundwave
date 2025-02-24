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
exports.userExtension = void 0;
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("./cache.middleware");
const cache_middleware_2 = require("./cache.middleware");
exports.userExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            userFollow: {
                create(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        yield Promise.all([
                            cache_middleware_2.client.del(`/api/user/following`),
                            cache_middleware_2.client.del(`/api/user/followers`),
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: args.data.followerId,
                                clearSearch: true,
                            }),
                            (0, cache_middleware_1.clearCacheForEntity)('user', {
                                entityId: (args.data.followingUserId ||
                                    args.data.followingArtistId ||
                                    ''),
                                clearSearch: true,
                            }),
                        ]);
                        return result;
                    });
                },
                delete(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const followInfo = yield client.userFollow.findFirst({
                            where: args.where,
                            select: {
                                followerId: true,
                                followingUserId: true,
                                followingArtistId: true,
                            },
                        });
                        const result = yield query(args);
                        if (followInfo) {
                            const followerId = followInfo.followerId;
                            const followingId = followInfo.followingUserId || followInfo.followingArtistId;
                            const followingKeys = yield cache_middleware_2.client.keys(`/api/user/following*userId=${followerId}*`);
                            const followerKeys = yield cache_middleware_2.client.keys(`/api/user/followers*userId=${followingId}*`);
                            yield Promise.all([
                                ...(followingKeys.length
                                    ? followingKeys.map((k) => cache_middleware_2.client.del(k))
                                    : []),
                                ...(followerKeys.length
                                    ? followerKeys.map((k) => cache_middleware_2.client.del(k))
                                    : []),
                                cache_middleware_2.client.del(`/api/user/following?userId=${followerId}`),
                                cache_middleware_2.client.del(`/api/user/followers?userId=${followingId}`),
                                (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: followerId,
                                    clearSearch: true,
                                }),
                                (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: followingId,
                                    clearSearch: true,
                                }),
                            ]);
                        }
                        return result;
                    });
                },
            },
            user: {
                update(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        if ('id' in args.where) {
                            yield Promise.all([
                                cache_middleware_2.client.del(`/api/users/${args.where.id}/followers`),
                                cache_middleware_2.client.del(`/api/users/${args.where.id}/following`),
                                (0, cache_middleware_1.clearCacheForEntity)('user', {
                                    entityId: args.where.id,
                                    clearSearch: true,
                                }),
                            ]);
                        }
                        return result;
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=user.middleware.js.map