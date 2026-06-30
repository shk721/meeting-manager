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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Clock, MapPin, Users, Target, FileText,
  Briefcase, Plus, Trash2, Send, Play, CheckCircle2,
  ChevronDown, ChevronUp, Edit, AlertCircle,
} from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "default" },
  in_progress: { label: "جارٍ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "secondary" },
};

const taskStatusOptions = [
  { value: "open", label: "مفتوح" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "on_hold", label: "معلق" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغى" },
];

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

  // Attendees inline
  const [newAttendeeId, setNewAttendeeId] = useState("");
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);

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
    title: "", description: "", priority: "medium",
    dueDate: "", assigneeId: "", agendaItem: "",
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Minutes
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutesForm, setMinutesForm] = useState({
    executiveSummary: "", risks: "", previousFollowUp: "",
  });
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);

  // Expanded agenda items
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

  const addAttendee = async () => {
    if (!newAttendeeId) return;
    setIsAddingAttendee(true);
    try {
      await apiFetch(`/api/meetings/${meetingId}/attendees`, "POST", { userId: parseInt(newAttendeeId, 10) });
      setNewAttendeeId("");
      refresh();
    } catch (e: any) { setApiError(e.message); }
    finally { setIsAddingAttendee(false); }
  };

  const removeAttendee = async (userId: number) => {
    try {
      await apiFetch(`/api/meetings/${meetingId}/attendees/${userId}`, "DELETE");
      refresh();
    } catch (e: any) { setApiError(e.message); }
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
    setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "", agendaItem });
    setTaskOpen(true);
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) return;
    setIsCreatingTask(true);
    try {
      await apiFetch(`/api/tasks`, "POST", {
        title: taskForm.title,
        description: taskForm.description || undefined,
        status: "open",
        priority: taskForm.priority,
        meetingId,
        agendaItem: taskForm.agendaItem || undefined,
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
    const min = (meeting as any)?.minutes;
    setMinutesForm({
      executiveSummary: min?.executiveSummary ?? "",
      risks: min?.risks ?? "",
      previousFollowUp: min?.previousFollowUp ?? "",
    });
    setMinutesOpen(true);
  };

  const handleSaveMinutes = async () => {
    setIsSavingMinutes(true);
    try {
      const m = meeting as any;
      // Auto-generate discussionItems from agenda items + decisions + tasks
      const discussionItems = (m.agendaItems ?? []).map((item: string, idx: number) => {
        const itemDecisions = (m.decisions ?? []).filter((d: any) => d.agendaItem === item);
        const itemTasks = (m.tasks ?? []).filter((t: any) => t.agendaItem === item);
        let text = `${idx + 1}. ${item}`;
        if (itemDecisions.length > 0) {
          text += "\n   القرارات:";
          itemDecisions.forEach((d: any) => { text += `\n   - ${d.content}`; });
        }
        if (itemTasks.length > 0) {
          text += "\n   المهام:";
          itemTasks.forEach((t: any) => { text += `\n   - ${t.title}${t.assignee ? ` (${t.assignee.fullName})` : ""}`; });
        }
        return text;
      }).join("\n\n");

      await apiFetch(`/api/meetings/${meetingId}/minutes`, "POST", {
        executiveSummary: minutesForm.executiveSummary || undefined,
        discussionItems: discussionItems || undefined,
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
    const min = (meeting as any)?.minutes;
    if (!min) return;
    try {
      await apiFetch(`/api/minutes/${min.id}/approve`, "POST");
      refresh();
    } catch (e: any) { setApiError(e.message); }
  };

  const handleSendMinutes = async () => {
    const min = (meeting as any)?.minutes;
    if (!min) return;
    try {
      await apiFetch(`/api/minutes/${min.id}/send`, "POST");
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
  const tasks: any[] = m.tasks ?? [];
  const decisions: any[] = m.decisions ?? [];

  let currentStep = 1;
  if (hasAgenda) currentStep = 2;
  if (invitationsSent) currentStep = 3;
  if (isStarted) currentStep = 4;
  if (hasMinutes) currentStep = 5;
  if (minutesApproved) currentStep = 6;
  if (minutesSent) currentStep = 7;
  if (isClosed) currentStep = 8;

  const toggleItem = (idx: number) =>
    setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

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
            <Button onClick={() => patchMeeting({ status: "in_progress" })} disabled={isPending} size="sm">
              <Play className="h-4 w-4 ml-1" />
              بدء الاجتماع
            </Button>
          )}
          {m.status === "in_progress" && (
            <Button onClick={() => patchMeeting({ status: "completed" })} disabled={isPending} size="sm" variant="destructive">
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

      {/* PRIMARY: Agenda Card (full-width, dominant) */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5 text-primary" />
                جدول الأعمال
                <Badge variant="outline" className="text-xs font-normal">
                  {m.agendaItems?.length ?? 0} بند
                </Badge>
              </CardTitle>
              {/* Attendees inline management */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>المشاركون ({m.attendees?.length ?? 0})</span>
                  {invitationsSent && (
                    <Badge variant={"success" as any} className="text-xs mr-2">تم إرسال الدعوات</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(m.attendees ?? []).map((a: any) => (
                    <span key={a.id} className="flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                      {a.fullName}
                      <button
                        onClick={() => removeAttendee(a.id)}
                        className="text-muted-foreground hover:text-destructive ml-0.5 leading-none"
                        title="إزالة"
                      >✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={newAttendeeId}
                    onChange={e => setNewAttendeeId(e.target.value)}
                    className="text-xs border rounded px-2 py-1 bg-background flex-1 max-w-[200px]"
                  >
                    <option value="">إضافة مشارك…</option>
                    {((users ?? []) as any[])
                      .filter((u: any) => !(m.attendees ?? []).find((a: any) => a.id === u.id))
                      .map((u: any) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={addAttendee} disabled={!newAttendeeId || isAddingAttendee}>
                    {isAddingAttendee ? <Spinner className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {hasAttendees && !invitationsSent && (
                <Button size="sm" variant="outline" onClick={() => patchMeeting({ invitationsSentAt: new Date().toISOString() })} disabled={isPending}>
                  <Send className="h-3 w-3 ml-1" />
                  إرسال الدعوات
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openAgendaDialog}>
                <Edit className="h-3 w-3 ml-1" />
                تعديل الجدول
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasAgenda ? (
            <ol className="space-y-3">
              {m.agendaItems.map((item: string, idx: number) => {
                const itemDecisions = decisions.filter((d: any) => d.agendaItem === item);
                const itemTasks = tasks.filter((t: any) => t.agendaItem === item);
                const isExpanded = expandedItems[idx] ?? isStarted;
                const hasContent = itemDecisions.length > 0 || itemTasks.length > 0;

                return (
                  <li key={idx} className="border rounded-xl overflow-hidden bg-card">
                    {/* Agenda item header */}
                    <div
                      className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggleItem(idx)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{item}</span>
                        {hasContent && (
                          <div className="flex gap-1">
                            {itemDecisions.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{itemDecisions.length} قرار</Badge>
                            )}
                            {itemTasks.length > 0 && (
                              <Badge variant="outline" className="text-xs">{itemTasks.length} مهمة</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isStarted && (
                          <>
                            <Button
                              size="sm" variant="ghost" className="h-8 text-xs gap-1"
                              onClick={e => { e.stopPropagation(); openDecisionDialog(item); }}
                            >
                              <Plus className="h-3 w-3" />
                              قرار
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8 text-xs gap-1"
                              onClick={e => { e.stopPropagation(); openTaskDialog(item); }}
                            >
                              <Plus className="h-3 w-3" />
                              مهمة
                            </Button>
                          </>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10 divide-y">
                        {/* Decisions for this item */}
                        {itemDecisions.length > 0 && (
                          <div className="p-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">القرارات</h4>
                            <ul className="space-y-2">
                              {itemDecisions.map((d: any, di: number) => (
                                <li key={d.id} className="flex gap-2 items-start">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                    {di + 1}
                                  </span>
                                  <div>
                                    <p className="text-sm">{d.content}</p>
                                    {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Tasks for this item */}
                        {itemTasks.length > 0 && (
                          <div className="p-4">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">المهام</h4>
                            <ul className="space-y-2">
                              {itemTasks.map((t: any) => (
                                <li key={t.id} className="flex items-center gap-3 text-sm">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium truncate block">{t.title}</span>
                                    {t.assignee && (
                                      <span className="text-xs text-muted-foreground">{t.assignee.fullName}</span>
                                    )}
                                  </div>
                                  {t.dueDate && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {new Date(t.dueDate).toLocaleDateString("ar-SA")}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {priorityMap[t.priority] || t.priority}
                                  </Badge>
                                  <div className="shrink-0">
                                    <Select value={t.status} onValueChange={v => handleUpdateTaskStatus(t.id, v)}>
                                      <SelectTrigger className="h-7 text-xs w-[110px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {taskStatusOptions.map(o => (
                                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Empty state when started but nothing added */}
                        {isStarted && itemDecisions.length === 0 && itemTasks.length === 0 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            أضف قرارات أو مهام لهذا البند
                          </div>
                        )}

                        {/* Unlinked tasks/decisions notice when not started */}
                        {!isStarted && itemDecisions.length === 0 && itemTasks.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            ابدأ الاجتماع لتسجيل القرارات والمهام
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="text-center py-10">
              <Target className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">لم يتم تحديد جدول أعمال بعد</p>
              <Button onClick={openAgendaDialog}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة جدول الأعمال
              </Button>
            </div>
          )}

          {/* Unlinked tasks/decisions (not associated with any agenda item) */}
          {(() => {
            const unlinkedDecisions = decisions.filter((d: any) => !d.agendaItem);
            const unlinkedTasks = tasks.filter((t: any) => !t.agendaItem);
            if (unlinkedDecisions.length === 0 && unlinkedTasks.length === 0) return null;
            return (
              <div className="mt-4 border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 p-3 bg-muted/30">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">بنود غير مرتبطة بجدول الأعمال</span>
                </div>
                <div className="p-3 space-y-1">
                  {unlinkedDecisions.map((d: any) => (
                    <p key={d.id} className="text-sm pr-3 border-r-2 border-blue-300">{d.content}</p>
                  ))}
                  {unlinkedTasks.map((t: any) => (
                    <p key={t.id} className="text-sm pr-3 border-r-2 border-orange-300">{t.title}</p>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Minutes Card */}
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
                {hasMinutes ? "تعديل" : "إنشاء المحضر"}
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
                  إرسال
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Auto-generated minutes from agenda */}
          {hasAgenda && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                بنود الاجتماع وما يرتبط بها
              </h4>
              <div className="space-y-4">
                {m.agendaItems.map((item: string, idx: number) => {
                  const itemDecisions = decisions.filter((d: any) => d.agendaItem === item);
                  const itemTasks = tasks.filter((t: any) => t.agendaItem === item);
                  return (
                    <div key={idx} className="border-r-2 border-primary/40 pr-3">
                      <p className="font-medium text-sm">{idx + 1}. {item}</p>
                      {itemDecisions.length > 0 && (
                        <div className="mt-2 mr-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">القرارات:</p>
                          {itemDecisions.map((d: any) => (
                            <p key={d.id} className="text-sm text-muted-foreground">• {d.content}</p>
                          ))}
                        </div>
                      )}
                      {itemTasks.length > 0 && (
                        <div className="mt-2 mr-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">المهام:</p>
                          {itemTasks.map((t: any) => (
                            <p key={t.id} className="text-sm text-muted-foreground">
                              • {t.title}
                              {t.assignee && <span className="text-xs"> ({t.assignee.fullName})</span>}
                            </p>
                          ))}
                        </div>
                      )}
                      {itemDecisions.length === 0 && itemTasks.length === 0 && (
                        <p className="text-xs text-muted-foreground mr-3 mt-1">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stored minutes fields */}
          {hasMinutes && (
            <div className="space-y-3 pt-4 border-t">
              {m.minutes.executiveSummary && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">الملخص التنفيذي</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.executiveSummary}</p>
                </div>
              )}
              {m.minutes.risks && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">المخاطر</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.risks}</p>
                </div>
              )}
              {m.minutes.previousFollowUp && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">متابعة سابقة</h4>
                  <p className="text-sm whitespace-pre-wrap">{m.minutes.previousFollowUp}</p>
                </div>
              )}
              {minutesSent && (
                <p className="text-xs text-muted-foreground">
                  أُرسل المحضر: {new Date(m.minutesSentAt).toLocaleString("ar-SA")}
                </p>
              )}
            </div>
          )}

          {!hasMinutes && !hasAgenda && (
            <p className="text-muted-foreground text-sm">أضف جدول الأعمال أولاً لإنشاء المحضر.</p>
          )}
        </CardContent>
      </Card>

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
          <DialogHeader><DialogTitle>محضر الاجتماع — ملاحظات إضافية</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground px-1">
            بنود الجدول والقرارات والمهام تُدرج تلقائياً في المحضر. أضف هنا أي معلومات إضافية.
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>الملخص التنفيذي</Label>
              <Textarea placeholder="ملخص ما تم" value={minutesForm.executiveSummary} onChange={e => setMinutesForm(f => ({ ...f, executiveSummary: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>المخاطر والمعوقات</Label>
              <Textarea placeholder="مخاطر ومعوقات" value={minutesForm.risks} onChange={e => setMinutesForm(f => ({ ...f, risks: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>متابعة اجتماعات سابقة</Label>
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
