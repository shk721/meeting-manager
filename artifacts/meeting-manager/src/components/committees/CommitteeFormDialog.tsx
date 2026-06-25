import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCommittee, useUpdateCommittee, useGetUsers,
  getGetCommitteesQueryKey, getGetCommitteeQueryKey,
} from "@workspace/api-client-react";
import type { Committee } from "@workspace/api-client-react";
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
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  committee?: Committee;
}

interface FormValues {
  name: string;
  type: string;
  description: string;
  chairpersonId: string;
  secretaryId: string;
}

export function CommitteeFormDialog({ open, onOpenChange, committee }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users = [] } = useGetUsers();

  const isEdit = !!committee;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: "", type: "committee", description: "", chairpersonId: "", secretaryId: "" },
  });

  useEffect(() => {
    if (open && committee) {
      reset({
        name: committee.name,
        type: committee.type,
        description: committee.description ?? "",
        chairpersonId: committee.chairperson?.id?.toString() ?? "",
        secretaryId: committee.secretary?.id?.toString() ?? "",
      });
    } else if (open && !committee) {
      reset({ name: "", type: "committee", description: "", chairpersonId: "", secretaryId: "" });
    }
  }, [open, committee, reset]);

  const createMutation = useCreateCommittee();
  const updateMutation = useUpdateCommittee();

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        name: values.name,
        type: values.type || undefined,
        description: values.description || undefined,
        chairpersonId: values.chairpersonId ? parseInt(values.chairpersonId) : null,
        secretaryId: values.secretaryId ? parseInt(values.secretaryId) : null,
      };

      if (isEdit && committee) {
        await updateMutation.mutateAsync({ id: committee.id, data: payload });
        queryClient.invalidateQueries({ queryKey: getGetCommitteeQueryKey(committee.id) });
        toast({ title: "تم تحديث اللجنة بنجاح" });
      } else {
        await createMutation.mutateAsync({ data: { ...payload, name: values.name } });
        toast({ title: "تم إنشاء اللجنة بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getGetCommitteesQueryKey() });
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
          <DialogTitle>{isEdit ? "تعديل اللجنة" : "إنشاء لجنة جديدة"}</DialogTitle>
        </DialogHeader>

        <form id="committee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">اسم اللجنة *</Label>
            <Input id="name" {...register("name", { required: true })} placeholder="اسم اللجنة أو الفريق" />
            {errors.name && <p className="text-xs text-destructive">الحقل مطلوب</p>}
          </div>

          <div className="space-y-1">
            <Label>نوع اللجنة</Label>
            <Select
              defaultValue={committee?.type ?? "committee"}
              onValueChange={(v) => setValue("type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="committee">لجنة</SelectItem>
                <SelectItem value="team">فريق عمل</SelectItem>
                <SelectItem value="board">مجلس إدارة</SelectItem>
                <SelectItem value="working_group">مجموعة عمل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">الوصف</Label>
            <Textarea id="description" {...register("description")} placeholder="وصف مختصر للجنة..." rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>رئيس اللجنة</Label>
              <Select
                defaultValue={committee?.chairperson?.id?.toString() ?? "none"}
                onValueChange={(v) => setValue("chairpersonId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر رئيس اللجنة..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا يوجد —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>السكرتير</Label>
              <Select
                defaultValue={committee?.secretary?.id?.toString() ?? "none"}
                onValueChange={(v) => setValue("secretaryId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر السكرتير..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا يوجد —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="committee-form" disabled={isPending}>
            {isPending && <Spinner className="ml-2 h-4 w-4" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء اللجنة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
