import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { corsOrigins } from "../config/env.js";

let io: Server | undefined;

export function registerSocket(server: FastifyInstance) {
  io = new Server(server.server, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("join:user", (userId: string) => socket.join(`user:${userId}`));
    socket.on("join:match", (matchId: string) => socket.join(`match:${matchId}`));
  });

  return io;
}

export function emitEvent(event: string, payload: unknown, room?: string) {
  if (!io) return;
  if (room) io.to(room).emit(event, payload);
  else io.emit(event, payload);
}
