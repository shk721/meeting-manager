import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTask, useAddTaskComment, useUpdateTask,
  getGetTaskQueryKey, getGetTasksQueryKey,
} from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MessageSquare, History, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskFormDialog } from "./TaskFormDialog";

interface Props {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const fieldLabels: Record<string, string> = {
  status: "الحالة",
  priority: "الأولوية",
  completionPercent: "نسبة الإنجاز",
  assigneeId: "المسؤول",
  dueDate: "تاريخ الاستحقاق",
};

export function TaskDetailSheet({ taskId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const { data: task, isLoading } = useGetTask(taskId ?? 0, {
    query: {
      enabled: open && !!taskId,
      queryKey: getGetTaskQueryKey(taskId ?? 0),
    },
  });

  const addCommentMutation = useAddTaskComment();
  const updateMutation = useUpdateTask();

  const { register, handleSubmit, reset } = useForm<{ content: string }>({
    defaultValues: { content: "" },
  });

  const onAddComment = async ({ content }: { content: string }) => {
    if (!taskId || !content.trim()) return;
    try {
      await addCommentMutation.mutateAsync({ id: taskId, data: { content } });
      queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      reset();
    } catch {
      toast({ title: "فشل إضافة التعليق", variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!taskId) return;
    try {
      await updateMutation.mutateAsync({ id: taskId, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      toast({ title: "تم تحديث الحالة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            {isLoading || !task ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-lg leading-snug">{task.title}</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setEditOpen(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-7 w-auto text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">مفتوح</SelectItem>
                      <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                      <SelectItem value="on_hold">معلق</SelectItem>
                      <SelectItem value="cancelled">ملغى</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant={(priorityMap[task.priority]?.variant as any) || "default"}>
                    {priorityMap[task.priority]?.label}
                  </Badge>
                  {task.assignee && (
                    <span className="text-xs text-muted-foreground">{task.assignee.fullName}</span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.dueDate).toLocaleDateString("ar-SA")}
                    </span>
                  )}
                </div>
                {typeof task.completionPercent === "number" && (
                  <div className="flex items-center gap-2">
                    <Progress value={task.completionPercent} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{task.completionPercent}%</span>
                  </div>
                )}
                {task.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                )}
              </div>
            )}
          </SheetHeader>

          {task && (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">

                {/* Comments */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4" />
                    التعليقات ({task.comments.length})
                  </div>

                  {task.comments.length > 0 ? (
                    <div className="space-y-3">
                      {task.comments.map((c) => (
                        <div key={c.id} className="rounded-md bg-muted/50 p-3 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{c.author?.fullName ?? "مجهول"}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                            </span>
                          </div>
                          <p className="text-sm">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد تعليقات بعد.</p>
                  )}

                  <form onSubmit={handleSubmit(onAddComment)} className="flex gap-2">
                    <Textarea
                      {...register("content", { required: true })}
                      placeholder="أضف تعليقاً..."
                      rows={2}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="self-end"
                      disabled={addCommentMutation.isPending}
                    >
                      {addCommentMutation.isPending ? <Spinner className="h-3 w-3" /> : "إرسال"}
                    </Button>
                  </form>
                </div>

                <Separator />

                {/* Changelog */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4" />
                    سجل التغييرات ({task.changelog.length})
                  </div>

                  {task.changelog.length > 0 ? (
                    <div className="space-y-2">
                      {task.changelog.map((entry) => (
                        <div key={entry.id} className="text-xs text-muted-foreground flex gap-2 items-start">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">
                              {entry.changedBy?.fullName ?? "مجهول"}
                            </span>
                            {" غيّر "}
                            <span className="font-medium text-foreground">
                              {fieldLabels[entry.field] ?? entry.field}
                            </span>
                            {entry.oldValue != null && (
                              <> من <span className="line-through">{entry.oldValue}</span></>
                            )}
                            {entry.newValue != null && (
                              <> إلى <span className="font-medium text-foreground">{entry.newValue}</span></>
                            )}
                            {" — "}
                            {new Date(entry.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لا توجد تغييرات مسجلة.</p>
                  )}
                </div>

              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {task && (
        <TaskFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          task={task}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId ?? 0) });
          }}
        />
      )}
    </>
  );
}
