"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../config/db"));
async function migrateSpecialPlaylistsToSystemType() {
    try {
        console.log("Bắt đầu cập nhật các playlist đặc biệt sang type SYSTEM");
        const vibeRewindResult = await db_1.default.playlist.updateMany({
            where: {
                name: "Vibe Rewind",
                type: "NORMAL",
            },
            data: {
                type: "SYSTEM",
            },
        });
        console.log(`Đã cập nhật ${vibeRewindResult.count} playlist Vibe Rewind sang type SYSTEM`);
        const welcomeMixResult = await db_1.default.playlist.updateMany({
            where: {
                name: "Welcome Mix",
                type: "NORMAL",
            },
            data: {
                type: "SYSTEM",
            },
        });
        console.log(`Đã cập nhật ${welcomeMixResult.count} playlist Welcome Mix sang type SYSTEM`);
        console.log("Hoàn thành cập nhật!");
    }
    catch (error) {
        console.error("Lỗi khi cập nhật playlist:", error);
    }
    finally {
        await db_1.default.$disconnect();
    }
}
migrateSpecialPlaylistsToSystemType();
//# sourceMappingURL=migrate-special-playlists.js.map