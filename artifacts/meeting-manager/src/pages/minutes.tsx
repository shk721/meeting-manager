import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; borderColor: string }> = {
  draft:            { label: "مسودة",             bg: "#eef1f4", color: "#5a6675",  borderColor: "#7c8a99" },
  pending_approval: { label: "بانتظار الاعتماد",  bg: "#fbf1dd", color: "#a97918",  borderColor: "#d6b23e" },
  approved:         { label: "معتمد",              bg: "#e3efe8", color: "#0f7a52",  borderColor: "#1f7a4d" },
};

const FILTER_TABS = [
  { value: "all",              label: "الكل" },
  { value: "draft",            label: "مسودة" },
  { value: "pending_approval", label: "بانتظار الاعتماد" },
  { value: "approved",         label: "معتمد" },
];

export default function Minutes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: minutes = [], isLoading } = useQuery<any[]>({
    queryKey: ["minutes-all"],
    queryFn: () => fetchJson("/api/minutes"),
  });

  const counts = minutes.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const visible = minutes.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search && !m.meetingTitle.includes(search)) return false;
    return true;
  });

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
              className="rounded-xl border bg-card p-4 flex items-center gap-4 cursor-pointer transition-shadow hover:shadow-sm"
              style={{ borderTop: `3px solid ${s.borderColor}` }}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                <FileText className="h-5 w-5" style={{ color: s.borderColor }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "#1c261c" }}>
                  {counts[status] ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        {/* Status tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12.5, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: statusFilter === tab.value ? "#1f7a4d" : "#f4f6f2",
                color: statusFilter === tab.value ? "#fff" : "#5a675a",
                fontWeight: statusFilter === tab.value ? 600 : 400,
              }}
            >
              {tab.label}
              {tab.value !== "all" && (
                <span style={{ marginRight: 5, opacity: 0.75 }}>({counts[tab.value] ?? 0})</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative", width: 220 }}>
          <Search style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#8a978a" }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في المحاضر..."
            className="pr-8"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ background: "#fff", border: "1px solid #e6ece4", borderRadius: 14, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#8a978a" }}>جارٍ التحميل...</div>
        ) : visible.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f4f6f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText style={{ width: 28, height: 28, color: "#c2ccc2" }} />
            </div>
            <p style={{ color: "#8a978a", fontSize: 14 }}>{search ? "لا توجد نتائج للبحث" : "لا توجد محاضر لعرضها"}</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e6ece4" }}>
                {["عنوان الاجتماع", "التاريخ", "آخر تحديث", "الحالة"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 12, color: "#8a978a", fontWeight: 600, textAlign: "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(minute => {
                const s = STATUS_STYLE[minute.status] ?? STATUS_STYLE.draft;
                return (
                  <tr
                    key={minute.id}
                    style={{ borderBottom: "1px solid #f0f3ee", borderRight: `3px solid ${s.borderColor}`, transition: "background .1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f7f9f6")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/meetings/${minute.meetingId}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#1c261c", textDecoration: "none", fontSize: 13.5, fontWeight: 600 }}>
                        <FileText style={{ width: 14, height: 14, flexShrink: 0, color: s.borderColor }} />
                        {minute.meetingTitle}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#5a675a" }}>
                      {minute.meetingDate ? new Date(minute.meetingDate + "T00:00:00").toLocaleDateString("ar-SA") : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#8a978a" }}>
                      {new Date(minute.updatedAt).toLocaleDateString("ar-SA")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
