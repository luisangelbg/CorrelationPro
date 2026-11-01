/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. GPL-3.0-or-later; see LICENSE.
   Assembles index.html: the head, the common bar of the LABG Suite, the home page
   (data/_index_main.html), one panel per block that is not ready yet (from
   js/blocks.js) and the scripts. Run with node from this folder after editing any
   of those parts:   node armar_index.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname, root = path.resolve(here, '..');
const box = { window: {} }; vm.createContext(box);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'blocks.js'), 'utf8'), box);
const BLOCKS = box.window.BLOCKS;
const topbar = fs.readFileSync(path.join(here, '_topbar.html'), 'utf8');
let main = fs.readFileSync(path.join(here, '_index_main.html'), 'utf8');
const READY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const PANELS = READY.filter(n => n > 1).map(n => { const p = path.join(here, '_panel' + n + '.html'); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim() : ''; }).join('\n\n');
const panels = BLOCKS.filter(b => !READY.includes(b.n)).map(b => `
<!-- ==================== BLOCK ${b.n} ==================== -->
<section class="step-panel" id="panel-${b.n}">
  <div class="panel-title"><div class="pt-num">${b.n}</div><div><h2><span data-l="es">${b.es}</span><span data-l="en">${b.en}</span></h2><p><span data-l="es">${b.tag[0]}</span><span data-l="en">${b.tag[1]}</span></p></div></div>
  <div class="card soon-box">
    <div class="soon-art" data-art="${b.n}"></div>
    <h3><span data-l="es">Este bloque llega en una siguiente etapa de construcción</span><span data-l="en">This block arrives in a later stage of the build</span></h3>
    <p><span data-l="es">${b.d[0]}</span><span data-l="en">${b.d[1]}</span></p>
  </div>
</section>`).join('\n');
main = main.replace('<div id="soonPanels"></div>', (PANELS + '\n' + panels).trim());
const favicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230B0909'/%3E%3Cellipse cx='16' cy='16' rx='12' ry='5.2' transform='rotate(-45 16 16)' fill='none' stroke='%23D4A848' stroke-width='2.2'/%3E%3Ccircle cx='9.5' cy='22.5' r='2.3' fill='%23E2384C'/%3E%3Ccircle cx='15' cy='16.5' r='2.3' fill='%23E2384C'/%3E%3Ccircle cx='21.5' cy='10' r='2.3' fill='%23E2384C'/%3E%3C/svg%3E";
const scripts = [
  'labg-core.js', ['labg-figure-studio.js', 'defer'], ['labg-navigator.js', 'defer'],
  'num.js', 'coef.js', 'palettes.js', 'fmt.js', 'glyphs.js', 'plot.js', 'datasets.js', 'blocks.js', 'dataio.js', 'table.js', 'assume.js', 'pairstat.js', 'matrix.js', 'nonlin.js', 'partial.js', 'categ.js', 'agree.js', 'struct.js', 'network.js', 'infer.js',
  'core.js', ['labg-figedit.js', 'data-key="correlationpro:figedit"'], 'catalog.js', 'theory.js', 'art.js', 'home.js', 'labs.js', 'block2.js', 'block3.js', 'block4.js', 'block5.js', 'block6.js', 'block7.js', 'block8.js', 'block9.js', 'block10.js', 'block11.js', 'block12.js', 'block13.js',
].map(s => Array.isArray(s) ? `<script src="js/${s[0]}" ${s[1]}></script>` : `<script src="js/${s}"></script>`).join('\n');
const html = `<!DOCTYPE html>
<!--
  CorrelationPro — correlation analysis of every kind, in the browser.
  Copyright (C) 2026  Luis Ángel Barrera-Guzmán

  This program is free software: you can redistribute it and/or modify it under
  the terms of the GNU General Public License as published by the Free Software
  Foundation, either version 3 of the License, or (at your option) any later
  version.

  This program is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
  FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  this program, in the file LICENSE.  If not, see <https://www.gnu.org/licenses/>.

  This notice covers the whole program: index.html, css/ and the files in js/.
  This file is assembled by data/armar_index.js.
-->
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title data-es="CorrelationPro — Análisis de correlación de todo tipo" data-en="CorrelationPro — Correlation analysis of every kind">CorrelationPro — Análisis de correlación de todo tipo</title>
<meta name="description" content="Correlation analysis of every kind in the browser: classical, robust, nonlinear, partial, categorical and latent, agreement, structured and circular data, with tests, intervals, theory and publication figures.">
<meta name="labg-repo" content="CorrelationPro">
<link rel="icon" href="${favicon}">
<link rel="stylesheet" href="css/labg-base.css">
<link rel="stylesheet" href="css/style.css">
<script src="js/i18n.js"></script>
</head>
<body class="on-home">

<a class="skip-link" href="#main"><span data-l="es">Saltar al contenido</span><span data-l="en">Skip to content</span></a>
${topbar.trim()}

${main.trim()}

${scripts}
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html:', html.length, 'caracteres;', BLOCKS.length, 'bloques;', panels.split('<section').length - 1, 'paneles «pronto».');
