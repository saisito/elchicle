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
  echo "[entrypoint] Cookies source URL: ${SOURCE_URL}"
  echo "[entrypoint] Target path: ${COOKIES_PATH}"
  echo "[entrypoint] ============================================"
  mkdir -p "$(dirname "${COOKIES_PATH}")"
  
  if command -v curl >/dev/null 2>&1; then
    # If a GitHub token is provided, use it to fetch private gists.
    if [ -n "${GITHUB_TOKEN:-}" ]; then
      echo "[entrypoint] Using authenticated GitHub request..."
      if curl -fsSL -v -H "Authorization: token ${GITHUB_TOKEN}" "${SOURCE_URL}" -o "${COOKIES_PATH}" 2>&1; then
        echo "[entrypoint] ✅ Cookies downloaded successfully (authenticated)"
        ls -lh "${COOKIES_PATH}"
      else
        echo "[entrypoint] ❌ FAILED to download cookies with GitHub token" >&2
        echo "[entrypoint] Check: 1) GITHUB_TOKEN is valid, 2) URL is correct, 3) Gist is accessible" >&2
        exit 2
      fi
    else
      echo "[entrypoint] Downloading cookies (public URL)..."
      if curl -fsSL -v "${SOURCE_URL}" -o "${COOKIES_PATH}" 2>&1; then
        echo "[entrypoint] ✅ Cookies downloaded successfully"
        ls -lh "${COOKIES_PATH}"
      else
        echo "[entrypoint] ❌ FAILED to download cookies from: ${SOURCE_URL}" >&2
        echo "[entrypoint] Check: 1) URL is correct and ends with /raw, 2) Gist/file is public, 3) Network access" >&2
        exit 2
      fi
    fi
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
