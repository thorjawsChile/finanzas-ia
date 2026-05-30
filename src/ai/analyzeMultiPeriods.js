import { secureAnthropicFetch } from "../security.js";
import { DEMO_MODE, demoDelay, fmt } from "../constants.js";

/* ── AI: multi-period analysis ────────────────────────────────────────── */
export async function analyzeMultiPeriodsAI(periods, salaries) {
  if (DEMO_MODE) {
    await demoDelay(2000);
    return {
      overallSummary: "En los 2 períodos analizados se observa un gasto promedio mensual de $789.700. El delivery y las suscripciones de streaming son los gastos más prescindibles detectados consistentemente. Se recomienda atención especial en Alimentación que representa el 33% del gasto total.",
      totalAllPeriods: 1579400,
      avgMonthly: 789700,
      trend: "stable",
      trendDesc: "Los gastos se mantienen estables entre períodos.",
      alerts: [
        { level: "high",   title: "Delivery excesivo",         desc: "Rappi y PedidosYa suman más de $44.000 al mes consistentemente. Es el gasto más fácil de eliminar." },
        { level: "high",   title: "Suscripciones duplicadas",  desc: "Tienes 4 servicios de streaming activos simultáneamente por $52.500/mes." },
        { level: "medium", title: "Ropa sin presupuesto fijo", desc: "El gasto en ropa varía mucho y no tiene un límite claro. Considera un presupuesto mensual fijo." },
        { level: "low",    title: "Farmacia frecuente",        desc: "Varios gastos en farmacias. Revisa si hay medicamentos que puedas comprar en cantidad." },
      ],
      cuts: [
        { desc: "Eliminar 2 de 4 servicios streaming",   saving: 18800, effort: "Fácil",  impact: "Alto" },
        { desc: "Reducir delivery a 1 vez/semana",        saving: 32000, effort: "Medio",  impact: "Alto" },
        { desc: "Presupuesto fijo ropa $40.000/mes",      saving: 69800, effort: "Medio",  impact: "Alto" },
        { desc: "Comprar medicamentos en cantidad",        saving: 8000,  effort: "Fácil",  impact: "Bajo" },
        { desc: "Cocinar más en casa (menos restaurantes)",saving: 25000, effort: "Medio",  impact: "Medio" },
      ],
      topRecurring: [
        { desc: "SUPERMERCADO LIDER/JUMBO", avgAmount: 143700, category: "Alimentación", verdict: "Esencial — mantener" },
        { desc: "RAPPI / PEDIDOSYA",        avgAmount: 44700,  category: "Alimentación", verdict: "Eliminar — cocinar en casa" },
        { desc: "STREAMING (4 servicios)",  avgAmount: 52500,  category: "Entretenimiento", verdict: "Reducir a 2 máximo" },
        { desc: "FARMACIA",                 avgAmount: 31200,  category: "Salud",        verdict: "Necesario — optimizable" },
        { desc: "BENCINA/COPEC",            avgAmount: 41500,  category: "Transporte",   verdict: "Esencial — mantener" },
      ],
      recommendations: [
        "El mayor ahorro inmediato está en delivery y streaming: eliminarlos completamente ahorra $69.500/mes sin afectar la calidad de vida significativamente.",
        "La categoría Ropa/Calzado es la más variable entre períodos — establecer un presupuesto fijo de $40.000 y no superarlo genera un ahorro promedio de $69.800.",
        "Considera hacer una compra mensual grande en farmacia en lugar de compras frecuentes pequeñas — ahorras tiempo y puedes aprovechar ofertas.",
        "El gasto en supermercado es saludable y consistente. No es necesario reducirlo — es mejor mantener la alimentación en casa que gastar en delivery.",
      ],
    };
  }

  const salaryInfo = salaries.length > 0
    ? `Sueldo promedio: ${fmt(salaries.reduce((a,s)=>a+s.amount,0)/salaries.length)}`
    : "Sin sueldos registrados.";

  const periodsData = periods.map((p,i) => {
    const topCats = (p.analysis.topCategories||[]).map(c=>`${c.name}: ${fmt(c.total)}`).join(", ");
    const topExpenses = (p.analysis.expenses||[])
      .sort((a,b)=>b.amount-a.amount).slice(0,8)
      .map(e=>`${e.desc}: ${fmt(e.amount)}`).join(", ");
    return `Período ${i+1} — ${p.label}: Total ${fmt(p.analysis.totalExpenses)}, Categorías: ${topCats}, Mayores gastos: ${topExpenses}`;
  }).join("\n");

  const prompt = `Eres un asesor financiero personal experto. Analiza TODOS los períodos de gastos juntos y entrega un informe consolidado con recomendaciones concretas de ahorro.

${salaryInfo}

PERÍODOS ANALIZADOS (${periods.length} meses):
${periodsData}

ENTREGA:
1. overallSummary: resumen ejecutivo 3-4 oraciones del patrón de gastos general
2. totalAllPeriods: suma total de todos los períodos
3. avgMonthly: promedio mensual
4. trend: "increasing" | "decreasing" | "stable"
5. trendDesc: 1 frase describiendo la tendencia
6. alerts: 3-5 alertas de gastos preocupantes [{level:"high"|"medium"|"low", title, desc}]
7. cuts: 5 recortes específicos ordenados por ahorro [{desc, saving (mensual estimado), effort:"Fácil"|"Medio"|"Difícil", impact:"Alto"|"Medio"|"Bajo"}]
8. topRecurring: 5 gastos más recurrentes entre períodos [{desc, avgAmount, category, verdict}]
9. recommendations: 4 recomendaciones concretas y personalizadas

Solo JSON válido sin markdown:
{"overallSummary":"","totalAllPeriods":0,"avgMonthly":0,"trend":"stable","trendDesc":"","alerts":[{"level":"high","title":"","desc":""}],"cuts":[{"desc":"","saving":0,"effort":"Fácil","impact":"Alto"}],"topRecurring":[{"desc":"","avgAmount":0,"category":"","verdict":""}],"recommendations":[""]}`;

  const data = await secureAnthropicFetch({
    model: "claude-sonnet-4-5", max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  return JSON.parse(text);
}
