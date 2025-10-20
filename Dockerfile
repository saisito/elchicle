############################################
# Dockerfile.production - ElChicle Bot    #
# Versión optimizada para producción      #
############################################
FROM node:22.19.0-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PYTHONWARNINGS=ignore \
    YTDL_NO_UPDATE=1 \
    YT_DLP_NO_UPDATE=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PYTHONIOENCODING=utf-8

# Configurar el plugin @distube/yt-dlp para usar binario del sistema
ENV YTDLP_DISABLE_DOWNLOAD=true \
    YTDLP_DIR=/usr/local/bin \
    YTDLP_FILENAME=yt-dlp

# Headers para evitar detección de bot en YouTube
ENV YT_DLP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
    YT_DLP_REFERER="https://www.youtube.com/"

# 1) Instalar paquetes del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python-is-python3 \
    libopus-dev \
    pkg-config \
    git \
    curl \
    ca-certificates \
    wget \
 && rm -rf /var/lib/apt/lists/*

# 2) Instalar yt-dlp en versión exacta compatible
ARG YTDLP_VERSION=2025.09.26
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && /usr/local/bin/yt-dlp --version

# 3) Crear usuario no-root para seguridad
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 4) Configurar directorio de trabajo
WORKDIR /app

# 5) Copiar archivos de dependencias desde dev-env
COPY dev-env/package*.json ./
COPY dev-env/scripts ./scripts/
COPY dev-env/patches ./patches/

# 6) Instalar dependencias exactas con package-lock.json
RUN npm ci --only=production --no-audit --no-fund

# 7) Copiar código de la aplicación
COPY dev-env/index.js ./

# 8) Crear directorio para cookies (si se necesitan)
RUN mkdir -p /app/cookies && \
    chown -R appuser:appuser /app

# 9) Cambiar a usuario no-root
USER appuser

# 10) Verificar instalación
RUN node --version && \
    npm --version && \
    yt-dlp --version && \
    ffmpeg -version

# 11) Exponer puerto para health check
EXPOSE 3000

# 12) Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 13) Comando de inicio
CMD ["node", "index.js"]