import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import artistRoutes from './routes/artist.routes';
import albumRoutes from './routes/album.routes';
import trackRoutes from './routes/track.routes';
import historyRoutes from './routes/history.routes';
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
    origin: [
      process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      'https://music-website-dl1.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// SSE endpoint
app.get('/api/auth/sse', (req, res) => {
  // Thiết lập headers cho SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Gửi event ping để giữ kết nối
  const pingInterval = setInterval(() => {
    res.write('event: ping\ndata: ping\n\n');
  }, 30000);

  // Thêm client mới
  const client = (data: any) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      console.log('Event sent to client:', data); // Debug log
    } catch (error) {
      console.error('Error sending event to client:', error);
    }
  };
  clients.push(client);
  console.log('New SSE client connected. Total clients:', clients.length); // Debug log

  // Cleanup khi client ngắt kết nối
  req.on('close', () => {
    clearInterval(pingInterval);
    const index = clients.indexOf(client);
    if (index > -1) {
      clients.splice(index, 1);
      console.log('Client disconnected. Remaining clients:', clients.length); // Debug log
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', artistRoutes);
app.use('/api', albumRoutes);
app.use('/api', trackRoutes);
app.use('/api', historyRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
