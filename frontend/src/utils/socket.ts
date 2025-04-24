import { io, Socket } from 'socket.io-client';

// URL của backend Socket.IO server
// Thay đổi giá trị này nếu backend của bạn chạy ở địa chỉ khác
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Tùy chọn cấu hình thêm nếu cần
      // transports: ['websocket'], // Ví dụ: chỉ sử dụng WebSocket
      // autoConnect: false, // Ví dụ: không tự động kết nối
    });

    socket.on('connect', () => {
      //console.log('🔌 Connected to Socket.IO server');
    });

    socket.on('disconnect', (reason) => {
      //console.log(`🔌 Disconnected from Socket.IO server: ${reason}`);
      socket = null; // Reset socket instance on disconnect
    });

    socket.on('connect_error', (err) => {
    //  console.error('Socket.IO connection error:', err);
      socket = null; // Reset socket instance on connection error
    });
  }
  return socket;
};

// Hàm để ngắt kết nối thủ công (nếu cần)
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}; 