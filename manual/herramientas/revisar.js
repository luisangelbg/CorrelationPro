/* CorrelationPro — manual de usuario: revisa cómo quedó paginada una parte (o el manual completo).
   Abre el archivo en un navegador sin ventana, espera a que paginar.js termine y escribe: cuántas hojas, la
   numeración, las hojas que desbordan, los elementos más altos que una hoja, las imágenes que no cargaron y
   el hueco al pie de cada hoja (en pulgadas; un hueco grande antes de una figura es normal).
   Uso:   node manual/herramientas/revisar.js manual/es/03-bloque3.html [--huecos 1.5] */
'use strict';
const path = require('path');
const { abrir, esperar, urlDe } = require('./cdp');

(async () => {
  const archivo = process.argv[2];
  const umbral = +(process.argv[process.argv.indexOf('--huecos') + 1] || 1.6);
  const nav = await abrir({ ancho: 1100, alto: 1400 });
  try {
    await nav.enviar('Page.navigate', { url: urlDe(archivo) });
    const r = await nav.evaluar(`new Promise(async listo => {
      const t0 = Date.now();
      while (!document.documentElement.classList.contains('paginado') && Date.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
      await new Promise(r => setTimeout(r, 400));
      const hojas = [...document.querySelectorAll('.libro .hoja')];
      const px = 96, out = { hojas: hojas.length, nums: hojas.map(h => h.dataset.num).join(' '), desbordes: [], huecos: [], imgs: [] };
      hojas.forEach(h => {
        const c = h.querySelector('.hoja-cuerpo');
        if (!c) return;
        if (c.scrollHeight > c.clientHeight + 1) out.desbordes.push(h.dataset.num);
        const ult = c.lastElementChild;
        if (ult) {
          const hueco = (c.getBoundingClientRect().bottom - ult.getBoundingClientRect().bottom) / px;
          const sig = h.nextElementSibling && h.nextElementSibling.querySelector('.hoja-cuerpo > *');
          const im = sig && sig.querySelector && sig.querySelector('img'); if (hueco > ${umbral}) out.huecos.push(h.dataset.num + ': ' + hueco.toFixed(2) + ' in' + (sig ? ' (sigue ' + sig.tagName.toLowerCase() + (im ? ' ' + im.getAttribute('src').split('/').pop().replace('.png', '') : '') + ')' : ''));
        }
      });
      document.querySelectorAll('img').forEach(i => { if (!i.complete || !i.naturalWidth) out.imgs.push(i.getAttribute('src')); });
      out.fuentes = document.fonts ? document.fonts.status : '';
      listo(out);
    })`, 90000);
    const altos = nav.errores.filter(e => /más alto que una hoja/.test(e));
    console.log(`${path.basename(archivo)}: ${r.hojas} hojas (${r.nums})`);
    if (r.desbordes.length) console.log('  DESBORDAN: ' + r.desbordes.join(', '));
    if (altos.length) console.log('  MÁS ALTOS QUE UNA HOJA: ' + altos.length);
    if (r.imgs.length) console.log('  IMÁGENES SIN CARGAR: ' + r.imgs.join(', '));
    if (r.huecos.length) console.log('  huecos > ' + umbral + ' in: ' + r.huecos.join(' · '));
    const otros = nav.errores.filter(e => !/más alto que una hoja/.test(e));
    if (otros.length) console.log('  consola: ' + otros.slice(0, 6).join(' | '));
  } finally { await nav.cerrar(); await esperar(100); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
