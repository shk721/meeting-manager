import { useGetPendingMinutes } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; iconColor: string }> = {
  draft:            { label: "مسودة",             bg: "#eef1f4", color: "#5a6675",  iconColor: "#7c8a99" },
  pending_approval: { label: "بانتظار الاعتماد",  bg: "#fbf1dd", color: "#a97918",  iconColor: "#d6b23e" },
  approved:         { label: "معتمد",              bg: "#e3efe8", color: "#0f7a52",  iconColor: "#1f7a4d" },
};

export default function Minutes() {
  const { data: minutes, isLoading } = useGetPendingMinutes();

  const counts = (minutes ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">المحاضر</h1>
        <p className="text-muted-foreground mt-1">محاضر الاجتماعات واعتمادها</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["draft", "pending_approval", "approved"] as const).map(status => {
          const s = STATUS_STYLE[status];
          return (
            <div
              key={status}
              className="rounded-xl border bg-card p-4 flex items-center gap-4"
              style={{ borderTop: `3px solid ${s.iconColor}` }}
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <FileText className="h-5 w-5" style={{ color: s.iconColor }} />
              </div>
              <div>
                <p className="font-rubik text-2xl font-bold" style={{ color: "#1c261c" }}>
                  {counts[status] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
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
                {minutes.map((minute) => {
                  const s = STATUS_STYLE[minute.status] ?? STATUS_STYLE.draft;
                  return (
                    <TableRow
                      key={minute.id}
                      className="cursor-pointer hover:bg-muted/50"
                      style={{ borderRight: `3px solid ${s.iconColor}` }}
                    >
                      <TableCell className="font-medium">
                        <Link href={`/meetings/${minute.meetingId}`} className="block w-full h-full">
                          <span className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: s.iconColor }} />
                            {minute.meetingTitle}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(minute.meetingDate).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">لا توجد محاضر لعرضها</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
