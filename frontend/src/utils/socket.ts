import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
    });

    socket.on('connect', () => {
    });

    socket.on('disconnect', (reason) => {
      socket = null;
    });

    socket.on('connect_error', (err) => {
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