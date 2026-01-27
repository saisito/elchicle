# 🚀 Deploy en JustRunMyApp - ElChicle Bot

## Variables requeridas (configurar en el panel)

### 1. DISCORD_TOKEN (OBLIGATORIO)
Tu token de Discord bot. Obténlo de: https://discord.com/developers/applications

### 2. YT_DLP_COOKIES_URL (OBLIGATORIO)
URL raw de tu archivo de cookies de YouTube.

**URL configurada**: `https://gist.githubusercontent.com/saisito/e14d2a27b8deeaf6ad6f28f092612868/raw/cookies.txt`

**Cómo obtener cookies:**
1. Instala extensión "Get cookies.txt LOCALLY" en Chrome/Firefox
2. Ve a youtube.com y haz login
3. Exporta cookies con la extensión
4. Sube el archivo `cookies.txt` a un GitHub Gist
5. Copia la URL RAW (botón "Raw" en el Gist)
6. Pega esa URL en `YT_DLP_COOKIES_URL`

**IMPORTANTE**: La URL debe terminar en `/raw` o `/raw/cookies.txt`

### 3. Variables opcionales
El resto se configuran automáticamente. Todas las variables anti-bot ya están en el Dockerfile.

## Cómo desplegar

### Método 1: Git Push (recomendado)
```bash
cd d:\code_testing\elchicle
git remote add justrunmy https://USUARIO:TOKEN@justrunmy.app/git/r_XXXXX
git push justrunmy HEAD:deploy
```

### Método 2: ZIP Upload
```powershell
cd d:\code_testing\elchicle
.\pack-justrunmy.ps1
# Sube justrunmy-elchicle.zip en el panel
```

## Verificación

1. En el panel, ve a "Logs" - deberías ver:
   ```
   [entrypoint] ✅ Cookies downloaded successfully
   [entrypoint] ✅ Cookies file present: /app/cookies/youtube.txt
   ⚙️ Detected cookies file at /app/cookies/youtube.txt
   HTTP server listening on 3000
   ```

2. El health check debe responder OK en: `https://tu-app.justrunmy.app/health`

3. En Discord, el bot debe aparecer online

## Troubleshooting

### Error: "Sign in to confirm you're not a bot"
**Causa**: Las cookies no se descargaron o la URL es incorrecta

**Solución**:
1. Verifica que `YT_DLP_COOKIES_URL` esté configurada en el panel
2. Asegúrate de que la URL sea pública y termine en `/raw`
3. Prueba abrir la URL en el navegador - debe descargar un archivo de texto
4. Reinicia la app después de configurar la variable

### Error: "failed to download cookies"
**Causa**: La URL no es accesible o el Gist es privado

**Solución**:
1. Haz el Gist público
2. Copia la URL RAW (no la URL del Gist)
3. Si es privado, añade variable `GITHUB_TOKEN` con un PAT (Personal Access Token)

### El bot no aparece online
**Causa**: DISCORD_TOKEN incorrecto o sin permisos

**Solución**:
1. Verifica el token en Discord Developer Portal
2. Regenera el token si es necesario
3. Asegúrate de que el bot está invitado al servidor con permisos correctos

### Build falla
**Causa**: Falta algún archivo del proyecto

**Solución**:
1. Asegúrate de tener todos los archivos: `Dockerfile`, `dev-env/`, `scripts/`
2. Haz git push de nuevo o regenera el ZIP

## Comandos útiles

Después de configurar, prueba en Discord:
- `/play https://youtube.com/watch?v=...` - Reproducir una canción
- `/queue` - Ver cola
- `/skip` - Saltar canción
- `/stop` - Detener reproducción
