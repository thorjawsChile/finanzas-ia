/* ══════════════════════════════════════════════════════════════════════
   MODO DEMO — se activa cuando VITE_DEMO_MODE=true en .env
   Usa datos de ejemplo sin necesitar API key de Anthropic.
══════════════════════════════════════════════════════════════════════ */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const DEMO_EXPENSES_RESULT = {
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

export const DEMO_PAYSLIP_RESULT = {
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

export const DEMO_PROJECTION_RESULT = {
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

/* ── palette & helpers ─────────────────────────────────────────────────── */
export const CAT_COLORS = {
  "Alimentación":    "#7c3aed",
  "Transporte":      "#06b6d4",
  "Entretenimiento": "#f59e0b",
  "Salud":           "#10b981",
  "Ropa/Calzado":    "#a78bfa",
  "Hogar":           "#22d3ee",
  "Tecnología":      "#fbbf24",
  "Viajes":          "#34d399",
  "Servicios":       "#8b5cf6",
  "Educación":       "#0891b2",
  "Otros":           "#64748b",
};
export const PALETTE = ["#7c3aed","#06b6d4","#f59e0b","#10b981","#a78bfa","#22d3ee","#fbbf24","#34d399","#8b5cf6","#0891b2","#64748b"];
export const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
export const fmt = (n) => isNaN(n) ? "$0" : "$" + Math.round(Number(n)).toLocaleString("es-CL");

export async function demoDelay(ms = 1800) {
  return new Promise(r => setTimeout(r, ms));
}

// Normalize periodoMes to "MM/YYYY" — accepts "M/YYYY" or "MM/YYYY"
export function normalizePM(pm) {
  if (!pm) return null;
  const m = String(pm).match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return m[1].padStart(2, "0") + "/" + m[2];
}
