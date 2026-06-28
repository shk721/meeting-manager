import { useState, useCallback, useEffect } from "react";
import * as dtApi from "@/api/dt";
import type { DtProject, DtSnapshot } from "@/api/dt";
import { useAuth } from "@/hooks/use-auth";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:"#06080f", surface:"#0c1119", card:"#101823", raised:"#141f2e",
  border:"#182436", accent:"#2563eb", text:"#dde4ef",
  sub:"#6b84a0", muted:"#2e4159", red:"#ef4444",
};

const DRIVER = {
  challenge:   { label:"تحدٍّ واجهناه",      color:"#ef4444", icon:"⚠", hint:"مشكلة أو عقبة من العام الماضي" },
  opportunity: { label:"فرصة للتحسين",        color:"#10b981", icon:"◆", hint:"مجال لم نستثمره بالكامل" },
  initiative:  { label:"مبادرة جديدة",         color:"#8b5cf6", icon:"★", hint:"فكرة مستحدثة لهذا العام" },
  regulatory:  { label:"متطلب تنظيمي/إلزامي", color:"#f59e0b", icon:"⚑", hint:"قانون أو لائحة تستوجب العمل" },
  strategic:   { label:"توجيه استراتيجي",      color:"#0ea5e9", icon:"▲", hint:"أولوية قيادية أو قرار مجلس إدارة" },
};
const DRIVER_KEYS = Object.keys(DRIVER) as Array<keyof typeof DRIVER>;

const STATUS: Record<string, { color: string; bar: string }> = {
  "لم يبدأ":      { color:"#475569", bar:"#1e293b" },
  "جاري التنفيذ": { color:"#3b82f6", bar:"#1e3a5f" },
  "متأخر":        { color:"#ef4444", bar:"#3b1f1f" },
  "مكتمل":        { color:"#10b981", bar:"#1a3a2a" },
};
const STATUS_KEYS = Object.keys(STATUS);

const PRIORITY: Record<string, string> = {
  "عالية":"#ef4444", "متوسطة":"#f59e0b", "منخفضة":"#10b981",
};
const ROLES = ["مدير مشروع","محلل أعمال","مطور","مصمم","مختبر","مستشار"];
const SP = { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24 } as const;

// ─── Local UI Types (string IDs for key/comparison convenience) ───────────────
interface UpdateLog { at: string; note: string; auto?: boolean; by?: string; }
interface Task { id: string; title: string; status: string; assignee: string; updates: UpdateLog[]; createdAt: string; updatedAt: string; }
interface Comp { id: string; driver: string; title: string; desc: string; priority: string; refYear: number; tasks: Task[]; }
interface Resource { id: string; name: string; role: string; allocation: number; }
interface SubPlan { id: string; title: string; status: string; progress: number; deadline: string; resources: Resource[]; components: Comp[]; }
interface Project { id: number; title: string; deadline: string; subplans: SubPlan[]; }

// ─── API → UI Adapters ────────────────────────────────────────────────────────
function adaptTask(t: dtApi.DtTask): Task {
  return {
    id: String(t.id), title: t.title, status: t.status, assignee: t.assignee,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
    updates: (t.updates || []).map(u => ({
      at: u.createdAt, note: u.note,
      auto: u.auto === "true" || u.auto === "1",
      by: u.by ?? undefined,
    })),
  };
}

function adaptComp(c: dtApi.DtComponent): Comp {
  return {
    id: String(c.id), driver: c.driver, title: c.title,
    desc: c.desc, priority: c.priority, refYear: c.refYear,
    tasks: (c.tasks || []).map(adaptTask),
  };
}

function adaptSubplan(sp: dtApi.DtSubplan): SubPlan {
  return {
    id: String(sp.id), title: sp.title, status: sp.status,
    progress: sp.progress, deadline: sp.deadline,
    resources: (sp.resources || []).map(r => ({ id: String(r.id), name: r.name, role: r.role, allocation: r.allocation })),
    components: (sp.components || []).map(adaptComp),
  };
}

function adaptProject(p: DtProject): Project {
  return {
    id: p.id, title: p.title, deadline: p.deadline,
    subplans: (p.subplans || []).map(adaptSubplan),
  };
}

// ─── Metrics & Snapshots ──────────────────────────────────────────────────────
interface Metrics {
  overallProgress: number; totalSubplans: number; completedSubplans: number;
  delayedSubplans: number; totalTasks: number; completedTasks: number;
  inProgressTasks: number; delayedTasks: number;
  byDriver: Record<string, number>; byPriority: Record<string, number>;
  subplanSummaries: Array<{ id: string; title: string; progress: number; status: string; tasksTotal: number; tasksDone: number; }>;
}

interface Snapshot {
  id: string; label: string; period: "manual" | "monthly" | "quarterly";
  createdAt: string; metrics: Metrics;
}

function adaptSnapshot(s: DtSnapshot): Snapshot {
  return {
    id: String(s.id), label: s.label,
    period: (s.period || "manual") as Snapshot["period"],
    createdAt: s.createdAt,
    metrics: s.metrics as unknown as Metrics,
  };
}

