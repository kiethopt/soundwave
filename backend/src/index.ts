import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import albumRoutes from './routes/album.routes';
import trackRoutes from './routes/track.routes';
import { errorHandler } from './middleware/error';
import prisma from './config/db';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Danh sách clients SSE
export const clients: ((data: any) => void)[] = [];

// Test database connection
prisma
  .$connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    process.exit(1);
  });

// Middleware
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', albumRoutes);
app.use('/api', trackRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
