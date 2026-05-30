import { secureAnthropicFetch } from "../security.js";
import { DEMO_MODE, DEMO_PAYSLIP_RESULT } from "../constants.js";
import { demoDelay } from "../utils.js";

/* ── AI: parse payslip ────────────────────────────────────────────────── */
export async function parsePayslipAI(rawText) {
  if (DEMO_MODE) { await demoDelay(); return DEMO_PAYSLIP_RESULT; }
  const prompt = `Eres un experto en liquidaciones de sueldo del Hospital Clínico de Magallanes y del sector público chileno. Extrae con precisión absoluta todos los datos.

Texto extraído:
---
${rawText.slice(0, 6000)}
---

FORMATO DEL DOCUMENTO:

Cada ítem (haber o descuento) tiene el formato: CÓDIGO(4 dígitos) NOMBRE monto
  Haber:    "0001 SUELDO BASE 1.200.000"           → name: "SUELDO BASE",   amount: 1200000
  Descuento:"0000 CAPITAL Pensión 10% 236.494"     → name: "Pensión 10%",   amount: 236494
  (En descuentos, el nombre empieza DESPUÉS del identificador de institución como "CAPITAL", "FONASA", "AFC")

REGLA 1 — MONTO CERO:
  "0004 DESAHUCIO 0" → name: "DESAHUCIO", amount: 0
  Si el único número al final es 0, amount es 0. No tomes monto de otra línea.

REGLA 2 — ASTERISCO AL FINAL DE LÍNEA (tope legal):
  "0342 GYM SPORTLIFE 39.900 *" → name: "GYM SPORTLIFE", amount: 39900
  El * al final es solo una marca visual. El monto del ítem ES 39.900. Ignorar el asterisco.

REGLA 3 — LÍNEAS QUE EMPIEZAN CON * O ** (IGNORAR COMPLETAMENTE):
  "*Monto Tope 15% 437.035"  → IGNORAR. 437.035 NO es monto de ningún ítem.
  "**Monto Tope 25% 728.391" → IGNORAR. 728.391 NO es monto de ningún ítem.
  Estas líneas son referencias legales que aparecen después de ítems marcados con *. Nunca son descuentos.

REGLA 4 — FILA DE TOTALES (exactamente 5 números en orden fijo):
  Posición 1 → totalHaberes
  Posición 2 → Total Imponible  (IGNORAR)
  Posición 3 → Total Tributable (IGNORAR)
  Posición 4 → totalDescuentos
  Posición 5 → liquidoPagar     ← SIEMPRE EL QUINTO, EL ÚLTIMO

  Ejemplo: "2.913.567 2.364.941 1.861.531 752.939 2.160.628"
    totalHaberes    = 2913567
    totalDescuentos = 752939   (posición 4)
    liquidoPagar    = 2160628  (posición 5 — el último)

  CRÍTICO: liquidoPagar es el QUINTO número, NUNCA el cuarto.
  En el ejemplo, 752.939 es totalDescuentos y 2.160.628 es liquidoPagar. Jamás al revés.

EXTRAE:
1. workerName: nombre completo del trabajador
2. companyName: nombre del establecimiento/empresa
3. month (1-12) y year (YYYY)
4. sueldoBase: monto del ítem "Sueldo base" o "SUELDO BASE"
5. haberes: [{name, amount}] — todos los haberes con su monto exacto de esa línea
6. descuentos: [{name, amount}] — todos los descuentos con su monto exacto (0 si corresponde)
7. totalHaberes: posición 1 de la fila de totales
8. totalDescuentos: posición 4 de la fila de totales
9. liquidoPagar: posición 5 (último) de la fila de totales
10. afp: nombre de la AFP
11. salud: nombre de la Isapre o Fonasa

Solo JSON válido sin markdown:
{"workerName":"","companyName":"","month":1,"year":2025,"sueldoBase":0,"haberes":[{"name":"","amount":0}],"descuentos":[{"name":"","amount":0}],"totalHaberes":0,"totalDescuentos":0,"liquidoPagar":0,"afp":"","salud":""}`;

  const data = await secureAnthropicFetch({
    model: "claude-sonnet-4-5", max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (data.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
