/* CorrelationPro — manual: pone el ancho reducido (w60, w70, w80) a las figuras de una parte, por el nombre de su
   imagen.   node manual/herramientas/anchos.js manual/es/01-bloque1.html b1-heroe=w70 b1-lab-drag=w70 …
   Una figura sin ancho reducido (=w100) vuelve al ancho completo. */
'use strict';
const fs = require('fs');
const [archivo, ...pares] = process.argv.slice(2);
let s = fs.readFileSync(archivo, 'utf8'), n = 0;
for (const p of pares) {
  const [img, w] = p.split('=');
  const re = new RegExp('<figure(?: class="[^"]*")?>(\\s*<div class="marco"><img src="\\.\\./img/' + img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.png")');
  if (!re.test(s)) { console.error('no encuentro la figura de ' + img); process.exitCode = 1; continue; }
  s = s.replace(re, (m, resto) => (w === 'w100' ? '<figure>' : '<figure class="' + w + '">') + resto);
  n++;
}
fs.writeFileSync(archivo, s);
console.log(n + ' figuras ajustadas');
