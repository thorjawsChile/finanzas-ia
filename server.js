/**
 * server.js — Servidor local para pruebas
 *
 * Replica las funciones serverless de Vercel (/api/login y /api/chat)
 * usando Express, y sirve el frontend compilado desde /dist.
 *
 * Uso:
 *   npm run build
 *   node server.js
 */

import express    from "express";
import crypto     from "crypto";
import path       from "path";
import { fileURLToPath } from "url";
import { readFileSync }  from "fs";

// Cargar .env manualmente (sin depender de dotenv en producción)
try {
  const envFile = readFileSync(".env", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log("✓ Variables de entorno cargadas desde .env");
} catch {
  console.warn("⚠  No se encontró .env — usando variables del sistema");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

// ── Servir frontend compilado ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// ── Helpers compartidos ───────────────────────────────────────────────────────
function validateSession(req) {
  const token  = req.headers["x-session-token"];
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  try {
    const decoded        = Buffer.from(token, "base64").toString("utf8");
    const [user, ts, hmac] = decoded.split(":");
    if (!user || !ts || !hmac) return false;
    if (Date.now() - parseInt(ts, 10) > 8 * 60 * 60 * 1000) return false;
    const expected = crypto.createHmac("sha256", secret).update(`${user}:${ts}`).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"));
  } catch { return false; }
}

// ── /api/login ────────────────────────────────────────────────────────────────
const attempts = new Map();

app.post("/api/login", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const ip  = req.ip || "local";
  const rec = attempts.get(ip);
  const now = Date.now();

  if (rec) {
    if (now - rec.firstAt > 15 * 60_000) attempts.delete(ip);
    else if (rec.count >= 5)
      return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
  }

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "Usuario y contraseña requeridos." });

  const validUsers = {
    [process.env.USER1_NAME]: process.env.USER1_PASS,
    [process.env.USER2_NAME]: process.env.USER2_PASS,
  };
  const storedPass = validUsers[username];
  const inputBuf   = Buffer.from(password);
  const storedBuf  = Buffer.from(storedPass || "dummy-prevent-timing-attacks-xkq29");
  const match      = storedPass &&
    inputBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    const r = attempts.get(ip) || { count: 0, firstAt: now };
    r.count++;
    attempts.set(ip, r);
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  attempts.delete(ip);
  const secret = process.env.SESSION_SECRET;
  if (!secret) return res.status(500).json({ error: "SESSION_SECRET no configurado en .env" });

  const ts   = now.toString();
  const hmac = crypto.createHmac("sha256", secret).update(`${username}:${ts}`).digest("hex");
  const token = Buffer.from(`${username}:${ts}:${hmac}`).toString("base64");

  console.log(`✓ Login exitoso: ${username}`);
  return res.json({ token, username, expiresIn: 8 * 60 * 60 });
});

// ── /api/chat ─────────────────────────────────────────────────────────────────
const ipStore = new Map();

app.post("/api/chat", async (req, res) => {
  const demoMode = process.env.VITE_DEMO_MODE === "true";
  if (!demoMode && !validateSession(req))
    return res.status(401).json({ error: "Sesión inválida. Inicia sesión nuevamente." });
  // In demo mode: calls never reach here (data is mocked client-side)
  if (demoMode) return res.status(200).json({ content: [{ text: "{}" }] });

  const ip  = req.ip || "local";
  const now = Date.now();
  const hits = (ipStore.get(ip) || []).filter(t => now - t < 60_000);
  hits.push(now);
  ipStore.set(ip, hits);
  if (hits.length > 10)
    return res.status(429).json({ error: "Demasiadas solicitudes. Espera un momento." });

  const { model, messages, max_tokens } = req.body || {};
  if (!model || !Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "Cuerpo inválido." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada en .env" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, messages, max_tokens: Math.min(max_tokens || 1000, 4000) }),
    });
    const data = await upstream.json();
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: data?.error?.message || "Error IA" });
    console.log(`✓ Chat OK (${messages.length} msg, ${data.usage?.output_tokens || "?"} tokens)`);
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: "Error de red: " + err.message });
  }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ── Arrancar ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║        FinanzasIA — Local Dev        ║");
  console.log("╠══════════════════════════════════════╣");
  console.log(`║  URL:  http://localhost:${PORT}          ║`);
  console.log("║  Para cerrar: Ctrl + C               ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  if (!process.env.ANTHROPIC_API_KEY)
    console.warn("⚠  ANTHROPIC_API_KEY no encontrada — el análisis IA no funcionará");
  if (!process.env.SESSION_SECRET)
    console.warn("⚠  SESSION_SECRET no encontrada — el login no funcionará");
});
