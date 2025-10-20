# 🛠️ Solución Temporal para Opciones Deprecadas

## Problema Identificado

El plugin `@distube/yt-dlp` v2.0.1 usa internamente `--no-call-home` que está deprecado en yt-dlp moderno.

## ✅ Soluciones Implementadas

### 1. Parche de Interceptor
- Creamos `patch-advanced.js` que intercepta las llamadas a `spawn`
- Filtra automáticamente las opciones deprecadas
- Se ejecuta en `postinstall`

### 2. Variables de Entorno Mejoradas

**Añade estas variables adicionales en Koyeb:**

```
YT_DLP_IGNORE_CONFIG=true
YT_DLP_NO_CONFIG_LOCATIONS=true
YT_DLP_SKIP_DOWNLOAD=true
YT_DLP_SIMULATE=false
YT_DLP_QUIET=true
```

### 3. Configuración Completa para Koyeb

**Variables Obligatorias:**
```
DISCORD_TOKEN=tu_token_de_discord_aqui
PORT=3000
NODE_ENV=production
YT_DLP_COOKIES_URL=https://gist.githubusercontent.com/saisito/83a292e608f72d50c3cccfbf39487b74/raw
```

**Variables Anti-Deprecación (TODAS IMPORTANTES):**
```
YT_DLP_NO_CALL_HOME=false
YT_DLP_EXTRACT_FLAT=false
YT_DLP_IGNORE_ERRORS=true
YT_DLP_NO_WARNINGS=true
YT_DLP_IGNORE_CONFIG=true
YT_DLP_NO_CONFIG_LOCATIONS=true
YT_DLP_SKIP_DOWNLOAD=true
YT_DLP_QUIET=true
```

**Variables Anti-Bot:**
```
YT_DLP_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
YT_DLP_REFERER=https://www.youtube.com/
```

**Variables del Sistema:**
```
PYTHONWARNINGS=ignore
YTDL_NO_UPDATE=1
YT_DLP_NO_UPDATE=1
PYTHONIOENCODING=utf-8
LANG=C.UTF-8
LC_ALL=C.UTF-8
```

## 🚀 Próximos Pasos

1. **Cuando la red se estabilice:** Reconstruir imagen con `saisito/elchicle:v4-patched`
2. **Temporalmente:** Usar imagen actual + variables adicionales
3. **Verificación:** Los logs NO deberían mostrar "Deprecated Feature"

## 🎯 Resultado Esperado

```
✅ Cookies descargadas exitosamente
✅ Bot conectado como Elchicle#5748
✅ [interceptor] Filtered yt-dlp args: [...]
▶️ Reproduciendo sin errores de opciones deprecadas
```

---

**Instrucción inmediata:** Añade las 8 variables "Anti-Deprecación" adicionales en Koyeb y redeploy para probar si funciona con la imagen actual.