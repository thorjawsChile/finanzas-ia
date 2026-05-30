import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CustomTooltip } from "./ui.jsx";
import { fmt, normalizePM } from "../utils.js";
import { MONTHS_ES } from "../constants.js";

/* ══════════════════════════════════════════════════════════════════════
   RESUMEN COMPARATIVO (shown in MultiAnalysisTab compare view)
══════════════════════════════════════════════════════════════════════ */
export default function ResumenComparativo({ periods }) {
  if (periods.length < 2) return null;

  const parsePM = p => {
    const pm = normalizePM(p.analysis?.periodoMes);
    if (pm) {
      const [mm, yyyy] = pm.split("/");
      return parseInt(yyyy) * 100 + parseInt(mm);
    }
    return p.addedAt || 0;
  };
  const pmLabel = p => {
    const pm = normalizePM(p.analysis?.periodoMes);
    if (pm) {
      const [mm, yyyy] = pm.split("/");
      return `${MONTHS_ES[parseInt(mm)-1].slice(0,3)} ${yyyy}`;
    }
    return p.label;
  };

  const sorted = [...periods].sort((a, b) => parsePM(a) - parsePM(b));

  // Trend data for line chart
  const trendData = sorted.map(p => ({
    label: pmLabel(p),
    total: p.analysis.totalExpenses || 0,
  }));

  // Overall trend
  const first       = sorted[0].analysis.totalExpenses || 0;
  const last        = sorted[sorted.length - 1].analysis.totalExpenses || 0;
  const overallDiff = last - first;
  const overallPct  = first > 0 ? ((overallDiff / first) * 100).toFixed(1) : 0;

  // Consecutive month-over-month deltas
  const deltas = [];
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const diff = (curr.analysis.totalExpenses || 0) - (prev.analysis.totalExpenses || 0);
    const pct  = prev.analysis.totalExpenses > 0
      ? ((diff / prev.analysis.totalExpenses) * 100).toFixed(1) : 0;
    const currCats = {}, prevCats = {};
    (curr.analysis.topCategories || []).forEach(c => { currCats[c.name] = c.total; });
    (prev.analysis.topCategories || []).forEach(c => { prevCats[c.name] = c.total; });
    const catChanges = [...new Set([...Object.keys(currCats), ...Object.keys(prevCats)])]
      .map(name => ({ name, diff: (currCats[name] || 0) - (prevCats[name] || 0) }))
      .filter(c => Math.abs(c.diff) > 1000)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 3);
    deltas.push({ from: pmLabel(prev), to: pmLabel(curr), diff, pct, catChanges, up: diff > 0 });
  }

  return (
    <div className="space-y-4">
      {/* Trend line chart */}
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">📈 Tendencia de gastos</h3>
        <div className={`flex items-center gap-2 p-2.5 rounded-xl mb-4 ${overallDiff > 0 ? "bg-rose-950/40 border border-rose-800/40" : "bg-emerald-950/40 border border-emerald-800/40"}`}>
          <span className="text-lg">{overallDiff > 0 ? "📈" : "📉"}</span>
          <div>
            <span className={`text-sm font-bold font-mono ${overallDiff > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {overallDiff > 0 ? "+" : ""}{fmt(overallDiff)} ({overallDiff > 0 ? "+" : ""}{overallPct}%)
            </span>
            <span className="text-xs text-slate-500 ml-2">{pmLabel(sorted[0])} → {pmLabel(sorted[sorted.length-1])}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={trendData} margin={{ left: 0, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v => "$"+(v/1000000).toFixed(1)+"M"} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={55}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Line type="monotone" dataKey="total" name="Gastos" stroke="#f87171" strokeWidth={2}
              dot={{ fill: "#f87171", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Month-over-month deltas */}
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Cambios mes a mes</h3>
        <div className="space-y-2">
          {deltas.map((d, i) => (
            <div key={i} className={`p-3 rounded-xl border ${d.up ? "bg-rose-950/20 border-rose-800/30" : "bg-emerald-950/20 border-emerald-800/30"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">{d.from}</span>
                  {" → "}
                  <span className="text-slate-300 font-medium">{d.to}</span>
                </span>
                <span className={`text-sm font-mono font-bold ${d.up ? "text-rose-400" : "text-emerald-400"}`}>
                  {d.up ? "+" : ""}{fmt(d.diff)}
                  <span className="text-xs font-normal ml-1 opacity-70">({d.up?"+":""}{d.pct}%)</span>
                </span>
              </div>
              {d.catChanges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {d.catChanges.map((c, j) => (
                    <span key={j} className={`text-xs px-2 py-0.5 rounded-full ${c.diff > 0 ? "bg-rose-900/50 text-rose-300" : "bg-emerald-900/50 text-emerald-300"}`}>
                      {c.diff > 0 ? "↑" : "↓"} {c.name} {c.diff > 0 ? "+" : ""}{fmt(c.diff)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
