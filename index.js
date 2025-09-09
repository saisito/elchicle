// ElChicle - bot de música para Discord
// Módulos principales: discord.js + DisTube (yt-dlp plugin)
// Nota: este archivo está pensado para ejecutarse en entornos Linux/AL2023.
// Requiere que FFMPEG y yt-dlp estén disponibles en el PATH del sistema.

import http from "http";
import { exec, execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { DisTube } from "distube";
import { YtDlpPlugin } from "@distube/yt-dlp";

// Health server (Elastic Beanstalk / plataformas web)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot running");
}).listen(PORT, () => {
  console.log(`HTTP server listening on ${PORT}`);
});

//
// Helpers & configuración
//
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENQUEUE_DELAY_MS = 450;
const YT_DLP_BACKOFF_MS = 500;
const MAX_PLAY_RETRIES = 6;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parsea varios formatos de tiempo a segundos.
 * Soporta: "HH:MM:SS", "MM:SS", "123" (segundos), y "1h2m3s".
 */
function parseTimeToSeconds(str) {
  if (!str || typeof str !== "string") return NaN;
  str = str.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(p => p.trim()).filter(Boolean);
    if (parts.some(p => !/^\d+$/.test(p))) return NaN;
    let seconds = 0, mul = 1;
    for (let i = parts.length - 1; i >= 0; i--) {
      seconds += parseInt(parts[i], 10) * mul;
      mul *= 60;
    }
    return seconds;
  }
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const m = str.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (m) {
    const h = parseInt(m[1] || "0", 10);
    const mm = parseInt(m[2] || "0", 10);
    const s = parseInt(m[3] || "0", 10);
    return h * 3600 + mm * 60 + s;
  }
  return NaN;
}

/**
 * Ejecuta execFile (promise) y devuelve stdout.
 * Aumenta maxBuffer para evitar truncado con yt-dlp grandes.
 */
function execFilePromise(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 20 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

/**
 * Sanitiza enlaces de YouTube: elimina parámetros de playlist y deja
 * solo el id del video y el parámetro t (si existe).
 */
function sanitizeYouTubeUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId = null;
      if (u.hostname === "youtu.be") videoId = u.pathname.slice(1);
      else videoId = u.searchParams.get("v");
      if (!videoId) return url;
      const timeParam = u.searchParams.get("t");
      let cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      if (timeParam) cleanUrl += `&t=${timeParam}`;
      return cleanUrl;
    }
  } catch (e) {
    // No es una URL válida -> devolver tal cual
  }
  return url;
}

/**
 * Expande playlists usando yt-dlp. Hace varios intentos si hay EBUSY.
 * Devuelve array de objetos JSON (cada línea JSON que devuelve yt-dlp).
 */
async function getPlaylistItems(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Usamos el módulo de Python/yt_dlp para compatibilidad en sistemas donde
      // el ejecutable pueda no llamarse 'yt-dlp'.
      const out = await execFilePromise("python3", ["-m", "yt_dlp", "-j", "--flat-playlist", url]);
      const lines = out.trim().split("\n").filter(Boolean);

      // Algunas líneas pueden ser warnings; intentar parsear JSON sólo donde aplique.
      const items = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (parseError) {
          console.warn("Línea no JSON ignorada:", line.substring(0, 100));
          return null;
        }
      }).filter(item => item !== null);

      return items;
    } catch (err) {
      const msg = err && (err.message || String(err));
      if (msg && msg.includes("EBUSY")) {
        await sleep(YT_DLP_BACKOFF_MS + attempt * 300);
        continue;
      }
      console.warn(`getPlaylistItems error (intento ${attempt + 1}):`, msg);
      if (attempt === 2) throw new Error("No se pudo ejecutar yt-dlp después de varios intentos.");
    }
  }
}

/**
 * Realiza play con varios reintentos ante errores relacionados con yt-dlp/EBUSY.
 * Retorna { ok: true } o { ok: false, err }.
 */
async function tryPlayWithRetries(videoUrl, channel, member, textChannel, maxAttempts = MAX_PLAY_RETRIES) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await distube.play(channel, videoUrl, { textChannel, member, skip: false });
      return { ok: true };
    } catch (err) {
      const msg = err && (err.message || String(err));
      console.warn(`tryPlayWithRetries intento ${attempt + 1} para ${videoUrl} falló:`, msg);
      if (msg && (msg.includes("EBUSY") || /yt-dlp/i.test(msg) || /resource busy/i.test(msg) || /locked/i.test(msg))) {
        const wait = YT_DLP_BACKOFF_MS + attempt * 300;
        await sleep(wait);
        continue;
      }
      return { ok: false, err: msg || "Error desconocido" };
    }
  }
  return { ok: false, err: "Máximo de reintentos alcanzado (yt-dlp ocupado)" };
}

// ===== Configuración principal =====
const TOKEN = process.env.TOKEN;

// Prueba mínima (lista de reproducción de prueba)
const listaPruebas = [
  "https://youtu.be/H62lqxqc-I0?si=o9CdtroNggnsLjcD"
];

