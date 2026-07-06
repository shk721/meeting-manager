import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface RecurringMeetingDialogProps {
  meetingId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Freq = "daily" | "weekly" | "monthly";

const WEEKDAYS = [
  { id: "SU", label: "أحد" },
  { id: "MO", label: "إثنين" },
  { id: "TU", label: "ثلاثاء" },
  { id: "WE", label: "أربعاء" },
  { id: "TH", label: "خميس" },
  { id: "FR", label: "جمعة" },
  { id: "SA", label: "سبت" },
];

export function RecurringMeetingDialog({ meetingId, open, onClose, onSuccess }: RecurringMeetingDialogProps) {
  const [freq, setFreq] = useState<Freq>("weekly");
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>(["SU"]);
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { freq, interval };
      if (freq === "weekly" && selectedDays.length > 0) body.days = selectedDays;
      if (endDate) body.endDate = endDate;

      const res = await fetch(`/api/meetings/${meetingId}/make-recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "فشل تعيين التكرار");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعيين تكرار الاجتماع</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>التكرار</Label>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as Freq[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFreq(f)}
                  className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                    freq === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {{ daily: "يومي", weekly: "أسبوعي", monthly: "شهري" }[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className="space-y-1.5">
            <Label>كل كم {freq === "daily" ? "يوم" : freq === "weekly" ? "أسبوع" : "شهر"}</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={interval}
              onChange={e => setInterval(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {/* Days of week (weekly only) */}
          {freq === "weekly" && (
            <div className="space-y-1.5">
              <Label>أيام الأسبوع</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(d => (
                  <label key={d.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={selectedDays.includes(d.id)}
                      onCheckedChange={() => toggleDay(d.id)}
                    />
                    <span className="text-sm">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* End date */}
          <div className="space-y-1.5">
            <Label>تاريخ انتهاء التكرار (اختياري)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "جارٍ الحفظ…" : "تطبيق التكرار"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
