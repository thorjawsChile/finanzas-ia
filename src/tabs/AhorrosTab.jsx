import { useState } from "react";
import { Card, KpiCard } from "../components/ui.jsx";
import AhorroCard from "../components/AhorroCard.jsx";
import { fmt } from "../utils.js";

/* ══════════════════════════════════════════════════════════════════════
   AHORROS TAB
══════════════════════════════════════════════════════════════════════ */
export default function AhorrosTab({ ahorros, setAhorros }) {
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
                className={`w-9 h-9 rounded-xl text-lg transition-all ${emoji===e?"bg-violet-600 shadow-lg":"bg-slate-700 hover:bg-slate-600"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Nombre de la meta</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Pie para la casa"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Monto objetivo ($)</label>
            <input value={objetivo} onChange={e=>setObjetivo(e.target.value)} placeholder="Ej: 10.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Ya ahorrado ($)</label>
            <input value={actual} onChange={e=>setActual(e.target.value)} placeholder="Ej: 2.000.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Aporte mensual ($)</label>
            <input value={aporte} onChange={e=>setAporte(e.target.value)} placeholder="Ej: 300.000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-600"/>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fecha límite (opcional)</label>
            <input type="date" value={fechaMeta} onChange={e=>setFechaMeta(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"/>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdd} disabled={!nombre||!objetivo}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-sm font-semibold text-white transition-all">
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
