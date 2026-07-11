import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ExportFormat = "pdf" | "docx" | "ical" | "csv" | "json";

interface Props {
  meetingId?: number;
  meetingIds?: number[];
  trigger?: React.ReactNode;
}

const formatLabels: Record<ExportFormat, string> = {
  pdf: "PDF",
  docx: "Word (.docx)",
  ical: "iCal (تقويم)",
  csv: "CSV",
  json: "JSON",
};

export function ExportModal({ meetingId, meetingIds, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      if (meetingId) {
        if (format === "pdf") {
          window.location.href = `/api/export/meeting/${meetingId}/pdf`;
        } else if (format === "docx") {
          window.location.href = `/api/export/meeting/${meetingId}/docx`;
        } else if (format === "ical") {
          window.location.href = `/api/export/meeting/${meetingId}/ical`;
        } else if (format === "csv") {
          // Bulk with single ID
          const res = await fetch("/api/export/meetings/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meeting_ids: [meetingId], format: "csv" }),
          });
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `meeting-${meetingId}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          window.location.href = `/api/export/meeting/${meetingId}/pdf`;
        }
      } else if (meetingIds && meetingIds.length > 0) {
        const res = await fetch("/api/export/meetings/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meeting_ids: meetingIds, format }),
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meetings.${format === "json" ? "json" : format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 ml-1" />
            تصدير
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>تصدير الاجتماع</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-sm font-medium mb-2">اختر الصيغة</p>
            <div className="grid grid-cols-2 gap-2">
              {(["pdf", "docx", "ical", "csv", "json"] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  data-testid={`format-${f}`}
                  className={`py-2 px-3 rounded-md border text-sm transition-colors ${format === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                >
                  {formatLabels[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={handleDownload} disabled={loading}>
              <Download className="h-4 w-4 ml-1" />
              {loading ? "جاري التصدير..." : "تصدير"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
