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
exports.adminExtension = client_1.Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
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
                findMany(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        return result;
                    });
                },
                count(_a) {
                    return __awaiter(this, arguments, void 0, function* ({ args, query }) {
                        const result = yield query(args);
                        return result;
                    });
                },
            },
        },
    });
});
//# sourceMappingURL=admin.middleware.js.map