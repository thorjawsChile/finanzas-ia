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
  const salaryCtx = salaries.length > 0
    ? `Sueldos registrados: ${salaries.map((s) => `${MONTHS_ES[s.month-1]} ${s.year}: ${fmt(s.amount)}`).join(", ")}.`
    : "No hay sueldos registrados.";

  const prompt = `Eres un experto en análisis de estados de cuenta de tarjeta de crédito Santander Chile. Tu tarea es extraer TODAS las transacciones y calcular el total correcto de gastos del período.

${salaryCtx}

Texto extraído del estado de cuenta Santander:
---
${rawText.slice(0, 10000)}
---

ESTRUCTURA DEL ESTADO DE CUENTA SANTANDER — debes entenderla bien:

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
{"expenses":[{"desc":"","amount":0,"category":""}],"totalExpenses":0,"summary":"","topCategories":[{"name":"","total":0}],"recommendations":["","",""],"salaryRatio":null}`;

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
  const prompt = `Eres un experto en liquidaciones de sueldo chilenas. Extrae toda la información de esta liquidación de sueldo.

Texto extraído:
---
${rawText.slice(0, 6000)}
---

Extrae:
1. Nombre del trabajador (workerName)
2. Nombre empresa (companyName)
3. Mes y año de la liquidación (month: 1-12, year: YYYY)
4. Sueldo base (sueldoBase)
5. Lista de haberes/ingresos: cada uno con nombre y monto (haberes: [{name, amount}])
6. Lista de descuentos: cada uno con nombre y monto (descuentos: [{name, amount}])
7. Total haberes (totalHaberes)
8. Total descuentos (totalDescuentos)
9. Sueldo líquido / alcance líquido (liquidoPagar) — el monto final que se paga al trabajador
10. AFP si aparece (afp)
11. Salud/Isapre si aparece (salud)

Solo JSON válido, sin markdown:
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
      onLogin(data.username);
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
function AnalysisTab({ analysis }) {
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
    setSalaries((prev) => {
      const filtered = prev.filter((s)=>!(s.month===month&&s.year===year));
      return [...filtered, {month,year,amount:val,note}].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month);
    });
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
    setSalaries((prev)=>{
      const filtered = prev.filter((s)=>!(s.month===payslip.month&&s.year===payslip.year));
      return [...filtered, {
        month: payslip.month,
        year: payslip.year,
        amount: payslip.liquidoPagar,
        note: `Liquidación ${payslip.companyName||""}`.trim(),
        payslip: payslip,
      }].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month);
    });
    setPayslip(null); setPdfFile(null);
  };

  const chartData = salaries.map((s)=>({ label:`${MONTHS_ES[s.month-1].slice(0,3)} ${s.year}`, sueldo:s.amount }));
  const avgSalary    = salaries.length>0 ? salaries.reduce((a,s)=>a+s.amount,0)/salaries.length : 0;
  const latestSalary = salaries.length>0 ? salaries[salaries.length-1].amount : 0;

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
          <Card>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">Historial</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {[...salaries].reverse().map((s,i)=>(
                <div key={i} className="py-2 border-b border-slate-800/60 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-sm text-slate-200">{MONTHS_ES[s.month-1]} {s.year}</span>
                      {s.note && <span className="ml-2 text-xs text-slate-500">· {s.note}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-emerald-400">{fmt(s.amount)}</span>
                      <button onClick={()=>setSalaries((prev)=>prev.filter((x)=>!(x.month===s.month&&x.year===s.year)))}
                        className="text-slate-700 hover:text-rose-400 transition-colors text-xs">✕</button>
                    </div>
                  </div>
                  {/* Show payslip summary if available */}
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
async function projectHouseAI({ salaries, analysis, houseMonthly, currentRent, extraIncome }) {
  if (DEMO_MODE) { await demoDelay(2500); return DEMO_PROJECTION_RESULT; }
  const avgSalary = salaries.length > 0
    ? salaries.reduce((a,s)=>a+s.amount,0)/salaries.length : 0;
  const latestSalary = salaries.length > 0 ? salaries[salaries.length-1].amount : 0;

  const transactionList = analysis?.expenses?.length > 0
    ? `Transacciones reales del período (analiza CADA una):
${analysis.expenses.map((e,i)=>`${i+1}. ${e.desc} | ${fmt(e.amount)} | ${e.category}`).join("\n")}`
    : "No hay transacciones cargadas.";

  const salaryInfo = salaries.length > 0
    ? `Sueldo líquido: ${fmt(latestSalary)} | Promedio: ${fmt(avgSalary)}`
    : "No hay sueldos registrados.";

  const extraInfo = extraIncome > 0 ? `Ingresos extra: ${fmt(extraIncome)}/mes` : "";
  const rentInfo  = currentRent  > 0 ? `Arriendo actual que dejarías de pagar: ${fmt(currentRent)}` : "";
  const expenseCtx = analysis ? `Total gastos analizados: ${fmt(analysis.totalExpenses)}` : "";

  const prompt = `Eres un asesor financiero personal directo y sin rodeos. Analiza si esta persona puede comprar una casa basándote en sus gastos REALES.

INGRESOS:
${salaryInfo}
${extraInfo}

GASTOS ACTUALES:
${expenseCtx}
${rentInfo}

NUEVA CASA - Costo mensual: ${fmt(houseMonthly)}

${transactionList}

