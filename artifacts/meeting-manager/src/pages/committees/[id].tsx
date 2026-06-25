import { useState } from "react";
import { Link } from "wouter";
import {
  useGetCommittee, useAddCommitteeMember, useRemoveCommitteeMember,
  useGetUsers, getGetCommitteeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Calendar, Users, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const typeLabels: Record<string, string> = {
  committee: "لجنة",
  team: "فريق عمل",
  board: "مجلس إدارة",
  working_group: "مجموعة عمل",
};

const roleLabels: Record<string, string> = {
  chair: "رئيس",
  secretary: "سكرتير",
  member: "عضو",
};

const meetingStatusLabels: Record<string, string> = {
  scheduled: "مجدول",
  in_progress: "جارٍ",
  completed: "مكتمل",
  cancelled: "ملغى",
  postponed: "مؤجل",
};

export default function CommitteeDetail({ id }: { id: string }) {
  const committeeId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null);

  const { data: committee, isLoading } = useGetCommittee(committeeId);
  const { data: users = [] } = useGetUsers();
  const addMember = useAddCommitteeMember();
  const removeMember = useRemoveCommitteeMember();

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await addMember.mutateAsync({
        id: committeeId,
        data: { userId: parseInt(selectedUserId), role: selectedRole },
      });
      queryClient.invalidateQueries({ queryKey: getGetCommitteeQueryKey(committeeId) });
      setSelectedUserId("");
      setSelectedRole("member");
      toast({ title: "تم إضافة العضو بنجاح" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;
    try {
      await removeMember.mutateAsync({ id: committeeId, userId: removeMemberId });
      queryClient.invalidateQueries({ queryKey: getGetCommitteeQueryKey(committeeId) });
      toast({ title: "تم إزالة العضو" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setRemoveMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!committee) {
    return <div className="text-muted-foreground p-8">اللجنة غير موجودة.</div>;
  }

  const existingMemberUserIds = new Set(committee.members.map((m) => m.user?.id).filter(Boolean));
  const availableUsers = users.filter((u) => !existingMemberUserIds.has(u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/committees" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{committee.name}</h1>
            <Badge variant="secondary">{typeLabels[committee.type] ?? committee.type}</Badge>
          </div>
          {committee.description && (
            <p className="text-muted-foreground mt-1">{committee.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            {committee.chairperson && <span>رئيس: <span className="font-medium text-foreground">{committee.chairperson.fullName}</span></span>}
            {committee.secretary && <span>سكرتير: <span className="font-medium text-foreground">{committee.secretary.fullName}</span></span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 ml-2" />
            الأعضاء ({committee.members.length})
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Calendar className="h-4 w-4 ml-2" />
            الاجتماعات ({committee.recentMeetings.length})
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4 space-y-4">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إضافة عضو جديد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">المستخدم</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مستخدماً..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40 space-y-1">
                    <label className="text-sm font-medium">الدور</label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chair">رئيس</SelectItem>
                        <SelectItem value="secretary">سكرتير</SelectItem>
                        <SelectItem value="member">عضو</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddMember} disabled={!selectedUserId || addMember.isPending}>
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              {committee.members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد أعضاء في هذه اللجنة بعد.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور في اللجنة</TableHead>
                      {committee.members[0]?.joinedAt && <TableHead>تاريخ الانضمام</TableHead>}
                      {canManage && <TableHead className="w-16"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {committee.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.user?.fullName ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{member.user?.email ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === "chair" ? "default" : "secondary"}>
                            {roleLabels[member.role] ?? member.role}
                          </Badge>
                        </TableCell>
                        {member.joinedAt && (
                          <TableCell>{new Date(member.joinedAt).toLocaleDateString("ar-SA")}</TableCell>
                        )}
                        {canManage && (
                          <TableCell>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setRemoveMemberId(member.user?.id ?? null)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {committee.recentMeetings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد اجتماعات مرتبطة بهذه اللجنة بعد.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عنوان الاجتماع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {committee.recentMeetings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.title}</TableCell>
                        <TableCell>{new Date(m.date).toLocaleDateString("ar-SA")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{meetingStatusLabels[m.status] ?? m.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/meetings/${m.id}`} className="text-primary text-sm hover:underline">
                            عرض
                          </Link>
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

      <AlertDialog open={!!removeMemberId} onOpenChange={(v) => { if (!v) setRemoveMemberId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إزالة العضو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إزالة هذا العضو من اللجنة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>إزالة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
