/**
 * security.js — Client-side security utilities
 * Session management · Rate limiting · Input sanitization · Hardened fetch
 */

// ── Session ───────────────────────────────────────────────────────────────────
const SESSION_KEY = "finanzas_session";

export function saveSession(token, username) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, username, savedAt: Date.now() }));
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Client-side expiry check: 8 hours
    if (Date.now() - s.savedAt > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSessionToken() {
  return loadSession()?.token || null;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const res = await fetch("/api/login", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al iniciar sesión.");
  saveSession(data.token, data.username);
  return data;
}

// ── Rate limiter (client-side display only — real limit is server-side) ───────
const RATE_LIMIT = { maxRequests: 10, windowMs: 60_000, store: [] };

export function checkRateLimit() {
  const now = Date.now();
  RATE_LIMIT.store = RATE_LIMIT.store.filter(t => now - t < RATE_LIMIT.windowMs);
  if (RATE_LIMIT.store.length >= RATE_LIMIT.maxRequests) {
    const waitSec = Math.ceil((RATE_LIMIT.windowMs - (now - RATE_LIMIT.store[0])) / 1000);
    throw new Error(`Demasiadas solicitudes. Espera ${waitSec}s.`);
  }
  RATE_LIMIT.store.push(now);
}

export function getRateLimitStatus() {
  const now = Date.now();
  RATE_LIMIT.store = RATE_LIMIT.store.filter(t => now - t < RATE_LIMIT.windowMs);
  return {
    used:      RATE_LIMIT.store.length,
    remaining: Math.max(0, RATE_LIMIT.maxRequests - RATE_LIMIT.store.length),
    max:       RATE_LIMIT.maxRequests,
  };
}

// ── Input sanitization ────────────────────────────────────────────────────────
const MAX_INPUT_CHARS = 40_000;

export function sanitizeInput(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .slice(0, MAX_INPUT_CHARS)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/(\n\s*){4,}/g, "\n\n")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

// ── File validation ───────────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".csv"]);
const ALLOWED_TYPES       = new Set(["application/pdf", "text/plain", "text/csv", "application/csv"]);
const MAX_FILE_MB         = 10;

export function validateFile(file) {
  if (!file) throw new Error("No se recibió ningún archivo.");
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext))
    throw new Error(`Tipo no permitido (${ext}). Usa PDF, CSV o TXT.`);
  if (file.size > MAX_FILE_MB * 1024 * 1024)
    throw new Error(`Archivo supera el límite de ${MAX_FILE_MB} MB.`);
  return true;
}

// ── Secure fetch → proxy ──────────────────────────────────────────────────────
const TIMEOUT_MS = 60_000;

export async function secureAnthropicFetch(body) {
  checkRateLimit();

  const token = getSessionToken();
  if (!token) {
    clearSession();
    throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-session-token": token,
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 401) {
      clearSession();
      throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();

  } catch (err) {
    if (err.name === "AbortError")
      throw new Error("La solicitud tardó demasiado. Intenta con un archivo más pequeño.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Cloud storage ─────────────────────────────────────────────────────────────
// Saves and loads user data via /api/data (Vercel KV in production,
// falls back to localStorage for local development).

const IS_LOCAL = window.location.hostname === "localhost";

async function cloudSave(key, value, token) {
  if (IS_LOCAL) {
    // Local fallback: use localStorage
    try { localStorage.setItem(`finanzas_${key}`, JSON.stringify(value)); } catch {}
    return;
  }
  await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-session-token": token },
    body: JSON.stringify({ key, value }),
  });
}

async function cloudLoad(key, token) {
  if (IS_LOCAL) {
    // Local fallback: use localStorage
    try {
      const raw = localStorage.getItem(`finanzas_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  const res = await fetch(`/api/data?key=${key}`, {
    headers: { "x-session-token": token },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.value || null;
}

export async function savePeriods(periods, token) {
  // Strip raw text before saving to keep size small
  const slim = periods.map(p => ({
    label:     p.label,
    addedAt:   p.addedAt,
    analysis:  {
      expenses:       p.analysis.expenses,
      totalExpenses:  p.analysis.totalExpenses,
      summary:        p.analysis.summary,
      topCategories:  p.analysis.topCategories,
      recommendations:p.analysis.recommendations,
      salaryRatio:    p.analysis.salaryRatio,
    }
  }));
  await cloudSave("periods", slim, token);
}

export async function loadPeriods(token) {
  return await cloudLoad("periods", token);
}

export async function saveSalaries(salaries, token) {
  await cloudSave("salaries", salaries, token);
}

export async function loadSalaries(token) {
  return await cloudLoad("salaries", token);
}