function computeMetrics(project: Project): Metrics {
  const allTasks = project.subplans.flatMap(sp => sp.components.flatMap(c => c.tasks));
  const allComps = project.subplans.flatMap(sp => sp.components);
  const byDriver: Record<string, number> = {};
  DRIVER_KEYS.forEach(k => { byDriver[k] = allComps.filter(c => c.driver === k).length; });
  const byPriority: Record<string, number> = {};
  Object.keys(PRIORITY).forEach(p => { byPriority[p] = allComps.filter(c => c.priority === p).length; });
  const overallProgress = project.subplans.length
    ? Math.round(project.subplans.reduce((s, p) => s + p.progress, 0) / project.subplans.length) : 0;
  return {
    overallProgress,
    totalSubplans: project.subplans.length,
    completedSubplans: project.subplans.filter(sp => sp.status === "مكتمل").length,
    delayedSubplans: project.subplans.filter(sp => daysLeft(sp.deadline) < 0 && sp.status !== "مكتمل").length,
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter(t => t.status === "مكتمل").length,
    inProgressTasks: allTasks.filter(t => t.status === "جاري التنفيذ").length,
    delayedTasks: allTasks.filter(t => t.status === "متأخر").length,
    byDriver, byPriority,
    subplanSummaries: project.subplans.map(sp => {
      const tasks = sp.components.flatMap(c => c.tasks);
      return { id: sp.id, title: sp.title, progress: sp.progress, status: sp.status,
        tasksTotal: tasks.length, tasksDone: tasks.filter(t => t.status === "مكتمل").length };
    }),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toNum = (id: string) => parseInt(id, 10);
function daysLeft(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("ar-SA", { day:"2-digit", month:"short", year:"numeric" });
  const time = d.toLocaleTimeString("ar-SA", { hour:"2-digit", minute:"2-digit" });
  return `${date} — ${time}`;
}
function nowISO() { return new Date().toISOString(); }
function exportJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function recalcSP(sp: SubPlan): SubPlan {
  const all = sp.components.flatMap(c => c.tasks);
  if (!all.length) return sp;
  const done = all.filter(t => t.status === "مكتمل").length;
  const progress = Math.round((done / all.length) * 100);
  const status = progress === 100 ? "مكتمل" : progress > 0 ? "جاري التنفيذ" : "لم يبدأ";
  return { ...sp, progress, status };
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Ring({ pct, size=52, stroke=4, color="#2563eb" }: { pct:number; size?:number; stroke?:number; color?:string }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, off = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.muted} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" style={{ transition:"stroke-dashoffset .4s" }}/>
    </svg>
  );
}

function Btn({ onClick, children, active, sm, variant="default" }: {
  onClick?: (e?: React.MouseEvent) => void; children: React.ReactNode;
  active?: boolean; sm?: boolean; variant?: "default"|"danger"|"success"|"ghost";
}) {
  const [hov, setHov] = useState(false);
  const styles = {
    default: active
      ? { bg:hov?`${C.accent}cc`:C.accent, color:"#fff", border:`1px solid ${C.accent}` }
      : { bg:hov?`${C.border}60`:"transparent", color:hov?C.text:C.sub, border:`1px solid ${hov?C.sub:C.border}` },
    danger:  { bg:hov?"#ef444430":"#ef444420", color:"#ef4444", border:"1px solid #ef444440" },
    success: { bg:hov?"#10b98130":"#10b98120", color:"#10b981", border:"1px solid #10b98140" },
    ghost:   { bg:hov?`${C.border}60`:"transparent", color:hov?C.text:C.sub, border:`1px solid ${C.border}` },
  };
  const s = styles[variant] || styles.default;
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:s.bg, color:s.color, border:s.border, borderRadius:7, cursor:"pointer",
        fontFamily:"inherit", fontWeight:600, fontSize:sm?11:13, padding:sm?"4px 10px":"7px 15px",
        transition:"all .15s", whiteSpace:"nowrap",
        transform: hov && !active ? "translateY(-1px)" : "none" }}>{children}</button>
  );
}

function Sel({ value, onChange, options }: {
  value: string | number; onChange: (v: string) => void;
  options: string[] | [string | number, string][];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
      color:C.text, padding:"7px 11px", fontSize:13, outline:"none",
      fontFamily:"inherit", direction:"rtl", width:"100%",
    }}>
      {options.map(o => <option key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>
        {Array.isArray(o)?o[1]:o}
      </option>)}
    </select>
  );
}

function Inp({ value, onChange, placeholder, type="text", rows }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; rows?: number;
}) {
  const s: React.CSSProperties = {
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
    color:C.text, padding:"7px 11px", fontSize:13, width:"100%", outline:"none",
    fontFamily:"inherit", direction:"rtl", boxSizing:"border-box", resize:"vertical",
  };
  return rows
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={s}/>
    : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s}/>;
}

function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000d", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        padding:22, width:"100%", maxWidth:wide?680:450, maxHeight:"90vh", overflowY:"auto", direction:"rtl",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:15, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:19, cursor:"pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
      background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
      padding:"10px 20px", fontSize:13, color:C.text, fontWeight:600,
      zIndex:300, boxShadow:"0 8px 32px #00000060", animation:"fadeUp .25s ease" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {msg}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign:"center", padding:"32px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:SP.sm }}>
      <div style={{ fontSize:32, opacity:.4 }}>{icon}</div>
      <div style={{ fontSize:13, color:C.sub, fontWeight:600 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, maxWidth:260, lineHeight:1.6 }}>{sub}</div>}
    </div>
  );
}

function DriverTag({ driver, refYear }: { driver: string; refYear?: number }) {
  const d = DRIVER[driver as keyof typeof DRIVER];
  if (!d) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:`${d.color}18`, color:d.color, border:`1px solid ${d.color}35`,
      borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
      <span>{d.icon}</span><span>{d.label}</span>
      {refYear && <span style={{ opacity:.6, fontSize:10 }}>· {refYear}</span>}
    </span>
  );
}

