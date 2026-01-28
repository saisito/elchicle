#!/bin/sh
# Entry point for the container.
# If GIST_RAW_URL is set, download the content into /app/cookies/youtube.txt
# If COOKIES_PATH is set, use that path (inside container) instead.

set -eu

COOKIES_DIR=/app/cookies
COOKIES_DEFAULT=${COOKIES_DIR}/youtube.txt
COOKIES_PATH=${COOKIES_PATH:-${COOKIES_DEFAULT}}

echo "[entrypoint] starting: checking cookies..."

SOURCE_URL=${GIST_RAW_URL:-${YT_DLP_COOKIES_URL:-}}
if [ -n "${SOURCE_URL:-}" ]; then
  echo "[entrypoint] ============================================"
  echo "[entrypoint] Downloading cookies from: ${SOURCE_URL}"
  echo "[entrypoint] Target path: ${COOKIES_PATH}"
  echo "[entrypoint] ============================================"
  mkdir -p "$(dirname "${COOKIES_PATH}")"
  
  if command -v curl >/dev/null 2>&1; then
    echo "[entrypoint] Attempting to download cookies..."
    DOWNLOAD_OUTPUT=$(mktemp)
    if curl -fsSL --connect-timeout 10 --max-time 30 "${SOURCE_URL}" -o "${COOKIES_PATH}" 2>"${DOWNLOAD_OUTPUT}"; then
      FILE_SIZE=$(wc -c < "${COOKIES_PATH}")
      echo "[entrypoint] ✅ Cookies downloaded successfully (${FILE_SIZE} bytes)"
      head -n 3 "${COOKIES_PATH}" | sed 's/^/[entrypoint] /'
    else
      ERROR_MSG=$(cat "${DOWNLOAD_OUTPUT}")
      echo "[entrypoint] ❌ FAILED to download cookies" >&2
      echo "[entrypoint] Error: ${ERROR_MSG}" >&2
      echo "[entrypoint] URL: ${SOURCE_URL}" >&2
      rm -f "${DOWNLOAD_OUTPUT}" "${COOKIES_PATH}"
      echo "[entrypoint] Bot will start but YouTube requests may fail without cookies" >&2
    fi
    rm -f "${DOWNLOAD_OUTPUT}"
  else
    echo "[entrypoint] ❌ curl not available inside image" >&2
    exit 3
  fi
else
  echo "[entrypoint] ⚠️  WARNING: No YT_DLP_COOKIES_URL or GIST_RAW_URL set!" 
  echo "[entrypoint] YouTube downloads will likely fail without cookies."
  echo "[entrypoint] Set YT_DLP_COOKIES_URL to your cookies file raw URL."
fi

# Ensure cookies file is readable
if [ -f "${COOKIES_PATH}" ]; then
  FILE_SIZE=$(stat -c '%s' "${COOKIES_PATH}" 2>/dev/null || echo "unknown")
  echo "[entrypoint] ============================================"
  echo "[entrypoint] ✅ Cookies file present: ${COOKIES_PATH}"
  echo "[entrypoint] File size: ${FILE_SIZE} bytes"
  echo "[entrypoint] First 3 lines preview:"
  head -n 3 "${COOKIES_PATH}" 2>/dev/null || echo "(cannot preview)"
  echo "[entrypoint] ============================================"
  
  # Attempt to filter the cookies file to keep only YouTube-related domains (skip if read-only)
  if command -v python3 >/dev/null 2>&1 && [ -f /usr/local/bin/filter_cookies.py ] && [ -w "${COOKIES_PATH}" ]; then
    echo "[entrypoint] Filtering cookies to keep only YouTube-related domains..."
    python3 /usr/local/bin/filter_cookies.py "${COOKIES_PATH}" --domains "youtube.com,youtube-nocookie.com,googlevideo.com,google.com" || true
    echo "[entrypoint] ✅ Filtering complete"
  else
    echo "[entrypoint] ⚠️  Skipping filter (file is read-only or script not available)"
  fi
  
  # Set environment variable for the application
  export YT_DLP_COOKIES="${COOKIES_PATH}"
  echo "[entrypoint] Environment: YT_DLP_COOKIES=${YT_DLP_COOKIES}"
else
  echo "[entrypoint] ============================================"
  echo "[entrypoint] ❌ ERROR: Cookies file NOT found at ${COOKIES_PATH}" >&2
  echo "[entrypoint] YouTube will reject requests without cookies!" >&2
  echo "[entrypoint] Please set YT_DLP_COOKIES_URL to a valid cookies file URL." >&2
  echo "[entrypoint] ============================================"
  exit 1
fi

exec "$@"
