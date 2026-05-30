import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, KpiCard, CustomTooltip } from "../components/ui.jsx";
import { fmt } from "../utils.js";
import { CAT_COLORS, PALETTE } from "../constants.js";

/* ── ANALYSIS TAB ────────────────────────────────────────────────────── */
export default function AnalysisTab({ analysis, budget, setBudget }) {
  if (!analysis) {
    return (
      <Card className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-slate-500 text-sm">Sube un resumen bancario en <strong className="text-slate-300">Subir PDF</strong> para ver el análisis aquí</p>
      </Card>
    );
  }
  const { expenses=[], totalExpenses=0, summary="", topCategories=[], recommendations=[], salaryRatio } = analysis;
  const [showBudget, setShowBudget] = useState(false);
  const [editBudget, setEditBudget] = useState({});

  const catMap = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category]||0) + e.amount; });
  const pieData = Object.entries(catMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const saveBudget = () => {
    const parsed = {};
    Object.entries(editBudget).forEach(([k,v]) => {
      const n = parseFloat(String(v).replace(/\./g,"").replace(",","."));
      if(n>0) parsed[k] = n;
    });
    setBudget(parsed);
    setShowBudget(false);
  };

  return (
    <div className="space-y-5">
      <Card glow>
        <div className="flex gap-3">
          <span className="text-2xl shrink-0">🤖</span>
          <div>
            <p className="text-xs font-medium text-emerald-400 mb-1 uppercase tracking-widest">Análisis IA</p>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Gastos"   value={fmt(totalExpenses)} accent="rose" />
        <KpiCard label="Transacciones"  value={expenses.length}    accent="sky" />
        <KpiCard label="Gasto Promedio" value={fmt(avgExpense)}    accent="amber" />
        {salaryRatio && <KpiCard label="% del Sueldo" value={salaryRatio} accent="violet" />}
      </div>
      {/* BUDGET SEMAPHORE */}
      {Object.keys(budget||{}).length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">🚦 Presupuesto del mes</h3>
            <button onClick={()=>{setEditBudget({...budget});setShowBudget(true);}} className="text-xs text-slate-500 hover:text-slate-300">Editar</button>
          </div>
          <div className="space-y-2">
            {Object.entries(budget).map(([cat, limite]) => {
              const gastado = catMap[cat] || 0;
              const pct     = Math.min(100, Math.round((gastado/limite)*100));
              const color   = pct >= 90 ? "#f87171" : pct >= 70 ? "#fbbf24" : "#34d399";
              const icon    = pct >= 90 ? "🔴" : pct >= 70 ? "🟡" : "🟢";
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{icon} {cat}</span>
                    <span className="text-slate-400 font-mono">{fmt(gastado)} / {fmt(limite)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: color}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* BUDGET EDITOR */}
      {showBudget && (
        <Card>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Definir presupuesto por categoría</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {pieData.map(({name}) => (
              <div key={name}>
                <label className="text-xs text-slate-500 mb-0.5 block">{name}</label>
                <input
                  value={editBudget[name]||""}
                  onChange={e=>setEditBudget(prev=>({...prev,[name]:e.target.value}))}
                  placeholder="Sin límite"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveBudget} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white">Guardar presupuesto</button>
            <button onClick={()=>setShowBudget(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs text-slate-300">Cancelar</button>
          </div>
        </Card>
      )}

      {!showBudget && Object.keys(budget||{}).length === 0 && (
        <button onClick={()=>{setEditBudget({});setShowBudget(true);}}
          className="w-full py-2.5 border border-dashed border-slate-700 hover:border-emerald-600/50 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-all">
          🚦 Definir presupuesto mensual por categoría
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Distribución por Categoría</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={2}
              label={({name,percent})=>percent>0.06?`${(percent*100).toFixed(0)}%`:""} labelLine={false}>
              {pieData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}/>)}
            </Pie>
            <Tooltip content={<CustomTooltip/>}/>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 mt-2">
          {pieData.map((e,i)=>(
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}}/>
              {e.name}
            </div>
          ))}
        </div>
      </Card>
      {topCategories.length > 0 && (
        <Card>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Top Categorías</h3>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={topCategories} layout="vertical" margin={{left:10,right:10}}>
              <XAxis type="number" tickFormatter={(v)=>"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" width={95} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="total" radius={5} maxBarSize={18}>
                {topCategories.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
      </div>
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">💡 Recomendaciones</h3>
        <div className="space-y-2">
          {recommendations.map((rec,i)=>(
            <div key={i} className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
              <span className="text-emerald-500 font-bold text-sm shrink-0 font-mono">{i+1}.</span>
              <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Detalle ({expenses.length})</h3>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {expenses.slice().sort((a,b)=>b.amount-a.amount).map((e,i)=>(
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
    </div>
  );
}
