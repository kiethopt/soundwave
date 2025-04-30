import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
       console.log('🔌 Socket connected successfully with transport:', socket?.io.engine.transport.name);
    });

    socket.on('disconnect', (reason) => {
       console.warn(`🔌 Socket disconnected: ${reason}`);
       socket = null;
    });

    socket.on('connect_error', (err) => {
       console.error('🔌 Socket connection error:', err.message);
       console.error('   Error details:', err);
       socket = null;
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}; 