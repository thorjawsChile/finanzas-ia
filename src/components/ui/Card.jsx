import { fmt } from "../../constants.js";

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
    <div className="rounded-xl px-4 py-3 shadow-2xl" style={{
      background:"#0d0d1f",
      border:"1px solid rgba(124,58,237,0.55)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.7), 0 0 20px rgba(124,58,237,0.15)"
    }}>
      {label && <p className="text-xs text-slate-400 mb-2 pb-1.5 font-medium" style={{borderBottom:"1px solid rgba(124,58,237,0.2)"}}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono font-semibold" style={{ color: p.color || "#a78bfa" }}>
          {p.name ? <span className="font-normal text-slate-400 mr-1">{p.name}:</span> : ""}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
