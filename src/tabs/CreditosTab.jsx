import { useState } from "react";
import { Card, KpiCard } from "../components/ui.jsx";
import { fmt } from "../utils.js";
import { MONTHS_ES } from "../constants.js";

/* ══════════════════════════════════════════════════════════════════════
   CRÉDITOS TAB
══════════════════════════════════════════════════════════════════════ */
export default function CreditosTab({ creditos, setCreditos }) {
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600">
              {tipoOpts.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Tasa interés anual (%)</label>
            <input value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="Ej: 12.5"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Monto total del crédito ($)</label>
            <input value={montoTotal} onChange={e=>setMontoTotal(e.target.value)} placeholder="Ej: 5.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Cuota mensual ($)</label>
            <input value={cuota} onChange={e=>setCuota(e.target.value)} placeholder="Ej: 150.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Total de cuotas</label>
            <input type="number" value={mesesTotal} onChange={e=>setMesesTotal(e.target.value)} placeholder="Ej: 48"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Cuotas ya pagadas</label>
            <input type="number" value={mesesPagados} onChange={e=>setMesesPagados(e.target.value)} placeholder="Ej: 12"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdd} disabled={!nombre||!cuota}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{background:"linear-gradient(135deg,#7c3aed,#06b6d4)",boxShadow:"0 0 15px rgba(124,58,237,0.4)",opacity:(!nombre||!cuota)?0.45:1,cursor:(!nombre||!cuota)?"not-allowed":"pointer"}}>
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
