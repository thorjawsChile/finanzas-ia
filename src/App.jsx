import { useState, useCallback, useRef, useEffect } from "react";
import { secureAnthropicFetch, sanitizeInput, validateFile, getRateLimitStatus, login, loadSession, clearSession, savePeriods, loadPeriods, saveSalaries, loadSalaries } from "./security.js";

/* ══════════════════════════════════════════════════════════════════════
   MODO DEMO — se activa cuando VITE_DEMO_MODE=true en .env
   Usa datos de ejemplo sin necesitar API key de Anthropic.
══════════════════════════════════════════════════════════════════════ */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const DEMO_EXPENSES_RESULT = {
  expenses: [
    { desc: "SUPERMERCADO LIDER",      amount: 89500,  category: "Alimentación" },
    { desc: "SUPERMERCADO JUMBO",      amount: 54200,  category: "Alimentación" },
    { desc: "NETFLIX",                 amount: 9900,   category: "Entretenimiento" },
    { desc: "SPOTIFY",                 amount: 5900,   category: "Entretenimiento" },
    { desc: "DISNEY PLUS",             amount: 8900,   category: "Entretenimiento" },
    { desc: "BENCINA COPEC PATAGONIA", amount: 45000,  category: "Transporte" },
    { desc: "UBER",                    amount: 12300,  category: "Transporte" },
    { desc: "FARMACIA CRUZ VERDE",     amount: 23400,  category: "Salud" },
    { desc: "ISAPRE COLMENA",          amount: 48000,  category: "Salud" },
    { desc: "RESTAURANTE EL MESON",    amount: 38500,  category: "Alimentación" },
    { desc: "RAPPI DELIVERY",          amount: 18900,  category: "Alimentación" },
    { desc: "RAPPI DELIVERY",          amount: 14200,  category: "Alimentación" },
    { desc: "PEDIDOSYA",               amount: 11600,  category: "Alimentación" },
    { desc: "RIPLEY ROPA",             amount: 67800,  category: "Ropa/Calzado" },
    { desc: "FALABELLA CALZADO",       amount: 42000,  category: "Ropa/Calzado" },
    { desc: "ENTEL MOVIL",             amount: 29900,  category: "Servicios" },
    { desc: "LUZ CGE HOGAR",           amount: 34500,  category: "Hogar" },
    { desc: "GIMNASIO SMART FIT",      amount: 24900,  category: "Salud" },
    { desc: "AMAZON KINDLE",           amount: 7900,   category: "Entretenimiento" },
    { desc: "STEAM VIDEOJUEGOS",       amount: 19900,  category: "Entretenimiento" },
    { desc: "CURSO UDEMY",             amount: 15000,  category: "Educación" },
    { desc: "EASY HOGAR",              amount: 28700,  category: "Hogar" },
    { desc: "COPEC COMBUSTIBLE",       amount: 38000,  category: "Transporte" },
  ],
  totalExpenses: 789700,
  summary: "Durante el período analizado se registraron 23 transacciones por un total de $789.700. El mayor gasto corresponde a Alimentación, donde destacan compras en supermercados más gastos frecuentes en delivery (Rappi y PedidosYa suman $44.700). El entretenimiento digital tiene 4 suscripciones activas simultáneas por $52.500 mensuales. Hay oportunidades claras de ahorro en delivery y suscripciones duplicadas.",
  topCategories: [
    { name: "Alimentación",    total: 228900 },
    { name: "Ropa/Calzado",    total: 109800 },
    { name: "Salud",           total: 96300  },
    { name: "Entretenimiento", total: 52500  },
    { name: "Transporte",      total: 95300  },
  ],
  recommendations: [
    "Reducir pedidos de delivery a máximo 2 veces por semana — actualmente gastas $44.700/mes en Rappi y PedidosYa, podrías bajar a $15.000.",
    "Revisar suscripciones de streaming: tienes Netflix, Spotify, Disney+ y Amazon Kindle activos simultáneamente ($32.600/mes). Considera rotar o compartir cuentas.",
    "Las compras en Ripley y Falabella suman $109.800 en el período. Establecer un presupuesto fijo mensual para ropa de $40.000 liberaría casi $70.000.",
  ],
  salaryRatio: "52.6%",
  banco: "Santander",
  periodoMes: "05/2025",
};

const DEMO_PAYSLIP_RESULT = {
  workerName:      "Juan Pérez González",
  companyName:     "Empresa Demo SpA",
  month:           5,
  year:            2025,
  sueldoBase:      1200000,
  haberes: [
    { name: "Sueldo Base",          amount: 1200000 },
    { name: "Bono Asistencia",      amount: 50000   },
    { name: "Horas Extra",          amount: 35000   },
    { name: "Colación",             amount: 96000   },
    { name: "Movilización",         amount: 60000   },
  ],
  descuentos: [
    { name: "AFP Habitat (11.27%)", amount: 157780  },
    { name: "Isapre Colmena",       amount: 48000   },
    { name: "Impuesto Único",       amount: 42300   },
    { name: "Seguro Cesantía",      amount: 9200    },
  ],
  totalHaberes:    1441000,
  totalDescuentos: 257280,
  liquidoPagar:    1183720,
  afp:             "AFP Habitat",
  salud:           "Isapre Colmena",
};