// ─── Update-log Modal ─────────────────────────────────────────────────────────
function UpdateLogModal({ task, onAddUpdate, onClose }: {
  task: Task; onAddUpdate: (tid: string, note: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const logs = task.updates || [];
  const submit = () => { if (!text.trim()) return; onAddUpdate(task.id, text.trim()); setText(""); };
  return (
    <Modal title={`سجل التحديثات — ${task.title}`} onClose={onClose} wide>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        <div style={{ fontSize:12, color:C.sub }}>أضف تحديثاً جديداً</div>
        <Inp value={text} onChange={setText} placeholder="اكتب ملاحظة التحديث…" rows={3}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="ghost" sm>إلغاء</Btn>
          <Btn onClick={submit} active={text.trim().length > 0} sm>إضافة التحديث</Btn>
        </div>
      </div>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16 }}>
        <div style={{ fontSize:12, color:C.sub, marginBottom:12, fontWeight:700 }}>السجل ({logs.length} تحديث)</div>
        {logs.length === 0
          ? <div style={{ textAlign:"center", color:C.muted, fontSize:12, padding:20 }}>لا توجد تحديثات بعد</div>
          : [...logs].reverse().map((log, i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 0",
              borderBottom:`1px solid ${C.border}`, opacity: i > 0 ? 0.75 : 1 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", marginTop:4,
                  background: i === 0 ? C.accent : C.muted }}/>
                {i < logs.length - 1 && <div style={{ flex:1, width:1, background:C.border, marginTop:4 }}/>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>
                  🕐 {fmtDate(log.at)}
                  {log.by && <span style={{ marginRight:8, color:C.sub }}>· {log.by}</span>}
                </div>
                <div style={{ fontSize:12, color:C.text, lineHeight:1.7,
                  background:C.raised, borderRadius:7, padding:"8px 10px" }}>{log.note}</div>
              </div>
            </div>
          ))
        }
      </div>
    </Modal>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task: t, logCount, hasManual, onStatusChange, onOpenLog, onDelete }: {
  task: Task; logCount: number; hasManual: boolean;
  onStatusChange: (v: string) => void; onOpenLog: () => void; onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  const manualLogs = (t.updates || []).filter(u => !u.auto);
  const lastNote = manualLogs.length ? manualLogs[manualLogs.length - 1] : null;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ marginBottom:SP.sm, background: hov ? C.raised : C.surface, borderRadius:9,
        border:`1px solid ${hov ? C.sub : C.border}`, overflow:"hidden", transition:"all .15s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:SP.sm, padding:"9px 12px" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{t.title}</div>
          <div style={{ display:"flex", gap:SP.md, marginTop:3, flexWrap:"wrap", alignItems:"center" }}>
            {t.assignee && <span style={{ fontSize:10, color:C.sub }}>👤 {t.assignee}</span>}
            {t.updatedAt && hov && (
              <span style={{ fontSize:10, color:C.muted }}>
                🕐 {new Date(t.updatedAt).toLocaleDateString("ar-SA", { day:"2-digit", month:"short" })}
              </span>
            )}
          </div>
        </div>
        <div style={{ minWidth:120 }}>
          <Sel value={t.status} onChange={onStatusChange} options={STATUS_KEYS}/>
        </div>
        <button onClick={onOpenLog} title="سجل التحديثات"
          style={{ background: hasManual ? `${C.accent}20` : C.raised,
            border:`1px solid ${hasManual ? C.accent : C.border}`,
            borderRadius:7, cursor:"pointer", padding:"5px 9px",
            display:"flex", alignItems:"center", gap:5, flexShrink:0, transition:"all .15s" }}>
          <span style={{ fontSize:13 }}>📝</span>
          {logCount > 0 && <span style={{ fontSize:10, fontWeight:700, color:hasManual?C.accent:C.muted }}>{logCount}</span>}
        </button>
        <button onClick={onDelete}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, flexShrink:0,
            color: hov ? "#ef4444" : C.muted, opacity: hov ? 1 : 0.4, transition:"all .15s" }}>✕</button>
      </div>
      {lastNote && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"6px 12px",
          background:`${C.accent}08`, display:"flex", gap:SP.sm, alignItems:"flex-start" }}>
          <span style={{ fontSize:11, color:C.accent, flexShrink:0, marginTop:1 }}>💬</span>
          <span style={{ fontSize:11, color:C.sub, lineHeight:1.5, flex:1 }}>
            {lastNote.note.length > 90 ? lastNote.note.slice(0, 89) + "…" : lastNote.note}
          </span>
          <span style={{ fontSize:10, color:C.muted, flexShrink:0, whiteSpace:"nowrap" }}>
            {new Date(lastNote.at).toLocaleDateString("ar-SA", { day:"2-digit", month:"short" })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Component Card ───────────────────────────────────────────────────────────
function ComponentCard({ comp, onUpdateComp, onDeleteComp }: {
  comp: Comp;
  onUpdateComp: (updated: Comp) => void;
  onDeleteComp: (cid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title:"", assignee:"", status:"لم يبدأ" });
  const [logTask, setLogTask] = useState<Task | null>(null);
  const d = DRIVER[comp.driver as keyof typeof DRIVER];

  const setTaskStatus = async (tid: string, status: string) => {
    const autoNote = `تغيير الحالة إلى: ${status}`;
    try {
      const updated = await dtApi.updateTask(toNum(tid), { status });
      await dtApi.addTaskUpdate(toNum(tid), { note: autoNote, auto: "true" });
      const ts = nowISO();
      const tasks = comp.tasks.map(t => {
        if (t.id !== tid) return t;
        const newLog = { at: ts, note: autoNote, auto: true };
        return { ...adaptTask(updated), updates: [...(t.updates || []), newLog] };
      });
      onUpdateComp({ ...comp, tasks });
    } catch {}
  };

  const addUpdate = async (tid: string, note: string) => {
    try {
      const upd = await dtApi.addTaskUpdate(toNum(tid), { note });
      const tasks = comp.tasks.map(t => {
        if (t.id !== tid) return t;
        const newLog = { at: upd.createdAt, note };
        return { ...t, updatedAt: nowISO(), updates: [...(t.updates || []), newLog] };
      });
      onUpdateComp({ ...comp, tasks });
      setLogTask(tasks.find(t => t.id === tid) || null);
    } catch {}
  };

  const deleteTask = async (tid: string) => {
    try {
      await dtApi.deleteTask(toNum(tid));
      onUpdateComp({ ...comp, tasks: comp.tasks.filter(t => t.id !== tid) });
    } catch {}
  };

  const submitTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const created = await dtApi.createTask(toNum(comp.id), {
        title: newTask.title, status: newTask.status, assignee: newTask.assignee,
      });
      const task = adaptTask(created);
      onUpdateComp({ ...comp, tasks: [...comp.tasks, task] });
      setNewTask({ title:"", assignee:"", status:"لم يبدأ" });
      setAddingTask(false);
    } catch {}
  };

  const done = comp.tasks.filter(t => t.status === "مكتمل").length;
  const total = comp.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pr = PRIORITY[comp.priority];

  return (
    <>
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.card : C.raised,
        border:`1px solid ${hov ? (d?.color + "55" || C.sub) : C.border}`,
        borderRadius:11, marginBottom:10, overflow:"hidden",
        borderRight:`3px solid ${d?.color || C.muted}`,
        transition:"all .2s", boxShadow: hov ? "0 4px 16px #00000030" : "none" }}>
      <div style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:10 }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize:17, marginTop:1, flexShrink:0 }}>{d?.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{comp.title}</span>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
              <DriverTag driver={comp.driver} refYear={comp.refYear}/>
              <span style={{ fontSize:11, fontWeight:700, color:pr }}>
                {comp.priority==="عالية"?"●●●":comp.priority==="متوسطة"?"●●○":"●○○"}
              </span>
              <Btn onClick={e => { e?.stopPropagation(); onDeleteComp(comp.id); }} sm variant="danger">✕</Btn>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
            <div style={{ flex:1, background:C.muted, borderRadius:99, height:5, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:d?.color, borderRadius:99, transition:"width .4s" }}/>
            </div>
            <span style={{ fontSize:10, color:C.sub, flexShrink:0 }}>{done}/{total} مهمة</span>
            <span style={{ fontSize:10, color:d?.color, flexShrink:0 }}>{pct}%</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${C.border}` }}>
          <p style={{ fontSize:12, color:C.sub, margin:"12px 0", lineHeight:1.7 }}>{comp.desc}</p>
          <div style={{ marginTop:4 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:C.text }}>المهام</span>
              <Btn onClick={() => setAddingTask(true)} sm>+ مهمة</Btn>
            </div>
            {comp.tasks.length === 0 && !addingTask && (
              <EmptyState icon="✅" title="لا توجد مهام" sub="أضف مهمة لتتبع تنفيذ هذا العنصر"/>
            )}
            {comp.tasks.map(t => {
              const logCount = (t.updates || []).length;
              const hasManual = (t.updates || []).some(u => !u.auto);
              return (
                <TaskRow key={t.id} task={t} logCount={logCount} hasManual={hasManual}
                  onStatusChange={v => setTaskStatus(t.id, v)}
                  onOpenLog={() => setLogTask(t)}
                  onDelete={() => deleteTask(t.id)}/>
              );
            })}
            {addingTask && (
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8,
                background:C.surface, borderRadius:8, padding:12 }}>
                <Inp value={newTask.title}    onChange={v => setNewTask(p => ({ ...p, title:v }))}    placeholder="عنوان المهمة"/>
                <Inp value={newTask.assignee} onChange={v => setNewTask(p => ({ ...p, assignee:v }))} placeholder="المسؤول (اختياري)"/>
                <Sel value={newTask.status}   onChange={v => setNewTask(p => ({ ...p, status:v }))}   options={STATUS_KEYS}/>
                <div style={{ display:"flex", gap:7 }}>
                  <Btn onClick={submitTask} sm active>إضافة</Btn>
                  <Btn onClick={() => setAddingTask(false)} sm variant="ghost">إلغاء</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    {logTask && (
      <UpdateLogModal
        task={comp.tasks.find(t => t.id === logTask.id) || logTask}
        onAddUpdate={addUpdate}
        onClose={() => setLogTask(null)}/>
    )}
    </>
  );
}

// ─── Component Form ───────────────────────────────────────────────────────────
function ComponentForm({ initial, onSave, onClose }: {
  initial?: Partial<Comp>; onSave: (data: Omit<Comp, "id"|"tasks">) => void; onClose: () => void;
}) {
  const [f, setF] = useState<Omit<Comp, "id"|"tasks">>({
    driver: initial?.driver || "challenge",
    title: initial?.title || "",
    desc: initial?.desc || "",
    priority: initial?.priority || "عالية",
    refYear: initial?.refYear || new Date().getFullYear(),
  });
  return (
    <Modal title="إضافة تحدٍّ / فرصة / مبادرة" onClose={onClose} wide>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:8 }}>طبيعة هذا الجزء من الخطة</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8 }}>
            {DRIVER_KEYS.map(k => {
              const d = DRIVER[k];
              return (
                <button key={k} onClick={() => setF(p => ({ ...p, driver:k }))} style={{
                  background:f.driver===k?`${d.color}22`:"transparent",
                  border:`1px solid ${f.driver===k?d.color:C.border}`,
                  borderRadius:9, padding:"9px 12px", cursor:"pointer",
                  textAlign:"right", transition:"all .15s" }}>
                  <div style={{ fontSize:14, marginBottom:3 }}>{d.icon} <span style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.label}</span></div>
                  <div style={{ fontSize:10, color:C.sub, lineHeight:1.4 }}>{d.hint}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:6 }}>العنوان *</div>
          <Inp value={f.title} onChange={v => setF(p => ({ ...p, title:v }))} placeholder="صِف هذا التحدي أو الفرصة أو المبادرة…"/>
        </div>
        <div>
          <div style={{ fontSize:12, color:C.sub, marginBottom:6 }}>التفاصيل والسياق</div>
          <Inp value={f.desc} onChange={v => setF(p => ({ ...p, desc:v }))} placeholder="أرقام، مصادر، ملاحظات…" rows={3}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:6 }}>الأولوية</div>
            <Sel value={f.priority} onChange={v => setF(p => ({ ...p, priority:v }))} options={Object.keys(PRIORITY)}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:6 }}>سنة المرجع</div>
            <Sel value={f.refYear} onChange={v => setF(p => ({ ...p, refYear:+v }))}
              options={[2023,2024,2025,2026].map(y => [y, String(y)] as [number, string])}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="ghost" sm>إلغاء</Btn>
          <Btn onClick={() => { if (f.title.trim()) { onSave(f); onClose(); } }} active sm>حفظ</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Subplan Detail ───────────────────────────────────────────────────────────
function SubplanDetail({ sp, onUpdateSP }: { sp: SubPlan; onUpdateSP: (updated: SubPlan) => void }) {
  const [addComp, setAddComp]   = useState(false);
  const [addRes, setAddRes]     = useState(false);
  const [editProg, setEditProg] = useState(false);
  const [tmp, setTmp]           = useState(String(sp.progress));
  const [newRes, setNewRes]     = useState({ name:"", role:ROLES[0], allocation:100 });

  const updateComp = useCallback((updated: Comp) => {
    const components = sp.components.map(c => c.id === updated.id ? updated : c);
    const recalc = recalcSP({ ...sp, components });
    onUpdateSP(recalc);
    // Sync progress to API
    if (recalc.progress !== sp.progress || recalc.status !== sp.status) {
      dtApi.updateSubplan(toNum(sp.id), { progress: recalc.progress, status: recalc.status }).catch(() => {});
    }
  }, [sp, onUpdateSP]);

  const deleteComp = useCallback(async (cid: string) => {
    try {
      await dtApi.deleteComponent(toNum(cid));
      const components = sp.components.filter(c => c.id !== cid);
      const recalc = recalcSP({ ...sp, components });
      onUpdateSP(recalc);
      await dtApi.updateSubplan(toNum(sp.id), { progress: recalc.progress, status: recalc.status });
    } catch {}
  }, [sp, onUpdateSP]);

  const saveComp = async (data: Omit<Comp, "id"|"tasks">) => {
    try {
      const created = await dtApi.createComponent(toNum(sp.id), data);
      const comp = adaptComp(created);
      const components = [...sp.components, comp];
      onUpdateSP({ ...sp, components });
    } catch {}
  };

  const submitRes = async () => {
    if (!newRes.name.trim()) return;
    try {
      const created = await dtApi.createResource(toNum(sp.id), newRes);
      onUpdateSP({ ...sp, resources: [...sp.resources, { id: String(created.id), ...newRes }] });
      setNewRes({ name:"", role:ROLES[0], allocation:100 });
      setAddRes(false);
    } catch {}
  };

  const removeRes = async (rid: string) => {
    try {
      await dtApi.deleteResource(toNum(rid));
      onUpdateSP({ ...sp, resources: sp.resources.filter(r => r.id !== rid) });
    } catch {}
  };

  const applyProg = async () => {
    const progress = Math.max(0, Math.min(100, +tmp));
    const status = progress === 100 ? "مكتمل" : progress > 0 ? "جاري التنفيذ" : "لم يبدأ";
    try {
      await dtApi.updateSubplan(toNum(sp.id), { progress, status });
      onUpdateSP({ ...sp, progress, status });
      setEditProg(false);
    } catch {}
  };

  const days = daysLeft(sp.deadline);
  const cfg  = STATUS[sp.status] || STATUS["لم يبدأ"];
  const driverGroups = DRIVER_KEYS.reduce<Partial<Record<string, Comp[]>>>((acc, k) => {
    const items = sp.components.filter(c => c.driver === k);
    if (items.length) acc[k] = items;
    return acc;
  }, {});

  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13,
        padding:18, marginBottom:18, display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
        <Ring pct={sp.progress} size={58} stroke={5} color={cfg.color}/>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{sp.title}</div>
          <div style={{ display:"flex", gap:10, marginTop:7, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ background:cfg.bar, color:cfg.color, border:`1px solid ${cfg.color}35`,
              borderRadius:20, padding:"3px 11px", fontSize:11, fontWeight:700 }}>{sp.status}</span>
            <span style={{ fontSize:12, color:days<0?C.red:days<14?"#f59e0b":C.sub }}>
              {days<0?`⚠ تأخر ${Math.abs(days)} يوم`:`📅 ${days} يوم متبقٍ`}
            </span>
          </div>
        </div>
        <div>
          {editProg
            ? <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input type="number" min={0} max={100} value={tmp} onChange={e => setTmp(e.target.value)}
                  style={{ width:60, background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:7, color:C.text, padding:"6px 9px", fontFamily:"inherit" }}/>
                <Btn onClick={applyProg} sm variant="success">✓</Btn>
                <Btn onClick={() => setEditProg(false)} sm variant="ghost">✕</Btn>
              </div>
            : <Btn onClick={() => { setTmp(String(sp.progress)); setEditProg(true); }} sm variant="ghost">تعديل {sp.progress}%</Btn>
          }
        </div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {DRIVER_KEYS.map(k => {
          const count = (driverGroups[k] || []).length;
          if (!count) return null;
          const d = DRIVER[k];
          return (
            <div key={k} style={{ background:`${d.color}14`, border:`1px solid ${d.color}30`,
              borderRadius:8, padding:"5px 12px", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:13 }}>{d.icon}</span>
              <span style={{ fontSize:11, color:d.color, fontWeight:700 }}>{count}</span>
              <span style={{ fontSize:10, color:C.sub }}>{d.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text }}>
            مكوّنات الخطة
            <span style={{ fontSize:11, color:C.sub, fontWeight:400, marginRight:8 }}>(تحديات · فرص · مبادرات · متطلبات)</span>
          </div>
          <Btn onClick={() => setAddComp(true)} sm active>+ إضافة</Btn>
        </div>
        {sp.components.length === 0
          ? <EmptyState icon="📋" title="لا توجد مكوّنات بعد" sub="أضف تحدياً أو فرصة أو مبادرة لهذه الخطة لتتبع تقدمها"/>
          : sp.components.map(c => (
              <ComponentCard key={c.id} comp={c}
                onUpdateComp={updateComp} onDeleteComp={deleteComp}/>
            ))
        }
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text }}>الموارد البشرية ({sp.resources.length})</div>
          <Btn onClick={() => setAddRes(true)} sm>+ مورد</Btn>
        </div>
        {sp.resources.length === 0
          ? <EmptyState icon="👥" title="لا توجد موارد بعد" sub="أضف أعضاء الفريق وتحديد نسبة تخصيصهم"/>
          : sp.resources.map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:11,
              padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:`${C.accent}22`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, color:C.accent, fontWeight:700, flexShrink:0 }}>{r.name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{r.name}</div>
                <div style={{ display:"flex", gap:6, marginTop:4 }}>
                  <span style={{ fontSize:10, background:"#0ea5e920", color:"#0ea5e9", border:"1px solid #0ea5e930", borderRadius:5, padding:"2px 7px" }}>{r.role}</span>
                  <span style={{ fontSize:10,
                    background:r.allocation>=100?"#ef444420":r.allocation>=70?"#f59e0b20":"#10b98120",
                    color:r.allocation>=100?"#ef4444":r.allocation>=70?"#f59e0b":"#10b981",
                    border:`1px solid ${r.allocation>=100?"#ef444440":r.allocation>=70?"#f59e0b40":"#10b98140"}`,
                    borderRadius:5, padding:"2px 7px" }}>{r.allocation}%</span>
                </div>
              </div>
              <button onClick={() => removeRes(r.id)}
                style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14 }}>✕</button>
            </div>
          ))
        }
        {addRes && (
          <div style={{ marginTop:12, background:C.surface, borderRadius:9, padding:14, display:"flex", flexDirection:"column", gap:10 }}>
            <Inp value={newRes.name} onChange={v => setNewRes(p => ({ ...p, name:v }))} placeholder="اسم الشخص"/>
            <Sel value={newRes.role} onChange={v => setNewRes(p => ({ ...p, role:v }))} options={ROLES}/>
            <div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:5 }}>نسبة التخصيص: {newRes.allocation}%</div>
              <input type="range" min={10} max={100} step={10} value={newRes.allocation}
                onChange={e => setNewRes(p => ({ ...p, allocation:+e.target.value }))}
                style={{ width:"100%", accentColor:C.accent }}/>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <Btn onClick={submitRes} sm active>إضافة</Btn>
              <Btn onClick={() => setAddRes(false)} sm variant="ghost">إلغاء</Btn>
            </div>
          </div>
        )}
      </div>

      {addComp && <ComponentForm onSave={saveComp} onClose={() => setAddComp(false)}/>}
    </div>
  );
}

// ─── HoverCard ────────────────────────────────────────────────────────────────
function HoverCard({ onClick, style, children }: {
  onClick?: () => void; style?: React.CSSProperties; children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ cursor:onClick?"pointer":undefined, padding:"10px 12px", borderRadius:9,
        border:`1px solid ${hov ? C.sub : C.border}`, background: hov ? C.card : C.surface,
        boxShadow: hov ? "0 4px 20px #00000028" : "none",
        transform: hov ? "translateY(-1px)" : "none", transition:"all .18s", ...style }}>
      {children}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ project, onSelect }: { project: Project; onSelect: (id: string) => void }) {
  const overall = Math.round(
    project.subplans.reduce((s, p) => s + p.progress, 0) / (project.subplans.length || 1)
  );
  const driverCounts = DRIVER_KEYS.reduce<Record<string, number>>((acc, k) => {
    acc[k] = project.subplans.flatMap(sp => sp.components).filter(c => c.driver === k).length;
    return acc;
  }, {});
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:22 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"15px 17px" }}>
          <div style={{ fontSize:24, fontWeight:800, color:C.accent }}>{overall}%</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>التقدم الكلي</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"15px 17px" }}>
          <div style={{ fontSize:24, fontWeight:800, color:"#10b981" }}>
            {project.subplans.filter(p => p.status === "مكتمل").length}/{project.subplans.length}
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>خطط مكتملة</div>
        </div>
        {DRIVER_KEYS.map(k => {
          const d = DRIVER[k];
          return driverCounts[k] > 0 ? (
            <div key={k} style={{ background:C.card, border:`1px solid ${d.color}35`, borderRadius:12, padding:"15px 17px" }}>
              <div style={{ fontSize:24, fontWeight:800, color:d.color }}>{driverCounts[k]}</div>
              <div style={{ fontSize:10, color:C.sub, marginTop:3 }}>{d.icon} {d.label}</div>
            </div>
          ) : null;
        })}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>الخطط الفرعية</div>
        {project.subplans.length === 0
          ? <EmptyState icon="📁" title="لا توجد خطط فرعية" sub="أضف خطة فرعية لبدء تتبع التحول الرقمي"/>
          : project.subplans.map(sp => {
            const days = daysLeft(sp.deadline);
            const cfg  = STATUS[sp.status] || STATUS["لم يبدأ"];
            const dTags = DRIVER_KEYS.filter(k => sp.components.some(c => c.driver === k));
            return (
              <HoverCard key={sp.id} onClick={() => onSelect(sp.id)} style={{ marginBottom:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontSize:13, color:C.text, fontWeight:700 }}>{sp.title}</div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
                      {dTags.map(k => {
                        const d = DRIVER[k];
                        const cnt = sp.components.filter(c => c.driver === k).length;
                        return (
                          <span key={k} style={{ fontSize:10, background:`${d.color}18`, color:d.color,
                            border:`1px solid ${d.color}30`, borderRadius:20, padding:"2px 8px" }}>
                            {d.icon} {cnt}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:7, alignItems:"center", flexShrink:0 }}>
                    <span style={{ fontSize:11, color:days<0?"#ef4444":days<14?"#f59e0b":C.sub }}>
                      {days<0?`تأخر ${Math.abs(days)} يوم`:`${days} يوم`}
                    </span>
                    <span style={{ background:cfg.bar, color:cfg.color, border:`1px solid ${cfg.color}35`,
                      borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{sp.status}</span>
                  </div>
                </div>
                <div style={{ marginTop:10, background:C.muted, borderRadius:99, height:7, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${sp.progress}%`, background:cfg.color, borderRadius:99, transition:"width .5s" }}/>
                </div>
                <div style={{ fontSize:10, color:C.sub, marginTop:3, textAlign:"left" }}>{sp.progress}%</div>
              </HoverCard>
            );
          })
        }
      </div>
    </div>
  );
}

