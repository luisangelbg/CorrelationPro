/* CorrelationPro — manual de usuario: imprime es/manual-completo.html a PDF.
   Abre el manual unido en Edge sin ventana (perfil temporal propio, que se borra al terminar), espera a que
   las tres tipografías estén cargadas —Cormorant en el peso 500, el que pide la hoja de estilo— y a que el
   número de hojas deje de cambiar, y sólo entonces llama a Page.printToPDF con los fondos, hoja carta y sin
   márgenes. No se usa --print-to-pdf: ese imprime en cuanto la página carga, antes de que paginar.js
   reparta las hojas. El PDF sale por flujo (no en un solo mensaje), porque con las capturas pesa decenas de MB.
   Uso, desde la raíz de la app:   node manual/herramientas/imprimir-pdf.js [es] */
'use strict';
const fs = require('fs');
const path = require('path');
const { abrir, esperar, urlDe } = require('./cdp');

(async () => {
  const lang = process.argv[2] || 'es';
  const manual = path.resolve(__dirname, '..');
  const fuente = path.join(manual, lang, 'manual-completo.html');
  if (!fs.existsSync(fuente)) throw new Error('No existe ' + fuente + ': primero une las partes con herramientas/unir-manual.ps1');
  const salida = path.join(manual, `CorrelationPro_Manual_de_usuario_${lang.toUpperCase()}.pdf`);
  const nav = await abrir({ ancho: 1100, alto: 1400 });
  try {
    await nav.enviar('Page.navigate', { url: urlDe(fuente) });
    const estado = await nav.evaluar(`new Promise(async listo => {
      const t0 = Date.now();
      const fams = [['Cormorant', '500 16px "Cormorant"'], ['Crimson Pro', '400 16px "Crimson Pro"'], ['Jost', '400 16px "Jost"']];
      const cuenta = () => document.querySelectorAll('.libro .hoja').length;
      let previo = -1, estable = 0;
      while (Date.now() - t0 < 300000) {
        await new Promise(r => setTimeout(r, 500));
        const n = cuenta();
        if (n > 0 && n === previo) estable++; else estable = 0;
        previo = n;
        const cargadas = fams.every(f => document.fonts.check(f[1]));
        if (n > 0 && estable >= 4 && cargadas && document.documentElement.classList.contains('paginado')) break;
      }
      const hojas = [...document.querySelectorAll('.libro .hoja')];
      listo({ hojas: hojas.length + document.querySelectorAll('body > .hoja').length, ultima: hojas.length ? hojas[hojas.length - 1].dataset.num : '',
        desbordes: hojas.filter(h => { const c = h.querySelector('.hoja-cuerpo'); return c && c.scrollHeight > c.clientHeight + 1; }).map(h => h.dataset.num),
        imagenes: [...document.images].filter(i => !i.complete || !i.naturalWidth).length,
        fuentes: fams.filter(f => document.fonts.check(f[1])).map(f => f[0]), agotado: Date.now() - t0 >= 300000 });
    })`, 320000);
    console.log('estado: ' + JSON.stringify(estado));
    const r = await nav.enviar('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, paperWidth: 8.5, paperHeight: 11,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, displayHeaderFooter: false, scale: 1, transferMode: 'ReturnAsStream' });
    if (r.error) throw new Error('printToPDF: ' + r.error.message);
    const flujo = r.result.stream, trozos = [];
    for (;;) {
      const t = await nav.enviar('IO.read', { handle: flujo, size: 4 * 1024 * 1024 });
      if (t.error) throw new Error('IO.read: ' + t.error.message);
      trozos.push(Buffer.from(t.result.data, t.result.base64Encoded ? 'base64' : 'utf8'));
      if (t.result.eof) break;
    }
    await nav.enviar('IO.close', { handle: flujo });
    fs.writeFileSync(salida, Buffer.concat(trozos));
    console.log(`PDF: ${path.relative(path.resolve(manual, '..'), salida)} · ${(fs.statSync(salida).size / 1048576).toFixed(1)} MB`);
  } finally { await nav.cerrar(); await esperar(100); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
