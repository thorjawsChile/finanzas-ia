import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";
import { CAT_COLORS, PALETTE, MONTHS_ES, fmt, normalizePM } from "../constants.js";
import { Card, KpiCard, CustomTooltip } from "./ui/Card.jsx";
import { analyzeMultiPeriodsAI } from "../ai/analyzeMultiPeriods.js";

/* ══════════════════════════════════════════════════════════════════════
   RESUMEN COMPARATIVO (shown in MultiAnalysisTab compare view)
══════════════════════════════════════════════════════════════════════ */
function ResumenComparativo({ periods }) {
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

/* ══════════════════════════════════════════════════════════════════════
   MULTI-PERIOD ANALYSIS TAB
══════════════════════════════════════════════════════════════════════ */
export function MultiAnalysisTab({ periods, salaries, onRemove }) {
  const [view,      setView]      = useState("combined"); // "combined" | "compare" | "ai"
  const [aiResult,  setAiResult]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");

  const handleAiAnalysis = async (salaries) => {
    if (periods.length === 0) return;
    setAiLoading(true); setAiError(""); setAiResult(null);
    try {
      const result = await analyzeMultiPeriodsAI(periods, salaries || []);
      setAiResult(result);
      setView("ai");
    } catch(e) { setAiError("Error: " + e.message); }
    finally { setAiLoading(false); }
  };

  if (periods.length === 0) {
    return (
      <Card className="text-center py-16">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-slate-500 text-sm">Aún no hay períodos cargados.</p>
        <p className="text-slate-600 text-xs mt-1">Analiza al menos un estado de cuenta en la pestaña Gastos.</p>
      </Card>
    );
  }

  // ── Combined view: merge all periods ──────────────────────────────────────
  const allExpenses = periods.flatMap(p => p.analysis.expenses || []);
  const combinedTotal = allExpenses.reduce((a, e) => a + e.amount, 0);
  const combinedAvg   = periods.length > 0 ? combinedTotal / periods.length : 0;

  const catMap = {};
  allExpenses.forEach(e => { catMap[e.category] = (catMap[e.category]||0) + e.amount; });
  const pieData = Object.entries(catMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);

  // ── Compare view: one bar per period ─────────────────────────────────────
  const compareData = periods.map(p => {
    const row = { label: p.label };
    (p.analysis.topCategories||[]).forEach(c => { row[c.name] = c.total; });
    row["total"] = p.analysis.totalExpenses || 0;
    return row;
  });
  const allCats = [...new Set(periods.flatMap(p => (p.analysis.topCategories||[]).map(c=>c.name)))];

  // ── Calendar month grouping — uses only periodoMes from AI (MM/YYYY) ────────
  const monthlyMap = {};
  periods.forEach(p => {
    const pm = normalizePM(p.analysis?.periodoMes);
    let monthKey, monthLabel;
    if (pm) {
      const [mm, yyyy] = pm.split("/");
      monthKey  = `${yyyy}-${mm}`;
      monthLabel = `${MONTHS_ES[parseInt(mm, 10) - 1]} ${yyyy}`;
    } else {
      monthKey  = "zzz-sin-periodo";
      monthLabel = "Sin período identificado";
    }
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { label: monthLabel, total: 0, transactions: 0, banks: new Set(), key: monthKey };
    }
    monthlyMap[monthKey].total        += p.analysis.totalExpenses    || 0;
    monthlyMap[monthKey].transactions += p.analysis.expenses?.length || 0;
    if (p.analysis?.banco) monthlyMap[monthKey].banks.add(p.analysis.banco);
  });
  const monthlyData = Object.values(monthlyMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(m => ({ ...m, banks: [...m.banks] }));
  const monthlyMax = Math.max(...monthlyData.map(m => m.total), 1);

  return (
    <div className="space-y-5">
      {/* Period list */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-200">Períodos cargados ({periods.length})</h2>
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
            <button onClick={()=>setView("combined")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view==="combined"?"bg-emerald-700 text-white":"text-slate-400 hover:text-slate-200"}`}>
              Acumulado
            </button>
            <button onClick={()=>setView("compare")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view==="compare"?"bg-emerald-700 text-white":"text-slate-400 hover:text-slate-200"}`}>
              Comparativa
            </button>
            <button onClick={()=>setView("ai")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${view==="ai"?"bg-emerald-700 text-white":"text-slate-400 hover:text-slate-200"}`}>
              🤖 IA
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {periods.map((p,i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: PALETTE[i%PALETTE.length]}}/>
                <div>
                  <p className="text-sm font-medium text-slate-200">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.analysis.expenses?.length||0} transacciones · {fmt(p.analysis.totalExpenses||0)}</p>
                </div>
              </div>
              <button onClick={()=>onRemove(i)}
                className="text-slate-600 hover:text-rose-400 transition-colors text-sm px-2">✕</button>
            </div>
          ))}
        </div>
      </Card>

      {/* AI ANALYSIS TRIGGER — always visible at top */}
      {view !== "ai" && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-0.5">🤖 Análisis IA Consolidado</h3>
              <p className="text-xs text-slate-500">Analiza todos los períodos juntos — alertas, recortes y recomendaciones personalizadas</p>
            </div>
            <button
              onClick={()=>handleAiAnalysis(salaries)}
              disabled={aiLoading}
              className="shrink-0 ml-4 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-2"
              style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",boxShadow:"0 0 15px rgba(124,58,237,0.4)",opacity:aiLoading?0.45:1,cursor:aiLoading?"not-allowed":"pointer"}}>
              {aiLoading ? <><span className="animate-spin inline-block">⟳</span> Analizando…</> : <>✦ Analizar todo</>}
            </button>
          </div>
          {aiError && <p className="mt-2 text-xs text-rose-400">{aiError}</p>}
        </Card>
      )}

      {/* COMBINED VIEW */}
      {view === "combined" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total acumulado"  value={fmt(combinedTotal)} accent="rose"/>
            <KpiCard label="Períodos"          value={periods.length}     accent="sky"/>
            <KpiCard label="Promedio mensual"  value={fmt(combinedAvg)}   accent="amber"/>
            <KpiCard label="Transacciones"     value={allExpenses.length} accent="violet"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Distribución acumulada</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={80} innerRadius={42} paddingAngle={1} minAngle={4}
                    label={({name,percent})=>percent>0.06?`${(percent*100).toFixed(0)}%`:""} labelLine={false}>
                    {pieData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}/>)}
                  </Pie>
                  <Tooltip content={<CustomTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {pieData.map((e,i)=>(
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}}/>
                    {e.name}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Top categorías acumuladas</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pieData.slice(0,6)} layout="vertical" margin={{left:10,right:10}}>
                  <XAxis type="number" tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={100} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="value" radius={4} maxBarSize={18}>
                    {pieData.slice(0,6).map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* All transactions */}
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Todas las transacciones ({allExpenses.length})
            </h3>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {allExpenses.slice().sort((a,b)=>b.amount-a.amount).map((e,i)=>(
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:CAT_COLORS[e.category]||"#94a3b8"}}/>
                    <span className="text-sm text-slate-300 truncate">{e.desc}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-500 hidden sm:inline">{e.category}</span>
                    <span className="text-sm font-mono text-slate-200">{fmt(e.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* COMPARE VIEW */}
      {view === "compare" && (
        <>
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Total por período</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={compareData} margin={{left:10,right:10}}>
                <XAxis dataKey="label" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>"$"+(v/1000000).toFixed(1)+"M"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
                <Tooltip content={<CustomTooltip/>}/>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <Bar dataKey="total" name="Total" radius={6} maxBarSize={40}>
                  {compareData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Comparativa por categoría</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, allCats.length * 45)}>
              <BarChart data={compareData} layout="vertical" margin={{left:10,right:10}}>
                <XAxis type="number" tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="label" width={80} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                {allCats.map((cat,i)=>(
                  <Bar key={cat} dataKey={cat} name={cat} stackId="a"
                    fill={CAT_COLORS[cat]||PALETTE[i%PALETTE.length]} radius={i===allCats.length-1?[0,4,4,0]:0} maxBarSize={22}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-3">
              {allCats.map((cat,i)=>(
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{background:CAT_COLORS[cat]||PALETTE[i%PALETTE.length]}}/>
                  {cat}
                </div>
              ))}
            </div>
          </Card>

          <ResumenComparativo periods={periods}/>

          {/* Calendar month totals */}
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Total por mes calendario
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs text-slate-500 pb-2 font-medium">Mes</th>
                    <th className="text-left text-xs text-slate-500 pb-2 font-medium">Banco(s)</th>
                    <th className="text-right text-xs text-slate-500 pb-2 font-medium">Total combinado</th>
                    <th className="text-right text-xs text-slate-500 pb-2 font-medium">Transac.</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m, i) => (
                    <tr key={i} className="border-b border-slate-800/40 last:border-0 group">
                      <td className="py-2.5 pr-3">
                        <span className="text-slate-200 font-medium">{m.label}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {m.banks.length > 0
                          ? <span className="text-slate-400 text-xs">{m.banks.join(", ")}</span>
                          : <span className="text-slate-600 text-xs">—</span>
                        }
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-emerald-400 font-semibold">{fmt(m.total)}</span>
                          <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500/60"
                              style={{ width: `${Math.round((m.total / monthlyMax) * 100)}%` }}/>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{m.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Month by month table */}
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Resumen por período</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs text-slate-500 pb-2 font-medium">Período</th>
                    <th className="text-right text-xs text-slate-500 pb-2 font-medium">Total</th>
                    <th className="text-right text-xs text-slate-500 pb-2 font-medium">Transac.</th>
                    <th className="text-right text-xs text-slate-500 pb-2 font-medium">Mayor gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p,i)=>{
                    const topCat = (p.analysis.topCategories||[])[0];
                    return (
                      <tr key={i} className="border-b border-slate-800/40 last:border-0">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{background:PALETTE[i%PALETTE.length]}}/>
                            <span className="text-slate-200">{p.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-400">{fmt(p.analysis.totalExpenses||0)}</td>
                        <td className="py-2.5 text-right text-slate-400">{p.analysis.expenses?.length||0}</td>
                        <td className="py-2.5 text-right text-slate-400 text-xs">{topCat ? `${topCat.name} (${fmt(topCat.total)})` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}


      {/* AI VIEW */}
      {view === "ai" && aiResult && (
        <div className="space-y-5">
          {/* Summary */}
          <Card glow>
            <div className="flex gap-3">
              <span className="text-2xl shrink-0">🤖</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-1">Análisis Consolidado — {periods.length} períodos</p>
                <p className="text-sm text-slate-300 leading-relaxed">{aiResult.overallSummary}</p>
              </div>
            </div>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total todos los períodos" value={fmt(aiResult.totalAllPeriods)} accent="rose"/>
            <KpiCard label="Promedio mensual"          value={fmt(aiResult.avgMonthly)}     accent="amber"/>
            <KpiCard label="Períodos analizados"       value={periods.length}                accent="sky"/>
            <KpiCard label="Tendencia"
              value={aiResult.trend === "increasing" ? "↑ Subiendo" : aiResult.trend === "decreasing" ? "↓ Bajando" : "→ Estable"}
              accent={aiResult.trend === "increasing" ? "rose" : aiResult.trend === "decreasing" ? "emerald" : "amber"}/>
          </div>

          {/* Alerts */}
          {aiResult.alerts?.length > 0 && (
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">⚠️ Alertas detectadas</h3>
              <div className="space-y-2">
                {aiResult.alerts.map((a,i) => {
                  const colors = { high: "bg-rose-950/40 border-rose-800/40 text-rose-400", medium: "bg-amber-950/40 border-amber-800/40 text-amber-400", low: "bg-slate-800/60 border-slate-700/40 text-slate-400" };
                  const icons  = { high: "🔴", medium: "🟡", low: "🔵" };
                  return (
                    <div key={i} className={`p-3 rounded-xl border ${colors[a.level]}`}>
                      <p className="text-sm font-semibold mb-0.5">{icons[a.level]} {a.title}</p>
                      <p className="text-xs opacity-80 leading-relaxed">{a.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Cuts */}
          {aiResult.cuts?.length > 0 && (
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">✂️ Recortes recomendados</h3>
              <div className="space-y-2">
                {aiResult.cuts.map((c,i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{c.desc}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">Esfuerzo: <span className={c.effort==="Fácil"?"text-emerald-400":c.effort==="Medio"?"text-amber-400":"text-rose-400"}>{c.effort}</span></span>
                        <span className="text-xs text-slate-500">Impacto: <span className={c.impact==="Alto"?"text-emerald-400":c.impact==="Medio"?"text-amber-400":"text-slate-400"}>{c.impact}</span></span>
                      </div>
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      <p className="text-sm font-mono text-emerald-400">−{fmt(c.saving)}</p>
                      <p className="text-xs text-slate-500">al mes</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                  <span className="text-slate-500">Ahorro potencial total</span>
                  <span className="font-mono text-emerald-400 font-bold">{fmt(aiResult.cuts.reduce((a,c)=>a+c.saving,0))}/mes</span>
                </div>
              </div>
            </Card>
          )}

          {/* Top recurring */}
          {aiResult.topRecurring?.length > 0 && (
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">🔄 Gastos más recurrentes</h3>
              <div className="space-y-2">
                {aiResult.topRecurring.map((t,i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">{t.desc}</p>
                      <p className="text-xs text-slate-500">{t.category} · <span className={t.verdict.includes("Eliminar")?"text-rose-400":t.verdict.includes("Reducir")?"text-amber-400":"text-emerald-400"}>{t.verdict}</span></p>
                    </div>
                    <span className="text-sm font-mono text-slate-300 shrink-0 ml-2">{fmt(t.avgAmount)}/mes</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">💡 Plan de acción</h3>
            <div className="space-y-2">
              {aiResult.recommendations.map((r,i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <span className="text-emerald-500 font-bold text-sm shrink-0 font-mono">{i+1}.</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </Card>

          <button onClick={()=>setView("combined")} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Volver a vista acumulada
          </button>
        </div>
      )}

    </div>
  );
}
