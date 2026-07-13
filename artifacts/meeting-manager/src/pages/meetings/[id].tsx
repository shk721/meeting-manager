import { useState } from "react";
import { Link } from "wouter";
import {
  useGetMeeting, useGetUsers,
  getGetMeetingQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Clock, MapPin, Users, Target, FileText,
  Briefcase, Plus, Send, Play, CheckCircle2,
  Edit, AlertCircle, RefreshCw, Download,
} from "lucide-react";
import { RecurringMeetingDialog } from "@/components/RecurringMeetingDialog";
import { ReminderSettings } from "@/components/ReminderSettings";
import { CollaborativeNotes } from "@/components/CollaborativeNotes";
import { LiveAttendance } from "@/components/LiveAttendance";
import { ExportModal } from "@/components/ExportModal";
import WorkspaceLayout from "@/components/WorkspaceLayout";

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
    <div className="flex flex-col items-center gap-1 min-w-[52px]">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
        done ? "bg-green-500 border-green-500 text-white" :
        active ? "bg-blue-500 border-blue-500 text-white" :
        "bg-background border-muted-foreground/30 text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
      </div>
      <span className={`text-[9px] text-center leading-tight ${active ? "text-blue-600 font-medium" : done ? "text-green-600" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return <div className={`flex-1 h-0.5 mt-3.5 ${done ? "bg-green-500" : "bg-muted-foreground/20"}`} />;
}

const AGENDA_STATUS_CYCLE: Record<string, string> = {
  pending: "discussed",
  discussed: "deferred",
  deferred: "cancelled",
  cancelled: "pending",
};

const AGENDA_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "#f4f6f2", color: "#5a675a",  label: "معلّق" },
  discussed: { bg: "#e8f2ea", color: "#1f7a4d",  label: "نوقش" },
  deferred:  { bg: "#fbf1dd", color: "#a97918",  label: "مؤجل" },
  cancelled: { bg: "#fbeeea", color: "#c0492f",  label: "ملغى" },
};

function AgendaItemDetail({ item, onClose }: { item: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function generatePdf() {
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "agenda_item", entityId: item.id }),
      });
      if (!res.ok) throw new Error();
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
    } catch {
      alert("تعذّر توليد التقرير");
    } finally {
      setGeneratingPdf(false);
    }
  }

  const { data: detail } = useQuery<any>({
    queryKey: ["agenda-item-detail", item.id],
    queryFn: async () => {
      const res = await fetch(`/api/agenda-items/${item.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const postComment = useMutation({
    mutationFn: (content: string) => apiFetch(`/api/agenda-items/${item.id}/comments`, "POST", { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-item-detail", item.id] }); setNewComment(""); setAddingComment(false); },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: number) => apiFetch(`/api/agenda-items/${item.id}/comments/${commentId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda-item-detail", item.id] }),
  });

  const decisions: any[] = detail?.decisions ?? [];
  const tasks: any[] = detail?.tasks ?? [];
  const deliverables: any[] = detail?.deliverables ?? [];
  const comments: any[] = detail?.comments ?? [];

  const OUTCOME_LABELS: Record<string, string> = {
    pending: "معلّق", discussed: "نوقش", decided: "قُرِّر", deferred: "مؤجل", cancelled: "ملغى",
  };
  const OUTCOME_COLORS: Record<string, string> = {
    pending: "#8a978a", discussed: "#1f7a4d", decided: "#1a6dc2", deferred: "#a97918", cancelled: "#c0492f",
  };

  return (
    <div style={{ borderTop: "1px solid #e6ece4", marginTop: 4 }}>
      {/* شريط الإجراءات */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 12px 0" }}>
        <button
          onClick={generatingPdf ? undefined : generatePdf}
          disabled={generatingPdf}
          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: generatingPdf ? "#c8d8c8" : "#1f7a4d", color: "#fff", border: "none", cursor: generatingPdf ? "default" : "pointer", fontWeight: 600 }}
        >
          {generatingPdf ? "جارٍ التوليد..." : "📄 توليد PDF"}
        </button>
      </div>

      {/* ملاحظات النقاش */}
      {(detail?.discussionNotes || detail?.notes) && (
        <div style={{ padding: "8px 12px", background: "#f8faf8", fontSize: 13, color: "#3a4a3a" }}>
          {detail.discussionNotes || detail.notes}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, padding: "10px 12px", flexWrap: "wrap" }}>
        {/* القرارات */}
        {decisions.length > 0 && (
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5a675a", marginBottom: 4 }}>القرارات ({decisions.length})</div>
            {decisions.map((d: any) => (
              <div key={d.id} style={{ fontSize: 12, padding: "3px 0", color: "#1c261c", borderBottom: "1px solid #f0f4f0" }}>
                {d.title || d.content.slice(0, 60)}
                {d.content.length > 60 && "…"}
              </div>
            ))}
          </div>
        )}

        {/* المهام */}
        {tasks.length > 0 && (
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5a675a", marginBottom: 4 }}>المهام ({tasks.length})</div>
            {tasks.map((t: any) => (
              <div key={t.id} style={{ fontSize: 12, padding: "3px 0", color: "#1c261c", display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.status === "completed" ? "#1f7a4d" : "#e0a020", flexShrink: 0 }} />
                {t.title}
              </div>
            ))}
          </div>
        )}

        {/* المخرجات */}
        {deliverables.length > 0 && (
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5a675a", marginBottom: 4 }}>المخرجات ({deliverables.length})</div>
            {deliverables.map((d: any) => (
              <div key={d.id} style={{ fontSize: 12, padding: "3px 0", color: "#1c261c" }}>
                {d.title} <span style={{ color: "#8a978a" }}>({d.progressPercent}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* التعليقات */}
      <div style={{ padding: "6px 12px 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#5a675a", marginBottom: 6 }}>
          التعليقات {comments.length > 0 && `(${comments.length})`}
        </div>
        {comments.map((c: any) => (
          <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }} className="group">
            <div style={{ fontSize: 12, flex: 1 }}>
              <span style={{ fontWeight: 600, color: "#3a4a3a" }}>{c.author?.name ?? "مجهول"}: </span>
              <span style={{ color: "#3a4a3a" }}>{c.content}</span>
              <span style={{ color: "#a0a8a0", fontSize: 10, marginRight: 6 }}>
                {new Date(c.createdAt).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button
              onClick={() => deleteComment.mutate(c.id)}
              className="opacity-0 group-hover:opacity-100"
              style={{ border: "none", background: "none", color: "#c0492f", cursor: "pointer", fontSize: 14, lineHeight: 1, flexShrink: 0 }}
            >×</button>
          </div>
        ))}
        {addingComment ? (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <input
              autoFocus
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newComment.trim()) postComment.mutate(newComment.trim());
                if (e.key === "Escape") { setAddingComment(false); setNewComment(""); }
              }}
              placeholder="أضف تعليقاً..."
              style={{ flex: 1, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #d0d8d0", outline: "none" }}
            />
            <button
              onClick={() => { if (newComment.trim()) postComment.mutate(newComment.trim()); }}
              disabled={!newComment.trim() || postComment.isPending}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "#1f7a4d", color: "#fff", border: "none", cursor: "pointer" }}
            >إرسال</button>
            <button
              onClick={() => { setAddingComment(false); setNewComment(""); }}
              style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "#f0f4f0", color: "#5a675a", border: "none", cursor: "pointer" }}
            >إلغاء</button>
          </div>
        ) : (
          <button
            onClick={() => setAddingComment(true)}
            style={{ fontSize: 11, color: "#5a8a6a", border: "none", background: "none", cursor: "pointer", padding: 0, marginTop: 2 }}
          >+ تعليق</button>
        )}
      </div>
    </div>
  );
}

