import { Server } from "socket.io";
import { corsOrigins } from "../config/env.js";
let io;
export function registerSocket(server) {
    io = new Server(server.server, {
        cors: {
            origin: corsOrigins,
            credentials: true
        }
    });
    io.on("connection", (socket) => {
        socket.on("join:user", (userId) => socket.join(`user:${userId}`));
        socket.on("join:match", (matchId) => socket.join(`match:${matchId}`));
    });
    return io;
}
export function emitEvent(event, payload, room) {
    if (!io)
        return;
    if (room)
        io.to(room).emit(event, payload);
    else
        io.emit(event, payload);
}
