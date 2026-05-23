/**
 * api/chat.js — Vercel Serverless Function
 *
 * Acts as a secure proxy between the frontend and Anthropic API.
 * - API key never reaches the browser
 * - Validates session token before forwarding
 * - Server-side rate limiting by IP (10 req/min)
 * - Strips and re-adds headers safely
 * - Enforces max token limit
 */

import crypto from "crypto";

// ── Server-side rate limit store (resets per cold start, good enough for personal use)
const ipStore = new Map(); // ip -> [timestamps]
const RATE_WINDOW_MS  = 60_000;
const RATE_MAX_REQ    = 10;

function isRateLimited(ip) {
  const now  = Date.now();
  const hits = (ipStore.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  hits.push(now);
  ipStore.set(ip, hits);
  return hits.length > RATE_MAX_REQ;
}

// ── Session token validation
function validateSession(req) {
  const token = req.headers["x-session-token"];
  if (!token) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  // Token format: base64(username:timestamp:hmac)
  try {
    const decoded  = Buffer.from(token, "base64").toString("utf8");
    const [user, ts, hmac] = decoded.split(":");
    if (!user || !ts || !hmac) return false;

    // Reject tokens older than 8 hours
    if (Date.now() - parseInt(ts, 10) > 8 * 60 * 60 * 1000) return false;

    // Verify HMAC
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${user}:${ts}`)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hmac,     "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS — only allow same origin (your Vercel domain)
  const origin   = req.headers.origin || "";
  const allowed  = process.env.ALLOWED_ORIGIN || "";
  if (allowed && origin !== allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", allowed || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-token");

  // Session check
  if (!validateSession(req)) {
    return res.status(401).json({ error: "Sesión inválida. Por favor inicia sesión nuevamente." });
  }

  // IP rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Espera un momento." });
  }

  // Validate body
  const { model, messages, max_tokens } = req.body || {};
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Cuerpo de solicitud inválido." });
  }

  // Enforce safe limits
  const safeMaxTokens = Math.min(max_tokens || 1000, 8000);

  // Forward to Anthropic (API key stays server-side in env var)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key no configurada en el servidor." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, messages, max_tokens: safeMaxTokens }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || "Error al contactar la IA.",
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(502).json({ error: "Error de red al contactar la IA." });
  }
}
