/**
 * api/data.js — Vercel Serverless Function
 * Saves and loads user data using Vercel KV (Redis).
 *
 * GET  /api/data?key=periods   → load data for authenticated user
 * POST /api/data               → { key, value } save data for authenticated user
 */

import crypto from "crypto";
import { kv } from "@vercel/kv";

// ── Session validation (same as chat.js) ─────────────────────────────────────
function getUsername(req) {
  const token  = req.headers["x-session-token"];
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return null;
  try {
    const decoded        = Buffer.from(token, "base64").toString("utf8");
    const [user, ts, hmac] = decoded.split(":");
    if (!user || !ts || !hmac) return null;
    if (Date.now() - parseInt(ts, 10) > 8 * 60 * 60 * 1000) return null;
    const expected = crypto.createHmac("sha256", secret).update(`${user}:${ts}`).digest("hex");
    const valid = crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"));
    return valid ? user : null;
  } catch { return null; }
}

// Allowed data keys per user
const ALLOWED_KEYS = ["periods", "salaries"];
const MAX_SIZE_KB  = 512; // 512KB per key

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const username = getUsername(req);
  if (!username) return res.status(401).json({ error: "Sesión inválida." });

  // GET — load
  if (req.method === "GET") {
    const key = req.query.key;
    if (!ALLOWED_KEYS.includes(key))
      return res.status(400).json({ error: "Clave no permitida." });

    try {
      const value = await kv.get(`user:${username}:${key}`);
      return res.status(200).json({ value: value || null });
    } catch (err) {
      return res.status(500).json({ error: "Error al leer datos: " + err.message });
    }
  }

  // POST — save
  if (req.method === "POST") {
    const { key, value } = req.body || {};
    if (!ALLOWED_KEYS.includes(key))
      return res.status(400).json({ error: "Clave no permitida." });

    const sizeKB = JSON.stringify(value).length / 1024;
    if (sizeKB > MAX_SIZE_KB)
      return res.status(413).json({ error: `Datos demasiado grandes (${sizeKB.toFixed(0)}KB > ${MAX_SIZE_KB}KB).` });

    try {
      await kv.set(`user:${username}:${key}`, value);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Error al guardar: " + err.message });
    }
  }

  return res.status(405).json({ error: "Método no permitido." });
}
