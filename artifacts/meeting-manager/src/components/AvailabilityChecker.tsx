import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface BusyBlock {
  meetingId: number;
  title: string;
  time: string;
  conflictingAttendees: number[];
}

interface User {
  id: number;
  fullName: string;
}

interface AvailabilityCheckerProps {
  attendeeIds: number[];
  users: User[];
}

export function AvailabilityChecker({ attendeeIds, users }: AvailabilityCheckerProps) {
  const [date, setDate] = useState("");

  const { data, isLoading, isFetching } = useQuery<{ busy: BusyBlock[] }>({
    queryKey: ["availability", attendeeIds.join(","), date],
    queryFn: async () => {
      const params = new URLSearchParams({
        attendees: attendeeIds.join(","),
        date,
      });
      const res = await fetch(`/api/scheduling/availability?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check availability");
      return res.json();
    },
    enabled: date.length === 10 && attendeeIds.length > 0,
  });

  const getUserName = (id: number) => users.find(u => u.id === id)?.fullName ?? `#${id}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">التحقق من التوافر</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">اختر التاريخ</Label>
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm"
        />
      </div>

      {attendeeIds.length === 0 && (
        <p className="text-xs text-muted-foreground">أضف مشاركين أولاً لفحص التوافر</p>
      )}

      {date && attendeeIds.length > 0 && (
        <div>
          {isLoading || isFetching ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span>جارٍ الفحص…</span>
            </div>
          ) : data?.busy.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              جميع المشاركين متاحون هذا اليوم
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>يوجد {data?.busy.length} تعارض</span>
              </div>
              {data?.busy.map(block => (
                <div key={block.meetingId} className="text-xs bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-2 space-y-1">
                  <p className="font-medium">{block.title} — {block.time}</p>
                  <p className="text-muted-foreground">
                    {block.conflictingAttendees.map(getUserName).join("، ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
