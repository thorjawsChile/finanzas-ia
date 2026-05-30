import { useState } from "react";
import { login } from "../security.js";

/* ── LOGIN SCREEN ────────────────────────────────────────────────────── */
export default function LoginScreen({ onLogin }) {
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
