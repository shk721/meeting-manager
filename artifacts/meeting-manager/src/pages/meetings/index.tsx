import { useState } from "react";
import { useGetMeetings, getGetMeetingsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SearchBar from "@/components/SearchBar";
import FilterPanel from "@/components/FilterPanel";
import SavedViews from "@/components/SavedViews";
import { useSearch } from "@/hooks/useSearch";
import { useFilters } from "@/hooks/useFilters";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled:   { label: "مجدول",  variant: "default" },
  in_progress: { label: "جارٍ",   variant: "warning" },
  completed:   { label: "مكتمل", variant: "success" },
  cancelled:   { label: "ملغى",  variant: "destructive" },
  postponed:   { label: "مؤجل",  variant: "secondary" },
};

async function apiFetch(path: string, method: string, body?: any) {
  const res = await fetch(path, {
    method, credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? `HTTP ${res.status}`); }
  if (res.status === 204) return null;
  return res.json();
}

export default function Meetings() {
  const queryClient = useQueryClient();
  const { data: allMeetings, isLoading } = useGetMeetings({});
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => apiFetch("/api/users", "GET"), staleTime: 60_000 });

  const search  = useSearch<any>("meetings");
  const filters = useFilters("meetings");

  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({ title: "", date: "", time: "", status: "scheduled", project: "" });

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.time) return;
    setApiError(""); setIsPending(true);
    try {
      await apiFetch("/api/meetings", "POST", { title: form.title, date: form.date, time: form.time, status: form.status, project: form.project || undefined });
      queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey({}) });
      setOpen(false);
      setForm({ title: "", date: "", time: "", status: "scheduled", project: "" });
    } catch (e: any) { setApiError(e.message); }
    finally { setIsPending(false); }
  };

  // Priority: search results → filter results → all meetings (client-side trimmed)
  const displayMeetings: any[] = search.isActive
    ? (search.results ?? [])
    : filters.isActive
      ? (filters.results ?? [])
      : (allMeetings ?? []);

  const isWorking = isLoading || search.isLoading || filters.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">الاجتماعات</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          اجتماع جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>قائمة الاجتماعات</CardTitle>
              <SavedViews
                type="meetings"
                currentFilters={filters.criteria as Record<string, unknown>}
                onLoadView={f => { filters.setCriteria(f as any); filters.applyFilters(); }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="flex-1 max-w-sm">
                <SearchBar
                  query={search.query}
                  onQueryChange={search.setQuery}
                  onClear={search.clear}
                  total={search.isActive ? search.total : undefined}
                  isLoading={search.isLoading}
                  placeholder="بحث في الاجتماعات…"
                />
              </div>
              <FilterPanel
                type="meetings"
                criteria={filters.criteria}
                onCriteriaChange={filters.setCriteria}
                onApply={filters.applyFilters}
                onClear={filters.clearFilters}
                appliedCount={filters.appliedCount}
                users={users}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isWorking ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : displayMeetings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الرئيس</TableHead>
                  <TableHead>الحاضرون</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMeetings.map((m: any) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/meetings/${m.id}`} className="block w-full">{m.title}</Link>
                    </TableCell>
                    <TableCell>{new Date(m.date).toLocaleDateString("ar-SA")} - {m.time}</TableCell>
                    <TableCell>
                      <Badge variant={(statusMap[m.status]?.variant as any) || "default"}>
                        {statusMap[m.status]?.label || m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.chairperson?.fullName}</TableCell>
                    <TableCell>{m.attendeeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              {search.isActive || filters.isActive ? "لا توجد نتائج مطابقة." : "لا توجد اجتماعات لعرضها."}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>إنشاء اجتماع جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="title">عنوان الاجتماع *</Label>
              <Input id="title" placeholder="أدخل عنوان الاجتماع" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">التاريخ *</Label>
                <Input id="date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">الوقت *</Label>
                <Input id="time" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="in_progress">جارٍ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="postponed">مؤجل</SelectItem>
                  <SelectItem value="cancelled">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="project">المشروع</Label>
              <Input id="project" placeholder="اختياري" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} />
            </div>
          </div>
          {apiError && <p className="text-sm text-red-600 px-1">{apiError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={isPending || !form.title || !form.date || !form.time}>
              {isPending ? <Spinner className="h-4 w-4 ml-2" /> : null}إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
