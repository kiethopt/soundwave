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
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const getAllLabels = () => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.findMany({
        orderBy: {
            name: 'asc',
        },
        select: prisma_selects_1.labelSelect,
    });
});
exports.getAllLabels = getAllLabels;
const getLabelById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.findUnique({
        where: { id },
        select: Object.assign(Object.assign({}, prisma_selects_1.labelSelect), { albums: {
                where: { isActive: true },
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    releaseDate: true,
                    type: true,
                },
                orderBy: { releaseDate: 'desc' },
            }, tracks: {
                where: { isActive: true },
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    releaseDate: true,
                    duration: true,
                    playCount: true,
                },
                orderBy: { releaseDate: 'desc' },
            } }),
    });
});
exports.getLabelById = getLabelById;
const createLabel = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.create({
        data,
        select: prisma_selects_1.labelSelect,
    });
});
exports.createLabel = createLabel;
const updateLabel = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.update({
        where: { id },
        data,
        select: prisma_selects_1.labelSelect,
    });
});
exports.updateLabel = updateLabel;
const deleteLabel = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.delete({
        where: { id },
    });
});
exports.deleteLabel = deleteLabel;
//# sourceMappingURL=label.service.js.map