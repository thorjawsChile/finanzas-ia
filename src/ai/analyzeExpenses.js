import { secureAnthropicFetch } from "../security.js";
import { DEMO_MODE, DEMO_EXPENSES_RESULT, MONTHS_ES } from "../constants.js";
import { demoDelay, fmt } from "../utils.js";

/* ── AI: analyze expenses ─────────────────────────────────────────────── */
export async function analyzeExpensesAI(rawText, salaries) {
  if (DEMO_MODE) { await demoDelay(); return DEMO_EXPENSES_RESULT; }
  // Combine salaries by month before passing to AI (sum multiple entries for same month)
  const salaryMonthMap = {};
  salaries.forEach(s => {
    const key = `${s.year}-${String(s.month).padStart(2,"0")}`;
    if (!salaryMonthMap[key]) salaryMonthMap[key] = { month: s.month, year: s.year, total: 0 };
    salaryMonthMap[key].total += s.amount;
  });
  const combinedSalaries = Object.values(salaryMonthMap).sort((a,b)=>`${a.year}${a.month}`.localeCompare(`${b.year}${b.month}`));
  const salaryCtx = combinedSalaries.length > 0
    ? `Sueldos líquidos registrados (combinados por mes): ${combinedSalaries.map(s => `${MONTHS_ES[s.month-1]} ${s.year}: ${fmt(s.total)}`).join(", ")}.`
    : "No hay sueldos registrados.";

  const prompt = `Eres un experto en análisis de estados de cuenta bancarios chilenos. Tu tarea es extraer TODAS las transacciones, identificar el banco emisor, el período facturado y calcular el total correcto de gastos.

${salaryCtx}

Texto extraído del estado de cuenta:
---
${rawText.slice(0, 10000)}
---

CAMPOS OBLIGATORIOS A IDENTIFICAR:

A. banco: nombre del banco o institución emisora. Busca en el encabezado del documento:
   - "Banco Santander", "SANTANDER" → banco: "Santander"
   - "Banco de Chile", "BANCO DE CHILE" → banco: "Banco de Chile"
   - "BancoEstado", "BANCO ESTADO" → banco: "BancoEstado"
   - "Scotiabank", "SCOTIABANK" → banco: "Scotiabank"
   - "Itaú", "ITAU" → banco: "Itaú"
   - "Bci", "BCI" → banco: "Bci"
   - "Falabella", "CMR" → banco: "Falabella"
   - Si no reconoces el banco, usa el nombre que aparezca en el encabezado.

B. periodoMes: CAMPO CRÍTICO — mes y año del período facturado, formato "MM/YYYY". NUNCA null.
   Busca en este orden hasta encontrarlo:
   1. Texto explícito de período/facturación:
      - "Período de facturación: 01/03/2026 al 31/03/2026" → "03/2026" (mes de cierre)
      - "PERÍODO FACTURADO 15/02/2026 - 14/03/2026" → "03/2026"
      - "PERÍODO ACTUAL MARZO 2026" o "PERÍODO ACTUAL: MARZO 2026" → "03/2026"
      - "Fecha de corte: 10/04/2026" → "04/2026"
      - "Vence el 30/04/2026" / "PAGAR HASTA 30/04/2026" → "04/2026"
      - "ESTADO DE CUENTA ABRIL 2026" → "04/2026"
   2. Si no hay texto explícito, analiza las fechas de las transacciones del período actual:
      - Encuentra el mes que aparece en la mayoría de las fechas de transacciones
      - Ejemplo: si la mayoría tienen fechas "xx/03/26" o "xx/03/2026" → periodoMes: "03/2026"
      - Usa el año completo: "26" → 2026, "25" → 2025
   periodoMes SIEMPRE debe tener valor. Si hay cualquier fecha en el documento, puedes determinarlo.

ESTRUCTURA DEL ESTADO DE CUENTA — debes entenderla bien:

El documento tiene estas secciones:
- "1.PERÍODO ANTERIOR": información del mes pasado — IGNORA COMPLETAMENTE estos montos
- "MONTO CANCELADO" o "$ -2.835.038" (número negativo grande): es el pago que hizo el cliente — IGNORAR, NO ES UN GASTO
- "SALDO ADEUDADO": saldos — IGNORAR
- "2.PERÍODO ACTUAL": aquí están las compras REALES del período — EXTRAER TODO
- "MOVIMIENTOS TARJETA XXXX-NNNN": encabezado de sección de tarjeta — NO es transacción
- El monto al lado de "MOVIMIENTOS TARJETA" (ej: $1.858.791) es el subtotal — NO incluir como transacción
- "1. TOTAL OPERACIONES $X": es el total general — NO incluir como transacción
- "2. PRODUCTOS O SERVICIOS VOLUNTARIAMENTE CONTRATADOS": cargos opcionales
- "3. CARGOS, COMISIONES, IMPUESTOS Y ABONOS": incluir solo si son cargos positivos (no abonos negativos)
- "4. INFORMACION COMPRAS EN CUOTAS EN EL PERIODO": nueva cuota que COMIENZA este período — incluir su VALOR CUOTA MENSUAL

REGLAS PARA EXTRAER TRANSACCIONES:

1. COMPRAS DIRECTAS (sin cuotas): tienen fecha, nombre comercio, y monto al final. Ejemplo:
   "PUNTA ARENAS 25/03/26 APP ARAMCO ESTACIONES $141.524" → desc: "APP ARAMCO ESTACIONES", amount: 141524

2. COMPRAS EN CUOTAS ANTERIORES (cuotas de meses pasados): tienen formato con "CUOTA COMERCIO", "CUOTA FIJA", "N/CUOTAS PRECIO", "TRES CUOTAS PREC" y al final el VALOR CUOTA MENSUAL. Ejemplo:
   "31/03/25 UDD CONVENIOS CUOTA COMERCIO 0,00% $1.600.000 $1.600.000 12/18 $88.889" → amount: 88889 (el último valor es la cuota mensual)
   "21/01/26 FLOW *TIEMPO DE MOTOCIC CUOTA FIJA 2,77% $260.000 $278.893 03/03 $92.965" → amount: 92965
   SIEMPRE usa el último monto (VALOR CUOTA MENSUAL), nunca el monto total original.

3. COMPRAS EN DÓLARES: tienen "US XX,XX" y luego el monto en CLP. Usa el monto CLP final. Ejemplo:
   "Singapore 24/03/26 aliexpress US 81,56 $77.070" → amount: 77070

4. COMPRAS EN CLP EXTRANJERO (ej: "CL 4.149,00"): el monto CLP está al final. Ejemplo:
   "Malmo 15/04/26 TIDAL CL 4.149,00 $4.149" → amount: 4149

5. IGNORAR COMPLETAMENTE:
   - Líneas con "MONTO CANCELADO" o montos negativos grandes (son pagos, no gastos)
   - "SALDO ADEUDADO", "CUPO", "MONTO MÍNIMO", "PAGAR HASTA"
   - Totales de sección: "MOVIMIENTOS TARJETA XXXX $X.XXX.XXX", "TOTAL OPERACIONES $X"
   - Información del período anterior (sección 1.PERÍODO ANTERIOR)
   - Nota de crédito ($-6.490) y otros abonos negativos

6. SÍ INCLUIR:
   - Impuestos y comisiones positivos (ej: "IMPTO. DECRETO LEY 3475 $766")
   - Nuevas cuotas que comienzan (sección 4): usar su VALOR CUOTA MENSUAL

CATEGORÍAS: Alimentación|Transporte|Entretenimiento|Salud|Ropa/Calzado|Hogar|Tecnología|Viajes|Servicios|Educación|Otros

Guía de categorías para este estado de cuenta:
- ARAMCO/COPEC/combustible → Transporte
- SALCOBRAND/CRUZVERDE/FARMACIA/médico/ODONTOCLINIK/IMAGENOLOGIA/SCANNER → Salud
- SUPERMERCADO/LIDER/UNIMARC/BAKAN/panadería/SAN FRANCISCO/carnes → Alimentación
- SPOTIFY/NETFLIX/AMAZON PRIME/TIDAL/GOOGLE PLAY → Entretenimiento
- ALIEXPRESS/AMAZON.COM/MERCADO LIBRE/MERCADOPAGO → Tecnología u Otros según contexto
- MUNICIPALIDAD/AGUAS/GASCO/ENTEL/MICROSOFT → Servicios
- SPA/COCOBIAN/MILAGROS → Salud
- SODIMAC/EASY/hogar → Hogar
- LATAM/viajes → Viajes
- POLLA CHILENA → Entretenimiento
- RESTAURANTE/CAFE/PASTELERIA → Alimentación
- ROPA/ZAPATOS/WEINBRENNER → Ropa/Calzado

VALIDACIÓN: el totalExpenses debe estar cerca de "1. TOTAL OPERACIONES" del documento.
${salaries.length > 0 ? "Incluye salaryRatio como % del sueldo promedio." : ""}

IMPORTANTE: Sé conciso en desc (máx 30 chars), summary (máx 200 chars) y recommendations (máx 100 chars cada una). El JSON debe ser compacto.

Responde SOLO con JSON válido sin markdown:
{"banco":"","periodoMes":"MM/YYYY","expenses":[{"desc":"","amount":0,"category":""}],"totalExpenses":0,"summary":"","topCategories":[{"name":"","total":0}],"recommendations":["","",""],"salaryRatio":null}`;

  const data = await secureAnthropicFetch({
    model: "claude-sonnet-4-5", max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (data.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
  // Repair truncated JSON by finding the last complete expense entry
  let jsonText = text;
  try {
    return JSON.parse(jsonText);
  } catch(e) {
    // Try to fix truncated JSON: close open arrays and objects
    const lastBrace = jsonText.lastIndexOf('}');
    if (lastBrace > 0) {
      // Find the last complete expense object
      let fixed = jsonText.slice(0, lastBrace + 1);
      // Count unclosed brackets to determine what to close
      const opens = (fixed.match(/\[/g)||[]).length - (fixed.match(/\]/g)||[]).length;
      const openBraces = (fixed.match(/\{/g)||[]).length - (fixed.match(/\}/g)||[]).length;
      for(let i = 0; i < openBraces; i++) fixed += '}';
      for(let i = 0; i < opens; i++) fixed += ']';
      // Close the root object if needed
      if (!fixed.trim().endsWith('}')) fixed += '}';
      try { return JSON.parse(fixed); } catch(e2) {
        // Last resort: extract what we can
        const expMatch = fixed.match(/"expenses"\s*:\s*(\[[\s\S]*?\])/);
        const totalMatch = fixed.match(/"totalExpenses"\s*:\s*(\d+)/);
        const summaryMatch = fixed.match(/"summary"\s*:\s*"([^"]+)"/);
        return {
          banco: null, periodoMes: null,
          expenses: expMatch ? JSON.parse(expMatch[1]) : [],
          totalExpenses: totalMatch ? parseInt(totalMatch[1]) : 0,
          summary: summaryMatch ? summaryMatch[1] : "Análisis parcial completado.",
          topCategories: [], recommendations: ["Revisa el análisis — el documento es extenso."],
          salaryRatio: null
        };
      }
    }
    throw e;
  }
}
