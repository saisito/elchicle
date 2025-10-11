# 🤖 ElChicle Discord Bot - Guía de Instalación en VPS

## 📋 Requisitos del servidor
- VPS con Ubuntu/Debian/CentOS
- Mínimo 1GB RAM
- Docker instalado
- Acceso SSH al servidor

## 🐳 Instalación de Docker (si no está instalado)

### Ubuntu/Debian:
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Reiniciar sesión o usar:
newgrp docker

# Verificar instalación
docker --version
```

### CentOS/RHEL:
```bash
# Instalar Docker
sudo yum install -y docker

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar usuario al grupo
sudo usermod -aG docker $USER
```

## 🚀 Ejecutar el Bot ElChicle

### Paso 1: Descargar la imagen
```bash
docker pull saisito/elchicle:latest
```

### Paso 2: Ejecutar el bot
```bash
docker run -d \
  --name elchicle-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=TU_TOKEN_DE_DISCORD_AQUI \
  saisito/elchicle:latest
```

### Paso 3: Verificar que está funcionando
```bash
# Ver logs del bot
docker logs elchicle-bot

# Ver si está ejecutándose
docker ps
```

## 📝 Configuración con archivo .env (Recomendado)

### Crear archivo de configuración:
```bash
# Crear archivo .env
cat > .env << 'EOF'
DISCORD_TOKEN=TU_TOKEN_DE_DISCORD_AQUI
PORT=3000
NODE_ENV=production
EOF
```

### Ejecutar con archivo de configuración:
```bash
docker run -d \
  --name elchicle-bot \
  --restart unless-stopped \
  --env-file .env \
  saisito/elchicle:latest
```

## 🔧 Comandos de administración

### Ver logs en tiempo real:
```bash
docker logs -f elchicle-bot
```

### Detener el bot:
```bash
docker stop elchicle-bot
```

### Reiniciar el bot:
```bash
docker restart elchicle-bot
```

### Eliminar el bot:
```bash
docker stop elchicle-bot
docker rm elchicle-bot
```

### Actualizar a nueva versión:
```bash
# Detener bot actual
docker stop elchicle-bot
docker rm elchicle-bot

# Descargar nueva versión
docker pull saisito/elchicle:latest

# Ejecutar nueva versión
docker run -d \
  --name elchicle-bot \
  --restart unless-stopped \
  --env-file .env \
  saisito/elchicle:latest
```

## 🔍 Solución de problemas

### El bot no se conecta:
```bash
# Verificar logs
docker logs elchicle-bot

# Error común: Token inválido
# Solución: Verificar que el token sea correcto en .env
```

### Bot se detiene solo:
```bash
# Ver por qué se detuvo
docker logs elchicle-bot

# Reiniciar
docker restart elchicle-bot
```

### Verificar recursos del servidor:
```bash
# Ver uso de memoria y CPU
docker stats elchicle-bot

# Ver espacio en disco
df -h
```

## ⚡ Configuración automática con docker-compose (Avanzado)

### Crear docker-compose.yml:
```yaml
version: '3.8'

services:
  elchicle:
    image: saisito/elchicle:latest
    container_name: elchicle-bot
    restart: unless-stopped
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - NODE_ENV=production
    env_file:
      - .env
```

### Ejecutar con docker-compose:
```bash
# Instalar docker-compose si no está
sudo apt install docker-compose -y

# Ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## 🛡️ Configuración de firewall (Opcional)

Si tu VPS tiene firewall activo:
```bash
# UFW (Ubuntu)
sudo ufw allow 3000

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `docker logs elchicle-bot`
2. Verifica que Docker esté funcionando: `docker ps`
3. Confirma que el token sea válido
4. Reinicia el bot: `docker restart elchicle-bot`

## ✅ Resultado esperado

Cuando todo funcione correctamente, verás en los logs:
```
HTTP server listening on 3000
✅ Bot conectado como Elchicle#5748
✅ FFmpeg configurado correctamente
✅ Lista de pruebas cargada con 1 canciones
```

¡El bot estará listo para usar comandos de música en Discord! 🎵