# Deploy completo a JustRunMyApp - ElChicle Bot
# Este script configura y despliega automáticamente

param(
    [string]$DiscordToken = $env:DISCORD_TOKEN
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploy ElChicle a JustRunMyApp" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Variables configuradas
$COOKIES_URL = "https://gist.githubusercontent.com/saisito/e14d2a27b8deeaf6ad6f28f092612868/raw/cookies.txt"
$REMOTE_URL = "https://Ci78Lo:a5R6Azt7Q8LyM@justrunmy.app/git/r_Bm34Yr"

# Verificar que tenemos Discord token
if (-not $DiscordToken) {
    Write-Host "❌ ERROR: Necesitas configurar DISCORD_TOKEN" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "1. Ejecuta: `$env:DISCORD_TOKEN='tu_token'; .\deploy-justrunmy.ps1" -ForegroundColor Gray
    Write-Host "2. O ejecuta: .\deploy-justrunmy.ps1 -DiscordToken 'tu_token'" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Discord Token: ${DiscordToken.Substring(0,20)}..." -ForegroundColor Green
Write-Host "✅ Cookies URL: $COOKIES_URL" -ForegroundColor Green
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "Dockerfile")) {
    Write-Host "❌ ERROR: No se encuentra Dockerfile. Ejecuta desde la raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Configurar remoto si no existe
Write-Host "📡 Configurando remoto JustRunMyApp..." -ForegroundColor Cyan
$remotes = git remote
if ($remotes -notcontains "justrunmy") {
    git remote add justrunmy $REMOTE_URL
    Write-Host "✅ Remoto añadido" -ForegroundColor Green
} else {
    git remote set-url justrunmy $REMOTE_URL
    Write-Host "✅ Remoto actualizado" -ForegroundColor Green
}

# Hacer commit si hay cambios
Write-Host ""
Write-Host "📦 Preparando archivos..." -ForegroundColor Cyan
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "Deploy a JustRunMyApp - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "✅ Cambios commiteados" -ForegroundColor Green
} else {
    Write-Host "✅ No hay cambios nuevos" -ForegroundColor Green
}

# Deploy
Write-Host ""
Write-Host "🚀 Desplegando a JustRunMyApp..." -ForegroundColor Cyan
Write-Host "Esto puede tardar 2-3 minutos..." -ForegroundColor Yellow
Write-Host ""

git push -f justrunmy HEAD:deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✅ DEPLOY EXITOSO" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 PASOS FINALES EN EL PANEL:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ve a: https://justrunmy.app" -ForegroundColor White
    Write-Host "2. Abre tu app: r_Bm34Yr" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Configura estas variables:" -ForegroundColor White
    Write-Host "   DISCORD_TOKEN = $DiscordToken" -ForegroundColor Gray
    Write-Host "   YT_DLP_COOKIES_URL = $COOKIES_URL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Guarda y reinicia la app" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Verifica en Logs que aparezca:" -ForegroundColor White
    Write-Host "   ✅ Cookies downloaded successfully" -ForegroundColor Gray
    Write-Host "   ✅ HTTP server listening on 3000" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. El bot debe aparecer online en Discord" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ ERROR en el deploy" -ForegroundColor Red
    Write-Host "Revisa los mensajes de error arriba" -ForegroundColor Yellow
    exit 1
}
