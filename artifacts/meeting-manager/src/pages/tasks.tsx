import { useState } from "react";
import { useGetTasks, useGetMeetings, useGetUsers, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  open: { label: "مفتوح", variant: "default" },
  in_progress: { label: "قيد التنفيذ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  on_hold: { label: "معلق", variant: "secondary" },
};

const priorityMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  low: { label: "منخفض", variant: "secondary" },
  medium: { label: "متوسط", variant: "default" },
  high: { label: "عالٍ", variant: "warning" },
  critical: { label: "حرج", variant: "destructive" },
};

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

export default function Tasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useGetTasks({});
  const { data: meetings } = useGetMeetings({});
  const { data: users } = useGetUsers();

  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [search, setSearch] = useState("");
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    dueDate: "",
    assigneeId: "",
    meetingId: "",
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

  const filtered = (tasks ?? []).filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المهام</h1>
        <Button onClick={() => { setForm({ title: "", description: "", status: "open", priority: "medium", dueDate: "", assigneeId: "", meetingId: "" }); setApiError(""); setOpen(true); }}>
          <Plus className="h-4 w-4 ml-2" />
          مهمة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <CardTitle>قائمة المهام</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="pr-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المهمة</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>نسبة الإنجاز</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task: any) => (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.assignee?.fullName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={(priorityMap[task.priority]?.variant as any) || "default"}>
                        {priorityMap[task.priority]?.label || task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusMap[task.status]?.variant as any) || "default"}>
                        {statusMap[task.status]?.label || task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-SA") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.completionPercent || 0} className="w-[60px]" />
                        <span className="text-xs text-muted-foreground">{task.completionPercent || 0}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">لا توجد مهام لعرضها.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إضافة مهمة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>عنوان المهمة *</Label>
              <Input placeholder="أدخل عنوان المهمة" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea placeholder="اختياري" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
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
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
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
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>المسؤول</Label>
                <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v }))}>
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
              <Select value={form.meetingId} onValueChange={v => setForm(f => ({ ...f, meetingId: v }))}>
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
            <Button onClick={handleCreate} disabled={isPending || !form.title}>
              {isPending ? <Spinner className="h-4 w-4 ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
