#!/bin/bash

# 🤖 ElChicle Discord Bot - Script de Instalación Automática para VPS
# Uso: curl -fsSL https://raw.githubusercontent.com/saisito/elchicle/master/install.sh | bash

set -e

echo "🤖 ElChicle Discord Bot - Instalador VPS"
echo "========================================"

# Verificar si es root
if [ "$EUID" -eq 0 ]; then
    echo "❌ No ejecutes este script como root. Usa un usuario normal."
    exit 1
fi

# Función para detectar el sistema operativo
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
}

# Instalar Docker
install_docker() {
    echo "🐳 Instalando Docker..."
    
    if command -v docker &> /dev/null; then
        echo "✅ Docker ya está instalado"
        return
    fi
    
    # Instalar Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Agregar usuario al grupo docker
    sudo usermod -aG docker $USER
    
    echo "✅ Docker instalado correctamente"
    echo "⚠️  Necesitas cerrar sesión y volver a entrar, o ejecutar: newgrp docker"
}

# Configurar el bot
setup_bot() {
    echo "🤖 Configurando ElChicle Bot..."
    
    # Crear directorio para el bot
    mkdir -p ~/elchicle-bot
    cd ~/elchicle-bot
    
    # Solicitar token de Discord
    echo ""
    echo "🔑 Necesito el token de Discord del bot:"
    echo "   1. Ve a https://discord.com/developers/applications"
    echo "   2. Selecciona tu aplicación"
    echo "   3. Ve a 'Bot' → 'Token'"
    echo "   4. Copia el token"
    echo ""
    read -p "Pega tu token de Discord aquí: " DISCORD_TOKEN
    
    if [ -z "$DISCORD_TOKEN" ]; then
        echo "❌ Token no puede estar vacío"
        exit 1
    fi
    
    # Crear archivo .env
    cat > .env << EOF
DISCORD_TOKEN=$DISCORD_TOKEN
PORT=3000
NODE_ENV=production
EOF
    
    echo "✅ Configuración guardada"
}

# Ejecutar el bot
run_bot() {
    echo "🚀 Descargando y ejecutando ElChicle Bot..."
    
    # Detener bot existente si existe
    docker stop elchicle-bot 2>/dev/null || true
    docker rm elchicle-bot 2>/dev/null || true
    
    # Descargar imagen
    docker pull saisito/elchicle:latest
    
    # Ejecutar bot
    docker run -d \
        --name elchicle-bot \
        --restart unless-stopped \
        --env-file .env \
        saisito/elchicle:latest
    
    echo "✅ ElChicle Bot ejecutándose"
}

# Verificar estado
check_status() {
    echo "🔍 Verificando estado del bot..."
    sleep 5
    
    if docker ps | grep -q elchicle-bot; then
        echo "✅ Bot está ejecutándose correctamente"
        echo ""
        echo "📋 Ver logs del bot:"
        echo "   docker logs elchicle-bot"
        echo ""
        echo "📋 Ver logs en tiempo real:"
        echo "   docker logs -f elchicle-bot"
        echo ""
        echo "📋 Detener el bot:"
        echo "   docker stop elchicle-bot"
        echo ""
        echo "📋 Reiniciar el bot:"
        echo "   docker restart elchicle-bot"
        echo ""
        echo "🎵 ¡El bot está listo para usar en Discord!"
    else
        echo "❌ El bot no se está ejecutando. Revisa los logs:"
        echo "   docker logs elchicle-bot"
    fi
}

# Función principal
main() {
    detect_os
    echo "🖥️  Sistema detectado: $OS $VER"
    echo ""
    
    install_docker
    setup_bot
    run_bot
    check_status
}

# Ejecutar instalación
main