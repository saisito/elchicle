# 🍪 Guía para Configurar Cookies de YouTube

Esta guía te ayudará a configurar las cookies de YouTube para evitar problemas de detección de bot en producción.

## ¿Por qué necesito cookies?

Cuando tu bot se ejecuta desde un servidor remoto (VPS, Railway, etc.), YouTube puede detectarlo como un bot y bloquear las solicitudes. Las cookies de una sesión autenticada ayudan a evitar esto.

## Método 1: Extensión del Navegador (Recomendado)

### Para Chrome:
1. Instala la extensión "Get cookies.txt LOCALLY"
2. Ve a [youtube.com](https://youtube.com) e inicia sesión normalmente
3. Haz clic en el ícono de la extensión
4. Haz clic en "Export" y guarda como `youtube.txt`

### Para Firefox:
1. Instala la extensión "cookies.txt"
2. Ve a [youtube.com](https://youtube.com) e inicia sesión
3. Haz clic en el ícono de la extensión
4. Exporta las cookies como `youtube.txt`

## Método 2: yt-dlp (Automático)

Ejecuta este comando para extraer cookies automáticamente:

```bash
# Para Chrome
yt-dlp --cookies-from-browser chrome --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Para Firefox
yt-dlp --cookies-from-browser firefox --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Para Edge
yt-dlp --cookies-from-browser edge --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Método 3: Manualmente desde DevTools

1. Ve a [youtube.com](https://youtube.com) e inicia sesión
2. Abre DevTools (F12)
3. Ve a la pestaña "Application" > "Cookies" > "https://youtube.com"
4. Copia todas las cookies en formato Netscape

## Configuración en el Proyecto

1. **Crear directorio de cookies:**
   ```bash
   mkdir cookies
   ```

2. **Colocar el archivo:**
   ```
   cookies/
   └── youtube.txt
   ```

3. **Configurar variable de entorno:**
   En tu archivo `.env`:
   ```bash
   YT_DLP_COOKIES=/app/cookies/youtube.txt
   ```

4. **Para Docker:**
   El volumen ya está configurado en `docker-compose.production.yml`:
   ```yaml
   volumes:
     - ./cookies:/app/cookies:ro
   ```

## Formato del archivo cookies.txt

El archivo debe seguir el formato Netscape:

```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1735689600	CONSENT	YES+cb
.youtube.com	TRUE	/	TRUE	1735689600	__Secure-3PSID	your_session_id
# ... más cookies
```

## Verificación

Para verificar que las cookies funcionan:

```bash
# Probar localmente
yt-dlp --cookies ./cookies/youtube.txt --simulate "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# En Docker
docker run --rm -v ./cookies:/app/cookies elchicle:production yt-dlp --cookies /app/cookies/youtube.txt --simulate "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** subas el archivo `cookies.txt` a un repositorio público
- Añade `cookies/` a tu `.gitignore`
- Las cookies tienen fecha de expiración, renuévalas periódicamente
- Considera usar variables de entorno para cookies sensibles

## Renovación Automática

Para renovar cookies automáticamente, puedes crear un script:

```bash
#!/bin/bash
# renovar-cookies.sh
yt-dlp --cookies-from-browser chrome --cookies ./cookies/youtube.txt --no-download "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
echo "Cookies renovadas: $(date)"
```

## Troubleshooting

### Error: "Sign in to confirm you're not a bot"
- Las cookies han expirado o son inválidas
- Renueva las cookies siguiendo los pasos anteriores

### Error: "Unable to download webpage"
- Verifica que el archivo cookies.txt existe
- Comprueba que la variable YT_DLP_COOKIES apunta al archivo correcto
- Asegúrate que el formato del archivo es correcto

### Error: "HTTP 403 Forbidden"
- Las cookies pueden estar bloqueadas por región
- Intenta con cookies de una sesión diferente
- Verifica que YouTube no haya detectado actividad sospechosa en tu cuenta

## Alternativas sin Cookies

Si no puedes usar cookies, prueba estas opciones:

1. **Proxy/VPN:** Usa un proxy para cambiar la IP
2. **User-Agent rotation:** Cambia el User-Agent periódicamente
3. **Rate limiting:** Reduce la frecuencia de solicitudes
4. **Mirror sites:** Usa servicios alternativos para algunos videos

## Configuración para Producción

En producción, considera:

1. **Renovación automática:** Script que renueve cookies diariamente
2. **Múltiples cuentas:** Rotar entre diferentes sesiones
3. **Monitoreo:** Alertas cuando las cookies fallan
4. **Backup:** Tener cookies de respaldo listas

---

💡 **Tip:** Mantén las cookies actualizadas renovándolas cada 7-14 días para mejores resultados.