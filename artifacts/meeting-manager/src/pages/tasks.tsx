import { useState } from "react";
import { useGetTasks, useGetMeetings, useGetUsers, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, CheckSquare, List, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Design tokens ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  open:        { bg: "#e8f2ea", text: "#1f7a4d", label: "مفتوح" },
  in_progress: { bg: "#fbf1dd", text: "#a97918", label: "قيد التنفيذ" },
  on_hold:     { bg: "#eef1f4", text: "#5a6675", label: "معلّق" },
  overdue:     { bg: "#fbeeea", text: "#c0492f", label: "متأخر" },
  completed:   { bg: "#e3efe8", text: "#0f7a52", label: "مكتمل" },
  cancelled:   { bg: "#eef2ec", text: "#5a675a", label: "ملغى" },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  low:      { bg: "#f0f3ee", text: "#8a978a", border: "#a3b0a3", label: "منخفض" },
  medium:   { bg: "#eef2ec", text: "#5a675a", border: "#7c8a99", label: "متوسط" },
  high:     { bg: "#fbf1dd", text: "#a97918", border: "#d6b23e", label: "عالٍ" },
  critical: { bg: "#fbeeea", text: "#c0492f", border: "#c0492f", label: "حرج" },
};

const KANBAN_COLUMNS = [
  { key: "open",        label: "مفتوح",       dot: "#1f7a4d" },
  { key: "in_progress", label: "قيد التنفيذ",  dot: "#a97918" },
  { key: "on_hold",     label: "معلّق",        dot: "#7c8a99" },
  { key: "overdue",     label: "متأخر",        dot: "#c0492f" },
  { key: "completed",   label: "مكتمل",        dot: "#0f7a52" },
];

