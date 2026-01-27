# Usar cookies desde un Gist al ejecutar la imagen Docker

Este documento muestra cómo construir la imagen y ejecutar el contenedor de forma que el bot use un archivo de cookies (`cookies.txt`) obtenido desde un Gist público (o desde un archivo montado localmente).

IMPORTANTE: No incluyas cookies sensibles en la imagen. El entrypoint descarga el fichero en tiempo de inicio — evita incrustar credenciales en la imagen.

1) Construir la imagen

```powershell
docker build -t saisito/elchicle:latest .
```

2) Ejecutar el contenedor usando un Gist raw URL

Consigue la URL "raw" del Gist. Para un Gist público en `https://gist.github.com/<user>/<id>` normalmente la URL raw es:

```
https://gist.githubusercontent.com/<user>/<id>/raw
```

Ejemplo de ejecución (el entrypoint descargará el fichero y lo colocará en `/app/cookies/youtube.txt` dentro del contenedor):

```powershell
docker run --rm -e GIST_RAW_URL='https://gist.github.com/saisito/b086eea5e94c494c76e9f1bf028e8271' \
  -p 3000:3000 \
  --name elchicle \
  saisito/elchicle:latest
```

3) Ejecutar montando un archivo local (más seguro)

En lugar de usar Gist, monta tu archivo de cookies en el contenedor:

```powershell
mkdir -Force .\cookies
# coloca tu cookies/youtube.txt localmente
docker run --rm -v ${PWD}/cookies:/app/cookies:ro -p 3000:3000 saisito/elchicle:latest
```

4) Subir la imagen a Docker Hub

```powershell
docker login --username yourusername
docker tag saisito/elchicle:latest yourusername/elchicle:latest
docker push yourusername/elchicle:latest
```

5) Opciones adicionales
- `COOKIES_PATH`: si tu fichero en el contenedor debe tener otro nombre o ruta, exporta `COOKIES_PATH` con la ruta completa dentro del contenedor.
- Si el Gist es privado, no uses GIST_RAW_URL público; para acceder a un Gist privado deberás usar la API y un token — en ese caso recomiendo montar el fichero localmente en vez de exponer tokens en variables de entorno.

6) (Opcional) Incrustar cookies en la imagen en tiempo de build

Si quieres que las cookies se descarguen y queden dentro de la imagen en el momento
de construirla (NO RECOMENDADO para cookies sensibles), puedes pasar `GIST_RAW_URL`
como argumento de build. Ejemplo:

```powershell
docker build --build-arg GIST_RAW_URL='https://gist.githubusercontent.com/saisito/9d6899249a2121b14eb7fac634429982/raw' -t saisito/elchicle:latest .
```

Esto descargará el contenido del gist y lo escribirá en `/app/cookies/youtube.txt` dentro
de la imagen durante el build.

⚠️ Seguridad: incrustar cookies en la imagen hará que cualquier persona con acceso a la
imagen pueda leerlas. Prefiere montar el fichero en tiempo de ejecución o usar variables
de entorno que descarguen fuera del build.

Seguridad
- Nunca incluyas cookies en imágenes públicas.
- Prefiere montar el archivo en tiempo de ejecución o usar un Gist público con cuidado y rotar cookies con frecuencia.
