import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { sanitizeInput, validateFile } from "../security.js";
import { extractPdfText } from "../utils.js";
import { parsePayslipAI } from "../ai/parsePayslip.js";
import { Card, KpiCard, CustomTooltip, DropZone } from "../components/ui.jsx";
import { fmt } from "../utils.js";
import { MONTHS_ES } from "../constants.js";

/* ── SALARY TAB ──────────────────────────────────────────────────────── */
export default function SalaryTab({ salaries, setSalaries }) {
  const now = new Date();
  const [mode,     setMode]     = useState("manual"); // "manual" | "pdf"
  const [month,    setMonth]    = useState(now.getMonth()+1);
  const [year,     setYear]     = useState(now.getFullYear());
  const [amount,   setAmount]   = useState("");
  const [note,     setNote]     = useState("");
  // PDF payslip state
  const [pdfFile,    setPdfFile]    = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress,setPdfProgress]= useState("");
  const [pdfError,   setPdfError]   = useState("");
  const [payslip,    setPayslip]    = useState(null); // parsed payslip data

  const handleAdd = () => {
    const val = parseFloat(String(amount).replace(/\./g,"").replace(",","."));
    if (!val || val <= 0) return;
    setSalaries((prev) =>
      [...prev, {month, year, amount: val, note}].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month)
    );
    setAmount(""); setNote("");
  };

  const handlePdfFile = async (file) => {
    setPdfError(""); setPayslip(null);
    try { validateFile(file); } catch(e) { setPdfError(e.message); return; }
    setPdfFile(file);
    setPdfLoading(true); setPdfProgress("Extrayendo texto del PDF…");
    try {
      const raw  = await extractPdfText(file);
      const text = sanitizeInput(raw);
      setPdfProgress("Analizando liquidación con IA…");
      const result = await parsePayslipAI(text);
      setPayslip(result);
    } catch(e) { setPdfError("Error al procesar: " + e.message); }
    finally { setPdfLoading(false); setPdfProgress(""); }
  };

  const handleAddFromPayslip = () => {
    if (!payslip) return;
    setSalaries((prev) =>
      [...prev, {
        month: payslip.month,
        year: payslip.year,
        amount: payslip.liquidoPagar,
        note: `Liquidación ${payslip.companyName||""}`.trim(),
        payslip: payslip,
      }].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month)
    );
    setPayslip(null); setPdfFile(null);
  };

  // Combine entries with same month/year for KPIs, chart and combined-totals display
  const monthTotalsMap = {};
  salaries.forEach(s => {
    const key = `${s.year}-${String(s.month).padStart(2,"0")}`;
    if (!monthTotalsMap[key]) monthTotalsMap[key] = { month: s.month, year: s.year, total: 0, count: 0, key };
    monthTotalsMap[key].total += s.amount;
    monthTotalsMap[key].count++;
  });
  const monthTotals   = Object.values(monthTotalsMap).sort((a,b)=>a.key.localeCompare(b.key));
  const combinedMonths = monthTotals.filter(m => m.count > 1);

  const chartData    = monthTotals.map(m => ({ label:`${MONTHS_ES[m.month-1].slice(0,3)} ${m.year}`, sueldo: m.total }));
  const avgSalary    = monthTotals.length > 0 ? monthTotals.reduce((a,m)=>a+m.total,0)/monthTotals.length : 0;
  const latestSalary = monthTotals.length > 0 ? monthTotals[monthTotals.length-1].total : 0;

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="flex gap-1 rounded-2xl p-1" style={{background:"#1a1a2e",border:"1px solid rgba(124,58,237,0.18)"}}>
        <button onClick={()=>setMode("manual")}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==="manual"?"text-white":"text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
          style={mode==="manual"?{background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)",boxShadow:"0 2px 10px rgba(124,58,237,0.35)"}:{}}>
          ✍️ Ingresar manualmente
        </button>
        <button onClick={()=>setMode("pdf")}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==="pdf"?"text-white":"text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
          style={mode==="pdf"?{background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)",boxShadow:"0 2px 10px rgba(124,58,237,0.35)"}:{}}>
          📄 Subir liquidación PDF
        </button>
      </div>

      {/* MANUAL MODE */}
      {mode === "manual" && (
        <Card>
          <h2 className="text-base font-semibold text-slate-200 mb-4">Registrar Sueldo</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Mes</label>
              <select value={month} onChange={(e)=>setMonth(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600">
                {MONTHS_ES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Año</label>
              <input type="number" value={year} onChange={(e)=>setYear(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">Monto líquido ($)</label>
            <input type="text" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ej: 1.500.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 mb-1 block">Nota (opcional)</label>
            <input type="text" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Ej: Incluye bono"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
          <button onClick={handleAdd} disabled={!amount}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",boxShadow:"0 0 15px rgba(124,58,237,0.4)",opacity:!amount?0.45:1,cursor:!amount?"not-allowed":"pointer"}}>
            + Agregar Sueldo
          </button>
        </Card>
      )}

      {/* PDF PAYSLIP MODE */}
      {mode === "pdf" && (
        <Card>
          <h2 className="text-base font-semibold text-slate-200 mb-1">Subir Liquidación de Sueldo</h2>
          <p className="text-xs text-slate-500 mb-4">La IA extrae automáticamente todos los datos de tu liquidación</p>
          <DropZone onFile={handlePdfFile} accept=".pdf" fileName={pdfFile?.name||""}
            loading={pdfLoading} progress={pdfProgress}
            label="Arrastra tu liquidación PDF aquí o" sublabel="Solo PDF" />
          {pdfLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-cyan-400">
              <span className="animate-spin inline-block">⟳</span> {pdfProgress}
            </div>
          )}
          {pdfError && <p className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg px-4 py-2">{pdfError}</p>}
        </Card>
      )}

      {/* PAYSLIP RESULT */}
      {payslip && (
        <div className="space-y-4">
          {/* Header info */}
          <Card glow>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🧾</span>
              <div>
                <p className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-0.5">Liquidación Detectada</p>
                {payslip.workerName && <p className="text-base font-semibold text-slate-200">{payslip.workerName}</p>}
                {payslip.companyName && <p className="text-sm text-slate-400">{payslip.companyName}</p>}
                <p className="text-sm text-slate-400">{MONTHS_ES[(payslip.month||1)-1]} {payslip.year}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Sueldo Base</p>
                <p className="text-lg font-mono font-bold text-slate-200">{fmt(payslip.sueldoBase)}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Total Haberes</p>
                <p className="text-lg font-mono font-bold text-sky-400">{fmt(payslip.totalHaberes)}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">Total Descuentos</p>
                <p className="text-lg font-mono font-bold text-rose-400">{fmt(payslip.totalDescuentos)}</p>
              </div>
              <div className="rounded-xl p-3" style={{background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)"}}>
                <p className="text-xs text-violet-400 mb-0.5">Líquido a Pagar</p>
                <p className="text-lg font-mono font-bold text-violet-300">{fmt(payslip.liquidoPagar)}</p>
              </div>
            </div>

            {/* AFP / Salud */}
            {(payslip.afp || payslip.salud) && (
              <div className="flex gap-2 mb-4">
                {payslip.afp && (
                  <div className="flex-1 bg-slate-800/40 rounded-xl px-3 py-2">
                    <p className="text-xs text-slate-500">AFP</p>
                    <p className="text-sm text-slate-300 font-medium">{payslip.afp}</p>
                  </div>
                )}
                {payslip.salud && (
                  <div className="flex-1 bg-slate-800/40 rounded-xl px-3 py-2">
                    <p className="text-xs text-slate-500">Salud</p>
                    <p className="text-sm text-slate-300 font-medium">{payslip.salud}</p>
                  </div>
                )}
              </div>
            )}

            {/* Haberes & Descuentos detail */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {payslip.haberes?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Haberes</p>
                  <div className="space-y-1">
                    {payslip.haberes.map((h,i)=>(
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-400 truncate mr-2">{h.name}</span>
                        <span className="text-sky-400 font-mono shrink-0">{fmt(h.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {payslip.descuentos?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Descuentos</p>
                  <div className="space-y-1">
                    {payslip.descuentos.map((d,i)=>(
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-400 truncate mr-2">{d.name}</span>
                        <span className="text-rose-400 font-mono shrink-0">{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visual bar */}
            {payslip.totalHaberes > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Haberes</span><span>Descuentos</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-violet-500 transition-all" style={{width:`${Math.round((payslip.liquidoPagar/payslip.totalHaberes)*100)}%`}}/>
                  <div className="h-full bg-rose-500 flex-1"/>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-violet-400">{payslip.totalHaberes > 0 ? Math.round((payslip.liquidoPagar/payslip.totalHaberes)*100) : 0}% líquido</span>
                  <span className="text-rose-400">{payslip.totalHaberes > 0 ? Math.round((payslip.totalDescuentos/payslip.totalHaberes)*100) : 0}% descuentos</span>
                </div>
              </div>
            )}

            <button onClick={handleAddFromPayslip}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",boxShadow:"0 0 15px rgba(124,58,237,0.4)"}}>
              ✓ Agregar {fmt(payslip.liquidoPagar)} al historial
            </button>
          </Card>
        </div>
      )}

      {/* KPIs + history */}
      {salaries.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Último Sueldo"   value={fmt(latestSalary)} accent="emerald"/>
            <KpiCard label="Sueldo Promedio" value={fmt(avgSalary)}    accent="amber"/>
          </div>
          {chartData.length <= 1 && salaries.length > 0 && (
            <p className="text-slate-500 text-sm text-center py-4">
              Agrega un sueldo más para ver la evolución en el tiempo.
            </p>
          )}
          {chartData.length > 1 && (
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Evolución de Sueldos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{left:0,right:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>v>=1000000?"$"+(v/1000000).toFixed(1)+"M":"$"+(v/1000).toFixed(0)+"k"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="sueldo" name="Sueldo" stroke="#7c3aed" strokeWidth={2} dot={{fill:"#7c3aed",r:4}} activeDot={{r:6,fill:"#06b6d4"}}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
          {combinedMonths.length > 0 && (
            <Card glow>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                Total combinado por mes
              </h3>
              <div className="space-y-2">
                {combinedMonths.map(m => (
                  <div key={m.key} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl">
                    <div>
                      <span className="text-sm text-slate-200 font-medium">
                        Total {MONTHS_ES[m.month-1]} {m.year}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">{m.count} sueldos</span>
                    </div>
                    <span className="text-base font-mono font-bold text-cyan-400">{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Historial</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {salaries.map((s, origIdx) => ({ s, origIdx })).reverse().map(({ s, origIdx }) => (
                <div key={origIdx} className="py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-sm text-slate-200">{MONTHS_ES[s.month-1]} {s.year}</span>
                      {s.note && <span className="ml-2 text-xs text-slate-500">· {s.note}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-cyan-400">{fmt(s.amount)}</span>
                      <button onClick={()=>{ if(window.confirm("¿Eliminar este sueldo?")) setSalaries(prev => prev.filter((_,i) => i !== origIdx)); }}
                        className="text-slate-700 hover:text-rose-400 transition-colors text-xs">✕</button>
                    </div>
                  </div>
                  {s.payslip && (
                    <div className="mt-1 flex gap-3 text-xs">
                      <span className="text-slate-600">Bruto: <span className="text-slate-500">{fmt(s.payslip.totalHaberes)}</span></span>
                      <span className="text-slate-600">Desc: <span className="text-rose-500/70">{fmt(s.payslip.totalDescuentos)}</span></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      {salaries.length === 0 && !payslip && (
        <div className="text-center py-10 text-slate-600 text-sm">Aún no hay sueldos registrados</div>
      )}
    </div>
  );
}
