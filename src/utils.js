export async function demoDelay(ms = 1800) {
  return new Promise(r => setTimeout(r, ms));
}

export const fmt = (n) => isNaN(n) ? "$0" : "$" + Math.round(Number(n)).toLocaleString("es-CL");

// Normalize periodoMes to "MM/YYYY" — accepts "M/YYYY" or "MM/YYYY"
export function normalizePM(pm) {
  if (!pm) return null;
  const m = String(pm).match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return m[1].padStart(2, "0") + "/" + m[2];
}

/* ── PDF text extraction via pdf.js ──────────────────────────────────── */
export async function extractPdfText(file) {
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
