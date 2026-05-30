import { useState } from "react";
import { Card } from "./ui.jsx";
import { fmt } from "../utils.js";

/* ── AHORRO CARD (componente separado para evitar useState en .map()) ── */
export default function AhorroCard({ a, onAbonar, onEdit, onDelete }) {
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
