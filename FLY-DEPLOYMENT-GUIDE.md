# 🚀 Guía de Deploy en Fly.io - ElChicle Bot

Esta guía te ayudará a desplegar ElChicle Discord Bot en Fly.io directamente desde tu repositorio de Git.

## 📋 Prerrequisitos

1. **Cuenta en Fly.io**: [https://fly.io/app/sign-up](https://fly.io/app/sign-up)
2. **Fly CLI instalado**: [https://fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
3. **Token de Discord** para tu bot
4. **URL de cookies de YouTube** (GitHub Gist con tus cookies)
5. **Repositorio Git** con el código del proyecto

## 🔧 Instalación de Fly CLI

### Windows (PowerShell):
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### macOS/Linux:
```bash
curl -L https://fly.io/install.sh | sh
```

### Verificar instalación:
```bash
flyctl version
```

## 🚀 Deployment desde Git

### 1. Autenticarse en Fly.io
```bash
flyctl auth login
```

### 2. Clonar tu repositorio (si no lo tienes localmente)
```bash
git clone https://github.com/TU_USUARIO/elchicle.git
cd elchicle
```

### 3. Crear la aplicación en Fly.io
```bash
# El nombre 'elchicle' debe ser único globalmente, elige otro si ya está tomado
flyctl apps create elchicle

# O deja que Fly.io genere un nombre automáticamente
flyctl apps create
```

### 4. Configurar secretos (variables sensibles)

**IMPORTANTE**: No pongas el token de Discord ni las cookies directamente en `fly.toml`. Usa secretos:

```bash
# Token de Discord (OBLIGATORIO)
flyctl secrets set DISCORD_TOKEN="tu_token_aqui"

# URL de cookies de YouTube (OBLIGATORIO)
flyctl secrets set YT_DLP_COOKIES_URL="https://gist.githubusercontent.com/usuario/id/raw"
```

Verifica los secretos configurados:
```bash
flyctl secrets list
```

### 5. Ajustar fly.toml (opcional)

Edita [fly.toml](fly.toml) si necesitas:

- **Cambiar región**: Modifica `primary_region`:
  - `"mia"` - Miami, USA
  - `"mad"` - Madrid, España
  - `"ams"` - Amsterdam, Países Bajos
  - `"gru"` - São Paulo, Brasil
  - [Lista completa de regiones](https://fly.io/docs/reference/regions/)

- **Cambiar nombre de la app**: Modifica `app = "elchicle"`

- **Ajustar recursos**: Modifica la sección `[vm]`:
  ```toml
  [vm]
    cpu_kind = "shared"  # o "performance"
    cpus = 1             # 1-8 CPUs
    memory_mb = 512      # 256, 512, 1024, 2048, etc.
  ```

### 6. Desplegar la aplicación
```bash
# Primera vez
flyctl deploy

# Deploys posteriores (después de hacer cambios)
git add .
git commit -m "Actualización del bot"
git push
flyctl deploy
```

### 7. Verificar el deployment
```bash
# Ver el estado de la app
flyctl status

# Ver logs en tiempo real
flyctl logs

# Abrir la app en el navegador (para ver el health check)
flyctl open
```

## 🔍 Verificación del Health Check

Tu bot debe responder en el endpoint de health check:
```
https://elchicle.fly.dev/health
```

Deberías ver:
```json
{"status":"ok"}
```

## 📊 Comandos útiles de Fly.io

```bash
# Ver información de la app
flyctl info

# Ver logs
flyctl logs

# Ver métricas
flyctl dashboard

# Escalar recursos
flyctl scale vm shared-cpu-1x --memory 1024

# Ver número de instancias
flyctl scale show

# Cambiar número de instancias
flyctl scale count 1

# Reiniciar la app
flyctl apps restart

# SSH a la máquina
flyctl ssh console

# Ver secretos configurados
flyctl secrets list

# Actualizar un secreto
flyctl secrets set DISCORD_TOKEN="nuevo_token"

# Eliminar un secreto
flyctl secrets unset VARIABLE_NAME

# Destruir la app completamente
flyctl apps destroy elchicle
```

## 🔄 Actualización continua desde Git

Para configurar deployments automáticos desde GitHub:

### Opción 1: GitHub Actions (Recomendado)

1. Crea un token de Fly.io:
```bash
flyctl auth token
```

2. Añade el token como secreto en GitHub:
   - Ve a tu repo → Settings → Secrets → New repository secret
   - Nombre: `FLY_API_TOKEN`
   - Valor: el token que copiaste

3. Crea `.github/workflows/fly-deploy.yml`:
```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

4. Ahora cada push a main desplegará automáticamente.

### Opción 2: Deploy manual desde Git

```bash
# Hacer cambios
git add .
git commit -m "Actualización"
git push

# Desplegar
flyctl deploy
```

## 🐛 Resolución de problemas

### El bot no se conecta a Discord
```bash
# Verifica que el token esté configurado
flyctl secrets list

# Verifica los logs
flyctl logs
```

### Error de cookies de YouTube
```bash
# Verifica la URL de cookies
flyctl secrets list

# Asegúrate de que el Gist sea público y la URL termine en /raw
```

### Bot se reinicia constantemente
```bash
# Aumenta memoria si es necesario
flyctl scale vm shared-cpu-1x --memory 1024

# Revisa logs para ver el error
flyctl logs
```

### Build falla
```bash
# Limpia la caché de build
flyctl deploy --no-cache

# Verifica que el Dockerfile sea correcto
cat Dockerfile
```

### Health check falla
```bash
# Verifica que el puerto 3000 esté expuesto correctamente
# Revisa que el endpoint /health funcione en los logs
flyctl logs
```

## 💰 Costos de Fly.io

- **Tier gratuito**: 
  - 3 máquinas compartidas (shared-cpu-1x)
  - 256 MB RAM cada una
  - 3 GB de tráfico

- **Para ElChicle** (configuración recomendada):
  - 1 máquina shared-cpu-1x con 512 MB RAM
  - Dentro del tier gratuito ✅

Más info: [https://fly.io/docs/about/pricing/](https://fly.io/docs/about/pricing/)

## 🎯 Próximos pasos

1. ✅ Desplegar la app
2. ✅ Verificar que el health check funcione
3. ✅ Probar el bot en Discord
4. ⚙️ Configurar GitHub Actions para auto-deploy
5. 📊 Monitorear logs con `flyctl logs`

## 📚 Recursos adicionales

- [Documentación de Fly.io](https://fly.io/docs/)
- [Fly.io Discord](https://fly.io/discord)
- [Regiones disponibles](https://fly.io/docs/reference/regions/)
- [Configuración de fly.toml](https://fly.io/docs/reference/configuration/)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs: `flyctl logs`
2. Verifica el estado: `flyctl status`
3. Consulta la [documentación de Fly.io](https://fly.io/docs/)
4. Abre un issue en el repositorio del proyecto