function AgendaItemsSection({ meetingId }: { meetingId: number }) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["agenda-items", meetingId],
    queryFn: async () => {
      const res = await fetch(`/api/agenda-items?meetingId=${meetingId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load agenda items");
      return res.json();
    },
  });

  const createItem = useMutation({
    mutationFn: (title: string) => apiFetch("/api/agenda-items", "POST", { meetingId, title, orderIndex: items.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-items", meetingId] }); setNewTitle(""); setAdding(false); },
  });

  const patchItem = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiFetch(`/api/agenda-items/${id}`, "PATCH", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agenda-items", meetingId] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/agenda-items/${id}`, "DELETE"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agenda-items", meetingId] }); setExpandedId(null); },
  });

  const sorted = [...items].sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">بنود جدول الأعمال</span>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="w-3 h-3 ml-1" /> إضافة بند
        </Button>
      </div>
      {adding && (
        <div className="flex gap-2 mb-3">
          <Input
            autoFocus
            placeholder="عنوان البند..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newTitle.trim()) createItem.mutate(newTitle.trim());
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
          />
          <Button size="sm" onClick={() => { if (newTitle.trim()) createItem.mutate(newTitle.trim()); }} disabled={!newTitle.trim() || createItem.isPending}>حفظ</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }}>إلغاء</Button>
        </div>
      )}
      {sorted.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-6">لا توجد بنود. أضف بنداً أعلاه.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sorted.map((item: any) => {
            const st = AGENDA_STATUS_STYLE[item.status] ?? AGENDA_STATUS_STYLE.pending;
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} style={{ border: "1px solid #e6ece4", borderRadius: 8, overflow: "hidden" }}>
                <div
                  className="flex items-center gap-2 p-2 hover:bg-muted/40 transition-colors group cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <span className="text-muted-foreground text-xs w-5 text-center shrink-0">{(item.orderIndex ?? 0) + 1}</span>
                  <span className="flex-1 text-sm">{item.title}</span>
                  {item.durationMin && <span className="text-xs text-muted-foreground shrink-0">{item.durationMin} د</span>}
                  <button
                    onClick={e => { e.stopPropagation(); patchItem.mutate({ id: item.id, body: { status: AGENDA_STATUS_CYCLE[item.status] ?? "discussed" } }); }}
                    style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: st.bg, color: st.color, border: "none", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    {st.label}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteItem.mutate(item.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                  >×</button>
                </div>
                {isExpanded && (
                  <AgendaItemDetail item={item} onClose={() => setExpandedId(null)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ entityType, entityId }: { entityType: string; entityId: number }) {
  const [busy, setBusy] = useState(false);

  const { data: docs = [], refetch } = useQuery<any[]>({
    queryKey: ["documents", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/documents?entityType=${entityType}&entityId=${entityId}`,
        { credentials: "include" },
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (!res.ok) throw new Error("فشل التوليد");
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
      refetch();
    } catch {
      alert("تعذّر توليد التقرير. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الوثائق المولّدة
          </CardTitle>
          <Button size="sm" onClick={generate} disabled={busy}>
            <Download className="h-3.5 w-3.5 ml-1" />
            {busy ? "جارٍ التوليد..." : "توليد تقرير PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد وثائق مولّدة بعد</p>
            <p className="text-xs text-muted-foreground mt-1">اضغط "توليد تقرير PDF" لإنشاء أول تقرير</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleString("ar-SA")}
                  </p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                >
                  <Download className="h-3 w-3" />
                  تحميل
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MeetingDetail({ id, tab }: { id: string; tab?: string }) {
  const meetingId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const activeTab = tab ?? "agenda";

  const { data: meeting, isLoading } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) },
  });
  const { data: users } = useGetUsers();

  const [isPending, setIsPending] = useState(false);
  const [apiError, setApiError] = useState("");

  // Attendees
  const [newAttendeeId, setNewAttendeeId] = useState("");
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);

  // Decision dialog
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ content: "", notes: "" });
  const [isCreatingDecision, setIsCreatingDecision] = useState(false);

  // Task dialog
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", priority: "medium", dueDate: "", assigneeId: "",
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Minutes
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutesForm, setMinutesForm] = useState({
    executiveSummary: "", risks: "", previousFollowUp: "",
  });
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);

  // Recurring
  const [recurringOpen, setRecurringOpen] = useState(false);

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

  const handleCreateDecision = async () => {
    if (!decisionForm.content) return;
    setIsCreatingDecision(true);
    try {
      await apiFetch(`/api/decisions`, "POST", {
        content: decisionForm.content,
        meetingId,
        notes: decisionForm.notes || undefined,
      });
      refresh();
      setDecisionOpen(false);
    } catch (e: any) { setApiError(e.message); }
    finally { setIsCreatingDecision(false); }
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
      await apiFetch(`/api/meetings/${meetingId}/minutes`, "POST", {
        executiveSummary: minutesForm.executiveSummary || undefined,
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
  const invitationsSent = !!m.invitationsSentAt;
  const isStarted = m.status === "in_progress" || m.status === "completed";
  const hasMinutes = !!m.minutes;
  const minutesApproved = m.minutes?.status === "approved";
  const minutesSent = !!m.minutesSentAt;
  const isClosed = m.status === "completed";
  const tasks: any[] = m.tasks ?? [];
  const decisions: any[] = m.decisions ?? [];
  const hasAttendees = (m.attendees?.length ?? 0) > 0;

  let currentStep = 1;
  if ((m.agendaItems?.length ?? 0) > 0 || tasks.length > 0 || decisions.length > 0) currentStep = 2;
  if (invitationsSent) currentStep = 3;
  if (isStarted) currentStep = 4;
  if (hasMinutes) currentStep = 5;
  if (minutesApproved) currentStep = 6;
  if (minutesSent) currentStep = 7;
  if (isClosed) currentStep = 8;

  const meetingTabs = [
    { id: "agenda", label: "جدول الأعمال" },
    { id: "decisions", label: "القرارات", badge: decisions.length },
    { id: "tasks", label: "المهام", badge: tasks.length },
    { id: "minutes", label: "المحضر" },
    { id: "documents", label: "الوثائق" },
  ];

  const statusInfo = statusMap[m.status];

  const sidebar = (
    <div className="flex flex-col gap-4">
      {/* Metadata */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{new Date(m.date + "T00:00:00").toLocaleDateString("ar-SA")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{m.time}</span>
          </div>
          {m.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{m.location}</span>
            </div>
          )}
          {m.project && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{m.project}</span>
            </div>
          )}
          {m.objectives && (
            <div className="flex items-start gap-2 text-sm pt-1 border-t">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-xs leading-relaxed">{m.objectives}</span>
            </div>
          )}
          {m.chairperson && (
            <div className="flex items-center gap-2 text-sm border-t pt-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs">الرئيس: <span className="font-medium">{m.chairperson.fullName}</span></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendees */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              المشاركون ({m.attendees?.length ?? 0})
            </span>
            {invitationsSent && (
              <Badge variant={"success" as any} className="text-[10px]">دعوات أُرسلت</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
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
          <div className="flex gap-1.5">
            <select
              value={newAttendeeId}
              onChange={e => setNewAttendeeId(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-background flex-1"
              style={{ fontSize: 12 }}
            >
              <option value="">إضافة مشارك…</option>
              {((users ?? []) as any[])
                .filter((u: any) => !(m.attendees ?? []).find((a: any) => a.id === u.id))
                .map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
            </select>
            <Button size="sm" variant="outline" onClick={addAttendee} disabled={!newAttendeeId || isAddingAttendee} className="h-7 px-2">
              {isAddingAttendee ? <Spinner className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {hasAttendees && !invitationsSent && (
          <Button size="sm" variant="outline" onClick={() => patchMeeting({ invitationsSentAt: new Date().toISOString() })} disabled={isPending} className="w-full">
            <Send className="h-3 w-3 ml-1" />
            إرسال الدعوات
          </Button>
        )}
        {!(m as any).isRecurring && !(m as any).parentMeetingId && m.status === "scheduled" && (
          <Button size="sm" variant="outline" onClick={() => setRecurringOpen(true)} className="w-full">
            <RefreshCw className="h-3.5 w-3.5 ml-1" />
            تعيين تكرار
          </Button>
        )}
        <ExportModal meetingId={meetingId} />
        {m.status === "scheduled" && (
          <Button onClick={() => patchMeeting({ status: "in_progress" })} disabled={isPending} size="sm" className="w-full">
            <Play className="h-4 w-4 ml-1" />
            بدء الاجتماع
          </Button>
        )}
        {m.status === "in_progress" && (
          <Button onClick={() => patchMeeting({ status: "completed" })} disabled={isPending} size="sm" variant="destructive" className="w-full">
            <CheckCircle2 className="h-4 w-4 ml-1" />
            إغلاق الاجتماع
          </Button>
        )}
      </div>

      {/* Lifecycle stepper */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-0 overflow-x-auto">
            <StepIndicator done={currentStep > 1} active={currentStep === 1} label="الإنشاء" num={1} />
            <StepLine done={currentStep > 1} />
            <StepIndicator done={currentStep > 2} active={currentStep === 2} label="الجدول" num={2} />
            <StepLine done={currentStep > 2} />
            <StepIndicator done={currentStep > 3} active={currentStep === 3} label="الدعوات" num={3} />
            <StepLine done={currentStep > 3} />
            <StepIndicator done={currentStep > 4} active={currentStep === 4} label="البدء" num={4} />
            <StepLine done={currentStep > 4} />
            <StepIndicator done={currentStep > 5} active={currentStep === 5} label="المحضر" num={5} />
            <StepLine done={currentStep > 5} />
            <StepIndicator done={currentStep > 6} active={currentStep === 6} label="الاعتماد" num={6} />
            <StepLine done={currentStep > 6} />
            <StepIndicator done={currentStep > 7} active={currentStep === 7} label="الإرسال" num={7} />
            <StepLine done={currentStep > 7} />
            <StepIndicator done={currentStep >= 8} active={currentStep === 8} label="الإغلاق" num={8} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {apiError && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-4 mx-0"
          style={{ margin: "-20px -26px 20px", padding: "8px 26px" }}>
          {apiError}
        </p>
      )}

      <WorkspaceLayout
        breadcrumb={{ label: "الاجتماعات", href: "/meetings" }}
        title={m.title}
        statusBadge={
          <Badge variant={(statusInfo?.variant as any) || "default"} className="shrink-0">
            {statusInfo?.label || m.status}
          </Badge>
        }
        headerRight={
          (m as any).isRecurring ? (
            <Badge variant="outline" className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
              متكرر
            </Badge>
          ) : undefined
        }
        tabs={meetingTabs}
        activeTab={activeTab}
        basePath={`/meetings/${meetingId}`}
        sidebar={sidebar}
      >
        {/* Agenda tab */}
        {activeTab === "agenda" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5">
                <AgendaItemsSection meetingId={meetingId} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <ReminderSettings meetingId={meetingId} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Decisions tab */}
        {activeTab === "decisions" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  القرارات
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setDecisionForm({ content: "", notes: "" }); setDecisionOpen(true); }}>
                  <Plus className="h-3 w-3 ml-1" />
                  قرار جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد قرارات مسجلة بعد</p>
              ) : (
                <div className="space-y-3">
                  {decisions.map((d: any, idx: number) => (
                    <div key={d.id} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{d.content}</p>
                        {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                        {d.agendaItem && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            {d.agendaItem}
                          </p>
                        )}
                        <Link href={`/decisions/${d.id}`} className="text-xs text-primary mt-1.5 inline-block hover:underline">
                          عرض التفاصيل ←
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tasks tab */}
        {activeTab === "tasks" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  المهام
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setTaskForm({ title: "", description: "", priority: "medium", dueDate: "", assigneeId: "" }); setTaskOpen(true); }}>
                  <Plus className="h-3 w-3 ml-1" />
                  مهمة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد مهام مضافة بعد</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.assignee && (
                            <span className="text-xs text-muted-foreground">{t.assignee.fullName}</span>
                          )}
                          {t.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(t.dueDate + "T00:00:00").toLocaleDateString("ar-SA")}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {priorityMap[t.priority] || t.priority}
                          </Badge>
                        </div>
                      </div>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Minutes tab */}
        {activeTab === "minutes" && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
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
                {hasMinutes ? (
                  <div className="space-y-3">
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
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        أُرسل المحضر: {new Date(m.minutesSentAt).toLocaleString("ar-SA")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">لم يُنشأ المحضر بعد</p>
                )}
              </CardContent>
            </Card>

            <CollaborativeNotes meetingId={meetingId} />
            <LiveAttendance meetingId={meetingId} />
          </div>
        )}

        {/* Documents tab */}
        {activeTab === "documents" && (
          <DocumentsTab entityType="meeting" entityId={meetingId} />
        )}
      </WorkspaceLayout>

      {/* Decision Dialog */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تسجيل قرار</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
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
            أضف هنا ملاحظاتك وملخصاتك. القرارات والمهام تُعرض تلقائياً في التقرير المصدّر.
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

      {/* Recurring Meeting Dialog */}
      <RecurringMeetingDialog
        meetingId={meetingId}
        open={recurringOpen}
        onClose={() => setRecurringOpen(false)}
        onSuccess={refresh}
      />
    </>
  );
}
