// Simple test to check yt-dlp JSON output is clean
process.env.PYTHONWARNINGS = process.env.PYTHONWARNINGS || "ignore";
process.env.YTDL_NO_UPDATE = process.env.YTDL_NO_UPDATE || "1";
process.env.YT_DLP_NO_UPDATE = process.env.YT_DLP_NO_UPDATE || "1";
process.env.PYTHONIOENCODING = process.env.PYTHONIOENCODING || "utf-8";
process.env.LANG = process.env.LANG || "C.UTF-8";
process.env.LC_ALL = process.env.LC_ALL || "C.UTF-8";

import ytdlp from "yt-dlp-exec";

async function main() {
  try {
    const query = "ytsearch1:never gonna give you up";
    const out = await ytdlp(query, { dumpSingleJson: true, noWarnings: true, quiet: true });
    const parsed = typeof out === "string" ? JSON.parse(out) : out;
    const id = parsed?.entries?.[0]?.id || parsed?.id;
    if (!id) throw new Error("No video id in result");
    console.log("OK JSON. First video id:", id);
    process.exit(0);
  } catch (e) {
    console.error("yt-dlp test failed:", e?.message || e);
  if (e?.stdout) console.error("stdout:", String(e.stdout).slice(0, 400));
  if (e?.stderr) console.error("stderr:", String(e.stderr).slice(0, 400));
    process.exit(1);
  }
}

main();
