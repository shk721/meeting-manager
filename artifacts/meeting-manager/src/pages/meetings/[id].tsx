import { useState } from "react";
import {
  useGetMeeting, useGetUsers,
  getGetMeetingQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Calendar, Clock, MapPin, Users, Target, CheckSquare, FileText,
  Briefcase, Plus, Trash2, Send, Play, CheckCircle2, Circle,
  ChevronDown, ChevronUp, Edit,
} from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "default" },
  in_progress: { label: "جارٍ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "secondary" },
};

const taskStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  open: { label: "مفتوح", variant: "default" },
  in_progress: { label: "قيد التنفيذ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  on_hold: { label: "معلق", variant: "secondary" },
};

const priorityMap: Record<string, string> = {
  low: "منخفض", medium: "متوسط", high: "عالٍ", critical: "حرج",
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
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function StepIndicator({ done, active, label, num }: { done: boolean; active: boolean; label: string; num: number }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
        done ? "bg-green-500 border-green-500 text-white" :
        active ? "bg-blue-500 border-blue-500 text-white" :
        "bg-background border-muted-foreground/30 text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : num}
      </div>
      <span className={`text-[10px] text-center leading-tight ${active ? "text-blue-600 font-medium" : done ? "text-green-600" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return <div className={`flex-1 h-0.5 mt-4 ${done ? "bg-green-500" : "bg-muted-foreground/20"}`} />;
}

export default function MeetingDetail({ id }: { id: string }) {
  const meetingId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: meeting, isLoading } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) },
  });
  const { data: users } = useGetUsers();

  const [isPending, setIsPending] = useState(false);
  const [apiError, setApiError] = useState("");

  // Attendees dialog
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);
  const [isSavingAttendees, setIsSavingAttendees] = useState(false);

  // Agenda dialog
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaItems, setAgendaItems] = useState<string[]>([""]);
  const [isSavingAgenda, setIsSavingAgenda] = useState(false);

  // Per-agenda decision/task dialogs
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ content: "", agendaItem: "", notes: "" });
  const [isCreatingDecision, setIsCreatingDecision] = useState(false);

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", status: "open", priority: "medium",
    dueDate: "", assigneeId: "", agendaItem: "",
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Minutes dialog
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutesForm, setMinutesForm] = useState({
    executiveSummary: "", discussionItems: "", risks: "", previousFollowUp: "",
  });
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);

  // Expanded agenda items for discussion
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const refresh = () => queryClient.invalidateQueries({ queryKey: getGetMeetingQueryKey(meetingId) });

  const patchMeeting = async (data: any) => {
    setApiError("");
    setIsPending(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}`, "PATCH", data);
      refresh();
    } catch (e: any) { setApiError(e.message); }
    finally { setIsPending(false); }
  };

  const openAttendeesDialog = () => {
    setSelectedAttendees(((meeting as any)?.attendees ?? []).map((a: any) => a.id));
    setAttendeesOpen(true);
  };

  const handleSaveAttendees = async () => {
    setIsSavingAttendees(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}`, "PATCH", { attendeeIds: selectedAttendees });
      refresh();
      setAttendeesOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsSavingAttendees(false); }
  };

  const openAgendaDialog = () => {
    const items = (meeting as any)?.agendaItems ?? [];
    setAgendaItems(items.length > 0 ? items : [""]);
    setAgendaOpen(true);
  };

  const handleSaveAgenda = async () => {
    setIsSavingAgenda(true);
    try {
      const items = agendaItems.filter(i => i.trim());
      await apiFetch(`/api/meetings/${meetingId}`, "PATCH", { agendaItems: items });
      refresh();
      setAgendaOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsSavingAgenda(false); }
  };

  const handleSendInvitations = async () => {
    await patchMeeting({ invitationsSentAt: new Date().toISOString() });
  };

  const handleStartMeeting = async () => {
    await patchMeeting({ status: "in_progress" });
  };

  const handleCloseMeeting = async () => {
    await patchMeeting({ status: "completed" });
  };

  const openDecisionDialog = (agendaItem = "") => {
    setDecisionForm({ content: "", agendaItem, notes: "" });
    setDecisionOpen(true);
  };

  const handleCreateDecision = async () => {
    if (!decisionForm.content) return;
    setIsCreatingDecision(true);
    try {
      await apiFetch(`/api/decisions`, "POST", {
        content: decisionForm.content,
        meetingId,
        agendaItem: decisionForm.agendaItem || undefined,
        notes: decisionForm.notes || undefined,
      });
      refresh();
      setDecisionOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsCreatingDecision(false); }
  };

  const openTaskDialog = (agendaItem = "") => {
    setTaskForm({ title: "", description: "", status: "open", priority: "medium", dueDate: "", assigneeId: "", agendaItem });
    setTaskOpen(true);
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    setIsCreatingTask(true);
    try {
      await apiFetch(`/api/tasks`, "POST", {
        title: taskForm.title,
        description: taskForm.description || undefined,
        status: taskForm.status,
        priority: taskForm.priority,
        meetingId,
        dueDate: taskForm.dueDate || undefined,
        assigneeId: taskForm.assigneeId ? parseInt(taskForm.assigneeId) : undefined,
      });
      refresh();
      setTaskOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsCreatingTask(false); }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: string) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, "PATCH", { status });
      refresh();
    } catch (e: any) { setApiError(e.message); }
  };

  const openMinutesDialog = () => {
    const m = (meeting as any)?.minutes;
    setMinutesForm({
      executiveSummary: m?.executiveSummary ?? "",
      discussionItems: m?.discussionItems ?? "",
      risks: m?.risks ?? "",
      previousFollowUp: m?.previousFollowUp ?? "",
    });
    setMinutesOpen(true);
  };

  const handleSaveMinutes = async () => {
    setIsSavingMinutes(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}/minutes`, "POST", {
        executiveSummary: minutesForm.executiveSummary || undefined,
        discussionItems: minutesForm.discussionItems || undefined,
        risks: minutesForm.risks || undefined,
        previousFollowUp: minutesForm.previousFollowUp || undefined,
        status: "draft",
      });
      refresh();
      setMinutesOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsSavingMinutes(false); }
  };

  const handleApproveMinutes = async () => {
    const m = (meeting as any)?.minutes;
    if (!m) return;
    try {
      await apiFetch(`/api/minutes/${m.id}/approve`, "POST");
      refresh();
    } catch (e: any) { setApiError(e.message); }
  };

  const handleSendMinutes = async () => {
    const m = (meeting as any)?.minutes;
    if (!m) return;
    try {
      await apiFetch(`/api/minutes/${m.id}/send`, "POST");
      refresh();
    } catch (e: any) { setApiError(e.message); }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="size-10" /></div>;
  }
  if (!meeting) return <div>الاجتماع غير موجود.</div>;

  const m = meeting as any;
  const hasAgenda = (m.agendaItems?.length ?? 0) > 0;
  const hasAttendees = (m.attendees?.length ?? 0) > 0;
  const invitationsSent = !!m.invitationsSentAt;
  const isStarted = m.status === "in_progress" || m.status === "completed";
  const hasMinutes = !!m.minutes;
  const minutesApproved = m.minutes?.status === "approved";
  const minutesSent = !!m.minutesSentAt;
  const isClosed = m.status === "completed";
  const tasks = m.tasks ?? [];
  const decisions = m.decisions ?? [];
  const allTasksDone = tasks.length > 0 && tasks.every((t: any) => t.status === "completed" || t.status === "cancelled");

  // Compute lifecycle step (1-indexed)
  let currentStep = 1;
  if (hasAgenda) currentStep = 2;
  if (invitationsSent) currentStep = 3;
  if (isStarted) currentStep = 4;
  if (hasMinutes) currentStep = 5;
  if (minutesApproved) currentStep = 6;
  if (minutesSent) currentStep = 7;
  if (isClosed) currentStep = 8;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{m.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(m.date).toLocaleDateString("ar-SA")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{m.time}</span>
            </div>
            {m.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{m.location}</span>
              </div>
            )}
            {m.project && (
              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                <span>{m.project}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={(statusMap[m.status]?.variant as any) || "default"} className="text-sm px-3 py-1">
            {statusMap[m.status]?.label || m.status}
          </Badge>
          {m.status === "scheduled" && (
            <Button onClick={handleStartMeeting} disabled={isPending} size="sm">
              <Play className="h-4 w-4 ml-1" />
              بدء الاجتماع
            </Button>
          )}
          {m.status === "in_progress" && (
            <Button onClick={handleCloseMeeting} disabled={isPending} size="sm" variant="destructive">
              <CheckCircle2 className="h-4 w-4 ml-1" />
              إغلاق الاجتماع
            </Button>
          )}
        </div>
      </div>

      {apiError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{apiError}</p>}

      {/* Lifecycle Steps */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            <StepIndicator done={currentStep > 1} active={currentStep === 1} label="إنشاء الاجتماع" num={1} />
            <StepLine done={currentStep > 1} />
            <StepIndicator done={currentStep > 2} active={currentStep === 2} label="جدول الأعمال" num={2} />
            <StepLine done={currentStep > 2} />
            <StepIndicator done={currentStep > 3} active={currentStep === 3} label="إرسال الدعوات" num={3} />
            <StepLine done={currentStep > 3} />
            <StepIndicator done={currentStep > 4} active={currentStep === 4} label="بدء الاجتماع" num={4} />
            <StepLine done={currentStep > 4} />
            <StepIndicator done={currentStep > 5} active={currentStep === 5} label="كتابة المحضر" num={5} />
            <StepLine done={currentStep > 5} />
            <StepIndicator done={currentStep > 6} active={currentStep === 6} label="اعتماد المحضر" num={6} />
            <StepLine done={currentStep > 6} />
            <StepIndicator done={currentStep > 7} active={currentStep === 7} label="إرسال المحضر" num={7} />
            <StepLine done={currentStep > 7} />
            <StepIndicator done={currentStep >= 8} active={currentStep === 8} label="إغلاق الاجتماع" num={8} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendees */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                المشاركون ({m.attendees?.length ?? 0})
                {hasAttendees && !invitationsSent && (
                  <Badge variant="outline" className="text-xs">لم تُرسَل الدعوات</Badge>
                )}
                {invitationsSent && (
                  <Badge variant={"success" as any} className="text-xs">تم إرسال الدعوات</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openAttendeesDialog}>
                  <Edit className="h-3 w-3 ml-1" />
                  تعديل
                </Button>
                {hasAttendees && !invitationsSent && (
                  <Button size="sm" onClick={handleSendInvitations} disabled={isPending}>
                    <Send className="h-3 w-3 ml-1" />
                    إرسال الدعوات
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasAttendees ? (
              <ul className="space-y-1">
                {m.attendees.map((a: any) => (
                  <li key={a.id} className="flex justify-between items-center py-1 border-b last:border-0 text-sm">
                    <span>{a.fullName}</span>
                    <span className="text-muted-foreground">{a.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">لم يتم تحديد مشاركين بعد.</p>
            )}
            {invitationsSent && (
              <p className="text-xs text-muted-foreground mt-2">
                أُرسلت الدعوات: {new Date(m.invitationsSentAt).toLocaleString("ar-SA")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                جدول الأعمال ({m.agendaItems?.length ?? 0} بند)
              </CardTitle>
              <Button size="sm" variant="outline" onClick={openAgendaDialog}>
                <Edit className="h-3 w-3 ml-1" />
                تعديل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasAgenda ? (
              <ol className="space-y-2">
                {m.agendaItems.map((item: string, idx: number) => (
                  <li key={idx} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex justify-between items-center p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        {item}
                      </span>
                      <div className="flex items-center gap-2">
                        {isStarted && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={e => { e.stopPropagation(); openDecisionDialog(item); }}>
                              <Plus className="h-3 w-3 ml-1" />
                              قرار
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={e => { e.stopPropagation(); openTaskDialog(item); }}>
                              <Plus className="h-3 w-3 ml-1" />
                              مهمة
                            </Button>
                          </>
                        )}
                        {expandedItems[idx] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    {expandedItems[idx] && (
                      <div className="px-3 pb-3 pt-1 border-t bg-muted/20 space-y-2">
                        {decisions.filter((d: any) => d.agendaItem === item).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">القرارات:</p>
                            {decisions.filter((d: any) => d.agendaItem === item).map((d: any) => (
                              <p key={d.id} className="text-sm pr-2 border-r-2 border-blue-300">{d.content}</p>
                            ))}
                          </div>
                        )}
                        {tasks.filter((t: any) => t.title.includes(item.slice(0, 20))).length === 0 &&
                         decisions.filter((d: any) => d.agendaItem === item).length === 0 && (
                          <p className="text-xs text-muted-foreground">لا توجد قرارات أو مهام لهذا البند.</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">لم يتم تحديد جدول أعمال بعد.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Minutes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              محضر الاجتماع
              {hasMinutes && (
                <Badge variant={(minutesApproved ? "success" : "secondary") as any} className="text-xs">
                  {m.minutes.status === "draft" ? "مسودة" : m.minutes.status === "approved" ? "معتمد" : m.minutes.status}
                </Badge>
              )}
              {minutesSent && <Badge variant={"success" as any} className="text-xs">تم الإرسال</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openMinutesDialog}>
                <Edit className="h-3 w-3 ml-1" />
                {hasMinutes ? "تعديل" : "كتابة المحضر"}
              </Button>
              {hasMinutes && !minutesApproved && (
                <Button size="sm" onClick={handleApproveMinutes}>
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  اعتماد
                </Button>
              )}
              {minutesApproved && !minutesSent && (
                <Button size="sm" onClick={handleSendMinutes}>
                  <Send className="h-3 w-3 ml-1" />
                  إرسال المحضر
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasMinutes ? (
            <div className="space-y-4">
              {m.minutes.executiveSummary && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">الملخص التنفيذي</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.executiveSummary}</p>
                </div>
              )}
              {m.minutes.discussionItems && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">نقاط النقاش</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.discussionItems}</p>
                </div>
              )}
              {m.minutes.risks && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">المخاطر</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.risks}</p>
                </div>
              )}
              {m.minutes.previousFollowUp && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">متابعة سابقة</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.previousFollowUp}</p>
                </div>
              )}
              {minutesSent && (
                <p className="text-xs text-muted-foreground">
                  أُرسل المحضر: {new Date(m.minutesSentAt).toLocaleString("ar-SA")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">لم يتم كتابة محضر بعد.</p>
          )}
        </CardContent>
      </Card>

      {/* Decisions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              القرارات ({decisions.length})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => openDecisionDialog()}>
              <Plus className="h-3 w-3 ml-1" />
              قرار جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {decisions.length > 0 ? (
            <div className="space-y-2">
              {decisions.map((d: any, idx: number) => (
                <div key={d.id} className="p-3 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{d.content}</p>
                      {d.agendaItem && <p className="text-xs text-muted-foreground mt-1">البند: {d.agendaItem}</p>}
                      {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">لا توجد قرارات مسجلة.</p>
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4" />
              المهام ({tasks.length})
              {allTasksDone && tasks.length > 0 && <Badge variant={"success" as any} className="text-xs">مكتملة</Badge>}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => openTaskDialog()}>
              <Plus className="h-3 w-3 ml-1" />
              مهمة جديدة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المهمة</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>الأولوية</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الإنجاز</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.assignee?.fullName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{priorityMap[task.priority] || task.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-SA") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={task.completionPercent || 0} className="w-[50px]" />
                        <span className="text-xs">{task.completionPercent || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={v => handleUpdateTaskStatus(task.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">مفتوح</SelectItem>
                          <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                          <SelectItem value="on_hold">معلق</SelectItem>
                          <SelectItem value="completed">مكتمل</SelectItem>
                          <SelectItem value="cancelled">ملغى</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">لا توجد مهام مرتبطة.</p>
          )}
        </CardContent>
      </Card>

      {/* Attendees Dialog */}
      <Dialog open={attendeesOpen} onOpenChange={setAttendeesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تعديل المشاركين</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto py-2">
            {((users ?? []) as any[]).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                <Checkbox
                  id={`user-${u.id}`}
                  checked={selectedAttendees.includes(u.id)}
                  onCheckedChange={checked => {
                    setSelectedAttendees(prev =>
                      checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                    );
                  }}
                />
                <label htmlFor={`user-${u.id}`} className="text-sm cursor-pointer flex-1">
                  {u.fullName} <span className="text-muted-foreground">({u.role})</span>
                </label>
              </div>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>تعديل جدول الأعمال</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto py-2">
            {agendaItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                <Input
                  value={item}
                  onChange={e => {
                    const updated = [...agendaItems];
                    updated[idx] = e.target.value;
                    setAgendaItems(updated);
                  }}
                  placeholder={`البند ${idx + 1}`}
                  className="flex-1"
                />
                <Button size="sm" variant="ghost" onClick={() => setAgendaItems(prev => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={() => setAgendaItems(prev => [...prev, ""])}>
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

      {/* Decision Dialog */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تسجيل قرار</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {decisionForm.agendaItem && (
              <div className="text-sm bg-muted p-2 rounded">البند: {decisionForm.agendaItem}</div>
            )}
            <div className="space-y-1">
              <Label>نص القرار *</Label>
              <Textarea
                placeholder="أدخل نص القرار"
                value={decisionForm.content}
                onChange={e => setDecisionForm(f => ({ ...f, content: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Input placeholder="اختياري" value={decisionForm.notes} onChange={e => setDecisionForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {!decisionForm.agendaItem && (
              <div className="space-y-1">
                <Label>البند المرتبط</Label>
                <Select value={decisionForm.agendaItem} onValueChange={v => setDecisionForm(f => ({ ...f, agendaItem: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger>
                  <SelectContent>
                    {(m.agendaItems ?? []).map((item: string, idx: number) => (
                      <SelectItem key={idx} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateDecision} disabled={isCreatingDecision || !decisionForm.content}>
              {isCreatingDecision ? <Spinner className="h-4 w-4 ml-2" /> : null}
              حفظ القرار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إضافة مهمة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {taskForm.agendaItem && (
              <div className="text-sm bg-muted p-2 rounded">البند: {taskForm.agendaItem}</div>
            )}
            <div className="space-y-1">
              <Label>عنوان المهمة *</Label>
              <Input placeholder="أدخل عنوان المهمة" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea placeholder="اختياري" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1">
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
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
          <DialogHeader><DialogTitle>محضر الاجتماع</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>الملخص التنفيذي</Label>
              <Textarea placeholder="ملخص ما تم" value={minutesForm.executiveSummary} onChange={e => setMinutesForm(f => ({ ...f, executiveSummary: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>نقاط النقاش</Label>
              <Textarea placeholder="ما تم مناقشته" value={minutesForm.discussionItems} onChange={e => setMinutesForm(f => ({ ...f, discussionItems: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>المخاطر</Label>
              <Textarea placeholder="مخاطر ومعوقات" value={minutesForm.risks} onChange={e => setMinutesForm(f => ({ ...f, risks: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>متابعة سابقة</Label>
              <Textarea placeholder="نقاط من اجتماعات سابقة" value={minutesForm.previousFollowUp} onChange={e => setMinutesForm(f => ({ ...f, previousFollowUp: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMinutesOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveMinutes} disabled={isSavingMinutes}>
              {isSavingMinutes ? <Spinner className="h-4 w-4 ml-2" /> : null}
              حفظ المحضر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
