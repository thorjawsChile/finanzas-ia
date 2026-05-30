import { useState, useCallback, useRef } from "react";

/* ── FILE DROP ZONE (reusable) ────────────────────────────────────────── */
export function DropZone({ onFile, accept = ".pdf,.csv,.txt", label, sublabel, fileName, loading, progress }) {
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
