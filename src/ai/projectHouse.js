import { secureAnthropicFetch } from "../security.js";
import { DEMO_MODE, DEMO_PROJECTION_RESULT } from "../constants.js";
import { demoDelay, fmt } from "../utils.js";

/* ── AI: house projection ─────────────────────────────────────────────── */
export async function projectHouseAI({ salaries, analysis, periods, creditos, ahorros, houseMonthly, currentRent, extraIncome }) {
  if (DEMO_MODE) { await demoDelay(2500); return DEMO_PROJECTION_RESULT; }

  // ── Salaries ──────────────────────────────────────────────────────────
  const projMonthMap = {};
  salaries.forEach(s => {
    const key = `${s.year}-${String(s.month).padStart(2,"0")}`;
    if (!projMonthMap[key]) projMonthMap[key] = { month: s.month, year: s.year, total: 0 };
    projMonthMap[key].total += s.amount;
  });
  const projMonths   = Object.values(projMonthMap).sort((a,b)=>`${a.year}${a.month}`.localeCompare(`${b.year}${b.month}`));
  const avgSalary    = projMonths.length > 0 ? projMonths.reduce((a,m)=>a+m.total,0)/projMonths.length : 0;
  const latestSalary = projMonths.length > 0 ? projMonths[projMonths.length-1].total : 0;

  // ── Expenses: promedio de todos los períodos disponibles ──────────────
  const periodsWithData = (periods || []).filter(p => p.analysis?.totalExpenses > 0);
  let avgMonthlyExpenses = 0;
  let representativeExpenses = [];
  if (periodsWithData.length > 0) {
    avgMonthlyExpenses = Math.round(
      periodsWithData.reduce((sum, p) => sum + p.analysis.totalExpenses, 0) / periodsWithData.length
    );
    representativeExpenses = periodsWithData[periodsWithData.length - 1].analysis.expenses || [];
  } else if (analysis?.totalExpenses > 0) {
    avgMonthlyExpenses = analysis.totalExpenses;
    representativeExpenses = analysis.expenses || [];
  }

  // ── Créditos activos: suma de cuotas mensuales ────────────────────────
  const creditosActivos = (creditos || []).filter(c => c.cuota > 0 && (c.mesesTotal - c.mesesPagados) > 0);
  const monthlyCreditos = creditosActivos.reduce((s, c) => s + c.cuota, 0);

  // ── Aportes de ahorro activos (metas no alcanzadas) ───────────────────
  const ahorrosActivos  = (ahorros || []).filter(a => a.aporte > 0 && a.actual < a.objetivo);
  const monthlyAhorros  = ahorrosActivos.reduce((s, a) => s + a.aporte, 0);

  // ── Pre-calcular números clave en JS ─────────────────────────────────
  const totalIncome        = latestSalary + extraIncome;
  const gastosNetosConCasa = Math.max(0, avgMonthlyExpenses - currentRent);
  const disponibleConCasa  = totalIncome - houseMonthly - gastosNetosConCasa - monthlyCreditos - monthlyAhorros;
  const threshold15        = Math.round(totalIncome * 0.15);
  const viabilityStatus    = disponibleConCasa > threshold15 ? "green" : disponibleConCasa >= 0 ? "yellow" : "red";

  const periodLabel = periodsWithData.length > 1
    ? `promedio de ${periodsWithData.length} períodos`
    : "período analizado";

  const creditosCtx = creditosActivos.length > 0
    ? `Cuotas créditos activos: ${fmt(monthlyCreditos)}/mes (${creditosActivos.map(c=>`${c.nombre} $${c.cuota.toLocaleString("es-CL")}`).join(", ")})`
    : "Sin créditos activos.";

  const ahorrosCtx = ahorrosActivos.length > 0
    ? `Aportes ahorro activos: ${fmt(monthlyAhorros)}/mes (${ahorrosActivos.map(a=>`${a.nombre} $${a.aporte.toLocaleString("es-CL")}`).join(", ")})`
    : "Sin aportes de ahorro activos.";

  const transactionList = representativeExpenses.length > 0
    ? `Transacciones del período más reciente (clasifica CADA una):
${representativeExpenses.map((e,i) => `${i+1}. ${e.desc} | ${fmt(e.amount)} | ${e.category}`).join("\n")}`
    : "No hay transacciones bancarias cargadas — devuelve transactions como array vacío.";

  const prompt = `Eres un asesor financiero personal directo. Analiza si esta persona/hogar puede comprar una casa.

NÚMEROS EXACTOS (calculados externamente — úsalos SIN modificar en el JSON):
  totalIncome        = ${totalIncome}       ← sueldo + extras
  avgMonthlyExpenses = ${avgMonthlyExpenses} ← gastos bancarios (${periodLabel})
  monthlyCreditos    = ${monthlyCreditos}    ← cuotas de créditos activos
  monthlyAhorros     = ${monthlyAhorros}     ← aportes ahorro activos
  houseMonthly       = ${houseMonthly}       ← dividendo/arriendo casa
  currentRent        = ${currentRent}        ← arriendo actual que deja de pagar
  disponibleConCasa  = ${disponibleConCasa}  ← RESULTADO FINAL (ingreso - casa - gastos - créditos - ahorros)
  viabilityStatus    = "${viabilityStatus}" ← ya calculado, no cambiar

DETALLE INGRESOS:
${salaries.length > 0 ? `Sueldo líquido reciente: ${fmt(latestSalary)} | Promedio: ${fmt(avgSalary)}` : "Sin sueldos."}
${extraIncome > 0 ? `Ingresos extra: ${fmt(extraIncome)}/mes` : ""}

COMPROMISOS MENSUALES FIJOS:
Gastos bancarios: ${fmt(avgMonthlyExpenses)}/mes${currentRent > 0 ? ` (incluye arriendo ${fmt(currentRent)} que dejaría de pagar)` : ""}
${creditosCtx}
${ahorrosCtx}

${transactionList}

INSTRUCCIONES:
1. JSON: totalIncome = ${totalIncome}, disponibleConCasa = ${disponibleConCasa}, viabilityStatus = "${viabilityStatus}" — EXACTOS.
2. houseImpact = ${houseMonthly - currentRent} (costo neto de la casa).
3. extraNeeded: 0 si disponibleConCasa ≥ 0; si no → Math.max(0, ${Math.abs(Math.min(0,disponibleConCasa))} - totalPotentialSaving).
4. Clasifica CADA transacción bancaria:
   - "cut": eliminar (delivery excesivo, suscripciones duplicadas, lujos)
   - "reduce": necesario pero reducible (restaurantes, ropa, entretenimiento)
   - "keep": esencial (salud, supermercado, transporte laboral, servicios básicos)
   savedAmount: total si "cut", reducción posible si "reduce", 0 si "keep". Reason: ≤12 palabras.
5. totalPotentialSaving = suma exacta de savedAmount.
6. budget: presupuesto proyectado con casa incluida y recortes aplicados.
7. 4 recomendaciones concretas. Si hay créditos por terminar pronto, mencionarlos como oportunidad.
8. summary: 3 oraciones directas con números reales. Mencionar créditos y aportes de ahorro si son relevantes.

Solo JSON sin markdown:
{"viable":true,"viabilityStatus":"${viabilityStatus}","summary":"","totalIncome":${totalIncome},"houseImpact":${houseMonthly-currentRent},"disponibleConCasa":${disponibleConCasa},"extraNeeded":0,"totalPotentialSaving":0,"transactions":[{"desc":"","amount":0,"category":"","action":"cut","reason":"","savedAmount":0}],"savingsOpportunities":[{"category":"","currentAmount":0,"suggestedAmount":0,"saving":0}],"budget":[{"category":"","amount":0}],"recommendations":["","","",""]}`;

  const data = await secureAnthropicFetch({
    model: "claude-sonnet-4-5", max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  const result = JSON.parse(text);
  result.totalIncome       = totalIncome;
  result.disponibleConCasa = disponibleConCasa;
  result.viabilityStatus   = viabilityStatus;
  result.viable            = disponibleConCasa >= 0;
  return result;
}
