import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, CalendarDays, CheckSquare, X } from "lucide-react";

async function searchAll(q: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { credentials: "include" });
  if (!res.ok) return { meetings: [], tasks: [] };
  return res.json() as Promise<{ meetings: any[]; tasks: any[] }>;
}

const TASK_STATUS: Record<string, string> = {
  open: "مفتوحة", in_progress: "جارية", completed: "مكتملة", done: "منجزة", on_hold: "معلّقة", overdue: "متأخرة",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ meetings: any[]; tasks: any[] }>({ meetings: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ meetings: [], tasks: [] });
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults({ meetings: [], tasks: [] }); setLoading(false); return; }
    setLoading(true);
    searchAll(q).then(r => { setResults(r); setLoading(false); setSelected(0); });
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 280);
  };

  const allResults = [
    ...results.meetings.map((m: any) => ({ type: "meeting", id: m.id, title: m.title, sub: m.date, href: `/meetings/${m.id}` })),
    ...results.tasks.map((t: any) => ({ type: "task", id: t.id, title: t.title, sub: TASK_STATUS[t.status] ?? t.status, href: `/tasks` })),
  ];

  const handleSelect = (href: string) => {
    onClose();
    navigate(href);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && allResults[selected]) handleSelect(allResults[selected].href);
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,25,18,.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,.22)", overflow: "hidden", margin: "0 16px" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #e6ece4" }}>
          <Search style={{ width: 17, height: 17, color: "#8a978a", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="ابحث في الاجتماعات والمهام..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", background: "transparent", color: "#1c261c" }}
            dir="rtl"
          />
          {query && (
            <button onClick={() => handleChange("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#8a978a", display: "flex", padding: 2 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
          <kbd style={{ fontSize: 10, color: "#8a978a", border: "1px solid #e6ece4", borderRadius: 4, padding: "2px 5px", flexShrink: 0 }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {query.length < 2 ? (
            <div style={{ padding: "18px 16px", fontSize: 13, color: "#8a978a", textAlign: "center" }}>
              اكتب مصطلح البحث (حرفان على الأقل)
            </div>
          ) : loading ? (
            <div style={{ padding: "18px 16px", fontSize: 13, color: "#8a978a", textAlign: "center" }}>جارٍ البحث...</div>
          ) : allResults.length === 0 ? (
            <div style={{ padding: "18px 16px", fontSize: 13, color: "#8a978a", textAlign: "center" }}>لا توجد نتائج لـ «{query}»</div>
          ) : (
            <>
              {results.meetings.length > 0 && (
                <div>
                  <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: "#8a978a", textTransform: "uppercase", letterSpacing: "0.06em" }}>الاجتماعات</div>
                  {results.meetings.map((m: any, i: number) => {
                    const idx = i;
                    return (
                      <button key={m.id} onClick={() => handleSelect(`/meetings/${m.id}`)}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", border: "none", background: selected === idx ? "#e8f2ea" : "transparent", cursor: "pointer", textAlign: "right" }}>
                        <CalendarDays style={{ width: 15, height: 15, color: "#1f7a4d", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1c261c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                          {m.date && <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 1 }}>{new Date(m.date + "T00:00:00").toLocaleDateString("ar-SA")}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {results.tasks.length > 0 && (
                <div style={{ borderTop: results.meetings.length > 0 ? "1px solid #f0f3ee" : undefined }}>
                  <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: "#8a978a", textTransform: "uppercase", letterSpacing: "0.06em" }}>المهام</div>
                  {results.tasks.map((t: any, i: number) => {
                    const idx = results.meetings.length + i;
                    return (
                      <button key={t.id} onClick={() => handleSelect("/tasks")}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", border: "none", background: selected === idx ? "#e8f2ea" : "transparent", cursor: "pointer", textAlign: "right" }}>
                        <CheckSquare style={{ width: 15, height: 15, color: "#3b82f6", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1c261c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                          <div style={{ fontSize: 11.5, color: "#8a978a", marginTop: 1 }}>{TASK_STATUS[t.status] ?? t.status}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        {allResults.length > 0 && (
          <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f3ee", display: "flex", gap: 14, fontSize: 11, color: "#a3b0a3" }}>
            <span>↑↓ للتنقل</span>
            <span>Enter للفتح</span>
            <span>Esc للإغلاق</span>
          </div>
        )}
      </div>
    </div>
  );
}
