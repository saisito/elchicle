// ElChicle - bot de música para Discord
// Módulos: discord.js + DisTube (+ @distube/yt-dlp)
// Requisitos del host: ffmpeg y yt-dlp disponibles (o Python con módulo yt_dlp)

import http from "http";
import { execFile } from "child_process";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { DisTube } from "distube";
import ytdlp from "yt-dlp-exec";

// Cargar .env (para desarrollo local)
dotenv.config();

// Forzar entorno silencioso para yt-dlp/Python (previene 'Deprecated...' en stdout que rompe JSON)
process.env.PYTHONWARNINGS = process.env.PYTHONWARNINGS || "ignore"; // silencia DeprecationWarning
process.env.YTDL_NO_UPDATE = process.env.YTDL_NO_UPDATE || "1"; // evita auto-actualización
process.env.YT_DLP_NO_UPDATE = process.env.YT_DLP_NO_UPDATE || "1"; // equivalente para algunos empaques
process.env.YTDLP_DISABLE_DOWNLOAD = process.env.YTDLP_DISABLE_DOWNLOAD || "true"; // plugin: no descargar binario
process.env.PYTHONIOENCODING = process.env.PYTHONIOENCODING || "utf-8"; // asegura encoding consistente
process.env.LANG = process.env.LANG || "C.UTF-8";
process.env.LC_ALL = process.env.LC_ALL || "C.UTF-8";

// Global error handlers to avoid silent exits
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("warning", (w) => {
  console.warn("Warning:", w?.stack || w);
});

// Health server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot running");
}).listen(PORT, () => console.log(`HTTP server listening on ${PORT}`));

// Helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENQUEUE_DELAY_MS = 450;
const YT_DLP_BACKOFF_MS = 500;
const MAX_PLAY_RETRIES = 6;

const isWindows = process.platform === "win32";
// Nota: ahora preferimos usar el binario incluido por yt-dlp-exec.
// PYTHON_CMD queda solo como fallback para entornos que lo requieran.
const PYTHON_CMD = process.env.PYTHON_CMD || (isWindows ? "py" : "python3");
const DEFAULT_FFMPEG = process.env.FFMPEG_PATH || (isWindows ? "ffmpeg" : "/usr/bin/ffmpeg");

const globalInterrupt = { enabled: false, guildId: null };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let playIntroFlag = true;
const INTRO_URL = "https://youtu.be/E-hi_52A9MA?si=s0RcA0IW-bIN8Hfp";

function execFilePromise(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 20 * 1024 * 1024, ...opts }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function sanitizeYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (!videoId) return url;
      const timeParam = u.searchParams.get("t");
      return `https://www.youtube.com/watch?v=${videoId}` + (timeParam ? `&t=${timeParam}` : "");
    }
  } catch {}
  return url;
}

async function getPlaylistItems(url) {
  // Intentar con yt-dlp-exec (binario incluido). Fallback a python -m yt_dlp si falla
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const opts = {
        dumpSingleJson: true,
        flatPlaylist: true,
        noWarnings: true,
        quiet: true,
        // Pasar cookies si existen
        ...(process.env.YT_DLP_COOKIES ? { cookies: process.env.YT_DLP_COOKIES } : {}),
      };
      let out;
      try {
        out = await ytdlp(url, opts);
      } catch (binErr) {
        // Fallback a Python (por compatibilidad con algunos deploys)
        const args = ["-m", "yt_dlp", "-J", "--flat-playlist", "--no-warnings", url];
        if (process.env.YT_DLP_COOKIES) args.splice(3, 0, "--cookies", process.env.YT_DLP_COOKIES);
        out = await execFilePromise(PYTHON_CMD, isWindows ? ["-3", ...args] : args);
      }
      const parsed = typeof out === "string" ? JSON.parse(out) : out;
      if (parsed && Array.isArray(parsed.entries)) return parsed.entries.filter(Boolean).map(e => ({ id: e.id, title: e.title }));
      if (parsed && parsed.id) return [{ id: parsed.id, title: parsed.title }];
      return [];
    } catch (err) {
      const msg = err && (err.message || String(err));
      if (msg && /EBUSY|resource busy|locked/i.test(msg)) { await sleep(YT_DLP_BACKOFF_MS + attempt * 300); continue; }
      if (msg && msg.includes("Sign in to confirm you're not a bot")) throw new Error("Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador.");
      if (attempt === 2) throw new Error("No se pudo ejecutar yt-dlp después de varios intentos.");
    }
  }
}