const DEMO_PROJECTION_RESULT = {
  viable:           true,
  viabilityStatus: "yellow",
  summary:         "Con un sueldo líquido de $1.183.720 y gastos actuales de $789.700, el margen disponible antes de la casa es de $394.020. El dividendo de $650.000 supera ese margen en $255.980, lo que hace la compra inviable en el estado actual. Sin embargo, eliminando los gastos prescindibles detectados (delivery frecuente, suscripciones duplicadas, ropa no planificada) se pueden liberar $233.500/mes, dejando un déficit manejable de solo $22.480.",
  totalIncome:      1183720,
  houseImpact:      650000,
  disponibleConCasa: -255980,
  extraNeeded:      22480,
  totalPotentialSaving: 233500,
  transactions: [
    { desc: "RAPPI DELIVERY",          amount: 18900, category: "Alimentación",    action: "cut",    reason: "Delivery 3 veces por semana es prescindible cocinando en casa propia.", savedAmount: 18900 },
    { desc: "RAPPI DELIVERY",          amount: 14200, category: "Alimentación",    action: "cut",    reason: "Segunda instancia de delivery — claramente un hábito a eliminar.", savedAmount: 14200 },
    { desc: "PEDIDOSYA",               amount: 11600, category: "Alimentación",    action: "cut",    reason: "Tercer servicio de delivery activo. Cocinando en casa ahorra este monto completo.", savedAmount: 11600 },
    { desc: "DISNEY PLUS",             amount: 8900,  category: "Entretenimiento", action: "cut",    reason: "Con Netflix ya activo, Disney+ es prescindible o puede compartirse.", savedAmount: 8900 },
    { desc: "AMAZON KINDLE",           amount: 7900,  category: "Entretenimiento", action: "cut",    reason: "Cuarta suscripción de entretenimiento — la menos usada estadísticamente.", savedAmount: 7900 },
    { desc: "STEAM VIDEOJUEGOS",       amount: 19900, category: "Entretenimiento", action: "cut",    reason: "Compras de videojuegos son prescindibles en etapa de ahorro para casa.", savedAmount: 19900 },
    { desc: "RESTAURANTE EL MESON",    amount: 38500, category: "Alimentación",    action: "reduce", reason: "Salir a comer ocasionalmente está bien, pero puede reducirse a 1 vez al mes.", savedAmount: 25000 },
    { desc: "RIPLEY ROPA",             amount: 67800, category: "Ropa/Calzado",    action: "reduce", reason: "Presupuesto de ropa muy alto. Reducir a $25.000/mes libera $42.800.", savedAmount: 42800 },
    { desc: "FALABELLA CALZADO",       amount: 42000, category: "Ropa/Calzado",    action: "reduce", reason: "Calzado puede esperar o planificarse trimestralmente.", savedAmount: 32000 },
    { desc: "GIMNASIO SMART FIT",      amount: 24900, category: "Salud",           action: "keep",   reason: "La salud es prioritaria. Mantener.", savedAmount: 0 },
    { desc: "SUPERMERCADO LIDER",      amount: 89500, category: "Alimentación",    action: "keep",   reason: "Alimentación básica esencial, no reducir.", savedAmount: 0 },
    { desc: "SUPERMERCADO JUMBO",      amount: 54200, category: "Alimentación",    action: "keep",   reason: "Compra de supermercado esencial.", savedAmount: 0 },
    { desc: "ISAPRE COLMENA",          amount: 48000, category: "Salud",           action: "keep",   reason: "Salud es innegociable.", savedAmount: 0 },
    { desc: "ENTEL MOVIL",             amount: 29900, category: "Servicios",       action: "keep",   reason: "Comunicación esencial para el trabajo.", savedAmount: 0 },
    { desc: "BENCINA COPEC PATAGONIA", amount: 45000, category: "Transporte",      action: "keep",   reason: "Transporte al trabajo, no reducible.", savedAmount: 0 },
    { desc: "NETFLIX",                 amount: 9900,  category: "Entretenimiento", action: "keep",   reason: "Una suscripción de streaming es razonable mantener.", savedAmount: 0 },
    { desc: "SPOTIFY",                 amount: 5900,  category: "Entretenimiento", action: "keep",   reason: "Bajo costo, alto uso. Mantener.", savedAmount: 0 },
    { desc: "LUZ CGE HOGAR",           amount: 34500, category: "Hogar",           action: "keep",   reason: "Servicio básico esencial.", savedAmount: 0 },
    { desc: "FARMACIA CRUZ VERDE",     amount: 23400, category: "Salud",           action: "keep",   reason: "Gastos de salud no reducibles.", savedAmount: 0 },
    { desc: "COPEC COMBUSTIBLE",       amount: 38000, category: "Transporte",      action: "keep",   reason: "Bencina para ir al trabajo.", savedAmount: 0 },
    { desc: "EASY HOGAR",              amount: 28700, category: "Hogar",           action: "reduce", reason: "Compras de hogar pueden planificarse y reducirse a lo esencial.", savedAmount: 18700 },
    { desc: "UBER",                    amount: 12300, category: "Transporte",      action: "reduce", reason: "Si tienes auto, reducir Uber a emergencias.", savedAmount: 8300 },
    { desc: "CURSO UDEMY",             amount: 15000, category: "Educación",       action: "keep",   reason: "Inversión en educación es prioritaria.", savedAmount: 0 },
  ],
  savingsOpportunities: [
    { category: "Delivery",        currentAmount: 44700,  suggestedAmount: 10000, saving: 34700 },
    { category: "Entretenimiento", currentAmount: 52500,  suggestedAmount: 15800, saving: 36700 },
    { category: "Ropa/Calzado",    currentAmount: 109800, suggestedAmount: 35000, saving: 74800 },
    { category: "Restaurantes",    currentAmount: 38500,  suggestedAmount: 15000, saving: 23500 },
  ],
  budget: [
    { category: "Casa/Dividendo",  amount: 650000 },
    { category: "Alimentación",    amount: 183000 },
    { category: "Salud",           amount: 96300  },
    { category: "Transporte",      amount: 87000  },
    { category: "Servicios",       amount: 29900  },
    { category: "Hogar",           amount: 44200  },
    { category: "Entretenimiento", amount: 15800  },
    { category: "Ropa/Calzado",    amount: 35000  },
    { category: "Educación",       amount: 15000  },
  ],
  recommendations: [
    "Elimina los 3 servicios de delivery (Rappi x2 + PedidosYa): $44.700/mes → cocinar en casa es clave cuando tienes dividendo.",
    "Consolida el streaming a máximo 2 plataformas. Netflix + Spotify bastan; elimina Disney+ y Amazon Kindle por ahora.",
    "Establece un presupuesto de ropa de $35.000/mes y cúmplelo estrictamente — hoy estás gastando 3x más.",
    "Con los recortes aplicados el déficit baja a ~$22.000/mes. Busca un ingreso extra puntual (hora extra, freelance) o negocia un aumento antes de firmar el dividendo.",
  ],
};

async function demoDelay(ms = 1800) {
  return new Promise(r => setTimeout(r, ms));
}


import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";

/* ── palette & helpers ─────────────────────────────────────────────────── */
const CAT_COLORS = {
  "Alimentación":    "#f472b6",
  "Transporte":      "#fb923c",
  "Entretenimiento": "#a78bfa",
  "Salud":           "#34d399",
  "Ropa/Calzado":    "#f9a8d4",
  "Hogar":           "#60a5fa",
  "Tecnología":      "#22d3ee",
  "Viajes":          "#fbbf24",
  "Servicios":       "#818cf8",
  "Educación":       "#4ade80",
  "Otros":           "#94a3b8",
};
const PALETTE = Object.values(CAT_COLORS);
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = (n) => isNaN(n) ? "$0" : "$" + Math.round(Number(n)).toLocaleString("es-CL");

// Normalize periodoMes to "MM/YYYY" — accepts "M/YYYY" or "MM/YYYY"
function normalizePM(pm) {
  if (!pm) return null;
  const m = String(pm).match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return m[1].padStart(2, "0") + "/" + m[2];
}

/* ── PDF text extraction via pdf.js ──────────────────────────────────── */
async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return fullText;
}

