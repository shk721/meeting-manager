import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Reminder {
  id: number;
  meetingId: number;
  userId: number;
  minutesBefore: number;
  isSent: boolean;
  createdAt: string;
}

interface ReminderSettingsProps {
  meetingId: number;
}

const MINUTES_OPTIONS = [
  { value: 15, label: "قبل 15 دقيقة" },
  { value: 30, label: "قبل 30 دقيقة" },
  { value: 60, label: "قبل ساعة" },
  { value: 1440, label: "قبل يوم" },
];

export function ReminderSettings({ meetingId }: ReminderSettingsProps) {
  const queryClient = useQueryClient();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ["reminders", meetingId],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/reminders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load reminders");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (minutesBefore: number) => {
      const res = await fetch(`/api/meetings/${meetingId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ minutesBefore }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add reminder");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders", meetingId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders", meetingId] }),
  });

  const alreadySet = (minutes: number) => reminders.some(r => r.minutesBefore === minutes);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">التذكيرات</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {/* Existing reminders */}
          {reminders.length > 0 && (
            <div className="space-y-1.5">
              {reminders.map(r => {
                const option = MINUTES_OPTIONS.find(o => o.value === r.minutesBefore);
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                    <span>{option?.label ?? `${r.minutesBefore} دقيقة`}</span>
                    <button
                      onClick={() => deleteMutation.mutate(r.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new reminder */}
          <div className="flex gap-2 flex-wrap">
            {MINUTES_OPTIONS.map(opt => (
              <button
                key={opt.value}
                disabled={alreadySet(opt.value) || addMutation.isPending}
                onClick={() => addMutation.mutate(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  alreadySet(opt.value)
                    ? "border-primary bg-primary/10 text-primary cursor-default"
                    : "border-border hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {addMutation.isError && (
            <p className="text-xs text-destructive">{(addMutation.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  );
}
