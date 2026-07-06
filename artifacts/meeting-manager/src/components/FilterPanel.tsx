import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FilterCriteria } from "@/hooks/useFilters";

interface MeetingFilterPanelProps {
  type: "meetings";
  criteria: FilterCriteria;
  onCriteriaChange: (c: FilterCriteria) => void;
  onApply: () => void;
  onClear: () => void;
  appliedCount: number;
  users?: Array<{ id: number; fullName: string }>;
}

interface TaskFilterPanelProps {
  type: "tasks";
  criteria: FilterCriteria;
  onCriteriaChange: (c: FilterCriteria) => void;
  onApply: () => void;
  onClear: () => void;
  appliedCount: number;
  users?: Array<{ id: number; fullName: string }>;
}

type Props = MeetingFilterPanelProps | TaskFilterPanelProps;

const DATE_PRESETS = [
  { value: "today",     label: "اليوم" },
  { value: "this_week", label: "هذا الأسبوع" },
  { value: "this_month",label: "هذا الشهر" },
];

function getDateRange(preset: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "today") return { start: fmt(now), end: fmt(now) };
  if (preset === "this_week") {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  return {};
}

export default function FilterPanel({ type, criteria, onCriteriaChange, onApply, onClear, appliedCount, users = [] }: Props) {
  const [open, setOpen] = useState(false);

  const set = (key: string, value: string | number | undefined) =>
    onCriteriaChange({ ...criteria, [key]: value });

  const handlePreset = (preset: string) => {
    const range = getDateRange(preset);
    onCriteriaChange({ ...criteria, startDate: range.start, endDate: range.end });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="gap-2"
      >
        <SlidersHorizontal className="h-4 w-4" />
        تصفية
        {appliedCount > 0 && (
          <Badge variant="destructive" className="h-4 w-4 p-0 text-[10px] rounded-full flex items-center justify-center">
            {appliedCount}
          </Badge>
        )}
      </Button>

      {open && (
        <Card className="absolute left-0 top-10 z-50 w-72 shadow-lg" dir="rtl">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">خيارات التصفية</CardTitle>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {type === "meetings" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الحالة</label>
                  <Select value={criteria.status as string ?? ""} onValueChange={v => set("status", v || undefined)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      <SelectItem value="scheduled">مجدول</SelectItem>
                      <SelectItem value="in_progress">جارٍ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="postponed">مؤجل</SelectItem>
                      <SelectItem value="cancelled">ملغى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الفترة الزمنية</label>
                  <div className="flex gap-1 flex-wrap">
                    {DATE_PRESETS.map(p => (
                      <button key={p.value} onClick={() => handlePreset(p.value)}
                        className="text-xs px-2 py-1 rounded border hover:bg-muted">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الرئيس</label>
                  <Select
                    value={criteria.chairpersonId ? String(criteria.chairpersonId) : ""}
                    onValueChange={v => set("chairpersonId", v ? parseInt(v, 10) : undefined)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">عدد الحضور</label>
                  <Select
                    value={criteria.attendeeMin !== undefined ? `${criteria.attendeeMin}-${criteria.attendeeMax ?? ""}` : ""}
                    onValueChange={v => {
                      if (!v) { set("attendeeMin", undefined); set("attendeeMax", undefined); return; }
                      const [min, max] = v.split("-").map(Number);
                      onCriteriaChange({ ...criteria, attendeeMin: min, attendeeMax: isNaN(max) ? undefined : max });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      <SelectItem value="0-5">0 – 5</SelectItem>
                      <SelectItem value="5-10">5 – 10</SelectItem>
                      <SelectItem value="10-">أكثر من 10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {type === "tasks" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الحالة</label>
                  <Select value={criteria.status as string ?? ""} onValueChange={v => set("status", v || undefined)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      <SelectItem value="open">مفتوحة</SelectItem>
                      <SelectItem value="in_progress">جارية</SelectItem>
                      <SelectItem value="done">مكتملة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">الأولوية</label>
                  <Select value={criteria.priority as string ?? ""} onValueChange={v => set("priority", v || undefined)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="medium">متوسطة</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">المسؤول</label>
                  <Select value={criteria.assigneeId ? String(criteria.assigneeId) : ""} onValueChange={v => set("assigneeId", v ? parseInt(v, 10) : undefined)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الكل" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الكل</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { onApply(); setOpen(false); }}>
                تطبيق
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { onClear(); setOpen(false); }}>
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
