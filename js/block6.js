/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 6, nonlinear dependence and copulas: every measure
   of dependence for one pair on the same scale, MIC's characteristic matrix,
   the sweep of all pairs for what Pearson misses, and five copula families
   fitted with their tails. The result goes to state.nonlin. */
(function () {
'use strict';
const NUM = ['continuous', 'ordinal'];
const S = { pair: null, dirty: true, sweep: null };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
function cands(ds) { return ds.cols.filter(c => c.role !== 'exclude' && NUM.includes(c.type)); }

function onData() {
  const ds = state.data;
  el('b6Empty').hidden = !!ds; el('b6Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds);
  if (!S.pair || !cs.some(c => c.key === S.pair[0]) || !cs.some(c => c.key === S.pair[1])) S.pair = cs.length > 1 ? [cs[0].key, cs[1].key] : null;
  const o = cs.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
  el('b6X').innerHTML = o; el('b6Y').innerHTML = o;
  if (S.pair) { el('b6X').value = S.pair[0]; el('b6Y').value = S.pair[1]; }
  S.dirty = true; S.sweep = null; state.nonlin = null;
  el('b6Gallery').innerHTML = ''; el('b6Sweep').innerHTML = '';
  if (el('panel-6').classList.contains('active')) run();
}

/* ---------------- one pair ---------------- */
function compute() {
  const ds = state.data, [kx, ky] = S.pair, pr = Data.pairFor(ds, kx, ky), x = pr.x, y = pr.y, n = pr.n;
  const R = { kx, ky, n, x, y };
  if (n < 10) { R.few = true; return R; }
  R.pearson = Coef.pearson(x, y); R.spearman = Coef.spearman(x, y); R.kendall = Coef.kendall(x, y);
  R.dcor = n <= 3000 ? Coef.dcor(x, y) : null;
  R.xiXY = Coef.xi(x, y); R.xiYX = Coef.xi(y, x);
  R.hoeff = n <= 3000 ? Coef.hoeffding(x, y) : null;
  R.taustar = n <= 80 ? Coef.tauStar(x, y) : null;
  R.hsic = n <= 1500 ? NL.hsic(x, y) : null;
  R.mic = n <= 1200 ? NL.mic(x, y) : null;
  const B = +el('b6Perm').value;
  if (R.mic && B > 0) {
    const rnd = Num.rng(17), yp = y.slice();
    let ge = 0;
    for (let b = 0; b < B; b++) { rnd.shuffle(yp); if (NL.mic(x, yp).est >= R.mic.est - 1e-12) ge++; }
    R.mic.pPerm = (ge + 1) / (B + 1); R.mic.B = B;
  }
  R.mi = n <= 3000 ? NL.mutualInfo(x, y, { k: 5 }) : null;
  R.max = NL.maximal(x, y);
  R.cop = NL.fitCopulas(x, y);
  return R;
}
function run() {
  if (!state.data || !S.pair) return;
  clearMessages('b6Msgs');
  if (S.pair[0] === S.pair[1]) { showMessage('b6Msgs', 'warn', L2('Elige dos variables distintas.', 'Pick two different variables.')); return; }
  const n = state.data.n, B = +el('b6Perm').value;
  const w = (n > 250 || B > 0) && window.LABG ? LABG.work({ title: T('Midiendo la dependencia…', 'Measuring the dependence…'), message: T('Diez medidas, MIC y cinco cópulas', 'Ten measures, MIC and five copulas'), delay: 200 }) : null;
  const go = () => { state.nonlin = compute(); S.dirty = false; paintPair(); refreshStepMarks(); };
  if (w) cpAfterPaint(go, w); else { try { go(); } catch (e) { console.error(e); showMessage('b6Msgs', 'error', esc(e.message)); } }
}
function paintPair() {
  const R = state.nonlin, ds = state.data;
  if (!R) return;
  if (R.few) { showMessage('b6Msgs', 'warn', L2('Hacen falta al menos 10 pares completos.', 'At least 10 complete pairs are needed.')); return; }
  const A = label(Data.col(ds, R.kx)), Bn = label(Data.col(ds, R.ky)), fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
  statTiles('b6Tiles', [
    ['<span class="nc">r</span>', fr(R.pearson.est), pTxt(R.pearson.p)],
    ['<span class="nc">ρ</span>', fr(R.spearman.est), pTxt(R.spearman.p)],
    ['<span class="nc">dCor</span>', R.dcor ? fr(R.dcor.est) : '—', R.dcor ? pTxt(R.dcor.p) : T('n > 3000', 'n > 3000'), R.dcor && R.dcor.p < 0.05 ? 'ok' : ''],
    ['<span class="nc">ξ(X→Y) · ξ(Y→X)</span>', `${fr(R.xiXY.est)} · ${fr(R.xiYX.est)}`, `${pTxt(R.xiXY.p)} · ${pTxt(R.xiYX.p)}`],
    ['<span class="nc">HSIC</span>', R.hsic ? Fmt.num(R.hsic.est, 4) : '—', R.hsic ? pTxt(R.hsic.p) + T(' (gamma)', ' (gamma)') : '', R.hsic && R.hsic.p < 0.05 ? 'ok' : ''],
    ['<span class="nc">MIC</span>', R.mic ? fr(R.mic.est) : '—', R.mic && R.mic.pPerm != null ? pTxt(R.mic.pPerm) + ` (B = ${R.mic.B})` : R.mic ? T(`rejilla ${R.mic.at[0]} × ${R.mic.at[1]}`, `grid ${R.mic.at[0]} × ${R.mic.at[1]}`) : T('n > 1200', 'n > 1200')],
    [T('Información mutua', 'Mutual information'), R.mi ? Fmt.num(R.mi.est, 3) + ' nats' : '—', R.mi ? T(`Linfoot ${fr(R.mi.linfoot)}`, `Linfoot ${fr(R.mi.linfoot)}`) : ''],
    [T('Correlación máxima', 'Maximal correlation'), fr(R.max.est), T(`${R.max.classes[0]} × ${R.max.classes[1]} clases`, `${R.max.classes[0]} × ${R.max.classes[1]} classes`)],
    ['<span class="nc">D</span> · <span class="nc">τ*</span>', `${R.hoeff ? Fmt.num(R.hoeff.est, 3) : '—'} · ${R.taustar ? Fmt.num(R.taustar.est, 3) : '—'}`, R.taustar ? '' : T('τ* hasta n = 80', 'τ* up to n = 80')],
  ]);
  const lw = Assume.lowess(R.x, R.y, { delta: 0.01 * (Math.max(...R.x) - Math.min(...R.x)) });
  el('b6Sc').innerHTML = Plot.scatter({ x: R.x, y: R.y, w: 400, h: 330, legend: false, xlab: A, ylab: Bn, plot: 'b6-pair', clip: 'b6sc', fit: 'ols', smooth: lw, r: R.n > 300 ? 2 : 3 });
  const rows = [
    ['|r| (Pearson)', Math.abs(R.pearson.est), 'lin'], ['|ρ| (Spearman)', Math.abs(R.spearman.est), 'rank'], ['|τ| (Kendall)', Math.abs(R.kendall.est), 'rank'],
    ['dCor', R.dcor ? R.dcor.est : NaN, 'dep'], ['ξ (X → Y)', R.xiXY.est, 'dep'], ['ξ (Y → X)', R.xiYX.est, 'dep'], ['MIC', R.mic ? R.mic.est : NaN, 'dep'],
    [T('Linfoot (información mutua)', 'Linfoot (mutual information)'), R.mi ? R.mi.linfoot : NaN, 'dep'], [T('Correlación máxima', 'Maximal correlation'), R.max.est, 'rob'],
  ].map(([lbl, est, fam]) => ({ label: lbl, est, lo: NaN, hi: NaN, fam }));
  el('b6Bars').innerHTML = Plot.forest({ rows, w: 460, xlim: [0, 1], plot: 'b6-measures', labelWidth: 190, xlab: T('Valor (0 = independencia)', 'Value (0 = independence)'), label: T('Medidas de dependencia', 'Dependence measures') });
  paintMicMatrix(R);
  const gap = (R.dcor ? R.dcor.est : R.xiXY.est) - Math.abs(R.pearson.est);
  const asym = Math.abs(R.xiXY.est - R.xiYX.est);
  const parts = [];
  parts.push(gap > 0.2 ? [`La correlación de distancias supera a |r| en ${Fmt.bounded(gap, 2)}: hay dependencia que una recta no capta.`, `The distance correlation exceeds |r| by ${Fmt.bounded(gap, 2)}: there is dependence a line does not capture.`]
    : [`Las medidas no lineales no ven mucho más que |r| (diferencia ${Fmt.bounded(gap, 2)}): casi toda la dependencia que detectan la capta también una recta.`, `The nonlinear measures do not see much more than |r| (difference ${Fmt.bounded(gap, 2)}): nearly all the dependence they detect is also captured by a line.`]);
  if (asym > 0.15) parts.push([`ξ es asimétrica: ${R.xiXY.est > R.xiYX.est ? 'Y depende de X más que X de Y' : 'X depende de Y más que Y de X'} (${fr(R.xiXY.est)} frente a ${fr(R.xiYX.est)}); por ejemplo, en una parábola Y es función de X pero no al revés.`, `ξ is asymmetric: ${R.xiXY.est > R.xiYX.est ? 'Y depends on X more than X on Y' : 'X depends on Y more than Y on X'} (${fr(R.xiXY.est)} against ${fr(R.xiYX.est)}); in a parabola, for instance, Y is a function of X but not the reverse.`]);
  if (R.mic) parts.push([`MIC = ${fr(R.mic.est)} y r² = ${fr(R.pearson.est ** 2)}: su diferencia (${fr(R.mic.est - R.pearson.est ** 2)}) es el índice de no linealidad de Reshef et al. (2011).`, `MIC = ${fr(R.mic.est)} and r² = ${fr(R.pearson.est ** 2)}: their difference (${fr(R.mic.est - R.pearson.est ** 2)}) is the nonlinearity index of Reshef et al. (2011).`]);
  el('b6Text').innerHTML = parts.map(p => `<p>${L2(esc(p[0]), esc(p[1]))}</p>`).join('');
  paintCopulas(R, A, Bn);
}
/* the characteristic matrix as a heat map: grid columns × rows, colour = normalized information */
function paintMicMatrix(R) {
  if (!R.mic) { el('b6Mic').innerHTML = `<p class="hint" style="padding:12px">${L2('MIC se calcula hasta n = 1200.', 'MIC is computed up to n = 1200.')}</p>`; return; }
  const M = R.mic.M, keys = Object.keys(M).map(k => k.split(',').map(Number));
  const X = Math.max(...keys.map(k => k[0])), Y = Math.max(...keys.map(k => k[1]));
  /* with few data the only grid allowed (n^0.6 cells at most) is 2 × 2: a matrix of one cell says nothing */
  if (keys.length < 2) { el('b6Mic').innerHTML = `<p class="hint" style="padding:12px">${L2(`Con n = ${R.n}, la única rejilla que admite MIC es de ${X} × ${Y}: la matriz característica tiene una sola celda y MIC dice poco. Con unos 50 datos ya hay rejillas de hasta 10 celdas.`, `With n = ${R.n}, the only grid MIC allows is ${X} × ${Y}: the characteristic matrix has a single cell and MIC says little. With about 50 data there are already grids of up to 10 cells.`)}</p>`; return; }
  const W = 420, H = 300, m = { l: 52, r: 70, t: 12, b: 44 }, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const cw = (x1 - x0) / (X - 1), ch = (y0 - y1) / (Y - 1);
  let s = Plot.open(W, H, { plot: 'b6-mic' }, null, T('Matriz característica de MIC', 'Characteristic matrix of MIC'));
  keys.forEach(([a, b]) => {
    const v = M[a + ',' + b];
    const col = Pal.color('maiz', Math.max(0, Math.min(1, v)));
    const on = R.mic.at && R.mic.at[0] === a && R.mic.at[1] === b;
    s += `<rect x="${(x0 + (a - 2) * cw).toFixed(1)}" y="${(y0 - (b - 1) * ch).toFixed(1)}" width="${(cw - 0.6).toFixed(1)}" height="${(ch - 0.6).toFixed(1)}" fill="${col}"${on ? ' stroke="var(--primary)" stroke-width="2.4"' : ''}><title>${a} × ${b}: ${v.toFixed(3)}</title></rect>`;
  });
  s += `<text class="pl-lab" x="${(x0 + x1) / 2}" y="${y0 + 32}" text-anchor="middle">${esc(T('Columnas de la rejilla', 'Grid columns'))}</text><text class="pl-lab" transform="translate(${x0 - 34} ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${esc(T('Filas', 'Rows'))}</text>`;
  [2, Math.round((2 + X) / 2), X].forEach(a => { s += `<text class="pl-cbtext" x="${(x0 + (a - 1.5) * cw).toFixed(1)}" y="${y0 + 14}" text-anchor="middle">${a}</text>`; });
  [2, Math.round((2 + Y) / 2), Y].forEach(b => { s += `<text class="pl-cbtext" x="${x0 - 6}" y="${(y0 - (b - 1.5) * ch + 3).toFixed(1)}" text-anchor="end">${b}</text>`; });
  for (let i = 0; i <= 20; i++) { const v = 1 - i / 20; s += `<rect x="${x1 + 16}" y="${(y1 + i * (y0 - y1) / 20).toFixed(1)}" width="12" height="${((y0 - y1) / 20 + 0.5).toFixed(1)}" fill="${Pal.color('maiz', v)}"/>`; }
  s += `<text class="pl-cbtext" x="${x1 + 32}" y="${y1 + 8}">1</text><text class="pl-cbtext" x="${x1 + 32}" y="${y0}">0</text>`;
  el('b6Mic').innerHTML = s + '</svg>';
}
function paintCopulas(R, A, Bn) {
  const C = R.cop, best = C.best;
  el('b6CopTable').innerHTML = `<table><thead><tr><th>${L2('Familia', 'Family')}</th><th class="num">${L2('θ por τ', 'θ from τ')}</th><th class="num">${L2('θ (MPV)', 'θ (MPL)')}</th><th class="num">${L2('log-verosimilitud', 'log-likelihood')}</th><th class="num">AIC</th><th class="num">λ<sub>${L2('inf', 'low')}</sub></th><th class="num">λ<sub>${L2('sup', 'up')}</sub></th></tr></thead><tbody>` +
    C.fits.map(f => f.skip ? `<tr><td>${L2(f.es, f.en)}</td><td colspan="6" class="cmut">${L2('sólo para dependencia positiva', 'only for positive dependence')}</td></tr>`
      : `<tr class="${f === best ? 'sel' : ''}"><td><b>${L2(f.es, f.en)}</b>${f === best ? ` <span class="pill ok">${L2('menor AIC', 'lowest AIC')}</span>` : ''}</td><td class="num">${Fmt.num(f.itau, 3)}</td><td class="num">${Fmt.num(f.theta, 3)}${f.nu ? ` <span class="cmut">ν = ${Fmt.num(f.nu, 1)}</span>` : ''}</td><td class="num">${Fmt.num(f.ll, 2)}</td><td class="num">${Fmt.num(f.aic, 2)}</td><td class="num">${Fmt.num(f.lower, 3)}</td><td class="num">${Fmt.num(f.upper, 3)}</td></tr>`).join('') + '</tbody></table>';
  el('b6U').innerHTML = Plot.scatter({ x: C.u, y: C.v, w: 380, h: 330, legend: false, xlim: [0, 1], ylim: [0, 1], xlab: T(`Rango de ${A} / (n + 1)`, `Rank of ${A} / (n + 1)`), ylab: T(`Rango de ${Bn} / (n + 1)`, `Rank of ${Bn} / (n + 1)`), plot: 'b6-pseudo', clip: 'b6u', r: R.n > 300 ? 1.8 : 2.6 });
  const sim = NL.sample(best, Math.max(300, R.n), 11);
  el('b6SimTitle').innerHTML = L2(`Una muestra de la cópula ${esc(best.es)} ajustada`, `A sample from the fitted ${esc(best.en)} copula`);
  el('b6Sim').innerHTML = Plot.scatter({ x: sim.u, y: sim.v, w: 380, h: 330, legend: false, xlim: [0, 1], ylim: [0, 1], xlab: 'u', ylab: 'v', plot: 'b6-sim', clip: 'b6s', r: 1.8 });
  statTiles('b6TailTiles', [
    [T('Cola inferior empírica', 'Empirical lower tail'), Fmt.bounded(C.empirical.lower, 2), T('P(V ≤ 0.1 | U ≤ 0.1)', 'P(V ≤ 0.1 | U ≤ 0.1)')],
    [T('Cola superior empírica', 'Empirical upper tail'), Fmt.bounded(C.empirical.upper, 2), T('P(V > 0.9 | U > 0.9)', 'P(V > 0.9 | U > 0.9)')],
    [T('Si fueran independientes', 'If they were independent'), Fmt.bounded(0.1, 2), T('las dos probabilidades valdrían 0.1', 'both probabilities would be 0.1')],
    [T('τ de Kendall', 'Kendall’s τ'), Fmt.bounded(C.tau, 3), T('el que fija cada familia', 'what fixes each family')],
  ]);
}

/* ---------------- the sweep ---------------- */
function miniScatter(x, y) {
  const W = 150, H = 110, ex = Plot.extent(x), ey = Plot.extent(y), sx = Plot.scale(ex[0], ex[1], 4, W - 4), sy = Plot.scale(ey[0], ey[1], H - 4, 4);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="pl pl-mini" role="img"><rect class="pl-bg" width="${W}" height="${H}"/><g class="pl-pts">`;
  const step = Math.max(1, Math.floor(x.length / 400));
  for (let i = 0; i < x.length; i += step) s += `<circle cx="${sx(x[i]).toFixed(1)}" cy="${sy(y[i]).toFixed(1)}" r="1.6"/>`;
  return s + '</g></svg>';
}
function runSweep() {
  const ds = state.data, cs = cands(ds).slice(0, 30), withMic = el('b6SweepMic').checked;
  if (cs.length < 2) return;
  const w = window.LABG ? LABG.work({ title: T('Rastreando todos los pares…', 'Sweeping every pair…'), message: T(`${cs.length * (cs.length - 1) / 2} pares`, `${cs.length * (cs.length - 1) / 2} pairs`), delay: 200 }) : null;
  const go = () => {
    const cols = cs.map(c => Array.from(Data.col(ds, c.key).num)), names = cs.map(c => label(c));
    S.sweep = { list: NL.sweep(cols, names, { mic: withMic, progress: w ? f => w.update(f) : null }), keys: cs.map(c => c.key), mic: withMic };
    paintSweep();
  };
  if (w) cpAfterPaint(go, w); else go();
}
function paintSweep() {
  const sw = S.sweep, ds = state.data;
  if (!sw) return;
  const top = sw.list.slice(0, 6), fr = v => (isFinite(v) ? Fmt.bounded(v, 2) : '—');
  el('b6Gallery').innerHTML = top.map(p => {
    const pr = Data.pairFor(ds, sw.keys[p.i], sw.keys[p.j]);
    return `<button type="button" class="b6-card" data-i="${p.i}" data-j="${p.j}"><div class="b6-mini">${miniScatter(pr.x, pr.y)}</div><div class="b6-cap"><b>${esc(short(p.a, 18))}</b> · <b>${esc(short(p.b, 18))}</b><br><span>r ${fr(p.r)} · dCor ${fr(p.dcor)}${sw.mic ? ' · MIC ' + fr(p.mic) : ''}</span></div></button>`;
  }).join('');
  el('b6Sweep').innerHTML = `<table><thead><tr><th>${L2('Par', 'Pair')}</th><th class="num">n</th><th class="num">r</th><th class="num">ρ</th><th class="num">dCor</th><th class="num">ξ</th>${sw.mic ? '<th class="num">MIC</th><th class="num">MIC − r²</th>' : ''}<th class="num">dCor − |r|</th></tr></thead><tbody>` +
    sw.list.slice(0, 40).map(p => `<tr data-i="${p.i}" data-j="${p.j}" tabindex="0" style="cursor:pointer"><td class="pair-n">${esc(short(p.a, 22))} · ${esc(short(p.b, 22))}</td><td class="num">${p.n}</td><td class="num">${fr(p.r)}</td><td class="num">${fr(p.rho)}</td><td class="num">${fr(p.dcor)}</td><td class="num">${fr(p.xi)}</td>${sw.mic ? `<td class="num">${fr(p.mic)}</td><td class="num">${fr(p.micGap)}</td>` : ''}<td class="num ${p.gap > 0.2 ? 'warn-t' : ''}">${fr(p.gap)}</td></tr>`).join('') + '</tbody></table>' +
    (sw.list.length > 40 ? `<p class="hint">${L2(`Se muestran 40 de ${sw.list.length} pares.`, `Showing 40 of ${sw.list.length} pairs.`)}</p>` : '');
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-6')) return;
  el('b6Longley').addEventListener('click', () => { B2.loadExample('longley'); goStep(6); });
  ['b6X', 'b6Y'].forEach(id => el(id).addEventListener('change', () => { S.pair = [el('b6X').value, el('b6Y').value]; run(); }));
  el('b6Perm').addEventListener('change', run);
  el('b6SweepGo').addEventListener('click', runSweep);
  const pick = e => { const t = e.target.closest('[data-i]'); if (!t || !S.sweep) return; S.pair = [S.sweep.keys[+t.dataset.i], S.sweep.keys[+t.dataset.j]]; el('b6X').value = S.pair[0]; el('b6Y').value = S.pair[1]; run(); el('b6X').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  el('b6Gallery').addEventListener('click', pick);
  el('b6Sweep').addEventListener('click', pick);
  el('b6Sweep').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 6 && state.data && (S.dirty || !state.nonlin)) run(); });
document.addEventListener('langchange', () => { if (state.nonlin) paintPair(); if (S.sweep) paintSweep(); });
document.addEventListener('fmtchange', () => { if (state.nonlin) paintPair(); if (S.sweep) paintSweep(); });
window.B6 = { setPair(kx, ky) { S.pair = [kx, ky]; if (state.data) { el('b6X').value = kx; el('b6Y').value = ky; } S.dirty = true; } };
})();
