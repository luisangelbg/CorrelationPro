/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 9, agreement and reliability: Lin's concordance and
   the Bland–Altman plot for two methods, the six intraclass correlations,
   Kendall's W and Krippendorff's α for several raters, and κ (Cohen, Fleiss,
   Conger), Gwet's AC1/AC2 and α for categories. The result goes to
   state.agreement. */
(function () {
'use strict';
const S = { keys: [], dirty: true };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
const usable = ds => ds.cols.filter(c => c.role !== 'exclude' && ['continuous', 'ordinal', 'binary', 'nominal'].includes(c.type));
const isCat = c => c.type !== 'continuous';
const LK = v => (v < 0 ? ['pobre', 'poor'] : v <= 0.2 ? ['leve', 'slight'] : v <= 0.4 ? ['aceptable', 'fair'] : v <= 0.6 ? ['moderado', 'moderate'] : v <= 0.8 ? ['considerable', 'substantial'] : ['casi perfecto', 'almost perfect']);

function onData() {
  const ds = state.data;
  el('b9Empty').hidden = !!ds; el('b9Main').hidden = !ds;
  if (!ds) return;
  const us = usable(ds);
  S.keys = S.keys.filter(k => us.some(c => c.key === k));
  if (S.keys.length < 2) {
    /* default: all continuous ones with role var (up to 6), else the categorical ones */
    const cont = us.filter(c => c.type === 'continuous' && c.role === 'var'), cat = us.filter(c => isCat(c) && c.role === 'var');
    S.keys = (cont.length >= 2 ? cont : cat).slice(0, 6).map(c => c.key);
  }
  paintControls();
  S.dirty = true; state.agreement = null;
  if (el('panel-9').classList.contains('active')) run();
}
function paintControls() {
  const ds = state.data, us = usable(ds);
  el('b9Cols').innerHTML = us.map(c => `<button type="button" class="chip${S.keys.includes(c.key) ? ' on' : ''}" data-k="${c.key}">${esc(label(c))} <small>${esc(T(Data.TYPE_NAMES[c.type][0], Data.TYPE_NAMES[c.type][1]))}</small></button>`).join('');
}
function matrixOf(keys) {
  const ds = state.data, cols = keys.map(k => Data.col(ds, k).num);
  return Array.from({ length: ds.n }, (_, r) => cols.map(c => c[r]));
}
function run() {
  const ds = state.data;
  clearMessages('b9Msgs');
  const cols = S.keys.map(k => Data.col(ds, k));
  if (cols.length < 2) { showMessage('b9Msgs', 'warn', L2('Elige al menos dos columnas.', 'Pick at least two columns.')); ['b9ContCard', 'b9IccCard', 'b9CatCard'].forEach(id => { el(id).hidden = true; }); return; }
  const allCont = cols.every(c => c.type === 'continuous'), allCat = cols.every(isCat);
  if (!allCont && !allCat) showMessage('b9Msgs', 'warn', L2('Mezclaste columnas continuas y categóricas: se analizan como categorías sólo si todas lo son; quita las de otro tipo.', 'You mixed continuous and categorical columns: they are analysed as categories only if all are; remove those of the other kind.'));
  if (allCat) {
    const levs = cols.map(c => (c.levels || []).join('|'));
    if (new Set(levs).size > 1) showMessage('b9Msgs', 'info', L2('Las columnas no tienen exactamente las mismas categorías: se comparan por su posición en la escala (código), revisa que coincidan.', 'The columns do not have exactly the same categories: they are compared by their position on the scale (code); check they match.'));
  }
  const R = { keys: S.keys.slice(), kind: allCont ? 'cont' : allCat ? 'cat' : 'mixed' };
  el('b9ContCard').hidden = !allCont; el('b9IccCard').hidden = !allCont; el('b9CatCard').hidden = !allCat;
  if (allCont) paintCont(R, cols);
  if (allCat) paintCat(R, cols);
  state.agreement = R; S.dirty = false; refreshStepMarks();
}

/* ---------------- continuous ---------------- */
function paintCont(R, cols) {
  const a = Array.from(cols[0].num), b = Array.from(cols[1].num), A = label(cols[0]), B = label(cols[1]);
  const cc = Agree.ccc(a, b), ba = Agree.blandAltman(a, b);
  R.ccc = cc; R.ba = ba;
  statTiles('b9CTiles', [
    [T('CCC de Lin', 'Lin’s CCC'), fr(cc.est), `${T("IC 95 %", "95% CI")} [${fr(cc.lo)}, ${fr(cc.hi)}]`, cc.est >= 0.9 ? 'ok' : 'warn'],
    ['<span class="nc">r</span> · <span class="nc">C<sub>b</sub></span>', `${fr(cc.r)} · ${fr(cc.Cb)}`, T('precisión · exactitud', 'precision · accuracy')],
    [T('Sesgo medio', 'Mean bias'), Fmt.num(ba.bias, 3), `${A} − ${B} · ${pTxt(ba.pBias)}`, ba.pBias < 0.05 ? 'warn' : 'ok'],
    [T('Límites de acuerdo 95 %', '95% limits of agreement'), `${Fmt.num(ba.lo, 2)} · ${Fmt.num(ba.hi, 2)}`, T(`amplitud ${Fmt.num(ba.hi - ba.lo, 2)}`, `width ${Fmt.num(ba.hi - ba.lo, 2)}`)],
    ba.prop ? [T('Sesgo proporcional', 'Proportional bias'), Fmt.num(ba.prop.slope, 3), T(`pendiente de la diferencia sobre el promedio · ${pTxt(ba.prop.p)}`, `slope of the difference on the mean · ${pTxt(ba.prop.p)}`), ba.prop.p < 0.05 ? 'warn' : 'ok'] : null,
  ]);
  const all = a.concat(b).filter(isFinite), ext = Plot.extent(all);
  el('b9Id').innerHTML = Plot.scatter({ x: a, y: b, w: 380, h: 330, legend: false, xlab: A, ylab: B, plot: 'b9-identity', clip: 'b9i', fit: 'ols', xlim: ext, ylim: ext, r: 3,
    under: g => `<line class="b9-eq" x1="${g.sx(ext[0]).toFixed(1)}" y1="${g.sy(ext[0]).toFixed(1)}" x2="${g.sx(ext[1]).toFixed(1)}" y2="${g.sy(ext[1]).toFixed(1)}"/>` });
  const dm = ba.means, dd = ba.diffs;
  const ey = Plot.extent(dd.concat([ba.loCI[0], ba.hiCI[1], 0]), 0.08);
  el('b9BA').innerHTML = Plot.scatter({ x: dm, y: dd, w: 380, h: 330, legend: false, xlab: T(`Promedio de ${A} y ${B}`, `Mean of ${A} and ${B}`), ylab: T(`${A} − ${B}`, `${A} − ${B}`), plot: 'b9-ba', clip: 'b9b', ylim: ey, r: 3,
    under: g => {
      const L = (v, cls) => `<line class="${cls}" x1="${g.x0}" y1="${g.sy(v).toFixed(1)}" x2="${g.x1}" y2="${g.sy(v).toFixed(1)}"/>`;
      const band = (lo, hi) => `<rect class="b9-band" x="${g.x0}" y="${g.sy(hi).toFixed(1)}" width="${g.x1 - g.x0}" height="${(g.sy(lo) - g.sy(hi)).toFixed(1)}"/>`;
      let s = band(ba.loCI[0], ba.loCI[1]) + band(ba.hiCI[0], ba.hiCI[1]) + band(ba.biasCI[0], ba.biasCI[1]) + L(0, 'pl-ref0') + L(ba.bias, 'b9-bias') + L(ba.lo, 'b9-loa') + L(ba.hi, 'b9-loa');
      if (ba.prop) { const xa = Math.min(...dm), xb = Math.max(...dm); s += `<line class="b9-prop" x1="${g.sx(xa).toFixed(1)}" y1="${g.sy(ba.prop.intercept + ba.prop.slope * xa).toFixed(1)}" x2="${g.sx(xb).toFixed(1)}" y2="${g.sy(ba.prop.intercept + ba.prop.slope * xb).toFixed(1)}"/>`; }
      return s;
    } });
  const gap = cc.r - cc.est;
  /* the reading names the systematic biases when they are significant: a CCC close to r does not rule them out */
  const biasTxt = ba.pBias < 0.05 ? L2(` ${gap > 0.02 ? 'Hay' : 'Pero hay'} un sesgo medio de ${Fmt.num(ba.bias, 2)} (${pTxt(ba.pBias)}): en promedio, ${esc(A)} da ${Fmt.num(Math.abs(ba.bias), 2)} unidades ${ba.bias < 0 ? 'menos' : 'más'} que ${esc(B)}.`, ` ${gap > 0.02 ? 'There is' : 'But there is'} a mean bias of ${Fmt.num(ba.bias, 2)} (${pTxt(ba.pBias)}): on average, ${esc(A)} gives ${Fmt.num(Math.abs(ba.bias), 2)} units ${ba.bias < 0 ? 'less' : 'more'} than ${esc(B)}.`) : '';
  const propTxt = ba.prop && ba.prop.p < 0.05 ? L2(` Además, la diferencia cambia con el nivel (sesgo proporcional, ${pTxt(ba.prop.p)}): los límites de acuerdo valen en promedio, no en cada nivel.`, ` Moreover, the difference changes with the level (proportional bias, ${pTxt(ba.prop.p)}): the limits of agreement hold on average, not at every level.`) : '';
  el('b9CText').innerHTML = `<p>${L2(gap > 0.02 ? `r = ${fr(cc.r)} pero la concordancia es ${fr(cc.est)}: los dos se mueven juntos, pero no dicen lo mismo (C<sub>b</sub> = ${fr(cc.Cb)} mide cuánto se aleja la nube de la línea de igualdad).` : `La concordancia (${fr(cc.est)}) es casi igual a r (${fr(cc.r)}): los puntos caen cerca de la línea de igualdad.`,
    gap > 0.02 ? `r = ${fr(cc.r)} but the concordance is ${fr(cc.est)}: both move together, but they do not say the same (C<sub>b</sub> = ${fr(cc.Cb)} measures how far the cloud is from the line of equality).` : `The concordance (${fr(cc.est)}) is almost equal to r (${fr(cc.r)}): the points fall close to the line of equality.`)}${biasTxt}${propTxt}</p>` +
    `<p>${L2(`En un caso, ${esc(A)} puede quedar entre ${Fmt.num(ba.lo, 2)} y ${Fmt.num(ba.hi, 2)} unidades de ${esc(B)} (el 95 % de las veces). Que eso sea aceptable no lo dice la estadística: lo decide quien usa la medida.`, `On one case, ${esc(A)} may fall between ${Fmt.num(ba.lo, 2)} and ${Fmt.num(ba.hi, 2)} units from ${esc(B)} (95% of the time). Whether that is acceptable is not for statistics to say: whoever uses the measure decides.`)}</p>`;
  /* several raters */
  const M = matrixOf(R.keys), I = Agree.icc(M), W = Agree.kendallW(M), KA = Agree.kripp(M, 'interval');
  R.icc = I; R.W = W; R.kripp = KA;
  el('b9Icc').innerHTML = `<table><thead><tr><th>${L2('Forma', 'Form')}</th><th class="num">ICC</th><th>${L2('IC 95 %', '95% CI')}</th><th class="num">F</th><th class="num">${L2('gl', 'df')}</th><th class="num">p</th><th>${L2('Lectura', 'Reading')}</th></tr></thead><tbody>` +
    I.forms.map(f => { const w = Agree.iccWords(f.est); return `<tr><td>${L2(esc(f.es), esc(f.en))}</td><td class="num"><b>${fr(f.est)}</b></td><td class="nw">[${fr(f.lo)}, ${fr(f.hi)}]</td><td class="num">${Fmt.num(f.F, 2)}</td><td class="num">${f.df1}, ${Fmt.num(f.df2, f.df2 % 1 ? 1 : 0)}</td><td class="num">${Fmt.pValue(f.p)}</td><td><span class="pill ${f.est >= 0.75 ? 'ok' : f.est >= 0.5 ? 'warn' : 'bad'}">${L2(w[0], w[1])}</span></td></tr>`; }).join('') + '</tbody></table>';
  statTiles('b9ITiles', [
    [T('Casos · evaluadores', 'Cases · raters'), `${I.ns} · ${I.nr}`, T('filas completas', 'complete rows')],
    [T('W de Kendall', 'Kendall’s W'), fr(W.est), `χ²(${W.df}) = ${Fmt.num(W.X2, 2)} · ${pTxt(W.p)}`],
    [T('α de Krippendorff (intervalo)', 'Krippendorff’s α (interval)'), fr(KA.est), T('admite faltantes', 'admits missing ratings')],
  ]);
  el('b9Prof').innerHTML = profile(M.filter(r => r.every(isFinite)), R.keys.map(k => label(Data.col(state.data, k))));
}
/* parallel lines: each case across the raters */
function profile(M, names) {
  const W = 720, H = 280, m = { l: 56, r: 20, t: 14, b: 40 }, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t, k = names.length;
  const ey = Plot.extent(M.flat()), sy = Plot.scale(ey[0], ey[1], y0, y1), sx = j => x0 + j * (x1 - x0) / Math.max(1, k - 1);
  let s = Plot.open(W, H, { plot: 'b9-profile' }, { x0, x1, y0, y1, ex: [0, k - 1], ey }, T('Perfiles de los casos', 'Profiles of the cases'));
  const yt = Plot.ticks(ey[0], ey[1], 6);
  s += `<g data-role="grid" class="pl-grid">${yt.ticks.map(v => `<line x1="${x0}" y1="${sy(v).toFixed(1)}" x2="${x1}" y2="${sy(v).toFixed(1)}"/>`).join('')}${names.map((_, j) => `<line x1="${sx(j).toFixed(1)}" y1="${y1}" x2="${sx(j).toFixed(1)}" y2="${y0}"/>`).join('')}</g>`;
  s += `<g class="pl-tick" data-role="ytick">${yt.ticks.map(v => `<text x="${x0 - 7}" y="${(sy(v) + 3.5).toFixed(1)}" text-anchor="end">${Plot.tickLabel(v, yt.step)}</text>`).join('')}</g>`;
  const means = M.map(r => Num.mean(r)), ord = Num.order(means), pal = Pal.get(View.palette);
  ord.forEach((i, rank) => { const v = -1 + 2 * rank / Math.max(1, M.length - 1); s += `<path class="b9-line" style="stroke:${Pal.color(pal, v)}" d="${M[i].map((y, j) => (j ? 'L' : 'M') + sx(j).toFixed(1) + ' ' + sy(y).toFixed(1)).join('')}"/>`; });
  /* the names under the axes, the last ones pulled inside the figure (11 px: about 6.4 px a character) */
  names.forEach((nm, j) => { const t = short(nm, 16), w = 6.4 * t.length, x = sx(j), a = x + w / 2 > W - 2 ? 'end' : x - w / 2 < 2 ? 'start' : 'middle'; s += `<text class="pl-mlab" x="${(a === 'end' ? Math.min(x, W - 2) : x).toFixed(1)}" y="${y0 + 18}" text-anchor="${a}">${esc(t)}</text>`; });
  return s + '</svg>';
}

/* ---------------- categories ---------------- */
function paintCat(R, cols) {
  const M = matrixOf(R.keys), a = Array.from(cols[0].num), b = Array.from(cols[1].num);
  const k0 = Agree.kappa2(a, b, 'none'), kl = Agree.kappa2(a, b, 'linear'), kq = Agree.kappa2(a, b, 'quadratic');
  const many = cols.length > 2, full = M.filter(r => r.every(isFinite));
  const F = many ? Agree.fleiss(full) : null, Fc = many ? Agree.fleiss(full, { exact: true }) : null;
  const G = Agree.gwet(M), G2 = Agree.gwet(M, { weight: 'quadratic' }), An = Agree.kripp(M, 'nominal'), Ao = Agree.kripp(M, 'ordinal');
  const ordinal = cols.every(c => c.type === 'ordinal' || c.type === 'binary');
  Object.assign(R, { kappa: k0, kappaL: kl, kappaQ: kq, fleiss: F, conger: Fc, gwet: G, gwet2: G2, krippN: An, krippO: Ao });
  const main = many ? F : (ordinal && cols[0].levels.length > 2 ? kq : k0), mw = LK(main.est);
  statTiles('b9KTiles', [
    [many ? T('κ de Fleiss', 'Fleiss’ κ') : ordinal && cols[0].levels.length > 2 ? T('κ ponderada (cuadrática)', 'Weighted κ (quadratic)') : T('κ de Cohen', 'Cohen’s κ'), fr(main.est), `${T(mw[0], mw[1])} (Landis y Koch 1977) · ${pTxt(main.p)}`, main.est > 0.6 ? 'ok' : 'warn'],
    [T('Acuerdo observado', 'Observed agreement'), Fmt.num(100 * (many ? F.po : k0.po), 1) + ' %', T(`por azar ${Fmt.num(100 * (many ? F.pe : k0.pe), 1)} %`, `by chance ${Fmt.num(100 * (many ? F.pe : k0.pe), 1)}%`)],
    [T('AC1 de Gwet', 'Gwet’s AC1'), fr(G.est), `± ${Fmt.num(G.se, 3)}`],
    [T('α de Krippendorff', 'Krippendorff’s α'), ordinal ? fr(Ao.est) : fr(An.est), ordinal ? T('ordinal', 'ordinal') : T('nominal', 'nominal')],
  ]);
  const rows = [
    [T('κ de Cohen (evaluadores 1 y 2)', 'Cohen’s κ (raters 1 and 2)'), k0], [T('κ ponderada lineal', 'Linear weighted κ'), kl], [T('κ ponderada cuadrática', 'Quadratic weighted κ'), kq],
    many ? [T(`κ de Fleiss (${cols.length} evaluadores)`, `Fleiss’ κ (${cols.length} raters)`), F] : null, many ? [T('κ exacta de Conger', 'Conger’s exact κ'), Fc] : null,
    [T('AC1 de Gwet', 'Gwet’s AC1'), G], [T('AC2 de Gwet (cuadrática)', 'Gwet’s AC2 (quadratic)'), G2], [T('α de Krippendorff nominal', 'Krippendorff’s α nominal'), An], [T('α de Krippendorff ordinal', 'Krippendorff’s α ordinal'), Ao],
  ].filter(Boolean);
  el('b9KTable').innerHTML = `<table><thead><tr><th>${L2('Coeficiente', 'Coefficient')}</th><th class="num">${L2('Valor', 'Value')}</th><th class="num">${L2('EE', 'SE')}</th><th class="num">p</th></tr></thead><tbody>` +
    rows.map(([nm, r]) => `<tr><td>${esc(nm)}</td><td class="num"><b>${fr(r.est)}</b></td><td class="num">${isFinite(r.se) ? Fmt.num(r.se, 3) : '—'}</td><td class="num">${isFinite(r.p) ? Fmt.pValue(r.p) : '—'}</td></tr>`).join('') + '</tbody></table>';
  /* the agreement table of the first two raters as a heat map */
  const T0 = k0.table, lev = k0.levels.map(v => (cols[0].levels ? cols[0].levels[v] : String(v))), nc = lev.length, mx = Math.max(...T0.flat());
  const W = 380, H = 330, cell = Math.min(54, 250 / nc), x0 = 96, y0 = 50;
  let s = Plot.open(W, H, { plot: 'b9-kheat' }, null, T('Tabla de acuerdo', 'Agreement table'));
  T0.forEach((row, i) => row.forEach((v, j) => {
    const t = v / mx;
    s += `<rect x="${x0 + j * cell}" y="${y0 + i * cell}" width="${cell - 2}" height="${cell - 2}" class="${i === j ? 'b9-diag' : 'b9-off'}" style="fill-opacity:${(0.08 + 0.85 * t).toFixed(3)}"/><text class="b8-mosn" x="${x0 + j * cell + cell / 2 - 1}" y="${y0 + i * cell + cell / 2 + 3}" text-anchor="middle">${v}</text>`;
  }));
  lev.forEach((l, i) => { s += `<text class="pl-mlab" x="${x0 - 6}" y="${y0 + i * cell + cell / 2 + 3}" text-anchor="end">${esc(short(l, 12))}</text><text class="pl-mlab" transform="translate(${x0 + i * cell + cell / 2} ${y0 - 6}) rotate(-40)">${esc(short(l, 12))}</text>`; });
  s += `<text class="pl-lab" x="${x0 + nc * cell / 2}" y="${y0 + nc * cell + 22}" text-anchor="middle">${esc(label(cols[1]))}</text><text class="pl-lab" transform="translate(16 ${y0 + nc * cell / 2}) rotate(-90)" text-anchor="middle">${esc(label(cols[0]))}</text>`;
  el('b9KHeat').innerHTML = s + '</svg>';
}

/* ---------------- a simulated example ---------------- */
function simulated() {
  const rnd = Num.rng(909), n = 40, names = [], cols = [];
  const lat = Array.from({ length: n }, () => rnd.normal());
  const cut = v => (v < -1 ? 0 : v < -0.3 ? 1 : v < 0.3 ? 2 : v < 1 ? 3 : 4);
  const LV = I18N.lang === 'es' ? ['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'] : ['very low', 'low', 'medium', 'high', 'very high'];
  [[0, 3], [2, 4], [-1, 5], [6, 3]].forEach(([bias, sd], j) => { names.push(`medicion_${j + 1}`); cols.push(lat.map(z => (50 + 10 * z * (j === 3 ? 0.9 : 1) + bias + sd * rnd.normal()).toFixed(2))); });
  for (let j = 0; j < 4; j++) { names.push(`evaluador_${j + 1}`); cols.push(lat.map(z => LV[cut(z + 0.6 * rnd.normal())])); }
  const declared = names.map((nm, j) => (j < 4 ? { name: nm, type: 'continuous', role: 'var', label: { es: `Medición ${j + 1}`, en: `Measurement ${j + 1}` } } : { name: nm, type: 'ordinal', role: 'var', levels: LV, label: { es: `Evaluador ${j - 3}`, en: `Rater ${j - 3}` } }));
  const ds = Data.build(names, cols, { name: 'evaluadores_simulados', declared });
  ds.title = { es: 'Simulado: cuatro instrumentos y cuatro evaluadores (no son datos reales)', en: 'Simulated: four instruments and four raters (not real data)' };
  B2.useDataset(ds, L2('Conjunto simulado: 40 casos medidos con cuatro instrumentos (con sesgos y ruidos distintos) y calificados por cuatro evaluadores en cinco categorías. No son datos reales.', 'Simulated set: 40 cases measured with four instruments (with different biases and noise) and rated by four raters in five categories. These are not real data.'));
  S.keys = ds.cols.slice(0, 4).map(c => c.key);
  paintControls();
  goStep(9);
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-9')) return;
  el('b9Sleep').addEventListener('click', () => { B2.loadExample('sleep'); goStep(9); });
  el('b9Sim').addEventListener('click', simulated);
  el('b9SimBtn').addEventListener('click', simulated);
  el('b9Cols').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, i = S.keys.indexOf(k); if (i >= 0) S.keys.splice(i, 1); else S.keys.push(k); paintControls(); run(); });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 9 && state.data && (S.dirty || !state.agreement)) run(); });
document.addEventListener('langchange', () => { if (state.data) { paintControls(); if (state.agreement) run(); } });
document.addEventListener('fmtchange', () => { if (state.agreement) run(); });
window.B9 = { state: S };
})();
