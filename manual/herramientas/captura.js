/* CorrelationPro — manual de usuario: captura de pantalla de la app.
   Abre index.html (file://) en un navegador sin ventana, ejecuta una receta (recetas/<nombre>.js) y guarda
   manual/img/<nombre>.png al doble de resolución. La receta devuelve el recorte "x,y,ancho,alto" en
   coordenadas del documento (getBoundingClientRect + scroll) o nada, para la ventana entera.
   Uso, desde la carpeta de la app:
     node manual/herramientas/captura.js <receta> [--ancho 1400] [--alto 900] [--tema dark] [--idioma en] [--salida nombre]
     (--salida en/<nombre> la deja en manual/img/en/)
     node manual/herramientas/captura.js --todas          (todas las recetas, con la ventana que pide cada una)
   Una receta puede pedir su ventana en su primera línea:  // ventana 1500x1100 */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, esperar, urlDe } = require('./cdp');

const MAN = path.resolve(__dirname, '..'), APP = path.resolve(MAN, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };

async function una(nombre, o) {
  const archivo = path.join(__dirname, 'recetas', nombre + '.js');
  const propia = fs.readFileSync(archivo, 'utf8');
  const v = propia.match(/^\/\/\s*ventana\s+(\d+)x(\d+)/);
  /* the shared helpers go first */
  const comun = path.join(__dirname, 'recetas', '_comun.js');
  const codigo = (fs.existsSync(comun) ? fs.readFileSync(comun, 'utf8') + '\n' : '') + propia;
  const ancho = +(o.ancho || (v && v[1]) || 1400), alto = +(o.alto || (v && v[2]) || 900);
  const nav = await abrir({ ancho, alto, escala: 2, tema: o.tema });
  try {
    /* the interface language is the saved one: write it first, then open the app again */
    await nav.enviar('Page.navigate', { url: urlDe(path.join(APP, 'index.html')) });
    await esperar(600);
    await nav.evaluar(`localStorage.setItem('correlationpro:lang', ${JSON.stringify(o.idioma === 'en' ? 'en' : 'es')}); 1`);
    await nav.enviar('Page.navigate', { url: urlDe(path.join(APP, 'index.html')) });
    await esperar(1800);
    const recorte = await nav.evaluar(codigo, 240000);
    await esperar(700);
    const p = { format: 'png', captureBeyondViewport: true };
    if (recorte) { const [x, y, w, h] = String(recorte).split(',').map(Number); p.clip = { x, y, width: w, height: h, scale: 1 }; }
    else p.captureBeyondViewport = false;
    /* un cuadro nuevo antes de capturar: el navegador sin ventana deja de pintar si nada cambia */
    await nav.evaluar('document.body.style.outline = "0.01px solid transparent"; new Promise(r => requestAnimationFrame(() => r(1)))');
    const r = await nav.enviar('Page.captureScreenshot', p);
    const salida = path.join(MAN, 'img', (o.salida || nombre) + '.png');
    fs.writeFileSync(salida, Buffer.from(r.result.data, 'base64'));
    /* numbered marks: the recipe leaves window.__marcas = [[n, x%, y%], …] relative to the clip */
    const marcas = await nav.evaluar('JSON.stringify(window.__marcas || null)');
    if (marcas && marcas !== 'null') { fs.writeFileSync(salida.replace(/\.png$/, '.marcas.json'), marcas); console.log('  marcas: ' + marcas); }
    const err = nav.errores.filter(e => !/favicon/.test(e));
    console.log(`${nombre}: ${recorte || 'ventana ' + ancho + '×' + alto}${err.length ? '  ⚠ ' + err.join(' | ') : ''}`);
  } finally { await nav.cerrar(); }
}

(async () => {
  if (process.argv.includes('--todas')) {
    const todas = fs.readdirSync(path.join(__dirname, 'recetas')).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => f.slice(0, -3)).sort();
    for (const n of todas) await una(n, {});
    return;
  }
  const nombres = process.argv.slice(2).filter((a, i, A) => !a.startsWith('--') && !(A[i - 1] || '').startsWith('--'));
  for (const n of nombres) await una(n, { ancho: arg('ancho'), alto: arg('alto'), tema: arg('tema'), idioma: arg('idioma'), salida: nombres.length === 1 ? arg('salida') : null });
})().catch(e => { console.error(e.message || e); process.exit(1); });
