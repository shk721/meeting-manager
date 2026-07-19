import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, Plus, Trash2, ExternalLink, Edit2, Check, X,
  Hash, Link2, FileText, Clock, User, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_STATUSES = [
  { value: "new", label: "جديد" },
  { value: "pending_classification", label: "في انتظار التصنيف" },
  { value: "for_info", label: "للاطلاع" },
  { value: "requires_action", label: "يستلزم إجراء" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "waiting_external", label: "انتظار خارجي" },
  { value: "replied", label: "تم الرد" },
  { value: "verified_complete", label: "مكتمل وموثق" },
  { value: "closed", label: "مغلق" },
];
const PRIORITIES = [
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "عادية" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];
const ACTION_REQUIRED = [
  { value: "pending_classification", label: "في انتظار التصنيف" },
  { value: "for_info", label: "للاطلاع فقط" },
  { value: "requires_action", label: "يستلزم إجراء" },
  { value: "undetermined", label: "غير محدد" },
];
const LINK_TYPES = [
  "رد_على", "وردت_بناء_على", "إشارة_إلى", "إلحاق", "استكمال",
  "إحالة", "نسخة_من", "تلغي", "مرتبطة_بالموضوع",
];
const ENTITY_TYPES = [
  { value: "meeting", label: "اجتماع" },
  { value: "decision", label: "قرار" },
  { value: "task", label: "مهمة" },
  { value: "plan", label: "خطة" },
  { value: "agenda_item", label: "بند أجندة" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    new: "bg-gray-100 text-gray-700",
    pending_classification: "bg-yellow-50 text-yellow-700",
    for_info: "bg-blue-50 text-blue-700",
    requires_action: "bg-red-50 text-red-700",
    in_progress: "bg-indigo-50 text-indigo-700",
    waiting_external: "bg-orange-50 text-orange-700",
    replied: "bg-teal-50 text-teal-700",
    verified_complete: "bg-green-50 text-green-700",
    closed: "bg-gray-50 text-gray-500",
  };
  const label = PLATFORM_STATUSES.find(s => s.value === status)?.label ?? status;
  const cls = map[status] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Inline edit field ─────────────────────────────────────────────────────────

function InlineEdit({
  label, value, onSave, type = "text", multiline = false,
}: { label: string; value: string | null; onSave: (v: string) => void; type?: string; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (editing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">{label}</Label>
        {multiline
          ? <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} autoFocus />
          : <Input type={type} value={draft} onChange={e => setDraft(e.target.value)} autoFocus />}
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => { onSave(draft); setEditing(false); }}><Check className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(value ?? ""); setEditing(false); }}><X className="w-3 h-3" /></Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group cursor-pointer" onClick={() => { setDraft(value ?? ""); setEditing(true); }}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm ${value ? "text-gray-900" : "text-gray-300 italic"} group-hover:bg-gray-50 rounded px-1 -mx-1 transition-colors`}>
        {value || "—"}
      </p>
    </div>
  );
}

// ── Add Identifier Dialog ─────────────────────────────────────────────────────

