/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 1, the home page.
   Builds the block bar, the route, the cards of the thirteen blocks, the map of
   which measure for which data, the glyph gallery, the palette gallery, the
   reporting styles, the catalogue of measures with its cards, the theory, the
   measured limits, the references and how to cite. */
(function () {
'use strict';
const WORKFLOW = [
  ['Cargar', 'Load', 'tus datos y sus tipos', 'your data and their kinds'],
  ['Explorar', 'Explore', 'la nube y los supuestos', 'the cloud and the assumptions'],
  ['Elegir', 'Choose', 'el coeficiente adecuado', 'the right coefficient'],
  ['Medir', 'Measure', 'con prueba e intervalo', 'with test and interval'],
  ['Controlar', 'Control', 'terceras variables y estructura', 'third variables and structure'],
  ['Comparar', 'Compare', 'grupos, matrices, estudios', 'groups, matrices, studies'],
  ['Publicar', 'Publish', 'figura, tabla e informe', 'figure, table and report'],
];
const TYPES = [
  { k: 'cc', es: 'Continua y continua', en: 'Continuous and continuous', t: ['Medidas en una escala (largo, peso, temperatura).', 'Measurements on a scale (length, weight, temperature).'], m: ['r', 'ρ', 'τ', ['robustas', 'robust'], 'dCor', 'ξ', 'MIC'], blk: 4 },
  { k: 'oo', es: 'Ordinal y ordinal', en: 'Ordinal and ordinal', t: ['Escalas con orden (1 a 5, grados de daño).', 'Ordered scales (1 to 5, damage grades).'], m: ['ρ', 'τ-b', 'τ-c', 'γ', 'd', ['policórica', 'polychoric']], blk: 8 },
  { k: 'nn', es: 'Nominal y nominal', en: 'Nominal and nominal', t: ['Categorías sin orden (especie, región).', 'Unordered categories (species, region).'], m: ['φ', 'V', 'C', 'λ', 'U', 'OR'], blk: 8 },
  { k: 'bc', es: 'Binaria o grupos y continua', en: 'Binary or groups and continuous', t: ['Dos o más grupos y una medida.', 'Two or more groups and a measurement.'], m: [['biserial puntual', 'point-biserial'], 'biserial', ['rango-biserial', 'rank-biserial'], 'η'], blk: 8 },
  { k: 'rr', es: 'Evaluadores o métodos', en: 'Raters or methods', t: ['La misma cosa medida dos o más veces.', 'The same thing measured twice or more.'], m: ['CCC', 'ICC', 'κ', 'W', 'α', 'Bland–Altman'], blk: 9 },
  { k: 'ang', es: 'Ángulos y fechas del año', en: 'Angles and dates of the year', t: ['Orientaciones, horas, días de floración.', 'Orientations, hours, flowering days.'], m: ['circular–circular', ['circular–lineal', 'circular–linear']], blk: 10 },
  { k: 'comp', es: 'Proporciones de un todo', en: 'Parts of a whole', t: ['Composición, abundancia relativa, dietas.', 'Composition, relative abundance, diets.'], m: ['ρp', 'clr'], blk: 10 },
  { k: 'time', es: 'En el tiempo, el espacio o un árbol', en: 'In time, space or a tree', t: ['Series, parcelas georreferenciadas, especies.', 'Series, georeferenced plots, species.'], m: [['medidas repetidas', 'repeated measures'], ['preblanqueo', 'prewhitening'], 'Dutilleul', ['contrastes', 'contrasts']], blk: 10 },
  { k: 'sets', es: 'Dos tablas o dos matrices', en: 'Two tables or two matrices', t: ['Rasgos contra ambiente, distancias.', 'Traits against environment, distances.'], m: [['canónica', 'canonical'], 'RV', 'Procrustes', 'Mantel'], blk: 7 },
];
const LIMITS = [
  [['Matriz de Pearson de 200 × 200 variables, 1 000 filas', 'Pearson matrix of 200 × 200 variables, 1,000 rows'], '34 ms', ['instantáneo', 'instant']],
  [['Matriz de Pearson de 1 000 × 1 000 variables', 'Pearson matrix of 1,000 × 1,000 variables'], '83 ms', ['instantáneo; se dibuja en lienzo', 'instant; drawn on canvas']],
  [['τ-b de Kendall con 100 000 pares', 'Kendall\'s τ-b with 100,000 pairs'], '64 ms', ['instantáneo', 'instant']],
  [['Correlación de distancias con 2 000 pares', 'Distance correlation with 2,000 pairs'], '33 ms', ['instantáneo; hasta 3 000 pares', 'instant; up to 3,000 pairs']],
  [['Prueba de Mantel, 9 999 permutaciones, 200 sitios', 'Mantel test, 9,999 permutations, 200 sites'], '0.34 s', ['un instante', 'a moment']],
  [['Bootstrap BCa de r con 1 999 remuestreos, 1 000 pares', 'BCa bootstrap of r with 1,999 resamples, 1,000 pairs'], '0.9 s', ['un instante', 'a moment']],
  [['Lazo gráfico con EBIC, 30 variables y 300 filas', 'Graphical lasso with EBIC, 30 variables and 300 rows'], '1.0 s', ['un instante', 'a moment']],
];

/* where a measure is computed: its block, or that the catalogue only describes it */
const whereL2 = m => (m.calc ? L2('Bloque ' + m.blk, 'Block ' + m.blk) : L2('sólo en el catálogo', 'catalogue only'));
const whereT = m => (m.calc ? T('Bloque ', 'Block ') + m.blk : T('sólo en el catálogo', 'catalogue only'));

/* ---------------- builders ---------------- */
function buildStepper() {
  const nav = el('stepper');
  if (!nav) return;
  nav.innerHTML = STEPS.map(s => `<button type="button" class="step-btn${s.n === 1 ? ' active' : ''}${s.ready ? '' : ' soon'}" data-step="${s.n}"${s.ready ? '' : ' disabled data-soon="' + T('pronto', 'soon') + '"'}><span class="step-num">${s.n}</span>${L2(s.es, s.en)}</button>`).join('');
  nav.addEventListener('click', e => { const b = e.target.closest('.step-btn'); if (b && !b.disabled) goStep(b.dataset.step); });
}
function buildWorkflow() {
  const host = el('workflow');
  if (!host) return;
  host.innerHTML = WORKFLOW.map((w, i) => `<div class="wf-step"><div class="wf-n">${L2('PASO ' + (i + 1), 'STEP ' + (i + 1))}</div><div class="wf-t">${L2(w[0], w[1])}</div><div class="wf-d">${L2(w[2], w[3])}</div></div>`).join('');
}
function buildBlocks() {
  const host = el('blockGrid');
  if (!host) return;
  host.innerHTML = BLOCKS.map(b => {
    const st = STEPS.find(s => s.n === b.n);
    return `<button type="button" class="feature" data-go="${b.n}"${st && st.ready ? '' : ' aria-disabled="true"'}>` +
      `<span class="f-num">${b.n}</span><div class="f-art" data-card="${b.n}"></div>` +
      `<span class="f-tag">${L2(b.tag[0], b.tag[1])}${st && st.ready ? '' : ` <span class="f-soon">${L2('pronto', 'soon')}</span>`}</span>` +
      `<h3>${L2(b.es, b.en)}</h3><p>${L2(b.d[0], b.d[1])}</p></button>`;
  }).join('');
  host.addEventListener('click', e => {
    const b = e.target.closest('.feature');
    if (!b) return;
    const n = b.dataset.go;
    if (stepOn(n)) goStep(n);
    else if (window.LABG) LABG.toast(T('Ese bloque llega en una próxima etapa de esta construcción.', 'That block arrives in a later stage of this build.'));
  });
}
function buildTypes() {
  const host = el('typeStrip');
  if (!host) return;
  host.innerHTML = TYPES.map(t => `<div class="material"><div data-type="${t.k}"></div><div class="mt-t">${L2(t.es, t.en)}</div>` +
    `<div class="mt-s">${L2(t.t[0], t.t[1])} ${L2('Bloque ' + t.blk, 'Block ' + t.blk)}.</div>${t.m.map(m => `<span class="mt-k">${Array.isArray(m) ? L2(m[0], m[1]) : m}</span>`).join('')}</div>`).join('');
}

/* ---------------- glyph gallery ---------------- */
const GL_NAMES = {
  number: ['Número', 'Number', 'el valor, en color', 'the value, in colour'],
  color: ['Color', 'Colour', 'la celda llena', 'the whole cell'],
  shade: ['Sombreado', 'Shade', 'rayas que suben o bajan', 'stripes rising or falling'],
  circle: ['Círculo', 'Circle', 'área ∝ |r|', 'area ∝ |r|'],
  square: ['Cuadrado', 'Square', 'área ∝ |r|', 'area ∝ |r|'],
  ellipse: ['Elipse', 'Ellipse', 'la normal bivariada', 'the bivariate normal'],
  pie: ['Pastel', 'Pie', '360°·|r|, sentido = signo', '360°·|r|, direction = sign'],
  bar: ['Barra', 'Bar', 'sube o cuelga', 'rises or hangs'],
  moon: ['Media luna', 'Moon', 'parte iluminada = |r|', 'lit part = |r|'],
};
let glyphKinds = ['moon', 'circle', 'ellipse', 'pie', 'square', 'bar', 'shade', 'color', 'number'];
function glyphSVG(kind, r) {
  return Plot.matrix({ R: [[1, r], [r, 1]], labels: ['', ''], glyph: kind, palette: View.palette, invert: View.invert, size: 96, labelWidth: 0, colorbar: false, triangle: 'lower', plot: 'glyph-' + kind, label: T('Glifo ', 'Glyph ') + kind })
    .replace(/viewBox="[^"]+"/, `viewBox="0 120 96 96"`);
}
function paintGlyphs() {
  const host = el('glyphStrip');
  if (!host) return;
  const r = +el('glyphR').value;
  el('glyphRv').textContent = fmtR(r, 2);
  host.innerHTML = glyphKinds.map(k => `<div class="glyph-card${k === 'moon' ? ' own' : ''}">${glyphSVG(k, r)}<div class="gn">${L2(GL_NAMES[k][0], GL_NAMES[k][1])}${k === 'moon' ? ' ★' : ''}</div><div class="gs">${L2(GL_NAMES[k][2], GL_NAMES[k][3])}</div></div>`).join('');
}
/* a sweep of r from −1 to 1 and back, every glyph redrawn each frame */
let sweep = null;
function sweepGlyphs() {
  const inp = el('glyphR');
  if (sweep) { cancelAnimationFrame(sweep); sweep = null; return; }
  const t0 = performance.now(), start = +inp.value;
  const step = now => {
    const t = (now - t0) / 4200;
    if (t >= 1) { inp.value = start; paintGlyphs(); sweep = null; return; }
    inp.value = Math.round(Math.sin(t * 2 * Math.PI + Math.asin(Math.max(-1, Math.min(1, start)))) * 100) / 100;
    paintGlyphs();
    sweep = requestAnimationFrame(step);
  };
  sweep = requestAnimationFrame(step);
}

/* ---------------- palette gallery ---------------- */
function rampHTML(p, vision) {
  const stops = Pal.stops(p, 17, { invert: View.invert });
  return stops.map(c => `<i style="background:${vision === 'grey' ? Pal.grey(c) : Pal.simulate(vision, c)}"></i>`).join('');
}
function paintPalettes() {
  const host = el('palGrid');
  if (!host) return;
  const vision = el('palVision').value;
  const card = p => {
    const c = Pal.check(p);
    const ok = (k, es, en) => `<span${c.ok[k] === false ? ' class="no"' : ''}>${c.ok[k] === false ? '✗' : '✓'} ${L2(es, en)}</span>`;
    const checks = p.kind === 'div'
      ? ok('gamut', 'cabe', 'fits') + ok('uniform', 'uniforme', 'uniform') + ok('sign', 'daltonismo', 'colour-blind') + ok('greySymmetric', 'gris', 'grey') + ok('contrast', 'contraste', 'contrast')
      : ok('gamut', 'cabe', 'fits') + ok('uniform', 'uniforme', 'uniform') + ok('greyMonotone', 'gris', 'grey') + ok('contrast', 'contraste', 'contrast');
    return `<button type="button" class="pal-card${p.id === View.palette ? ' on' : ''}" data-pal="${p.id}" aria-pressed="${p.id === View.palette}">` +
      `<div class="pn">${p.es}${p.kind === 'seq' ? ' · ' + L2('secuencial', 'sequential') : p.dark ? ' · ' + L2('fondo oscuro', 'dark background') : ''}</div><div class="pg">${L2(p.kind === 'div' ? 'divergente' : 'para |r|, r² y densidades', p.gloss)}</div>` +
      `<div class="pal-ramp">${rampHTML(p, vision)}</div><div class="pal-checks">${checks}</div></button>`;
  };
  host.innerHTML = Pal.ALL.map(card).join('');
  paintPalSample();
}
function paintPalSample() {
  const host = el('palSample');
  if (!host) return;
  const D = Datasets.iris, vars = D.vars.slice(0, 4);
  const R = vars.map(a => vars.map(b => Coef.pearson(a.v, b.v).est));
  const p = Pal.get(View.palette);
  const pal = p.kind === 'div' ? p : Pal.get('anil');
  let s = Plot.matrix({ R, labels: vars.map(v => T(v.es, v.en)), diagLabels: T(['L. sép.', 'A. sép.', 'L. pét.', 'A. pét.'], ['S. len.', 'S. wid.', 'P. len.', 'P. wid.']), glyph: { lower: 'number', upper: 'moon' }, palette: pal.id, invert: View.invert, size: 58, labelWidth: 130, plot: 'pal-sample', label: T('Matriz de Pearson de los lirios con la paleta elegida', 'Pearson matrix of the irises with the chosen palette') });
  const vision = el('palVision').value;
  if (vision !== 'none') s = s.replace(/--cl:(#[0-9A-F]{6});--cd:(#[0-9A-F]{6})/gi, (m, a, b) => `--cl:${vision === 'grey' ? Pal.grey(a) : Pal.simulate(vision, a)};--cd:${vision === 'grey' ? Pal.grey(b) : Pal.simulate(vision, b)}`);
  host.innerHTML = `<div class="pg-title">${L2('Así se ve la matriz de los lirios', 'This is how the iris matrix looks')}</div>` + s;
}

/* ---------------- reporting styles ---------------- */
const STYLES = [
  ['apa', 'Psicología y ciencias sociales (APA 7)', 'Psychology and social sciences (APA 7)', 'Sin cero inicial en r y p; p < .001; IC entre corchetes.', 'No leading zero in r and p; p < .001; CI in brackets.', { style: 'apa', decimal: '.' }],
  ['sampl', 'Biomédico (guías SAMPL)', 'Biomedical (SAMPL guidelines)', 'Con cero inicial; P mayúscula; IC «0.20 a 0.65».', 'Leading zero; capital P; CI «0.20 to 0.65».', { style: 'sampl', decimal: '.' }],
  ['nom', 'Normativo mexicano (NOM-008)', 'Mexican standard (NOM-008)', 'Cero inicial obligatorio; punto decimal.', 'Leading zero required; decimal point.', { style: 'nom', decimal: '.' }],
  ['nomc', 'Normativo con coma decimal', 'Standard with decimal comma', 'Coma decimal; límites separados por punto y coma.', 'Decimal comma; limits separated by a semicolon.', { style: 'nom', decimal: ',' }],
];
function paintStyles() {
  const host = el('styleCards');
  if (!host) return;
  const cur = Fmt.opts;
  host.innerHTML = STYLES.map(s => {
    const on = s[5].style === cur.style && s[5].decimal === cur.decimal;
    const ex = Fmt.example(Object.assign({}, s[5], { lang: I18N.lang, html: true }));
    return `<button type="button" class="style-card${on ? ' on' : ''}" data-style="${s[0]}" aria-pressed="${on}"><div class="sn">${L2(s[1], s[2])}</div><div class="se">${ex}</div><div class="sd">${L2(s[3], s[4])}</div></button>`;
  }).join('');
}

/* ---------------- catalogue ---------------- */
let famOn = '';
function buildCatalog() {
  const host = el('methodGallery'), filt = el('methodFilter');
  if (!host || !filt) return;
  const C = Catalog.CATALOG, F = Catalog.FAMS;
  filt.innerHTML = `<button type="button" class="chip on" data-f="">${L2('Todas', 'All')} (${C.length})</button>` +
    Object.keys(F).map(f => `<button type="button" class="chip" data-f="${f}">${L2(F[f][0], F[f][1])} (${C.filter(c => c.fam === f).length})</button>`).join('');
  host.innerHTML = C.map(m => `<button type="button" class="method-card f-${m.fam}" data-id="${m.id}" data-fam="${m.fam}" aria-label="${esc(T(m.es, m.en) + " — " + m.by + " · " + whereT(m))}">` +
    /* the space between name and author is not drawn (they are stacked); it keeps them apart in the text the label must contain */
    `<span class="m-ico">${Art.famIcon(m.fam)}</span><span class="m-txt"><span class="m-name">${L2(m.es, m.en)}</span> <span class="m-sub">${esc(m.by)} · ${whereL2(m)}</span></span></button>`).join('');
  filt.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    filt.querySelectorAll('.chip').forEach(c => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', c === b); });
    famOn = b.dataset.f;
    filterCatalog();
  });
  el('methodSearch').addEventListener('input', filterCatalog);
  host.addEventListener('click', e => { const b = e.target.closest('.method-card'); if (b) openMeasure(b.dataset.id); });
  filterCatalog();
}
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function filterCatalog() {
  const q = norm(el('methodSearch').value.trim());
  let shown = 0;
  els('#methodGallery .method-card').forEach(c => {
    const m = Catalog.byId(c.dataset.id);
    const hay = norm([m.es, m.en, m.by, m.what[0], m.what[1]].join(' ').replace(/<[^>]+>/g, ''));
    const vis = (!famOn || m.fam === famOn) && (!q || hay.includes(q));
    c.hidden = !vis;
    if (vis) shown++;
  });
  el('methodCount').innerHTML = L2(`Se muestran ${shown} de ${Catalog.CATALOG.length} medidas.`, `Showing ${shown} of ${Catalog.CATALOG.length} measures.`);
}
function openMeasure(id) {
  const m = Catalog.byId(id), dlg = el('methodDialog');
  if (!m || !dlg) return;
  const F = Catalog.FAMS[m.fam];
  const sec = (es, en, body) => body && (body[0] || body[1]) ? `<h4>${L2(es, en)}</h4><p>${L2(body[0], body[1])}</p>` : '';
  const refs = m.refs.map(k => `<li>${L2(Theory.refText(k, 'es'), Theory.refText(k, 'en'))}</li>`).join('');
  dlg.innerHTML = `<div class="mdlg-head"><div><span class="m-fam">${L2(F[0], F[1])}</span><h3 id="mdlgTitle">${L2(m.es, m.en)}</h3><div class="hint" style="margin:2px 0 0">${esc(m.by)} · ${whereL2(m)}</div></div>` +
    `<button type="button" class="btn btn-ghost btn-sm x" data-close aria-label="${T('Cerrar', 'Close')}">✕</button></div>` +
    `<div class="mdlg-body"><div class="mdlg-art">${Art.methodArt(m.fam, m.id.length * 13 + m.blk)}</div><p>${L2(m.what[0], m.what[1])}</p>` +
    (m.f ? `<h4>${L2('Fórmula', 'Formula')}</h4><div class="fbox">${m.f}</div>` : '') +
    sec('Prueba', 'Test', m.test) + sec('Intervalo', 'Interval', m.ci) + sec('Trampas y convenios', 'Pitfalls and conventions', m.trap) +
    (refs ? `<h4>${L2('Referencias', 'References')}</h4><ul class="ref">${refs}</ul>` : '') + `</div>`;
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }, { once: true });
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

/* ---------------- theory, limits, references, cite ---------------- */
function buildTheory() {
  const host = el('theoryHost');
  if (!host) return;
  const fig = (k, es, en) => `<figure class="theory-fig"><div data-theory="${k}"></div><figcaption class="cap">${L2(es, en)}</figcaption></figure>`;
  host.innerHTML = Theory.THEORY.map((t, i) => `<details class="acc"${i === 0 ? ' open' : ''}><summary>${L2(t.h[0], t.h[1])}<span class="acc-tag">${L2(t.tag[0], t.tag[1])}</span></summary>` +
    `<div class="acc-body clearfix">${t.fig ? fig(t.fig[0], t.fig[1], t.fig[2]) : ''}${L2(t.es, t.en)}</div></details>`).join('');
}
function buildLimits() {
  const host = el('limitsTable');
  if (!host) return;
  host.innerHTML = '<table><thead><tr><th>' + L2('Cálculo', 'Computation') + '</th><th class="num">' + L2('Tiempo medido', 'Measured time') + '</th><th>' + L2('Qué esperar', 'What to expect') + '</th></tr></thead><tbody>' +
    LIMITS.map(r => `<tr><td>${L2(r[0][0], r[0][1])}</td><td class="num">${r[1]}</td><td>${L2(r[2][0], r[2][1])}</td></tr>`).join('') + '</tbody></table>';
}
function buildRefs() {
  const host = el('refList'), tools = el('refTools');
  if (!host) return;
  const keys = Object.keys(Theory.REFS).sort((a, b) => Theory.REFS[a][0].localeCompare(Theory.REFS[b][0], 'es'));
  const topics = Object.keys(Theory.REF_TOPICS).filter(t => keys.some(k => Theory.REFS[k][1] === t));
  if (tools) {
    tools.innerHTML = `<button type="button" class="chip on" data-t="">${L2('Todas', 'All')} (${keys.length})</button>` +
      topics.map(t => `<button type="button" class="chip" data-t="${t}">${L2(Theory.REF_TOPICS[t][0], Theory.REF_TOPICS[t][1])}</button>`).join('');
    tools.addEventListener('click', e => {
      const b = e.target.closest('.chip');
      if (!b) return;
      tools.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
      host.querySelectorAll('li').forEach(li => { li.hidden = !!b.dataset.t && li.dataset.t !== b.dataset.t; });
    });
  }
  const sum = el('refsSummary');
  if (sum) sum.innerHTML = L2(`Ver las ${keys.length} referencias`, `See the ${keys.length} references`);
  host.innerHTML = keys.map(k => { const t = Theory.REFS[k][1]; return `<li data-t="${t}">${L2(Theory.refText(k, 'es'), Theory.refText(k, 'en'))} <span class="ref-topic">${L2(Theory.REF_TOPICS[t][0], Theory.REF_TOPICS[t][1])}</span></li>`; }).join('');
}
function buildCite() {
  const apa = 'Barrera-Guzmán, L. Á. (2026). <i>CorrelationPro: análisis de correlación de todo tipo en el navegador</i> (versión 1.0.0) [Programa de cómputo]. Zenodo. https://doi.org/10.5281/zenodo.23867439';
  const bib = '@software{barreraguzman2026correlationpro,\n  author  = {Barrera-Guzmán, Luis Ángel},\n  title   = {CorrelationPro: análisis de correlación de todo tipo en el navegador},\n  version = {1.0.0},\n  year    = {2026},\n  license = {GPL-3.0-or-later},\n  doi     = {10.5281/zenodo.23867439},\n  url     = {https://doi.org/10.5281/zenodo.23867439}\n}';
  const a = el('citeApa'), b = el('citeBib');
  if (a) a.innerHTML = apa;
  if (b) b.textContent = bib;
  const copy = (btn, text) => btn && btn.addEventListener('click', () => {
    const done = () => { if (window.LABG) LABG.toast(T('Copiado', 'Copied')); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {}); else done();
  });
  copy(el('copyApa'), apa.replace(/<[^>]+>/g, ''));
  copy(el('copyBib'), bib);
}
/* every picture is drawn again when the language changes */
function paintArt() {
  Art.Hero.mount(el('heroArt'));
  els('[data-card]').forEach(d => { d.innerHTML = Art.cards[d.dataset.card](); });
  els('[data-type]').forEach(d => { d.innerHTML = Art.types[d.dataset.type](); });
  els('[data-theory]').forEach(d => { d.innerHTML = Art.theory[d.dataset.theory](); });
  els('.soon-art[data-art]').forEach(d => { const g = Art.cards[d.dataset.art]; if (g) d.innerHTML = g(); });
}

/* ---------------- start ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const bl = el('brandLogo');
  if (bl) bl.innerHTML = Art.logo();
  buildStepper();
  buildWorkflow();
  buildBlocks();
  buildTypes();
  buildCatalog();
  buildTheory();
  buildLimits();
  buildRefs();
  buildCite();
  paintArt();
  paintGlyphs();
  paintPalettes();
  paintStyles();
  el('glyphR').addEventListener('input', paintGlyphs);
  el('glyphMorph').addEventListener('click', sweepGlyphs);
  el('palVision').addEventListener('change', paintPalettes);
  const inv = el('palInvert');
  inv.checked = View.invert;
  inv.addEventListener('change', () => View.setInvert(inv.checked));
  el('palGrid').addEventListener('click', e => { const b = e.target.closest('.pal-card'); if (b) View.setPalette(b.dataset.pal); });
  el('styleCards').addEventListener('click', e => {
    const b = e.target.closest('.style-card');
    if (!b) return;
    const s = STYLES.find(x => x[0] === b.dataset.style);
    Fmt.set(s[5]);
    Prefs.set('fmt', s[5]);
    document.dispatchEvent(new CustomEvent('fmtchange'));
  });
  const go = (id, f) => { const b = el(id); if (b) b.addEventListener('click', f); };
  const scrollTo = id => { const t = el(id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  go('startBtn', () => { if (stepOn(2)) goStep(2); else { scrollTo('labs'); if (window.LABG) LABG.toast(T('La carga de datos llega con el Bloque 2; mientras, prueba los laboratorios.', 'Data loading arrives with Block 2; meanwhile, try the labs.')); } });
  go('labsBtn', () => scrollTo('labs'));
  go('catalogBtn', () => scrollTo('catalog'));
  go('citeBtn', () => scrollTo('cite'));
});
const repaintNumbers = () => { paintGlyphs(); paintPalSample(); paintStyles(); Art.Hero.mount(el('heroArt')); };
document.addEventListener('langchange', () => {
  paintArt(); paintGlyphs(); paintPalettes(); paintStyles(); filterCatalog();
  /* the labels the search reads, in the new language */
  els(".method-card[data-id]").forEach(b => { const m = Catalog.byId(b.dataset.id); if (m) b.setAttribute("aria-label", T(m.es, m.en) + " — " + m.by + " · " + whereT(m)); });
  const nav = el('stepper');
  if (nav) nav.querySelectorAll('.step-btn.soon').forEach(b => b.setAttribute('data-soon', T('pronto', 'soon')));
});
document.addEventListener('palettechange', () => { paintPalettes(); paintGlyphs(); });
document.addEventListener('fmtchange', () => { repaintNumbers(); els('[data-theory]').forEach(d => { d.innerHTML = Art.theory[d.dataset.theory](); }); });

window.Home = { TYPES, WORKFLOW, LIMITS, STYLES, openMeasure, GL_NAMES };
})();
