import { useState, useRef, useCallback, useEffect } from "react";
import { getRateLimitStatus } from "../security.js";
import { fmt } from "../utils.js";

export function Card({ children, className = "", glow = false }) {
  return (
    <div className={`rounded-2xl p-7 transition-all card-animate ${className}`}
      style={{
        background:"#1a1a2e",
        border:"1px solid #7c3aed",
        boxShadow: glow
          ? "0 0 0 1px #7c3aed, 0 8px 36px rgba(124,58,237,0.45), 0 0 60px rgba(6,182,212,0.12)"
          : "0 4px 28px rgba(124,58,237,0.3), 0 8px 32px rgba(0,0,0,0.4)"
      }}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, sub, accent = "emerald" }) {
  const accents = { emerald:"text-cyan-400", amber:"text-amber-400", rose:"text-rose-400", sky:"text-cyan-300", violet:"text-violet-400", pink:"text-pink-400" };
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-bold font-mono ${accents[accent]}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </Card>
  );
}

export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-2 shadow-xl" style={{background:"#1a1a2e",border:"1px solid rgba(124,58,237,0.25)"}}>
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono" style={{ color: p.color || "#34d399" }}>
          {p.name ? `${p.name}: ` : ""}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

/* ── FILE DROP ZONE (reusable) ────────────────────────────────────────── */
export function DropZone({ onFile, accept = ".pdf,.csv,.txt", label, sublabel, fileName, loading, progress }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`p-8 text-center cursor-pointer rounded-xl ${dragging ? "border-2 border-solid border-violet-500 bg-violet-950/20" : "dropzone-animated"}`}
    >
      <div className="text-4xl mb-2">{fileName ? "📄" : "⬆️"}</div>
      {fileName
        ? <p className="text-violet-300 text-sm font-medium">{fileName}</p>
        : <>
            <p className="text-slate-400 text-sm">{label} <span className="text-cyan-400 underline underline-offset-2">haz clic</span></p>
            <p className="text-slate-600 text-xs mt-1">{sublabel}</p>
          </>
      }
      {loading && progress && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-cyan-400">
          <span className="animate-spin inline-block">⟳</span> {progress}
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ── RATE LIMIT BADGE ────────────────────────────────────────────────── */
export function RateLimitBadge() {
  const [status, setStatus] = useState(getRateLimitStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getRateLimitStatus()), 3000);
    return () => clearInterval(id);
  }, []);
  const pct = (status.used / status.max) * 100;
  const color = status.remaining === 0 ? "text-rose-400" : status.remaining <= 2 ? "text-amber-400" : "text-slate-500";
  return (
    <span className={`text-xs ${color} flex items-center gap-1`} title="Solicitudes IA restantes en este minuto">
      <span>⚡</span>
      <span>{status.remaining}/{status.max} restantes</span>
    </span>
  );
}
