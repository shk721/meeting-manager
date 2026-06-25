import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  useGetMeeting, useGetMeetingMinutes, useGetDecisions, useGetTasks,
  useUpdateMeeting, useDeleteDecision, useApproveMinutes,
  useCreateNextMeeting, useSendMeetingInvitations, useUpdateMeetingAttendance,
  useGetMeetingAttachments, useDeleteMeetingAttachment,
  getGetMeetingQueryKey, getGetMeetingMinutesQueryKey,
  getGetDecisionsQueryKey, getGetTasksQueryKey, getGetMeetingsQueryKey,
  getGetMeetingAttachmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, MapPin, Users, Target, CheckSquare, FileText,
  Briefcase, Plus, Edit2, Trash2, Check, Download, RefreshCw,
  Mail, Paperclip, UserCheck,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MeetingFormDialog } from "@/components/meetings/MeetingFormDialog";
import { MinutesFormDialog } from "@/components/minutes/MinutesFormDialog";
import { DecisionFormDialog } from "@/components/decisions/DecisionFormDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "default" },
  in_progress: { label: "جارٍ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "secondary" },
};

const minutesStatusMap: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
};

const taskStatusMap: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
  on_hold: "معلق",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MeetingDetail({ id }: { id: string }) {
  const meetingId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = user?.role === "admin" || user?.role === "manager";
  const canApprove = canManage;

  const [editMeetingOpen, setEditMeetingOpen] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editDecision, setEditDecision] = useState<any>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });

  const { data: minutes, isLoading: isLoadingMinutes } = useGetMeetingMinutes(meetingId, {
    query: {
      enabled: !!meetingId,
      queryKey: getGetMeetingMinutesQueryKey(meetingId),
      retry: false,
    }
  });

  const { data: decisions, isLoading: isLoadingDecisions } = useGetDecisions({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetDecisionsQueryKey({ meetingId }) }
  });

  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetTasksQueryKey({ meetingId }) }
  });

  const { data: attachments = [], isLoading: isLoadingAttachments } = useGetMeetingAttachments(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingAttachmentsQueryKey(meetingId) }
  });

  const updateMeeting = useUpdateMeeting();
  const deleteDecision = useDeleteDecision();
  const approveMinutes = useApproveMinutes();
  const createNextMeeting = useCreateNextMeeting();
  const sendInvitations = useSendMeetingInvitations();
  const updateAttendance = useUpdateMeetingAttendance();
  const deleteAttachment = useDeleteMeetingAttachment();

  const handleStatusChange = async (status: string) => {
    try {
      await updateMeeting.mutateAsync({ id: meetingId, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meetingId) });
      queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey() });
      toast({ title: "تم تحديث حالة الاجتماع" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDeleteDecision = async (decisionId: number) => {
    try {
      await deleteDecision.mutateAsync({ id: decisionId });
      queryClient.invalidateQueries({ queryKey: getGetDecisionsQueryKey({ meetingId }) });
      toast({ title: "تم حذف القرار" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleApproveMinutes = async () => {
    if (!minutes) return;
    try {
      await approveMinutes.mutateAsync({ id: minutes.id });
      queryClient.invalidateQueries({ queryKey: getGetMeetingMinutesQueryKey(meetingId) });
      toast({ title: "تم اعتماد المحضر" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleCreateNextMeeting = async () => {
    try {
      await createNextMeeting.mutateAsync({ id: meetingId });
      queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey() });
      toast({ title: "تم إنشاء الجلسة التالية بنجاح" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleSendInvitations = async () => {
    try {
      const result = await sendInvitations.mutateAsync({ id: meetingId });
      toast({ title: `تم إرسال ${result.sent} دعوة بنجاح` });
    } catch {
      toast({ title: "حدث خطأ أثناء إرسال الدعوات", variant: "destructive" });
    }
  };

  const handleAttendanceChange = async (userId: number, attended: boolean) => {
    try {
      await updateAttendance.mutateAsync({
        id: meetingId,
        data: { attendances: [{ userId, attended }] },
      });
      queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meetingId) });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await fetch(`/api/meetings/${meetingId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: getGetMeetingAttachmentsQueryKey(meetingId) });
      toast({ title: "تم رفع الملف بنجاح" });
    } catch {
      toast({ title: "حدث خطأ أثناء رفع الملف", variant: "destructive" });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachId: number) => {
    try {
      await deleteAttachment.mutateAsync({ id: attachId });
      queryClient.invalidateQueries({ queryKey: getGetMeetingAttachmentsQueryKey(meetingId) });
      toast({ title: "تم حذف الملف" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  if (isLoadingMeeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!meeting) {
    return <div>الاجتماع غير موجود.</div>;
  }

  const showAttendanceTab = meeting.status === "in_progress" || meeting.status === "completed";
  const tabCount = 4 + (showAttendanceTab ? 1 : 0) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            {meeting.committeeId && (
              <Link href={`/committees/${meeting.committeeId}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted text-sm">
                  اللجنة #{meeting.committeeId}
                </Badge>
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(meeting.date).toLocaleDateString("ar-SA")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{meeting.time}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{meeting.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && meeting.recurringType && meeting.recurringType !== "none" && (
            <Button
              variant="outline" size="sm"
              onClick={handleCreateNextMeeting}
              disabled={createNextMeeting.isPending}
            >
              {createNextMeeting.isPending ? <Spinner className="h-4 w-4 ml-1" /> : <RefreshCw className="h-4 w-4 ml-1" />}
              الجلسة التالية
            </Button>
          )}
          {canManage && (
            <Button
              variant="outline" size="sm"
              onClick={handleSendInvitations}
              disabled={sendInvitations.isPending}
            >
              {sendInvitations.isPending ? <Spinner className="h-4 w-4 ml-1" /> : <Mail className="h-4 w-4 ml-1" />}
              إرسال دعوات
            </Button>
          )}

          {/* Status change dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant={(statusMap[meeting.status]?.variant as any) || "default"}
                className="text-sm px-3 py-1 cursor-pointer"
              >
                {statusMap[meeting.status]?.label || meeting.status}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {meeting.status !== "in_progress" && meeting.status !== "completed" && (
                <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>
                  بدء الاجتماع
                </DropdownMenuItem>
              )}
              {meeting.status !== "completed" && (
                <DropdownMenuItem onClick={() => handleStatusChange("completed")}>
                  إنهاء الاجتماع
                </DropdownMenuItem>
              )}
              {meeting.status !== "postponed" && (
                <DropdownMenuItem onClick={() => handleStatusChange("postponed")}>
                  تأجيل
                </DropdownMenuItem>
              )}
              {meeting.status !== "cancelled" && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleStatusChange("cancelled")}
                >
                  إلغاء
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setEditMeetingOpen(true)}>
            <Edit2 className="h-4 w-4 ml-1" />
            تعديل
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full grid-cols-${tabCount} lg:w-auto lg:inline-grid`}>
          <TabsTrigger value="overview">بيانات الاجتماع</TabsTrigger>
          <TabsTrigger value="minutes">المحضر</TabsTrigger>
          <TabsTrigger value="decisions">القرارات</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          {showAttendanceTab && <TabsTrigger value="attendance">الحضور</TabsTrigger>}
          <TabsTrigger value="attachments">
            <Paperclip className="h-4 w-4 ml-1" />
            المرفقات {attachments.length > 0 && `(${attachments.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  التفاصيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {meeting.project && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">المشروع</span>
                    <span>{meeting.project}</span>
                  </div>
                )}
                {meeting.team && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الفريق</span>
                    <span>{meeting.team}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold block text-sm text-muted-foreground">رئيس الاجتماع</span>
                  <span>{meeting.chairperson?.fullName || "-"}</span>
                </div>
                {(meeting as any).recurringType && (meeting as any).recurringType !== "none" && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">تكرار</span>
                    <Badge variant="secondary">
                      {(({ weekly: "أسبوعي", biweekly: "كل أسبوعين", monthly: "شهري" } as Record<string, string>)[(meeting as any).recurringType]) ?? (meeting as any).recurringType}
                    </Badge>
                  </div>
                )}
                {meeting.objectives && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الأهداف</span>
                    <p className="whitespace-pre-wrap">{meeting.objectives}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  المشاركون ({meeting.attendees?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.attendees && meeting.attendees.length > 0 ? (
                  <ul className="space-y-2">
                    {meeting.attendees.map((attendee) => (
                      <li key={attendee.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span>{attendee.fullName}</span>
                          {(attendee as any).attendeeType === "guest" && (
                            <Badge variant="outline" className="text-xs">ضيف</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(attendee as any).forAgendaItem && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={(attendee as any).forAgendaItem}>
                              {(attendee as any).forAgendaItem}
                            </span>
                          )}
                          {(attendee as any).attended && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم تحديد مشاركين.</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  جدول الأعمال
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.agendaItems && meeting.agendaItems.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-2 pr-4">
                    {meeting.agendaItems.map((item, index) => (
                      <li key={index} className="pl-2">{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم تحديد جدول أعمال.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Minutes Tab */}
        <TabsContent value="minutes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  محضر الاجتماع
                </CardTitle>
                <div className="flex items-center gap-2">
                  {minutes && (
                    <Badge
                      variant="secondary"
                      className={
                        minutes.status === "approved" ? "bg-green-100 text-green-800 border-green-200" :
                        minutes.status === "pending_approval" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                        ""
                      }
                    >
                      {minutesStatusMap[minutes.status] || minutes.status}
                    </Badge>
                  )}
                  {canApprove && minutes && minutes.status === "pending_approval" && (
                    <Button size="sm" variant="outline" onClick={handleApproveMinutes}>
                      <Check className="h-4 w-4 ml-1" />
                      اعتماد
                    </Button>
                  )}
                  {minutes && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/meetings/${meetingId}/minutes/export`, "_blank")}
                    >
                      <Download className="h-4 w-4 ml-1" />
                      تصدير PDF
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setMinutesOpen(true)}>
                    {minutes ? (
                      <><Edit2 className="h-4 w-4 ml-1" />تعديل</>
                    ) : (
                      <><Plus className="h-4 w-4 ml-1" />إنشاء محضر</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMinutes ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : minutes ? (
                <div className="space-y-6">
                  {minutes.executiveSummary && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">الملخص التنفيذي</h3>
                      <p className="whitespace-pre-wrap">{minutes.executiveSummary}</p>
                    </div>
                  )}
                  {minutes.discussionItems && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">نقاط النقاش</h3>
                      <p className="whitespace-pre-wrap">{minutes.discussionItems}</p>
                    </div>
                  )}
                  {minutes.risks && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">المخاطر</h3>
                      <p className="whitespace-pre-wrap">{minutes.risks}</p>
                    </div>
                  )}
                  {minutes.previousFollowUp && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">متابعة سابقة</h3>
                      <p className="whitespace-pre-wrap">{minutes.previousFollowUp}</p>
                    </div>
                  )}
                  {minutes.approvedBy && (
                    <p className="text-xs text-muted-foreground">
                      اعتمد بواسطة: {minutes.approvedBy.fullName}
                      {minutes.approvedAt && ` — ${new Date(minutes.approvedAt).toLocaleDateString("ar-SA")}`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لم يتم إنشاء محضر لهذا الاجتماع بعد.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>القرارات</CardTitle>
                  <CardDescription>القرارات المتخذة خلال هذا الاجتماع</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditDecision(null); setDecisionOpen(true); }}>
                  <Plus className="h-4 w-4 ml-1" />
                  قرار جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDecisions ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : decisions && decisions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>القرار</TableHead>
                      <TableHead>بند جدول الأعمال</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((decision) => (
                      <TableRow key={decision.id}>
                        <TableCell className="font-medium">{decision.content}</TableCell>
                        <TableCell>{decision.agendaItem || "-"}</TableCell>
                        <TableCell>{decision.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditDecision(decision); setDecisionOpen(true); }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف القرار</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف هذا القرار؟ لا يمكن التراجع.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteDecision(decision.id)}>
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لا توجد قرارات مسجلة لهذا الاجتماع.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  المهام المرتبطة
                </CardTitle>
                <Button size="sm" onClick={() => setTaskOpen(true)}>
                  <Plus className="h-4 w-4 ml-1" />
                  مهمة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المهمة</TableHead>
                      <TableHead>المسؤول</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإنجاز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.assignee?.fullName || "-"}</TableCell>
                        <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-SA") : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {taskStatusMap[task.status] || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.completionPercent || 0} className="w-[60px]" />
                            <span className="text-xs">{task.completionPercent || 0}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لا توجد مهام مرتبطة بهذا الاجتماع.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        {showAttendanceTab && (
          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  تسجيل الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!meeting.attendees || meeting.attendees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا يوجد مشاركون مسجلون.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Permanent members */}
                    {meeting.attendees.some((a) => (a as any).attendeeType === "member") && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">الأعضاء الدائمون</h3>
                        <div className="space-y-2">
                          {meeting.attendees
                            .filter((a) => (a as any).attendeeType === "member")
                            .map((attendee) => (
                              <div key={attendee.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`att-${attendee.id}`}
                                    checked={(attendee as any).attended ?? false}
                                    onCheckedChange={(checked) =>
                                      canManage && handleAttendanceChange(attendee.id, !!checked)
                                    }
                                    disabled={!canManage}
                                  />
                                  <label htmlFor={`att-${attendee.id}`} className="text-sm font-medium cursor-pointer">
                                    {attendee.fullName}
                                  </label>
                                </div>
                                {(attendee as any).attended ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">حضر</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">غائب</Badge>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Guests */}
                    {meeting.attendees.some((a) => (a as any).attendeeType === "guest") && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">الضيوف</h3>
                        <div className="space-y-2">
                          {meeting.attendees
                            .filter((a) => (a as any).attendeeType === "guest")
                            .map((attendee) => (
                              <div key={attendee.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    id={`guest-${attendee.id}`}
                                    checked={(attendee as any).attended ?? false}
                                    onCheckedChange={(checked) =>
                                      canManage && handleAttendanceChange(attendee.id, !!checked)
                                    }
                                    disabled={!canManage}
                                  />
                                  <div>
                                    <label htmlFor={`guest-${attendee.id}`} className="text-sm font-medium cursor-pointer">
                                      {attendee.fullName}
                                    </label>
                                    {(attendee as any).forAgendaItem && (
                                      <p className="text-xs text-muted-foreground">بند: {(attendee as any).forAgendaItem}</p>
                                    )}
                                  </div>
                                </div>
                                {(attendee as any).attended ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">حضر</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">غائب</Badge>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  المرفقات
                </CardTitle>
                {canManage && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? <Spinner className="h-4 w-4 ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
                      رفع ملف
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAttachments ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : attachments.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  لا توجد مرفقات لهذا الاجتماع.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الملف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الحجم</TableHead>
                      <TableHead>تاريخ الرفع</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachments.map((attachment) => (
                      <TableRow key={attachment.id}>
                        <TableCell className="font-medium">{attachment.originalName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{attachment.mimeType}</TableCell>
                        <TableCell>{formatFileSize(attachment.sizeBytes)}</TableCell>
                        <TableCell>{new Date(attachment.createdAt).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => window.open(`/api/attachments/${attachment.id}/download`, "_blank")}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {canManage && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف المرفق</AlertDialogTitle>
                                    <AlertDialogDescription>هل أنت متأكد من حذف هذا الملف؟</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAttachment(attachment.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <MeetingFormDialog
        open={editMeetingOpen}
        onOpenChange={setEditMeetingOpen}
        meeting={meeting}
      />

      <MinutesFormDialog
        open={minutesOpen}
        onOpenChange={setMinutesOpen}
        meetingId={meetingId}
        minutes={minutes ?? null}
      />

      <DecisionFormDialog
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        meetingId={meetingId}
        agendaItems={meeting.agendaItems ?? []}
        decision={editDecision}
      />

      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        meetingId={meetingId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({ meetingId }) });
        }}
      />
    </div>
  );
}
