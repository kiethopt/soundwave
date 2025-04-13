import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

let io: SocketIOServer;

// Initialize Socket.IO and attach it to the HTTP server
export const initializeSocket = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    // Configure CORS to allow connections from your frontend URL
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000", // Ensure this env variable is set or adjust the default
      methods: ["GET", "POST"]
    }
  });

  // Handle new socket connections
  io.on('connection', (socket) => {
    // console.log(`🔌 Socket connected: ${socket.id}`); // Commented out connection log

    // Handle socket disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      // Clean up user associations if necessary
    });
  });

  return io;
};

// Function to get the initialized io instance from other parts of the application
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized! Ensure initializeSocket was called.');
  }
  return io;
}; 