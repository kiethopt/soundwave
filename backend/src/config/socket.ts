import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

let io: SocketIOServer;

// Lưu trữ map giữa userId và socketId
const userSockets = new Map<string, string>();

// Initialize Socket.IO and attach it to the HTTP server
export const initializeSocket = (server: http.Server): SocketIOServer => {
  // Use the same allowed origins logic as in index.ts
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins, // Use the array of allowed origins
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    // Có thể tăng pingTimeout nếu mạng không ổn định (mặc định 5000ms)
    // pingTimeout: 7000,
    // pingInterval: 25000 // (mặc định 25000ms)
  });

  io.on('connection', (socket: Socket) => {
    // Lắng nghe sự kiện khi user xác thực và gửi userId
    // Client cần gửi sự kiện này sau khi kết nối và đã có thông tin user
    socket.on('register_user', (userId: string) => {
        if (userId) {
         // console.log(`✅ Registering user ${userId} with socket ${socket.id}`);
          userSockets.set(userId, socket.id);

          // Ghi đè listener disconnect cũ bằng listener mới có userId
          socket.removeAllListeners('disconnect'); // Xóa listener disconnect mặc định
          socket.on('disconnect', () => {
            // Chỉ xóa nếu socketId vẫn là của user này (tránh trường hợp kết nối lại nhanh)
            if (userSockets.get(userId) === socket.id) {
              userSockets.delete(userId);
            } else {
            }
          });
        } else {
        }
      });


    // Xử lý chung khi ngắt kết nối (nếu user chưa kịp register)
    socket.on('disconnect', () => {
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

// Function to get the user-socket map
export const getUserSockets = (): Map<string, string> => {
    return userSockets;
}; 