// ─── Add Subplan Modal ────────────────────────────────────────────────────────
function AddSPModal({ onAdd, onClose }: { onAdd: (title: string, deadline: string) => void; onClose: () => void }) {
  const [f, setF] = useState({ title:"", deadline:"" });
  return (
    <Modal title="إضافة خطة فرعية جديدة" onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Inp value={f.title}    onChange={v => setF(p => ({ ...p, title:v }))}    placeholder="عنوان الخطة الفرعية"/>
        <Inp value={f.deadline} onChange={v => setF(p => ({ ...p, deadline:v }))} type="date"/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="ghost" sm>إلغاء</Btn>
          <Btn onClick={() => { if (f.title.trim() && f.deadline) { onAdd(f.title, f.deadline); onClose(); } }} active sm>إضافة</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Snapshot Card ────────────────────────────────────────────────────────────
function SnapshotCard({ snap, selected, onSelect, onDelete, onExport }: {
  snap: Snapshot; selected: boolean; onSelect: () => void; onDelete: () => void; onExport: () => void;
}) {
  const [hov, setHov] = useState(false);
  const m = snap.metrics;
  const taskPct = m.totalTasks ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;
  const periodLabels: Record<string, string> = { manual:"يدوي", monthly:"شهري", quarterly:"ربع سنوي" };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: selected ? `${C.accent}12` : hov ? C.card : C.raised,
        border:`1px solid ${selected ? C.accent : hov ? C.sub : C.border}`,
        borderRadius:12, padding:16, marginBottom:10, cursor:"pointer",
        transition:"all .18s", transform: hov && !selected ? "translateY(-1px)" : "none",
        boxShadow: hov ? "0 6px 24px #00000030" : "none" }} onClick={onSelect}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{snap.label}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
            🕐 {fmtDate(snap.createdAt)}
            <span style={{ marginRight:8, background:`${C.accent}18`, color:C.accent,
              border:`1px solid ${C.accent}30`, borderRadius:5, padding:"1px 7px", fontSize:10 }}>
              {periodLabels[snap.period] || snap.period}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          <button onClick={e => { e.stopPropagation(); onExport(); }}
            style={{ background:"transparent", border:`1px solid ${C.border}`,
              borderRadius:6, cursor:"pointer", padding:"4px 8px", fontSize:11, color:C.sub }}>⬇ JSON</button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background:"#ef444418", border:"1px solid #ef444440",
              borderRadius:6, cursor:"pointer", padding:"4px 8px", fontSize:11, color:"#ef4444" }}>✕</button>
        </div>
      </div>
      <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ flex:1, background:C.muted, borderRadius:99, height:8, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${m.overallProgress}%`, background:C.accent, borderRadius:99 }}/>
        </div>
        <span style={{ fontSize:12, fontWeight:800, color:C.accent, flexShrink:0 }}>{m.overallProgress}%</span>
      </div>
      <div style={{ display:"flex", gap:14, marginTop:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"#10b981" }}>✅ {m.completedTasks} مهمة مكتملة</span>
        <span style={{ fontSize:11, color:"#3b82f6" }}>🔄 {m.inProgressTasks} جارية</span>
        {m.delayedTasks > 0 && <span style={{ fontSize:11, color:"#ef4444" }}>⚠ {m.delayedTasks} متأخرة</span>}
        <span style={{ fontSize:11, color:C.sub }}>/ {m.totalTasks} إجمالي</span>
      </div>
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>إنجاز المهام</span>
        <div style={{ flex:1, background:C.muted, borderRadius:99, height:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${taskPct}%`, background:"#10b981", borderRadius:99 }}/>
        </div>
        <span style={{ fontSize:10, color:"#10b981", flexShrink:0 }}>{taskPct}%</span>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
        {DRIVER_KEYS.map(k => {
          const cnt = m.byDriver[k];
          if (!cnt) return null;
          const d = DRIVER[k];
          return (
            <span key={k} style={{ fontSize:10, background:`${d.color}18`, color:d.color,
              border:`1px solid ${d.color}30`, borderRadius:20, padding:"2px 8px" }}>
              {d.icon} {cnt}
            </span>
          );
        })}
      </div>
      {m.subplanSummaries.length > 0 && (
        <div style={{ marginTop:12, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
          {m.subplanSummaries.map(s => {
            const cfg = STATUS[s.status] || STATUS["لم يبدأ"];
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:10, color:cfg.color, flexShrink:0, minWidth:60 }}>{s.progress}%</span>
                <div style={{ flex:1, background:C.muted, borderRadius:99, height:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${s.progress}%`, background:cfg.color, borderRadius:99 }}/>
                </div>
                <span style={{ fontSize:10, color:C.sub, flexShrink:0, maxWidth:130,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.title}</span>
                <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{s.tasksDone}/{s.tasksTotal}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Diff Row ─────────────────────────────────────────────────────────────────
function DiffRow({ label, a, b, unit="" }: { label: string; a: number; b: number; unit?: string }) {
  const diff = b - a;
  const color = diff > 0 ? "#10b981" : diff < 0 ? "#ef4444" : C.muted;
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "—";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:12, color:C.sub }}>{label}</span>
      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
        <span style={{ fontSize:12, color:C.muted }}>{a}{unit}</span>
        <span style={{ fontSize:13, color, fontWeight:700 }}>{arrow} {diff !== 0 ? Math.abs(diff) + unit : ""}</span>
        <span style={{ fontSize:12, color:C.text, fontWeight:700 }}>{b}{unit}</span>
      </div>
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────
function ReportsView({ project, snapshots, onAddSnapshot, onDeleteSnapshot }: {
  project: Project; snapshots: Snapshot[];
  onAddSnapshot: (label: string, period: Snapshot["period"]) => void;
  onDeleteSnapshot: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newPeriod, setNewPeriod] = useState<Snapshot["period"]>("manual");
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const current = computeMetrics(project);
  const snapA = snapshots.find(s => s.id === compareA);
  const snapB = snapshots.find(s => s.id === compareB);

  return (
    <div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>المؤشرات الحالية</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10 }}>
          {[
            { label:"التقدم الكلي",   val:`${current.overallProgress}%`,                  color:C.accent },
            { label:"مهام مكتملة",    val:`${current.completedTasks}/${current.totalTasks}`, color:"#10b981" },
            { label:"مهام جارية",     val:current.inProgressTasks,                         color:"#3b82f6" },
            { label:"مهام متأخرة",    val:current.delayedTasks,                            color:"#ef4444" },
            { label:"خطط مكتملة",     val:`${current.completedSubplans}/${current.totalSubplans}`, color:"#8b5cf6" },
            { label:"خطط متأخرة",     val:current.delayedSubplans,                         color:"#f59e0b" },
          ].map(item => (
            <div key={item.label} style={{ background:C.raised, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:item.color }}>{item.val}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:12, color:C.sub, marginBottom:8, fontWeight:700 }}>توزيع المحركات</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {DRIVER_KEYS.map(k => {
              const cnt = current.byDriver[k];
              if (!cnt) return null;
              const d = DRIVER[k];
              return (
                <div key={k} style={{ background:`${d.color}14`, border:`1px solid ${d.color}30`,
                  borderRadius:8, padding:"6px 12px", display:"flex", gap:7, alignItems:"center" }}>
                  <span style={{ fontSize:13 }}>{d.icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:d.color }}>{cnt}</span>
                  <span style={{ fontSize:11, color:C.sub }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>حفظ لقطة جديدة</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <Inp value={newLabel} onChange={setNewLabel} placeholder="اسم التقرير (اختياري)…"/>
          </div>
          <div style={{ minWidth:160 }}>
            <Sel value={newPeriod} onChange={v => setNewPeriod(v as Snapshot["period"])}
              options={[["manual","يدوي"],["monthly","شهري"],["quarterly","ربع سنوي"]]}/>
          </div>
          <Btn onClick={() => { onAddSnapshot(newLabel, newPeriod); setNewLabel(""); }} active>
            📸 حفظ لقطة
          </Btn>
          {snapshots.length > 0 && (
            <Btn onClick={() => exportJSON({ project, snapshots, exportedAt: nowISO() }, `dt-report-${Date.now()}.json`)} variant="ghost">
              ⬇ تصدير الكل JSON
            </Btn>
          )}
        </div>
      </div>

      {snapshots.length >= 2 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>مقارنة لقطتين</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:5 }}>اللقطة الأولى (قبل)</div>
              <Sel value={compareA || ""} onChange={setCompareA}
                options={[["","— اختر —"], ...snapshots.map(s => [s.id, s.label] as [string, string])]}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:5 }}>اللقطة الثانية (بعد)</div>
              <Sel value={compareB || ""} onChange={setCompareB}
                options={[["","— اختر —"], ...snapshots.map(s => [s.id, s.label] as [string, string])]}/>
            </div>
          </div>
          {snapA && snapB && (
            <div style={{ background:C.raised, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:10, display:"flex", justifyContent:"space-between" }}>
                <span>قبل: {fmtDate(snapA.createdAt)}</span>
                <span>بعد: {fmtDate(snapB.createdAt)}</span>
              </div>
              <DiffRow label="التقدم الكلي"       a={snapA.metrics.overallProgress}  b={snapB.metrics.overallProgress}  unit="%"/>
              <DiffRow label="مهام مكتملة"        a={snapA.metrics.completedTasks}   b={snapB.metrics.completedTasks}/>
              <DiffRow label="مهام جارية"         a={snapA.metrics.inProgressTasks}  b={snapB.metrics.inProgressTasks}/>
              <DiffRow label="خطط مكتملة"         a={snapA.metrics.completedSubplans} b={snapB.metrics.completedSubplans}/>
              <DiffRow label="خطط متأخرة"         a={snapA.metrics.delayedSubplans}  b={snapB.metrics.delayedSubplans}/>
            </div>
          )}
        </div>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:18 }}>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14 }}>
          سجل اللقطات ({snapshots.length})
        </div>
        {snapshots.length === 0
          ? <EmptyState icon="📸" title="لا توجد لقطات بعد" sub="احفظ لقطتك الأولى لتتبع التقدم عبر الزمن ومقارنة الأداء بين الفترات"/>
          : [...snapshots].reverse().map(snap => (
            <SnapshotCard key={snap.id} snap={snap}
              selected={compareA === snap.id || compareB === snap.id}
              onSelect={() => { if (!compareA || compareA === snap.id) setCompareA(snap.id); else setCompareB(snap.id); }}
              onDelete={() => onDeleteSnapshot(snap.id)}
              onExport={() => exportJSON(snap, `snapshot-${snap.id}.json`)}/>
          ))
        }
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [project, setProject]   = useState<Project | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selId, setSelId]       = useState<string | null>(null);
  const [view, setView]         = useState<"overview" | "detail" | "reports">("overview");
  const [showAddSP, setShowAddSP] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast]       = useState<{ msg: string; key: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, key: Date.now() });
  }, []);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const projects = await dtApi.listProjects();
        let proj: DtProject;
        if (projects.length === 0) {
          const created = await dtApi.createProject({ title: "خطة التحول الرقمي 2025", deadline: "2025-12-31" });
          proj = await dtApi.getProject(created.id);
        } else {
          proj = await dtApi.getProject(projects[0].id);
        }
        setProject(adaptProject(proj));
        const snaps = await dtApi.listSnapshots(proj.id);
        setSnapshots(snaps.map(adaptSnapshot));
      } catch {
        showToast("⚠ فشل تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [showToast]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const updateSP = useCallback((updated: SubPlan) => {
    setProject(prev => prev ? { ...prev, subplans: prev.subplans.map(sp => sp.id === updated.id ? updated : sp) } : null);
  }, []);

  const addSP = async (title: string, deadline: string) => {
    if (!project) return;
    try {
      const created = await dtApi.createSubplan(project.id, { title, deadline });
      const sp = adaptSubplan(created);
      setProject(prev => prev ? { ...prev, subplans: [...prev.subplans, sp] } : null);
      showToast("✅ تمت إضافة الخطة الفرعية");
    } catch { showToast("⚠ فشل إضافة الخطة الفرعية"); }
  };

  const removeSP = async (id: string) => {
    try {
      await dtApi.deleteSubplan(toNum(id));
      setProject(prev => prev ? { ...prev, subplans: prev.subplans.filter(sp => sp.id !== id) } : null);
      if (selId === id) { setSelId(null); setView("overview"); }
      showToast("🗑 تم حذف الخطة الفرعية");
    } catch { showToast("⚠ فشل الحذف"); }
  };

  const handleAddSnapshot = async (label: string, period: Snapshot["period"]) => {
    if (!project) return;
    try {
      const metrics = computeMetrics(project);
      const finalLabel = label || `لقطة ${new Date().toLocaleDateString("ar-SA", { day:"2-digit", month:"short", year:"numeric" })}`;
      const created = await dtApi.createSnapshot(project.id, {
        label: finalLabel, period,
        metrics: metrics as unknown as Record<string, unknown>,
      });
      setSnapshots(prev => [...prev, adaptSnapshot(created)]);
      showToast("✅ تم حفظ اللقطة");
    } catch { showToast("⚠ فشل حفظ اللقطة"); }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      await dtApi.deleteSnapshot(toNum(id));
      setSnapshots(prev => prev.filter(s => s.id !== id));
      showToast("🗑 تم الحذف");
    } catch { showToast("⚠ فشل الحذف"); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Cairo',sans-serif", color:C.sub, fontSize:15 }}>
        جارٍ تحميل البيانات…
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Cairo',sans-serif", color:C.red, fontSize:15 }}>
        تعذّر تحميل المشروع. تحقق من الاتصال بالخادم.
      </div>
    );
  }

  const selected = project.subplans.find(p => p.id === selId);
  const overall  = Math.round(project.subplans.reduce((s, p) => s + p.progress, 0) / (project.subplans.length || 1));

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'Cairo','Segoe UI',sans-serif", direction:"rtl" }}>

      {/* ── Header ── */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        position:"sticky", top:0, zIndex:50 }}>
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6,
            color:C.muted, cursor:"pointer", fontSize:14, padding:"4px 8px", flexShrink:0 }}
          title="طيّ/فتح القائمة الجانبية">☰</button>
        <div style={{ flex:1, minWidth:180 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.text }}>{project.title}</div>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 4px #22c55e88" }}/>
          </div>
          <div style={{ fontSize:11, color:C.muted }}>الموعد النهائي: {project.deadline}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Ring pct={overall} size={38} stroke={4}/>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.accent }}>{overall}%</div>
            <div style={{ fontSize:9, color:C.muted }}>إجمالي</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={() => { setView("overview"); setSelId(null); }} active={view === "overview" && !selId} sm>📊 اللوحة</Btn>
          <Btn onClick={() => setView("reports")} active={view === "reports"} sm>📋 التقارير</Btn>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, borderRight:`1px solid ${C.border}`, paddingRight:12 }}>
          <span style={{ fontSize:11, color:C.muted }}>👤 {user?.fullName}</span>
          <Btn onClick={logout} sm variant="ghost">خروج</Btn>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={{ display:"grid",
        gridTemplateColumns: sidebarOpen ? "248px 1fr" : "0px 1fr",
        minHeight:"calc(100vh - 60px)", transition:"grid-template-columns .25s" }}>

        {/* Sidebar */}
        <div style={{ background:C.surface, borderLeft:`1px solid ${C.border}`,
          overflowY:"auto", overflowX:"hidden",
          transition:"width .25s", width: sidebarOpen ? 248 : 0 }}>
          <div style={{ padding:"14px 14px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1 }}>الخطط الفرعية</span>
            <Btn onClick={() => setShowAddSP(true)} sm>+</Btn>
          </div>

          {project.subplans.map((sp, i) => {
            const active = selId === sp.id && view === "detail";
            const cfg = STATUS[sp.status] || STATUS["لم يبدأ"];
            const dTags = DRIVER_KEYS.filter(k => sp.components.some(c => c.driver === k));
            return (
              <div key={sp.id} onClick={() => { setSelId(sp.id); setView("detail"); }}
                style={{ padding:"10px 13px", cursor:"pointer",
                  background: active ? `${C.accent}15` : "transparent",
                  borderRight: active ? `3px solid ${C.accent}` : "3px solid transparent" }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:cfg.bar,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:700, color:cfg.color, flexShrink:0, marginTop:1 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:active?C.text:C.sub,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sp.title}</div>
                    <div style={{ display:"flex", gap:4, marginTop:4 }}>
                      {dTags.map(k => <span key={k} style={{ fontSize:10, color:DRIVER[k].color }}>{DRIVER[k].icon}</span>)}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                      <div style={{ flex:1, background:C.muted, borderRadius:99, height:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${sp.progress}%`, background:cfg.color, borderRadius:99 }}/>
                      </div>
                      <span style={{ fontSize:9, color:C.muted }}>{sp.progress}%</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeSP(sp.id); }}
                    style={{ background:"none", border:"none", color:C.muted, cursor:"pointer",
                      fontSize:12, padding:0, opacity:.5, flexShrink:0, marginTop:1 }}>✕</button>
                </div>
              </div>
            );
          })}

          {snapshots.length > 0 && (
            <div style={{ margin:"8px 13px 0", padding:"8px 12px",
              background:`${C.accent}10`, border:`1px solid ${C.accent}25`, borderRadius:8,
              cursor:"pointer" }} onClick={() => setView("reports")}>
              <div style={{ fontSize:11, color:C.accent, fontWeight:700 }}>📋 {snapshots.length} لقطة محفوظة</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>انقر لعرض التقارير</div>
            </div>
          )}

          {/* Legend */}
          <div style={{ padding:"16px 13px", borderTop:`1px solid ${C.border}`, marginTop:8 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>أنواع المحركات</div>
            {DRIVER_KEYS.map(k => {
              const d = DRIVER[k];
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:d.color }}>{d.icon}</span>
                  <span style={{ fontSize:10, color:C.sub }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding:20, overflowY:"auto" }}>
          {view === "reports"
            ? <ReportsView project={project} snapshots={snapshots}
                onAddSnapshot={handleAddSnapshot} onDeleteSnapshot={handleDeleteSnapshot}/>
            : view === "detail" && selected
              ? <SubplanDetail key={selected.id} sp={selected} onUpdateSP={updateSP}/>
              : <Overview project={project} onSelect={id => { setSelId(id); setView("detail"); }}/>
          }
        </div>
      </div>

      {showAddSP && <AddSPModal onAdd={addSP} onClose={() => setShowAddSP(false)}/>}
      {toast && <Toast key={toast.key} msg={toast.msg} onDone={() => setToast(null)}/>}
    </div>
  );
}
