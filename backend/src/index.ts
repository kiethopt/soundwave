import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import albumRoutes from './routes/album.routes';
import trackRoutes from './routes/track.routes';
import adminRoutes from './routes/admin.routes';
import genreRoutes from './routes/genre.routes';
import historyRoutes from './routes/history.routes';
import artistRoutes from './routes/artist.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import playlistRoutes from './routes/playlist.routes';
import labelRoutes from './routes/label.routes';
import reportRoutes from './routes/report.routes';
// Import the extended Prisma client to ensure extensions are loaded
import prisma from './config/db';
import { registerPlaylistCronJobs } from './prisma/extensions/playlist.extension';
import { initializeSocket } from './config/socket'; // Import the socket initializer

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO AFTER creating the http server
initializeSocket(server);

// --- Updated CORS Middleware ---
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
// --- End Updated CORS Middleware ---

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/user', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/reports', reportRoutes);

// Initialize database connection and extensions
const initializeApp = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection established');

    // Register cron jobs
    registerPlaylistCronJobs();
    console.log('✅ Cron jobs registered via extension system');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 10000;

// Initialize app and system playlists
const initApp = async () => {
  try {
    // First initialize the application
    await initializeApp();
  } catch (error) {
    console.error('[Init] Error during initialization:', error);
  }
};

// Start the server
const numericPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

server.listen(numericPort, '0.0.0.0', async () => {
  console.log(`🚀 Server is running on http://localhost:${numericPort}`);
  console.log(`🔌 Socket.IO listening on http://localhost:${numericPort}`);
  await initApp();
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