async function tryPlayWithRetries(videoUrl, channel, member, textChannel, maxAttempts = MAX_PLAY_RETRIES) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (globalInterrupt.enabled && globalInterrupt.guildId === channel.guild.id) return { ok: false, err: "Interrupción global activada" };
      await distube.play(channel, videoUrl, { textChannel, member, skip: false });
      return { ok: true };
    } catch (err) {
      const msg = err && (err.message || String(err));
      if (globalInterrupt.enabled && globalInterrupt.guildId === channel.guild.id) return { ok: false, err: "Interrupción global activada" };
      if (msg && (msg.includes("EBUSY") || /yt-dlp/i.test(msg) || /resource busy/i.test(msg) || /locked/i.test(msg))) {
        await sleep(YT_DLP_BACKOFF_MS + attempt * 300);
        continue;
      }
      if (msg && msg.includes("Sign in to confirm you're not a bot")) return { ok: false, err: "Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador." };
      return { ok: false, err: msg || "Error desconocido" };
    }
  }
  return { ok: false, err: "Máximo de reintentos alcanzado (yt-dlp ocupado)" };
}

// ===== Configuración principal =====
const TOKEN = process.env.TOKEN;

const listaPruebas = ["https://youtu.be/H62lqxqc-I0?si=o9CdtroNggnsLjcD"];

