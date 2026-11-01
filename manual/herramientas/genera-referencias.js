/* CorrelationPro — manual de usuario: escribe las referencias del apéndice F a partir del catálogo de la app.
   Lee js/theory.js (las 230 referencias, cada una con su tema) y reemplaza lo que hay entre las marcas
   <!-- REFERENCIAS --> y <!-- /REFERENCIAS --> de es/14-apendices.html: un apartado por tema, en el orden
   de la app, con las obras en orden alfabético. Así el manual y el programa citan exactamente lo mismo.
   Uso:   node manual/herramientas/genera-referencias.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const caja = { window: {} };
vm.createContext(caja);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js', 'theory.js'), 'utf8'), caja);
const { REFS, REF_TOPICS } = caja.window.Theory;

/* el orden de los temas: el del recorrido de la app, de la historia a las figuras */
const ORDEN = ['his', 'sup', 'cla', 'rob', 'dep', 'par', 'cat', 'acu', 'est', 'esp', 'inf', 'fig', 'dat'];
const temas = ORDEN.filter(t => REF_TOPICS[t]).concat(Object.keys(REF_TOPICS).filter(t => !ORDEN.includes(t)));
/* orden alfabético sin acentos ni mayúsculas, como en una bibliografía */
const clave = s => s.replace(/<[^>]+>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let total = 0, html = '\n';
temas.forEach((t, i) => {
  const lista = Object.keys(REFS).filter(k => REFS[k][1] === t).map(k => REFS[k][0]).sort((a, b) => clave(a).localeCompare(clave(b), 'es'));
  if (!lista.length) return;
  total += lista.length;
  html += `  <h3>F.${i + 1} · ${REF_TOPICS[t][0]}</h3>\n  <ul class="refs">\n` + lista.map(r => `    <li>${r}</li>`).join('\n') + '\n  </ul>\n';
});

const archivo = path.join(raiz, 'manual', 'es', '14-apendices.html');
const texto = fs.readFileSync(archivo, 'utf8');
const a = texto.indexOf('<!-- REFERENCIAS -->'), b = texto.indexOf('<!-- /REFERENCIAS -->');
if (a < 0 || b < 0) throw new Error('No encontré las marcas de las referencias en ' + archivo);
fs.writeFileSync(archivo, texto.slice(0, a + '<!-- REFERENCIAS -->'.length) + html + '  ' + texto.slice(b));
console.log(`${total} referencias en ${temas.length} temas escritas en ${path.relative(raiz, archivo)}`);
