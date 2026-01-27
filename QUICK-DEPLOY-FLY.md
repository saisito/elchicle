# 🚀 Deploy Rápido en Fly.io

Sigue estos pasos para desplegar ElChicle en Fly.io en menos de 5 minutos.

## Paso 1: Instalar Fly CLI

### Windows (PowerShell):
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### macOS/Linux:
```bash
curl -L https://fly.io/install.sh | sh
```

## Paso 2: Autenticarse
```bash
flyctl auth login
```

## Paso 3: Crear app
```bash
# Elige un nombre único (o deja vacío para uno automático)
flyctl apps create elchicle
```

## Paso 4: Configurar secretos
```bash
# Token de Discord (OBLIGATORIO)
flyctl secrets set DISCORD_TOKEN="MTQxMzc0MTAzMTU3MjM3NzY0MA.xxxxx.xxxxxxxxxxxxxxxxxxxxxx"

# URL de cookies (OBLIGATORIO)
flyctl secrets set YT_DLP_COOKIES_URL="https://gist.githubusercontent.com/usuario/id/raw"
```

## Paso 5: Desplegar
```bash
flyctl deploy
```

## Paso 6: Verificar
```bash
# Ver estado
flyctl status

# Ver logs
flyctl logs

# Abrir en navegador (para ver /health)
flyctl open
```

## ✅ Listo!

Tu bot debería estar funcionando. Verifica que se conectó a Discord y prueba con `/play`.

## 🔄 Actualizar después de cambios

```bash
git add .
git commit -m "Actualización"
git push
flyctl deploy
```

## 📚 Más información

Ver [FLY-DEPLOYMENT-GUIDE.md](FLY-DEPLOYMENT-GUIDE.md) para la guía completa.
