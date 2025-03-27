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
exports.getAllGenres = void 0;
const db_1 = __importDefault(require("../config/db"));
const handle_utils_1 = require("../utils/handle-utils");
const getAllGenres = (req) => __awaiter(void 0, void 0, void 0, function* () {
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
    const result = yield (0, handle_utils_1.paginate)(db_1.default.genre, req, options);
    return {
        genres: result.data,
        pagination: result.pagination,
    };
});
exports.getAllGenres = getAllGenres;
//# sourceMappingURL=genre.service.js.map