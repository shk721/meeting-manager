import { useState } from "react";
import { useGetMeetings, useCreateMeeting, getGetMeetingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Meetings() {
  const queryClient = useQueryClient();
  const { data: meetings, isLoading } = useGetMeetings({});
  const { mutate: createMeeting, isPending } = useCreateMeeting();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    status: "scheduled",
    project: "",
  });

  const handleCreate = () => {
    if (!form.title || !form.date || !form.time) return;
    createMeeting(
      { title: form.title, date: form.date, time: form.time, status: form.status, project: form.project || undefined },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeetingsQueryKey({}) });
          setOpen(false);
          setForm({ title: "", date: "", time: "", status: "scheduled", project: "" });
        },
      }
    );
  };

  const filtered = (meetings ?? []).filter((m: any) =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <CardTitle>قائمة الاجتماعات</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : filtered.length > 0 ? (
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
                {filtered.map((meeting: any) => (
                  <TableRow key={meeting.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/meetings/${meeting.id}`} className="block w-full h-full">
                        {meeting.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(meeting.date).toLocaleDateString("ar-SA")} - {meeting.time}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusMap[meeting.status]?.variant as any) || "default"}>
                        {statusMap[meeting.status]?.label || meeting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{meeting.chairperson?.fullName}</TableCell>
                    <TableCell>{meeting.attendeeCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد اجتماعات لعرضها.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء اجتماع جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="title">عنوان الاجتماع *</Label>
              <Input
                id="title"
                placeholder="أدخل عنوان الاجتماع"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">التاريخ *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="time">الوقت *</Label>
                <Input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">الحالة</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger id="status">
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
            <div className="space-y-1">
              <Label htmlFor="project">المشروع</Label>
              <Input
                id="project"
                placeholder="اختياري"
                value={form.project}
                onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={isPending || !form.title || !form.date || !form.time}>
              {isPending ? <Spinner className="h-4 w-4 ml-2" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
