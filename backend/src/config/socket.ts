import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { env } from "./env.js";

let io: SocketIOServer;

// Map userId -> socketId pentru notificări directe
const userSockets = new Map<string, string>();

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client conectat: ${socket.id}`);

    // Clientul se identifică cu userId după login
    socket.on("identify", (userId: string) => {
      if (userId) {
        userSockets.set(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`[Socket] User ${userId} identificat -> socket ${socket.id}`);
      }
    });

    // Admin se alătură room-ului de admin
    socket.on("join:admin", () => {
      socket.join("admin");
      console.log(`[Socket] Admin conectat: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      // Curăță mapa la deconectare
      for (const [userId, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      console.log(`[Socket] Client deconectat: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io nu e inițializat!");
  return io;
}

// ── Emit helpers ─────────────────────────────────────────

/** Trimite un eveniment unui user specific */
export function emitToUser(userId: string, event: string, data?: any) {
  getIO().to(`user:${userId}`).emit(event, data);
}

/** Trimite un eveniment tuturor adminilor conectați */
export function emitToAdmins(event: string, data?: any) {
  getIO().to("admin").emit(event, data);
}

/** Trimite tuturor (broadcast) */
export function emitToAll(event: string, data?: any) {
  getIO().emit(event, data);
}
