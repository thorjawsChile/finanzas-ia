import { useState } from "react";
import { sanitizeInput, validateFile } from "../security.js";
import { extractPdfText } from "../utils.js";
import { analyzeExpensesAI } from "../ai/analyzeExpenses.js";
import { Card, DropZone, RateLimitBadge } from "../components/ui.jsx";

/* ── UPLOAD TAB ──────────────────────────────────────────────────────── */
export default function UploadTab({ salaries, onAnalysis, rawText, setRawText }) {
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
