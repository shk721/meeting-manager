import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface PresenceEntry {
  userId: number;
  name: string;
  status: "online" | "away";
}

export interface TypingUser {
  userId: number;
  name: string;
}

export function useMeetingSocket(meetingId: number, userId: number, userName: string) {
  const socketRef = useRef<Socket | null>(null);
  const [presenceList, setPresenceList] = useState<PresenceEntry[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!meetingId || !userId) return;

    const socket = io(`/meeting/${meetingId}`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { userId, name: userName });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("presence:list", (list: PresenceEntry[]) => setPresenceList(list));

    socket.on("typing:start", (data: TypingUser) => {
      setTypingUsers(prev => {
        if (prev.some(u => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    socket.on("typing:stop", (data: { userId: number }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [meetingId, userId, userName]);

  const emitNoteUpdate = useCallback((content: string) => {
    socketRef.current?.emit("note:update", { content, userId });
  }, [userId]);

  const emitActionItemUpdate = useCallback((taskId: number, status: string) => {
    socketRef.current?.emit("action-item:update", { taskId, status, userId });
  }, [userId]);

  const emitMention = useCallback((mentionedUserId: number, content: string) => {
    socketRef.current?.emit("mention:add", { mentionedUserId, content, mentionedByUserId: userId });
  }, [userId]);

  const emitTypingStart = useCallback(() => {
    socketRef.current?.emit("typing:start", { userId, name: userName });
  }, [userId, userName]);

  const emitTypingStop = useCallback(() => {
    socketRef.current?.emit("typing:stop", { userId });
  }, [userId]);

  const setAway = useCallback(() => {
    socketRef.current?.emit("presence:away");
  }, []);

  return {
    connected,
    presenceList,
    typingUsers,
    emitNoteUpdate,
    emitActionItemUpdate,
    emitMention,
    emitTypingStart,
    emitTypingStop,
    setAway,
  };
}
