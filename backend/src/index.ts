  import 'module-alias/register';
  import express from 'express';
  import cors from 'cors';
  import http from 'http';
  import dotenv from 'dotenv';
  import authRoutes from './routes/auth.routes';
  import sessionRoutes from './routes/session.routes';
  import albumRoutes from './routes/album.routes';
  import trackRoutes from './routes/track.routes';
  import adminRoutes from './routes/admin.routes';
  import historyRoutes from './routes/history.routes';
  import artistRoutes from './routes/artist.routes';
  import userRoutes from './routes/user.routes';
  import notificationRoutes from './routes/notification.routes';
  import { errorHandler } from './middleware/error';

  dotenv.config();

  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/session', sessionRoutes);
  app.use('/api/albums', albumRoutes);
  app.use('/api/tracks', trackRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/artist', artistRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Error Handler
  app.use(errorHandler);

  const PORT = process.env.PORT || 10000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