// Envío seguro de mensajes (evita crashes por canales cerrados/permiso denegado)
const safeSend = async (ch, content) => {
  try {
    if (ch?.send) {
      if (typeof content === "string" && content.length > 2000) {
        content = content.substring(0, 1997) + "...";
      }
      await ch.send(content);
    }
  } catch (e) {
    console.error("safeSend error:", e);
  }
};

// Cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// DisTube configurado para entornos Linux: ruta de ffmpeg configurable via FFMPEG_PATH
const distube = new DisTube(client, {
  plugins: [new YtDlpPlugin({ update: false })],
  ffmpeg: process.env.FFMPEG_PATH || "/usr/bin/ffmpeg",
  nsfw: false
});

// ================== Eventos DisTube ==================
distube
  .on("initQueue", (queue) => {
    queue.autoplay = true;
    safeSend(queue.textChannel, "🧱 Cola inicializada (autoplay: ON).");
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
  .on("error", (channel, error) => {
    console.error("Error de DisTube:", error);
    let errorMessage = "Error desconocido";
    try {
      if (error && error.message) errorMessage = error.message;
      else if (typeof error === "string") errorMessage = error;
      else errorMessage = JSON.stringify(error, (key, value) => (["distube", "voice", "client", "queue"].includes(key) ? "[Circular]" : value));
    } catch (e) {
      errorMessage = "No se pudo obtener información del error";
    }
    safeSend(channel, `❌ **ERROR**: ${errorMessage.substring(0, 1000)}`);
  });

// ================== Comandos (messageCreate) ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ").filter(Boolean);
  const cmd = args.shift()?.toLowerCase();

  // HELP
  if (cmd === "!help") {
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎵 Comandos del Bot de Música")
      .setDescription("Lista de todos los comandos disponibles:")
      .addFields(
        { name: "🎶 !play [url/búsqueda]", value: "Reproduce un enlace o hace una búsqueda en YT" },
        { name: "📃 !playlist [url]", value: "Carga una playlist de YouTube/YouTube Music en la cola" },
        { name: "🧪 !elchicle", value: "Prueba rápida/diagnóstico" },
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

  // NP
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

  // SHUFFLE
  if (cmd === "!shuffle") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    try { queue.shuffle(); message.channel.send("🔀 Cola mezclada aleatoriamente."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  // LOOP
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

  // ELCHICLE (test rápido)
  if (cmd === "!elchicle") {
    const channel = message.member?.voice.channel;
    if (!channel) return message.reply("⚠️ Debes estar en un canal de voz.");
    const me = message.guild?.members?.me;
    const perms = channel.permissionsFor(me ?? client.user.id);
    if (!perms?.has(PermissionFlagsBits.Connect)) return message.reply("❌ No tengo permiso **Conectar** en ese canal.");
    if (!perms?.has(PermissionFlagsBits.Speak)) return message.reply("❌ No tengo permiso **Hablar** en ese canal.");
    await safeSend(message.channel, "🎵 **Iniciando prueba con lista de canciones...**");
    for (let i = 0; i < listaPruebas.length; i++) {
      const url = listaPruebas[i];
      await safeSend(message.channel, `🔊 **Probando canción ${i + 1}/${listaPruebas.length}:** \`${url}\``);
      try {
        await distube.play(channel, url, { textChannel: message.channel, member: message.member, skip: false });
        await sleep(3000);
      } catch (error) {
        console.error("Error en prueba:", error);
        await safeSend(message.channel, `❌ **Error con canción ${i + 1}:** ${error?.message || error}`);
      }
    }
    await safeSend(message.channel, "✅ **Prueba completada.**");
    return;
  }

  // PLAY (url o búsqueda)
  if (cmd === "!play") {
    const channel = message.member?.voice.channel;
    if (!channel) return message.reply("⚠️ Debes estar en un canal de voz.");
    const me = message.guild?.members?.me;
    const perms = channel.permissionsFor(me ?? client.user.id);
    if (!perms?.has(PermissionFlagsBits.Connect)) return message.reply("❌ No tengo permiso **Conectar**.");
    if (!perms?.has(PermissionFlagsBits.Speak)) return message.reply("❌ No tengo permiso **Hablar**.");

    let query = args.join(" ");
    if (!query) return message.reply("⚠️ Debes escribir el nombre de la canción o artista.");

    let isUrl = false;
    try { new URL(query); isUrl = true; } catch (e) { isUrl = false; }

    try {
      if (isUrl) {
        query = sanitizeYouTubeUrl(query);
        await distube.play(channel, query, { textChannel: message.channel, member: message.member });
      } else {
        await safeSend(message.channel, `🔍 Buscando en YouTube: \`${query}\``);
        const ytCommand = `python3 -m yt_dlp "ytsearch1:${query}" --get-id --no-warnings`;
        exec(ytCommand, async (err, stdout, stderr) => {
          if (err || !stdout) {
            console.error("Error yt-dlp:", err || stderr);
            return safeSend(message.channel, `❌ No se encontraron resultados para: \`${query}\``);
          }
          const videoId = stdout.split("\n")[0].trim();
          const url = `https://www.youtube.com/watch?v=${videoId}`;
          try {
            await distube.play(channel, url, { textChannel: message.channel, member: message.member });
          } catch (playError) {
            console.error("Error reproduciendo video:", playError);
            safeSend(message.channel, `❌ Error al reproducir: ${playError.message || playError}`);
          }
        });
      }
    } catch (error) {
      console.error("Error en !play:", error);
      await safeSend(message.channel, `❌ Error inesperado: ${error.message || error}`);
    }
    return;
  }

  // SKIP
  if (cmd === "!skip") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    try { await queue.skip(); message.channel.send("⏭️ Canción saltada."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  // STOP
  if (cmd === "!stop") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    try { await queue.stop(); message.channel.send("🛑 Reproducción detenida."); }
    catch (error) { message.reply(`❌ Error: ${error.message}`); }
    return;
  }

  // QUEUE
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

  // PAUSE / RESUME
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

  // VOLUME
  if (cmd === "!volume") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones reproduciéndose.");
    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 1 || volume > 100) return message.reply("⚠️ Por favor especifica un volumen entre 1 y 100.");
    await queue.setVolume(volume);
    message.channel.send(`🔊 Volumen ajustado a ${volume}%`);
    return;
  }

  // REMOVE
  if (cmd === "!remove") {
    const queue = distube.getQueue(message.guildId);
    if (!queue) return message.reply("❌ No hay canciones en la cola.");
    const index = parseInt(args[0]);
    if (isNaN(index) || index < 1 || index > queue.songs.length) return message.reply(`⚠️ Debes poner un número válido entre 1 y ${queue.songs.length}.`);
    const removed = queue.songs.splice(index - 1, 1)[0];
    message.channel.send(`🗑️ Eliminada: \`${removed.name}\``);
    return;
  }

  // INTERRUPT
  if (cmd === "!interrupt") {
    try {
      const queue = distube.getQueue(message.guildId);
      if (queue) {
        queue.stop();
        try { distube.voices.leave(message.guildId); } catch (e) { /* ignore */ }
      }
      message.channel.send("⛔ **Interrupt ejecutado. Bot reiniciado.**");
      console.log("⚡ Interrupt ejecutado manualmente.");
    } catch (err) {
      console.error("Error en !interrupt:", err);
      message.channel.send(`❌ Error en interrupt: ${err.message}`);
    }
    return;
  }

  // PLAYLIST (robusto)
  if (cmd === "!playlist") {
    const channel = message.member?.voice.channel;
    if (!channel) return message.reply("⚠️ Debes estar en un canal de voz.");
    const url = args[0];
    if (!url) return message.reply("⚠️ Debes pasar la URL de una playlist o álbum.");
    const me = message.guild?.members?.me;
    const perms = channel.permissionsFor(me ?? client.user.id);
    if (!perms?.has(PermissionFlagsBits.Connect)) return message.reply("❌ No tengo permiso **Conectar**.");
    if (!perms?.has(PermissionFlagsBits.Speak)) return message.reply("❌ No tengo permiso **Hablar**.");
    await safeSend(message.channel, `📃 Expandiendo playlist: \`${url}\``);

    let items;
    try { items = await getPlaylistItems(url); }
    catch (err) { console.error("Error obteniendo items de playlist:", err); return await safeSend(message.channel, `❌ No se pudo expandir la playlist: ${err?.message || err}`); }

    if (!items || items.length === 0) return await safeSend(message.channel, "❌ No se encontraron canciones en esa playlist.");

    let added = 0, skipped = 0, failed = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || !it.id) { skipped++; continue; }
      const videoUrl = `https://www.youtube.com/watch?v=${it.id}`;

      let addedThisSong = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await tryPlayWithRetries(videoUrl, channel, message.member, message.channel, MAX_PLAY_RETRIES);
        if (res.ok) { added++; addedThisSong = true; break; }
        else if (res.err && res.err.includes("EBUSY")) { console.warn(`⚠️ ${videoUrl} busy, reintentando (intento ${attempt})`); await sleep(500); continue; }
        else { console.warn(`❌ Error con ${videoUrl}: ${res.err}`); await safeSend(message.channel, `❌ Error con canción #${i + 1}: ${res.err}`); break; }
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

}); // end messageCreate

// Evento ready
client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`✅ FFmpeg configurado correctamente (ruta: ${process.env.FFMPEG_PATH || "/usr/bin/ffmpeg"})`);
  console.log(`✅ Lista de pruebas cargada con ${listaPruebas.length} canciones`);
  client.user.setActivity("!help para comandos", { type: "LISTENING" });
});

// Login (usa TOKEN desde variables de entorno)
client.login(TOKEN).catch(error => {
  console.error("Error al conectar el bot:", error);
  process.exit(1);
});
