# 💳 FinanzasIA

App personal de análisis de gastos con IA — con login, API key segura y PWA instalable.

---

## 🚀 Deploy en Vercel (15 minutos)

### 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finanzas-ia.git
git push -u origin main
```

### 2 — Crear proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Sign up with GitHub**
2. **Add New Project** → selecciona `finanzas-ia`
3. **No hagas Deploy aún** — primero configura las variables de entorno

### 3 — Configurar variables de entorno en Vercel

En el panel de Vercel → tu proyecto → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Tu key de [console.anthropic.com](https://console.anthropic.com) |
| `SESSION_SECRET` | String aleatorio largo (mín. 64 chars) |
| `USER1_NAME` | Tu nombre de usuario |
| `USER1_PASS` | Tu contraseña |
| `USER2_NAME` | Usuario de tu pareja |
| `USER2_PASS` | Contraseña de tu pareja |
| `ALLOWED_ORIGIN` | `https://tu-app.vercel.app` (después del primer deploy) |

> **Generar SESSION_SECRET:** abre una terminal y ejecuta:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4 — Deploy

Haz clic en **Deploy**. En ~2 minutos tienes tu URL.

Actualiza `ALLOWED_ORIGIN` con la URL real que te dio Vercel y haz **Redeploy**.

---

## 📱 Instalar en el celular

### iPhone (Safari)
1. Abre la URL en **Safari**
2. Botón compartir (□↑) → **"Agregar a pantalla de inicio"**

### Android (Chrome)
1. Abre la URL en **Chrome**
2. Menú (⋮) → **"Agregar a pantalla de inicio"**

---

## 🔒 Arquitectura de seguridad

```
Browser                    Vercel Edge              Anthropic
  │                            │                        │
  │──── POST /api/login ──────>│                        │
  │<─── session token ─────────│                        │
  │                            │                        │
  │──── POST /api/chat ───────>│                        │
  │     (x-session-token)      │──── API key (env) ────>│
  │                            │<─── respuesta ─────────│
  │<─── respuesta ─────────────│                        │
```

- ✅ API key nunca sale del servidor
- ✅ Login con usuario/contraseña + token firmado HMAC-SHA256
- ✅ Sesión de 8 horas con expiración automática
- ✅ Rate limiting server-side por IP (10 req/min)
- ✅ Bloqueo tras 5 intentos fallidos de login (15 min)
- ✅ Security headers completos (HSTS, CSP, XSS, etc.)
- ✅ Validación y sanitización de archivos PDF/CSV

## 🔧 Desarrollo local

```bash
npm install
# Crea un archivo .env con las variables del .env.example
npm run dev
```

Para probar las funciones serverless localmente:
```bash
npm install -g vercel
vercel dev
```

---

## ☁️ Base de datos en la nube (Vercel KV)

Para que los datos persistan entre sesiones y dispositivos, debes crear una base de datos KV en Vercel:

### Paso 1 — Crear la base de datos KV
1. En el panel de Vercel → tu proyecto → pestaña **Storage**
2. Clic en **Create Database** → selecciona **KV (Redis)**
3. Nombre: `finanzas-kv` → **Create**

### Paso 2 — Conectar al proyecto
1. En la base de datos recién creada → pestaña **Settings**
2. Clic en **Connect Project** → selecciona tu proyecto `finanzas-ia`
3. Vercel agrega automáticamente las variables `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` a tu proyecto

### Paso 3 — Redeploy
En Vercel → tu proyecto → **Deployments** → **Redeploy**

Listo. Los datos de períodos y sueldos se guardan automáticamente en la nube.

### Uso local con KV
Para probar KV en local, agrega al `.env`:
```
KV_REST_API_URL=tu-url-de-vercel-kv
KV_REST_API_TOKEN=tu-token-de-vercel-kv
```
(Los encuentras en Vercel → Storage → tu base de datos → `.env.local`)

> **Sin KV configurado en local:** la app usa `localStorage` como fallback automático — los datos se guardan en el navegador de ese PC.
