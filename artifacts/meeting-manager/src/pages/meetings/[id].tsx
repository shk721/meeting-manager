import { useState } from "react";
import {
  useGetMeeting, useGetMeetingMinutes, useGetDecisions, useGetTasks,
  getGetMeetingQueryKey, getGetMeetingMinutesQueryKey, getGetDecisionsQueryKey, getGetTasksQueryKey,
  useGetUsers,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Users, Target, CheckSquare, FileText, Briefcase, Plus, Pencil, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

export default function MeetingDetail({ id }: { id: string }) {
  const meetingId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });
  const { data: minutes, isLoading: isLoadingMinutes } = useGetMeetingMinutes(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingMinutesQueryKey(meetingId) }
  });
  const { data: decisions, isLoading: isLoadingDecisions } = useGetDecisions({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetDecisionsQueryKey({ meetingId }) }
  });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetTasksQueryKey({ meetingId }) }
  });
  const { data: users } = useGetUsers();

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [agendaItems, setAgendaItems] = useState<string[]>([""]);
  const [isSavingAttendees, setIsSavingAttendees] = useState(false);
  const [isSavingAgenda, setIsSavingAgenda] = useState(false);
  const [isCreatingMinutes, setIsCreatingMinutes] = useState(false);
  const [isApprovingMinutes, setIsApprovingMinutes] = useState(false);
  const [isCreatingDecision, setIsCreatingDecision] = useState(false);

  const [taskOpen, setTaskOpen] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    dueDate: "",
    assigneeId: "",
  });

  const [minutesForm, setMinutesForm] = useState({
    executiveSummary: "",
    discussionItems: "",
    risks: "",
    previousFollowUp: "",
  });

  const [decisionForm, setDecisionForm] = useState({
    content: "",
    agendaItem: "",
    notes: "",
  });

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

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    setIsCreatingTask(true);
    try {
      await apiFetch("/api/tasks", "POST", {
        title: taskForm.title,
        description: taskForm.description || undefined,
        status: taskForm.status,
        priority: taskForm.priority,
        meetingId,
        dueDate: taskForm.dueDate || undefined,
        assigneeId: taskForm.assigneeId ? parseInt(taskForm.assigneeId) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({ meetingId }) });
      setTaskOpen(false);
      setTaskForm({ title: "", description: "", status: "open", priority: "medium", dueDate: "", assigneeId: "" });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSaveMinutes = async () => {
    setIsCreatingMinutes(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}/minutes`, "POST", {
        executiveSummary: minutesForm.executiveSummary || undefined,
        discussionItems: minutesForm.discussionItems || undefined,
        risks: minutesForm.risks || undefined,
        previousFollowUp: minutesForm.previousFollowUp || undefined,
        status: "draft",
      });
      queryClient.invalidateQueries({ queryKey: getGetMeetingMinutesQueryKey(meetingId) });
      setMinutesOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreatingMinutes(false);
    }
  };

  const handleApproveMinutes = async () => {
    if (!minutes) return;
    setIsApprovingMinutes(true);
    try {
      await apiFetch(`/api/minutes/${(minutes as any).id}/approve`, "POST");
      queryClient.invalidateQueries({ queryKey: getGetMeetingMinutesQueryKey(meetingId) });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsApprovingMinutes(false);
    }
  };

  const openAttendeesDialog = () => {
    const current = ((meeting as any).attendees ?? []).map((a: any) => a.id);
    setSelectedAttendees(current);
    setAttendeesOpen(true);
  };

  const toggleAttendee = (id: number) => {
    setSelectedAttendees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveAttendees = async () => {
    setIsSavingAttendees(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}`, "PATCH", { attendeeIds: selectedAttendees });
      queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meetingId) });
      setAttendeesOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingAttendees(false);
    }
  };

  const openAgendaDialog = () => {
    const current = (meeting as any).agendaItems ?? [];
    setAgendaItems(current.length > 0 ? current : [""]);
    setAgendaOpen(true);
  };

  const handleSaveAgenda = async () => {
    setIsSavingAgenda(true);
    try {
      const items = agendaItems.map(s => s.trim()).filter(Boolean);
      await apiFetch(`/api/meetings/${meetingId}`, "PATCH", { agendaItems: items });
      queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meetingId) });
      setAgendaOpen(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingAgenda(false);
    }
  };

  const handleCreateDecision = async () => {
    if (!decisionForm.content) return;
    setIsCreatingDecision(true);
    try {
      await apiFetch("/api/decisions", "POST", {
        content: decisionForm.content,
        meetingId,
        agendaItem: decisionForm.agendaItem || undefined,
        notes: decisionForm.notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: getGetDecisionsQueryKey({ meetingId }) });
      setDecisionOpen(false);
      setDecisionForm({ content: "", agendaItem: "", notes: "" });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsCreatingDecision(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
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
        <Badge variant={(statusMap[meeting.status]?.variant as any) || "default"} className="text-lg px-4 py-1">
          {statusMap[meeting.status]?.label || meeting.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">بيانات الاجتماع</TabsTrigger>
          <TabsTrigger value="minutes">المحضر</TabsTrigger>
          <TabsTrigger value="decisions">القرارات</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
        </TabsList>

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
                {(meeting as any).team && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الفريق</span>
                    <span>{(meeting as any).team}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold block text-sm text-muted-foreground">رئيس الاجتماع</span>
                  <span>{(meeting as any).chairperson?.fullName || "-"}</span>
                </div>
                {(meeting as any).objectives && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الأهداف</span>
                    <p className="whitespace-pre-wrap">{(meeting as any).objectives}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    المشاركون ({(meeting as any).attendees?.length || 0})
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={openAttendeesDialog}>
                    <Pencil className="h-4 w-4 ml-1" />
                    تعديل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(meeting as any).attendees && (meeting as any).attendees.length > 0 ? (
                  <ul className="space-y-2">
                    {(meeting as any).attendees.map((attendee: any) => (
                      <li key={attendee.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span>{attendee.fullName}</span>
                        <span className="text-sm text-muted-foreground">{attendee.role}</span>
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
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    جدول الأعمال
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={openAgendaDialog}>
                    <Pencil className="h-4 w-4 ml-1" />
                    تعديل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(meeting as any).agendaItems && (meeting as any).agendaItems.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-2 pr-4">
                    {(meeting as any).agendaItems.map((item: any, index: any) => (
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
                        (minutes as any).status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                        (minutes as any).status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        ''
                      }
                    >
                      {minutesStatusMap[(minutes as any).status] || (minutes as any).status}
                    </Badge>
                  )}
                  {(!minutes || (minutes as any).status !== 'approved') && (
                    <Button size="sm" onClick={() => setMinutesOpen(true)}>
                      <Plus className="h-4 w-4 ml-1" />
                      {minutes ? "تحديث المحضر" : "إنشاء محضر"}
                    </Button>
                  )}
                  {minutes && (minutes as any).status !== 'approved' && (
                    <Button size="sm" variant="outline" onClick={handleApproveMinutes} disabled={isApprovingMinutes}>
                      اعتماد
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMinutes ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : minutes ? (
                <div className="space-y-6">
                  {(minutes as any).executiveSummary && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">الملخص التنفيذي</h3>
                      <p className="whitespace-pre-wrap">{(minutes as any).executiveSummary}</p>
                    </div>
                  )}
                  {(minutes as any).discussionItems && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">نقاط النقاش</h3>
                      <p className="whitespace-pre-wrap">{(minutes as any).discussionItems}</p>
                    </div>
                  )}
                  {(minutes as any).risks && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">المخاطر</h3>
                      <p className="whitespace-pre-wrap">{(minutes as any).risks}</p>
                    </div>
                  )}
                  {(minutes as any).previousFollowUp && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">متابعة سابقة</h3>
                      <p className="whitespace-pre-wrap">{(minutes as any).previousFollowUp}</p>
                    </div>
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

        <TabsContent value="decisions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>القرارات</CardTitle>
                  <CardDescription>القرارات المتخذة خلال هذا الاجتماع</CardDescription>
                </div>
                <Button size="sm" onClick={() => setDecisionOpen(true)}>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map((decision: any) => (
                      <TableRow key={decision.id}>
                        <TableCell className="font-medium">{decision.content}</TableCell>
                        <TableCell>{decision.agendaItem || "-"}</TableCell>
                        <TableCell>{decision.notes || "-"}</TableCell>
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
                    {tasks.map((task: any) => (
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
      </Tabs>

      {/* Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مهمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>عنوان المهمة *</Label>
              <Input
                placeholder="أدخل عنوان المهمة"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea
                placeholder="اختياري"
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>الأولوية</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
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
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="on_hold">معلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>المسؤول</Label>
                <Select value={taskForm.assigneeId} onValueChange={v => setTaskForm(f => ({ ...f, assigneeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    {((users ?? []) as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateTask} disabled={isCreatingTask || !taskForm.title}>
              {isCreatingTask ? <Spinner className="h-4 w-4 ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Minutes Dialog */}
      <Dialog open={minutesOpen} onOpenChange={setMinutesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إنشاء محضر الاجتماع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>الملخص التنفيذي</Label>
              <Textarea
                rows={3}
                placeholder="أدخل الملخص التنفيذي"
                value={minutesForm.executiveSummary}
                onChange={e => setMinutesForm(f => ({ ...f, executiveSummary: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>نقاط النقاش</Label>
              <Textarea
                rows={3}
                placeholder="اختياري"
                value={minutesForm.discussionItems}
                onChange={e => setMinutesForm(f => ({ ...f, discussionItems: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>المخاطر</Label>
              <Textarea
                rows={2}
                placeholder="اختياري"
                value={minutesForm.risks}
                onChange={e => setMinutesForm(f => ({ ...f, risks: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>متابعة سابقة</Label>
              <Textarea
                rows={2}
                placeholder="اختياري"
                value={minutesForm.previousFollowUp}
                onChange={e => setMinutesForm(f => ({ ...f, previousFollowUp: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMinutesOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveMinutes} disabled={isCreatingMinutes}>
              {isCreatingMinutes ? <Spinner className="h-4 w-4 ml-2" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة قرار جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>نص القرار *</Label>
              <Textarea
                rows={3}
                placeholder="أدخل نص القرار"
                value={decisionForm.content}
                onChange={e => setDecisionForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>بند جدول الأعمال</Label>
              <Input
                placeholder="اختياري"
                value={decisionForm.agendaItem}
                onChange={e => setDecisionForm(f => ({ ...f, agendaItem: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Input
                placeholder="اختياري"
                value={decisionForm.notes}
                onChange={e => setDecisionForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateDecision} disabled={isCreatingDecision || !decisionForm.content}>
              {isCreatingDecision ? <Spinner className="h-4 w-4 ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendees Dialog */}
      <Dialog open={attendeesOpen} onOpenChange={setAttendeesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تعديل المشاركين</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {((users ?? []) as any[]).map((u: any) => (
              <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttendees.includes(u.id)}
                  onChange={() => toggleAttendee(u.id)}
                  className="w-4 h-4"
                />
                <span className="flex-1">{u.fullName}</span>
                <span className="text-xs text-muted-foreground">{u.department ?? u.role}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendeesOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveAttendees} disabled={isSavingAttendees}>
              {isSavingAttendees ? <Spinner className="h-4 w-4 ml-2" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agenda Dialog */}
      <Dialog open={agendaOpen} onOpenChange={setAgendaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تعديل جدول الأعمال</DialogTitle></DialogHeader>
          <div className="py-2 space-y-2">
            {agendaItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-muted-foreground text-sm w-5">{idx + 1}.</span>
                <Input
                  value={item}
                  onChange={e => {
                    const updated = [...agendaItems];
                    updated[idx] = e.target.value;
                    setAgendaItems(updated);
                  }}
                  placeholder={`البند ${idx + 1}`}
                />
                <Button size="icon" variant="ghost" onClick={() => setAgendaItems(agendaItems.filter((_, i) => i !== idx))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAgendaItems([...agendaItems, ""])}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة بند
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgendaOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveAgenda} disabled={isSavingAgenda}>
              {isSavingAgenda ? <Spinner className="h-4 w-4 ml-2" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
