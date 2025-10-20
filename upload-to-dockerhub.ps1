# Script para subir ElChicle Bot a Docker Hub
param(
    [Parameter(Mandatory=$true)]
    [string]$DockerUser,
    
    [string]$ImageName = "elchicle",
    [string]$Tag = "latest",
    [switch]$Build = $true,
    [switch]$Push = $true,
    [switch]$Login = $false
)

Write-Host "🐳 ElChicle Docker Hub Upload Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Verificar que Docker está ejecutándose
Write-Host "🔍 Verificando Docker..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker está ejecutándose" -ForegroundColor Green
} catch {
    Write-Error "❌ Docker no está ejecutándose. Inicia Docker Desktop y vuelve a intentar."
    exit 1
}

# Verificar archivos necesarios
if (-not (Test-Path "Dockerfile.production")) {
    Write-Error "❌ No se encontró Dockerfile.production"
    exit 1
}

if (-not (Test-Path "dev-env/package.json")) {
    Write-Error "❌ No se encontró dev-env/package.json"
    exit 1
}

$FullImageName = "${DockerUser}/${ImageName}:${Tag}"

# Login si se solicita
if ($Login) {
    Write-Host "🔐 Haciendo login en Docker Hub..." -ForegroundColor Yellow
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Error en el login de Docker Hub"
        exit 1
    }
}

# Construir imagen
if ($Build) {
    Write-Host "🔨 Construyendo imagen: $FullImageName" -ForegroundColor Yellow
    docker build -f Dockerfile.production -t $FullImageName .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Error al construir la imagen"
        exit 1
    }
    
    Write-Host "✅ Imagen construida exitosamente" -ForegroundColor Green
    
    # Mostrar tamaño de la imagen
    Write-Host "📊 Información de la imagen:" -ForegroundColor Cyan
    docker images $FullImageName
}

# Verificar imagen
Write-Host "🧪 Verificando imagen..." -ForegroundColor Yellow
docker run --rm $FullImageName node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Imagen verificada correctamente" -ForegroundColor Green
} else {
    Write-Error "❌ Error al verificar la imagen"
    exit 1
}

# Subir imagen
if ($Push) {
    Write-Host "📤 Subiendo imagen a Docker Hub..." -ForegroundColor Yellow
    Write-Host "Imagen: $FullImageName" -ForegroundColor Cyan
    
    docker push $FullImageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Imagen subida exitosamente a Docker Hub!" -ForegroundColor Green
        Write-Host "🌐 Disponible en: https://hub.docker.com/r/$DockerUser/$ImageName" -ForegroundColor Cyan
        
        Write-Host "`n📋 Para usar la imagen:" -ForegroundColor Yellow
        Write-Host "docker pull $FullImageName" -ForegroundColor White
        Write-Host "docker run -e DISCORD_TOKEN=tu_token $FullImageName" -ForegroundColor White
    } else {
        Write-Error "❌ Error al subir la imagen"
        exit 1
    }
}

Write-Host "`n🎉 ¡Proceso completado!" -ForegroundColor Green