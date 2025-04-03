"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllGenres = void 0;
const db_1 = __importDefault(require("../config/db"));
const handle_utils_1 = require("../utils/handle-utils");
const getAllGenres = async (req) => {
    const { search } = req.query;
    const where = search
        ? { name: { contains: String(search), mode: 'insensitive' } }
        : undefined;
    const options = {
        where,
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
        },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.genre, req, options);
    return {
        genres: result.data,
        pagination: result.pagination,
    };
};
exports.getAllGenres = getAllGenres;
//# sourceMappingURL=genre.service.js.map