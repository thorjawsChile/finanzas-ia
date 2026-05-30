import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { projectHouseAI } from "../ai/projectHouse.js";
import { Card, KpiCard, CustomTooltip } from "../components/ui.jsx";
import { fmt } from "../utils.js";
import { CAT_COLORS, PALETTE } from "../constants.js";

/* ── PROJECTION TAB ──────────────────────────────────────────────────── */
export default function ProjectionTab({ salaries, analysis, periods, creditos, ahorros }) {
  const [houseMonthly, setHouseMonthly] = useState("");
  const [currentRent,  setCurrentRent]  = useState("");
  const [extraIncome,  setExtraIncome]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [result,   setResult]   = useState(null);

  const periodsWithData    = (periods  || []).filter(p => p.analysis?.totalExpenses > 0);
  const creditosActivos    = (creditos || []).filter(c => c.cuota > 0 && (c.mesesTotal - c.mesesPagados) > 0);
  const ahorrosActivos     = (ahorros  || []).filter(a => a.aporte > 0 && a.actual < a.objetivo);
  const creditosProximos   = creditosActivos.filter(c => (c.mesesTotal - c.mesesPagados) <= 6);
  const monthlyCreditos    = creditosActivos.reduce((s, c) => s + c.cuota, 0);
  const monthlyAhorros     = ahorrosActivos.reduce((s, a) => s + a.aporte, 0);

  const hasExpenses = periodsWithData.length > 0 || analysis?.totalExpenses > 0;
  const hasData     = salaries.length > 0 || hasExpenses;

  const avgMonthlyExpenses = periodsWithData.length > 0
    ? Math.round(periodsWithData.reduce((s, p) => s + p.analysis.totalExpenses, 0) / periodsWithData.length)
    : (analysis?.totalExpenses || 0);

  const latestSalary = (() => {
    const map = {};
    salaries.forEach(s => {
      const k = `${s.year}-${String(s.month).padStart(2,"0")}`;
      if (!map[k]) map[k] = 0;
      map[k] += s.amount;
    });
    const vals = Object.entries(map).sort(([a],[b])=>a.localeCompare(b));
    return vals.length > 0 ? vals[vals.length-1][1] : 0;
  })();

  const handleProject = async () => {
    const monthly = parseFloat(String(houseMonthly).replace(/\./g,"").replace(",","."));
    if (!monthly || monthly <= 0) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await projectHouseAI({
        salaries, analysis, periods, creditos, ahorros,
        houseMonthly: monthly,
        currentRent:  parseFloat(String(currentRent).replace(/\./g,"").replace(",",".")) || 0,
        extraIncome:  parseFloat(String(extraIncome).replace(/\./g,"").replace(",",".")) || 0,
      });
      setResult(r);
    } catch(e) { setError("Error al proyectar: " + e.message); }
    finally { setLoading(false); }
  };

  const statusConfig = {
    green:  { bg:"bg-cyan-950/60", border:"border-cyan-700/50", text:"text-cyan-400", icon:"✅", label:"Viable — Situación cómoda" },
    yellow: { bg:"bg-amber-950/60",   border:"border-amber-700/50",   text:"text-amber-400",   icon:"⚠️", label:"Ajustado — Requiere recortes" },
    red:    { bg:"bg-rose-950/60",    border:"border-rose-700/50",    text:"text-rose-400",    icon:"❌", label:"Inviable — Presupuesto insuficiente" },
  };

  return (
    <div className="space-y-5">
      {/* ── Datos detectados ──────────────────────────────────────────── */}
      {hasData ? (
        <div className="grid grid-cols-2 gap-2">
          {latestSalary > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.25)"}}>
              <span className="text-base shrink-0">💰</span>
              <div>
                <p className="text-xs text-violet-400 font-medium">Sueldo detectado</p>
                <p className="text-xs text-slate-300 font-mono">{fmt(latestSalary)}</p>
              </div>
            </div>
          )}
          {avgMonthlyExpenses > 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)"}}>
              <span className="text-base shrink-0">📊</span>
              <div>
                <p className="text-xs text-cyan-400 font-medium">Gastos bancarios{periodsWithData.length > 1 ? ` (${periodsWithData.length} meses)` : ""}</p>
                <p className="text-xs text-slate-300 font-mono">{fmt(avgMonthlyExpenses)}/mes</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border border-amber-800/40 rounded-xl">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="text-xs text-amber-400 font-medium">Sin gastos cargados</p>
                <p className="text-xs text-slate-500">Sube un estado de cuenta</p>
              </div>
            </div>
          )}
          {monthlyCreditos > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-950/40 border border-rose-800/40 rounded-xl">
              <span className="text-base shrink-0">💳</span>
              <div>
                <p className="text-xs text-rose-400 font-medium">Cuotas créditos ({creditosActivos.length})</p>
                <p className="text-xs text-slate-300 font-mono">{fmt(monthlyCreditos)}/mes</p>
              </div>
            </div>
          )}
          {monthlyAhorros > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-950/40 border border-violet-800/40 rounded-xl">
              <span className="text-base shrink-0">🎯</span>
              <div>
                <p className="text-xs text-violet-400 font-medium">Aportes ahorro ({ahorrosActivos.length})</p>
                <p className="text-xs text-slate-300 font-mono">{fmt(monthlyAhorros)}/mes</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3 p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-xs text-amber-300 leading-relaxed">
            Para una proyección precisa, carga tu <strong>estado de cuenta</strong> (tab Gastos) y registra tu <strong>sueldo</strong> (tab Sueldos) primero.
          </p>
        </div>
      )}

      {/* ── Créditos próximos a liberarse ─────────────────────────────── */}
      {creditosProximos.length > 0 && (
        <Card>
          <p className="text-xs font-medium text-amber-400 uppercase tracking-widest mb-2">🔔 Créditos por terminar pronto</p>
          <div className="space-y-2">
            {creditosProximos.map(c => {
              const restantes = c.mesesTotal - c.mesesPagados;
              return (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-amber-950/30 border border-amber-800/30 rounded-xl">
                  <div>
                    <p className="text-xs font-medium text-slate-200">{c.nombre}</p>
                    <p className="text-xs text-slate-500">Se termina en <span className="text-amber-400 font-medium">{restantes} mes{restantes !== 1 ? "es" : ""}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Libera</p>
                    <p className="text-sm font-mono font-bold text-cyan-400">+{fmt(c.cuota)}/mes</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-600 pt-1">
              Total a liberar: <span className="text-cyan-400 font-medium">{fmt(creditosProximos.reduce((s,c)=>s+c.cuota,0))}/mes</span> en los próximos 6 meses
            </p>
          </div>
        </Card>
      )}

      {/* Input form */}
      <Card>
        <h2 className="text-base font-semibold text-slate-200 mb-1">🏠 Proyección Casa</h2>
        <p className="text-xs text-slate-500 mb-4">Ingresa los datos de la casa para ver si tu presupuesto lo permite</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">
              Costo mensual de la casa <span className="text-rose-400">*</span>
              <span className="text-slate-600 font-normal ml-1">(dividendo o arriendo)</span>
            </label>
            <input type="text" value={houseMonthly} onChange={e=>setHouseMonthly(e.target.value)}
              placeholder="Ej: 650.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">
              Arriendo actual que dejarías de pagar
              <span className="text-slate-600 font-normal ml-1">(si aplica)</span>
            </label>
            <input type="text" value={currentRent} onChange={e=>setCurrentRent(e.target.value)}
              placeholder="Ej: 400.000  (dejar vacío si no arriendas)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">
              Ingresos extra mensuales
              <span className="text-slate-600 font-normal ml-1">(freelance, arriendo, etc.)</span>
            </label>
            <input type="text" value={extraIncome} onChange={e=>setExtraIncome(e.target.value)}
              placeholder="Ej: 200.000  (dejar vacío si no tienes)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
        </div>

        <button onClick={handleProject} disabled={!houseMonthly || loading}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
          style={{
            background:"linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow:"0 0 15px rgba(124,58,237,0.4)",
            opacity: (!houseMonthly || loading) ? 0.45 : 1,
            cursor: (!houseMonthly || loading) ? "not-allowed" : "pointer",
          }}>
          {loading ? <><span className="animate-spin inline-block">⟳</span> Analizando con IA…</> : <>🔮 Proyectar viabilidad</>}
        </button>
        {error && <p className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg px-4 py-2">{error}</p>}
      </Card>

      {/* RESULT */}
      {result && (() => {
        const st = statusConfig[result.viabilityStatus] || statusConfig.yellow;
        const budgetTotal = (result.budget||[]).reduce((a,b)=>a+b.amount,0);
        const cuts    = (result.transactions||[]).filter(t=>t.action==="cut");
        const reduces = (result.transactions||[]).filter(t=>t.action==="reduce");
        const keeps   = (result.transactions||[]).filter(t=>t.action==="keep");
        const totalCutSaving    = cuts.reduce((a,t)=>a+t.savedAmount,0);
        const totalReduceSaving = reduces.reduce((a,t)=>a+t.savedAmount,0);
        return (
          <div className="space-y-4">
            {/* Viability badge */}
            <div className={`flex items-start gap-3 p-4 rounded-2xl border ${st.bg} ${st.border}`}>
              <span className="text-2xl shrink-0">{st.icon}</span>
              <div>
                <p className={`text-sm font-bold ${st.text} mb-1`}>{st.label}</p>
                <p className="text-xs text-slate-300 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Key numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Ingreso total"     value={fmt(result.totalIncome)}        accent="emerald"/>
              <KpiCard label="Costo casa/mes"    value={fmt(parseFloat(String(houseMonthly).replace(/\./g,"").replace(",",".")))} accent="rose"/>
              <KpiCard label="Disponible c/casa" value={fmt(result.disponibleConCasa)}  accent={result.disponibleConCasa>0?(result.disponibleConCasa>result.totalIncome*0.15?"emerald":"amber"):"rose"}/>
              <KpiCard label="Ahorro potencial"  value={fmt(result.totalPotentialSaving||totalCutSaving+totalReduceSaving)} accent="violet"/>
            </div>

            {/* Deficit alert */}
            {result.extraNeeded > 0 && (
              <div className="flex gap-3 p-4 bg-rose-950/40 border border-rose-800/40 rounded-2xl">
                <span className="text-xl shrink-0">🚨</span>
                <div>
                  <p className="text-sm font-bold text-rose-400 mb-1">Déficit de {fmt(result.extraNeeded)}/mes</p>
                  <p className="text-xs text-slate-400">Si eliminas los gastos innecesarios detectados abajo ({fmt(totalCutSaving+totalReduceSaving)} potenciales), {totalCutSaving+totalReduceSaving >= result.extraNeeded ? "cubrirías el déficit." : "aún faltarían " + fmt(result.extraNeeded - totalCutSaving - totalReduceSaving) + "."}</p>
                </div>
              </div>
            )}

            {/* TRANSACTION CLASSIFICATION — main feature */}
            {result.transactions?.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">Veredicto por gasto</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-rose-900/40 text-rose-400 rounded-full border border-rose-800/40">✂️ {cuts.length} cortar</span>
                    <span className="px-2 py-0.5 bg-amber-900/40 text-amber-400 rounded-full border border-amber-800/40">↓ {reduces.length} reducir</span>
                    <span className="px-2 py-0.5 bg-cyan-900/40 text-cyan-400 rounded-full border border-cyan-800/40">✓ {keeps.length} ok</span>
                  </div>
                </div>

                {/* CUT — eliminate */}
                {cuts.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-rose-900/40"/>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">✂️ Eliminar — ahorro {fmt(totalCutSaving)}</span>
                      <div className="h-px flex-1 bg-rose-900/40"/>
                    </div>
                    <div className="space-y-2">
                      {cuts.map((t,i)=>(
                        <div key={i} className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl">
                          <span className="text-rose-500 text-sm shrink-0 mt-0.5">✕</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-200 truncate">{t.desc}</span>
                              <span className="text-sm font-mono text-rose-400 shrink-0">{fmt(t.amount)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* REDUCE */}
                {reduces.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-amber-900/40"/>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">↓ Reducir — ahorro {fmt(totalReduceSaving)}</span>
                      <div className="h-px flex-1 bg-amber-900/40"/>
                    </div>
                    <div className="space-y-2">
                      {reduces.map((t,i)=>(
                        <div key={i} className="flex items-start gap-3 p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                          <span className="text-amber-500 text-sm shrink-0 mt-0.5">↓</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-200 truncate">{t.desc}</span>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono text-slate-400 line-through block">{fmt(t.amount)}</span>
                                <span className="text-xs font-mono text-amber-400">−{fmt(t.savedAmount)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KEEP */}
                {keeps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-slate-800"/>
                      <span className="text-xs font-medium text-slate-600 uppercase tracking-widest">✓ Mantener — esenciales</span>
                      <div className="h-px flex-1 bg-slate-800"/>
                    </div>
                    <div className="space-y-1">
                      {keeps.map((t,i)=>(
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-cyan-600 text-xs shrink-0">✓</span>
                            <span className="text-sm text-slate-500 truncate">{t.desc}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-600 shrink-0 ml-2">{fmt(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Budget + transaction list side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Budget bar chart */}
            {result.budget?.length > 0 && (
              <Card>
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Presupuesto ajustado con la casa</h3>
                <ResponsiveContainer width="100%" height={Math.max(160, result.budget.length * 32)}>
                  <BarChart data={result.budget} layout="vertical" margin={{left:10,right:50}}>
                    <XAxis type="number" tickFormatter={v=>"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="category" width={105} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="amount" radius={4} maxBarSize={16}>
                      {result.budget.map((b,i)=>(
                        <Cell key={i} fill={
                          b.category.toLowerCase().includes("casa")||b.category.toLowerCase().includes("dividendo")
                            ? "#f87171" : CAT_COLORS[b.category]||PALETTE[i%PALETTE.length]
                        }/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex justify-between text-xs border-t border-slate-800 pt-3">
                  <span className="text-slate-500">Total estimado</span>
                  <span className="font-mono text-slate-300">{fmt(budgetTotal)}</span>
                </div>
              </Card>
            )}

            </div>
            {/* Recommendations */}
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">🗺️ Plan de acción</h3>
              <div className="space-y-2">
                {result.recommendations.map((rec,i)=>(
                  <div key={i} className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                    <span className="text-violet-400 font-bold text-sm shrink-0 font-mono">{i+1}.</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
