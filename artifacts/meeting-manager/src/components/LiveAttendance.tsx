import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useMeetingSocket, type PresenceEntry } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  meetingId: number;
}

function AttendeeChip({ user }: { user: PresenceEntry }) {
  return (
    <div className="flex items-center gap-1.5 text-sm bg-muted rounded-full px-3 py-1">
      <span
        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${user.status === "online" ? "bg-emerald-500" : "bg-amber-400"}`}
        aria-label={user.status === "online" ? "متصل" : "بعيد"}
      />
      <span>{user.name}</span>
      {user.status === "away" && <span className="text-xs text-muted-foreground">(بعيد)</span>}
    </div>
  );
}

export function LiveAttendance({ meetingId }: Props) {
  const { user } = useAuth();
  const { presenceList, connected } = useMeetingSocket(meetingId, user?.id ?? 0, user?.fullName ?? "");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          الحضور المباشر
          <span className="text-muted-foreground font-normal">({presenceList.length})</span>
          {!connected && <span className="text-xs text-muted-foreground ml-auto">غير متصل</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {presenceList.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="empty-presence">
            لا يوجد أحد متصل حالياً
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="presence-list">
            {presenceList.map(u => (
              <AttendeeChip key={u.userId} user={u} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
