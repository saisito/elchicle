# 🚀 Guía de Despliegue en Producción - ElChicle Bot

Esta guía te ayudará a desplegar tu bot de música en producción con Docker, incluyendo configuraciones para evitar problemas con YouTube.

## 📋 Prerrequisitos

1. **Docker y Docker Compose instalados**
2. **Token de Discord configurado**
3. **Acceso a un servidor (VPS, Railway, etc.)**

## 🛠️ Pasos de Despliegue

### 1. Preparar el Entorno

```powershell
# Clonar el repositorio (si no lo tienes)
git clone <tu-repositorio>
cd elchicle

# Verificar que dev-env está funcionando
cd dev-env
npm install
# Probar localmente: node index.js

# Volver al directorio raíz
cd ..
```

### 2. Configurar Variables de Entorno

```powershell
# Copiar el archivo de ejemplo
cp .env.production.example .env

# Editar las variables necesarias
# Mínimo requerido: DISCORD_TOKEN
```

**Variables importantes:**
```bash
DISCORD_TOKEN=tu_token_de_discord_aqui
PORT=3000
NODE_ENV=production
```

### 3. Configurar Cookies de YouTube (Recomendado)

Para evitar problemas de detección de bot:

```powershell
# Crear directorio para cookies
mkdir cookies

# Extraer cookies usando yt-dlp (requiere tener Chrome con sesión de YouTube activa)
yt-dlp --cookies-from-browser chrome --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# O seguir la guía detallada en COOKIES-GUIDE.md
```

Luego descomenta en `.env`:
```bash
YT_DLP_COOKIES=/app/cookies/youtube.txt
```

### 4. Construir la Imagen de Producción

```powershell
# Otorgar permisos de ejecución al script
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Construir la imagen (limpia cache anterior)
.\build-production.ps1 build -Clean

# Verificar que la imagen se construyó correctamente
docker images elchicle:production
```

### 5. Probar Localmente

```powershell
# Ejecutar el contenedor
.\build-production.ps1 run

# Verificar logs
.\build-production.ps1 logs

# Verificar estado
.\build-production.ps1 status

# Detener cuando termines de probar
docker-compose -f docker-compose.production.yml down
```

### 6. Desplegar en Servidor Remoto

#### Opción A: VPS/Servidor Propio

```bash
# En el servidor, instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Transferir archivos necesarios
scp -r ./ usuario@servidor:/path/to/elchicle/

# En el servidor
cd /path/to/elchicle
chmod +x build-production.ps1

# Construir y ejecutar
./build-production.ps1 build
./build-production.ps1 run
```

#### Opción B: Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y configurar
railway login
railway init
railway link

# Configurar variables de entorno
railway variables set DISCORD_TOKEN=tu_token_aqui
railway variables set NODE_ENV=production

# Deploy
railway up
```

#### Opción C: Registro de Imágenes (Docker Hub, GitHub Packages)

```powershell
# Construir y subir imagen
.\build-production.ps1 build
.\build-production.ps1 push -Registry "tu-usuario/elchicle"

# En el servidor destino
docker pull tu-usuario/elchicle:production
docker-compose -f docker-compose.production.yml up -d
```

## 🔧 Configuración Avanzada

### Variables de Entorno Completas

```bash
# Obligatorias
DISCORD_TOKEN=tu_token_aqui
PORT=3000

# YouTube Anti-Bot
YT_DLP_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
YT_DLP_REFERER=https://www.youtube.com/
YT_DLP_COOKIES=/app/cookies/youtube.txt

# Optimizaciones
PYTHONWARNINGS=ignore
YTDL_NO_UPDATE=1
YT_DLP_NO_UPDATE=1
PYTHONIOENCODING=utf-8
LANG=C.UTF-8
LC_ALL=C.UTF-8
```

### Límites de Recursos

En `docker-compose.production.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 512M      # Ajustar según tu servidor
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Persistencia de Datos

```yaml
volumes:
  - ./cookies:/app/cookies:ro    # Cookies de YouTube
  - ./logs:/app/logs             # Logs persistentes
```

## 📊 Monitoreo y Mantenimiento

### Health Check

```bash
# Verificar que el bot está respondiendo
curl http://localhost:3000/health

# Ver estado del contenedor
docker ps
docker inspect elchicle-production --format='{{.State.Health.Status}}'
```

### Logs

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.production.yml logs -f

# Ver logs específicos
docker logs elchicle-production

# Logs con filtros
docker logs elchicle-production 2>&1 | grep ERROR
```

### Renovar Cookies

```bash
# Script para renovar cookies automáticamente (ejecutar cada 7-14 días)
#!/bin/bash
cd /path/to/elchicle
yt-dlp --cookies-from-browser chrome --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
docker-compose -f docker-compose.production.yml restart elchicle-production
echo "Cookies renovadas: $(date)" >> ./logs/cookies-renewal.log
```

### Actualizaciones

```bash
# Actualizar el bot
git pull origin main
.\build-production.ps1 build -Clean
.\build-production.ps1 run

# O con downtime mínimo
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **"Sign in to confirm you're not a bot"**
   ```bash
   # Renovar cookies
   yt-dlp --cookies-from-browser chrome --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=test"
   ```

2. **Error de FFmpeg**
   ```bash
   # Verificar instalación en el contenedor
   docker exec elchicle-production ffmpeg -version
   ```

3. **Bot no responde**
   ```bash
   # Verificar logs
   docker logs elchicle-production
   
   # Verificar health check
   curl http://localhost:3000/health
   ```

4. **Problemas de memoria**
   ```bash
   # Ajustar límites en docker-compose.production.yml
   deploy:
     resources:
       limits:
         memory: 1G  # Aumentar si es necesario
   ```

### Verificación del Despliegue

```bash
# Checklist de verificación
curl http://localhost:3000/health                    # ✅ Health check
docker ps | grep elchicle                           # ✅ Contenedor ejecutándose
docker logs elchicle-production | grep "Bot conectado" # ✅ Bot conectado a Discord
docker exec elchicle-production yt-dlp --version    # ✅ yt-dlp funcional
docker exec elchicle-production ffmpeg -version     # ✅ FFmpeg funcional
```

## 📚 Recursos Adicionales

- [Guía de Cookies](./COOKIES-GUIDE.md)
- [Configuración de VPS](./VPS-SETUP.md)
- [Docker Troubleshooting](./DOCKER.md)

## 🔒 Seguridad

- ✅ Usuario no-root en contenedor
- ✅ Cookies en volumen de solo lectura
- ✅ Variables de entorno para secrets
- ✅ Límites de recursos configurados
- ✅ Health checks activos

---

💡 **Consejo:** Guarda esta configuración en un repositorio privado y documenta cualquier personalización específica para tu entorno.