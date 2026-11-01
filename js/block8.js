/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 8, categorical, ordinal and mixed association: the
   contingency table with its residuals and its mosaic, every nominal,
   ordinal and latent measure that applies, the continuous–categorical
   coefficients with the values of each category, and the heterogeneous
   matrix. The result goes to state.categorical. */
(function () {
'use strict';
const CATK = ['binary', 'nominal', 'ordinal'], MIXK = ['continuous', 'ordinal', 'binary', 'nominal'];
const S = { r: null, c: null, x: null, g: null, het: null, dirty: true };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
const catCols = ds => ds.cols.filter(c => c.role !== 'exclude' && CATK.includes(c.type) && c.levels && c.levels.length >= 2 && c.levels.length <= 30);
const contCols = ds => ds.cols.filter(c => c.role !== 'exclude' && c.type === 'continuous');
const mixCols = ds => ds.cols.filter(c => c.role !== 'exclude' && MIXK.includes(c.type) && (c.type === 'continuous' || (c.levels && c.levels.length <= 30)));

function onData() {
  const ds = state.data;
  el('b8Empty').hidden = !!ds; el('b8Main').hidden = !ds;
  if (!ds) return;
  const cc = catCols(ds), ct = contCols(ds), mx = mixCols(ds);
  const has = (list, k) => list.some(c => c.key === k);
  if (!has(cc, S.r)) S.r = cc[0] ? cc[0].key : null;
  if (!has(cc, S.c) || S.c === S.r) S.c = cc.find(c => c.key !== S.r) ? cc.find(c => c.key !== S.r).key : null;
  if (!has(ct, S.x)) S.x = ct[0] ? ct[0].key : null;
  if (!has(cc, S.g)) S.g = cc[0] ? cc[0].key : null;
  S.het = (S.het || []).filter(k => has(mx, k));
  if (S.het.length < 2) S.het = mx.slice(0, 12).map(c => c.key);
  paintControls();
  S.dirty = true; state.categorical = null;
  if (el('panel-8').classList.contains('active')) runAll();
}
function paintControls() {
  const ds = state.data, cc = catCols(ds), ct = contCols(ds), mx = mixCols(ds);
  const opt = list => list.map(c => `<option value="${c.key}">${esc(label(c))} (${c.levels ? c.levels.length : '—'})</option>`).join('');
  el('b8R').innerHTML = opt(cc); el('b8C').innerHTML = opt(cc); el('b8G').innerHTML = opt(cc);
  el('b8X').innerHTML = ct.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
  if (S.r) el('b8R').value = S.r; if (S.c) el('b8C').value = S.c; if (S.g) el('b8G').value = S.g; if (S.x) el('b8X').value = S.x;
  el('b8Vars').innerHTML = mx.map(c => `<button type="button" class="chip${S.het.includes(c.key) ? ' on' : ''}" data-k="${c.key}">${esc(label(c))} <small>${esc(T(Data.TYPE_NAMES[c.type][0], Data.TYPE_NAMES[c.type][1]))}</small></button>`).join('');
}
function runAll() { paintTable(); paintMixed(); paintHetero(); S.dirty = false; refreshStepMarks(); }

/* ---------------- the table ---------------- */
function paintTable() {
  const ds = state.data;
  clearMessages('b8Msgs');
  if (!S.r || !S.c) { showMessage('b8Msgs', 'warn', L2('Hacen falta dos variables categóricas (binarias, nominales u ordinales). Revisa los tipos en el Bloque 2.', 'Two categorical variables are needed (binary, nominal or ordinal). Check the kinds in Block 2.')); ['b8Table', 'b8Mos', 'b8Tiles', 'b8Measures'].forEach(id => { el(id).innerHTML = ''; }); return; }
  if (S.r === S.c) { showMessage('b8Msgs', 'warn', L2('Elige dos variables distintas.', 'Pick two different variables.')); return; }
  const A = Data.col(ds, S.r), B = Data.col(ds, S.c);
  const tb = Cat.table(Array.from(A.num), Array.from(B.num), A.levels.length, B.levels.length);
  if (tb.r < 2 || tb.c < 2) { showMessage('b8Msgs', 'warn', L2('La tabla tiene menos de dos filas o columnas con datos.', 'The table has fewer than two rows or columns with data.')); return; }
  const rn = A.levels.filter((_, i) => tb.keptRows[i]), cn = B.levels.filter((_, j) => tb.keptCols[j]);
  const cs = Cat.chisq(tb), N = Cat.nominal(tb), two = tb.r === 2 && tb.c === 2;
  const R = { tb, cs, N, rn, cn, A: A.key, B: B.key };
  if (two) { R.fisher = Cat.fisher(tb); R.tt = Cat.twoByTwo(tb); R.yates = Cat.chisq(tb, { correct: true }); }
  else if (tb.n <= 5000) R.mc = Cat.monteCarlo(tb, { B: 1999, seed: 5 });
  const ordinal = A.type !== 'nominal' && B.type !== 'nominal';
  if (ordinal) {
    /* expand the table to pairs of codes for the rank coefficients */
    const xa = [], yb = [];
    tb.T.forEach((row, i) => row.forEach((v, j) => { for (let k = 0; k < v; k++) { xa.push(i); yb.push(j); } }));
    R.gamma = Coef.gamma(xa, yb); R.somers = Coef.somers(xa, yb); R.taub = Coef.kendall(xa, yb, { exact: false }); R.tauc = Coef.kendall(xa, yb, { variant: 'c', exact: false });
    R.poly = Cat.polychoric(tb);
  }
  state.categorical = Object.assign(state.categorical || {}, { table: R });
  /* the table */
  const mode = el('b8Cell').value, { T: TT, rs, n } = tb, csum = tb.cs;
  const cell = (i, j) => {
    const O = TT[i][j], E = rs[i] * csum[j] / n;
    if (mode === 'row') return Fmt.num(100 * O / rs[i], 1);
    if (mode === 'col') return Fmt.num(100 * O / csum[j], 1);
    if (mode === 'res') { const adj = (O - E) / Math.sqrt(E * (1 - rs[i] / n) * (1 - csum[j] / n)); return Fmt.num(adj, 2); }
    return fmtNum(O, 0);
  };
  const resCls = (i, j) => { const O = TT[i][j], E = rs[i] * csum[j] / n, adj = (O - E) / Math.sqrt(E * (1 - rs[i] / n) * (1 - csum[j] / n)); return adj > 2.58 ? 'r-pp' : adj > 1.96 ? 'r-p' : adj < -2.58 ? 'r-nn' : adj < -1.96 ? 'r-n' : ''; };
  el('b8Table').innerHTML = `<table class="b8-ct"><thead><tr><th>${esc(short(label(A), 18))} \\ ${esc(short(label(B), 18))}</th>${cn.map(c => `<th class="num">${esc(short(c, 14))}</th>`).join('')}<th class="num">${L2('Total', 'Total')}</th></tr></thead><tbody>` +
    rn.map((r, i) => `<tr><th>${esc(short(r, 18))}</th>${cn.map((_, j) => `<td class="num ${resCls(i, j)}">${cell(i, j)}</td>`).join('')}<td class="num">${fmtNum(rs[i], 0)}</td></tr>`).join('') +
    `<tr class="tot"><th>${L2('Total', 'Total')}</th>${csum.map(v => `<td class="num">${fmtNum(v, 0)}</td>`).join('')}<td class="num">${fmtNum(n, 0)}</td></tr></tbody></table>` +
    `<p class="hint">${L2('Celdas en azul o rojo: residuo ajustado mayor que 1.96 (o 2.58) en valor absoluto, más o menos casos de los esperados si fueran independientes.', 'Cells in blue or red: adjusted residual beyond 1.96 (or 2.58) in absolute value, more or fewer cases than expected under independence.')}${cs.small ? ' ' + L2(`Hay frecuencias esperadas menores que 5 (mínima ${Fmt.num(cs.minE, 2)}): usa el valor p exacto o de Monte Carlo.`, `There are expected counts below 5 (minimum ${Fmt.num(cs.minE, 2)}): use the exact or Monte Carlo p-value.`) : ''}</p>`;
  el('b8Mos').innerHTML = mosaic(tb, rn, cn, label(A), label(B));
  statTiles('b8Tiles', [
    ['<span class="nc">χ²</span>', Fmt.num(cs.X2, 2), `${T('gl', 'df')} ${cs.df} · ${pTxt(cs.p)}`, cs.p < 0.05 ? 'ok' : 'warn'],
    ['<span class="nc">G²</span>', Fmt.num(cs.G2, 2), pTxt(cs.pG)],
    two ? [T('Fisher exacto', 'Fisher exact'), pTxt(R.fisher.p), T(`Yates: χ² = ${Fmt.num(R.yates.X2, 2)}`, `Yates: χ² = ${Fmt.num(R.yates.X2, 2)}`)] : R.mc ? [T('Monte Carlo', 'Monte Carlo'), pTxt(R.mc.p), `B = ${R.mc.B}`] : null,
    [T('V de Cramér', 'Cramér’s V'), fr(N.cramerBC), T(`sin corregir ${fr(N.cramer)}`, `uncorrected ${fr(N.cramer)}`), 'ok'],
    two ? ['<span class="nc">φ</span>', fr(N.phi), T(`OR = ${Fmt.num(R.tt.or, 2)} [${Fmt.num(R.tt.orLo, 2)}, ${Fmt.num(R.tt.orHi, 2)}]`, `OR = ${Fmt.num(R.tt.or, 2)} [${Fmt.num(R.tt.orLo, 2)}, ${Fmt.num(R.tt.orHi, 2)}]`)] : null,
    R.poly ? [R.poly.tetrachoric ? T('Tetracórica', 'Tetrachoric') : T('Policórica', 'Polychoric'), fr(R.poly.est), `± ${Fmt.num(R.poly.se, 3)} · ${pTxt(R.poly.p)}`] : null,
  ]);
  const rows = [
    [T('V de Cramér (corregida, Bergsma 2013)', 'Cramér’s V (bias-corrected, Bergsma 2013)'), fr(N.cramerBC), ''],
    [T('V de Cramér', 'Cramér’s V'), fr(N.cramer), ''],
    [T('C de contingencia de Pearson', 'Pearson’s contingency C'), fr(N.contingency), T(`máximo posible ${fr(N.contingencyMax)}`, `largest possible ${fr(N.contingencyMax)}`)],
    [T('T de Tschuprow', 'Tschuprow’s T'), fr(N.tschuprow), ''],
    [T('λ de Goodman–Kruskal', 'Goodman–Kruskal λ'), fr(N.lambda), T(`columnas desde filas ${fr(N.lambdaCR)} · filas desde columnas ${fr(N.lambdaRC)}`, `columns from rows ${fr(N.lambdaCR)} · rows from columns ${fr(N.lambdaRC)}`)],
    [T('τ de Goodman–Kruskal', 'Goodman–Kruskal τ'), '', T(`columnas desde filas ${fr(N.tauCR)} · filas desde columnas ${fr(N.tauRC)}`, `columns from rows ${fr(N.tauCR)} · rows from columns ${fr(N.tauRC)}`)],
    [T('U de Theil (incertidumbre)', 'Theil’s U (uncertainty)'), fr(N.u), T(`columnas desde filas ${fr(N.uCR)} · filas desde columnas ${fr(N.uRC)}`, `columns from rows ${fr(N.uCR)} · rows from columns ${fr(N.uRC)}`)],
  ];
  if (two) rows.push([T('Q de Yule', 'Yule’s Q'), fr(R.tt.Q), ''], [T('Y de Yule', 'Yule’s Y'), fr(R.tt.Y), ''], [T('Razón de momios (Woolf)', 'Odds ratio (Woolf)'), Fmt.num(R.tt.or, 3), `[${Fmt.num(R.tt.orLo, 3)}, ${Fmt.num(R.tt.orHi, 3)}]`], [T('Riesgo relativo', 'Relative risk'), Fmt.num(R.tt.rr, 3), `P(${cn[0]} | ${rn[0]}) ÷ P(${cn[0]} | ${rn[1]})`]);
  if (ordinal) rows.push([T('γ de Goodman–Kruskal', 'Goodman–Kruskal γ'), fr(R.gamma.est), T('ignora los empates', 'ignores ties')], [T('d de Somers (columnas | filas)', 'Somers’ d (columns | rows)'), fr(R.somers.est), ''], ['τ-b', fr(R.taub.est), pTxt(R.taub.p)], ['τ-c', fr(R.tauc.est), ''],
    [R.poly.tetrachoric ? T('Tetracórica', 'Tetrachoric') : T('Policórica', 'Polychoric'), fr(R.poly.est), R.poly.df > 0 ? T(`ajuste de la normal: G² = ${Fmt.num(R.poly.G2, 2)}, gl ${R.poly.df}, ${pTxt(R.poly.pFit)}`, `fit of the normal: G² = ${Fmt.num(R.poly.G2, 2)}, df ${R.poly.df}, ${pTxt(R.poly.pFit)}`) : '']);
  el('b8Measures').innerHTML = `<table><thead><tr><th>${L2('Medida', 'Measure')}</th><th class="num">${L2('Valor', 'Value')}</th><th>${L2('Detalle', 'Detail')}</th></tr></thead><tbody>` + rows.map(r => `<tr><td>${esc(r[0])}</td><td class="num"><b>${r[1]}</b></td><td class="cmut">${esc(r[2])}</td></tr>`).join('') + '</tbody></table>';
}
/* the mosaic: the rows split the height, the columns split the width of each row; the colour is the Pearson residual */
function mosaic(tb, rn, cn, la, lb) {
  const W = 420, H = 340, m = { l: 90, r: 14, t: 40, b: 14 }, gap = 3, x0 = m.l, x1 = W - m.r, y0 = m.t, y1 = H - m.b;
  const { T: TT, rs, cs, n, r, c } = tb, pal = Pal.get(View.palette), dark = Pal.darkVersion(pal);
  const totalW = x1 - x0 - gap * (c - 1), totalH = y1 - y0 - gap * (r - 1);
  let s = Plot.open(W, H, { plot: 'b8-mosaic' }, null, T('Mosaico', 'Mosaic'));
  let y = y0;
  for (let i = 0; i < r; i++) {
    const h = totalH * rs[i] / n;
    let x = x0;
    for (let j = 0; j < c; j++) {
      const E = rs[i] * cs[j] / n, res = (TT[i][j] - E) / Math.sqrt(E), v = Math.max(-1, Math.min(1, res / 4));
      const ww = (x1 - x0 - gap * (c - 1)) * TT[i][j] / rs[i];
      s += `<rect class="pl-gl" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, ww).toFixed(1)}" height="${h.toFixed(1)}" style="--cl:${Pal.color(pal, v, { invert: View.invert })};--cd:${Pal.color(dark, v, { invert: View.invert })}"><title>${esc(rn[i])} · ${esc(cn[j])}: ${TT[i][j]} (${T('residuo', 'residual')} ${res.toFixed(2)})</title></rect>`;
      if (ww > 26 && h > 14) s += `<text class="b8-mosn" x="${(x + ww / 2).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" text-anchor="middle">${TT[i][j]}</text>`;
      x += ww + gap;
    }
    s += `<text class="pl-mlab" x="${x0 - 8}" y="${(y + h / 2 + 4).toFixed(1)}" text-anchor="end">${esc(short(rn[i], 14))}</text>`;
    y += h + gap;
  }
  /* column names over the first row's tiles */
  let x = x0;
  for (let j = 0; j < c; j++) { const ww = (x1 - x0 - gap * (c - 1)) * TT[0][j] / rs[0]; s += `<text class="pl-mlab" x="${(x + ww / 2).toFixed(1)}" y="${y0 - 8}" text-anchor="middle">${esc(short(cn[j], 10))}</text>`; x += ww + gap; }
  s += `<text class="pl-lab" x="${(x0 + x1) / 2}" y="14" text-anchor="middle">${esc(lb)}</text><text class="pl-lab" transform="translate(14 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${esc(la)}</text>`;
  return s + '</svg>';
}

/* ---------------- continuous with categorical ---------------- */
function strip(x, g, names, xlab) {
  const groups = names.map((nm, k) => ({ nm, v: x.filter((_, i) => g[i] === k) })).filter(gr => gr.v.length);
  const W = 420, H = 300, m = { l: 56, r: 14, t: 12, b: 50 }, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const all = groups.flatMap(gr => gr.v), ey = Plot.extent(all), K = groups.length;
  const sx = k => x0 + (k + 0.5) * (x1 - x0) / K, sy = Plot.scale(ey[0], ey[1], y0, y1);
  let s = Plot.open(W, H, { plot: 'b8-strip' }, { x0, x1, y0, y1, ex: [0, K], ey }, T('Valores por categoría', 'Values by category'));
  const yt = Plot.ticks(ey[0], ey[1], 6);
  s += `<g data-role="grid" class="pl-grid">${yt.ticks.map(v => `<line x1="${x0}" y1="${sy(v).toFixed(1)}" x2="${x1}" y2="${sy(v).toFixed(1)}"/>`).join('')}</g>`;
  s += `<g data-role="axis" class="pl-axis"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}"/><line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}"/></g>`;
  s += `<g class="pl-tick" data-role="ytick">${yt.ticks.map(v => `<text x="${x0 - 7}" y="${(sy(v) + 3.5).toFixed(1)}" text-anchor="end">${Plot.tickLabel(v, yt.step)}</text>`).join('')}</g>`;
  const rnd = Num.rng(9), cat = Pal.CAT.laca, bw = Math.min(60, (x1 - x0) / K * 0.6);
  groups.forEach((gr, k) => {
    const cx = sx(k), q1 = Num.quantile(gr.v, 0.25), q3 = Num.quantile(gr.v, 0.75), md = Num.median(gr.v), mean = Num.mean(gr.v);
    s += `<rect class="b8-box" x="${(cx - bw / 2).toFixed(1)}" y="${sy(q3).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, sy(q1) - sy(q3)).toFixed(1)}"/><line class="b8-med" x1="${(cx - bw / 2).toFixed(1)}" y1="${sy(md).toFixed(1)}" x2="${(cx + bw / 2).toFixed(1)}" y2="${sy(md).toFixed(1)}"/>`;
    s += '<g class="pl-pts">';
    gr.v.forEach(v => { s += `<circle cx="${(cx + (rnd() - 0.5) * bw * 0.9).toFixed(1)}" cy="${sy(v).toFixed(1)}" r="2.2" style="fill:${cat[k % 8]}"/>`; });
    s += `</g><path class="b8-mean" d="M${(cx - 6).toFixed(1)} ${sy(mean).toFixed(1)}L${(cx + 6).toFixed(1)} ${sy(mean).toFixed(1)}M${cx.toFixed(1)} ${(sy(mean) - 6).toFixed(1)}L${cx.toFixed(1)} ${(sy(mean) + 6).toFixed(1)}"/>`;
    s += `<text class="pl-mlab" x="${cx.toFixed(1)}" y="${y0 + 16}" text-anchor="middle">${esc(short(gr.nm, 14))}</text><text class="pl-cbtext" x="${cx.toFixed(1)}" y="${y0 + 30}" text-anchor="middle">n = ${gr.v.length}</text>`;
  });
  s += `<text class="pl-lab" data-role="ylab" transform="translate(${x0 - 40} ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${esc(xlab)}</text>`;
  return s + '</svg>';
}
function paintMixed() {
  const ds = state.data;
  el('b8StripPane').hidden = !S.x || !S.g;
  if (!S.x || !S.g) { el('b8MTiles').innerHTML = `<p class="hint">${L2('Hacen falta una variable continua y una categórica.', 'A continuous and a categorical variable are needed.')}</p>`; el('b8Strip').innerHTML = ''; el('b8MText').innerHTML = ''; return; }
  const X = Data.col(ds, S.x), G = Data.col(ds, S.g), x = Array.from(X.num), g = Array.from(G.num);
  const kind = G.type, R = { kind };
  const tiles = [];
  R.eta = Cat.eta(x, g);
  tiles.push(['<span class="nc">η</span>', fr(R.eta.eta), `η² = ${fr(R.eta.eta2)} · F = ${Fmt.num(R.eta.F, 2)} · ${pTxt(R.eta.p)}`, R.eta.p < 0.05 ? 'ok' : 'warn']);
  if (kind === 'binary') {
    R.bis = Cat.biserial(x, g); R.rb = Cat.rankBiserial(x, g);
    tiles.push([T('Biserial puntual', 'Point-biserial'), fr(R.bis.pointBiserial), pTxt(R.bis.pPB)], [T('Biserial', 'Biserial'), fr(R.bis.biserial), T('si la binaria corta una normal', 'if the binary cuts a normal')], [T('Rango-biserial', 'Rank-biserial'), fr(R.rb.est), `U = ${fmtNum(R.rb.U, 1)} · ${pTxt(R.rb.p)}`]);
  }
  if (kind === 'ordinal' || kind === 'binary') {
    R.ps = Cat.polyserial(x, g);
    tiles.push([T('Poliserial', 'Polyserial'), fr(R.ps.est), T(`± ${Fmt.num(R.ps.se, 3)} · ad hoc ${fr(R.ps.adhoc)}`, `± ${Fmt.num(R.ps.se, 3)} · ad hoc ${fr(R.ps.adhoc)}`)]);
  }
  state.categorical = Object.assign(state.categorical || {}, { mixed: R });
  statTiles('b8MTiles', tiles);
  el('b8Strip').innerHTML = strip(x, g, G.levels, label(X));
  const txt = kind === 'nominal' ? [`η mide cuánto de la variación de ${label(X)} explican las categorías de ${label(G)} (η² = ${fr(R.eta.eta2)}); no tiene signo porque las categorías no tienen orden.`, `η measures how much of the variation of ${label(X)} the categories of ${label(G)} explain (η² = ${fr(R.eta.eta2)}); it has no sign because the categories have no order.`]
    : kind === 'binary' ? [`La biserial puntual es la r de Pearson con la binaria codificada 0/1 y equivale a la prueba t de dos grupos; la biserial supone que la binaria es un corte de una normal latente; la rango-biserial no supone normalidad (proporción de pares en que el grupo «${G.levels[1]}» supera al otro, menos la inversa).`, `The point-biserial is Pearson’s r with the binary coded 0/1 and is equivalent to the two-group t test; the biserial assumes the binary is a cut of a latent normal; the rank-biserial assumes no normality (share of pairs in which group “${G.levels[1]}» exceeds the other, minus the reverse).`]
      : [`La poliserial estima la correlación de ${label(X)} con la normal latente que se corta en las categorías de ${label(G)} (Olsson, Drasgow y Dorans 1982); η no usa el orden.`, `The polyserial estimates the correlation of ${label(X)} with the latent normal cut into the categories of ${label(G)} (Olsson, Drasgow and Dorans 1982); η does not use the order.`];
  el('b8MText').innerHTML = `<p>${L2(esc(txt[0]), esc(txt[1]))}</p>`;
}

/* ---------------- the heterogeneous matrix ---------------- */
const MLETTER = { pearson: 'P', polyserial: 'S', polychoric: 'C', tetrachoric: 'T', eta: 'η', cramer: 'V' };
function paintHetero() {
  const ds = state.data, keys = S.het;
  if (keys.length < 2) { el('b8Het').innerHTML = ''; el('b8HetLegend').innerHTML = ''; return; }
  const cols = keys.map(k => { const c = Data.col(ds, k); return { num: Array.from(c.num), type: c.type, levels: c.levels }; });
  const H = Cat.hetero(cols);
  state.categorical = Object.assign(state.categorical || {}, { hetero: { keys, R: H.R, M: H.M } });
  const names = keys.map(k => label(Data.col(ds, k)));
  const tip = (i, j) => `${names[i]} · ${names[j]}: ${Fmt.bounded(H.R[i][j], 2)} (${H.M[i][j]})`;
  const size = keys.length <= 6 ? 62 : keys.length <= 10 ? 48 : 36;
  let svg = Plot.matrix({ R: H.R, labels: names.map(s => short(s, 20)), glyph: { lower: 'number', upper: 'ellipse', diag: 'diag' }, palette: View.palette, invert: View.invert, size, labelWidth: Math.min(160, 14 + 6.4 * Math.max(...names.map(s => Math.min(20, s.length)))), colLabels: true, tip, plot: 'b8-hetero', label: T('Matriz heterogénea', 'Heterogeneous matrix') });
  /* the letter of the coefficient in the upper right corner of each lower cell, clear of the number */
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  doc.querySelectorAll('.pl-cell').forEach(g0 => { const i = +g0.getAttribute('data-i'), j = +g0.getAttribute('data-j'); if (i > j) { const t = g0.querySelector('text'); if (t) { const x = +t.getAttribute('x'), y = +t.getAttribute('y'); const lt = doc.createElementNS('http://www.w3.org/2000/svg', 'text'); lt.setAttribute('class', 'b8-let'); lt.setAttribute('x', x + size / 2 - 5); lt.setAttribute('y', y - size / 2 + 12); lt.setAttribute('text-anchor', 'end'); lt.textContent = MLETTER[H.M[i][j]] || ''; g0.appendChild(lt); } } });
  svg = new XMLSerializer().serializeToString(doc.documentElement);
  el('b8Het').innerHTML = svg;
  el('b8HetLegend').innerHTML = Object.entries({ P: T('Pearson', 'Pearson'), S: T('poliserial', 'polyserial'), C: T('policórica', 'polychoric'), T: T('tetracórica', 'tetrachoric'), 'η': T('razón de correlación', 'correlation ratio'), V: T('V de Cramér corregida', 'bias-corrected Cramér’s V') }).map(([k, v]) => `<span class="fl-item"><b>${k}</b> ${esc(v)}</span>`).join('');
  el('b8HetNote').innerHTML = H.M.flat().some(m => m === 'eta' || m === 'cramer') ? L2('η y V no tienen signo y no forman, con las demás, una matriz de correlación definida positiva: sirven para describir, no para un análisis factorial.', 'η and V have no sign and do not form, with the others, a positive-definite correlation matrix: they serve to describe, not for a factor analysis.') : '';
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-8')) return;
  el('b8Titanic').addEventListener('click', () => { B2.loadExample('titanic'); goStep(8); });
  ['b8R', 'b8C'].forEach(id => el(id).addEventListener('change', () => { S.r = el('b8R').value; S.c = el('b8C').value; paintTable(); }));
  el('b8Cell').addEventListener('change', paintTable);
  ['b8X', 'b8G'].forEach(id => el(id).addEventListener('change', () => { S.x = el('b8X').value; S.g = el('b8G').value; paintMixed(); }));
  el('b8Vars').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, i = S.het.indexOf(k); if (i >= 0) { if (S.het.length > 2) S.het.splice(i, 1); } else S.het.push(k); paintControls(); paintHetero(); });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 8 && state.data && (S.dirty || !state.categorical)) runAll(); });
document.addEventListener('langchange', () => { if (state.data) { paintControls(); if (state.categorical) runAll(); } });
document.addEventListener('fmtchange', () => { if (state.categorical) runAll(); });
document.addEventListener('palettechange', () => { if (state.categorical) { paintTable(); paintHetero(); } });
window.B8 = { state: S };
})();
