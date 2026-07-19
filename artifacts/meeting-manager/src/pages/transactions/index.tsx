import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus, Search, Filter, Inbox, AlertCircle, Clock,
  CheckCircle2, ArrowUpRight, ChevronDown, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Constants ────────────────────────────────────────────────────────────────

const TRANSACTION_TYPES = ["برقية", "خطاب", "تعميم", "بريد_رسمي", "وارد", "صادر", "أخرى"];
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
const ACTION_REQUIRED = [
  { value: "pending_classification", label: "في انتظار التصنيف" },
  { value: "for_info", label: "للاطلاع فقط" },
  { value: "requires_action", label: "يستلزم إجراء" },
  { value: "undetermined", label: "غير محدد" },
];
const PRIORITIES = [
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "عادية" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];
const PURPOSES = [
  { value: "for_info", label: "للاطلاع" },
  { value: "for_action", label: "للتصرف" },
  { value: "for_reply", label: "للرد" },
  { value: "for_referral", label: "للإحالة" },
  { value: "for_follow_up", label: "للمتابعة" },
  { value: "for_filing", label: "للحفظ" },
];

// ── Helper functions ─────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    new: { label: "جديد", variant: "secondary" },
    pending_classification: { label: "في انتظار التصنيف", variant: "outline" },
    for_info: { label: "للاطلاع", variant: "secondary" },
    requires_action: { label: "يستلزم إجراء", variant: "destructive" },
    in_progress: { label: "قيد التنفيذ", variant: "default" },
    waiting_external: { label: "انتظار خارجي", variant: "outline" },
    replied: { label: "تم الرد", variant: "secondary" },
    verified_complete: { label: "مكتمل", variant: "default" },
    closed: { label: "مغلق", variant: "outline" },
  };
  const s = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function priorityColor(priority: string) {
  const map: Record<string, string> = {
    urgent: "text-red-600 font-semibold",
    high: "text-orange-500",
    normal: "text-gray-600",
    low: "text-gray-400",
  };
  return map[priority] ?? "text-gray-600";
}

function priorityLabel(priority: string) {
  const map: Record<string, string> = {
    urgent: "عاجلة", high: "عالية", normal: "عادية", low: "منخفضة",
  };
  return map[priority] ?? priority;
}

// ── New Transaction Dialog ───────────────────────────────────────────────────

function NewTransactionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    transactionType: "", title: "", summary: "",
    sendingParty: "", receivingParty: "",
    transactionDate: "", receiptDate: "", dueDate: "",
    purpose: "for_info", confidentiality: "normal", priority: "normal",
    actionRequired: "pending_classification",
    externalUrl: "", notes: "",
    primaryNumber: "", primaryNumberType: "", primaryIssuingSystem: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const identifiers = form.primaryNumber
        ? [{ number: form.primaryNumber, numberType: form.primaryNumberType || "وارد_داخلي", issuingSystem: form.primaryIssuingSystem || null, isPrimary: true }]
        : [];
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, identifiers }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "تم إنشاء المعاملة بنجاح" });
      onClose();
    },
    onError: () => toast({ title: "فشل إنشاء المعاملة", variant: "destructive" }),
  });

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>معاملة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع المعاملة *</Label>
              <Select value={form.transactionType} onValueChange={v => set("transactionType", v)}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>العنوان / الموضوع *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="موضوع المعاملة" />
          </div>

          <div>
            <Label>الملخص</Label>
            <Textarea value={form.summary} onChange={e => set("summary", e.target.value)} rows={2} placeholder="ملخص مختصر..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الجهة المرسِلة</Label>
              <Input value={form.sendingParty} onChange={e => set("sendingParty", e.target.value)} />
            </div>
            <div>
              <Label>الجهة المرسَل إليها</Label>
              <Input value={form.receivingParty} onChange={e => set("receivingParty", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>تاريخ المعاملة</Label>
              <Input type="date" value={form.transactionDate} onChange={e => set("transactionDate", e.target.value)} />
            </div>
            <div>
              <Label>تاريخ الاستلام</Label>
              <Input type="date" value={form.receiptDate} onChange={e => set("receiptDate", e.target.value)} />
            </div>
            <div>
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الغرض</Label>
              <Select value={form.purpose} onValueChange={v => set("purpose", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تصنيف الإجراء</Label>
              <Select value={form.actionRequired} onValueChange={v => set("actionRequired", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_REQUIRED.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">رقم المرجع الأساسي (اختياري)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">الرقم</Label>
                <Input value={form.primaryNumber} onChange={e => set("primaryNumber", e.target.value)} placeholder="مثل: 1234/2024" />
              </div>
              <div>
                <Label className="text-xs">نوع الرقم</Label>
                <Select value={form.primaryNumberType || "وارد_داخلي"} onValueChange={v => set("primaryNumberType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["صادر_خارجي", "وارد_داخلي", "قيد_مراسلات", "نظام_آخر", "مرجع_رد"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">النظام المصدر</Label>
                <Input value={form.primaryIssuingSystem} onChange={e => set("primaryIssuingSystem", e.target.value)} placeholder="النظام" />
              </div>
            </div>
          </div>

          <div>
            <Label>رابط خارجي</Label>
            <Input value={form.externalUrl} onChange={e => set("externalUrl", e.target.value)} placeholder="https://..." dir="ltr" />
          </div>

          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.transactionType || !form.title || mutation.isPending}>
            {mutation.isPending ? "جارٍ الإنشاء..." : "إنشاء المعاملة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<any[]>({
    queryKey: ["transactions", { search, filterStatus, filterAction, filterPriority, filterType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      if (filterAction) params.set("actionRequired", filterAction);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterType) params.set("transactionType", filterType);
      const res = await fetch(`/api/transactions?${params.toString()}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const hasFilters = filterStatus || filterAction || filterPriority || filterType;
  const clearFilters = () => { setFilterStatus(""); setFilterAction(""); setFilterPriority(""); setFilterType(""); };

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Inbox className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">سجل المعاملات</h1>
            <p className="text-sm text-gray-500">تتبع المراسلات والمعاملات الرسمية وربطها بالقرارات والمهام</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          معاملة جديدة
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pr-9"
              placeholder="بحث في العنوان أو الملخص..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              <X className="w-4 h-4 ml-1" /> مسح الفلاتر
            </Button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {PLATFORM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="تصنيف الإجراء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {ACTION_REQUIRED.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              {TRANSACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-3">
        {isLoading ? "جارٍ التحميل..." : `${transactions.length} معاملة`}
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-gray-400">جارٍ التحميل...</div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Inbox className="w-10 h-10" />
          <p className="text-sm">لا توجد معاملات مسجلة</p>
          <Button variant="outline" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 ml-1" /> أضف أول معاملة
          </Button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">الرقم المرجعي</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">العنوان</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">النوع</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">الحالة</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">الأولوية</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">تاريخ الاستحقاق</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">المكلَّف</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {tx.primaryIdentifier
                      ? <span className="bg-gray-100 px-2 py-0.5 rounded">{tx.primaryIdentifier.number}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/transactions/${tx.id}`} className="text-blue-700 hover:underline font-medium">
                      {tx.title}
                    </Link>
                    {tx.summary && <p className="text-gray-400 text-xs truncate mt-0.5">{tx.summary}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{tx.transactionType}</td>
                  <td className="px-4 py-3">{statusBadge(tx.platformStatus)}</td>
                  <td className={`px-4 py-3 ${priorityColor(tx.priority)}`}>{priorityLabel(tx.priority)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString("ar-SA") : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {tx.assigneeName ?? <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewTransactionDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
