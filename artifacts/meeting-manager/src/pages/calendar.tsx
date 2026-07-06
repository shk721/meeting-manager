import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CalendarDays, ChevronLeft, ChevronRight, List, Calendar } from "lucide-react";
import { Link } from "wouter";

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  status: string;
  attendeeCount: number;
  isRecurring: boolean;
  parentMeetingId: number | null;
}

interface DayMeeting {
  id: number;
  title: string;
  time: string;
  status: string;
  location: string | null;
  attendeeCount: number;
}

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-400",
  "in-progress": "bg-amber-500",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "مجدول",
  completed: "مكتمل",
  cancelled: "ملغي",
  "in-progress": "جارٍ",
};

function useCalendarEvents(month: Date) {
  const start = format(startOfMonth(month), "yyyy-MM-dd");
  const end = format(endOfMonth(month), "yyyy-MM-dd");
  return useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", start, end],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events?start=${start}&end=${end}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });
}

function useDayMeetings(date: string | null) {
  return useQuery<DayMeeting[]>({
    queryKey: ["calendar-day", date],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/day/${date}`);
      if (!res.ok) throw new Error("Failed to fetch day meetings");
      return res.json();
    },
    enabled: !!date,
  });
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  const { data: events = [], isLoading } = useCalendarEvents(currentMonth);
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const { data: dayMeetings = [], isLoading: isDayLoading } = useDayMeetings(selectedDateStr);

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    const d = e.start.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const daysWithEvents = Object.keys(eventsByDate).map(d => new Date(d + "T12:00:00"));

  const prevMonth = () => setCurrentMonth(m => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth(m => addMonths(m, 1));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التقويم</h1>
          <p className="text-muted-foreground mt-1">عرض الاجتماعات على التقويم الشهري</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            <Calendar className="h-4 w-4 ml-1" />
            شهري
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 ml-1" />
            قائمة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar / List View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(currentMonth, "MMMM yyyy", { locale: ar })}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : viewMode === "month" ? (
                <DayPicker
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(d) => setSelectedDate(d ?? null)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={{ hasEvents: daysWithEvents }}
                  modifiersClassNames={{ hasEvents: "has-events" }}
                  components={{
                    DayContent: ({ date }) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const dayEvents = eventsByDate[dateStr] ?? [];
                      return (
                        <div className="relative flex flex-col items-center">
                          <span>{date.getDate()}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                              {dayEvents.slice(0, 3).map(e => (
                                <span
                                  key={e.id}
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[e.status] ?? "bg-gray-400"}`}
                                />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  }}
                  className="w-full"
                  classNames={{
                    months: "w-full",
                    month: "w-full",
                    table: "w-full",
                    head_cell: "text-center text-xs text-muted-foreground font-normal pb-1",
                    cell: "text-center p-0",
                    day: "w-9 h-9 mx-auto rounded-md hover:bg-muted transition-colors text-sm",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                    day_today: "font-bold",
                    day_outside: "text-muted-foreground/40",
                    nav: "hidden",
                  }}
                />
              ) : (
                <div className="space-y-2">
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-3 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <CalendarDays className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">لا توجد اجتماعات هذا الشهر</p>
                    </div>
                  ) : (
                    events
                      .slice()
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map(e => (
                        <Link key={e.id} href={`/meetings/${e.id}`}>
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <span className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${STATUS_DOT[e.status] ?? "bg-gray-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{e.title}</p>
                              <p className="text-xs text-muted-foreground">{e.start.slice(0, 10)} — {e.start.slice(11, 16)}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[e.status] ?? ""}`}>
                              {STATUS_LABEL[e.status] ?? e.status}
                            </span>
                            {e.isRecurring && (
                              <span className="text-xs text-muted-foreground">↻</span>
                            )}
                          </div>
                        </Link>
                      ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day Panel */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate
                  ? format(selectedDate, "EEEE، d MMMM yyyy", { locale: ar })
                  : "اختر يوماً"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  انقر على يوم في التقويم لعرض اجتماعاته
                </p>
              ) : isDayLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : dayMeetings.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 text-center">
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">لا توجد اجتماعات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayMeetings.map(m => (
                    <Link key={m.id} href={`/meetings/${m.id}`}>
                      <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">{m.title}</p>
                          <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[m.status] ?? ""}`}>
                            {STATUS_LABEL[m.status] ?? m.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.time}</p>
                        {m.location && (
                          <p className="text-xs text-muted-foreground truncate">{m.location}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{m.attendeeCount} حاضر</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
