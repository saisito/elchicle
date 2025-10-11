# 🐳 ElChicle - Guía Docker

Esta guía te permite crear una imagen Docker completamente portable de ElChicle que funcionará en cualquier sistema.

## 📋 Prerrequisitos

1. **Docker Desktop** instalado desde: https://www.docker.com/products/docker-desktop/
2. **Git** (para clonar el repositorio)

## 🚀 Construcción Rápida

### Opción 1: Script Automático (Recomendado)
```powershell
# Construir y exportar en un solo comando
.\build-docker.ps1 -Action all
```

### Opción 2: Comandos Manuales
```bash
# Construir la imagen
docker build -t elchicle:latest .

# Exportar la imagen para transportar
docker save elchicle:latest -o elchicle-docker-image.tar
```

## 📦 Contenido de la Imagen

La imagen Docker incluye:
- ✅ Node.js 22.19.0
- ✅ Python 3 + yt-dlp (versión exacta)
- ✅ FFmpeg para procesamiento de audio
- ✅ Todas las dependencias npm
- ✅ Patches aplicados automáticamente
- ✅ Variables de entorno optimizadas

## 🔧 Configuración para Producción

### 1. Crear archivo de variables de entorno
```bash
# Crear .env
echo "DISCORD_TOKEN=tu_token_aqui" > .env
```

### 2. Ejecutar el contenedor
```bash
# Ejecutar con variables de entorno
docker run -d \
  --name elchicle-bot \
  --env-file .env \
  -p 3000:3000 \
  elchicle:latest
```

## 📤 Transportar la Imagen

### Exportar imagen
```bash
docker save elchicle:latest -o elchicle-docker-image.tar
```

### Importar en otro sistema
```bash
# En el sistema destino
docker load -i elchicle-docker-image.tar
```

## 🔍 Comandos Útiles

### Ver logs del contenedor
```bash
docker logs elchicle-bot
```

### Entrar al contenedor (debug)
```bash
docker exec -it elchicle-bot /bin/bash
```

### Detener el bot
```bash
docker stop elchicle-bot
```

### Eliminar contenedor
```bash
docker rm elchicle-bot
```

## 🎯 Despliegue en Servicios Cloud

### Railway
1. Conecta tu repositorio GitHub
2. Railway detectará automáticamente el Dockerfile
3. Configura la variable `DISCORD_TOKEN` en el dashboard

### Heroku
```bash
# Login y crear app
heroku login
heroku create tu-app-name

# Configurar variables
heroku config:set DISCORD_TOKEN=tu_token_aqui

# Deploy usando container registry
heroku container:login
heroku container:push web
heroku container:release web
```

### Google Cloud Run
```bash
# Subir imagen a Container Registry
docker tag elchicle:latest gcr.io/tu-proyecto/elchicle
docker push gcr.io/tu-proyecto/elchicle

# Deploy
gcloud run deploy elchicle \
  --image gcr.io/tu-proyecto/elchicle \
  --platform managed \
  --region us-central1 \
  --set-env-vars DISCORD_TOKEN=tu_token_aqui
```

## 🛠 Desarrollo Local

### Modo desarrollo con volúmenes
```bash
# Montar código local para desarrollo
docker run -it --rm \
  -v ${PWD}:/app \
  -w /app \
  --env-file .env \
  -p 3000:3000 \
  elchicle:latest
```

## 📊 Información de la Imagen

```bash
# Ver tamaño e información
docker images elchicle:latest

# Ver historial de capas
docker history elchicle:latest

# Inspeccionar imagen
docker inspect elchicle:latest
```

## 🔒 Seguridad

- ✅ Imagen basada en Node.js oficial slim
- ✅ Usuario no-root para ejecución
- ✅ Variables de entorno separadas del código
- ✅ Dependencias con versiones fijas
- ✅ Sin archivos sensibles en la imagen

## 🆘 Solución de Problemas

### Error de token inválido
```bash
# Verificar variables de entorno
docker exec elchicle-bot env | grep DISCORD
```

### Problemas de audio
```bash
# Verificar ffmpeg
docker exec elchicle-bot ffmpeg -version

# Verificar yt-dlp
docker exec elchicle-bot yt-dlp --version
```

### Ver logs detallados
```bash
# Logs en tiempo real
docker logs -f elchicle-bot

# Últimas 100 líneas
docker logs --tail 100 elchicle-bot
```

---

## 💡 Ventajas de esta Solución

1. **Portabilidad Total**: Funciona en cualquier sistema con Docker
2. **Dependencias Fijas**: Mismas versiones en dev y producción
3. **Fácil Despliegue**: Un solo archivo .tar contiene todo
4. **Escalabilidad**: Fácil de replicar y escalar
5. **Aislamiento**: No interfiere con el sistema host