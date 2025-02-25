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
exports.checkAndUpdateTrackStatus = exports.trackExtension = void 0;
const db_1 = __importDefault(require("../config/db"));
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
exports.trackExtension = client_1.Prisma.defineExtension({
    name: 'trackExtension',
    model: {
        track: {
            autoPublishTracks() {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const tracks = yield db_1.default.track.findMany({
                            where: {
                                isActive: false,
                                releaseDate: {
                                    lte: new Date(),
                                },
                            },
                        });
                        for (const track of tracks) {
                            yield db_1.default.track.update({
                                where: { id: track.id },
                                data: { isActive: true },
                            });
                            console.log(`Auto published track: ${track.title}`);
                        }
                    }
                    catch (error) {
                        console.error('Auto publish error:', error);
                    }
                });
            },
        },
    },
});
node_cron_1.default.schedule('* * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.track.autoPublishTracks();
    }
    catch (error) {
        console.error('Cron job error:', error);
    }
}));
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