/* CorrelationPro — manual de usuario: lo común de las herramientas que manejan un navegador sin ventana.
   Abre Edge (o Chrome, si no hay Edge) con el protocolo de DevTools en un perfil temporal propio, que se
   borra al cerrar; nunca toca el navegador del usuario. Sin dependencias: node 18 o posterior. */
'use strict';
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function abrir(o) {
  o = o || {};
  const exe = NAVEGADORES.find(f => fs.existsSync(f));
  if (!exe) throw new Error('No encuentro Edge ni Chrome');
  const puerto = 9500 + Math.floor(Math.random() * 400);
  const perfil = path.join(os.tmpdir(), 'correlationpro-manual-' + puerto);
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--allow-file-access-from-files', '--remote-debugging-port=' + puerto, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  let destino = null;
  for (let i = 0; i < 80 && !destino; i++) {
    try { const r = await fetch(`http://127.0.0.1:${puerto}/json`); destino = (await r.json()).find(t => t.type === 'page'); } catch (e) { /* aún no */ }
    if (!destino) await esperar(200);
  }
  if (!destino) { proc.kill(); throw new Error('El navegador no abrió su puerto de depuración'); }
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.addEventListener('open', r); ws.addEventListener('error', x); });
  let id = 0;
  const pend = new Map(), errores = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errores.push('EXC ' + ((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) errores.push(m.params.type + ' ' + m.params.args.map(a => a.value || a.description).join(' '));
  });
  const enviar = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await enviar('Runtime.enable'); await enviar('Page.enable');
  await enviar('Emulation.setDeviceMetricsOverride', { width: o.ancho || 1400, height: o.alto || 900, deviceScaleFactor: o.escala || 1, mobile: false });
  /* sin animaciones: cada captura sale igual */
  await enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: o.tema === 'dark' ? 'dark' : 'light' }] });
  const evaluar = async (codigo, tiempo) => {
    const r = await enviar('Runtime.evaluate', { expression: codigo, awaitPromise: true, returnByValue: true, timeout: tiempo || 120000 });
    if (r.result && r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text);
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  /* Al navegador se le pide que se cierre él mismo: el proceso que arranca node puede pasarle el relevo a
     otro, y entonces matar el primero deja al segundo abierto (así se juntaron decenas de navegadores sin
     ventana en una tanda de capturas). Si su puerto sigue contestando, se cierran los procesos de ese perfil. */
  const cerrar = async () => {
    try { enviar('Browser.close'); } catch (e) { /* ya cerrado */ }
    await esperar(300);
    try { ws.close(); } catch (e) { /* ya cerrado */ }
    try { proc.kill(); } catch (e) { /* ya no está */ }
    let vivo = true;
    for (let i = 0; i < 15 && vivo; i++) {
      try { await fetch(`http://127.0.0.1:${puerto}/json/version`); await esperar(200); } catch (e) { vivo = false; }
    }
    if (vivo) cerrarPorPerfil(perfil);
    for (let i = 0; i < 6; i++) {
      try { fs.rmSync(perfil, { recursive: true, force: true }); break; } catch (e) { await esperar(300); }
    }
  };
  return { enviar, evaluar, cerrar, errores, esperar };
}
/* Último recurso: cierra los procesos del navegador cuya línea de órdenes nombra ese perfil temporal y sólo esos. */
function cerrarPorPerfil(perfil) {
  const nombre = path.basename(perfil);
  if (!/^correlationpro-manual-\d+$/.test(nombre)) return;
  try {
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      `Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(msedge|chrome)\\.exe$' -and $_.CommandLine -like '*${nombre}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
      { stdio: 'ignore', timeout: 30000 });
  } catch (e) { /* no se pudo: el perfil queda para borrarlo a mano */ }
}
const urlDe = f => 'file:///' + path.resolve(f).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^file:\/\/\/([A-Za-z])%3A/, 'file:///$1:');
module.exports = { abrir, esperar, urlDe };
