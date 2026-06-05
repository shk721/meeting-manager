import { useState } from "react";
import {
  useGetMeeting, useGetMeetingMinutes, useGetDecisions, useGetTasks,
  getGetMeetingQueryKey, getGetMeetingMinutesQueryKey, getGetDecisionsQueryKey, getGetTasksQueryKey
} from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Target, CheckSquare, FileText, Briefcase } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  scheduled: { label: "مجدول", variant: "default" },
  in_progress: { label: "جارٍ", variant: "warning" },
  completed: { label: "مكتمل", variant: "success" },
  cancelled: { label: "ملغى", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "secondary" },
};

const minutesStatusMap: Record<string, string> = {
  draft: "مسودة",
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
};

const taskStatusMap: Record<string, string> = {
  open: "مفتوح",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغى",
  on_hold: "معلق",
};

export default function MeetingDetail({ id }: { id: string }) {
  const meetingId = parseInt(id, 10);
  
  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeeting(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingQueryKey(meetingId) }
  });
  
  const { data: minutes, isLoading: isLoadingMinutes } = useGetMeetingMinutes(meetingId, {
    query: { enabled: !!meetingId, queryKey: getGetMeetingMinutesQueryKey(meetingId) }
  });
  
  const { data: decisions, isLoading: isLoadingDecisions } = useGetDecisions({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetDecisionsQueryKey({ meetingId }) }
  });
  
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({ meetingId }, {
    query: { enabled: !!meetingId, queryKey: getGetTasksQueryKey({ meetingId }) }
  });

  if (isLoadingMeeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!meeting) {
    return <div>الاجتماع غير موجود.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(meeting.date).toLocaleDateString("ar-SA")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{meeting.time}</span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{meeting.location}</span>
              </div>
            )}
          </div>
        </div>
        <Badge variant={(statusMap[meeting.status]?.variant as any) || "default"} className="text-lg px-4 py-1">
          {statusMap[meeting.status]?.label || meeting.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">بيانات الاجتماع</TabsTrigger>
          <TabsTrigger value="minutes">المحضر</TabsTrigger>
          <TabsTrigger value="decisions">القرارات</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  التفاصيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {meeting.project && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">المشروع</span>
                    <span>{meeting.project}</span>
                  </div>
                )}
                {meeting.team && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الفريق</span>
                    <span>{meeting.team}</span>
                  </div>
                )}
                <div>
                  <span className="font-semibold block text-sm text-muted-foreground">رئيس الاجتماع</span>
                  <span>{meeting.chairperson?.fullName || "-"}</span>
                </div>
                {meeting.objectives && (
                  <div>
                    <span className="font-semibold block text-sm text-muted-foreground">الأهداف</span>
                    <p className="whitespace-pre-wrap">{meeting.objectives}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  المشاركون ({meeting.attendees?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.attendees && meeting.attendees.length > 0 ? (
                  <ul className="space-y-2">
                    {meeting.attendees.map(attendee => (
                      <li key={attendee.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span>{attendee.fullName}</span>
                        <span className="text-sm text-muted-foreground">{attendee.role}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم تحديد مشاركين.</p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  جدول الأعمال
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meeting.agendaItems && meeting.agendaItems.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-2 pr-4">
                    {meeting.agendaItems.map((item, index) => (
                      <li key={index} className="pl-2">{item}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">لم يتم تحديد جدول أعمال.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="minutes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  محضر الاجتماع
                </CardTitle>
                {minutes && (
                  <Badge
                    variant="secondary"
                    className={
                      minutes.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                      minutes.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      ''
                    }
                  >
                    {minutesStatusMap[minutes.status] || minutes.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMinutes ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : minutes ? (
                <div className="space-y-6">
                  {minutes.executiveSummary && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">الملخص التنفيذي</h3>
                      <p className="whitespace-pre-wrap">{minutes.executiveSummary}</p>
                    </div>
                  )}
                  {minutes.discussionItems && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">نقاط النقاش</h3>
                      <p className="whitespace-pre-wrap">{minutes.discussionItems}</p>
                    </div>
                  )}
                  {minutes.risks && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">المخاطر</h3>
                      <p className="whitespace-pre-wrap">{minutes.risks}</p>
                    </div>
                  )}
                  {minutes.previousFollowUp && (
                    <div>
                      <h3 className="text-lg font-semibold border-b pb-2 mb-2">متابعة سابقة</h3>
                      <p className="whitespace-pre-wrap">{minutes.previousFollowUp}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لم يتم إنشاء محضر لهذا الاجتماع بعد.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="decisions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>القرارات</CardTitle>
              <CardDescription>القرارات المتخذة خلال هذا الاجتماع</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDecisions ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : decisions && decisions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>القرار</TableHead>
                      <TableHead>بند جدول الأعمال</TableHead>
                      <TableHead>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {decisions.map(decision => (
                      <TableRow key={decision.id}>
                        <TableCell className="font-medium">{decision.content}</TableCell>
                        <TableCell>{decision.agendaItem || "-"}</TableCell>
                        <TableCell>{decision.notes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لا توجد قرارات مسجلة لهذا الاجتماع.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                المهام المرتبطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center p-4"><Spinner /></div>
              ) : tasks && tasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المهمة</TableHead>
                      <TableHead>المسؤول</TableHead>
                      <TableHead>تاريخ الاستحقاق</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإنجاز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{task.assignee?.fullName || "-"}</TableCell>
                        <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString("ar-SA") : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {taskStatusMap[task.status] || task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.completionPercent || 0} className="w-[60px]" />
                            <span className="text-xs">{task.completionPercent || 0}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  لا توجد مهام مرتبطة بهذا الاجتماع.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
