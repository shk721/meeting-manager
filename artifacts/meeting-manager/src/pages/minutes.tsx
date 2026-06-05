import { useGetPendingMinutes } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending_approval: { label: "بانتظار الاعتماد", variant: "warning" },
  approved: { label: "معتمد", variant: "success" },
};

export default function Minutes() {
  // We're using useGetPendingMinutes here as a placeholder for a theoretical useGetAllMinutes 
  // since the API might only expose pending minutes for the dashboard, 
  // but if it's the only hook available for listing minutes, we'll use it.
  const { data: minutes, isLoading } = useGetPendingMinutes();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">المحاضر</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <CardTitle>قائمة المحاضر</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="pr-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : minutes && minutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان الاجتماع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {minutes.map((minute) => (
                  <TableRow key={minute.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/meetings/${minute.meetingId}`} className="block w-full h-full">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              لا توجد محاضر لعرضها.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
