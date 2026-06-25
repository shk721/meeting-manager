import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateTask, useUpdateTask, useGetUsers,
  getGetTasksQueryKey,
} from "@workspace/api-client-react";
import type { Task, TaskDetail } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | TaskDetail;
  meetingId?: number;
  onSuccess?: () => void;
}

interface FormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assigneeId: string;
  completionPercent: number;
}

export function TaskFormDialog({ open, onOpenChange, task, meetingId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users = [] } = useGetUsers();

  const isEdit = !!task;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: "", description: "", status: "open", priority: "medium",
      dueDate: "", assigneeId: "", completionPercent: 0,
    },
  });

  const completionPercent = watch("completionPercent");

  useEffect(() => {
    if (open && task) {
      reset({
        title: task.title,
        description: (task as TaskDetail).description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? "",
        assigneeId: task.assignee?.id?.toString() ?? "",
        completionPercent: task.completionPercent ?? 0,
      });
    } else if (open && !task) {
      reset({
        title: "", description: "", status: "open", priority: "medium",
        dueDate: "", assigneeId: "", completionPercent: 0,
      });
    }
  }, [open, task, reset]);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({
          id: task.id,
          data: {
            title: values.title,
            description: values.description || undefined,
            status: values.status,
            priority: values.priority,
            dueDate: values.dueDate || null,
            assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null,
            completionPercent: values.completionPercent,
          },
        });
        toast({ title: "تم تحديث المهمة بنجاح" });
      } else {
        await createMutation.mutateAsync({
          data: {
            title: values.title,
            description: values.description || undefined,
            status: values.status,
            priority: values.priority,
            dueDate: values.dueDate || undefined,
            assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null,
            completionPercent: values.completionPercent,
            meetingId: meetingId ?? null,
          },
        });
        toast({ title: "تم إنشاء المهمة بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      if (meetingId) {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({ meetingId }) });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل المهمة" : "إنشاء مهمة جديدة"}</DialogTitle>
        </DialogHeader>

        <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="space-y-1">
            <Label htmlFor="task-title">عنوان المهمة *</Label>
            <Input id="task-title" {...register("title", { required: true })} placeholder="عنوان المهمة" />
            {errors.title && <p className="text-xs text-destructive">الحقل مطلوب</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-description">الوصف</Label>
            <Textarea id="task-description" {...register("description")} placeholder="وصف المهمة..." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select
                defaultValue={task?.status ?? "open"}
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-1">
              <Label>الأولوية</Label>
              <Select
                defaultValue={task?.priority ?? "medium"}
                onValueChange={(v) => setValue("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفض</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="high">عالٍ</SelectItem>
                  <SelectItem value="critical">حرج</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="task-due">تاريخ الاستحقاق</Label>
              <Input id="task-due" type="date" {...register("dueDate")} />
            </div>

            <div className="space-y-1">
              <Label>المسؤول</Label>
              <Select
                defaultValue={task?.assignee?.id?.toString() ?? ""}
                onValueChange={(v) => setValue("assigneeId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مسؤولاً..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>نسبة الإنجاز: {completionPercent}%</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[completionPercent]}
              onValueChange={([v]) => setValue("completionPercent", v)}
              className="w-full"
            />
          </div>

        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="task-form" disabled={isPending}>
            {isPending && <Spinner className="ml-2 h-4 w-4" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء المهمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