const safeSend = async (ch, content) => {
  try {
    if (ch?.send) {
      if (typeof content === "string" && content.length > 2000) content = content.substring(0, 1997) + "...";
      await ch.send(content);
    }
  } catch (e) {
    console.error("safeSend error:", e);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Importar el plugin dinámicamente DESPUÉS de configurar env vars para evitar que se impriman warnings
const { YtDlpPlugin } = await import("@distube/yt-dlp");

const distube = new DisTube(client, {
  // Añadimos opciones conservadoras; el plugin heredará las env vars para su proceso hijo
  plugins: [new YtDlpPlugin({ update: false })],
  ffmpeg: DEFAULT_FFMPEG,
  nsfw: false
});

// ================== Eventos DisTube ==================
distube
  .on("initQueue", (queue) => { queue.autoplay = true; safeSend(queue.textChannel, "🧱 Cola inicializada (autoplay: ON)."); })
  .on("debug", (message, queue) => {
    const gid = queue?.id || queue?.textChannel?.guild?.id || "unknown";
    console.log(`[DisTube:debug][${gid}]`, message);
  })
  .on("addList", (queue, playlist) => {
    safeSend(queue.textChannel, `📃 Playlist detectada: **${playlist.name}** \n• Total: ${playlist.songs.length} canciones.`);
    if (playlist.songs.length > 5) {
      const preview = playlist.songs.slice(0, 5).map((s, i) => `${i + 1}. ${s.name || "Desconocida"}`).join("\n");
      safeSend(queue.textChannel, "🔎 Primeras 5 canciones:\n```\n" + preview + "\n```");
    }
  })
  .on("addSong", (queue, song) => safeSend(queue.textChannel, `➕ Añadido: \`${song.name || "Desconocida"}\``))
  .on("playSong", (queue, song) => {
    const idx = Math.max(0, queue.songs.findIndex(s => s.id === song.id)) + 1;
    safeSend(queue.textChannel, `▶️ Reproduciendo (${idx}/${queue.songs.length}): \`${song.name || "Desconocida"}\``);
  })
  .on("finish", (queue) => safeSend(queue.textChannel, "✅ Reproducción terminada."))
  .on("empty", (queue) => safeSend(queue.textChannel, "👋 Canal de voz vacío. Me desconecto."))
  .on("error", (error, queue) => {
    // Firma correcta en DisTube v5: (error, queue)
    try {
      console.error("Error de DisTube:", error);
      let msg = "Error desconocido";
      if (error?.message) msg = error.message;
      else if (typeof error === "string") msg = error;
      else {
        try { msg = JSON.stringify(error, (k, v) => (["distube", "voice", "client", "queue"].includes(k) ? "[Circular]" : v)); }
        catch { msg = String(error); }
      }
      if (msg.includes("Sign in to confirm you're not a bot")) msg = "Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador.";
      if (/FFMPEG_EXITED|ffmpeg exited/i.test(msg)) {
        msg += `\nSugerencias:\n1) Verifica que ffmpeg exista en '${DEFAULT_FFMPEG}' (o define FFMPEG_PATH).\n2) Revisa logs 'DisTube:debug' para ver la línea de comando de ffmpeg.\n3) En Railway, la imagen instala ffmpeg; si falla, revisa permisos o falta de certificados.`;
      }
      const target = queue?.textChannel;
      if (target) safeSend(target, `❌ **ERROR**: ${msg.substring(0, 1000)}`);
    } catch (e) {
      console.error("Error en manejador de 'error' de DisTube:", e);
    }
  });

// ================== Comandos (messageCreate) ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const args = message.content.split(" ").filter(Boolean);
  const cmd = args.shift()?.toLowerCase();

  if (cmd === "!help") {
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎵 Comandos del Bot de Música")
      .setDescription("Lista de todos los comandos disponibles:")
      .addFields(
        { name: "🎶 !play [url/búsqueda]", value: "Reproduce un enlace o hace una búsqueda en YT" },
        { name: "📃 !playlist [url]", value: "Carga una playlist de YouTube/YouTube Music en la cola" },
        { name: "⏭️ !skip", value: "Salta la canción actual" },
        { name: "🛑 !stop", value: "Detiene la reproducción y limpia la cola" },
        { name: "📋 !queue", value: "Muestra la cola de reproducción actual" },
        { name: "🗑️ !remove [índice]", value: "Elimina una canción de la cola por su índice" },
        { name: "⏸️ !pause", value: "Pausa la reproducción" },
        { name: "▶️ !resume", value: "Reanuda la reproducción" },
        { name: "🔊 !volume [1-100]", value: "Ajusta el volumen (1-100)" },
        { name: "🔀 !shuffle", value: "Mezcla la cola" },
        { name: "🔁 !loop [off/song/queue]", value: "Modo loop" },
        { name: "🎤 !np", value: "Muestra la canción actualmente reproduciéndose" },
        { name: "⛔ !interrupt", value: "Interrumpe y reinicia internamente" },
        { name: "❓ !help", value: "Muestra esta ayuda" }
      )
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === "!np") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎵 Reproduciendo ahora")
      .setDescription(`**${song.name}**`)
      .addFields(
        { name: "Duración", value: song.formattedDuration, inline: true },
        { name: "Solicitado por", value: song.user?.toString() || "Desconocido", inline: true },
        { name: "URL", value: song.url || "No disponible" }
      )
      .setThumbnail(song.thumbnail || "https://i.imgur.com/AfFp7pu.png");
    message.channel.send({ embeds: [embed] });
    return;
  }

  if (cmd === "!diag") {
    const checks = [];
    try {
      const out = await execFilePromise(DEFAULT_FFMPEG, ["-version"]);
      const first = String(out || "").split("\n")[0];
      checks.push(`ffmpeg: ${first}`);
    } catch (e) { checks.push(`ffmpeg: ERROR (${e?.message || e})`); }
    try {
      const v = await ytdlp("--version");
      checks.push(`yt-dlp: ${String(v).trim()}`);
    } catch (e) { checks.push(`yt-dlp: ERROR (${e?.message || e})`); }
    checks.push(`FFMPEG_PATH: ${DEFAULT_FFMPEG}`);
    checks.push(`PYTHONWARNINGS: ${process.env.PYTHONWARNINGS}`);
    checks.push(`YTDLP_DISABLE_DOWNLOAD: ${process.env.YTDLP_DISABLE_DOWNLOAD}`);
    await safeSend(message.channel, "Diagnóstico:\n" + checks.join("\n"));
    return;
  }

  if (cmd === "!shuffle") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    try { queue.shuffle(); message.channel.send("🔀 Cola mezclada aleatoriamente."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  if (cmd === "!loop") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    const mode = args[0]?.toLowerCase();
    let modeText = "";
    if (!mode || mode === "off") { queue.setRepeatMode(0); modeText = "Loop desactivado"; }
    else if (mode === "song" || mode === "track") { queue.setRepeatMode(1); modeText = "Loop de canción activado"; }
    else if (mode === "queue" || mode === "list") { queue.setRepeatMode(2); modeText = "Loop de cola activado"; }
    else return message.reply("❌ Modo de loop no válido. Usa: off, song o queue");
    message.channel.send(`🔁 ${modeText}`);
    return;
  }

  if (cmd === "!play") {
    const channel = message.member?.voice.channel;
    if (!channel) return message.reply("⚠️ Debes estar en un canal de voz.");
    const me = message.guild?.members?.me;
    const perms = channel.permissionsFor(me ?? client.user.id);
    if (!perms?.has(PermissionFlagsBits.Connect)) return message.reply("❌ No tengo permiso **Conectar**.");
    if (!perms?.has(PermissionFlagsBits.Speak)) return message.reply("❌ No tengo permiso **Hablar**.");

    let query = args.join(" ");
    if (!query) return message.reply("⚠️ Debes escribir el nombre de la canción o artista.");

    try {
      if (playIntroFlag) { playIntroFlag = false; await distube.play(channel, INTRO_URL, { member: message.member }); await sleep(1200); }

      let isUrl = false; try { new URL(query); isUrl = true; } catch {}

      if (isUrl) {
        query = sanitizeYouTubeUrl(query);
        await distube.play(channel, query, { textChannel: message.channel, member: message.member });
      } else {
        await safeSend(message.channel, `🔍 Buscando en YouTube: \`${query}\``);
        try {
          // Usar yt-dlp-exec para obtener el primer resultado como JSON
          const out = await ytdlp(`ytsearch1:${query}`, {
            dumpSingleJson: true,
            noWarnings: true,
            quiet: true,
            ...(process.env.YT_DLP_COOKIES ? { cookies: process.env.YT_DLP_COOKIES } : {}),
          });
          const parsed = typeof out === "string" ? JSON.parse(out) : out;
          const videoId = parsed?.entries?.[0]?.id || parsed?.id;
          if (!videoId) return safeSend(message.channel, `❌ No se encontraron resultados para: \`${query}\``);
          const url = `https://www.youtube.com/watch?v=${videoId}`;
          await distube.play(channel, url, { textChannel: message.channel, member: message.member });
        } catch (err) {
          console.error("Error yt-dlp (búsqueda):", err);
          if (err.message && err.message.includes("Sign in to confirm you're not a bot")) return safeSend(message.channel, "❌ Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador.");
          return safeSend(message.channel, `❌ Error en la búsqueda: ${err.message || err}`);
        }
      }
    } catch (error) {
      console.error("Error en !play:", error);
      if (error.message && error.message.includes("Sign in to confirm you're not a bot")) return safeSend(message.channel, "❌ Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador.");
      await safeSend(message.channel, `❌ Error inesperado: ${error.message || error}`);
    }
    return;
  }

  if (cmd === "!skip") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    try { await queue.skip(); message.channel.send("⏭️ Canción saltada."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  if (cmd === "!stop") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    try { await queue.stop(); message.channel.send("🛑 Reproducción detenida."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  if (cmd === "!queue") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    const songs = queue.songs.slice(0, 15).map((song, i) => `${i + 1}. ${song.name} - ${song.formattedDuration}`).join("\n");
    const totalDuration = queue.songs.reduce((acc, song) => acc + song.duration, 0);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    let queueInfo = `🎵 **Cola de reproducción**\n• Total: ${queue.songs.length} canciones\n• Duración total: ${hours > 0 ? `${hours}h ` : ""}${minutes}m\n• Loop: ${queue.repeatMode === 0 ? "Off" : queue.repeatMode === 1 ? "Canción" : "Cola"}\n\n**Canciones:**\n${songs}`;
    if (queue.songs.length > 15) queueInfo += `\n\n...y ${queue.songs.length - 15} más`;
    safeSend(message.channel, queueInfo);
    return;
  }

  if (cmd === "!pause") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    if (queue.paused) return message.reply("⏸️ La reproducción ya está pausada.");
    await queue.pause();
    message.channel.send("⏸️ Reproducción pausada.");
    return;
  }

  if (cmd === "!resume") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    if (!queue.paused) return message.reply("▶️ La reproducción no está pausada.");
    await queue.resume();
    message.channel.send("▶️ Reproducción reanudada.");
    return;
  }

  if (cmd === "!volume") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 1 || volume > 100) return message.reply("⚠️ Por favor especifica un volumen entre 1 y 100.");
    await queue.setVolume(volume);
    message.channel.send(`🔊 Volumen ajustado a ${volume}%`);
    return;
  }

  if (cmd === "!remove") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    const index = parseInt(args[0]);
    if (isNaN(index) || index < 1 || index > queue.songs.length) return message.reply(`⚠️ Debes poner un número válido entre 1 y ${queue.songs.length}.`);
    const removed = queue.songs.splice(index - 1, 1)[0];
    message.channel.send(`🗑️ Eliminada: \`${removed.name}\``);
    return;
  }

  if (cmd === "!interrupt") {
    try {
      globalInterrupt.enabled = true;
      globalInterrupt.guildId = message.guildId;
      playIntroFlag = true;
      const queue = distube.getQueue(message.guildId);
      if (queue) {
        queue.stop();
        try { distube.voices.leave(message.guildId); } catch (e) { console.error("Error al salir del canal de voz:", e); }
      } else {
        try { distube.voices.leave(message.guildId); } catch (e) { console.error("Error forzando desconexión:", e); }
      }
      message.channel.send("⛔ **Interrupt ejecutado. Bot reiniciado.**");
      setTimeout(() => { if (globalInterrupt.guildId === message.guildId) { globalInterrupt.enabled = false; globalInterrupt.guildId = null; } }, 5000);
    } catch (err) {
      console.error("Error en !interrupt:", err);
      message.channel.send(`❌ Error en interrupt: ${err.message}`);
    }
    return;
  }

  if (cmd === "!playlist") {
    const channel = message.member?.voice.channel;
    if (!channel) return message.reply("⚠️ Debes estar en un canal de voz.");
    const url = args[0];
    if (!url) return message.reply("⚠️ Debes pasar la URL de una playlist o álbum.");
    const me = message.guild?.members?.me;
    const perms = channel.permissionsFor(me ?? client.user.id);
    if (!perms?.has(PermissionFlagsBits.Connect)) return message.reply("❌ No tengo permiso **Conectar**.");
    if (!perms?.has(PermissionFlagsBits.Speak)) return message.reply("❌ No tengo permiso **Hablar**.");

    try { if (playIntroFlag) { playIntroFlag = false; await distube.play(channel, INTRO_URL, { member: message.member }); await sleep(1200); } } catch (err) { console.error("Error reproduciendo intro:", err); }
    await safeSend(message.channel, `📃 Expandiendo playlist: \`${url}\``);

    let items;
    try { items = await getPlaylistItems(url); }
    catch (err) {
      console.error("Error obteniendo items de playlist:", err);
      if (err.message && err.message.includes("Error de autenticación")) return await safeSend(message.channel, "❌ Error de autenticación de YouTube. Se requieren cookies. Contacta al administrador.");
      return await safeSend(message.channel, `❌ No se pudo expandir la playlist: ${err?.message || err}`);
    }
    if (!items || items.length === 0) return await safeSend(message.channel, "❌ No se encontraron canciones en esa playlist.");

    let added = 0, skipped = 0, failed = [];
    for (let i = 0; i < items.length; i++) {
      if (globalInterrupt.enabled && globalInterrupt.guildId === message.guildId) { await safeSend(message.channel, "⛔ **Playlist interrumpida.**"); globalInterrupt.enabled = false; return; }
      const it = items[i];
      if (!it || !it.id) { skipped++; continue; }
      const videoUrl = `https://www.youtube.com/watch?v=${it.id}`;

      let addedThisSong = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (globalInterrupt.enabled && globalInterrupt.guildId === message.guildId) { await safeSend(message.channel, "⛔ **Playlist interrumpida.**"); globalInterrupt.enabled = false; return; }
        const res = await tryPlayWithRetries(videoUrl, channel, message.member, message.channel, MAX_PLAY_RETRIES);
        if (res.ok) { added++; addedThisSong = true; break; }
        else if (res.err && res.err.includes("EBUSY")) { await sleep(500); continue; }
        else if (res.err && res.err.includes("Interrupción global")) { await safeSend(message.channel, "⛔ **Playlist interrumpida.**"); return; }
        else { failed.push({ index: i + 1, id: it.id, error: res.err }); await safeSend(message.channel, `❌ Error con canción #${i + 1}: ${res.err}`); break; }
      }

      if (!addedThisSong) skipped++;
      await sleep(ENQUEUE_DELAY_MS);
    }

    let resumen = `✅ Playlist procesada. Añadidas: ${added}. Saltadas: ${skipped}.`;
    if (failed.length) {
      const short = failed.slice(0, 6).map(f => `#${f.index} id=${f.id}`).join(", ");
      resumen += ` Errores: ${failed.length} (ej: ${short}${failed.length > 6 ? ", ..." : ""})`;
    }
    await safeSend(message.channel, resumen);
    return;
  }
});

// Evento ready
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`✅ FFmpeg configurado correctamente (ruta: ${DEFAULT_FFMPEG})`);
  console.log(`✅ Lista de pruebas cargada con ${listaPruebas.length} canciones`);
  if (process.env.YT_DLP_COOKIES) console.log(`✅ Cookies de YouTube configuradas: ${process.env.YT_DLP_COOKIES}`);
  else console.warn("⚠️  No se encontraron cookies de YouTube. Algunos videos pueden requerir autenticación.");
  client.user.setActivity("!help para comandos", { type: "LISTENING" });
});

// Login
client.login(TOKEN).catch(error => {
  console.error("Error al conectar el bot:", error);
  process.exit(1);
});