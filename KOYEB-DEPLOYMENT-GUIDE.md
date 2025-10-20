# 🚀 Guía Completa de Deployment - Koyeb
## ElChicle Discord Music Bot

### 📋 **PASO 1: Crear Nueva App en Koyeb**

1. **Ir a:** https://app.koyeb.com/
2. **Click:** "Create App"
3. **Nombre:** `elchicle-bot`

---

### 🐳 **PASO 2: Configuración del Contenedor**

#### **Docker Image:**
```
saisito/elchicle:v4-patched
```

#### **Port:**
```
3000
```

#### **Protocolo:**
```
HTTP
```

---

### 🔧 **PASO 3: Variables de Entorno (Environment Variables)**

**⚠️ IMPORTANTE:** Añadir TODAS estas variables una por una:

#### **🎯 CONFIGURACIÓN OBLIGATORIA:**
```
DISCORD_TOKEN=tu_token_de_discord_aqui
PORT=3000
NODE_ENV=production
```

#### **🍪 COOKIES DE YOUTUBE:**
```
YT_DLP_COOKIES_URL=https://gist.githubusercontent.com/saisito/83a292e608f72d50c3cccfbf39487b74/raw
```

#### **🛡️ ANTI-BOT YOUTUBE:**
```
YT_DLP_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
YT_DLP_REFERER=https://www.youtube.com/
```

#### **🔧 ANTI-DEPRECACIÓN (NUEVAS - CRÍTICAS):**
```
YT_DLP_NO_CALL_HOME=false
YT_DLP_EXTRACT_FLAT=false
YT_DLP_IGNORE_ERRORS=true
YT_DLP_NO_WARNINGS=true
YT_DLP_IGNORE_CONFIG=true
YT_DLP_NO_CONFIG_LOCATIONS=true
YT_DLP_SKIP_DOWNLOAD=true
YT_DLP_QUIET=true
YT_DLP_SIMULATE=false
YT_DLP_FORCE_JSON=true
YT_DLP_NO_PROGRESS=true
YT_DLP_NO_COLOR=true
```

#### **⚙️ SISTEMA:**
```
PYTHONWARNINGS=ignore
YTDL_NO_UPDATE=1
YT_DLP_NO_UPDATE=1
PYTHONIOENCODING=utf-8
LANG=C.UTF-8
LC_ALL=C.UTF-8
```

---

### 📊 **PASO 4: Configuración de Recursos**

#### **Instance Type:**
```
Nano (512MB RAM, 0.1 vCPU) - Gratuito
```

#### **Scaling:**
```
Min instances: 1
Max instances: 1
```

#### **Region:**
```
Frankfurt (fra) - Más cerca de Europa
```

---

### 🔍 **PASO 5: Health Check**

#### **Health Check Path:**
```
/health
```

#### **Health Check Port:**
```
3000
```

---

### 🚀 **PASO 6: Deploy**

1. **Revisar configuración**
2. **Click:** "Deploy"
3. **Esperar:** ~3-5 minutos

---

### ✅ **PASO 7: Verificación**

#### **Logs Esperados:**
```
🍪 Descargando cookies desde: https://gist.githubusercontent.com/...
HTTP server listening on 3000
✅ Cookies descargadas exitosamente
✅ Bot conectado como Elchicle#5748
✅ FFmpeg configurado correctamente
✅ Cookies de YouTube configuradas: /app/cookies/youtube.txt
```

#### **Health Check:**
- Status: `Healthy`
- Response: `{"status":"ok","bot":"connected","cookies":"loaded"}`

---

### 🔧 **PASO 8: Comandos de Prueba en Discord**

Una vez desplegado, probar en tu servidor:

```
/play https://youtu.be/CSvFpBOe8eY
/play System of a Down Chop Suey
/queue
/skip
/stop
```

---

### ⚠️ **TROUBLESHOOTING**

#### **Si el bot no se conecta:**
1. Verificar `DISCORD_TOKEN`
2. Revisar logs en Koyeb

#### **Si YouTube no funciona:**
1. Verificar cookies en GitHub Gist
2. Comprobar variables `YT_DLP_*`

#### **Si aparecen errores de yt-dlp:**
1. Verificar que la imagen es `v4-patched`
2. Revisar logs: `[interceptor] Filtered yt-dlp args`

---

### 📝 **NOTAS IMPORTANTES**

✅ **Imagen Probada:** `saisito/elchicle:v4-patched` funciona 100%
✅ **Patches Incluidos:** Interceptor de argumentos deprecados
✅ **Cookies Automáticas:** Se descargan al iniciar
✅ **FFmpeg Incluido:** Preinstalado en la imagen
✅ **Health Check:** Endpoint `/health` implementado

---

### 🎯 **RESUMEN RÁPIDO**

```bash
# Imagen
saisito/elchicle:v4-patched

# Puerto
3000

# Variables Críticas
DISCORD_TOKEN=tu_token_aqui
YT_DLP_COOKIES_URL=https://gist.githubusercontent.com/...
YT_DLP_IGNORE_CONFIG=true
YT_DLP_NO_CONFIG_LOCATIONS=true
```

**Total Variables:** 21 variables de entorno
**Tiempo de Deploy:** ~5 minutos
**Costo:** Gratis (Nano instance)

¡Listo para producción! 🚀