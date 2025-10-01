############################################
# Dockerfile - ElChicle (pin de versiones) #
############################################
FROM node:22.19.0-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PYTHONWARNINGS=ignore \
    YTDL_NO_UPDATE=1 \
    YT_DLP_NO_UPDATE=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Hacemos que el plugin @distube/yt-dlp use el binario del sistema
# (evitamos descargas en postinstall/arranque y garantizamos misma versión)
ENV YTDLP_DISABLE_DOWNLOAD=true \
    YTDLP_DIR=/usr/local/bin \
    YTDLP_FILENAME=yt-dlp

# 1) Paquetes del sistema necesarios
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python-is-python3 \
    libopus-dev \
    pkg-config \
    git \
    curl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# 2) Instalar yt-dlp del sistema en la MISMA versión que local
#    (local reporta 2025.09.26 via yt-dlp-exec)
ARG YTDLP_VERSION=2025.09.26
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && /usr/local/bin/yt-dlp --version

# 3) Carpeta de trabajo
WORKDIR /app

# 4) Instalar dependencias Node con lockfile para versiones idénticas
#    Necesitamos el script de postinstall para parchar @distube/yt-dlp
COPY package*.json ./
COPY scripts ./scripts
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# 5) Copiar el resto de archivos de la app
COPY . .

# 6) Salud y arranque
EXPOSE 3000
CMD ["node", "index.js"]
