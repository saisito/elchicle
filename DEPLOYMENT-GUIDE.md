# 🚀 Guía de Despliegue - ElChicle Bot

Bot de música Discord con soporte para YouTube usando discord.js + DisTube + yt-dlp.

## Despliegue Rápido en Railway

### Requisitos
- Cuenta en [Railway.app](https://railway.app)
- Token de Discord Bot

### Pasos

1. **Crear proyecto en Railway**
   - Nuevo proyecto → "Deploy from Docker Image"

2. **Configurar imagen Docker**
   - Image: `saisito/elchicle:latest`
   - Esperar a que el build termine

3. **Configurar Variables de Entorno**
   
   Ir a **Variables** y agregar:
   ```
   DISCORD_TOKEN = tu_token_discord_aqui
   PORT = 3000
   YT_DLP_COOKIES_URL = https://gist.githubusercontent.com/saisito/e14d2a27b8deeaf6ad6f28f092612868/raw/cookies.txt
   ```

4. **Deploy**
   - Railway hará deploy automáticamente
   - El bot debería estar online en ~30 segundos

## Características

✅ Reproducción de YouTube (con cookies)  
✅ Soporte para playlists  
✅ Auto-desconexión del canal después de 1 minuto sin usuarios  
✅ Comandos: !play, !skip, !pause, !resume, !queue, !loop, !interrupt  
✅ Health check integrado (GET /health)

## Comandos del Bot

| Comando | Descripción |
|---------|------------|
| `!help` | Muestra todos los comandos |
| `!play <canción>` | Reproduce una canción de YouTube |
| `!skip` | Salta a la siguiente canción |
| `!pause` | Pausa la reproducción |
| `!resume` | Reanuda la reproducción |
| `!queue` | Muestra la cola de reproducción |
| `!loop [off\|song\|queue]` | Activa/desactiva loop |
| `!interrupt` | Detiene reproducción y limpia la cola |
| `!shuffle` | Mezcla la cola aleatoriamente |

## Variables de Entorno

### Requeridas
- **DISCORD_TOKEN**: Token del bot de Discord

### Opcionales
- **PORT**: Puerto HTTP (default: 3000)
- **YT_DLP_COOKIES_URL**: URL a archivo cookies.txt para YouTube

## Arquitectura

```
Dockerfile → Docker Hub (saisito/elchicle:latest)
                ↓
         Railway Deploy
                ↓
         Bot en Discord
```

### Docker
- Base: Node.js 22.19.0-slim
- Incluye: FFmpeg 5.1.8, yt-dlp v2025.09.26, Python 3.11
- Usuario no-root: `appuser`

### Bot
- Framework: discord.js v14.14.1
- Reproductor: DisTube v5.0.7
- Extractor: @distube/yt-dlp

## Desarrollo Local

```bash
# Instalar dependencias
cd dev-env
npm install

# Crear .env
echo "TOKEN=tu_token_aqui" > ../.env

# Ejecutar bot
node index.js
```

---

**Estado**: ✅ Producción Lista
