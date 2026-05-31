import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, KpiCard, CustomTooltip } from "../components/ui.jsx";
import { fmt } from "../utils.js";
import { CAT_COLORS, PALETTE } from "../constants.js";
import { useApp } from "../AppContext.jsx";

/* ── ANALYSIS TAB ────────────────────────────────────────────────────── */
export default function AnalysisTab() {
  const { analysis, setAnalysis, budget, setBudget, gastosManuales, setGastosManuales, periods, setPeriods } = useApp();

  const [showBudget,       setShowBudget]       = useState(false);
  const [editBudget,       setEditBudget]       = useState({});
  const [filtroCategoria,  setFiltroCategoria]  = useState("Todas");
  const [busqueda,         setBusqueda]         = useState("");
  const [catOverrides,     setCatOverrides]     = useState({});
  const [showGastoForm,    setShowGastoForm]    = useState(false);
  const [gDesc,            setGDesc]            = useState("");
  const [gAmount,          setGAmount]          = useState("");
  const [gCat,             setGCat]             = useState("Hipotecario/Arriendo");
  const ALL_CATS = ["Alimentación","Transporte","Entretenimiento","Salud","Ropa/Calzado","Hogar","Tecnología","Viajes","Servicios","Educación","Hipotecario/Arriendo","Efectivo","Otros"];

  const handleAddGasto = () => {
    const amount = parseFloat(String(gAmount).replace(/\./g,"").replace(",","."));
    if (!gDesc.trim() || !amount || amount <= 0) return;
    const newGasto = { id: Date.now(), desc: gDesc.trim(), amount, category: gCat, manual: true };
    // 1. Lista de gastos manuales (para persistencia separada)
    setGastosManuales(prev => [...prev, newGasto]);
    // 2. Inyectar en analysis actual (lo que ve AnalysisTab)
    setAnalysis(prev => prev ? ({
      ...prev,
      expenses: [...(prev.expenses||[]), newGasto],
      totalExpenses: (prev.totalExpenses||0) + amount,
    }) : prev);
    // 3. Inyectar en el último período guardado (lo que ve Períodos)
    setPeriods(prev => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1] };
      last.analysis = {
        ...last.analysis,
        expenses: [...(last.analysis?.expenses||[]), newGasto],
        totalExpenses: (last.analysis?.totalExpenses||0) + amount,
      };
      return [...prev.slice(0, -1), last];
    });
    setGDesc(""); setGAmount(""); setGCat("Hipotecario/Arriendo"); setShowGastoForm(false);
  };

  if (!analysis) {
    return (
      <Card className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-slate-500 text-sm">Sube un resumen bancario en <strong className="text-slate-300">Subir PDF</strong> para ver el análisis aquí</p>
      </Card>
    );
  }
  const { expenses=[], totalExpenses=0, summary="", topCategories=[], recommendations=[], salaryRatio } = analysis;

  const catMap = {};
  expenses.forEach((e) => { catMap[e.category] = (catMap[e.category]||0) + e.amount; });
  const pieData = Object.entries(catMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const categorias = ["Todas", ...Array.from(new Set(expenses.map(e => e.category))).sort()];
  const expensesFiltradas = expenses
    .filter(e => filtroCategoria === "Todas" || e.category === filtroCategoria)
    .filter(e => e.desc.toLowerCase().includes(busqueda.toLowerCase()));

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
            <p className="text-xs font-medium text-violet-400 mb-1 uppercase tracking-widest">Análisis IA</p>
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-600"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveBudget} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white" style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",boxShadow:"0 0 15px rgba(124,58,237,0.4)"}}>Guardar presupuesto</button>
            <button onClick={()=>setShowBudget(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs text-slate-300">Cancelar</button>
          </div>
        </Card>
      )}

      {!showBudget && Object.keys(budget||{}).length === 0 && (
        <button onClick={()=>{setEditBudget({});setShowBudget(true);}}
          className="w-full py-2.5 border border-dashed border-slate-700/60 hover:border-violet-600/50 rounded-xl text-xs text-slate-500 hover:text-slate-300 transition-all">
          🚦 Definir presupuesto mensual por categoría
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card>
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Distribución por Categoría</h3>
        <div style={{width:"100%",height:220}}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart width={220} height={220} margin={{top:0,right:0,bottom:0,left:0}}>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={44}
                paddingAngle={0} startAngle={90} endAngle={-270}
                isAnimationActive={false} activeIndex={-1}
                label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                  if (percent <= 0.06) return null;
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 18;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12}>
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
                labelLine={false}
                strokeWidth={0}>
                {pieData.map((e,i)=><Cell key={i} fill={CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}/>)}
              </Pie>
              <Tooltip content={<CustomTooltip/>} isAnimationActive={false}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {pieData.map((e,i)=>(
            <div key={i} className="flex items-center gap-1.5 text-xs font-medium" style={{color: CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:CAT_COLORS[e.name]||PALETTE[i%PALETTE.length], boxShadow:`0 0 6px ${CAT_COLORS[e.name]||PALETTE[i%PALETTE.length]}80`}}/>
              <span className="text-slate-400">{e.name}</span>
            </div>
          ))}
        </div>
      </Card>
      {topCategories.length > 0 && (
        <Card>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Top Categorías</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, topCategories.length * 38)}>
            <BarChart data={topCategories} layout="vertical" margin={{left:10,right:16}}>
              <defs>
                <linearGradient id="barGradVC" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
              <XAxis type="number" tickFormatter={(v)=>"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" width={100} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>} cursor={{fill:"rgba(124,58,237,0.07)"}}/>
              <Bar dataKey="total" radius={6} maxBarSize={26} fill="url(#barGradVC)"/>
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
              <span className="text-violet-400 font-bold text-sm shrink-0 font-mono">{i+1}.</span>
              <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-slate-300 text-sm font-semibold uppercase tracking-wide">
            Detalle ({expensesFiltradas.length})
            {gastosManuales.length > 0 && <span className="ml-2 text-xs font-normal text-violet-400">+{gastosManuales.length} manual{gastosManuales.length>1?"es":""}</span>}
          </h3>
          <div className="flex gap-2 flex-wrap">
            <input type="text" placeholder="Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}
              className="bg-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-500 w-36"/>
            <select value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)}
              className="bg-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-purple-500">
              {categorias.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>setShowGastoForm(v=>!v)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.35)",color:"#c4b5fd"}}>
              {showGastoForm ? "✕ Cancelar" : "＋ Agregar gasto"}
            </button>
          </div>
        </div>

        {showGastoForm && (
          <div className="mb-3 p-3 rounded-xl space-y-2" style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.25)"}}>
            <p className="text-xs text-violet-400 font-medium uppercase tracking-widest">Nuevo gasto manual</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={gDesc} onChange={e=>setGDesc(e.target.value)} placeholder="Descripción (ej: Arriendo)"
                className="col-span-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-600"/>
              <input value={gAmount} onChange={e=>setGAmount(e.target.value)} placeholder="Monto ($)"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
              <select value={gCat} onChange={e=>setGCat(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-600">
                {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleAddGasto} disabled={!gDesc.trim()||!gAmount}
              className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",opacity:(!gDesc.trim()||!gAmount)?0.45:1}}>
              Agregar gasto
            </button>
          </div>
        )}

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {expensesFiltradas.slice().sort((a,b)=>b.amount-a.amount).map((e,i)=>{
            const cat = catOverrides[i] || e.category;
            return (
            <div key={e.id||i} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{background:CAT_COLORS[cat]||"#94a3b8"}}/>
                <span className="text-sm text-slate-300 truncate">{e.desc}</span>
                {e.manual && <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{background:"rgba(124,58,237,0.2)",color:"#c4b5fd"}}>manual</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {!e.manual && (
                  <select value={cat} onChange={ev=>setCatOverrides(prev=>({...prev,[i]:ev.target.value}))}
                    className="hidden sm:block text-xs bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-violet-600 cursor-pointer"
                    style={{color:CAT_COLORS[cat]||"#94a3b8"}}>
                    {ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <span className="text-sm font-mono text-slate-200">{fmt(e.amount)}</span>
                {e.manual && (
                  <button onClick={()=>{
                    if(!window.confirm(`¿Eliminar "${e.desc}"?`)) return;
                    setGastosManuales(prev=>prev.filter(g=>g.id!==e.id));
                    setAnalysis(prev=>prev?({...prev,expenses:(prev.expenses||[]).filter(g=>g.id!==e.id),totalExpenses:(prev.totalExpenses||0)-e.amount}):prev);
                    setPeriods(prev=>{
                      if(prev.length===0) return prev;
                      const last={...prev[prev.length-1]};
                      last.analysis={...last.analysis,expenses:(last.analysis?.expenses||[]).filter(g=>g.id!==e.id),totalExpenses:(last.analysis?.totalExpenses||0)-e.amount};
                      return [...prev.slice(0,-1),last];
                    });
                  }} className="text-slate-600 hover:text-rose-400 transition-colors text-xs">✕</button>
                )}
              </div>
            </div>
            );
          })}
          {expensesFiltradas.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">Sin resultados</p>
          )}
        </div>
      </Card>
    </div>
  );
}
