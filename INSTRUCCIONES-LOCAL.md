# 🖥️ FinanzasIA — Instrucciones para correr en tu PC

---

## Lo que necesitas antes de empezar

| Requisito | Cómo verificar | Dónde descargar |
|---|---|---|
| **Node.js** (v18 o superior) | Abre terminal → escribe `node -v` | [nodejs.org](https://nodejs.org) → botón LTS |
| **Una API Key de Anthropic** | — | [console.anthropic.com](https://console.anthropic.com) |

> **¿Cómo abrir la terminal?**
> - **Windows**: tecla Windows → escribe "PowerShell" → Enter
> - **Mac**: CMD + Espacio → escribe "Terminal" → Enter

---

---

## 🎮 Modo Demo (sin API Key)

El archivo `.env` ya viene con **`VITE_DEMO_MODE=true`** activado.

En este modo:
- La app **no necesita** API key de Anthropic
- El login se salta automáticamente
- Los análisis usan **datos de ejemplo reales** (gastos, liquidación y proyección de casa)
- Aparece un badge naranja **MODO DEMO** en el encabezado
- Puedes navegar todas las pestañas y ver cómo funciona todo

Para pasar al modo real cuando tengas tu API key:
1. Abre `.env`
2. Cambia `VITE_DEMO_MODE=true` → `VITE_DEMO_MODE=false`
3. Pon tu key en `ANTHROPIC_API_KEY=sk-ant-...`
4. Vuelve a ejecutar `npm run local`

---
## Paso 1 — Descomprimir el proyecto

Descomprime el archivo `finanzas-ia.zip` donde quieras, por ejemplo en tu Escritorio.
Queda una carpeta llamada `finanzas-app`.

---

## Paso 2 — Obtener tu API Key de Anthropic

1. Ve a [console.anthropic.com](https://console.anthropic.com) e inicia sesión (o crea cuenta gratis)
2. En el menú izquierdo → **API Keys** → **Create Key**
3. Copia la key — empieza con `sk-ant-...`

---

## Paso 3 — Configurar el archivo .env

Dentro de la carpeta `finanzas-app` hay un archivo llamado **`.env`**

> ⚠️ En Windows, los archivos que empiezan con `.` pueden estar ocultos.
> Para verlos: en el Explorador de archivos → Ver → marcar "Elementos ocultos"

Ábrelo con el Bloc de Notas (Windows) o TextEdit (Mac) y reemplaza esta línea:

```
ANTHROPIC_API_KEY=sk-ant-REEMPLAZA-CON-TU-API-KEY
```

por tu key real:

```
ANTHROPIC_API_KEY=sk-ant-TuKeyRealAqui...
```

Los usuarios y contraseñas de prueba ya están listos:
- Usuario 1: `yo` / contraseña: `clave123`
- Usuario 2: `pareja` / contraseña: `clave456`

Puedes cambiarlos por los que quieras editando las líneas `USER1_NAME`, `USER1_PASS`, etc.

**Guarda el archivo.**

---

## Paso 4 — Instalar y compilar (solo la primera vez)

Abre la terminal, navega a la carpeta del proyecto y ejecuta estos dos comandos:

```bash
cd ruta/a/finanzas-app
npm install
```

Espera que termine (~1-2 minutos, descarga las dependencias).

---

## Paso 5 — Iniciar la app

```bash
npm run local
```

Este comando compila el frontend y arranca el servidor. Cuando veas esto:

```
╔══════════════════════════════════════╗
║        FinanzasIA — Local Dev        ║
╠══════════════════════════════════════╣
║  URL:  http://localhost:3000         ║
║  Para cerrar: Ctrl + C              ║
╚══════════════════════════════════════╝
```

¡Ya está listo! Abre tu navegador y ve a:

## 👉 http://localhost:3000

---

## Paso 6 — Iniciar sesión

Usa las credenciales del archivo `.env`:
- **Usuario:** `yo` · **Contraseña:** `clave123`
- **Usuario:** `pareja` · **Contraseña:** `clave456`

---

## Comandos útiles

| Comando | Para qué sirve |
|---|---|
| `npm run local` | Compilar + iniciar servidor (úsalo cada vez) |
| `npm run build` | Solo compilar el frontend |
| `node server.js` | Solo iniciar el servidor (si ya compilaste) |
| Ctrl + C | Detener el servidor |

---

## Si algo no funciona

**"node no se reconoce como comando"**
→ Node.js no está instalado. Descárgalo de [nodejs.org](https://nodejs.org) y reinicia la terminal.

**"Error: ANTHROPIC_API_KEY no configurada"**
→ Revisa que guardaste bien el archivo `.env` con tu key real.

**"Puerto 3000 en uso"**
→ Agrega `PORT=3001` al archivo `.env` y accede a `http://localhost:3001`

**El análisis IA da error**
→ Verifica que tu API key sea válida en [console.anthropic.com](https://console.anthropic.com) → tiene crédito disponible.

---

## Cuando quieras subir a la nube

Sigue las instrucciones del `README.md` para el deploy en Vercel.
Recuerda configurar las variables de entorno en el panel de Vercel
(la key, SESSION_SECRET, usuarios y ALLOWED_ORIGIN).
