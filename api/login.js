/**
 * api/login.js — Simple authentication
 */
import crypto from "crypto";

const attempts = new Map();

function isLockedOut(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > 15 * 60_000) { attempts.delete(ip); return false; }
  return rec.count >= 5;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  if (isLockedOut(ip))
    return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "Usuario y contraseña requeridos." });

  const validUsers = {
    [process.env.USER1_NAME]: process.env.USER1_PASS,
    [process.env.USER2_NAME]: process.env.USER2_PASS,
  };

  const storedPass = validUsers[username];
  const inputBuf   = Buffer.from(password);
  const storedBuf  = Buffer.from(storedPass || "dummy-prevent-timing");

  const match = storedPass &&
    inputBuf.length === storedBuf.length &&
    crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    const rec = attempts.get(ip) || { count: 0, firstAt: Date.now() };
    rec.count++;
    attempts.set(ip, rec);
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  attempts.delete(ip);

  // Simple token: base64(username:password) — validated directly in chat.js
  const token = Buffer.from(`${username}:${password}`).toString("base64");

  return res.status(200).json({ token, username, expiresIn: 8 * 60 * 60 });
}
