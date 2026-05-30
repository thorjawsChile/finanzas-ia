import { useState, useEffect } from "react";
import { getRateLimitStatus } from "../security.js";

/* ── RATE LIMIT BADGE ────────────────────────────────────────────────── */
export function RateLimitBadge() {
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