/* ── AI: analyze expenses ─────────────────────────────────────────────── */
async function analyzeExpensesAI(rawText, salaries) {
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

/* ── AI: parse payslip ────────────────────────────────────────────────── */
async function parsePayslipAI(rawText) {
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

/* ══════════════════════════════════════════════════════════════════════
   UI COMPONENTS
══════════════════════════════════════════════════════════════════════ */
function Card({ children, className = "", glow = false }) {
  return (
    <div className={`rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm p-5 transition-all ${glow ? "shadow-lg shadow-emerald-900/20 border-emerald-700/40" : ""} ${className}`}>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, accent = "emerald" }) {
  const accents = { emerald:"text-emerald-400", amber:"text-amber-400", rose:"text-rose-400", sky:"text-sky-400", violet:"text-violet-400", pink:"text-pink-400" };
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-bold font-mono ${accents[accent]}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 shadow-xl">
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-mono" style={{ color: p.color || "#34d399" }}>
          {p.name ? `${p.name}: ` : ""}{fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

/* ── FILE DROP ZONE (reusable) ────────────────────────────────────────── */
function DropZone({ onFile, accept = ".pdf,.csv,.txt", label, sublabel, fileName, loading, progress }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? "border-emerald-500 bg-emerald-950/30" : "border-slate-700 hover:border-emerald-600/60 hover:bg-slate-800/40"}`}
    >
      <div className="text-4xl mb-2">{fileName ? "📄" : "⬆️"}</div>
      {fileName
        ? <p className="text-emerald-400 text-sm font-medium">{fileName}</p>
        : <>
            <p className="text-slate-400 text-sm">{label} <span className="text-emerald-400 underline underline-offset-2">haz clic</span></p>
            <p className="text-slate-600 text-xs mt-1">{sublabel}</p>
          </>
      }
      {loading && progress && (
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-400">
          <span className="animate-spin inline-block">⟳</span> {progress}
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  );
}

/* ── LOGIN SCREEN ────────────────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setLoading(true); setError("");
    try {
      const data = await login(username.trim(), password);
      onLogin(data.username, data.token);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, #0d2e1f 0%, #0a0f1a 60%, #060810 100%)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-emerald-900/50 mb-4">
            💳
          </div>
          <h1 className="text-2xl font-bold text-slate-100">FinanzasIA</h1>
          <p className="text-sm text-slate-500 mt-1">Inicia sesión para continuar</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-sm p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Usuario</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKey}
              placeholder="tu usuario"
              autoComplete="username"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 transition-colors"
              />
              <button onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition-colors">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-rose-950/50 border border-rose-800/40 rounded-xl">
              <span className="text-rose-400 shrink-0">⚠</span>
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!username.trim() || !password || loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 mt-2">
            {loading ? <><span className="animate-spin inline-block">⟳</span> Ingresando…</> : "Ingresar →"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Sesión dura 8 horas · Solo tú y tu pareja tienen acceso
        </p>
      </div>
    </div>
  );
}

/* ── RATE LIMIT BADGE ────────────────────────────────────────────────── */
function RateLimitBadge() {
  const [status, setStatus] = useState(getRateLimitStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getRateLimitStatus()), 3000);
    return () => clearInterval(id);
  }, []);
  const pct = (status.used / status.max) * 100;
  const color = status.remaining === 0 ? "text-rose-400" : status.remaining <= 2 ? "text-amber-400" : "text-slate-500";
  return (
    <span className={`text-xs ${color} flex items-center gap-1`} title="Solicitudes IA restantes en este minuto">
      <span>⚡</span>
      <span>{status.remaining}/{status.max} restantes</span>
    </span>
  );
}

/* ── UPLOAD TAB ──────────────────────────────────────────────────────── */
function UploadTab({ salaries, onAnalysis, rawText, setRawText }) {
  const [fileName, setFileName] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState("");
  const [error,    setError]    = useState("");

  const handleFile = async (file) => {
    setError("");
    try { validateFile(file); } catch(e) { setError(e.message); return; }
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
      setProgress("Extrayendo texto del PDF…");
      try { const t = await extractPdfText(file); setRawText(sanitizeInput(t)); }
      catch (e) { setError("No se pudo leer el PDF: " + e.message); }
      setProgress("");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setRawText(sanitizeInput(e.target.result));
      reader.readAsText(file, "utf-8");
    }
  };

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setLoading(true); setError("");
    try {
      setProgress("Analizando con IA…");
      const result = await analyzeExpensesAI(rawText, salaries);
      onAnalysis(result, fileName || "Estado de cuenta");
    } catch (e) { setError("Error al analizar: " + e.message); }
    finally { setLoading(false); setProgress(""); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card>
        <h2 className="text-base font-semibold text-slate-200 mb-1">Subir Resumen Bancario</h2>
        <p className="text-xs text-slate-500 mb-4">Estado de cuenta del banco en <strong className="text-emerald-400">PDF</strong>, CSV o TXT</p>
        <DropZone onFile={handleFile} fileName={fileName} loading={loading} progress={progress}
          label="Arrastra tu archivo aquí o" sublabel="PDF · CSV · TXT" />
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest">Vista previa / Pegado manual</h3>
          {rawText && <button onClick={() => { setRawText(""); setFileName(""); }} className="text-xs text-slate-600 hover:text-slate-300 transition-colors">Limpiar</button>}
        </div>
        <textarea value={rawText} onChange={(e) => setRawText(e.target.value)}
          placeholder={"El texto del PDF aparecerá aquí.\nTambién puedes pegar el contenido manualmente.\n\nEjemplo:\n01/05  SUPERMERCADO LIDER   $45.990\n03/05  NETFLIX              $9.900"}
          className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 placeholder-slate-700 resize-none focus:outline-none focus:border-emerald-700 font-mono leading-relaxed" />
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button onClick={handleAnalyze} disabled={!rawText.trim() || loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2">
            {loading ? <><span className="animate-spin inline-block">⟳</span> {progress || "Analizando…"}</> : <>✦ Analizar con IA</>}
          </button>
          <RateLimitBadge/>
          {rawText && <span className="text-xs text-slate-600">{rawText.length.toLocaleString()} chars</span>}
        </div>
        {error && <p className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg px-4 py-2">{error}</p>}
      </Card>
      </div>
    </div>
  );
}

/* ── ANALYSIS TAB ────────────────────────────────────────────────────── */
function AnalysisTab({ analysis, budget, setBudget }) {
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

/* ── SALARY TAB ──────────────────────────────────────────────────────── */
function SalaryTab({ salaries, setSalaries }) {
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
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-1">
        <button onClick={()=>setMode("manual")}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==="manual"?"bg-slate-700 text-white":"text-slate-500 hover:text-slate-300"}`}>
          ✍️ Ingresar manualmente
        </button>
        <button onClick={()=>setMode("pdf")}
          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==="pdf"?"bg-slate-700 text-white":"text-slate-500 hover:text-slate-300"}`}>
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600">
                {MONTHS_ES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Año</label>
              <input type="number" value={year} onChange={(e)=>setYear(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">Monto líquido ($)</label>
            <input type="text" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ej: 1.500.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div className="mb-4">
            <label className="text-xs text-slate-500 mb-1 block">Nota (opcional)</label>
            <input type="text" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Ej: Incluye bono"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
          <button onClick={handleAdd} disabled={!amount}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all">
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
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
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
                <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest mb-0.5">Liquidación Detectada</p>
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
              <div className="bg-emerald-950/60 border border-emerald-800/40 rounded-xl p-3">
                <p className="text-xs text-emerald-500 mb-0.5">Líquido a Pagar</p>
                <p className="text-lg font-mono font-bold text-emerald-400">{fmt(payslip.liquidoPagar)}</p>
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
                  <div className="h-full bg-emerald-500 transition-all" style={{width:`${Math.round((payslip.liquidoPagar/payslip.totalHaberes)*100)}%`}}/>
                  <div className="h-full bg-rose-500 flex-1"/>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-emerald-400">{payslip.totalHaberes > 0 ? Math.round((payslip.liquidoPagar/payslip.totalHaberes)*100) : 0}% líquido</span>
                  <span className="text-rose-400">{payslip.totalHaberes > 0 ? Math.round((payslip.totalDescuentos/payslip.totalHaberes)*100) : 0}% descuentos</span>
                </div>
              </div>
            )}

            <button onClick={handleAddFromPayslip}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white transition-all">
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
          {salaries.length > 1 && (
            <Card>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-4">Evolución de Sueldos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{left:0,right:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="label" tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={(v)=>"$"+(v/1000000).toFixed(1)+"M"} tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false} width={55}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="sueldo" name="Sueldo" stroke="#34d399" strokeWidth={2} dot={{fill:"#34d399",r:4}} activeDot={{r:6}}/>
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
                    <span className="text-base font-mono font-bold text-emerald-400">{fmt(m.total)}</span>
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
                      <span className="text-sm font-mono text-emerald-400">{fmt(s.amount)}</span>
                      <button onClick={()=>setSalaries(prev => prev.filter((_,i) => i !== origIdx))}
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

/* ── AI: house projection ─────────────────────────────────────────────── */
async function projectHouseAI({ salaries, analysis, periods, creditos, ahorros, houseMonthly, currentRent, extraIncome }) {
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

/* ── PROJECTION TAB ──────────────────────────────────────────────────── */
function ProjectionTab({ salaries, analysis, periods, creditos, ahorros }) {
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
    green:  { bg:"bg-emerald-950/60", border:"border-emerald-700/50", text:"text-emerald-400", icon:"✅", label:"Viable — Situación cómoda" },
    yellow: { bg:"bg-amber-950/60",   border:"border-amber-700/50",   text:"text-amber-400",   icon:"⚠️", label:"Ajustado — Requiere recortes" },
    red:    { bg:"bg-rose-950/60",    border:"border-rose-700/50",    text:"text-rose-400",    icon:"❌", label:"Inviable — Presupuesto insuficiente" },
  };

  return (
    <div className="space-y-5">
      {/* ── Datos detectados ──────────────────────────────────────────── */}
      {hasData ? (
        <div className="grid grid-cols-2 gap-2">
          {latestSalary > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/50 border border-emerald-800/40 rounded-xl">
              <span className="text-base shrink-0">💰</span>
              <div>
                <p className="text-xs text-emerald-400 font-medium">Sueldo detectado</p>
                <p className="text-xs text-slate-300 font-mono">{fmt(latestSalary)}</p>
              </div>
            </div>
          )}
          {avgMonthlyExpenses > 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-950/50 border border-sky-800/40 rounded-xl">
              <span className="text-base shrink-0">📊</span>
              <div>
                <p className="text-xs text-sky-400 font-medium">Gastos bancarios{periodsWithData.length > 1 ? ` (${periodsWithData.length} meses)` : ""}</p>
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
                    <p className="text-sm font-mono font-bold text-emerald-400">+{fmt(c.cuota)}/mes</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-600 pt-1">
              Total a liberar: <span className="text-emerald-400 font-medium">{fmt(creditosProximos.reduce((s,c)=>s+c.cuota,0))}/mes</span> en los próximos 6 meses
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">
              Arriendo actual que dejarías de pagar
              <span className="text-slate-600 font-normal ml-1">(si aplica)</span>
            </label>
            <input type="text" value={currentRent} onChange={e=>setCurrentRent(e.target.value)}
              placeholder="Ej: 400.000  (dejar vacío si no arriendas)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-medium">
              Ingresos extra mensuales
              <span className="text-slate-600 font-normal ml-1">(freelance, arriendo, etc.)</span>
            </label>
            <input type="text" value={extraIncome} onChange={e=>setExtraIncome(e.target.value)}
              placeholder="Ej: 200.000  (dejar vacío si no tienes)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
        </div>

        <button onClick={handleProject} disabled={!houseMonthly || loading}
          className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
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
                    <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-400 rounded-full border border-emerald-800/40">✓ {keeps.length} ok</span>
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
                            <span className="text-emerald-700 text-xs shrink-0">✓</span>
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
                    <span className="text-emerald-500 font-bold text-sm shrink-0 font-mono">{i+1}.</span>
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



/* ── AI: multi-period analysis ────────────────────────────────────────── */
async function analyzeMultiPeriodsAI(periods, salaries) {
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

/* ══════════════════════════════════════════════════════════════════════
   MULTI-PERIOD ANALYSIS TAB
══════════════════════════════════════════════════════════════════════ */
function MultiAnalysisTab({ periods, salaries, onRemove }) {
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
              className="shrink-0 ml-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-2">
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
                    outerRadius={80} innerRadius={42} paddingAngle={2}
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
   EXPORT PDF BUTTON
══════════════════════════════════════════════════════════════════════ */
function ExportPDFButton({ analysis, periods, salaries, creditos, ahorros, budget }) {
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
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all">
      {loading ? <><span className="animate-spin inline-block">⟳</span> Generando…</> : <>📥 Exportar informe PDF</>}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [session,   setSession]  = useState(() => loadSession());
  const [tab,       setTab]      = useState("upload");
  const [salaries,  setSalaries] = useState([]);
  const [analysis,  setAnalysis] = useState(null);
  const [rawText,   setRawText]  = useState("");
  const [periods,   setPeriods]  = useState([]);
  const [creditos,  setCreditos] = useState([]);
  const [ahorros,   setAhorros]  = useState([]);
  const [budget,    setBudget]   = useState({});
  const [syncing,   setSyncing]  = useState(false);
  const [syncMsg,   setSyncMsg]  = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const showSync = (msg, ms=2000) => { setSyncMsg(msg); setTimeout(()=>setSyncMsg(""), ms); };

  // ── Offline cache helpers ─────────────────────────────────────────────────
  const cacheWrite = (key, value) => { try { localStorage.setItem(`finanzas_cache_${key}`, JSON.stringify(value)); } catch {} };
  const cacheRead  = key => { try { return JSON.parse(localStorage.getItem(`finanzas_cache_${key}`) || "null"); } catch { return null; } };

  const applyCloudData = (savedPeriods, savedSalaries, savedCreditos, savedAhorros) => {
    if (savedPeriods?.length)  {
      setPeriods(savedPeriods);
      const last = savedPeriods[savedPeriods.length - 1];
      if (last?.analysis) setAnalysis(last.analysis);
      cacheWrite("periods", savedPeriods);
    }
    if (savedSalaries?.length) { setSalaries(savedSalaries); cacheWrite("salaries", savedSalaries); }
    if (savedCreditos?.length) { setCreditos(savedCreditos); cacheWrite("creditos", savedCreditos); }
    if (savedAhorros?.length)  { setAhorros(savedAhorros);  cacheWrite("ahorros",  savedAhorros);  }
  };

  const loadOfflineCache = () => {
    const offPeriods  = cacheRead("periods");
    const offSalaries = cacheRead("salaries");
    const offCreditos = cacheRead("creditos");
    const offAhorros  = cacheRead("ahorros");
    const offBudget   = cacheRead("budget");
    if (offPeriods?.length)  { setPeriods(offPeriods); const last=offPeriods[offPeriods.length-1]; if(last?.analysis) setAnalysis(last.analysis); }
    if (offSalaries?.length) setSalaries(offSalaries);
    if (offCreditos?.length) setCreditos(offCreditos);
    if (offAhorros?.length)  setAhorros(offAhorros);
    if (offBudget && Object.keys(offBudget).length) setBudget(offBudget);
    return !!(offPeriods?.length || offSalaries?.length);
  };

  const handleLogin = (username, token) => {
    setSession({ username, token });
    if (token) {
      // Load offline cache immediately so data is visible while cloud loads
      loadOfflineCache();
      setSyncing(true);
      Promise.all([
        fetch(`/api/data?key=periods`,  { headers: { "x-session-token": token } }).then(r=>r.json()).then(d=>d.value),
        fetch(`/api/data?key=salaries`, { headers: { "x-session-token": token } }).then(r=>r.json()).then(d=>d.value),
        fetch(`/api/data?key=creditos`, { headers: { "x-session-token": token } }).then(r=>r.json()).then(d=>d.value),
        fetch(`/api/data?key=ahorros`,  { headers: { "x-session-token": token } }).then(r=>r.json()).then(d=>d.value),
        fetch(`/api/data?key=budget`,   { headers: { "x-session-token": token } }).then(r=>r.json()).then(d=>d.value),
      ]).then(([p, s, c, a, b]) => {
        setIsOffline(false);
        applyCloudData(p, s, c, a);
        if (b && Object.keys(b).length) { setBudget(b); cacheWrite("budget", b); }
        showSync("☁ Datos cargados");
      }).catch(e => { console.log("Login load error:", e); setIsOffline(true); showSync("📱 Modo offline"); })
        .finally(() => setSyncing(false));
    }
  };
  const handleLogout = () => { clearSession(); setSession(null); };

  // ── Load data on mount if already logged in ─────────────────────────────
  useEffect(() => {
    let tok = null;
    try { const raw = localStorage.getItem("finanzas_session"); if (raw) tok = JSON.parse(raw)?.token; } catch {}
    if (!tok) return;

    // 1. Load offline cache immediately (instant, no network needed)
    const hadOffline = loadOfflineCache();
    if (hadOffline) showSync("📱 Cargando…");

    // 2. Try cloud — overwrites offline data with fresher version if available
    setSyncing(true);
    Promise.all([
      fetch(`/api/data?key=periods`,  { headers: { "x-session-token": tok } }).then(r=>r.json()).then(d=>d.value),
      fetch(`/api/data?key=salaries`, { headers: { "x-session-token": tok } }).then(r=>r.json()).then(d=>d.value),
      fetch(`/api/data?key=creditos`, { headers: { "x-session-token": tok } }).then(r=>r.json()).then(d=>d.value),
      fetch(`/api/data?key=ahorros`,  { headers: { "x-session-token": tok } }).then(r=>r.json()).then(d=>d.value),
      fetch(`/api/data?key=budget`,   { headers: { "x-session-token": tok } }).then(r=>r.json()).then(d=>d.value),
    ]).then(([p, s, c, a, b]) => {
      setIsOffline(false);
      applyCloudData(p, s, c, a);
      if (b && Object.keys(b).length) { setBudget(b); cacheWrite("budget", b); }
      showSync("☁ Datos cargados");
    }).catch(e => {
      console.log("Mount load error:", e);
      setIsOffline(true);
      if (hadOffline) showSync("📱 Modo offline");
    }).finally(() => setSyncing(false));
  }, []); // run once on mount

  // ── Auto-save periods ─────────────────────────────────────────────────────
  useEffect(() => {
    if (periods.length === 0) return;
    cacheWrite("periods", periods);                             // offline mirror — always
    if (!session?.token) return;
    const timer = setTimeout(async () => {
      try { await savePeriods(periods, session.token); showSync("☁ Guardado"); }
      catch(e) { console.log("Save periods error:", e); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [periods]);

  // ── Auto-save salaries ────────────────────────────────────────────────────
  useEffect(() => {
    if (salaries.length === 0) return;
    cacheWrite("salaries", salaries);
    if (!session?.token) return;
    const timer = setTimeout(async () => {
      try { await saveSalaries(salaries, session.token); } catch(e) { console.log("Save salaries error:", e); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [salaries]);

  // ── Auto-save creditos ────────────────────────────────────────────────────
  useEffect(() => {
    if (creditos.length === 0) return;
    cacheWrite("creditos", creditos);
    if (!session?.token) return;
    const tok = session.token;
    const timer = setTimeout(() => {
      fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json","x-session-token":tok}, body: JSON.stringify({key:"creditos",value:creditos}) });
    }, 1500);
    return () => clearTimeout(timer);
  }, [creditos, session?.token]);

  // ── Auto-save ahorros ─────────────────────────────────────────────────────
  useEffect(() => {
    if (ahorros.length === 0) return;
    cacheWrite("ahorros", ahorros);
    if (!session?.token) return;
    const tok = session.token;
    const timer = setTimeout(() => {
      fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json","x-session-token":tok}, body: JSON.stringify({key:"ahorros",value:ahorros}) });
    }, 1500);
    return () => clearTimeout(timer);
  }, [ahorros, session?.token]);

  // ── Auto-save budget ──────────────────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(budget).length === 0) return;
    cacheWrite("budget", budget);
    if (!session?.token) return;
    const tok = session.token;
    const timer = setTimeout(() => {
      fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json","x-session-token":tok}, body: JSON.stringify({key:"budget",value:budget}) });
    }, 1500);
    return () => clearTimeout(timer);
  }, [budget, session?.token]);

  const handleAnalysis = (result, fileName) => {
    setAnalysis(result);
    const label = fileName
      ? fileName.replace(/\.pdf$/i,"").replace(/[-_]/g," ")
      : `Período ${periods.length + 1}`;
    setPeriods(prev => [...prev, { label, analysis: result, addedAt: Date.now() }]);
    setTab("analysis");
  };
  const handleRemovePeriod = (idx) => setPeriods(prev => prev.filter((_,i) => i !== idx));

  // If session expired mid-use, show login again
  useEffect(() => {
    const id = setInterval(() => {
      if (!loadSession()) setSession(null);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Demo mode: skip login entirely
  if (DEMO_MODE && !session) {
    // Auto-create a fake session so the app loads directly
    if (typeof window !== "undefined" && !session) {
      setTimeout(() => setSession({ username: "demo" }), 0);
    }
    return null;
  }
  if (!session) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id:"upload",     label:"📄 Gastos" },
    { id:"analysis",   label:"📊 Análisis" },
    { id:"multi",      label:`📅 Períodos${periods.length>0?" ("+periods.length+")":""}` },
    { id:"salary",     label:"💰 Sueldos" },
    { id:"creditos",   label:"💳 Créditos" },
    { id:"ahorros",    label:"🎯 Ahorros" },
    { id:"projection", label:"🏠 Casa" },
  ];

  return (
    <div className="min-h-screen text-white"
      style={{
        background:"radial-gradient(ellipse 80% 60% at 50% -10%, #0d2e1f 0%, #0a0f1a 60%, #060810 100%)",
        fontFamily:"'DM Sans', system-ui, sans-serif",
      }}
    >
      <div className="px-6 pt-8 pb-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-emerald-900/50">💳</div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 leading-none">FinanzasIA</h1>
              <p className="text-xs text-slate-500 mt-0.5">Análisis inteligente de gastos</p>
              {DEMO_MODE && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">MODO DEMO</span>}
            </div>
          </div>
          {/* User + logout */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">👤 {session.username}</span>
            <button onClick={handleLogout}
              className="text-xs text-slate-600 hover:text-slate-300 border border-slate-700 hover:border-slate-500 px-2.5 py-1 rounded-lg transition-all">
              Salir
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap items-center">
          {syncing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/60 border border-slate-700/40 rounded-full text-xs text-slate-400">
              <span className="animate-spin inline-block">⟳</span> Sincronizando…
            </span>
          )}
          {syncMsg && !syncing && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800/40 border border-slate-700/30 rounded-full text-xs text-emerald-500">
              {syncMsg}
            </span>
          )}
          {isOffline && !syncing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/40 rounded-full text-xs text-amber-400" title="Sin conexión — mostrando datos guardados localmente">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"/>
              📱 Offline
            </span>
          )}
          <ExportPDFButton analysis={analysis} periods={periods} salaries={salaries} creditos={creditos} ahorros={ahorros} budget={budget}/>
          {analysis && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/40 rounded-full text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>
              Análisis completado · {analysis.expenses?.length} transacciones
            </div>
          )}
          {periods.length > 1 && (
            <button onClick={()=>setTab("multi")}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-950/60 border border-sky-800/40 rounded-full text-xs text-sky-400 hover:bg-sky-900/40 transition-all">
              📅 {periods.length} períodos cargados — ver comparativa
            </button>
          )}
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-7 gap-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-1 mb-5">
          {tabs.map((t)=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`py-2 px-1 rounded-xl text-xs font-medium transition-all text-center ${tab===t.id?"bg-emerald-700 text-white shadow":"text-slate-500 hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="pb-12">
          {tab==="upload"     && <UploadTab salaries={salaries} onAnalysis={handleAnalysis} rawText={rawText} setRawText={setRawText}/>}
          {tab==="analysis"   && <AnalysisTab analysis={analysis} budget={budget} setBudget={setBudget}/>}
          {tab==="multi"      && <MultiAnalysisTab periods={periods} salaries={salaries} onRemove={handleRemovePeriod}/>}
          {tab==="salary"     && <SalaryTab salaries={salaries} setSalaries={setSalaries}/>}
          {tab==="creditos"   && <CreditosTab creditos={creditos} setCreditos={setCreditos}/>}
          {tab==="ahorros"    && <AhorrosTab ahorros={ahorros} setAhorros={setAhorros}/>}
          {tab==="projection" && <ProjectionTab salaries={salaries} analysis={analysis} periods={periods} creditos={creditos} ahorros={ahorros}/>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CRÉDITOS TAB
══════════════════════════════════════════════════════════════════════ */
function CreditosTab({ creditos, setCreditos }) {
  const now = new Date();
  const [nombre,    setNombre]    = useState("");
  const [montoTotal,setMontoTotal]= useState("");
  const [cuota,     setCuota]     = useState("");
  const [mesesTotal,setMesesTotal]= useState("");
  const [mesesPagados,setMesesPagados] = useState("");
  const [tasa,      setTasa]      = useState("");
  const [tipo,      setTipo]      = useState("Consumo");
  const [editing,   setEditing]   = useState(null);

  const tipoOpts = ["Consumo","Hipotecario","Auto","Tarjeta","Educación","Otro"];

  const handleAdd = () => {
    const obj = {
      id: Date.now(),
      nombre: nombre.trim(),
      montoTotal: parseFloat(String(montoTotal).replace(/\./g,"").replace(",",".")) || 0,
      cuota:      parseFloat(String(cuota).replace(/\./g,"").replace(",",".")) || 0,
      mesesTotal: parseInt(mesesTotal) || 0,
      mesesPagados: parseInt(mesesPagados) || 0,
      tasa:       parseFloat(String(tasa).replace(",",".")) || 0,
      tipo,
    };
    if (!obj.nombre || !obj.cuota) return;
    setCreditos(prev => editing !== null
      ? prev.map(c => c.id === editing ? obj : c)
      : [...prev, obj]
    );
    setNombre(""); setMontoTotal(""); setCuota(""); setMesesTotal("");
    setMesesPagados(""); setTasa(""); setTipo("Consumo"); setEditing(null);
  };

  const handleEdit = (c) => {
    setNombre(c.nombre); setMontoTotal(String(c.montoTotal));
    setCuota(String(c.cuota)); setMesesTotal(String(c.mesesTotal));
    setMesesPagados(String(c.mesesPagados)); setTasa(String(c.tasa));
    setTipo(c.tipo); setEditing(c.id);
  };

  const totalDeuda    = creditos.reduce((a,c) => a + (c.cuota * (c.mesesTotal - c.mesesPagados)), 0);
  const totalMensual  = creditos.reduce((a,c) => a + c.cuota, 0);

  return (
    <div className="space-y-5">
      {/* Form */}
      <Card>
        <h2 className="text-base font-semibold text-slate-200 mb-4">
          {editing !== null ? "✏️ Editar Crédito" : "➕ Agregar Crédito / Deuda"}
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Nombre del crédito</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Crédito auto BCI"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600">
              {tipoOpts.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tasa interés anual (%)</label>
            <input value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="Ej: 12.5"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Monto total del crédito ($)</label>
            <input value={montoTotal} onChange={e=>setMontoTotal(e.target.value)} placeholder="Ej: 5.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Cuota mensual ($)</label>
            <input value={cuota} onChange={e=>setCuota(e.target.value)} placeholder="Ej: 150.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Total de cuotas</label>
            <input type="number" value={mesesTotal} onChange={e=>setMesesTotal(e.target.value)} placeholder="Ej: 48"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Cuotas ya pagadas</label>
            <input type="number" value={mesesPagados} onChange={e=>setMesesPagados(e.target.value)} placeholder="Ej: 12"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdd} disabled={!nombre||!cuota}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-sm font-semibold text-white transition-all">
            {editing !== null ? "Guardar cambios" : "+ Agregar"}
          </button>
          {editing !== null && (
            <button onClick={()=>{setEditing(null);setNombre("");setCuota("");setMesesTotal("");setMesesPagados("");setMontoTotal("");setTasa("");}}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm text-slate-300 transition-all">
              Cancelar
            </button>
          )}
        </div>
      </Card>

      {/* KPIs */}
      {creditos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Deuda total restante" value={fmt(totalDeuda)}   accent="rose"/>
          <KpiCard label="Pago mensual total"   value={fmt(totalMensual)} accent="amber"/>
        </div>
      )}

      {/* Credit list */}
      {creditos.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-slate-500 text-sm">No hay créditos registrados</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {creditos.map(c => {
            const restantes  = Math.max(0, c.mesesTotal - c.mesesPagados);
            const deudaRest  = c.cuota * restantes;
            const pct        = c.mesesTotal > 0 ? Math.round((c.mesesPagados / c.mesesTotal) * 100) : 0;
            const mesesFin   = new Date(); mesesFin.setMonth(mesesFin.getMonth() + restantes);
            const colorBar   = pct >= 75 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#f87171";
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{c.nombre}</p>
                    <p className="text-xs text-slate-500">{c.tipo}{c.tasa > 0 ? ` · ${c.tasa}% anual` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>handleEdit(c)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✏️</button>
                    <button onClick={()=>setCreditos(prev=>prev.filter(x=>x.id!==c.id))} className="text-xs text-slate-500 hover:text-rose-400 transition-colors">✕</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-slate-800/60 rounded-xl p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Cuota</p>
                    <p className="text-sm font-mono font-bold text-slate-200">{fmt(c.cuota)}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Restante</p>
                    <p className="text-sm font-mono font-bold text-rose-400">{fmt(deudaRest)}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-2">
                    <p className="text-xs text-slate-500 mb-0.5">Término</p>
                    <p className="text-sm font-bold text-slate-200">{restantes > 0 ? `${MONTHS_ES[mesesFin.getMonth()].slice(0,3)} ${mesesFin.getFullYear()}` : "✅ Pagado"}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{c.mesesPagados} de {c.mesesTotal} cuotas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: colorBar}}/>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── AHORRO CARD (componente separado para evitar useState en .map()) ── */
function AhorroCard({ a, onAbonar, onEdit, onDelete }) {
  const [abonando, setAbonando] = useState(false);
  const [abonoVal, setAbonoVal] = useState("");

  const pct      = a.objetivo > 0 ? Math.min(100, Math.round((a.actual / a.objetivo) * 100)) : 0;
  const falta    = Math.max(0, a.objetivo - a.actual);
  const mesesFin = a.aporte > 0 ? Math.ceil(falta / a.aporte) : null;
  const colorBar = pct >= 100 ? "#34d399" : pct >= 60 ? "#4ade80" : pct >= 30 ? "#fbbf24" : "#f87171";

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{a.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-slate-200">{a.nombre}</p>
            {a.fechaMeta && <p className="text-xs text-slate-500">Meta: {new Date(a.fechaMeta).toLocaleDateString("es-CL")}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(a)} className="text-xs text-slate-500 hover:text-slate-300">✏️</button>
          <button onClick={() => onDelete(a.id)} className="text-xs text-slate-500 hover:text-rose-400">✕</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-slate-800/60 rounded-xl p-2">
          <p className="text-xs text-slate-500 mb-0.5">Ahorrado</p>
          <p className="text-sm font-mono font-bold text-emerald-400">{fmt(a.actual)}</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2">
          <p className="text-xs text-slate-500 mb-0.5">Objetivo</p>
          <p className="text-sm font-mono font-bold text-slate-200">{fmt(a.objetivo)}</p>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-2">
          <p className="text-xs text-slate-500 mb-0.5">Faltan</p>
          <p className="text-sm font-mono font-bold text-amber-400">{fmt(falta)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{pct}% completado</span>
          {mesesFin !== null && falta > 0 && <span>~{mesesFin} meses restantes</span>}
          {pct >= 100 && <span className="text-emerald-400">✅ Meta alcanzada</span>}
        </div>
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colorBar }}/>
        </div>
      </div>

      {/* ── Proyección de ahorro ──────────────────────────────────────── */}
      {pct < 100 && mesesFin !== null && (() => {
        const hoy        = new Date();
        const estimada   = new Date(hoy.getFullYear(), hoy.getMonth() + mesesFin, hoy.getDate());
        const hasMeta    = !!a.fechaMeta;
        const metaDate   = hasMeta ? new Date(a.fechaMeta) : null;
        const onTrack    = hasMeta ? estimada <= metaDate : true;
        const mesesMeta  = hasMeta ? Math.round((metaDate - hoy) / (30.44 * 24 * 3600 * 1000)) : null;
        const diffMeses  = hasMeta ? Math.abs(mesesFin - mesesMeta) : null;

        // Mini timeline: posición actual como % entre hoy y estimada
        const totalSpan  = hasMeta ? Math.max(mesesFin, mesesMeta) : mesesFin;
        const pctEstimada = hasMeta ? Math.round((mesesFin / totalSpan) * 100) : 100;
        const pctMeta     = hasMeta ? Math.round((mesesMeta / totalSpan) * 100) : 100;

        return (
          <div className="mb-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Proyección</p>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Fecha estimada</p>
                <p className="text-sm font-medium text-slate-200">
                  {estimada.toLocaleDateString("es-CL", { month: "short", year: "numeric" })}
                </p>
              </div>
              {hasMeta && (
                <div className="text-right">
                  <p className={`text-xs font-semibold ${onTrack ? "text-emerald-400" : "text-rose-400"}`}>
                    {onTrack ? "✅ En camino" : "⚠️ Retrasado"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {onTrack
                      ? `${diffMeses} mes${diffMeses !== 1 ? "es" : ""} antes de la meta`
                      : `${diffMeses} mes${diffMeses !== 1 ? "es" : ""} después de la meta`}
                  </p>
                </div>
              )}
            </div>
            {/* Timeline visual */}
            <div className="relative h-2 bg-slate-700 rounded-full overflow-visible">
              <div className="absolute inset-y-0 left-0 bg-emerald-600/40 rounded-full" style={{ width: `${Math.min(100, pctEstimada)}%` }}/>
              {/* Marcador fecha estimada */}
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 z-10"
                style={{ left: `calc(${Math.min(98, pctEstimada)}% - 6px)` }}
                title={`Estimada: ${estimada.toLocaleDateString("es-CL")}`}/>
              {/* Marcador fecha meta */}
              {hasMeta && (
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-900 z-10"
                  style={{ left: `calc(${Math.min(98, pctMeta)}% - 6px)` }}
                  title={`Meta: ${metaDate.toLocaleDateString("es-CL")}`}/>
              )}
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1.5">
              <span>Hoy</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Estimado</span>
                {hasMeta && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Meta</span>}
              </div>
            </div>
            {a.aporte > 0 && (
              <p className="text-xs text-slate-600 mt-1.5">
                Aportando <span className="text-slate-400">{fmt(a.aporte)}/mes</span> · Faltan <span className="text-slate-400">{fmt(falta)}</span>
              </p>
            )}
          </div>
        );
      })()}

      {pct < 100 && (
        abonando ? (
          <div className="flex gap-2">
            <input value={abonoVal} onChange={e => setAbonoVal(e.target.value)} placeholder="Monto a abonar"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
            <button onClick={() => {
              const v = parseFloat(String(abonoVal).replace(/\./g, "").replace(",", "."));
              if (v > 0) { onAbonar(a.id, v); setAbonoVal(""); setAbonando(false); }
            }} className="px-3 py-1.5 bg-emerald-600 rounded-xl text-xs text-white font-medium">✓</button>
            <button onClick={() => setAbonando(false)} className="px-3 py-1.5 bg-slate-700 rounded-xl text-xs text-slate-300">✕</button>
          </div>
        ) : (
          <button onClick={() => setAbonando(true)}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-all">
            + Registrar abono
          </button>
        )
      )}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   AHORROS TAB
══════════════════════════════════════════════════════════════════════ */
function AhorrosTab({ ahorros, setAhorros }) {
  const [nombre,    setNombre]    = useState("");
  const [objetivo,  setObjetivo]  = useState("");
  const [actual,    setActual]    = useState("");
  const [aporte,    setAporte]    = useState("");
  const [fechaMeta, setFechaMeta] = useState("");
  const [emoji,     setEmoji]     = useState("🏠");
  const [editing,   setEditing]   = useState(null);

  const emojiOpts = ["🏠","🚗","✈️","🎓","👶","💍","💻","🏖️","🏥","📦","💰","🎯"];

  const handleAdd = () => {
    const obj = {
      id: Date.now(),
      nombre: nombre.trim(),
      objetivo: parseFloat(String(objetivo).replace(/\./g,"").replace(",",".")) || 0,
      actual:   parseFloat(String(actual).replace(/\./g,"").replace(",",".")) || 0,
      aporte:   parseFloat(String(aporte).replace(/\./g,"").replace(",",".")) || 0,
      fechaMeta,
      emoji,
    };
    if (!obj.nombre || !obj.objetivo) return;
    setAhorros(prev => editing !== null
      ? prev.map(a => a.id === editing ? obj : a)
      : [...prev, obj]
    );
    setNombre(""); setObjetivo(""); setActual(""); setAporte(""); setFechaMeta(""); setEmoji("🏠"); setEditing(null);
  };

  const handleAbonar = (id, extra) => {
    setAhorros(prev => prev.map(a => a.id === id ? {...a, actual: a.actual + extra} : a));
  };

  const handleEdit = (a) => {
    setNombre(a.nombre); setObjetivo(String(a.objetivo)); setActual(String(a.actual));
    setAporte(String(a.aporte)); setFechaMeta(a.fechaMeta||""); setEmoji(a.emoji||"🎯"); setEditing(a.id);
  };

  const totalAhorrado = ahorros.reduce((s,a)=>s+a.actual,0);
  const totalObjetivo = ahorros.reduce((s,a)=>s+a.objetivo,0);

  return (
    <div className="space-y-5">
      {/* Form */}
      <Card>
        <h2 className="text-base font-semibold text-slate-200 mb-4">
          {editing !== null ? "✏️ Editar Meta" : "➕ Nueva Meta de Ahorro"}
        </h2>
        {/* Emoji picker */}
        <div className="mb-3">
          <label className="text-xs text-slate-400 mb-1 block">Ícono</label>
          <div className="flex flex-wrap gap-2">
            {emojiOpts.map(e=>(
              <button key={e} onClick={()=>setEmoji(e)}
                className={`w-9 h-9 rounded-xl text-lg transition-all ${emoji===e?"bg-emerald-600":"bg-slate-800 hover:bg-slate-700"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Nombre de la meta</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Pie para la casa"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Monto objetivo ($)</label>
            <input value={objetivo} onChange={e=>setObjetivo(e.target.value)} placeholder="Ej: 10.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ya ahorrado ($)</label>
            <input value={actual} onChange={e=>setActual(e.target.value)} placeholder="Ej: 2.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Aporte mensual ($)</label>
            <input value={aporte} onChange={e=>setAporte(e.target.value)} placeholder="Ej: 300.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fecha límite (opcional)</label>
            <input type="date" value={fechaMeta} onChange={e=>setFechaMeta(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"/>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdd} disabled={!nombre||!objetivo}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-sm font-semibold text-white transition-all">
            {editing !== null ? "Guardar cambios" : "+ Agregar meta"}
          </button>
          {editing !== null && (
            <button onClick={()=>{setEditing(null);setNombre("");setObjetivo("");setActual("");setAporte("");setFechaMeta("");setEmoji("🏠");}}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm text-slate-300 transition-all">
              Cancelar
            </button>
          )}
        </div>
      </Card>

      {/* KPIs */}
      {ahorros.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Total ahorrado"  value={fmt(totalAhorrado)} accent="emerald"/>
          <KpiCard label="Total objetivo"  value={fmt(totalObjetivo)} accent="sky"/>
        </div>
      )}

      {/* Goals list */}
      {ahorros.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-slate-500 text-sm">No hay metas de ahorro registradas</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ahorros.map(a => (
            <AhorroCard
              key={a.id}
              a={a}
              onAbonar={handleAbonar}
              onEdit={handleEdit}
              onDelete={id => setAhorros(prev => prev.filter(x => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
