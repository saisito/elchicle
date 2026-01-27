# Exportar cookies de Firefox (YouTube / Music)

Este pequeño script ayuda a extraer las cookies de Firefox relacionadas con YouTube / YouTube Music, guardarlas en formato "Netscape" (compatible con muchas herramientas como `yt-dlp`) y opcionalmente comprimirlas o subirlas a un Gist privado.

Requisitos
- Python 3.7+
- (opcional para subir Gist) la librería `requests` (instalar con `pip install requests`)

Archivos
- `export_firefox_cookies.py`: script principal.

Uso (PowerShell)

1) Abrir PowerShell y situarse en la raíz del repo (donde está la carpeta `scripts`).

2) Exportar cookies a `cookies.txt`:

```powershell
python .\scripts\export_firefox_cookies.py --out .\cookies.txt
```

3) Generar gzip además del `.txt`:

```powershell
python .\scripts\export_firefox_cookies.py --out .\cookies.txt --gzip
```

4) Subir a un Gist (necesitas un token con scope `gist`):

```powershell
$env:GITHUB_TOKEN = "ghp_..."  # pon aquí tu token, o exportalo de forma segura antes
python .\scripts\export_firefox_cookies.py --out .\cookies.txt --gist
```

Si quieres que el Gist sea público añade `--public-gist`.

Notas y seguridad
- Las cookies contienen datos sensibles (sesiones). No las compartas públicamente a menos que sepas lo que haces.
- El script intenta abrir `cookies.sqlite` en modo sólo lectura. Si Firefox está abierto y bloquea el fichero, cierra Firefox y prueba de nuevo.
- Después de usar las cookies, bórralas del disco si no las necesitas más.

Filtros
- Por defecto el script exporta cookies donde `host LIKE '%youtube%'`. Puedes cambiar el filtro con `--domain-like '%%music.youtube%%'` si quieres.

Problemas comunes
- "No se pudo localizar el perfil de Firefox": indica que no encontró `profiles.ini`. Usa `--profile 'C:\path\to\profile'`.
- "requests library is required": instala `requests` si quieres la subida a Gist.

Ejemplo completo

```powershell
# export + gzip + subir a gist privado
$env:GITHUB_TOKEN = Read-Host -AsSecureString | ConvertFrom-SecureString
python .\scripts\export_firefox_cookies.py --out .\cookies.txt --gzip --gist
```

Por favor, dime si quieres que haga lo siguiente automáticamente desde aquí:
- crear el Gist (necesitaré que pegues el token) 
- modificar el script para incluir otros dominios (p.ej. `googlevideo.com`)
