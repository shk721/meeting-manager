import { useState } from "react";
import { Link } from "wouter";
import { useGetCommittees, useDeleteCommittee, getGetCommitteesQueryKey } from "@workspace/api-client-react";
import type { Committee } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Users, CalendarDays, Edit2, Trash2, ChevronLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CommitteeFormDialog } from "@/components/committees/CommitteeFormDialog";

const typeLabels: Record<string, string> = {
  committee: "لجنة",
  team: "فريق عمل",
  board: "مجلس إدارة",
  working_group: "مجموعة عمل",
};

export default function Committees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";

  const [createOpen, setCreateOpen] = useState(false);
  const [editCommittee, setEditCommittee] = useState<Committee | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: committees = [], isLoading } = useGetCommittees();
  const deleteMutation = useDeleteCommittee();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getGetCommitteesQueryKey() });
      toast({ title: "تم حذف اللجنة" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">اللجان والفرق</h1>
          <p className="text-muted-foreground mt-1">إدارة اللجان الدائمة وفرق العمل وأعضائها</p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            لجنة جديدة
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : committees.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد لجان مسجلة بعد</p>
          {canManage && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              أنشئ أول لجنة
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {committees.map((committee) => (
            <Card key={committee.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight truncate">{committee.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {typeLabels[committee.type] ?? committee.type}
                    </Badge>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.preventDefault(); setEditCommittee(committee); }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); setDeleteId(committee.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {committee.description && (
                  <CardDescription className="mt-2 line-clamp-2">{committee.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{committee.memberCount ?? 0} عضو</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    <span>{committee.meetingCount ?? 0} اجتماع</span>
                  </div>
                </div>
                {(committee.chairperson || committee.secretary) && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-4">
                    {committee.chairperson && (
                      <div>رئيس: <span className="font-medium text-foreground">{committee.chairperson.fullName}</span></div>
                    )}
                    {committee.secretary && (
                      <div>سكرتير: <span className="font-medium text-foreground">{committee.secretary.fullName}</span></div>
                    )}
                  </div>
                )}
                <Link
                  href={`/committees/${committee.id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  عرض التفاصيل
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CommitteeFormDialog
        open={createOpen || !!editCommittee}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditCommittee(undefined); } else setCreateOpen(true); }}
        committee={editCommittee}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف اللجنة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه اللجنة؟ سيُحذف جميع الأعضاء المرتبطين بها. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
