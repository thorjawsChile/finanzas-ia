/**
 * api/chat.js — Vercel Serverless Function
 */

import crypto from "crypto";

const ipStore = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQ   = 10;

function isRateLimited(ip) {
  const now  = Date.now();
  const hits = (ipStore.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  hits.push(now);
  ipStore.set(ip, hits);
  return hits.length > RATE_MAX_REQ;
}

function validateSession(req) {
  const token = req.headers["x-session-token"];
  if (!token) { console.log("AUTH FAIL: no token"); return false; }

  try {
    const decoded  = Buffer.from(token, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return false;

    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    const validUsers = {
      [process.env.USER1_NAME]: process.env.USER1_PASS,
      [process.env.USER2_NAME]: process.env.USER2_PASS,
    };

    const storedPass = validUsers[username];
    if (!storedPass) return false;

    const inputBuf  = Buffer.from(password);
    const storedBuf = Buffer.from(storedPass);
    return inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

  } catch(e) {
    console.log("AUTH FAIL: exception", e.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const origin  = req.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "";
  if (allowed && origin !== allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", allowed || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-token");

  if (!validateSession(req))
    return res.status(401).json({ error: "Sesión inválida." });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (isRateLimited(ip))
    return res.status(429).json({ error: "Demasiadas solicitudes." });

  const { model, messages, max_tokens } = req.body || {};
  if (!model || !Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "Cuerpo inválido." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "API key no configurada." });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, messages, max_tokens: Math.min(max_tokens || 1000, 8000) }),
    });
    const data = await upstream.json();
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: data?.error?.message || "Error IA" });
    return res.status(200).json(data);
  } catch(err) {
    return res.status(502).json({ error: "Error de red: " + err.message });
  }
}
