import type { PresenceEntry } from "@/hooks/useWebSocket";

interface Props {
  presenceList: PresenceEntry[];
}

export function PresenceIndicator({ presenceList }: Props) {
  if (presenceList.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="list" aria-label="المتواجدون الآن">
      {presenceList.map((user) => (
        <div
          key={user.userId}
          role="listitem"
          title={`${user.name} — ${user.status === "online" ? "متصل" : "بعيد"}`}
          className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
        >
          <span
            className={`h-2 w-2 rounded-full ${user.status === "online" ? "bg-emerald-500" : "bg-amber-400"}`}
          />
          <span>{user.name}</span>
        </div>
      ))}
    </div>
  );
}
