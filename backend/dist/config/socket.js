"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSockets = exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const userSockets = new Map();
const initializeSocket = (server) => {
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
    });
    io.on('connection', (socket) => {
        socket.on('register_user', (userId) => {
            if (userId) {
                userSockets.set(userId, socket.id);
                socket.removeAllListeners('disconnect');
                socket.on('disconnect', () => {
                    if (userSockets.get(userId) === socket.id) {
                        userSockets.delete(userId);
                    }
                    else {
                    }
                });
            }
            else {
            }
        });
        socket.on('disconnect', () => {
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized! Ensure initializeSocket was called.');
    }
    return io;
};
exports.getIO = getIO;
const getUserSockets = () => {
    return userSockets;
};
exports.getUserSockets = getUserSockets;
//# sourceMappingURL=socket.js.map