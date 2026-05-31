import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { AppContext } from "./AppContext.jsx";
import { loadSession, clearSession, savePeriods, saveSalaries } from "./security.js";
import { DEMO_MODE, MONTHS_ES } from "./constants.js";
import LoginScreen from "./components/LoginScreen.jsx";
import ExportPDFButton from "./components/ExportPDFButton.jsx";
const UploadTab      = lazy(() => import("./tabs/UploadTab.jsx"));
const AnalysisTab    = lazy(() => import("./tabs/AnalysisTab.jsx"));
const MultiAnalysisTab = lazy(() => import("./tabs/MultiAnalysisTab.jsx"));
const SalaryTab      = lazy(() => import("./tabs/SalaryTab.jsx"));
const CreditosTab    = lazy(() => import("./tabs/CreditosTab.jsx"));
const AhorrosTab     = lazy(() => import("./tabs/AhorrosTab.jsx"));
const ProjectionTab  = lazy(() => import("./tabs/ProjectionTab.jsx"));

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
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json","x-session-token":tok}, body: JSON.stringify({key:"creditos",value:creditos}) });
        showSync("☁ Guardado");
      } catch(e) { console.log("Save creditos error:", e); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [creditos, session?.token]);

  // ── Auto-save ahorros ─────────────────────────────────────────────────────
  useEffect(() => {
    if (ahorros.length === 0) return;
    cacheWrite("ahorros", ahorros);
    if (!session?.token) return;
    const tok = session.token;
    const timer = setTimeout(async () => {
      try {
        await fetch("/api/data", { method:"POST", headers:{"Content-Type":"application/json","x-session-token":tok}, body: JSON.stringify({key:"ahorros",value:ahorros}) });
        showSync("☁ Guardado");
      } catch(e) { console.log("Save ahorros error:", e); }
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

  const BANK_PATTERNS = [
    ["Banco Santander", /santander/i],
    ["BCI",             /\bbci\b/i],
    ["Banco de Chile",  /banco de chile/i],
    ["Scotiabank",      /scotiabank/i],
    ["BancoEstado",     /bancoestado|banco\s+estado/i],
    ["Itaú",            /ita[uú]/i],
    ["BICE",            /\bbice\b/i],
    ["Security",        /\bsecurity\b/i],
  ];

  const handleAnalysis = (result, rawText = "") => {
    setAnalysis(result);
    setPeriods(prev => {
      const pmMatch = result?.periodoMes
        ? String(result.periodoMes).match(/^(\d{1,2})\/(\d{4})$/)
        : null;
      const banco = result?.banco?.trim();
      let label;

      if (banco && pmMatch) {
        label = `${banco} ${MONTHS_ES[parseInt(pmMatch[1], 10) - 1]} ${pmMatch[2]}`;
      } else if (pmMatch) {
        label = `${MONTHS_ES[parseInt(pmMatch[1], 10) - 1]} ${pmMatch[2]}`;
      } else {
        const head = rawText.slice(0, 800);
        const foundBank      = BANK_PATTERNS.find(([, re]) => re.test(head))?.[0];
        const yearMatch      = head.match(/20\d{2}/);
        const year           = yearMatch ? yearMatch[0] : null;
        const foundMonthIdx  = MONTHS_ES.findIndex(m => new RegExp(m, "i").test(head));
        const foundMonth     = foundMonthIdx >= 0 ? MONTHS_ES[foundMonthIdx] : null;

        if (foundBank && foundMonth && year)      label = `${foundBank} ${foundMonth} ${year}`;
        else if (foundBank && year)               label = `${foundBank} ${year}`;
        else if (foundMonth && year)              label = `${foundMonth} ${year}`;
        else if (foundBank)                       label = foundBank;
        else                                      label = `Período ${prev.length + 1}`;
      }
      return [...prev, { label, analysis: result, addedAt: Date.now() }];
    });
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

  const ctx = useMemo(() => ({
    session, tab, setTab,
    salaries, setSalaries,
    analysis, setAnalysis,
    rawText, setRawText,
    periods, setPeriods,
    creditos, setCreditos,
    ahorros, setAhorros,
    budget, setBudget,
    syncing, syncMsg, isOffline,
    handleAnalysis, handleRemovePeriod, handleLogout,
  }), [session, tab, salaries, analysis, rawText, periods, creditos, ahorros, budget, syncing, syncMsg, isOffline]);

  return (
    <AppContext.Provider value={ctx}>
    <div className="min-h-screen text-white"
      style={{
        background:"radial-gradient(ellipse 80% 60% at 50% -20%, #1a0a2e 0%, #0f0f1a 55%, #07071a 100%)",
        fontFamily:"'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{background:"linear-gradient(135deg,#1a0533 0%,#2d1060 30%,#0d1a33 65%,#0f0f1a 100%)",backgroundSize:"300% 300%",borderBottom:"1px solid rgba(124,58,237,0.25)",animation:"gradientShift 10s ease infinite"}}>
      <div className="px-8 pt-10 pb-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg logo-icon" style={{background:"linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)",boxShadow:"0 4px 20px rgba(124,58,237,0.45)"}}>💳</div>
            <div>
              <h1 className="text-2xl font-extrabold leading-none tracking-tight" style={{background:"linear-gradient(135deg,#e879f9 0%,#7c3aed 45%,#06b6d4 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",filter:"drop-shadow(0 0 12px rgba(232,121,249,0.45))"}}>FinanzasIA</h1>
              <p className="text-xs text-slate-500 mt-0.5">Análisis inteligente de gastos</p>
              {DEMO_MODE && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">MODO DEMO</span>}
            </div>
          </div>
          {/* User + logout */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">👤 {session.username}</span>
            <button onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white border border-violet-900/40 hover:border-violet-600/60 px-2.5 py-1 rounded-lg transition-all" style={{background:"rgba(124,58,237,0.06)"}}>
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
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-cyan-400" style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)"}}>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-violet-300" style={{background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)"}}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#7c3aed"}}/>
              Análisis completado · {analysis.expenses?.length} transacciones
            </div>
          )}
          {periods.length > 1 && (
            <button onClick={()=>setTab("multi")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-cyan-400 transition-all hover:opacity-80" style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.25)"}}>
              📅 {periods.length} períodos cargados — ver comparativa
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="px-8 max-w-4xl mx-auto">
        <div className="flex gap-1 rounded-2xl p-1.5 mb-6 overflow-x-auto scrollbar-none" style={{background:"#1a1a2e",border:"1px solid rgba(124,58,237,0.35)",boxShadow:"0 4px 20px rgba(124,58,237,0.12)"}}>
          {tabs.map((t)=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${tab===t.id?"text-white":"text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              style={tab===t.id?{background:"linear-gradient(135deg,#7c3aed 0%,#06b6d4 100%)",boxShadow:"0 2px 14px rgba(124,58,237,0.45)"}:{}}>
              {t.label}
            </button>
          ))}
        </div>
        <Suspense fallback={<div className="pb-12 flex items-center justify-center py-20"><span className="text-slate-500 text-sm">Cargando…</span></div>}>
        <div key={tab} className="pb-12 tab-content">
          {tab==="upload"     && <UploadTab/>}
          {tab==="analysis"   && <AnalysisTab/>}
          {tab==="multi"      && <MultiAnalysisTab/>}
          {tab==="salary"     && <SalaryTab/>}
          {tab==="creditos"   && <CreditosTab/>}
          {tab==="ahorros"    && <AhorrosTab/>}
          {tab==="projection" && <ProjectionTab/>}
        </div>
        </Suspense>
      </div>
    </div>
    </AppContext.Provider>
  );
}
