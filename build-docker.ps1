# Script para construir y exportar la imagen Docker de ElChicle
# Requiere Docker Desktop instalado

param(
    [string]$Action = "build",
    [string]$ImageName = "elchicle",
    [string]$Tag = "latest",
    [string]$ExportPath = ".\elchicle-docker-image.tar"
)

Write-Host "=== ElChicle Docker Builder ===" -ForegroundColor Green
Write-Host "Acción: $Action" -ForegroundColor Yellow
Write-Host "Imagen: ${ImageName}:${Tag}" -ForegroundColor Yellow

# Verificar que Docker está disponible
try {
    $dockerVersion = docker --version
    Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

switch ($Action) {
    "build" {
        Write-Host "`n🔨 Construyendo imagen Docker..." -ForegroundColor Cyan
        docker build -t "${ImageName}:${Tag}" .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Imagen construida exitosamente!" -ForegroundColor Green
            Write-Host "`nPara exportar la imagen, ejecuta:" -ForegroundColor Yellow
            Write-Host ".\build-docker.ps1 -Action export" -ForegroundColor White
        } else {
            Write-Host "❌ Error al construir la imagen" -ForegroundColor Red
            exit 1
        }
    }
    
    "export" {
        Write-Host "`n📦 Exportando imagen Docker..." -ForegroundColor Cyan
        docker save "${ImageName}:${Tag}" -o $ExportPath
        if ($LASTEXITCODE -eq 0) {
            $fileSize = (Get-Item $ExportPath).Length / 1MB
            Write-Host "✅ Imagen exportada a: $ExportPath" -ForegroundColor Green
            Write-Host "📏 Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
            Write-Host "`nPara importar en otro sistema:" -ForegroundColor Yellow
            Write-Host "docker load -i $ExportPath" -ForegroundColor White
        } else {
            Write-Host "❌ Error al exportar la imagen" -ForegroundColor Red
            exit 1
        }
    }
    
    "all" {
        Write-Host "`n🚀 Construyendo y exportando imagen..." -ForegroundColor Cyan
        & $PSCommandPath -Action build -ImageName $ImageName -Tag $Tag
        if ($LASTEXITCODE -eq 0) {
            & $PSCommandPath -Action export -ImageName $ImageName -Tag $Tag -ExportPath $ExportPath
        }
    }
    
    "run" {
        Write-Host "`n🏃 Ejecutando contenedor de prueba..." -ForegroundColor Cyan
        Write-Host "NOTA: Necesitarás configurar las variables de entorno" -ForegroundColor Yellow
        docker run -it --rm -p 3000:3000 "${ImageName}:${Tag}"
    }
    
    "info" {
        Write-Host "`n📋 Información de la imagen:" -ForegroundColor Cyan
        docker images "${ImageName}:${Tag}"
        Write-Host "`n📋 Historial de capas:" -ForegroundColor Cyan
        docker history "${ImageName}:${Tag}"
    }
    
    default {
        Write-Host "`n❓ Uso del script:" -ForegroundColor Yellow
        Write-Host ".\build-docker.ps1 -Action build    # Construir imagen" -ForegroundColor White
        Write-Host ".\build-docker.ps1 -Action export   # Exportar imagen a .tar" -ForegroundColor White
        Write-Host ".\build-docker.ps1 -Action all      # Construir y exportar" -ForegroundColor White
        Write-Host ".\build-docker.ps1 -Action run      # Ejecutar contenedor de prueba" -ForegroundColor White
        Write-Host ".\build-docker.ps1 -Action info     # Mostrar información de la imagen" -ForegroundColor White
    }
}