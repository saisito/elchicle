param(
    [string]$ZipPath = "justrunmy-elchicle.zip"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$staging = Join-Path $root "jrm-pack"

# Limpia staging previo
Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Path $staging | Out-Null

$include = @(
    "Dockerfile",
    ".dockerignore",
    ".env.example",
    "scripts",
    "dev-env"
)

# Patrones a excluir del zip
$excludePatterns = @(
    "node_modules",
    "logs",
    "*.log",
    "*.zip",
    "cookies",
    "*.ps1",
    "*.md",
    "Thumbs.db",
    ".DS_Store"
)

foreach ($item in $include) {
    $source = Join-Path $root $item
    if (Test-Path $source) {
        $dest = Join-Path $staging $item
        Copy-Item -Path $source -Destination $dest -Recurse -Force -Exclude $excludePatterns
    }
}

# Empaquetar
Remove-Item -Force $ZipPath -ErrorAction SilentlyContinue | Out-Null
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $ZipPath -Force

# Limpieza
Remove-Item -Recurse -Force $staging

Write-Host "Zip creado: $ZipPath"