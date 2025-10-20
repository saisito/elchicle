# Script para probar la imagen Docker localmente
# ElChicle Bot - Test Local con Variables de Entorno

Write-Host "🚀 Probando imagen Docker local: saisito/elchicle:v4-patched" -ForegroundColor Green
Write-Host ""

# Verificar que la imagen existe
$imageExists = docker images saisito/elchicle:v4-patched --format "table {{.Repository}}:{{.Tag}}" | Select-String "saisito/elchicle:v4-patched"

if (-not $imageExists) {
    Write-Host "❌ Error: La imagen saisito/elchicle:v4-patched no existe" -ForegroundColor Red
    Write-Host "   Ejecuta primero: docker build -f Dockerfile.production -t saisito/elchicle:v4-patched ." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Imagen encontrada" -ForegroundColor Green

# Verificar que el archivo .env.test existe
if (-not (Test-Path ".env.test")) {
    Write-Host "❌ Error: Archivo .env.test no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de que el archivo .env.test esté en el directorio actual" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo .env.test encontrado" -ForegroundColor Green
Write-Host ""

# Mostrar recordatorio sobre el token
Write-Host "⚠️  RECORDATORIO: Actualiza DISCORD_TOKEN en .env.test antes de continuar" -ForegroundColor Yellow
Write-Host "   Presiona Enter para continuar cuando hayas configurado el token..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🐳 Ejecutando contenedor Docker..." -ForegroundColor Cyan
Write-Host "   - Puerto: 3000:3000"
Write-Host "   - Variables: .env.test"
Write-Host "   - Modo: Interactivo con logs"
Write-Host ""

# Ejecutar el contenedor con el archivo .env
docker run --rm -it `
    --name elchicle-test `
    -p 3000:3000 `
    --env-file .env.test `
    saisito/elchicle:v4-patched

Write-Host ""
Write-Host "🏁 Prueba completada" -ForegroundColor Green