#!/usr/bin/env pwsh
# Build and Deploy Script for ElChicle Production
# Este script construye la imagen de Docker optimizada para producción

param(
    [string]$Action = "build",
    [string]$Tag = "elchicle:production",
    [switch]$Push = $false,
    [string]$Registry = "",
    [switch]$Clean = $false
)

Write-Host "🎵 ElChicle Production Build Script" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "dev-env/package.json")) {
    Write-Error "❌ Error: No se encuentra dev-env/package.json. Ejecuta desde la raíz del proyecto."
    exit 1
}

# Verificar que Docker esté ejecutándose
try {
    docker version | Out-Null
} catch {
    Write-Error "❌ Error: Docker no está ejecutándose o no está instalado."
    exit 1
}

switch ($Action.ToLower()) {
    "build" {
        Write-Host "📦 Construyendo imagen de producción..." -ForegroundColor Yellow
        
        # Limpiar imágenes anteriores si se solicita
        if ($Clean) {
            Write-Host "🧹 Limpiando imágenes anteriores..." -ForegroundColor Yellow
            docker rmi $Tag -f 2>$null
            docker system prune -f
        }
        
        # Construir la imagen
        $buildCommand = "docker build -f Dockerfile.production -t $Tag --no-cache ."
        Write-Host "Ejecutando: $buildCommand" -ForegroundColor Cyan
        Invoke-Expression $buildCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagen construida exitosamente: $Tag" -ForegroundColor Green
            
            # Mostrar información de la imagen
            Write-Host "`n📊 Información de la imagen:" -ForegroundColor Yellow
            docker images $Tag.Split(':')[0]
            
            # Verificar que funciona
            Write-Host "`n🔍 Verificando la imagen..." -ForegroundColor Yellow
            docker run --rm $Tag node --version
            docker run --rm $Tag yt-dlp --version
            docker run --rm $Tag ffmpeg -version 2>&1 | Select-String "ffmpeg version"
        } else {
            Write-Error "❌ Error al construir la imagen"
            exit 1
        }
    }
    
    "run" {
        Write-Host "🚀 Ejecutando contenedor de producción..." -ForegroundColor Yellow
        
        # Verificar que existe .env o variables necesarias
        if (-not $env:DISCORD_TOKEN) {
            Write-Warning "⚠️  Advertencia: No se encontró DISCORD_TOKEN en las variables de entorno"
            Write-Host "Asegúrate de tener configurado DISCORD_TOKEN antes de ejecutar" -ForegroundColor Yellow
        }
        
        # Ejecutar con docker-compose
        docker-compose -f docker-compose.production.yml up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Contenedor iniciado exitosamente" -ForegroundColor Green
            Write-Host "📊 Estado del contenedor:" -ForegroundColor Yellow
            docker-compose -f docker-compose.production.yml ps
            
            Write-Host "`n📋 Para ver logs:" -ForegroundColor Cyan
            Write-Host "docker-compose -f docker-compose.production.yml logs -f elchicle-production"
            
            Write-Host "`n⛔ Para detener:" -ForegroundColor Cyan
            Write-Host "docker-compose -f docker-compose.production.yml down"
        }
    }
    
    "push" {
        if ($Registry -eq "") {
            Write-Error "❌ Error: Especifica el registry con -Registry"
            exit 1
        }
        
        $remoteTag = "$Registry/$Tag"
        Write-Host "📤 Subiendo imagen a $remoteTag..." -ForegroundColor Yellow
        
        docker tag $Tag $remoteTag
        docker push $remoteTag
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagen subida exitosamente: $remoteTag" -ForegroundColor Green
        }
    }
    
    "clean" {
        Write-Host "🧹 Limpiando recursos de Docker..." -ForegroundColor Yellow
        docker-compose -f docker-compose.production.yml down -v
        docker rmi $Tag -f 2>$null
        docker system prune -f
        Write-Host "✅ Limpieza completada" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "📋 Mostrando logs del contenedor..." -ForegroundColor Yellow
        docker-compose -f docker-compose.production.yml logs -f elchicle-production
    }
    
    "status" {
        Write-Host "📊 Estado del contenedor:" -ForegroundColor Yellow
        docker-compose -f docker-compose.production.yml ps
        
        Write-Host "`n🔍 Health check:" -ForegroundColor Yellow
        $healthStatus = docker inspect elchicle-production --format='{{.State.Health.Status}}' 2>$null
        if ($healthStatus) {
            Write-Host "Health Status: $healthStatus" -ForegroundColor Green
        } else {
            Write-Host "Health Status: No disponible (contenedor no ejecutándose)" -ForegroundColor Yellow
        }
    }
    
    default {
        Write-Host "📖 Uso del script:" -ForegroundColor Cyan
        Write-Host "  .\build-production.ps1 build    # Construir imagen"
        Write-Host "  .\build-production.ps1 run      # Ejecutar contenedor"
        Write-Host "  .\build-production.ps1 push     # Subir a registry"
        Write-Host "  .\build-production.ps1 clean    # Limpiar recursos"
        Write-Host "  .\build-production.ps1 logs     # Ver logs"
        Write-Host "  .\build-production.ps1 status   # Ver estado"
        Write-Host ""
        Write-Host "Opciones adicionales:" -ForegroundColor Yellow
        Write-Host "  -Clean           # Limpiar antes de construir"
        Write-Host "  -Registry <url>  # Registry para push"
        Write-Host "  -Tag <tag>       # Tag personalizado"
        Write-Host ""
        Write-Host "Ejemplos:" -ForegroundColor Green
        Write-Host "  .\build-production.ps1 build -Clean"
        Write-Host "  .\build-production.ps1 push -Registry 'myregistry.com'"
    }
}