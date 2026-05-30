import { fmt } from "../../constants.js";

export function Card({ children, className = "", glow = false }) {
  return (
    <div className={`rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm p-5 transition-all ${glow ? "shadow-lg shadow-emerald-900/20 border-emerald-700/40" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, sub, accent = "emerald" }) {
  const accents = { emerald:"text-emerald-400", amber:"text-amber-400", rose:"text-rose-400", sky:"text-sky-400", violet:"text-violet-400", pink:"text-pink-400" };
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
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 shadow-xl">
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono" style={{ color: p.color || "#34d399" }}>
          {p.name ? `${p.name}: ` : ""}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
