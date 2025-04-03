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
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const album_routes_1 = __importDefault(require("./routes/album.routes"));
const track_routes_1 = __importDefault(require("./routes/track.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const genre_routes_1 = __importDefault(require("./routes/genre.routes"));
const history_routes_1 = __importDefault(require("./routes/history.routes"));
const artist_routes_1 = __importDefault(require("./routes/artist.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const playlist_routes_1 = __importDefault(require("./routes/playlist.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const label_routes_1 = __importDefault(require("./routes/label.routes"));
const db_1 = __importDefault(require("./config/db"));
const playlist_extension_1 = require("./prisma/extensions/playlist.extension");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/albums', album_routes_1.default);
app.use('/api/tracks', track_routes_1.default);
app.use('/api/genres', genre_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/history', history_routes_1.default);
app.use('/api/artist', artist_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/playlists', playlist_routes_1.default);
app.use('/api/events', event_routes_1.default);
app.use('/api/labels', label_routes_1.default);
const initializeApp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.$queryRaw `SELECT 1`;
        console.log('✅ Database connection established');
        (0, playlist_extension_1.registerPlaylistCronJobs)();
        console.log('✅ Cron jobs registered via extension system');
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
});
const PORT = process.env.PORT || 10000;
const initApp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield initializeApp();
    }
    catch (error) {
        console.error('[Init] Error during initialization:', error);
    }
});
server.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`🚀 Server is running on port ${PORT}`);
    yield initApp();
}));
//# sourceMappingURL=index.js.map