function AddIdentifierDialog({ transactionId, open, onClose }: { transactionId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ number: "", numberType: "وارد_داخلي", issuingSystem: "", isPrimary: false });

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/identifiers`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transaction", transactionId] }); toast({ title: "تم إضافة الرقم المرجعي" }); onClose(); },
    onError: () => toast({ title: "فشل الإضافة", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إضافة رقم مرجعي</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>الرقم *</Label><Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} /></div>
          <div>
            <Label>نوع الرقم</Label>
            <Select value={form.numberType} onValueChange={v => setForm(f => ({ ...f, numberType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["صادر_خارجي", "وارد_داخلي", "قيد_مراسلات", "نظام_آخر", "مرجع_رد"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>النظام المصدر</Label><Input value={form.issuingSystem} onChange={e => setForm(f => ({ ...f, issuingSystem: e.target.value }))} /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
            <span className="text-sm">رقم مرجعي أساسي</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.number || mut.isPending}>إضافة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Context Link Dialog ───────────────────────────────────────────────────

function AddContextLinkDialog({ transactionId, open, onClose }: { transactionId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ entityType: "meeting", entityId: "", notes: "" });

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/context-links`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transaction", transactionId] }); toast({ title: "تم إضافة الارتباط" }); onClose(); },
    onError: () => toast({ title: "فشل الإضافة", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>ربط بكيان في المنصة</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>نوع الكيان</Label>
            <Select value={form.entityType} onValueChange={v => setForm(f => ({ ...f, entityType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>رقم التعريف *</Label><Input type="number" value={form.entityId} onChange={e => setForm(f => ({ ...f, entityId: e.target.value }))} placeholder="مثل: 5" /></div>
          <div><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.entityId || mut.isPending}>إضافة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TransactionDetail({ id }: { id: string }) {
  const transactionId = parseInt(id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showAddId, setShowAddId] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);

  const { data: tx, isLoading, isError } = useQuery<any>({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transaction", transactionId] }); qc.invalidateQueries({ queryKey: ["transactions"] }); },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteIdentifier = useMutation({
    mutationFn: async (identifierId: number) => {
      await fetch(`/api/transactions/${transactionId}/identifiers/${identifierId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transaction", transactionId] }),
  });

  const deleteContextLink = useMutation({
    mutationFn: async (linkId: number) => {
      await fetch(`/api/transactions/${transactionId}/context-links/${linkId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transaction", transactionId] }),
  });

  const deleteTx = useMutation({
    mutationFn: async () => {
      await fetch(`/api/transactions/${transactionId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => { toast({ title: "تم حذف المعاملة" }); navigate("/transactions"); },
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">جارٍ التحميل...</div>;
  if (isError || !tx) return <div className="p-8 text-center text-red-500">تعذّر تحميل المعاملة</div>;

  return (
    <div className="p-6 max-w-5xl" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/transactions" className="hover:text-blue-600">سجل المعاملات</Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-gray-900 font-medium">{tx.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="col-span-2 space-y-5">
          {/* Title + Status row */}
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <InlineEdit
                  label="العنوان / الموضوع"
                  value={tx.title}
                  onSave={v => updateMut.mutate({ title: v })}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-4">
                {statusBadge(tx.platformStatus)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => { if (confirm("حذف هذه المعاملة؟")) deleteTx.mutate(); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <InlineEdit
                label="الملخص"
                value={tx.summary}
                onSave={v => updateMut.mutate({ summary: v })}
                multiline
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <InlineEdit label="الجهة المرسِلة" value={tx.sendingParty} onSave={v => updateMut.mutate({ sendingParty: v })} />
              <InlineEdit label="الجهة المرسَل إليها" value={tx.receivingParty} onSave={v => updateMut.mutate({ receivingParty: v })} />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <InlineEdit label="تاريخ المعاملة" value={tx.transactionDate} onSave={v => updateMut.mutate({ transactionDate: v })} type="date" />
              <InlineEdit label="تاريخ الاستلام" value={tx.receiptDate} onSave={v => updateMut.mutate({ receiptDate: v })} type="date" />
              <InlineEdit label="تاريخ الاستحقاق" value={tx.dueDate} onSave={v => updateMut.mutate({ dueDate: v })} type="date" />
            </div>
          </div>

          {/* Reference numbers */}
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800 flex items-center gap-2"><Hash className="w-4 h-4" /> أرقام المرجع</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddId(true)}>
                <Plus className="w-3 h-3 ml-1" /> إضافة
              </Button>
            </div>
            {tx.identifiers?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">لا توجد أرقام مرجعية مسجلة</p>
            ) : (
              <div className="space-y-2">
                {tx.identifiers?.map((id: any) => (
                  <div key={id.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <div className="flex items-center gap-3">
                      {id.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">أساسي</span>}
                      <span className="font-mono text-sm font-medium">{id.number}</span>
                      <span className="text-xs text-gray-500">{id.numberType}</span>
                      {id.issuingSystem && <span className="text-xs text-gray-400">({id.issuingSystem})</span>}
                    </div>
                    <button onClick={() => deleteIdentifier.mutate(id.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context links (platform entity links) */}
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800 flex items-center gap-2"><Link2 className="w-4 h-4" /> الارتباطات بالمنصة</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddLink(true)}>
                <Plus className="w-3 h-3 ml-1" /> ربط
              </Button>
            </div>
            {tx.contextLinks?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">لا توجد ارتباطات بكيانات المنصة</p>
            ) : (
              <div className="space-y-2">
                {tx.contextLinks?.map((cl: any) => {
                  const entityLabel = ENTITY_TYPES.find(e => e.value === cl.entityType)?.label ?? cl.entityType;
                  const href = cl.entityType === "meeting" ? `/meetings/${cl.entityId}`
                    : cl.entityType === "plan" ? `/planning/plans/${cl.entityId}`
                    : null;
                  return (
                    <div key={cl.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{entityLabel}</span>
                        <span className="text-xs text-gray-400">#</span>
                        <span className="text-sm font-medium">{cl.entityId}</span>
                        {href && <Link href={href} className="text-blue-500 hover:text-blue-700"><ExternalLink className="w-3 h-3" /></Link>}
                        {cl.notes && <span className="text-xs text-gray-400 mr-2">— {cl.notes}</span>}
                      </div>
                      <button onClick={() => deleteContextLink.mutate(cl.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-medium text-gray-800 mb-3">ملاحظات</h3>
            <InlineEdit label="" value={tx.notes} onSave={v => updateMut.mutate({ notes: v })} multiline />
          </div>
        </div>

        {/* ── Sidebar column ── */}
        <div className="space-y-4">
          {/* Status & meta */}
          <div className="bg-white border rounded-xl p-4 space-y-4">
            <div>
              <Label className="text-xs text-gray-500">الحالة</Label>
              <Select value={tx.platformStatus} onValueChange={v => updateMut.mutate({ platformStatus: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">الأولوية</Label>
              <Select value={tx.priority} onValueChange={v => updateMut.mutate({ priority: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">تصنيف الإجراء</Label>
              <Select value={tx.actionRequired} onValueChange={v => updateMut.mutate({ actionRequired: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_REQUIRED.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parties & dates */}
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">تفاصيل</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">النوع</span>
                <span className="text-gray-800 font-medium">{tx.transactionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الغرض</span>
                <span className="text-gray-800">{tx.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">السرية</span>
                <span className="text-gray-800">{tx.confidentiality}</span>
              </div>
              {tx.officialSystemStatus && (
                <div className="flex justify-between">
                  <span className="text-gray-500">حالة النظام الرسمي</span>
                  <span className="text-gray-800">{tx.officialSystemStatus}</span>
                </div>
              )}
              {tx.assignee && (
                <div className="flex justify-between">
                  <span className="text-gray-500">المكلَّف</span>
                  <span className="text-gray-800">{tx.assignee.fullName}</span>
                </div>
              )}
              {tx.createdBy && (
                <div className="flex justify-between">
                  <span className="text-gray-500">أنشأه</span>
                  <span className="text-gray-800">{tx.createdBy.fullName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">تاريخ الإنشاء</span>
                <span className="text-gray-800">{new Date(tx.createdAt).toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
          </div>

          {/* Completion */}
          {(tx.completionEvidence || tx.replyReference || tx.requiredAction) && (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">الإنجاز</h4>
              {tx.requiredAction && (
                <div>
                  <p className="text-xs text-gray-500">الإجراء المطلوب</p>
                  <p className="text-sm text-gray-800">{tx.requiredAction}</p>
                </div>
              )}
              {tx.completionEvidence && (
                <div>
                  <p className="text-xs text-gray-500">دليل الإنجاز</p>
                  <p className="text-sm text-gray-800">{tx.completionEvidence}</p>
                </div>
              )}
              {tx.replyReference && (
                <div>
                  <p className="text-xs text-gray-500">رقم الرد الصادر</p>
                  <p className="text-sm font-mono text-gray-800">{tx.replyReference}</p>
                </div>
              )}
            </div>
          )}

          {/* External URL */}
          {tx.externalUrl && (
            <a
              href={tx.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-white border rounded-xl p-4"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="truncate">الرابط الخارجي</span>
            </a>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddIdentifierDialog transactionId={transactionId} open={showAddId} onClose={() => setShowAddId(false)} />
      <AddContextLinkDialog transactionId={transactionId} open={showAddLink} onClose={() => setShowAddLink(false)} />
    </div>
  );
}