INSTRUCCIONES ESTRICTAS:
1. Ingreso total = sueldo líquido + extras.
2. Impacto neto = costo casa - arriendo actual (si aplica, si no arriendo el impacto es el costo total de la casa).
3. Disponible con casa = ingreso total - costo casa - (gastos actuales - arriendo actual si aplica).
4. Semáforo: "green" si disponible >15% del ingreso, "yellow" si 0-15%, "red" si negativo.
5. Clasifica CADA transacción real:
   - "cut": eliminar completamente (suscripciones innecesarias, delivery excesivo, lujos, duplicados)
   - "reduce": necesario pero se puede bajar (restaurantes, entretenimiento, compras de ropa)
   - "keep": esencial, no tocar (salud, supermercado básico, transporte trabajo, servicios básicos)
   savedAmount: monto completo si "cut", monto de reducción si "reduce", 0 si "keep".
   reason: frase directa explicando por qué (ej: "Delivery 3 veces por semana es prescindible con casa propia")
6. totalPotentialSaving: suma de todos los savedAmount.
7. Presupuesto proyectado ajustado (budget) con la casa incluida y gastos recortados.
8. 4 recomendaciones personalizadas y directas basadas en los gastos reales vistos.
9. Resumen ejecutivo 3-4 oraciones siendo directo sobre la situación.
10. extraNeeded: 0 si alcanza, si no cuánto falta.

Solo JSON sin markdown:
{
  "viable": true,
  "viabilityStatus": "green",
  "summary": "",
  "totalIncome": 0,
  "houseImpact": 0,
  "disponibleConCasa": 0,
  "extraNeeded": 0,
  "totalPotentialSaving": 0,
  "transactions": [{"desc":"","amount":0,"category":"","action":"cut","reason":"","savedAmount":0}],
  "savingsOpportunities": [{"category":"","currentAmount":0,"suggestedAmount":0,"saving":0}],
  "budget": [{"category":"","amount":0}],
  "recommendations": ["","","",""]
}`;

  const data = await secureAnthropicFetch({
    model: "claude-sonnet-4-5", max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = (data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  return JSON.parse(text);
}

/* ── PROJECTION TAB ──────────────────────────────────────────────────── */
function ProjectionTab({ salaries, analysis }) {
  const [houseMonthly, setHouseMonthly] = useState("");
  const [currentRent,  setCurrentRent]  = useState("");
  const [extraIncome,  setExtraIncome]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [result,   setResult]   = useState(null);

  const hasData = salaries.length > 0 || analysis;

  const handleProject = async () => {
    const monthly = parseFloat(String(houseMonthly).replace(/\./g,"").replace(",","."));
    if (!monthly || monthly <= 0) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await projectHouseAI({
        salaries, analysis,
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
      {/* Context warning if no data */}
      {!hasData && (
        <div className="flex gap-3 p-4 bg-amber-950/40 border border-amber-800/40 rounded-2xl">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-xs text-amber-300 leading-relaxed">
            Para una proyección más precisa, carga tu <strong>análisis de gastos</strong> y registra tus <strong>sueldos</strong> primero. Aun así puedes hacer una proyección básica.
          </p>
        </div>
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


/* ══════════════════════════════════════════════════════════════════════
   MULTI-PERIOD ANALYSIS TAB
══════════════════════════════════════════════════════════════════════ */
function MultiAnalysisTab({ periods, onRemove }) {
  const [view, setView] = useState("combined"); // "combined" | "compare"

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
    </div>
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
  const [syncing,   setSyncing]  = useState(false);
  const [syncMsg,   setSyncMsg]  = useState("");

  const showSync = (msg, ms=2000) => { setSyncMsg(msg); setTimeout(()=>setSyncMsg(""), ms); };

  const handleLogin  = (username) => setSession({ username });
  const handleLogout = () => { clearSession(); setSession(null); };

  // ── Load data from cloud on login ─────────────────────────────────────────
  useEffect(() => {
    if (!session?.token) return;
    setSyncing(true);
    Promise.all([
      loadPeriods(session.token),
      loadSalaries(session.token),
    ]).then(([savedPeriods, savedSalaries]) => {
      if (savedPeriods?.length)  { setPeriods(savedPeriods);  showSync(`☁ ${savedPeriods.length} período(s) cargados`); }
      if (savedSalaries?.length) { setSalaries(savedSalaries); }
    }).catch(()=>{}).finally(()=>setSyncing(false));
  }, [session?.token]);

  // ── Auto-save periods to cloud when they change ───────────────────────────
  useEffect(() => {
    if (!session?.token || periods.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await savePeriods(periods, session.token);
        showSync("☁ Guardado");
      } catch {}
    }, 1000); // debounce 1s
    return () => clearTimeout(timer);
  }, [periods, session?.token]);

  // ── Auto-save salaries to cloud when they change ──────────────────────────
  useEffect(() => {
    if (!session?.token || salaries.length === 0) return;
    const timer = setTimeout(async () => {
      try { await saveSalaries(salaries, session.token); } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [salaries, session?.token]);

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
        <div className="grid grid-cols-5 gap-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-1 mb-5">
          {tabs.map((t)=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`py-2 px-1 rounded-xl text-xs font-medium transition-all text-center ${tab===t.id?"bg-emerald-700 text-white shadow":"text-slate-500 hover:text-slate-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="pb-12">
          {tab==="upload"     && <UploadTab salaries={salaries} onAnalysis={handleAnalysis} rawText={rawText} setRawText={setRawText}/>}
          {tab==="analysis"   && <AnalysisTab analysis={analysis}/>}
          {tab==="multi"      && <MultiAnalysisTab periods={periods} onRemove={handleRemovePeriod}/>}
          {tab==="salary"     && <SalaryTab salaries={salaries} setSalaries={setSalaries}/>}
          {tab==="projection" && <ProjectionTab salaries={salaries} analysis={analysis}/>}
        </div>
      </div>
    </div>
  );
}
