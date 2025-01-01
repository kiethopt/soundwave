import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import albumRoutes from './routes/album.routes';
import trackRoutes from './routes/track.routes';
import { errorHandler } from './middleware/error';
import prisma from './config/db';

dotenv.config();

const app = express();

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
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', albumRoutes);
app.use('/api', trackRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
