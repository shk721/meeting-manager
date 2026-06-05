import { useGetMeetings } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "default" },
  in_progress: { label: "جارٍ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "secondary" },
};

export default function Meetings() {
  const { data: meetings, isLoading } = useGetMeetings({});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">الاجتماعات</h1>
        <Button>
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
              <Input placeholder="بحث..." className="pr-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : meetings && meetings.length > 0 ? (
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
                {meetings.map((meeting) => (
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
    </div>
  );
}
