"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initializeSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
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
//# sourceMappingURL=socket.js.map