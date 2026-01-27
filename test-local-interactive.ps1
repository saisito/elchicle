# Test local de ElChicle con Docker

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Test Local de ElChicle" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Pedir token
Write-Host "Pega tu DISCORD_TOKEN y presiona Enter:" -ForegroundColor Yellow
$token = Read-Host

if (-not $token -or $token.Length -lt 50) {
    Write-Host "ERROR: Token invalido o muy corto" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "OK Token recibido: ${token.Substring(0,20)}..." -ForegroundColor Green
Write-Host ""

# Limpiar contenedores anteriores
Write-Host "Limpiando contenedores anteriores..." -ForegroundColor Cyan
docker stop elchicle-test-run 2>&1 | Out-Null
docker rm elchicle-test-run 2>&1 | Out-Null

# Construir imagen
Write-Host "Construyendo imagen Docker..." -ForegroundColor Cyan
docker build -t elchicle-test . -q

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR construyendo imagen" -ForegroundColor Red
    exit 1
}

Write-Host "OK Imagen construida" -ForegroundColor Green
Write-Host ""

# Ejecutar contenedor
Write-Host "Iniciando contenedor con tus cookies locales..." -ForegroundColor Cyan
$cookiesPath = (Resolve-Path ".\cookies\cookies.txt").Path

docker run -d --name elchicle-test-run -p 3000:3000 -e "DISCORD_TOKEN=$token" -e "YT_DLP_COOKIES_URL=" -e "PORT=3000" -v "${cookiesPath}:/app/cookies/youtube.txt" elchicle-test

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR iniciando contenedor" -ForegroundColor Red
    exit 1
}

Write-Host "OK Contenedor iniciado" -ForegroundColor Green
Write-Host ""
Write-Host "Esperando 5 segundos para que arranque..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "LOGS DEL CONTENEDOR:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
docker logs elchicle-test-run

Write-Host ""
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""
Write-Host "OK Si ves 'HTTP server listening on 3000' todo esta bien!" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Yellow
Write-Host "  Ver logs:      docker logs -f elchicle-test-run" -ForegroundColor Gray
Write-Host "  Detener:       docker stop elchicle-test-run" -ForegroundColor Gray
Write-Host "  Health check:  curl http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Prueba el bot en Discord con /play" -ForegroundColor Yellow
Write-Host ""
