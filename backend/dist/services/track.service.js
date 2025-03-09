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
exports.deleteTrackById = void 0;
const db_1 = __importDefault(require("../config/db"));
const deleteTrackById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const track = yield db_1.default.track.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!track) {
        throw new Error('Track not found');
    }
    return db_1.default.track.delete({
        where: { id },
    });
});
exports.deleteTrackById = deleteTrackById;
//# sourceMappingURL=track.service.js.map