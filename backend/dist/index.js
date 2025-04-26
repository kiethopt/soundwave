"use strict";
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
const label_routes_1 = __importDefault(require("./routes/label.routes"));
const db_1 = __importDefault(require("./config/db"));
const playlist_extension_1 = require("./prisma/extensions/playlist.extension");
const socket_1 = require("./config/socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
(0, socket_1.initializeSocket)(server);
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
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
app.use('/api/labels', label_routes_1.default);
const initializeApp = async () => {
    try {
        await db_1.default.$queryRaw `SELECT 1`;
        console.log('✅ Database connection established');
        (0, playlist_extension_1.registerPlaylistCronJobs)();
        console.log('✅ Cron jobs registered via extension system');
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};
const PORT = process.env.PORT || 10000;
const initApp = async () => {
    try {
        await initializeApp();
    }
    catch (error) {
        console.error('[Init] Error during initialization:', error);
    }
};
const numericPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
server.listen(numericPort, '0.0.0.0', async () => {
    console.log(`🚀 Server is running on http://localhost:${numericPort}`);
    console.log(`🔌 Socket.IO listening on http://localhost:${numericPort}`);
    await initApp();
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
//# sourceMappingURL=index.js.map