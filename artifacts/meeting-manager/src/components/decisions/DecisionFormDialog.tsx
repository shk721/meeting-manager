import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateDecision, useUpdateDecision,
  getGetDecisionsQueryKey,
} from "@workspace/api-client-react";
import type { Decision } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: number;
  agendaItems?: string[];
  decision?: Decision;
}

interface FormValues {
  content: string;
  notes: string;
  agendaItem: string;
}

export function DecisionFormDialog({ open, onOpenChange, meetingId, agendaItems = [], decision }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!decision;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { content: "", notes: "", agendaItem: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        content: decision?.content ?? "",
        notes: decision?.notes ?? "",
        agendaItem: decision?.agendaItem ?? "",
      });
    }
  }, [open, decision, reset]);

  const createMutation = useCreateDecision();
  const updateMutation = useUpdateDecision();

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && decision) {
        await updateMutation.mutateAsync({
          id: decision.id,
          data: {
            content: values.content,
            notes: values.notes || undefined,
            agendaItem: values.agendaItem || undefined,
          },
        });
        toast({ title: "تم تحديث القرار" });
      } else {
        await createMutation.mutateAsync({
          data: {
            meetingId,
            content: values.content,
            notes: values.notes || undefined,
            agendaItem: values.agendaItem || undefined,
          },
        });
        toast({ title: "تم إضافة القرار" });
      }
      queryClient.invalidateQueries({ queryKey: getGetDecisionsQueryKey({ meetingId }) });
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
          <DialogTitle>{isEdit ? "تعديل القرار" : "إضافة قرار جديد"}</DialogTitle>
        </DialogHeader>

        <form id="decision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {agendaItems.length > 0 && (
            <div className="space-y-1">
              <Label>بند جدول الأعمال</Label>
              <Select
                defaultValue={decision?.agendaItem ?? ""}
                onValueChange={(v) => setValue("agendaItem", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر بنداً (اختياري)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— بدون بند —</SelectItem>
                  {agendaItems.map((item, i) => (
                    <SelectItem key={i} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="decision-content">محتوى القرار *</Label>
            <Textarea
              id="decision-content"
              {...register("content", { required: true })}
              placeholder="اكتب القرار المتخذ..."
              rows={3}
            />
            {errors.content && <p className="text-xs text-destructive">الحقل مطلوب</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="decision-notes">ملاحظات</Label>
            <Textarea
              id="decision-notes"
              {...register("notes")}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>

        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="decision-form" disabled={isPending}>
            {isPending && <Spinner className="ml-2 h-4 w-4" />}
            {isEdit ? "حفظ التعديلات" : "إضافة القرار"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
