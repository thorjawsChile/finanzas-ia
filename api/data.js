/**
 * api/data.js — Vercel Serverless Function
 * Saves and loads user data using Upstash Redis.
 *
 * GET  /api/data?key=periods   → load data for authenticated user
 * POST /api/data               → { key, value } save data for authenticated user
 */

import crypto from "crypto";
import { Redis } from "@upstash/redis";

// ── Upstash Redis client ──────────────────────────────────────────────────────
const redis = new Redis({
  url:   process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Simple token validation
function getUsername(req) {
  const token = req.headers["x-session-token"];
  if (!token) return null;
  try {
    const decoded  = Buffer.from(token, "base64").toString("utf8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) return null;
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);
    const validUsers = {
      [process.env.USER1_NAME]: process.env.USER1_PASS,
      [process.env.USER2_NAME]: process.env.USER2_PASS,
    };
    const storedPass = validUsers[username];
    if (!storedPass || storedPass !== password) return null;
    return username;
  } catch { return null; }
}

const ALLOWED_KEYS = ["periods", "salaries", "creditos", "ahorros", "budget"];
const MAX_SIZE_KB  = 512;

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
      let value = await redis.get(`user:${username}:${key}`);
      // Upstash may return stringified JSON — parse it
      if (typeof value === "string") {
        try { value = JSON.parse(value); } catch {}
      }
      return res.status(200).json({ value: value || null });
    } catch (err) {
      return res.status(500).json({ error: "Error al leer: " + err.message });
    }
  }

  // POST — save
  if (req.method === "POST") {
    const { key, value } = req.body || {};
    if (!ALLOWED_KEYS.includes(key))
      return res.status(400).json({ error: "Clave no permitida." });
    const sizeKB = JSON.stringify(value).length / 1024;
    if (sizeKB > MAX_SIZE_KB)
      return res.status(413).json({ error: `Datos muy grandes (${sizeKB.toFixed(0)}KB).` });
    try {
      // Always store as JSON string for consistent retrieval
      const stored = typeof value === "string" ? value : JSON.stringify(value);
      await redis.set(`user:${username}:${key}`, stored);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Error al guardar: " + err.message });
    }
  }

  return res.status(405).json({ error: "Método no permitido." });
}
