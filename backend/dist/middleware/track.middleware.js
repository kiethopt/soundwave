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
exports.checkAndUpdateTrackStatus = void 0;
const db_1 = __importDefault(require("../config/db"));
const checkAndUpdateTrackStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tracks = yield db_1.default.track.findMany({
            where: {
                isActive: false,
                releaseDate: {
                    lte: new Date(),
                },
            },
        });
        if (tracks.length > 0) {
            yield db_1.default.track.updateMany({
                where: {
                    id: {
                        in: tracks.map((track) => track.id),
                    },
                },
                data: {
                    isActive: true,
                },
            });
            console.log(`Updated ${tracks.length} tracks to active status`);
        }
        next();
    }
    catch (error) {
        console.error('Track status update error:', error);
        next();
    }
});
exports.checkAndUpdateTrackStatus = checkAndUpdateTrackStatus;
//# sourceMappingURL=track.middleware.js.map