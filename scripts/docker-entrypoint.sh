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
  echo "[entrypoint] cookies source URL provided, downloading to ${COOKIES_PATH}"
  mkdir -p "$(dirname "${COOKIES_PATH}")"
  # Attempt to fetch the raw gist. If it fails, exit non-zero to avoid starting with broken cookies.
  if command -v curl >/dev/null 2>&1; then
    # If a GitHub token is provided, use it to fetch private gists.
    if [ -n "${GITHUB_TOKEN:-}" ]; then
      echo "[entrypoint] GITHUB_TOKEN found, using authenticated request to fetch source (token redacted)"
      if curl -fsSL -H "Authorization: token ${GITHUB_TOKEN}" "${SOURCE_URL}" -o "${COOKIES_PATH}"; then
        echo "[entrypoint] downloaded cookies to ${COOKIES_PATH} (authenticated)"
      else
        echo "[entrypoint] failed to download cookies from SOURCE_URL with token" >&2
        exit 2
      fi
    else
      if curl -fsSL "${SOURCE_URL}" -o "${COOKIES_PATH}"; then
        echo "[entrypoint] downloaded cookies to ${COOKIES_PATH}"
      else
        echo "[entrypoint] failed to download cookies from SOURCE_URL=${SOURCE_URL}" >&2
        exit 2
      fi
    fi
  else
    echo "[entrypoint] curl not available inside image" >&2
    exit 3
  fi
else
  echo "[entrypoint] No cookies source URL set (GIST_RAW_URL or YT_DLP_COOKIES_URL). Will use existing cookies at ${COOKIES_PATH} if present." 
fi

# Ensure cookies file is readable
if [ -f "${COOKIES_PATH}" ]; then
  echo "[entrypoint] cookies file present: $(stat -c '%n %s bytes' "${COOKIES_PATH}" 2>/dev/null || echo '${COOKIES_PATH}')"
  # Attempt to filter the cookies file to keep only YouTube-related domains
  if command -v python3 >/dev/null 2>&1 && [ -f /usr/local/bin/filter_cookies.py ]; then
    echo "[entrypoint] filtering cookies to keep only youtube-related domains..."
    python3 /usr/local/bin/filter_cookies.py "${COOKIES_PATH}" --domains "youtube.com,youtube-nocookie.com,googlevideo.com,google.com"
    echo "[entrypoint] filtering complete"
  else
    echo "[entrypoint] filter script not available or python3 missing; skipping filter"
  fi
else
  echo "[entrypoint] WARNING: cookies file not found at ${COOKIES_PATH}. yt-dlp may fail unless you mount a cookies file or set GIST_RAW_URL." >&2
fi

exec "$@"
