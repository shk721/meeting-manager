import type { Server as SocketIO, Socket } from "socket.io";
import { db, tasksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "@workspace/db/notifications-queries";

interface PresenceEntry {
  userId: number;
  name: string;
  status: "online" | "away";
}

// In-memory presence per meeting namespace
const presenceMaps = new Map<string, Map<string, PresenceEntry>>();

function getPresenceMap(meetingId: string): Map<string, PresenceEntry> {
  if (!presenceMaps.has(meetingId)) {
    presenceMaps.set(meetingId, new Map());
  }
  return presenceMaps.get(meetingId)!;
}

export function registerMeetingNamespace(io: SocketIO): void {
  // Dynamic namespace pattern for meeting rooms
  const meetingNs = io.of(/^\/meeting\/\d+$/);

  meetingNs.on("connection", (socket: Socket) => {
    const meetingId = socket.nsp.name.replace("/meeting/", "");
    const presence = getPresenceMap(meetingId);

    // Join meeting room
    socket.on("join", async (data: { userId: number; name: string }) => {
      const { userId, name } = data;
      socket.join(`meeting:${meetingId}`);
      presence.set(socket.id, { userId, name, status: "online" });
      socket.nsp.to(`meeting:${meetingId}`).emit("presence:list", Array.from(presence.values()));
    });

    // Broadcast note updates (not persisted — caller persists via REST)
    socket.on("note:update", (data: { content: string; userId: number }) => {
      socket.to(`meeting:${meetingId}`).emit("note:update", data);
    });

    // Update action item in DB + broadcast
    socket.on("action-item:update", async (data: { taskId: number; status: string; userId: number }) => {
      const { taskId, status } = data;
      try {
        await db.update(tasksTable).set({ status }).where(eq(tasksTable.id, taskId));
        socket.nsp.to(`meeting:${meetingId}`).emit("action-item:update", data);
      } catch {
        // ignore DB errors in WS context
      }
    });

    // Mention — create notification + broadcast
    socket.on("mention:add", async (data: { mentionedUserId: number; content: string; mentionedByUserId: number }) => {
      const { mentionedUserId, content, mentionedByUserId } = data;
      try {
        const [mentioner] = await db.select({ fullName: usersTable.fullName })
          .from(usersTable).where(eq(usersTable.id, mentionedByUserId));
        await createNotification({
          userId: mentionedUserId,
          type: "mention",
          title: "تم ذكرك في اجتماع",
          message: `${mentioner?.fullName ?? "شخص ما"} ذكرك: ${content.slice(0, 80)}`,
          relatedId: parseInt(meetingId, 10),
          relatedType: "meeting",
        });
      } catch {
        // ignore
      }
      socket.nsp.to(`meeting:${meetingId}`).emit("mention:add", data);
    });

    // Presence status change
    socket.on("presence:away", () => {
      const entry = presence.get(socket.id);
      if (entry) {
        entry.status = "away";
        socket.nsp.to(`meeting:${meetingId}`).emit("presence:list", Array.from(presence.values()));
      }
    });

    // Typing indicators
    socket.on("typing:start", (data: { userId: number; name: string }) => {
      socket.to(`meeting:${meetingId}`).emit("typing:start", data);
    });

    socket.on("typing:stop", (data: { userId: number }) => {
      socket.to(`meeting:${meetingId}`).emit("typing:stop", data);
    });

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      presence.delete(socket.id);
      socket.nsp.to(`meeting:${meetingId}`).emit("presence:list", Array.from(presence.values()));
      // Clean up empty presence maps
      if (presence.size === 0) {
        presenceMaps.delete(meetingId);
      }
    });
  });
}

// Exported for testing
export { getPresenceMap, presenceMaps };
