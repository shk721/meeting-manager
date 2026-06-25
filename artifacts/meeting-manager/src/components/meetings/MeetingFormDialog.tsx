import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateMeeting, useUpdateMeeting, useGetUsers, useGetCommittees,
  getGetMeetingsQueryKey, getGetMeetingQueryKey,
} from "@workspace/api-client-react";
import type { Meeting, MeetingDetail } from "@workspace/api-client-react";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { meetingTemplates } from "@/lib/meeting-templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | MeetingDetail;
}

interface FormValues {
  title: string;
  date: string;
  time: string;
  status: string;
  location: string;
  project: string;
  team: string;
  objectives: string;
  chairpersonId: string;
  committeeId: string;
  recurringType: string;
}

interface GuestEntry {
  userId: number;
  fullName: string;
  forAgendaItem: string;
}

export function MeetingFormDialog({ open, onOpenChange, meeting }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users = [] } = useGetUsers();
  const { data: committees = [] } = useGetCommittees();

  const [attendeeIds, setAttendeeIds] = useState<number[]>([]);
  const [guestAttendees, setGuestAttendees] = useState<GuestEntry[]>([]);
  const [agendaItems, setAgendaItems] = useState<string[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [newGuestUserId, setNewGuestUserId] = useState("");
  const [newGuestAgendaItem, setNewGuestAgendaItem] = useState("");

  const isEdit = !!meeting;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: "", date: "", time: "", status: "scheduled",
      location: "", project: "", team: "", objectives: "",
      chairpersonId: "", committeeId: "", recurringType: "none",
    },
  });

  const selectedCommitteeId = watch("committeeId");

  useEffect(() => {
    if (open && meeting) {
      const detail = meeting as MeetingDetail;
      reset({
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        status: meeting.status,
        location: meeting.location ?? "",
        project: meeting.project ?? "",
        team: meeting.team ?? "",
        objectives: detail.objectives ?? "",
        chairpersonId: meeting.chairperson?.id?.toString() ?? "",
        committeeId: (meeting as any).committeeId?.toString() ?? "",
        recurringType: (meeting as any).recurringType ?? "none",
      });
      setAgendaItems(detail.agendaItems ?? []);
      const attendees = detail.attendees ?? [];
      setAttendeeIds(
        attendees
          .filter((a) => (a as any).attendeeType !== "guest")
          .map((a) => a.id)
      );
      setGuestAttendees(
        attendees
          .filter((a) => (a as any).attendeeType === "guest")
          .map((a) => ({
            userId: a.id,
            fullName: a.fullName,
            forAgendaItem: (a as any).forAgendaItem ?? "",
          }))
      );
    } else if (open && !meeting) {
      reset({
        title: "", date: "", time: "", status: "scheduled",
        location: "", project: "", team: "", objectives: "",
        chairpersonId: "", committeeId: "", recurringType: "none",
      });
      setAgendaItems([]);
      setAttendeeIds([]);
      setGuestAttendees([]);
    }
  }, [open, meeting, reset]);

  const createMutation = useCreateMeeting();
  const updateMutation = useUpdateMeeting();

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        title: values.title,
        date: values.date,
        time: values.time,
        status: values.status,
        location: values.location || undefined,
        project: values.project || undefined,
        team: values.team || undefined,
        objectives: values.objectives || undefined,
        chairpersonId: values.chairpersonId ? parseInt(values.chairpersonId) : undefined,
        committeeId: values.committeeId ? parseInt(values.committeeId) : null,
        recurringType: values.recurringType || "none",
        attendeeIds,
        guestAttendees: guestAttendees.map((g) => ({
          userId: g.userId,
          forAgendaItem: g.forAgendaItem || undefined,
        })),
        agendaItems,
      };

      if (isEdit && meeting) {
        await updateMutation.mutateAsync({ id: meeting.id, data: payload });
        queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meeting.id) });
        toast({ title: "تم تحديث الاجتماع بنجاح" });
      } else {
        await createMutation.mutateAsync({ data: payload });
        toast({ title: "تم إنشاء الاجتماع بنجاح" });
      }
      queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey() });
      onOpenChange(false);
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const applyTemplate = (key: string) => {
    const tpl = meetingTemplates[key];
    if (!tpl) return;
    setAgendaItems(tpl.agendaItems);
    setValue("objectives", tpl.objectives);
  };

  const addAgendaItem = () => {
    const trimmed = newAgendaItem.trim();
    if (!trimmed) return;
    setAgendaItems((prev) => [...prev, trimmed]);
    setNewAgendaItem("");
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveAgendaItem = (index: number, direction: "up" | "down") => {
    setAgendaItems((prev) => {
      const arr = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const toggleAttendee = (id: number) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addGuest = () => {
    if (!newGuestUserId) return;
    const uid = parseInt(newGuestUserId);
    if (guestAttendees.some((g) => g.userId === uid)) return;
    const userObj = users.find((u) => u.id === uid);
    if (!userObj) return;
    setGuestAttendees((prev) => [...prev, {
      userId: uid,
      fullName: userObj.fullName,
      forAgendaItem: newGuestAgendaItem,
    }]);
    setNewGuestUserId("");
    setNewGuestAgendaItem("");
  };

  const removeGuest = (userId: number) => {
    setGuestAttendees((prev) => prev.filter((g) => g.userId !== userId));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Users already added as regular attendees or guests
  const usedUserIds = new Set([...attendeeIds, ...guestAttendees.map((g) => g.userId)]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الاجتماع" : "إنشاء اجتماع جديد"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pl-1">
          <form id="meeting-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">

            {/* Template selector — only on create */}
            {!isEdit && (
              <div className="space-y-1">
                <Label>قالب الاجتماع (اختياري)</Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالباً لملء الأجندة تلقائياً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(meetingTemplates).map(([key, tpl]) => (
                      <SelectItem key={key} value={key}>{tpl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title">عنوان الاجتماع *</Label>
              <Input id="title" {...register("title", { required: true })} placeholder="عنوان الاجتماع" />
              {errors.title && <p className="text-xs text-destructive">الحقل مطلوب</p>}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">التاريخ *</Label>
                <Input id="date" type="date" {...register("date", { required: true })} />
                {errors.date && <p className="text-xs text-destructive">الحقل مطلوب</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">الوقت *</Label>
                <Input id="time" type="time" {...register("time", { required: true })} />
                {errors.time && <p className="text-xs text-destructive">الحقل مطلوب</p>}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select
                defaultValue={meeting?.status ?? "scheduled"}
                onValueChange={(v) => setValue("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="in_progress">جارٍ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="postponed">مؤجل</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Committee & Recurring */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>اللجنة / الفريق</Label>
                <Select
                  defaultValue={(meeting as any)?.committeeId?.toString() ?? "none"}
                  onValueChange={(v) => setValue("committeeId", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر لجنة (اختياري)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون لجنة —</SelectItem>
                    {committees.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCommitteeId && selectedCommitteeId !== "none" && (
                  <p className="text-xs text-muted-foreground">سيُضاف أعضاء اللجنة تلقائياً</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>تكرار الاجتماع</Label>
                <Select
                  defaultValue={(meeting as any)?.recurringType ?? "none"}
                  onValueChange={(v) => setValue("recurringType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">غير متكرر</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="biweekly">كل أسبوعين</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location, Project, Team */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="location">الموقع</Label>
                <Input id="location" {...register("location")} placeholder="قاعة الاجتماعات / رابط زووم..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project">المشروع</Label>
                <Input id="project" {...register("project")} placeholder="اسم المشروع" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="team">الفريق / القسم</Label>
              <Input id="team" {...register("team")} placeholder="اسم الفريق أو القسم" />
            </div>

            {/* Chairperson */}
            <div className="space-y-1">
              <Label>رئيس الاجتماع</Label>
              <Select
                defaultValue={meeting?.chairperson?.id?.toString() ?? "none"}
                onValueChange={(v) => setValue("chairpersonId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر رئيس الاجتماع..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— لا يوجد —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Objectives */}
            <div className="space-y-1">
              <Label htmlFor="objectives">الأهداف</Label>
              <Textarea id="objectives" {...register("objectives")} placeholder="أهداف الاجتماع..." rows={2} />
            </div>

            {/* Attendees (permanent members) */}
            <div className="space-y-2">
              <Label>المشاركون الدائمون</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`attendee-${u.id}`}
                      checked={attendeeIds.includes(u.id)}
                      onChange={() => toggleAttendee(u.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`attendee-${u.id}`} className="text-sm cursor-pointer">
                      {u.fullName}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Attendees */}
            <div className="space-y-2">
              <Label>ضيوف الاجتماع</Label>
              {guestAttendees.length > 0 && (
                <div className="space-y-1">
                  {guestAttendees.map((g) => (
                    <div key={g.userId} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                      <Badge variant="outline" className="text-xs">ضيف</Badge>
                      <span className="text-sm flex-1">{g.fullName}</span>
                      {g.forAgendaItem && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{g.forAgendaItem}</span>
                      )}
                      <Button
                        type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeGuest(g.userId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Select value={newGuestUserId} onValueChange={setNewGuestUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر ضيفاً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u) => !usedUserIds.has(u.id))
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Select value={newGuestAgendaItem} onValueChange={setNewGuestAgendaItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="بند الأجندة (اختياري)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— بدون بند محدد —</SelectItem>
                      {agendaItems.map((item, i) => (
                        <SelectItem key={i} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={addGuest} disabled={!newGuestUserId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Agenda Items */}
            <div className="space-y-2">
              <Label>جدول الأعمال</Label>
              {agendaItems.length > 0 && (
                <ol className="space-y-1">
                  {agendaItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                      <span className="text-muted-foreground text-sm w-5 shrink-0">{i + 1}.</span>
                      <span className="flex-1 text-sm">{item}</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveAgendaItem(i, "up")}
                          disabled={i === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveAgendaItem(i, "down")}
                          disabled={i === agendaItems.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeAgendaItem(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex gap-2">
                <Input
                  value={newAgendaItem}
                  onChange={(e) => setNewAgendaItem(e.target.value)}
                  placeholder="أضف بند جديد لجدول الأعمال..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addAgendaItem(); }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addAgendaItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </form>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button type="submit" form="meeting-form" disabled={isPending}>
            {isPending && <Spinner className="ml-2 h-4 w-4" />}
            {isEdit ? "حفظ التعديلات" : "إنشاء الاجتماع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
