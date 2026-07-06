import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Wifi, WifiOff } from "lucide-react";
import { useMeetingSocket } from "@/hooks/useWebSocket";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  meetingId: number;
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

const TYPING_DEBOUNCE_MS = 800;

export function CollaborativeNotes({ meetingId, initialContent = "", onContentChange }: Props) {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const {
    connected,
    presenceList,
    typingUsers,
    emitNoteUpdate,
    emitTypingStart,
    emitTypingStop,
  } = useMeetingSocket(meetingId, user?.id ?? 0, user?.fullName ?? "");

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    onContentChange?.(val);

    // Typing indicator
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart();
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTypingStop();
      emitNoteUpdate(val);
    }, TYPING_DEBOUNCE_MS);
  }, [emitNoteUpdate, emitTypingStart, emitTypingStop, onContentChange]);

  const typingLabel = typingUsers.filter(u => u.userId !== user?.id).map(u => u.name).join("، ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            ملاحظات تعاونية
            {connected
              ? <Badge variant="secondary" className="text-emerald-600 bg-emerald-50"><Wifi className="h-3 w-3 ml-1" />مباشر</Badge>
              : <Badge variant="secondary" className="text-muted-foreground"><WifiOff className="h-3 w-3 ml-1" />غير متصل</Badge>
            }
          </CardTitle>
          <PresenceIndicator presenceList={presenceList} />
        </div>
        {typingLabel && (
          <p className="text-xs text-muted-foreground mt-1">{typingLabel} يكتب...</p>
        )}
      </CardHeader>
      <CardContent>
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="اكتب ملاحظاتك هنا... يمكنك استخدام @mention لذكر زملائك"
          className="w-full min-h-[160px] p-3 text-sm rounded-md border border-input bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          dir="rtl"
          aria-label="محرر الملاحظات التعاونية"
        />
      </CardContent>
    </Card>
  );
}
