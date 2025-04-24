import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

let io: SocketIOServer;

// Lưu trữ map giữa userId và socketId
// Lưu ý: Trong môi trường production, bạn nên cân nhắc dùng Redis hoặc giải pháp khác
// để quản lý state này nếu có nhiều instance server.
const userSockets = new Map<string, string>(); // Map<userId, socketId>

// Initialize Socket.IO and attach it to the HTTP server
export const initializeSocket = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    // Configure CORS to allow connections from your frontend URL
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000", // Ensure this env variable is set or adjust the default
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    // console.log(`🔌 Socket connected: ${socket.id}`);

    // Lắng nghe sự kiện khi user xác thực và gửi userId
    // Client cần gửi sự kiện này sau khi kết nối và đã có thông tin user
    socket.on('register_user', (userId: string) => {
        if (userId) {
         // console.log(`✅ Registering user ${userId} with socket ${socket.id}`);
          userSockets.set(userId, socket.id);

          // Ghi đè listener disconnect cũ bằng listener mới có userId
          socket.removeAllListeners('disconnect'); // Xóa listener disconnect mặc định
          socket.on('disconnect', () => {
           // console.log(`🔌 Socket disconnected: ${socket.id} for user ${userId}`);
            // Chỉ xóa nếu socketId vẫn là của user này (tránh trường hợp kết nối lại nhanh)
            if (userSockets.get(userId) === socket.id) {
              userSockets.delete(userId);
             // console.log(`🧹 Cleaned up socket mapping for user ${userId}`);
            } else {
              //console.log(` Socket ${socket.id} disconnected, but user ${userId} has a newer socket.`);
            }
          });
        } else {
          //  console.warn(`⚠️ Attempted to register socket ${socket.id} without a userId.`);
        }
      });


    // Xử lý chung khi ngắt kết nối (nếu user chưa kịp register)
    socket.on('disconnect', () => {
      //console.log(`🔌 Socket disconnected: ${socket.id} (user not registered or already handled)`);
      // Có thể thêm logic dọn dẹp khác nếu cần
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