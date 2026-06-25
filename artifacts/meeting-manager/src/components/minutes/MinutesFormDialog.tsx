import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateMeetingMinutes, useApproveMinutes,
  getGetMeetingMinutesQueryKey, getGetPendingMinutesQueryKey,
} from "@workspace/api-client-react";
import type { Minutes } from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: number;
  minutes?: Minutes | null;
}

interface FormValues {
  executiveSummary: string;
  discussionItems: string;
  risks: string;
  previousFollowUp: string;
}

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
};

export function MinutesFormDialog({ open, onOpenChange, meetingId, minutes }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const canApprove = user?.role === "admin" || user?.role === "manager";

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      executiveSummary: "", discussionItems: "", risks: "", previousFollowUp: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        executiveSummary: minutes?.executiveSummary ?? "",
        discussionItems: minutes?.discussionItems ?? "",
        risks: minutes?.risks ?? "",
        previousFollowUp: minutes?.previousFollowUp ?? "",
      });
    }
  }, [open, minutes, reset]);

  const saveMutation = useCreateMeetingMinutes();
  const approveMutation = useApproveMinutes();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetMeetingMinutesQueryKey(meetingId) });
    queryClient.invalidateQueries({ queryKey: getGetPendingMinutesQueryKey() });
  };

  const onSubmit = async (values: FormValues, status = "draft") => {
    try {
      await saveMutation.mutateAsync({
        id: meetingId,
        data: {
          executiveSummary: values.executiveSummary || undefined,
          discussionItems: values.discussionItems || undefined,
          risks: values.risks || undefined,
          previousFollowUp: values.previousFollowUp || undefined,
          status,
        },
      });
      invalidate();
      toast({ title: status === "pending_approval" ? "أُرسل المحضر للاعتماد" : "تم حفظ المحضر" });
      onOpenChange(false);
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    if (!minutes) return;
    try {
      await approveMutation.mutateAsync({ id: minutes.id });
      invalidate();
      toast({ title: "تم اعتماد المحضر بنجاح" });
      onOpenChange(false);
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const isPending = saveMutation.isPending || approveMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {minutes ? "تعديل المحضر" : "إنشاء محضر الاجتماع"}
            </DialogTitle>
            {minutes && (
              <Badge
                variant="secondary"
                className={
                  minutes.status === "approved"
                    ? "bg-green-100 text-green-800"
                    : minutes.status === "pending_approval"
                    ? "bg-yellow-100 text-yellow-800"
                    : ""
                }
              >
                {statusLabels[minutes.status] ?? minutes.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form id="minutes-form" onSubmit={handleSubmit((v) => onSubmit(v, "draft"))} className="space-y-4">

          <div className="space-y-1">
            <Label htmlFor="execSummary">الملخص التنفيذي</Label>
            <Textarea
              id="execSummary"
              {...register("executiveSummary")}
              placeholder="ملخص موجز لأبرز ما جرى في الاجتماع..."
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="discussion">نقاط النقاش</Label>
            <Textarea
              id="discussion"
              {...register("discussionItems")}
              placeholder="المواضيع التي نوقشت في الاجتماع..."
              rows={4}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="risks">المخاطر المُحددة</Label>
            <Textarea
              id="risks"
              {...register("risks")}
              placeholder="المخاطر أو التحديات التي تم رصدها..."
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="followup">متابعة الاجتماع السابق</Label>
            <Textarea
              id="followup"
              {...register("previousFollowUp")}
              placeholder="متابعة بنود من الاجتماع السابق..."
              rows={2}
            />
          </div>

        </form>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            variant="outline"
            type="submit"
            form="minutes-form"
            disabled={isPending}
          >
            {isPending && <Spinner className="ml-2 h-4 w-4" />}
            حفظ كمسودة
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSubmit((v) => onSubmit(v, "pending_approval"))}
            disabled={isPending}
          >
            إرسال للاعتماد
          </Button>
          {canApprove && minutes && minutes.status !== "approved" && (
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
            >
              {isPending && <Spinner className="ml-2 h-4 w-4" />}
              اعتماد المحضر
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
