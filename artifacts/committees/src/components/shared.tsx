import { useState, useEffect, type ReactNode, type CSSProperties } from "react";

export const C = {
  bg:"#06080f", surface:"#0c1119", card:"#101823", raised:"#141f2e",
  border:"#182436", accent:"#2563eb", text:"#dde4ef",
  sub:"#6b84a0", muted:"#2e4159", red:"#ef4444", green:"#10b981", amber:"#f59e0b",
};

export const SP = { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24 } as const;

export function Btn({ onClick, children, active, sm, variant="default" }: {
  onClick?: (e?: React.MouseEvent) => void; children: ReactNode;
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

export function Sel({ value, onChange, options }: {
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

export function Inp({ value, onChange, placeholder, type="text", rows }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; rows?: number;
}) {
  const s: CSSProperties = {
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:7,
    color:C.text, padding:"7px 11px", fontSize:13, width:"100%", outline:"none",
    fontFamily:"inherit", direction:"rtl", boxSizing:"border-box", resize:"vertical",
  };
  return rows
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={s}/>
    : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s}/>;
}

export function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: ReactNode;
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

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
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

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, color, background:`${color}20`,
      border:`1px solid ${color}40`, borderRadius:99, padding:"2px 9px" }}>{label}</span>
  );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign:"center", padding:"32px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:SP.sm }}>
      <div style={{ fontSize:28, opacity:.6 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.sub }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:C.muted }}>{sub}</div>}
    </div>
  );
}
