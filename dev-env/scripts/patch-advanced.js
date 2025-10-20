// Patch avanzado para @distube/yt-dlp - sobrescribe las funciones de argumentos
// Este parche intercepta la creación de argumentos y remueve opciones deprecadas

import fs from 'fs';
import path from 'path';

const file = path.resolve('node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');

function patchAdvanced() {
  if (!fs.existsSync(file)) {
    console.log('[patch-advanced] File not found, skipping:', file);
    return;
  }

  let src = fs.readFileSync(file, 'utf8');
  
  // Verificar si ya está pateado
  if (src.includes('// ADVANCED PATCH APPLIED')) {
    console.log('[patch-advanced] Already patched, skipping');
    return;
  }

  // Buscar la función que construye los argumentos
  // Típicamente será algo como 'args(' o similar
  const argsRegex = /function\s+args\s*\([^)]*\)\s*{[^}]*}/g;
  const match = src.match(argsRegex);
  
  if (match) {
    console.log('[patch-advanced] Found args function, patching...');
    
    // Crear una nueva función que filtre opciones deprecadas
    const patchedFunction = `
    function args(url, flags, options) {
      // Construir argumentos base
      let baseArgs = ["--dump-json", "--no-warnings"];
      
      // Añadir URL
      if (url) baseArgs.push(url);
      
      // Procesar flags, excluyendo opciones deprecadas
      if (flags) {
        const deprecatedFlags = [
          '--no-call-home',
          '--prefer-avconv', 
          '--prefer-ffmpeg',
          '--youtube-skip-dash-manifest'
        ];
        
        Object.entries(flags).forEach(([key, value]) => {
          const flagName = key.startsWith('--') ? key : '--' + key;
          
          // Saltar opciones deprecadas
          if (deprecatedFlags.includes(flagName)) {
            console.log('[patch-advanced] Skipping deprecated option:', flagName);
            return;
          }
          
          if (value === true) {
            baseArgs.push(flagName);
          } else if (value !== false && value !== null && value !== undefined) {
            baseArgs.push(flagName, String(value));
          }
        });
      }
      
      // Añadir cookies si están configuradas
      if (process.env.YT_DLP_COOKIES && fs.existsSync(process.env.YT_DLP_COOKIES)) {
        baseArgs.push('--cookies', process.env.YT_DLP_COOKIES);
      }
      
      // Añadir user-agent si está configurado
      if (process.env.YT_DLP_USER_AGENT) {
        baseArgs.push('--user-agent', process.env.YT_DLP_USER_AGENT);
      }
      
      // Añadir referer si está configurado
      if (process.env.YT_DLP_REFERER) {
        baseArgs.push('--referer', process.env.YT_DLP_REFERER);
      }
      
      return baseArgs.filter(arg => arg !== null && arg !== undefined);
    }`;
    
    // Reemplazar la función original
    src = src.replace(match[0], patchedFunction);
    src = '// ADVANCED PATCH APPLIED - deprecated options filtered\n' + src;
    
    fs.writeFileSync(file, src, 'utf8');
    console.log('[patch-advanced] Successfully applied advanced patch');
  } else {
    console.log('[patch-advanced] Could not find args function to patch');
    
    // Enfoque alternativo: añadir al final del archivo
    const interceptor = `
// ADVANCED PATCH APPLIED - argument interceptor
const originalSpawn = require('child_process').spawn;
require('child_process').spawn = function(command, args, options) {
  if (command.includes('yt-dlp') && Array.isArray(args)) {
    // Filtrar opciones deprecadas de los argumentos
    args = args.filter(arg => 
      arg !== '--no-call-home' && 
      arg !== '--prefer-avconv' && 
      arg !== '--prefer-ffmpeg'
    );
    console.log('[interceptor] Filtered yt-dlp args:', args.slice(0, 5));
  }
  return originalSpawn.call(this, command, args, options);
};`;
    
    src += interceptor;
    fs.writeFileSync(file, src, 'utf8');
    console.log('[patch-advanced] Applied spawn interceptor patch');
  }
}

try { 
  patchAdvanced(); 
} catch (e) { 
  console.error('[patch-advanced] Patch failed:', e?.message || e); 
  process.exitCode = 0; 
}