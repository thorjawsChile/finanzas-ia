/**
 * api/login.js — Vercel Serverless Function
 *
 * Validates username + password against env vars.
 * Returns a signed session token (HMAC-SHA256) on success.
 * Passwords are compared with timing-safe equality.
 */

import crypto from "crypto";

// Simple login attempt limiter (per cold start)
const attempts = new Map(); // ip -> { count, firstAt }
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60_000; // 15 minutes

function isLockedOut(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > LOCKOUT_MS) { attempts.delete(ip); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip) {
  const rec = attempts.get(ip) || { count: 0, firstAt: Date.now() };
  rec.count++;
  attempts.set(ip, rec);
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  if (isLockedOut(ip)) {
    return res.status(429).json({
      error: "Demasiados intentos fallidos. Espera 15 minutos.",
    });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos." });
  }

  // Load credentials from env (supports up to 2 users: you + partner)
  const validUsers = {
    [process.env.USER1_NAME]: process.env.USER1_PASS,
    [process.env.USER2_NAME]: process.env.USER2_PASS,
  };

  const storedPass = validUsers[username];

  // Always do a comparison to prevent timing-based user enumeration
  const inputBuf  = Buffer.from(password);
  const storedBuf = Buffer.from(storedPass || "dummy-constant-string-to-prevent-timing");

  const match = storedPass &&
    inputBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    recordAttempt(ip);
    // Intentionally vague error
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  clearAttempts(ip);

  // Issue signed token: base64(username:timestamp:hmac)
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Servidor mal configurado." });
  }

  const ts   = Date.now().toString();
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${username}:${ts}`)
    .digest("hex");

  const token = Buffer.from(`${username}:${ts}:${hmac}`).toString("base64");

  return res.status(200).json({
    token,
    username,
    expiresIn: 8 * 60 * 60, // 8 hours in seconds
  });
}
