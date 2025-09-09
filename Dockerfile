# Dockerfile (Debian-based, safe for PEP 668)
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1) Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-venv \
    python3-pip \
    build-essential \
    libopus-dev \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2) Crear un virtual environment y usarlo (evita PEP 668)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 3) Actualizar pip dentro del venv e instalar yt-dlp ahí
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
 && pip install --no-cache-dir yt-dlp

# 4) Carpeta de trabajo
WORKDIR /app

# 5) Copiar package.json e instalar dependencias Node (producción)
COPY package*.json ./

# Preferible usar npm ci
RUN if [ -f package-lock.json ]; then npm ci --production; else npm install --production; fi

# 6) Copiar el resto de archivos (incluye index.js)
COPY . .

# 7) Ignorar node_modules en imagen `.dockerignore` recomendado
# 8) Exponer puerto para health checks
EXPOSE 3000

# 9) Iniciar
CMD ["node", "index.js"]
