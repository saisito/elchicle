<#
Exportar cookies desde un contenedor local de ElChicle (PowerShell)

Este script hace lo siguiente:
- Arranca el contenedor (si no hay uno con el nombre especificado) usando la imagen dada.
- Espera hasta que `/app/cookies/youtube.txt` exista dentro del contenedor (entrypoint lo descarga).
- Copia el fichero al host (`./cookies/youtube_local.txt`).
- Ejecuta el filtro local `scripts/filter_cookies.py` para quedarnos solo con dominios relevantes.
- (Opcional) Sube el fichero filtrado a un Gist si `GITHUB_TOKEN` está configurado.

USO (PowerShell):
  # Ejecutar y dejar el contenedor en background (por defecto usa saisito/elchicle:latest)
  .\scripts\export_cookies_from_container.ps1

Parámetros:
  -Image: Nombre de la imagen Docker a usar (default: saisito/elchicle:latest)
  -ContainerName: Nombre del contenedor (default: elchicle-local)
  -OutDir: Directorio en host donde guardar cookies (default: .\cookies)
  -TimeoutSec: Tiempo máximo en segundos para esperar a que se descarguen las cookies (default: 120)
  -UploadGist: Switch; si está presente intentará subir el fichero filtrado a un Gist usando la variable de entorno GITHUB_TOKEN.

# Nota: necesitas tener Docker y Python3 disponibles en el host.
# Si prefieres, ejecuta contenedor con `-v ${PWD}/cookies:/app/cookies` y la entrypoint ya guardará ahí el fichero directamente.
# Este script automatiza la copia si no usas el volumen.
#>

param(
    [string]$Image = "saisito/elchicle:latest",
    [string]$ContainerName = "elchicle-local",
    [string]$OutDir = "./cookies",
    [int]$TimeoutSec = 120,
    [switch]$UploadGist,
    [switch]$NoPortMapping
)

Set-StrictMode -Version Latest

function ExitWith($code, $msg) {
    Write-Error $msg
    exit $code
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    ExitWith 2 "Docker no está instalado o no está en PATH. Instálalo antes de usar este script."
}

# Ensure out dir
$outDirFull = Resolve-Path -LiteralPath $OutDir -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue
if (-not $outDirFull) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null; $outDirFull = Resolve-Path -LiteralPath $OutDir }

# Check if container exists
$existing = docker ps -a --filter "name=^/${ContainerName}$" --format "{{.ID}}" 2>$null
if ($existing) {
    Write-Host "Found existing container with name $ContainerName (id: $existing). Will use it." -ForegroundColor Yellow
    $containerId = $existing.Trim()
    $running = docker ps --filter "id=$containerId" --format "{{.ID}}"
    if (-not $running) {
        Write-Host "Starting existing container..."
        docker start $containerId | Out-Null
    }
} else {
    Write-Host "No container named $ContainerName found. Creating a new detached container from image $Image..."
    # Build docker run command: optionally avoid mapping host port to prevent conflicts
    if ($NoPortMapping) {
        $runCmd = "docker run -d --name $ContainerName $Image"
    } else {
        $runCmd = "docker run -d --name $ContainerName -p 3000:3000 $Image"
    }
    $containerId = Invoke-Expression $runCmd
    if (-not $containerId) { ExitWith 3 "No se pudo crear el contenedor desde la imagen $Image" }
    $containerId = $containerId.Trim()
    Write-Host "Container created: $containerId"

    # Check if container is running; if not, try to start and then show logs for diagnosis
    Start-Sleep -Seconds 2
    $isRunning = docker inspect -f "{{.State.Running}}" $containerId 2>$null
    if ($isRunning -ne 'true') {
        Write-Warning "Contenedor no está en ejecución inmediatamente después del run. Intentando arrancarlo..."
        docker start $containerId 2>$null | Out-Null
        Start-Sleep -Seconds 2
        $isRunning = docker inspect -f "{{.State.Running}}" $containerId 2>$null
        if ($isRunning -ne 'true') {
            Write-Warning "El contenedor no arrancó correctamente. Mostrando los últimos 100 logs para diagnóstico:"
            docker logs --tail 100 $containerId
            ExitWith 4 "El contenedor falló al iniciarse. Revisa los logs arriba." 
        }
    }
}

# Wait for cookies file inside container
$remotePath = "/app/cookies/youtube.txt"
$elapsed = 0
$found = $false
Write-Host "Waiting up to $TimeoutSec seconds for $remotePath inside container $ContainerName..."
while ($elapsed -lt $TimeoutSec) {
    try {
        $exists = docker exec $ContainerName sh -c "[ -f '$remotePath' ] && echo exists || true" 2>$null
    } catch { $exists = $null }
    if ($exists -and $exists.Trim() -eq 'exists') { $found = $true; break }
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if (-not $found) {
    Write-Warning "No se detectó $remotePath dentro del contenedor después de $TimeoutSec segundos. Intentando copiar de todos modos si existe (puede fallar)."
}

# Copy file from container
$hostOutFile = Join-Path $outDirFull "youtube_local.txt"
try {
    docker cp "${ContainerName}:$remotePath" "$hostOutFile" 2>$null
    if (-not (Test-Path $hostOutFile)) { Write-Warning "No se pudo copiar $remotePath; el archivo puede no existir dentro del contenedor." }
    else { Write-Host "Copied cookies to $hostOutFile" -ForegroundColor Green }
} catch {
    Write-Warning "docker cp falló: $_"
}

# If file exists, run filter_cookies.py to keep only youtube domains
if (Test-Path $hostOutFile) {
    Write-Host "Filtering cookies to keep only YouTube-related domains..."
    $py = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
    if (-not $py) { Write-Warning "Python no encontrado en PATH; no se puede filtrar automáticamente." }
    else {
        & $py.Path "$(Resolve-Path scripts/filter_cookies.py)" $hostOutFile --out "$hostOutFile.filtered" --domains "youtube.com,youtube-nocookie.com,googlevideo.com,google.com"
        if (Test-Path "$hostOutFile.filtered") {
            Move-Item -Force "$hostOutFile.filtered" "$hostOutFile"
            Write-Host "Filtered cookies saved to $hostOutFile" -ForegroundColor Green
        } else {
            Write-Warning "El filtrado no generó salida." }
    }
} else {
    Write-Warning "No hay fichero de cookies en el host para filtrar." }

# Optional: upload to Gist using GITHUB_TOKEN env var
if ($UploadGist) {
    $token = $env:GITHUB_TOKEN
    if (-not $token) { Write-Warning "GITHUB_TOKEN no definido en variables de entorno. No se subirá el Gist." }
    elseif (-not (Test-Path $hostOutFile)) { Write-Warning "No hay fichero de cookies para subir." }
    else {
        Write-Host "Uploading filtered cookies to Gist..."
        $content = Get-Content $hostOutFile -Raw -ErrorAction Stop
        $payload = @{ public = $false; files = @{ ("youtube.txt") = @{ content = $content } } } | ConvertTo-Json -Depth 5
        $resp = Invoke-RestMethod -Uri "https://api.github.com/gists" -Method Post -Headers @{ Authorization = "token $token"; Accept = "application/vnd.github.v3+json" } -Body $payload -ErrorAction Stop
        if ($resp.html_url) { Write-Host "Gist creado: $($resp.html_url)" -ForegroundColor Green }
        else { Write-Warning "No se pudo crear el Gist. Respuesta: $resp" }
    }
}

Write-Host "Done. If you created a new container and want to stop it, run: docker stop $ContainerName && docker rm $ContainerName" -ForegroundColor Cyan
