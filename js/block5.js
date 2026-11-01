/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 5, the correlation matrix: any coefficient for every
   pair of the chosen variables, the multiple-testing correction, the glyph
   matrix with animated changes of glyph (an SVG up to 40 variables, a canvas
   with a lens beyond, up to a thousand), the diagnosis (eigenvalues, nearest
   positive-definite matrix, shrinkage, partial correlations), KMO and
   Bartlett, and the table to publish. The result goes to state.matrix. */
(function () {
'use strict';
const NUM = ['continuous', 'ordinal'];
const SVG_MAX = 40, MAXV = 1000;
const S = { keys: null, method: 'pearson', adjust: 'holm', alpha: 0.05, lower: 'ellipse', upper: 'number', order: 'original', insig: 'cross', show: 'raw', sel: null, dirty: true, near: null };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
function cands(ds) { return ds.cols.filter(c => c.role === 'var' && NUM.includes(c.type)); }
const METHOD_NAMES = () => Coef.PAIR.filter(c => c.id !== 'taustar').map(c => ({ id: c.id === 'gaussian' ? 'gaussian' : c.id, es: c.es, en: c.en }));

/* ---------------- setting up ---------------- */
function onData() {
  const ds = state.data;
  el('b5Empty').hidden = !!ds; el('b5Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds);
  const keep = S.keys ? S.keys.filter(k => cs.some(c => c.key === k)) : [];
  S.keys = keep.length >= 2 ? keep : cs.slice(0, MAXV).map(c => c.key);
  S.sel = null; S.near = null; S.dirty = true; state.matrix = null;
  paintControls();
  if (el('panel-5').classList.contains('active')) run();
}
function paintControls() {
  const ds = state.data, cs = cands(ds);
  el('b5Vars').innerHTML = (cs.length > 60
    ? `<span class="hint">${L2(`${cs.length} variables numéricas; se usan ${S.keys.length}.`, `${cs.length} numeric variables; ${S.keys.length} in use.`)}</span>`
    : cs.map(c => `<button type="button" class="chip${S.keys.includes(c.key) ? ' on' : ''}" data-k="${c.key}" aria-pressed="${S.keys.includes(c.key)}">${esc(label(c))}</button>`).join('')) +
    ` <button type="button" class="chip-act" data-all="1">${L2('todas', 'all')}</button>`;
  el('b5Method').innerHTML = METHOD_NAMES().map(m => `<option value="${m.id}">${esc(T(m.es, m.en))}</option>`).join('');
  el('b5Method').value = S.method;
  const kinds = ['ellipse', 'circle', 'moon', 'pie', 'square', 'bar', 'shade', 'color', 'number'];
  const opt = kinds.map(k => `<option value="${k}">${esc(T(Home.GL_NAMES[k][0], Home.GL_NAMES[k][1]))}</option>`).join('');
  el('b5Lower').innerHTML = opt + `<option value="none">${esc(T('Nada', 'Nothing'))}</option>`;
  el('b5Upper').innerHTML = opt + `<option value="none">${esc(T('Nada', 'Nothing'))}</option>`;
  el('b5Lower').value = S.lower; el('b5Upper').value = S.upper;
  ['b5Adjust', 'b5Order', 'b5Insig', 'b5Show'].forEach(id => { el(id).value = S[{ b5Adjust: 'adjust', b5Order: 'order', b5Insig: 'insig', b5Show: 'show' }[id]]; });
  el('b5Alpha').value = String(S.alpha);
}

/* ---------------- computation ---------------- */
function compute(w) {
  const ds = state.data, keys = S.keys, cols = keys.map(k => Array.from(Data.col(ds, k).num));
  if (ds.missingMode === 'listwise') {
    const ok = new Set(Data.completeRows(ds, ds.cols.filter(c => c.role !== 'exclude' && !['text', 'empty'].includes(c.type)).map(c => c.key)));
    cols.forEach(c => { for (let r = 0; r < c.length; r++) if (!ok.has(r)) c[r] = NaN; });
  }
  const p = keys.length;
  const C = Mat.compute(cols, { method: S.method, missing: 'pairwise', progress: w ? f => w.update(f * 0.7) : null });
  const R = { keys, cols, p, method: S.method, Rm: C.R, P: C.P, N: C.N, fast: C.fast };
  R.Q = Mat.adjustMatrix(C.P, S.adjust);
  const sym = M => M.map((row, i) => row.map((v, j) => (isFinite(v) ? v : isFinite(M[j][i]) ? M[j][i] : i === j ? 1 : 0)));
  R.Rs = sym(C.R);
  if (p <= 400) {
    R.diag = Mat.diagnose(R.Rs);
    if (R.diag.pd) {
      R.kmo = Mat.kmo(R.Rs);
      const nMin = Math.min(...C.N.flat().filter(v => v > 0));
      R.bartlett = Mat.bartlett(R.Rs, nMin);
      /* partial correlations and their t tests with n − p df */
      const df = nMin - p;
      R.partial = R.kmo.partial.map((row, i) => row.map((v, j) => (i === j ? 1 : v)));
      R.partialP = R.partial.map((row, i) => row.map((v, j) => { if (i === j || df < 1) return NaN; const t = v * Math.sqrt(df / Math.max(1e-300, 1 - v * v)); return Math.min(1, 2 * Num.pt(Math.abs(t), df, true)); }));
      R.partialQ = Mat.adjustMatrix(R.partialP, S.adjust);
    }
  }
  if (cols[0].length > 2) try { R.shrink = Mat.shrink(cols); } catch (e) { R.shrink = null; }
  return R;
}
function run() {
  if (!state.data || !S.keys || S.keys.length < 2) { if (state.data) showMessage('b5Msgs', 'warn', L2('Elige al menos dos variables.', 'Pick at least two variables.')); return; }
  clearMessages('b5Msgs');
  const p = S.keys.length, n = state.data.n, cost = p * p * n * (['pearson', 'spearman'].includes(S.method) ? 1 : ['dcor', 'hoeffding'].includes(S.method) ? n : 20);
  const w = cost > 3e6 && window.LABG ? LABG.work({ title: T('Calculando la matriz…', 'Computing the matrix…'), message: T(`${p} variables · ${fmtNum(p * (p - 1) / 2, 0)} pares`, `${p} variables · ${fmtNum(p * (p - 1) / 2, 0)} pairs`), delay: 200 }) : null;
  const go = () => {
    if (S.method === 'dcor' && n > 3000) throw new Error(T('La correlación de distancias guarda matrices de n × n en memoria: hasta 3 000 filas.', 'Distance correlation keeps n × n matrices in memory: up to 3,000 rows.'));
    if (['dcor', 'hoeffding', 'xi'].includes(S.method) && p > 60 && n > 300) throw new Error(T('Esa medida es costosa: usa hasta 60 variables con muchas filas.', 'That measure is costly: use up to 60 variables with many rows.'));
    state.matrix = compute(w); S.dirty = false; S.near = null; paintAll(); refreshStepMarks();
  };
  if (w) cpAfterPaint(go, w); else { try { go(); } catch (e) { showMessage('b5Msgs', 'error', esc(e.message)); } }
}

/* ---------------- the matrix figure ---------------- */
function shown() {
  const R = state.matrix;
  if (S.show === 'near' && S.near) return { M: S.near.R, Q: R.Q, title: T('la definida positiva más cercana', 'the nearest positive-definite one') };
  if (S.show === 'shrink' && R.shrink) return { M: R.shrink.R, Q: R.Q, title: T(`contraída, λ = ${Fmt.num(R.shrink.lambda, 3)}`, `shrunk, λ = ${Fmt.num(R.shrink.lambda, 3)}`) };
  if (S.show === 'partial' && R.partial) return { M: R.partial, Q: R.partialQ, title: T('correlaciones parciales (cada par, quitando a todas las demás)', 'partial correlations (each pair, removing all the others)'), partial: true };
  return { M: R.Rs, Q: R.Q, title: '' };
}
function orderOf(M) {
  const R = state.matrix, ds = state.data;
  if (S.order === 'original') return null;
  try {
    if (S.order === 'alpha') return [...R.keys.keys()].sort((a, b) => label(Data.col(ds, R.keys[a])).localeCompare(label(Data.col(ds, R.keys[b])), 'es'));
    return Mat.order(M.map(r => r.map(v => (isFinite(v) ? v : 0))), S.order);
  } catch (e) { return null; }
}
function paintMatrix(animateFrom) {
  const R = state.matrix, ds = state.data, sh = shown(), p = R.p;
  const names = R.keys.map(k => label(Data.col(ds, k)));
  const mName = METHOD_NAMES().find(m => m.id === R.method);
  el('b5FigTitle').innerHTML = keepGreek(L2(`${esc(mName ? mName.es : R.method)} · ${p} variables${sh.title ? ' · ' + esc(sh.title) : ''}`, `${esc(mName ? mName.en : R.method)} · ${p} variables${sh.title ? ' · ' + esc(sh.title) : ''}`));
  const ord = orderOf(sh.M);
  if (p > SVG_MAX) { paintCanvas(sh, names, ord); return; }
  el('b5Lens').hidden = true;
  const size = p <= 6 ? 64 : p <= 10 ? 52 : p <= 16 ? 40 : p <= 25 ? 30 : 22;
  const glyph = { lower: S.lower === 'none' ? 'blank' : S.lower, upper: S.upper === 'none' ? 'blank' : S.upper, diag: 'diag' };
  const tip = (i, j) => `${names[i]} · ${names[j]}: ${Fmt.bounded(sh.M[i][j], 2)}, ${T('p ajustada', 'adjusted p')} ${isFinite(sh.Q[i][j]) ? Fmt.pValue(sh.Q[i][j]) : '—'}, n = ${R.N[i][j]}`;
  el('b5Fig').innerHTML = Plot.matrix({
    R: sh.M, labels: names.map(s => short(s, 22)), glyph, palette: View.palette, invert: View.invert, pv: sh.Q, alpha: S.alpha, insig: S.insig,
    size, labelWidth: Math.min(170, 14 + 6.4 * Math.max(...names.map(s => Math.min(22, s.length)))), order: ord, colLabels: true, digits: 2, sel: S.sel, tip,
    plot: 'b5-matrix', label: T('Matriz de correlación', 'Correlation matrix'),
  });
  if (animateFrom) animateGlyphs(animateFrom);
}
/* the change of glyph, animated: every polygonal glyph morphs into the new one */
function animateGlyphs(from) {
  const POLY = Glyph.POLY, svg = el('b5Fig').querySelector('svg');
  if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const paths = [...svg.querySelectorAll('path.pl-gl[data-k]')].filter(pth => {
    const k = pth.dataset.k, i = +pth.parentNode.dataset.i, j = +pth.parentNode.dataset.j;
    const old = from[i > j ? 'lower' : 'upper'];
    return POLY.includes(k) && POLY.includes(old) && old !== k;
  });
  if (!paths.length) return;
  const items = paths.map(pth => {
    const i = +pth.parentNode.dataset.i, j = +pth.parentNode.dataset.j, r = +pth.dataset.r, h = +pth.dataset.h;
    const A = Glyph.points(from[i > j ? 'lower' : 'upper'], r, h), B = Glyph.points(pth.dataset.k, r, h);
    return { pth, A, B, cx: +pth.dataset.cx, cy: +pth.dataset.cy, final: pth.getAttribute('d') };
  });
  const t0 = performance.now(), D = 650;
  const step = now => {
    const t = Math.min(1, (now - t0) / D), e = Glyph.ease(t);
    items.forEach(it => it.pth.setAttribute('d', t >= 1 ? it.final : Glyph.pathOf(Glyph.lerp(it.A, it.B, e), it.cx, it.cy)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* many variables: a canvas of colours and a lens that shows the numbers */
function paintCanvas(sh, names, ord) {
  const R = state.matrix, p = R.p, o = ord || [...Array(p).keys()];
  const cell = Math.max(1, Math.floor(Math.min(900, 1800 / 1) / p)), W = cell * p;
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = W * dpr; cv.style.width = W + 'px'; cv.style.height = W + 'px';
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T(`Matriz de correlación de ${p} variables`, `Correlation matrix of ${p} variables`));
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const pal = isDark() ? Pal.darkVersion(Pal.get(View.palette)) : Pal.get(View.palette);
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
    const i = o[a], j = o[b], v = sh.M[i][j];
    const faint = i !== j && S.insig !== 'none' && isFinite(sh.Q[i][j]) && sh.Q[i][j] >= S.alpha;
    ctx.globalAlpha = faint ? 0.25 : 1;
    ctx.fillStyle = i === j ? (isDark() ? '#3A3230' : '#D9D1CB') : Pal.color(pal, isFinite(v) ? v : 0, { invert: View.invert });
    ctx.fillRect(b * cell, a * cell, cell, cell);
  }
  ctx.globalAlpha = 1;
  const host = el('b5Fig');
  host.innerHTML = '';
  host.appendChild(cv);
  const lens = el('b5Lens');
  const cellAt = e => { const rc = cv.getBoundingClientRect(), sc = W / rc.width; const b = Math.floor((e.clientX - rc.left) * sc / cell), a = Math.floor((e.clientY - rc.top) * sc / cell); return a >= 0 && b >= 0 && a < p && b < p ? [a, b] : null; };
  cv.onmousemove = e => {
    const ab = cellAt(e);
    if (!ab) { lens.hidden = true; return; }
    const [a, b] = ab, i = o[a], j = o[b];
    el('b5Hover').innerHTML = `${esc(names[i])} · ${esc(names[j])}: <b>${Fmt.bounded(sh.M[i][j], 3)}</b> · ${T('p ajustada', 'adjusted p')} ${isFinite(sh.Q[i][j]) ? Fmt.pValue(sh.Q[i][j]) : '—'} · n = ${R.N[i][j]}`;
    /* the lens: a 9 × 9 window of numbers around the pointer */
    const k = 4, a0 = Math.max(0, Math.min(p - 9, a - k)), b0 = Math.max(0, Math.min(p - 9, b - k));
    const rows = o.slice(a0, a0 + 9), colsI = o.slice(b0, b0 + 9);
    const sub = rows.map(ri => colsI.map(cj => sh.M[ri][cj]));
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" class="pl"><rect class="pl-bg" width="300" height="300"/>`;
    const cs = 300 / 9, dark = isDark();
    sub.forEach((row, x) => row.forEach((v, y) => {
      const col = Pal.color(pal, isFinite(v) ? v : 0, { invert: View.invert }), on = rows[x] === i && colsI[y] === j;
      s += `<rect x="${y * cs}" y="${x * cs}" width="${cs - 1}" height="${cs - 1}" fill="${col}"${on ? ' stroke="var(--primary)" stroke-width="3"' : ''}/>`;
      s += `<text x="${y * cs + cs / 2}" y="${x * cs + cs / 2 + 4}" text-anchor="middle" font-size="10" fill="${Pal.inkOn ? Pal.inkOn(col) : (dark ? '#fff' : '#000')}">${Fmt.bounded(v, 2)}</text>`;
    }));
    lens.innerHTML = s + '</svg>';
    lens.hidden = false;
    const host2 = el('b5FigPane').getBoundingClientRect();
    let lx = e.clientX - host2.left + 18, ly = e.clientY - host2.top + 18;
    if (lx + 310 > host2.width) lx = e.clientX - host2.left - 318;
    lens.style.left = Math.max(4, lx) + 'px'; lens.style.top = Math.max(4, ly) + 'px';
  };
  cv.onmouseleave = () => { lens.hidden = true; };
  cv.onclick = e => { const ab = cellAt(e); if (ab) selectCell(o[ab[0]], o[ab[1]]); };
}
function selectCell(i, j) {
  const R = state.matrix, ds = state.data, sh = shown();
  if (i === j) return;
  S.sel = [i, j];
  const a = label(Data.col(ds, R.keys[i])), b = label(Data.col(ds, R.keys[j]));
  el('b5Hover').innerHTML = `${L2('Elegido', 'Chosen')}: ${esc(a)} · ${esc(b)} — <b>${Fmt.bounded(sh.M[i][j], 3)}</b>, ${T('p', 'p')} ${isFinite(R.P[i][j]) ? Fmt.pValue(R.P[i][j]) : '—'} (${T('ajustada', 'adjusted')} ${isFinite(sh.Q[i][j]) ? Fmt.pValue(sh.Q[i][j]) : '—'}), n = ${R.N[i][j]}`;
  el('b5ToPair').disabled = false;
  if (R.p <= SVG_MAX) paintMatrix();
}

/* ---------------- diagnosis, KMO, table ---------------- */
function paintDiag() {
  const R = state.matrix, D = R.diag;
  if (!D) { el('b5DiagTiles').innerHTML = `<p class="hint">${L2('Con más de 400 variables el diagnóstico completo es muy costoso aquí.', 'With more than 400 variables the full diagnosis is too costly here.')}</p>`; el('b5Scree').innerHTML = ''; el('b5Fix').innerHTML = ''; return; }
  statTiles('b5DiagTiles', [
    [T('¿Definida positiva?', 'Positive definite?'), D.pd ? T('sí', 'yes') : T('no', 'no'), D.pd ? T('es una matriz de correlación válida', 'it is a valid correlation matrix') : D.negative ? T(`${D.negative} valor(es) propio(s) negativo(s)`, `${D.negative} negative eigenvalue(s)`) : T(`singular: ${D.zero} valor(es) propio(s) nulo(s)`, `singular: ${D.zero} zero eigenvalue(s)`), D.pd ? 'ok' : 'bad'],
    [T('Menor valor propio', 'Smallest eigenvalue'), Fmt.num(D.min, 4)],
    [T('Mayor valor propio', 'Largest eigenvalue'), Fmt.num(D.max, 3), T(`${Math.round(100 * D.max / R.p)} % de la varianza`, `${Math.round(100 * D.max / R.p)}% of the variance`)],
    [T('Número de condición', 'Condition number'), isFinite(D.cond) ? (D.cond > 1e4 ? Fmt.sci(D.cond, 1) : Fmt.num(D.cond, 1)) : '∞', D.cond > 1000 ? T('casi colineal', 'nearly collinear') : '', D.cond > 1000 ? 'warn' : ''],
    [T('log del determinante', 'log of the determinant'), isFinite(D.logDet) ? Fmt.num(D.logDet, 2) : '—'],
  ]);
  const ev = D.eigen.values, xs = ev.map((_, i) => i + 1);
  el('b5Scree').innerHTML = Plot.curves({ w: 420, h: 260, plot: 'b5-scree', xlim: [0.5, ev.length + 0.5], ylim: [Math.min(0, ...ev) * 1.1, Math.max(...ev) * 1.1], xlab: T('Componente', 'Component'), ylab: T('Valor propio', 'Eigenvalue'),
    series: [{ x: xs, y: ev, cls: 'pl-post', label: T('valores propios', 'eigenvalues') }, { x: [0.5, ev.length + 0.5], y: [1, 1], cls: 'pl-prior', label: T('λ = 1 (Kaiser)', 'λ = 1 (Kaiser)') }],
    points: ev.map((v, i) => ({ x: i + 1, y: v, cls: v < 0 ? 'pl-dot-post' : 'pl-dot-prior' })), legend: true, legendAt: 'right' });
  const sh = R.shrink;
  let h = `<div class="rec rec-${D.pd ? 'best' : 'avoid'}"><div class="rec-h"><span class="rec-l">${L2('Correcciones', 'Corrections')}</span></div>`;
  h += `<div class="rec-w">${R.p <= 150 ? `<button type="button" class="btn btn-secondary btn-sm" id="b5NearGo">${L2('Calcular la definida positiva más cercana', 'Compute the nearest positive-definite one')}</button>` : L2('La más cercana se calcula hasta 150 variables.', 'The nearest one is computed up to 150 variables.')}</div>`;
  if (S.near) h += `<div class="rec-w">${L2(`Higham (2002): ${S.near.iterations} iteraciones; distancia de Frobenius ${Fmt.num(S.near.frobenius, 4)}; el mayor cambio de una celda, ${Fmt.num(S.near.maxChange, 4)}.`, `Higham (2002): ${S.near.iterations} iterations; Frobenius distance ${Fmt.num(S.near.frobenius, 4)}; the largest change of a cell, ${Fmt.num(S.near.maxChange, 4)}.`)}</div>`;
  if (sh) h += `<div class="rec-w">${L2(`Contracción de Schäfer y Strimmer: λ = ${Fmt.num(sh.lambda, 3)} (cada r fuera de la diagonal se multiplica por ${Fmt.num(1 - sh.lambda, 3)}); útil cuando hay pocas filas para tantas variables (n = ${sh.n}).`, `Schäfer and Strimmer shrinkage: λ = ${Fmt.num(sh.lambda, 3)} (each off-diagonal r is multiplied by ${Fmt.num(1 - sh.lambda, 3)}); useful when there are few rows for so many variables (n = ${sh.n}).`)}</div>`;
  el('b5Fix').innerHTML = h + '</div>';
}
function paintKmo() {
  const R = state.matrix, ds = state.data;
  if (!R.kmo) { el('b5KmoTiles').innerHTML = `<p class="hint">${L2('KMO y Bartlett piden una matriz definida positiva (usa la más cercana o la contraída si no lo es).', 'KMO and Bartlett need a positive-definite matrix (use the nearest or the shrunk one if it is not).')}</p>`; el('b5Kmo').innerHTML = ''; return; }
  const w = Mat.KMO_WORDS(R.kmo.overall);
  statTiles('b5KmoTiles', [
    ['KMO', Fmt.bounded(R.kmo.overall, 3), T(w[0], w[1]) + T(' (Kaiser y Rice 1974)', ' (Kaiser and Rice 1974)'), R.kmo.overall >= 0.6 ? 'ok' : 'warn'],
    ['Bartlett <span class="nc">χ²</span>', Fmt.num(R.bartlett.chi2, 2), `${T('gl', 'df')} ${R.bartlett.df} · ${pTxt(R.bartlett.p)}`, R.bartlett.p < 0.05 ? 'ok' : 'warn'],
  ]);
  if (R.p > 60) { el('b5Kmo').innerHTML = ''; return; }
  el('b5Kmo').innerHTML = `<table><thead><tr><th>${L2('Variable', 'Variable')}</th><th class="num">MSA</th><th>${L2('Lectura', 'Reading')}</th></tr></thead><tbody>` +
    R.kmo.msa.map((v, i) => { const ww = Mat.KMO_WORDS(v); return `<tr><td>${esc(label(Data.col(ds, R.keys[i])))}</td><td class="num">${Fmt.bounded(v, 3)}</td><td><span class="pill ${v >= 0.6 ? 'ok' : v >= 0.5 ? 'warn' : 'bad'}">${L2(ww[0], ww[1])}</span></td></tr>`; }).join('') + '</tbody></table>';
}
function apaTable() {
  const R = state.matrix, ds = state.data, sh = shown(), p = R.p;
  if (p > 30) return { html: `<p class="hint">${L2('La tabla se arma hasta 30 variables; descarga el CSV para más.', 'The table is built up to 30 variables; download the CSV for more.')}</p>`, text: '' };
  const names = R.keys.map(k => label(Data.col(ds, k)));
  const st = q => (!isFinite(q) ? '' : q < 0.001 ? '***' : q < 0.01 ? '**' : q < S.alpha ? '*' : '');
  const mm = R.cols.map(c => { const v = c.filter(isFinite); return [Num.mean(v), Num.sd(v)]; });
  let h = `<table class="b5-table"><caption>${L2(`Tabla 1. Medias, desviaciones estándar y correlaciones (${esc(METHOD_NAMES().find(m => m.id === R.method).es)})`, `Table 1. Means, standard deviations and correlations (${esc(METHOD_NAMES().find(m => m.id === R.method).en)})`)}</caption><thead><tr><th>${L2('Variable', 'Variable')}</th><th>M</th><th>${L2('DE', 'SD')}</th>`;
  for (let j = 0; j < p - 1; j++) h += `<th>${j + 1}</th>`;
  h += '</tr></thead><tbody>';
  const lines = [[T('Variable', 'Variable'), 'M', T('DE', 'SD')].concat(names.slice(0, p - 1).map((_, j) => String(j + 1))).join('\t')];
  for (let i = 0; i < p; i++) {
    h += `<tr><td>${i + 1}. ${esc(names[i])}</td><td>${Fmt.num(mm[i][0], 2)}</td><td>${Fmt.num(mm[i][1], 2)}</td>`;
    const cells = [`${i + 1}. ${names[i]}`, Fmt.num(mm[i][0], 2), Fmt.num(mm[i][1], 2)];
    for (let j = 0; j < p - 1; j++) { const v = j < i ? Fmt.bounded(sh.M[i][j], 2) + st(sh.Q[i][j]) : ''; h += `<td>${v}</td>`; cells.push(v); }
    h += '</tr>'; lines.push(cells.join('\t'));
  }
  const adjName = { holm: 'Holm', BH: 'Benjamini–Hochberg', BY: 'Benjamini–Yekutieli', hochberg: 'Hochberg', hommel: 'Hommel', bonferroni: 'Bonferroni', none: T('sin corrección', 'no correction') }[S.adjust];
  const nMin = Math.min(...R.N.flat().filter(v => v > 0)), nMax = Math.max(...R.N.flat());
  /* with α = .01 a single star cannot occur, so the note leaves it out */
  const one = S.alpha > 0.01 ? `* p < ${Fmt.bounded(S.alpha, 2)}, ` : '';
  const note = T(`Nota. n = ${nMin === nMax ? nMin : nMin + '–' + nMax}${state.data.missingMode === 'listwise' ? ' (por listas)' : nMin !== nMax ? ' (por pares)' : ''}. Valores p corregidos por ${adjName}: ${one}** p < .01, *** p < .001.`,
    `Note. n = ${nMin === nMax ? nMin : nMin + '–' + nMax}${state.data.missingMode === 'listwise' ? ' (listwise)' : nMin !== nMax ? ' (pairwise)' : ''}. p-values corrected by ${adjName}: ${one}** p < .01, *** p < .001.`);
  h += `</tbody></table><p class="b5-tnote">${esc(note)}</p>`;
  lines.push(note);
  return { html: h, text: lines.join('\n') };
}
function paintAll() {
  if (!state.matrix) return;
  if (state.matrix.fast) showMessage('b5Msgs', 'info', L2('Con más de 30 variables completas, Pearson y Spearman se calculan como productos de columnas estandarizadas y sus valores p con la aproximación t.', 'With more than 30 complete variables, Pearson and Spearman are computed as products of standardized columns and their p-values with the t approximation.'));
  paintMatrix(); paintDiag(); paintKmo();
  el('b5Table').innerHTML = apaTable().html;
}

/* ---------------- a large simulated example ---------------- */
function bigExample() {
  const rng = Num.rng(300), n = 120, p = 300, K = 6, names = [], cols = [];
  const F = Array.from({ length: K }, () => Array.from({ length: n }, () => rng.normal()));
  /* two modules share part of a factor, so the clustering has something to find */
  for (let i = 0; i < n; i++) F[1][i] = 0.6 * F[0][i] + 0.8 * F[1][i];
  for (let j = 0; j < p; j++) {
    const k = j % K, lam = (0.35 + 0.55 * rng()) * (rng() < 0.15 ? -1 : 1);
    names.push(`gen_${String(j + 1).padStart(3, '0')}`);
    cols.push(Array.from({ length: n }, (_, i) => (lam * F[k][i] + Math.sqrt(1 - lam * lam) * rng.normal()).toFixed(4)));
  }
  const ds = Data.build(names, cols, { name: 'simulado300' });
  ds.title = { es: 'Simulado: 300 variables en 6 módulos (no son datos reales)', en: 'Simulated: 300 variables in 6 modules (not real data)' };
  B2.useDataset(ds, L2('Conjunto simulado de 300 variables en seis módulos, para probar las matrices grandes. No son datos reales.', 'A simulated set of 300 variables in six modules, to try large matrices. These are not real data.'));
  S.order = 'hclust:average';
  paintControls();
  goStep(5);
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-5')) return;
  el('b5Swiss').addEventListener('click', () => { B2.loadExample('swiss'); goStep(5); });
  el('b5Big').addEventListener('click', bigExample);
  el('b5Vars').addEventListener('click', e => {
    const all = e.target.closest('[data-all]');
    if (all) { S.keys = cands(state.data).slice(0, MAXV).map(c => c.key); paintControls(); run(); return; }
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k, on = S.keys.includes(k);
    if (on && S.keys.length <= 2) return;
    const order = cands(state.data).map(c => c.key);
    S.keys = on ? S.keys.filter(x => x !== k) : order.filter(x => S.keys.includes(x) || x === k);
    S.sel = null; paintControls(); run();
  });
  el('b5Method').addEventListener('change', e => { S.method = e.target.value; run(); });
  el('b5Adjust').addEventListener('change', e => { S.adjust = e.target.value; if (state.matrix) { state.matrix.Q = Mat.adjustMatrix(state.matrix.P, S.adjust); if (state.matrix.partialP) state.matrix.partialQ = Mat.adjustMatrix(state.matrix.partialP, S.adjust); paintAll(); } });
  el('b5Alpha').addEventListener('change', e => { S.alpha = +e.target.value; if (state.matrix) paintAll(); });
  ['b5Lower', 'b5Upper'].forEach(id => el(id).addEventListener('change', e => {
    const from = { lower: S.lower, upper: S.upper };
    S[id === 'b5Lower' ? 'lower' : 'upper'] = e.target.value;
    if (state.matrix) paintMatrix(from);
  }));
  el('b5Order').addEventListener('change', e => { S.order = e.target.value; if (state.matrix) paintMatrix(); });
  el('b5Insig').addEventListener('change', e => { S.insig = e.target.value; if (state.matrix) paintMatrix(); });
  el('b5Show').addEventListener('change', e => {
    S.show = e.target.value;
    if (S.show === 'near' && !S.near && state.matrix) { try { S.near = Mat.nearestPD(state.matrix.Rs); } catch (er) { showMessage('b5Msgs', 'error', esc(er.message)); } paintDiag(); }
    if (S.show === 'partial' && state.matrix && !state.matrix.partial) showMessage('b5Msgs', 'warn', L2('Las parciales piden una matriz definida positiva.', 'The partials need a positive-definite matrix.'));
    if (state.matrix) paintMatrix();
  });
  el('b5Fix').addEventListener('click', e => { if (e.target.closest('#b5NearGo')) { S.near = Mat.nearestPD(state.matrix.Rs); S.show = 'near'; el('b5Show').value = 'near'; paintDiag(); paintMatrix(); } });
  el('b5Fig').addEventListener('click', e => { const c = e.target.closest('.pl-cell'); if (c) selectCell(+c.dataset.i, +c.dataset.j); });
  el('b5ToPair').addEventListener('click', () => { if (!S.sel) return; const R = state.matrix; if (window.B4) B4.setPair(R.keys[S.sel[1]], R.keys[S.sel[0]]); goStep(4); });
  el('b5CopyTable').addEventListener('click', () => { const t = apaTable().text; if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => LABG.toast && LABG.toast(T('Tabla copiada (separada por tabuladores)', 'Table copied (tab-separated)'))); });
  el('b5Csv').addEventListener('click', () => {
    const R = state.matrix, ds = state.data, rows = ['var1,var2,r,p,p_adj,n'];
    const q = s => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
    for (let i = 0; i < R.p; i++) for (let j = i + 1; j < R.p; j++) rows.push([q(Data.col(ds, R.keys[i]).name), q(Data.col(ds, R.keys[j]).name), R.Rm[i][j], R.P[i][j], R.Q[i][j], R.N[i][j]].join(','));
    download('﻿' + rows.join('\r\n') + '\r\n', 'matriz_' + R.method + '.csv', 'text/csv;charset=utf-8');
  });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 5 && state.data && (S.dirty || !state.matrix)) run(); });
document.addEventListener('langchange', () => { if (state.data) { paintControls(); if (state.matrix) paintAll(); } });
document.addEventListener('fmtchange', () => { if (state.matrix) paintAll(); });
document.addEventListener('palettechange', () => { if (state.matrix) paintMatrix(); });
document.addEventListener('themechange', () => { if (state.matrix && state.matrix.p > SVG_MAX) paintMatrix(); });
window.B5 = { state: S };
})();
