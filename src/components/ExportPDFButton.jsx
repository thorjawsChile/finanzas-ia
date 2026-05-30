import { useState } from "react";
import { fmt } from "../utils.js";
import { MONTHS_ES } from "../constants.js";

/* ══════════════════════════════════════════════════════════════════════
   EXPORT PDF BUTTON
══════════════════════════════════════════════════════════════════════ */
export default function ExportPDFButton({ analysis, periods, salaries, creditos, ahorros, budget }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Build HTML report
      const now = new Date().toLocaleDateString("es-CL");
      const totalDeuda = (creditos||[]).reduce((a,c)=>a+c.cuota*(c.mesesTotal-c.mesesPagados),0);
      const totalMensualCreditos = (creditos||[]).reduce((a,c)=>a+c.cuota,0);
      const totalAhorrado = (ahorros||[]).reduce((a,s)=>a+s.actual,0);

      const catMap = {};
      (analysis?.expenses||[]).forEach(e=>{ catMap[e.category]=(catMap[e.category]||0)+e.amount; });
      const cats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);

      const budgetRows = Object.entries(budget||{}).map(([cat,limite])=>{
        const gastado = catMap[cat]||0;
        const pct = Math.min(100,Math.round((gastado/limite)*100));
        const status = pct>=90?"🔴 Excedido":pct>=70?"🟡 Atención":"🟢 OK";
        return `<tr><td>${cat}</td><td>$${Math.round(gastado).toLocaleString("es-CL")}</td><td>$${Math.round(limite).toLocaleString("es-CL")}</td><td>${pct}%</td><td>${status}</td></tr>`;
      }).join("");

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe FinanzasIA — ${now}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; }
  h1 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 8px; }
  h2 { color: #334155; margin-top: 24px; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 13px; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .kpi { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; margin: 6px; text-align: center; }
  .kpi .val { font-size: 20px; font-weight: bold; color: #059669; }
  .kpi .lbl { font-size: 11px; color: #64748b; }
  .summary { background: #f0fdf4; border-left: 4px solid #059669; padding: 12px; margin: 12px 0; font-size: 14px; border-radius: 4px; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<h1>💳 Informe FinanzasIA</h1>
<p style="color:#64748b;font-size:13px">Generado el ${now}</p>

${analysis ? `
<h2>📊 Último Análisis</h2>
<div class="summary">${analysis.summary||""}</div>
<div>
  <div class="kpi"><div class="val">$${Math.round(analysis.totalExpenses||0).toLocaleString("es-CL")}</div><div class="lbl">Total Gastos</div></div>
  <div class="kpi"><div class="val">${analysis.expenses?.length||0}</div><div class="lbl">Transacciones</div></div>
  ${analysis.salaryRatio ? `<div class="kpi"><div class="val">${analysis.salaryRatio}</div><div class="lbl">% del Sueldo</div></div>` : ""}
</div>

<h2>📂 Gastos por Categoría</h2>
<table>
  <tr><th>Categoría</th><th>Monto</th><th>% del Total</th></tr>
  ${cats.map(([cat,amt])=>`<tr><td>${cat}</td><td>$${Math.round(amt).toLocaleString("es-CL")}</td><td>${analysis.totalExpenses>0?((amt/analysis.totalExpenses)*100).toFixed(1):0}%</td></tr>`).join("")}
</table>` : ""}

${budgetRows ? `
<h2>🚦 Presupuesto Mensual</h2>
<table>
  <tr><th>Categoría</th><th>Gastado</th><th>Límite</th><th>Uso</th><th>Estado</th></tr>
  ${budgetRows}
</table>` : ""}

${(creditos||[]).length > 0 ? `
<h2>💳 Créditos y Deudas</h2>
<div>
  <div class="kpi"><div class="val">$${Math.round(totalDeuda).toLocaleString("es-CL")}</div><div class="lbl">Deuda Total</div></div>
  <div class="kpi"><div class="val">$${Math.round(totalMensualCreditos).toLocaleString("es-CL")}</div><div class="lbl">Pago Mensual</div></div>
</div>
<table>
  <tr><th>Nombre</th><th>Cuota</th><th>Restante</th><th>Progreso</th></tr>
  ${(creditos||[]).map(c=>{
    const rest=Math.max(0,c.mesesTotal-c.mesesPagados);
    const pct=c.mesesTotal>0?Math.round((c.mesesPagados/c.mesesTotal)*100):0;
    return `<tr><td>${c.nombre}</td><td>$${Math.round(c.cuota).toLocaleString("es-CL")}</td><td>$${Math.round(c.cuota*rest).toLocaleString("es-CL")}</td><td>${pct}%</td></tr>`;
  }).join("")}
</table>` : ""}

${(ahorros||[]).length > 0 ? `
<h2>🎯 Metas de Ahorro</h2>
<div><div class="kpi"><div class="val">$${Math.round(totalAhorrado).toLocaleString("es-CL")}</div><div class="lbl">Total Ahorrado</div></div></div>
<table>
  <tr><th>Meta</th><th>Ahorrado</th><th>Objetivo</th><th>Avance</th></tr>
  ${(ahorros||[]).map(a=>{
    const pct=a.objetivo>0?Math.min(100,Math.round((a.actual/a.objetivo)*100)):0;
    return `<tr><td>${a.emoji} ${a.nombre}</td><td>$${Math.round(a.actual).toLocaleString("es-CL")}</td><td>$${Math.round(a.objetivo).toLocaleString("es-CL")}</td><td>${pct}%</td></tr>`;
  }).join("")}
</table>` : ""}

${(salaries||[]).length > 0 ? `
<h2>💰 Historial de Sueldos</h2>
<table>
  <tr><th>Período</th><th>Sueldo Líquido</th></tr>
  ${[...salaries].reverse().slice(0,6).map(s=>`<tr><td>${MONTHS_ES[s.month-1]} ${s.year}</td><td>$${Math.round(s.amount).toLocaleString("es-CL")}</td></tr>`).join("")}
</table>` : ""}

<div class="footer">Generado por FinanzasIA • finanzas-ia-ten.vercel.app</div>
</body>
</html>`;

      // Open in new window and trigger print
      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch(e) {
      console.error("Export error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white transition-all ${loading ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "btn-glow"}`}>
      {loading ? <><span className="animate-spin inline-block">⟳</span> Generando…</> : <>📥 Exportar informe PDF</>}
    </button>
  );
}
