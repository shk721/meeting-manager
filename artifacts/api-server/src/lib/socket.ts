import { Server as SocketIO } from "socket.io";
import type { Server as HttpServer } from "http";
import { registerMeetingNamespace } from "../websocket/meetings";

let io: SocketIO;

export function initSocketIO(httpServer: HttpServer): SocketIO {
  io = new SocketIO(httpServer, {
    cors: { origin: true, credentials: true },
  });
  registerMeetingNamespace(io);
  return io;
}

export function getIO(): SocketIO {
  return io;
}
