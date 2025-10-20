// Patches @distube/yt-dlp to parse only stdout JSON (stderr may include warnings like "Deprecated")
// Idempotent: safe to run multiple times.

import fs from 'fs';
import path from 'path';

const file = path.resolve('node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

function patch() {
  if (!fs.existsSync(file)) {
    console.log('[patch-yt-dlp] File not found, skipping:', file);
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('let stdout = "";') && src.includes('JSON.parse(stdout)')) {
    console.log('[patch-yt-dlp] Already patched, skipping');
    return;
  }

  const regex = /var json =[\s\S]*?\,\s*"json"\);/m;
  const replacement = `var json = /* @__PURE__ */ __name((url, flags, options) => {
  const process2 = (0, import_node_child_process.spawn)(YTDLP_PATH, args(url, flags), options);
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    process2.stdout?.on("data", (chunk) => { stdout += chunk; });
    process2.stderr?.on("data", (chunk) => { stderr += chunk; });
    process2.on("close", (code) => {
      if (code === 0) {
        try { resolve(JSON.parse(stdout)); }
        catch (e) { reject(new Error(stderr || stdout)); }
      } else {
        reject(new Error(stderr || stdout));
      }
    });
    process2.on("error", reject);
  });
}, "json");`;

  if (!regex.test(src)) {
    console.warn('[patch-yt-dlp] Could not find json() function to patch. Leaving file unchanged.');
    return;
  }
  const next = src.replace(regex, replacement);
  fs.writeFileSync(file, next, 'utf8');
  console.log('[patch-yt-dlp] Applied stdout-only JSON patch to', file);
}

try { patch(); } catch (e) { console.error('[patch-yt-dlp] Patch failed:', e?.message || e); process.exitCode = 0; }
