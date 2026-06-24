import { useState } from "react";
import { useGetPendingMinutes, useApproveMinutes, getGetPendingMinutesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending_approval: { label: "بانتظار الاعتماد", variant: "warning" },
  approved: { label: "معتمد", variant: "success" },
};

export default function Minutes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const canApprove = user?.role === "admin" || user?.role === "manager";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: allMinutes = [], isLoading } = useGetPendingMinutes();
  const approveMutation = useApproveMinutes();

  const minutes = debouncedSearch
    ? allMinutes.filter(
        (m) =>
          m.meetingTitle.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : allMinutes;

  const handleApprove = async (minutesId: number) => {
    try {
      await approveMutation.mutateAsync({ id: minutesId });
      queryClient.invalidateQueries({ queryKey: getGetPendingMinutesQueryKey() });
      toast({ title: "تم اعتماد المحضر بنجاح" });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المحاضر</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <CardTitle>محاضر بانتظار الاعتماد</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الاجتماع..."
                className="pr-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : minutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان الاجتماع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  {canApprove && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {minutes.map((minute) => (
                  <TableRow key={minute.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/meetings/${minute.meetingId}`} className="block w-full h-full hover:underline">
                        {minute.meetingTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(minute.meetingDate).toLocaleDateString("ar-SA")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusMap[minute.status]?.variant as any) || "default"}>
                        {statusMap[minute.status]?.label || minute.status}
                      </Badge>
                    </TableCell>
                    {canApprove && (
                      <TableCell>
                        {minute.status === "pending_approval" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={approveMutation.isPending}
                            onClick={() => handleApprove(minute.id)}
                          >
                            <Check className="h-3 w-3 ml-1" />
                            اعتماد
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              {search ? "لا توجد نتائج مطابقة." : "لا توجد محاضر بانتظار الاعتماد."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
