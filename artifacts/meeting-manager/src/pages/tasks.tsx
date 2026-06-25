import { useState } from "react";
import { useGetTasks, useGetUsers } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { useDebounce } from "@/hooks/use-debounce";

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

export default function Tasks() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");

  const debouncedSearch = useDebounce(search, 300);
  const { data: users = [] } = useGetUsers();

  const { data: tasks, isLoading } = useGetTasks({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    assigneeId: assigneeFilter ? parseInt(assigneeFilter) : undefined,
  });

  const openDetail = (id: number) => {
    setSelectedTaskId(id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المهام</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          مهمة جديدة
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle>قائمة المهام</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">كل الحالات</SelectItem>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="on_hold">معلق</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="كل الأولويات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">كل الأولويات</SelectItem>
                  <SelectItem value="low">منخفض</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="high">عالٍ</SelectItem>
                  <SelectItem value="critical">حرج</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="كل المسؤولين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">كل المسؤولين</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(statusFilter || priorityFilter || assigneeFilter || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setStatusFilter("");
                    setPriorityFilter("");
                    setAssigneeFilter("");
                    setSearch("");
                  }}
                >
                  إزالة الفلاتر
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : tasks && tasks.length > 0 ? (
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
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(task.id)}
                  >
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
            <div className="text-center p-8 text-muted-foreground">
              {(search || statusFilter || priorityFilter || assigneeFilter)
                ? "لا توجد نتائج مطابقة."
                : "لا توجد مهام لعرضها."}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