async function apiFetch(path: string, method: string, body?: any) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? JSON.stringify(err) ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── StatusChip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.open;
  return (
    <span
      className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const p = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.medium;
  return (
    <span
      className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: p.bg, color: p.text }}
    >
      {p.label}
    </span>
  );
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({
  task,
  onDragStart,
}: {
  task: any;
  onDragStart: (id: number) => void;
}) {
  const p = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium;
  const s = STATUS_STYLE[task.status] ?? STATUS_STYLE.open;
  const isDone = task.status === "completed";
  const isOverdue = task.status === "overdue";
  const barColor = isDone ? "#0f7a52" : isOverdue ? "#c0492f" : "#1f7a4d";
  const pct = task.completionPercent ?? 0;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing select-none"
      style={{
        background: "#fff",
        border: "1px solid #e6ece4",
        borderRight: `3px solid ${p.border}`,
      }}
    >
      {/* source chip */}
      {task.meetingId && (
        <span
          className="inline-block text-xs px-1.5 py-0.5 rounded mb-1.5"
          style={{ background: "#eef2ec", color: "#5a675a", border: "1px solid #e6ece4" }}
        >
          اجتماع
        </span>
      )}
      {task.componentId && (
        <span
          className="inline-block text-xs px-1.5 py-0.5 rounded mb-1.5"
          style={{ background: "#e3efe8", color: "#0f7a52", border: "1px solid #c3ddd0" }}
        >
          تحول رقمي
        </span>
      )}

      <p
        className="text-sm font-medium mb-2 leading-snug"
        style={{
          color: isDone ? "#8a978a" : "#1c261c",
          textDecoration: isDone ? "line-through" : "none",
        }}
      >
        {task.title}
      </p>

      {/* progress bar */}
      <div className="h-1 rounded-full mb-2" style={{ background: "#eef2ec" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-1">
        <PriorityChip priority={task.priority} />
        {task.dueDate && (
          <span className="text-xs" style={{ color: "#8a978a" }}>
            {new Date(task.dueDate).toLocaleDateString("ar-SA")}
          </span>
        )}
        {task.assignee?.fullName && (
          <div
            className="flex items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0"
            style={{ width: 24, height: 24, background: "#1f7a4d", fontSize: 10 }}
          >
            {task.assignee.fullName.substring(0, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────
function KanbanBoard({ tasks, onStatusChange }: { tasks: any[]; onStatusChange: (id: number, status: string) => void }) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDrop = (colKey: string) => {
    if (draggedId == null) return;
    onStatusChange(draggedId, colKey);
    setDraggedId(null);
    setDragOverCol(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {KANBAN_COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        const isOver = dragOverCol === col.key;
        return (
          <div
            key={col.key}
            className="flex flex-col flex-shrink-0 rounded-2xl"
            style={{ minWidth: 224, background: "#eef2ec" }}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.key)}
          >
            {/* column header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl"
              style={{
                background: isOver ? "#e8f2ea" : "#eef2ec",
                transition: "background 0.15s",
              }}
            >
              <span
                className="rounded-full flex-shrink-0"
                style={{ width: 8, height: 8, background: col.dot }}
              />
              <span className="text-sm font-semibold" style={{ color: "#1c261c" }}>{col.label}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold mr-auto"
                style={{ background: "#fff", color: "#5a675a" }}
              >
                {colTasks.length}
              </span>
            </div>

            {/* cards */}
            <div className="flex flex-col gap-2 p-2 flex-1">
              {colTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onDragStart={setDraggedId} />
              ))}
              {colTasks.length === 0 && (
                <div
                  className="flex-1 rounded-xl border-2 border-dashed flex items-center justify-center min-h-[80px]"
                  style={{ borderColor: isOver ? "#1f7a4d" : "#d7ded1", color: "#a3b0a3" }}
                >
                  <span className="text-xs">أفلت هنا</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useGetTasks({});
  const { data: meetings } = useGetMeetings({});
  const { data: users } = useGetUsers();

  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState("");
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", status: "open", priority: "medium",
    dueDate: "", assigneeId: "", meetingId: "",
  });

  const handleCreate = async () => {
    if (!form.title) return;
    setApiError("");
    setIsPending(true);
    try {
      await apiFetch("/api/tasks", "POST", {
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        assigneeId: form.assigneeId ? parseInt(form.assigneeId) : undefined,
        meetingId: form.meetingId ? parseInt(form.meetingId) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
      setOpen(false);
      setForm({ title: "", description: "", status: "open", priority: "medium", dueDate: "", assigneeId: "", meetingId: "" });
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    const extra: any = {};
    if (newStatus === "completed") extra.completionPercent = 100;
    try {
      await apiFetch(`/api/tasks/${taskId}`, "PATCH", { status: newStatus, ...extra });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
    } catch {}
  };

  const filtered = (tasks ?? []).filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm({ title: "", description: "", status: "open", priority: "medium", dueDate: "", assigneeId: "", meetingId: "" });
    setApiError("");
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1c261c" }}>المهام</h1>
          <p className="text-sm mt-0.5" style={{ color: "#8a978a" }}>تتبع وإدارة مهام الفريق</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: "1px solid #e6ece4", background: "#f4f6f2" }}
          >
            {[
              { key: "list", icon: List, label: "قائمة" },
              { key: "kanban", icon: LayoutGrid, label: "كانبان" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTaskView(key as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={taskView === key ? {
                  background: "#fff", color: "#1f7a4d", boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                } : { color: "#5a675a" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={resetForm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: "#1f7a4d" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#155c39")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1f7a4d")}
          >
            <Plus className="h-4 w-4" />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute right-3 top-2.5 h-4 w-4" style={{ color: "#8a978a" }} />
        <Input
          placeholder="بحث في المهام..."
          className="pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
      ) : taskView === "kanban" ? (
        <KanbanBoard tasks={filtered} onStatusChange={handleStatusChange} />
      ) : (
        /* ── List view ── */
        <Card>
          <CardContent className="pt-4">
            {filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow style={{ background: "#f5f8f4" }}>
                    <TableHead style={{ color: "#5a675a" }}>المهمة</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>المصدر</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>المسؤول</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>الأولوية</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>الحالة</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>الاستحقاق</TableHead>
                    <TableHead style={{ color: "#5a675a" }}>الإنجاز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task: any) => (
                    <TableRow
                      key={task.id}
                      className="hover:bg-muted/30"
                      style={{ borderBottom: "1px solid #f0f3ee" }}
                    >
                      <TableCell className="font-medium" style={{ color: "#1c261c" }}>
                        {task.title}
                      </TableCell>
                      <TableCell>
                        {task.componentId ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ background: "#e3efe8", color: "#0f7a52", border: "1px solid #c3ddd0" }}>تحول رقمي</span>
                        ) : task.meetingId ? (
                          <span className="inline-block text-xs px-2 py-0.5 rounded" style={{ background: "#eef2ec", color: "#5a675a", border: "1px solid #e6ece4" }}>اجتماع</span>
                        ) : (
                          <span style={{ color: "#a3b0a3", fontSize: 12 }}>-</span>
                        )}
                      </TableCell>
                      <TableCell style={{ color: "#5a675a" }}>{task.assignee?.fullName ?? "-"}</TableCell>
                      <TableCell><PriorityChip priority={task.priority} /></TableCell>
                      <TableCell><StatusChip status={task.status} /></TableCell>
                      <TableCell style={{ color: "#5a675a", fontSize: 13 }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-SA") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full" style={{ background: "#eef2ec" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${task.completionPercent ?? 0}%`, background: "#1f7a4d" }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: "#8a978a" }}>{task.completionPercent ?? 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 64, height: 64, background: "#eef2ec" }}
                >
                  <CheckSquare className="h-8 w-8" style={{ color: "#8a978a" }} />
                </div>
                <p className="font-medium" style={{ color: "#8a978a" }}>
                  {search ? "لا توجد نتائج مطابقة للبحث" : "لا توجد مهام لعرضها"}
                </p>
                {!search && (
                  <button
                    onClick={resetForm}
                    className="text-sm font-semibold px-4 py-1.5 rounded-xl"
                    style={{ background: "#e8f2ea", color: "#1f7a4d" }}
                  >
                    <Plus className="inline h-3.5 w-3.5 ml-1" />
                    إضافة أول مهمة
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New task dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          {/* Gold-green top strip */}
          <div style={{ height: 5, background: "linear-gradient(90deg,#d6b23e,#1f7a4d)", margin: "-24px -24px 16px", borderRadius: "14px 14px 0 0" }} />
          <DialogHeader><DialogTitle>مهمة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>عنوان المهمة *</Label>
              <Input placeholder="أدخل عنوان المهمة" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea placeholder="اختياري" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">عالٍ</SelectItem>
                    <SelectItem value="critical">حرج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="on_hold">معلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>تاريخ الاستحقاق</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>المسؤول</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {((users ?? []) as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>الاجتماع المرتبط</Label>
              <Select value={form.meetingId} onValueChange={(v) => setForm((f) => ({ ...f, meetingId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                <SelectContent>
                  {((meetings ?? []) as any[]).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {apiError && <p className="text-sm text-red-600 px-1">{apiError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !form.title}
              style={{ background: "#1f7a4d" }}
            >
              {isPending && <Spinner className="h-4 w-4 ml-2" />}
              إضافة المهمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
