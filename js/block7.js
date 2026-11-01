/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 7, partial, multiple and set correlation: the
   partial and semipartial of a pair given a set Z (with the added-variable
   plot and the partial distance correlation), the multiple correlation of Y
   with several X, the canonical correlation of two sets with its four tests
   and the circle of loadings, and RV, Procrustes and Mantel between the two
   sets. The result goes to state.partial. */
(function () {
'use strict';
const NUM = ['continuous', 'ordinal'];
const S = { x: null, y: null, z: [], my: null, mx: [], A: [], B: [], dirty: true };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
function cands(ds) { return ds.cols.filter(c => c.role !== 'exclude' && NUM.includes(c.type)); }
const colOf = k => Array.from(Data.col(state.data, k).num);
function chips(host, list, sel, cls) {
  el(host).innerHTML = list.map(c => `<button type="button" class="chip${sel.includes(c.key) ? ' on' : ''}${cls ? ' ' + cls : ''}" data-k="${c.key}" aria-pressed="${sel.includes(c.key)}">${esc(label(c))}</button>`).join('');
}

function onData() {
  const ds = state.data;
  el('b7Empty').hidden = !!ds; el('b7Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds), keys = cs.map(c => c.key), has = k => keys.includes(k);
  if (!has(S.x)) S.x = keys[0]; if (!has(S.y) || S.y === S.x) S.y = keys[1];
  S.z = S.z.filter(has).filter(k => k !== S.x && k !== S.y); if (!S.z.length && keys.length > 2) S.z = [keys.find(k => k !== S.x && k !== S.y)];
  if (!has(S.my)) S.my = keys[0];
  S.mx = S.mx.filter(has).filter(k => k !== S.my); if (!S.mx.length) S.mx = keys.filter(k => k !== S.my).slice(0, 4);
  S.A = S.A.filter(has); S.B = S.B.filter(has).filter(k => !S.A.includes(k));
  if (S.A.length < 1 || S.B.length < 1) { const h = Math.max(1, Math.floor(keys.length / 2)); S.A = keys.slice(0, h); S.B = keys.slice(h, h * 2); }
  paintControls();
  S.dirty = true; state.partial = null;
  if (el('panel-7').classList.contains('active')) runAll();
}
function paintControls() {
  const ds = state.data, cs = cands(ds), o = cs.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
  ['b7X', 'b7Y', 'b7MY'].forEach(id => { el(id).innerHTML = o; });
  el('b7X').value = S.x; el('b7Y').value = S.y; el('b7MY').value = S.my;
  chips('b7Z', cs.filter(c => c.key !== S.x && c.key !== S.y), S.z);
  chips('b7MX', cs.filter(c => c.key !== S.my), S.mx);
  chips('b7A', cs.filter(c => !S.B.includes(c.key)), S.A, 'ca');
  chips('b7B', cs.filter(c => !S.A.includes(c.key)), S.B, 'cb');
}
function runAll() { runPartial(); runMultiple(); runSets(); S.dirty = false; refreshStepMarks(); }

/* ---------------- partial ---------------- */
function runPartial() {
  const ds = state.data, m = el('b7Method').value;
  clearMessages('b7PMsgs');
  if (S.x === S.y) { showMessage('b7PMsgs', 'warn', L2('Elige dos variables distintas.', 'Pick two different variables.')); return; }
  const x = colOf(S.x), y = colOf(S.y), Z = S.z.map(colOf);
  const R = Part.partial(x, y, Z, { method: m });
  state.partial = Object.assign(state.partial || {}, { pair: R });
  if (R.singular) { showMessage('b7PMsgs', 'error', L2('La matriz es singular: alguna variable de Z es combinación de las otras.', 'The matrix is singular: some variable in Z is a combination of the others.')); return; }
  const n = R.n, pd = Z.length && n <= 800 ? Part.pdcor(x, y, Z, { B: n <= 200 ? 999 : 199 }) : null;
  const names = S.z.map(k => label(Data.col(ds, k))), A = label(Data.col(ds, S.x)), B = label(Data.col(ds, S.y));
  statTiles('b7PTiles', [
    [T('Sin controlar', 'Without control'), fr(R.zero), `n = ${n}`],
    [T('Parcial', 'Partial'), fr(R.partial.est), `${R.partial.name} = ${Fmt.num(R.partial.stat, 2)} · ${pTxt(R.partial.p)}`, R.partial.p < 0.05 ? 'ok' : 'warn'],
    [T('Semiparcial (Z fuera de Y)', 'Semipartial (Z out of Y)'), fr(R.semi.est), pTxt(R.semi.p)],
    Z.length ? [T('dCor parcial', 'Partial dCor'), pd ? fr(pd.est) : '—', pd ? `${pTxt(pd.p)} (B = ${pd.B})` : T('hasta n = 800', 'up to n = 800')] : null,
    [T('Controles', 'Controls'), `${R.k}`, T(`gl = ${n - 2 - R.k}`, `df = ${n - 2 - R.k}`)],
  ]);
  const cols = R.cols, ex = Part.residuals(cols[0], cols.slice(2)), ey = Part.residuals(cols[1], cols.slice(2));
  el('b7Raw').innerHTML = Plot.scatter({ x: cols[0], y: cols[1], w: 380, h: 320, legend: false, xlab: A, ylab: B, plot: 'b7-raw', clip: 'b7r', fit: 'ols', r: n > 300 ? 2 : 3 });
  el('b7Av').innerHTML = Plot.scatter({ x: ex, y: ey, w: 380, h: 320, legend: false, xlab: T(`${A} | Z (residuo)`, `${A} | Z (residual)`), ylab: T(`${B} | Z (residuo)`, `${B} | Z (residual)`), plot: 'b7-av', clip: 'b7a', fit: 'ols', r: n > 300 ? 2 : 3 });
  const change = R.partial.est - R.zero;
  /* «a, b y c» */
  const zs = !names.length ? T('nada', 'nothing') : names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + T(' y ', ' and ') + names[names.length - 1];
  let txt;
  if (!Z.length) txt = ['Sin variables de control la parcial es la correlación de siempre.', 'Without control variables the partial is the usual correlation.'];
  else if (Math.abs(R.partial.est) < Math.abs(R.zero) * 0.5) txt = [`Al controlar por ${zs}, la relación se reduce a menos de la mitad (${fr(R.zero)} → ${fr(R.partial.est)}): buena parte de lo que X e Y comparten pasa por Z. Si Z es causa común de las dos, la correlación original era en buena medida espuria; si Z media entre ellas, la parcial mide el efecto directo.`, `Controlling for ${zs}, the relation drops to less than half (${fr(R.zero)} → ${fr(R.partial.est)}): much of what X and Y share goes through Z. If Z is a common cause of both, the original correlation was largely spurious; if Z mediates between them, the partial measures the direct effect.`];
  else if (Math.sign(R.partial.est) !== Math.sign(R.zero) && Math.abs(R.partial.est) > 0.1) txt = [`Al controlar por ${zs}, la relación cambia de signo (${fr(R.zero)} → ${fr(R.partial.est)}): un efecto de supresión.`, `Controlling for ${zs}, the relation changes sign (${fr(R.zero)} → ${fr(R.partial.est)}): a suppression effect.`];
  else if (Math.abs(R.partial.est) > Math.abs(R.zero) + 0.1) txt = [`Al controlar por ${zs}, la relación crece (${fr(R.zero)} → ${fr(R.partial.est)}): Z ocultaba parte de ella (supresión).`, `Controlling for ${zs}, the relation grows (${fr(R.zero)} → ${fr(R.partial.est)}): Z was hiding part of it (suppression).`];
  else txt = [`Controlar por ${zs} cambia poco la relación (${fr(R.zero)} → ${fr(R.partial.est)}, diferencia ${Fmt.num(change, 3)}).`, `Controlling for ${zs} changes the relation little (${fr(R.zero)} → ${fr(R.partial.est)}, difference ${Fmt.num(change, 3)}).`];
  el('b7PText').innerHTML = `<p>${L2(esc(txt[0]), esc(txt[1]))}</p><p class="hint">${L2('La parcial no decide la causalidad: depende de si Z es causa común, mediador o consecuencia de las dos (un colisionador), y controlar por un colisionador crea correlaciones que no existen.', 'The partial does not decide causality: it depends on whether Z is a common cause, a mediator or a consequence of both (a collider), and controlling for a collider creates correlations that do not exist.')}</p>`;
}

/* ---------------- multiple ---------------- */
function runMultiple() {
  const ds = state.data;
  if (!S.mx.length) { el('b7MTiles').innerHTML = `<p class="hint">${L2('Elige al menos un predictor.', 'Pick at least one predictor.')}</p>`; el('b7MTable').innerHTML = ''; el('b7MBar').innerHTML = ''; return; }
  const M = Part.multiple(colOf(S.my), S.mx.map(colOf));
  state.partial = Object.assign(state.partial || {}, { multiple: M });
  statTiles('b7MTiles', [
    ['<span class="nc">R</span>', fr(M.R), `n = ${M.n}`],
    ['<span class="nc">R²</span>', fr(M.R2), T(`ajustada ${fr(M.adj)}`, `adjusted ${fr(M.adj)}`)],
    ['F', Fmt.num(M.F, 2), `${T('gl', 'df')} ${M.df1}, ${M.df2} · ${pTxt(M.p)}`, M.p < 0.05 ? 'ok' : 'warn'],
    [T('Compartido', 'Shared'), fr(M.shared), T('la parte de R² que no es de nadie en particular', 'the part of R² that belongs to no one in particular')],
  ]);
  const names = S.mx.map(k => label(Data.col(ds, k)));
  el('b7MTable').innerHTML = `<table><thead><tr><th>${L2('Predictor', 'Predictor')}</th><th class="num">r</th><th class="num">β</th><th class="num">t</th><th class="num">p</th><th class="num">sr²</th><th class="num">${L2('estructura', 'structure')}</th></tr></thead><tbody>` +
    names.map((nm, j) => `<tr><td class="pair-n">${esc(nm)}</td><td class="num">${fr(M.zero[j])}</td><td class="num">${fr(M.beta[j])}</td><td class="num">${Fmt.num(M.coef[j].t, 2)}</td><td class="num ${M.coef[j].p < 0.05 ? 'ok-t' : ''}">${Fmt.pValue(M.coef[j].p)}</td><td class="num">${fr(M.unique[j])}</td><td class="num">${fr(M.structure[j])}</td></tr>`).join('') + '</tbody></table>';
  const rows = names.map((nm, j) => ({ label: short(nm, 26), est: Math.max(0, M.unique[j]), lo: NaN, hi: NaN, fam: 'rank' })).concat([{ label: T('compartido', 'shared'), est: Math.max(0, M.shared), lo: NaN, hi: NaN, fam: 'dep' }, { label: 'R²', est: M.R2, lo: NaN, hi: NaN, fam: 'lin', main: true }]);
  el('b7MBar').innerHTML = Plot.forest({ rows, w: 420, xlim: [0, 1], plot: 'b7-r2', labelWidth: 170, xlab: T('Fracción de la varianza de Y', 'Fraction of the variance of Y') });
}

/* ---------------- sets ---------------- */
function runSets() {
  const ds = state.data;
  clearMessages('b7CMsgs');
  if (!S.A.length || !S.B.length) { showMessage('b7CMsgs', 'warn', L2('Elige al menos una variable en cada conjunto.', 'Pick at least one variable in each set.')); return; }
  const Xs = S.A.map(colOf), Ys = S.B.map(colOf), n0 = state.data.n;
  if (S.A.length + S.B.length >= n0) { showMessage('b7CMsgs', 'error', L2('Hay más variables que filas: la canónica no está definida (usa RV).', 'There are more variables than rows: the canonical correlation is undefined (use RV).')); }
  const C = S.A.length + S.B.length < n0 ? Part.canonical(Xs, Ys) : null;
  const big = n0 > 300;
  const rv = Part.rv(Xs, Ys, { scale: true, B: big ? 199 : 999 }), pr = Part.procrustes(Xs, Ys, { B: big ? 99 : 999 }), mt = n0 <= 400 ? Part.mantel(Xs, Ys, { B: big ? 199 : 999 }) : null;
  const co = Part.coinertia(Xs, Ys);
  state.partial = Object.assign(state.partial || {}, { canonical: C, rv, procrustes: pr, mantel: mt, coinertia: co });
  if (C) {
    const pv = (t, k) => `${Fmt.num(t.stat, 3)} · F = ${Fmt.num(t.F, 2)} · ${pTxt(t.p)}`;
    el('b7CTable').innerHTML = `<table><thead><tr><th>${L2('Dimensión', 'Dimension')}</th><th class="num">${L2('ρ canónica', 'canonical ρ')}</th><th>${L2('Wilks (Rao)', 'Wilks (Rao)')}</th><th>Hotelling–Lawley</th><th>Pillai–Bartlett</th></tr></thead><tbody>` +
      C.rho.map((r, k) => `<tr><td>${k + 1}${C.rho.length > 1 ? ` <span class="cmut">${L2(`(${k + 1} a ${C.rho.length})`, `(${k + 1} to ${C.rho.length})`)}</span>` : ''}</td><td class="num"><b>${fr(r)}</b></td><td>${pv(C.tests[k].wilks)}</td><td>${pv(C.tests[k].hotelling)}</td><td>${pv(C.tests[k].pillai)}</td></tr>`).join('') +
      `</tbody></table><p class="hint">${L2(`Mayor raíz de Roy: ${Fmt.num(C.roy.stat, 3)}, F = ${Fmt.num(C.roy.F, 2)}, ${pTxt(C.roy.p)} (una cota superior). Cada fila prueba si las dimensiones desde esa hasta la última son cero.`, `Roy’s largest root: ${Fmt.num(C.roy.stat, 3)}, F = ${Fmt.num(C.roy.F, 2)}, ${pTxt(C.roy.p)} (an upper bound). Each row tests whether the dimensions from that one to the last are zero.`)}</p>`;
    el('b7CSc').innerHTML = Plot.scatter({ x: C.scores[0].x, y: C.scores[0].y, w: 380, h: 320, legend: false, xlab: T('Variable canónica 1 de A', 'Canonical variate 1 of A'), ylab: T('Variable canónica 1 de B', 'Canonical variate 1 of B'), plot: 'b7-cv', clip: 'b7c', fit: 'ols', r: C.n > 300 ? 2 : 3 });
    el('b7Circ').innerHTML = circle(C, S.A.map(k => label(Data.col(ds, k))), S.B.map(k => label(Data.col(ds, k))));
  } else { el('b7CTable').innerHTML = ''; el('b7CSc').innerHTML = ''; el('b7Circ').innerHTML = ''; }
  statTiles('b7STiles', [
    ['RV', fr(rv.rv), `${pTxt(rv.p)} · ${T('esperado sin relación', 'expected with no relation')} ${fr(rv.mean)}`, rv.p < 0.05 ? 'ok' : 'warn'],
    ['Procrustes', fr(pr.r), `m² = ${Fmt.num(pr.m2, 3)} · ${pTxt(pr.p)}`, pr.p < 0.05 ? 'ok' : 'warn'],
    mt ? ['Mantel', fr(mt.r), pTxt(mt.p), mt.p < 0.05 ? 'ok' : 'warn'] : ['Mantel', '—', T('hasta n = 400', 'up to n = 400')],
    [T('Coinercia', 'Co-inertia'), Fmt.num(100 * co.pct[0], 1) + ' %', T(`de la coinercia en el eje 1 · r de sus puntuaciones ${fr(co.rAxes[0])}`, `of the co-inertia on axis 1 · r of its scores ${fr(co.rAxes[0])}`)],
  ]);
  if (rv.reps) el('b7Rv').innerHTML = Plot.distribution({ reps: rv.reps, w: 720, h: 230, plot: 'b7-rvperm', xlab: T('RV con las filas de B barajadas', 'RV with the rows of B shuffled'), ylab: T('Frecuencia', 'Frequency'), marks: [{ v: rv.rv, cls: 'pl-mark', label: 'RV = ' + Fmt.bounded(rv.rv, 2) }, { v: rv.mean, cls: 'pl-mark2' }], tail: { test: v => v >= rv.rv }, xlim: [0, Math.max(rv.rv, ...rv.reps) * 1.08] });
}
/* the circle of correlations: each variable at its structure correlations with the first two canonical variates of its set */
function circle(C, na, nb) {
  /* the radius leaves room for the labels of the variables near ±1 */
  const W = 380, H = 340, cx = W / 2, cy = 166, R = 128, d2 = C.rho.length > 1;
  let s = Plot.open(W, H, { plot: 'b7-circle' }, null, T('Círculo de correlaciones', 'Circle of correlations'));
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="pl-cbtick" stroke="var(--fig-axis)"/><circle cx="${cx}" cy="${cy}" r="${R / 2}" fill="none" stroke="var(--fig-grid)"/>`;
  s += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--fig-grid)"/><line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--fig-grid)"/>`;
  const draw = (L, names, cls) => L.forEach((row, i) => {
    const a = row[0], b = d2 ? row[1] : 0, X = cx + a * R, Y = cy - b * R;
    /* the label goes outward, pulled back inside the figure when it would leave it (10 px bold: about 6.2 px a character) */
    const t = short(names[i], 18), w = 6.2 * t.length, right = a >= 0;
    const tx = right ? Math.min(X + 6, W - 2 - w) : Math.max(X - 6, 2 + w);
    s += `<line x1="${cx}" y1="${cy}" x2="${X.toFixed(1)}" y2="${Y.toFixed(1)}" class="${cls}"/><circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="3.5" class="${cls}-d"/><text class="pl-ringlab ${cls}-t" x="${tx.toFixed(1)}" y="${(Y - 5).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}">${esc(t)}</text>`;
  });
  draw(C.loadX, na, 'b7-la'); draw(C.loadY, nb, 'b7-lb');
  s += `<text class="pl-cbtext" x="${cx + R - 4}" y="${cy + 14}" text-anchor="end">${esc(T('dim. 1', 'dim. 1'))}</text>${d2 ? `<text class="pl-cbtext" x="${cx + 6}" y="${cy - R + 12}">${esc(T('dim. 2', 'dim. 2'))}</text>` : ''}`;
  return s + '</svg>';
}

/* ---------------- wiring ---------------- */
function toggle(list, k, keepOne) { const i = list.indexOf(k); if (i >= 0) { if (!(keepOne && list.length <= 1)) list.splice(i, 1); } else list.push(k); }
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-7')) return;
  el('b7Swiss').addEventListener('click', () => { B2.loadExample('swiss'); goStep(7); });
  ['b7X', 'b7Y'].forEach(id => el(id).addEventListener('change', () => { S.x = el('b7X').value; S.y = el('b7Y').value; S.z = S.z.filter(k => k !== S.x && k !== S.y); paintControls(); runPartial(); }));
  el('b7Method').addEventListener('change', runPartial);
  el('b7Z').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; toggle(S.z, b.dataset.k); paintControls(); runPartial(); });
  el('b7MY').addEventListener('change', () => { S.my = el('b7MY').value; S.mx = S.mx.filter(k => k !== S.my); paintControls(); runMultiple(); });
  el('b7MX').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; toggle(S.mx, b.dataset.k); paintControls(); runMultiple(); });
  el('b7A').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; toggle(S.A, b.dataset.k, true); paintControls(); runSets(); });
  el('b7B').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; toggle(S.B, b.dataset.k, true); paintControls(); runSets(); });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 7 && state.data && (S.dirty || !state.partial)) runAll(); });
document.addEventListener('langchange', () => { if (state.data) { paintControls(); if (state.partial) runAll(); } });
document.addEventListener('fmtchange', () => { if (state.partial) runAll(); });
window.B7 = { state: S };
})();
