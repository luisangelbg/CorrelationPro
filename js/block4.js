/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 4, one pair in depth: every coefficient that applies
   to two numeric variables with its own test and interval, the bootstrap
   (four intervals) and the permutation test of the main one, the Bayes
   factor of Pearson's ρ with its posterior, and the reading in words with
   the sentence for the report. Blocks 2 and 3 hand it a pair through
   B4.setPair; the result goes to state.pair. */
(function () {
'use strict';
const B4 = {};
const NUM = ['continuous', 'ordinal'];
const DEP = new Set(['dcor', 'xi', 'hoeffding', 'taustar']);
const S = { pair: null, coef: null, dirty: true };
const label = c => (window.B2 ? B2.label(c) : c.name);
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const pct = v => Math.round(v * 100);

function cands(ds) { return ds.cols.filter(c => c.role !== 'exclude' && NUM.includes(c.type)); }
function opts() {
  return {
    alt: el('b4Alt').value, level: +el('b4Level').value, B: +el('b4B').value,
    seed: Math.max(1, Math.round(+el('b4Seed').value || 1)), scale: el('b4Scale').value, kappa: +el('b4Kappa').value,
  };
}
/* the fast version of each coefficient for resampling: the estimate only */
const FAST = {
  pearson: (x, y) => Coef.pearson(x, y).est,
  spearman: (x, y) => Coef.spearman(x, y, { exact: false }).est,
  kendall: (x, y) => Coef.kendall(x, y, { exact: false }).est,
};
const statOf = def => FAST[def.id] || ((x, y) => def.f(x, y).est);
/* cost of one evaluation, in rough operations */
/* rough cost of one evaluation, in nanoseconds of this engine (measured: τ* with n = 47 takes ~58 ms, that is ≈ 12·n⁴) */
const costOf = (id, n) => (['dcor', 'hoeffding'].includes(id) ? n * n : id === 'taustar' ? 12 * n * n * n * n : n * Math.log2(n + 2) * 4);
/* Block 3's verdict → the main coefficient */
const VERDICT_TO = { pearson: 'pearson', spearman: 'spearman', kendallB: 'kendall', pbend: 'pbend', dcor: 'dcor', groups: 'pearson' };

/* ---------------- number formatting ---------------- */
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
function fmtBF(logv) {
  if (!isFinite(logv)) return logv > 0 ? '∞' : '0';
  const l10 = logv / Math.LN10;
  if (Math.abs(l10) < 3) return Fmt.num(Math.exp(logv), Math.exp(logv) < 10 ? 2 : 1);
  let e = Math.floor(l10), m = Math.pow(10, l10 - e);
  if (m >= 9.95) { m = 1; e += 1; }
  return Fmt.num(m, 1) + ' × 10' + String(e).split('').map(ch => SUP[ch] || ch).join('');
}
/* symbols with a subscript (r_pb, r_bw…) in text already escaped */
const subs = h => h.replace(/\br_(G|bw|pb|w)\b/g, '<i>r</i><sub>$1</sub>');
const ci2 = (a, b) => `[${isFinite(a) ? Fmt.bounded(a, 2) : '—'}, ${isFinite(b) ? Fmt.bounded(b, 2) : '—'}]`;

/* ---------------- after new data ---------------- */
function onData() {
  const ds = state.data;
  el('b4Empty').hidden = !!ds;
  el('b4Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds);
  if (!S.pair || !cs.some(c => c.key === S.pair[0]) || !cs.some(c => c.key === S.pair[1])) S.pair = cs.length > 1 ? [cs[0].key, cs[1].key] : null;
  paintSelects();
  S.dirty = true;
  state.pair = null;
  if (el('panel-4').classList.contains('active')) run();
}
function paintSelects() {
  const ds = state.data, cs = cands(ds);
  const o = cs.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
  el('b4X').innerHTML = o; el('b4Y').innerHTML = o;
  if (S.pair) { el('b4X').value = S.pair[0]; el('b4Y').value = S.pair[1]; }
  el('b4Coef').innerHTML = `<option value="">${esc(T('Recomendado (Bloque 3)', 'Recommended (Block 3)'))}</option>` + Coef.PAIR.map(c => `<option value="${c.id}">${esc(T(c.es, c.en))}</option>`).join('');
  el('b4Coef').value = S.coef || '';
}
B4.setPair = function (kx, ky) {
  S.pair = [kx, ky]; S.dirty = true;
  if (state.data) paintSelects();
  if (el('panel-4') && el('panel-4').classList.contains('active')) run();
};

/* ---------------- the computation ---------------- */
function compute(w) {
  const ds = state.data, [kx, ky] = S.pair, pr = Data.pairFor(ds, kx, ky), x = pr.x, y = pr.y, n = pr.n, o = opts();
  const R = { kx, ky, n, dropped: pr.dropped, rows: pr.rows, x, y, o };
  if (n < 4) { R.few = true; return R; }
  /* every coefficient */
  /* τ* is exhaustive (n ≤ 80); distance correlation keeps n × n matrices in memory (n ≤ 3 000) */
  R.coefs = Coef.PAIR.filter(c => (c.id !== 'taustar' || n <= 80) && (c.id !== 'dcor' || n <= 3000)).map(def => {
    let res;
    try { res = def.f(x, y, { alt: o.alt, conf: o.level }); } catch (e) { res = { id: def.id, est: NaN, p: NaN, conv: [] }; }
    return { def, res };
  });
  /* the main one */
  const check = Assume.pairCheck(x, y, { ordinal: Data.col(ds, kx).type === 'ordinal' || Data.col(ds, ky).type === 'ordinal', rows: pr.rows });
  R.check = check;
  const id = S.coef || VERDICT_TO[check.verdict.id] || 'pearson';
  R.main = R.coefs.find(c => c.def.id === id) || R.coefs[0];
  R.auto = !S.coef;
  const stat = statOf(R.main.def), dep = DEP.has(R.main.def.id);
  /* resampling, scaled to what the browser can do in a few seconds */
  let B = o.B;
  const budget = 4e8, c1 = costOf(R.main.def.id, n);
  if (B * c1 * 2 > budget) { B = Math.max(c1 > 1e6 ? 99 : 199, Math.floor(budget / (2 * c1) / 100) * 100 - 1); R.reducedB = B; }
  if (w) w.message(T(`Bootstrap y permutación de ${T(R.main.def.es, R.main.def.en)} (${fmtNum(B, 0)} cada uno)…`, `Bootstrap and permutation of ${R.main.def.en} (${fmtNum(B, 0)} each)…`));
  R.boot = PairStat.bootstrap(stat, x, y, { B, seed: o.seed, level: o.level, alt: dep ? 'two.sided' : o.alt, bca: n * c1 < 2e8 });
  R.perm = PairStat.permute(stat, x, y, { B, seed: o.seed + 1, alt: dep ? 'greater' : o.alt });
  /* percentile intervals for the coefficients without an analytic one */
  R.coefs.forEach(c => {
    if (c.res.ci && isFinite(c.res.ci.lo)) return;
    if (!isFinite(c.res.est)) return;
    if (c === R.main) { c.boot = { lo: (R.boot.bca || R.boot.percentile)[0], hi: (R.boot.bca || R.boot.percentile)[1], method: R.boot.bca ? 'BCa' : T('percentil', 'percentile') }; return; }
    const Bf = 499;
    if (Bf * costOf(c.def.id, n) > 6e7) return;
    const bt = PairStat.bootstrap(statOf(c.def), x, y, { B: Bf, seed: o.seed + 7, level: o.level, alt: DEP.has(c.def.id) ? 'two.sided' : o.alt, bca: false });
    c.boot = { lo: bt.percentile[0], hi: bt.percentile[1], method: T('percentil', 'percentile') };
  });
  /* Bayes, on Pearson's r */
  const rP = R.coefs.find(c => c.def.id === 'pearson').res.est;
  R.bayes = PairStat.bayes(rP, n, { kappa: o.kappa, level: o.level });
  return R;
}
function run() {
  if (!state.data || !S.pair) return;
  clearMessages('b4Msgs');
  if (S.pair[0] === S.pair[1]) { showMessage('b4Msgs', 'warn', L2('Elige dos variables distintas.', 'Pick two different variables.')); return; }
  const n = state.data.n, heavy = n * (+el('b4B').value) > 3e5 || S.coef === 'taustar';
  const w = heavy && window.LABG ? LABG.work({ title: T('Midiendo el par…', 'Measuring the pair…'), message: T('Coeficientes, remuestreo y factor de Bayes', 'Coefficients, resampling and Bayes factor'), delay: 250 }) : null;
  const go = () => { state.pair = compute(w); S.dirty = false; paintAll(); refreshStepMarks(); };
  if (w) cpAfterPaint(go, w); else { try { go(); } catch (e) { console.error(e); showMessage('b4Msgs', 'error', esc(e.message || String(e))); } }
}

/* ---------------- painting ---------------- */
function paintAll() {
  const R = state.pair;
  if (!R) return;
  if (R.few) { showMessage('b4Msgs', 'warn', L2('Hacen falta al menos 4 pares completos.', 'At least 4 complete pairs are needed.')); return; }
  if (R.reducedB) showMessage('b4Msgs', 'warn', L2(`Este coeficiente es costoso con n = ${R.n}: se usaron ${fmtNum(R.reducedB, 0)} remuestreos.`, `This coefficient is costly with n = ${R.n}: ${fmtNum(R.reducedB, 0)} resamples were used.`));
  paintResult(); paintCloud(); paintTable(); paintResampling(); paintBayes(); paintConv();
}
function nameOf(c) { return T(c.def.es, c.def.en); }
function ciOf(c) {
  if (c.res.ci && isFinite(c.res.ci.lo)) return { lo: c.res.ci.lo, hi: c.res.ci.hi, method: c.res.ci.method === 'fisher' ? 'Fisher' : c.res.ci.method === 'fieller' ? 'Fieller' : c.res.ci.method === 'bonett' ? 'Bonett–Wright' : c.res.ci.method };
  return c.boot || null;
}
function reading(R) {
  const ds = state.data, A = label(Data.col(ds, R.kx)), Bn = label(Data.col(ds, R.ky)), o = R.o;
  const m = R.main, est = m.res.est, dep = DEP.has(m.def.id), ci = ciOf(m);
  const sz = PairStat.size(est, o.scale), sig = isFinite(m.res.p) && m.res.p < 1 - o.level;
  const sym = Fmt.symbol(m.def.id);
  const parts = [];
  if (dep) {
    /* inside a sentence the distance correlation goes in lower case, with its article */
    const es = m.def.id === 'dcor' ? 'la correlación de distancias' : m.def.es, en = m.def.id === 'dcor' ? 'the distance correlation' : m.def.en;
    parts.push([`Entre ${A} y ${Bn}, ${es} vale ${Fmt.bounded(est, 2)} en una escala de 0 (independencia) a 1.`, `Between ${A} and ${Bn}, ${en} is ${Fmt.bounded(est, 2)} on a scale from 0 (independence) to 1.`]);
  } else {
    const dir = est > 0 ? ['positiva', 'positive'] : ['negativa', 'negative'];
    parts.push([`Entre ${A} y ${Bn} hay una correlación ${dir[0]} ${sz.es} según ${PairStat.SCALES[o.scale].es} (${sym} = ${Fmt.bounded(est, 2)}${ci ? `, IC ${pct(o.level)} % ${ci2(ci.lo, ci.hi)}` : ''}).`,
      `Between ${A} and ${Bn} there is a ${sz.en} ${dir[1]} correlation by ${PairStat.SCALES[o.scale].en} (${sym} = ${Fmt.bounded(est, 2)}${ci ? `, ${pct(o.level)}% CI ${ci2(ci.lo, ci.hi)}` : ''}).`]);
  }
  const pp = R.perm.p;
  parts.push(sig
    ? [`Si no hubiera relación, un valor así de alejado de cero saldría con probabilidad ${Fmt.pValue(m.res.p)} (permutación: ${Fmt.pValue(pp)}): se rechaza la independencia al ${pct(1 - o.level)} %.`, `If there were no relation, a value this far from zero would arise with probability ${Fmt.pValue(m.res.p)} (permutation: ${Fmt.pValue(pp)}): independence is rejected at ${pct(1 - o.level)}%.`]
    : [`Un valor así saldría con probabilidad ${Fmt.pValue(m.res.p)} aunque no hubiera relación (permutación: ${Fmt.pValue(pp)}): los datos no bastan para descartar la independencia, lo que no prueba que no la haya.`, `A value like this would arise with probability ${Fmt.pValue(m.res.p)} even with no relation (permutation: ${Fmt.pValue(pp)}): the data are not enough to rule out independence, which does not prove there is none.`]);
  if (R.bayes) {
    const ev = PairStat.evidence(R.bayes.BF10);
    parts.push(ev.favours === 'h1' ? [`El factor de Bayes de la r de Pearson, ${fmtBF(R.bayes.logBF10)}, es evidencia ${ev.es} a favor de que hay correlación.`, `The Bayes factor of Pearson’s r, ${fmtBF(R.bayes.logBF10)}, is ${ev.en} evidence that there is a correlation.`]
      : ev.favours === 'h0' ? [`El factor de Bayes de la r de Pearson, ${fmtBF(R.bayes.logBF10)} (BF₀₁ = ${fmtBF(-R.bayes.logBF10)}), es evidencia ${ev.es} a favor de que no la hay.`, `The Bayes factor of Pearson’s r, ${fmtBF(R.bayes.logBF10)} (BF₀₁ = ${fmtBF(-R.bayes.logBF10)}), is ${ev.en} evidence that there is none.`]
        : ['El factor de Bayes no favorece a ninguna de las dos hipótesis.', 'The Bayes factor favors neither hypothesis.']);
  }
  if (m.def.id === 'pearson') { const r2 = est * est; parts.push([`r² = ${Fmt.bounded(r2, 2)}: en sentido lineal, las dos variables comparten el ${Math.round(100 * r2)} % de su varianza.`, `r² = ${Fmt.bounded(r2, 2)}: in a linear sense, the two variables share ${Math.round(100 * r2)}% of their variance.`]); }
  parts.push(['Una correlación describe una asociación; no dice cuál variable causa a la otra, ni si las dos dependen de una tercera.', 'A correlation describes an association; it does not say which variable causes the other, or whether both depend on a third.']);
  return parts;
}
function reportSentence(R) {
  const m = R.main, o = R.o;
  let s = Fmt.sentence(Object.assign({}, m.res, { ci: ciOf(m) ? { lo: ciOf(m).lo, hi: ciOf(m).hi, level: o.level } : null }), { lang: I18N.lang });
  s += `; ${T('p por permutación', 'permutation p')} ${Fmt.pValue(R.perm.p).startsWith('<') ? Fmt.pValue(R.perm.p) : '= ' + Fmt.pValue(R.perm.p)} (B = ${fmtNum(R.perm.B, 0)})`;
  if (R.bayes && m.def.id === 'pearson') s += `; BF₁₀ = ${fmtBF(R.bayes.logBF10)}`;
  return s;
}
function paintResult() {
  const R = state.pair, m = R.main, o = R.o, ci = ciOf(m), ev = R.bayes ? PairStat.evidence(R.bayes.BF10) : null, dep = DEP.has(m.def.id);
  const sym = Fmt.symbol(m.def.id), bc = R.boot.bca || R.boot.percentile;
  statTiles('b4Tiles', [
    [`<span class="nc">${esc(nameOf(m))}</span>`, Fmt.bounded(m.res.est, 3), dep ? T('de 0 a 1', 'from 0 to 1') : T(PairStat.size(m.res.est, o.scale).es, PairStat.size(m.res.est, o.scale).en) + (R.auto ? T(' · elegido por el Bloque 3', ' · chosen by Block 3') : ''), 'ok'],
    ci ? [T(`IC ${pct(o.level)} %`, `${pct(o.level)}% CI`), ci2(ci.lo, ci.hi), ci.method] : null,
    [T('Prueba', 'Test'), pTxt(m.res.p), m.res.stat ? `${esc(m.res.stat.name)} = ${Fmt.num(m.res.stat.value, 2)}${m.res.stat.df != null ? ` · ${T('gl', 'df')} ${Fmt.num(m.res.stat.df, Number.isInteger(m.res.stat.df) ? 0 : 1)}` : ''}` : '', isFinite(m.res.p) && m.res.p < 1 - o.level ? 'ok' : 'warn'],
    [T('Permutación', 'Permutation'), pTxt(R.perm.p), `B = ${fmtNum(R.perm.B, 0)}`, R.perm.p < 1 - o.level ? 'ok' : 'warn'],
    [R.boot.bca ? 'Bootstrap BCa' : T('Bootstrap percentil', 'Percentile bootstrap'), ci2(bc[0], bc[1]), `B = ${fmtNum(R.boot.R, 0)}`],
    ev ? ['<span class="nc">BF<sub>10</sub></span>', fmtBF(R.bayes.logBF10), T(`evidencia ${ev.es}`, `${ev.en} evidence`) + (ev.favours === 'h0' ? T(' (de ρ = 0)', ' (for ρ = 0)') : ''), ev.favours === 'h1' ? 'ok' : ev.favours === 'h0' ? 'warn' : ''] : null,
  ]);
  const notes = R.check.verdict.notes.concat(R.check.verdict.id !== VERDICT_TO_ID(m.def.id) && R.check.verdict.id !== 'pearson' ? [[`El Bloque 3 recomienda ${R.check.verdict.es} para este par: ${R.check.verdict.why[0]}`, `Block 3 recommends ${R.check.verdict.en} for this pair: ${R.check.verdict.why[1]}`]] : []);
  const here = t => t.replace(' del Bloque 4.', ' de abajo.').replace(' of Block 4.', ' below.');
  el('b4Reading').innerHTML = reading(R).map(p => `<p>${subs(L2(esc(p[0]), esc(p[1])))}</p>`).join('') + notes.map(nt => [here(nt[0]), here(nt[1])]).map(nt => `<p class="b4-note">${L2(esc(nt[0]), esc(nt[1]))}</p>`).join('');
  el('b4Report').innerHTML = subs(esc(reportSentence(R)));
  const st = (Home.STYLES || []).find ? (Home.STYLES.find(s => s.id === (Fmt.opts.style === 'nom' && Fmt.opts.decimal === ',' ? 'nomc' : Fmt.opts.style)) || null) : null;
  el('b4StyleName').textContent = st ? '· ' + T(st.es, st.en) : '';
}
function VERDICT_TO_ID(coefId) { return { pearson: 'pearson', spearman: 'spearman', kendall: 'kendallB', pbend: 'pbend', dcor: 'dcor' }[coefId] || coefId; }
function paintCloud() {
  const R = state.pair, ds = state.data, A = label(Data.col(ds, R.kx)), Bn = label(Data.col(ds, R.ky)), x = R.x, y = R.y, n = R.n;
  const lw = Assume.lowess(x, y, { delta: 0.01 * (Math.max(...x) - Math.min(...x)) });
  const rug = g => {
    let s = '<g class="pl-rug">';
    x.forEach(v => { const X = g.sx(v).toFixed(1); s += `<line x1="${X}" y1="${g.y0}" x2="${X}" y2="${g.y0 - 6}"/>`; });
    y.forEach(v => { const Y = g.sy(v).toFixed(1); s += `<line x1="${g.x0}" y1="${Y}" x2="${g.x0 + 6}" y2="${Y}"/>`; });
    return s + '</g>';
  };
  el('b4Sc').innerHTML = Plot.scatter({ x, y, w: 400, h: 340, legend: false, xlab: A, ylab: Bn, plot: 'b4-pair', clip: 'b4sc', ellipse: 0.95, fit: 'ols', smooth: lw, r: n > 300 ? 2 : 3, under: rug });
  const rx = Num.rank(x), ry = Num.rank(y);
  el('b4Rk').innerHTML = Plot.scatter({ x: Array.from(rx, v => v / (n + 1)), y: Array.from(ry, v => v / (n + 1)), w: 400, h: 340, legend: false, xlim: [0, 1], ylim: [0, 1], fit: 'ols',
    xlab: T(`Rango de ${A} / (n + 1)`, `Rank of ${A} / (n + 1)`), ylab: T(`Rango de ${Bn} / (n + 1)`, `Rank of ${Bn} / (n + 1)`), plot: 'b4-ranks', clip: 'b4rk', r: n > 300 ? 2 : 3 });
}
function paintTable() {
  const R = state.pair, o = R.o;
  let h = `<table class="b4-coefs"><thead><tr><th>${L2('Coeficiente', 'Coefficient')}</th><th class="num">${L2('Estimación', 'Estimate')}</th><th>${L2(`IC ${pct(o.level)} %`, `${pct(o.level)}% CI`)}</th><th>${L2('Prueba', 'Test')}</th><th class="num">p</th><th></th></tr></thead><tbody>`;
  R.coefs.forEach(c => {
    const ci = ciOf(c), main = c === R.main;
    h += `<tr class="${main ? 'sel' : ''}"><td class="pair-n"><b>${esc(nameOf(c))}</b>${nameOf(c).includes(Fmt.symbol(c.def.id)) ? '' : ` <span class="cmut">${Fmt.symbol(c.def.id, { html: true })}</span>`}${main ? ` <span class="pill alt">${L2('principal', 'main')}</span>` : ''}</td>` +
      `<td class="num">${isFinite(c.res.est) ? Fmt.bounded(c.res.est, 3) : '—'}</td><td>${ci ? `${ci2(ci.lo, ci.hi)} <span class="cmut">${esc(ci.method)}</span>` : '<span class="cmut">—</span>'}</td>` +
      `<td>${c.res.stat ? `${esc(c.res.stat.name)} = ${Fmt.num(c.res.stat.value, 2)}` : '—'}</td><td class="num ${isFinite(c.res.p) && c.res.p < 1 - o.level ? 'ok-t' : ''}">${isFinite(c.res.p) ? Fmt.pValue(c.res.p) : '—'}</td>` +
      `<td><button type="button" class="btn btn-ghost btn-sm" data-main="${c.def.id}">${main ? '✓' : L2('Hacer principal', 'Make main')}</button>${Catalog.byId(c.def.id === 'kendall' ? 'kendallB' : c.def.id) ? ` <button type="button" class="btn btn-ghost btn-sm" data-measure="${c.def.id === 'kendall' ? 'kendallB' : c.def.id}" aria-label="${esc(T('Qué es ', 'What is ') + nameOf(c))}">?</button>` : ''}</td></tr>`;
  });
  el('b4Table').innerHTML = h + '</tbody></table>';
  const rows = R.coefs.map(c => { const ci = ciOf(c); return { label: nameOf(c), est: c.res.est, lo: ci ? ci.lo : NaN, hi: ci ? ci.hi : NaN, fam: c.def.fam, main: c === R.main }; });
  el('b4Forest').innerHTML = Plot.forest({ rows, w: 700, xlim: [-1, 1], plot: 'b4-forest', labelWidth: 210, xlab: T('Valor del coeficiente', 'Value of the coefficient'), label: T('Coeficientes con sus intervalos', 'Coefficients with their intervals') });
}
function paintResampling() {
  const R = state.pair, m = R.main, o = R.o, bt = R.boot, pm = R.perm, sym = Fmt.symbol(m.def.id), dep = DEP.has(m.def.id);
  el('b4ResHint').innerHTML = L2(`Del coeficiente principal, ${esc(nameOf(m))}, con ${fmtNum(bt.R, 0)} remuestreos y la semilla ${o.seed}: con la misma semilla salen los mismos números.`, `Of the main coefficient, ${esc(nameOf(m))}, with ${fmtNum(bt.R, 0)} resamples and seed ${o.seed}: the same seed gives the same numbers.`);
  statTiles('b4BootTiles', [
    [T('Error estándar bootstrap', 'Bootstrap standard error'), Fmt.num(bt.se, 3)],
    [T('Sesgo', 'Bias'), Fmt.num(bt.bias, 4), isFinite(bt.z0) ? `z₀ = ${Fmt.num(bt.z0, 3)} · a = ${Fmt.num(bt.acc, 4)}` : ''],
    [T('Percentil', 'Percentile'), ci2(bt.percentile[0], bt.percentile[1])],
    [T('Básico', 'Basic'), ci2(bt.basic[0], bt.basic[1])],
    [T('Normal', 'Normal'), ci2(bt.normal[0], bt.normal[1])],
    bt.bca ? ['BCa', ci2(bt.bca[0], bt.bca[1]), T('corrige sesgo y asimetría', 'corrects bias and skewness'), 'ok'] : null,
  ]);
  const bc = bt.bca || bt.percentile;
  el('b4Boot').innerHTML = Plot.distribution({ reps: bt.reps, w: 400, h: 280, plot: 'b4-boot', xlab: T(`${sym} en cada remuestreo`, `${sym} in each resample`), ylab: T('Frecuencia', 'Frequency'),
    band: { lo: bc[0], hi: bc[1] }, marks: [{ v: bt.t0, cls: 'pl-mark', label: `${sym} = ${Fmt.bounded(bt.t0, 2)}` }, { v: bt.percentile[0], cls: 'pl-mark2' }, { v: bt.percentile[1], cls: 'pl-mark2' }] });
  const alt = pm.alt, t0 = pm.t0;
  const test = alt === 'greater' ? v => v >= t0 : alt === 'less' ? v => v <= t0 : v => Math.abs(v) >= Math.abs(t0);
  const marks = [{ v: t0, cls: 'pl-mark', label: T('observado', 'observed') }];
  if (alt === 'two.sided' && !dep) marks.push({ v: -t0, cls: 'pl-mark2' });
  el('b4Perm').innerHTML = Plot.distribution({ reps: pm.reps, w: 400, h: 280, plot: 'b4-perm', xlab: T(`${sym} con Y barajada`, `${sym} with Y shuffled`), ylab: T('Frecuencia', 'Frequency'), tail: { test }, marks,
    xlim: Plot.extent(Array.from(pm.reps).concat([t0, alt === 'two.sided' ? -t0 : t0]), 0.05) });
}
function paintBayes() {
  const R = state.pair, b = R.bayes, o = R.o;
  if (!b) { el('b4BayesTiles').innerHTML = ''; el('b4Bayes').innerHTML = ''; el('b4BayesText').innerHTML = ''; return; }
  const ev = PairStat.evidence(b.BF10), side = o.alt === 'greater' ? b.logBFplus : o.alt === 'less' ? b.logBFminus : null;
  statTiles('b4BayesTiles', [
    ['<span class="nc">BF<sub>10</sub></span>', fmtBF(b.logBF10), T(`evidencia ${ev.es}`, `${ev.en} evidence`), ev.favours === 'h1' ? 'ok' : ev.favours === 'h0' ? 'warn' : ''],
    ['<span class="nc">BF<sub>01</sub></span>', fmtBF(-b.logBF10), T('a favor de ρ = 0', 'for ρ = 0')],
    side != null ? [o.alt === 'greater' ? '<span class="nc">BF<sub>+0</sub></span>' : '<span class="nc">BF<sub>−0</sub></span>', fmtBF(side), o.alt === 'greater' ? T('ρ > 0 frente a ρ = 0', 'ρ > 0 against ρ = 0') : T('ρ < 0 frente a ρ = 0', 'ρ < 0 against ρ = 0')] : ['<span class="nc">BF<sub>+0</sub> · BF<sub>−0</sub></span>', `${fmtBF(b.logBFplus)} · ${fmtBF(b.logBFminus)}`, T('unilaterales', 'one-sided')],
    [T('Mediana posterior', 'Posterior median'), Fmt.bounded(b.post.median, 3), T(`media ${Fmt.bounded(b.post.mean, 3)}`, `mean ${Fmt.bounded(b.post.mean, 3)}`)],
    [T(`Intervalo creíble ${pct(b.post.level)} %`, `${pct(b.post.level)}% credible interval`), ci2(b.post.lo, b.post.hi), T('central', 'central')],
  ]);
  const xs = b.curve.map(c => c[0]);
  const top = Math.max(...b.curve.map(c => c[2]), ...b.curve.map(c => c[1])) * 1.08;
  el('b4Bayes').innerHTML = Plot.curves({ w: 420, h: 300, plot: 'b4-bayes', xlim: [-1, 1], ylim: [0, top], xlab: 'ρ', ylab: T('Densidad', 'Density'),
    bands: [{ lo: b.post.lo, hi: b.post.hi, cls: 'pl-band' }],
    series: [{ x: xs, y: b.curve.map(c => c[1]), cls: 'pl-prior', label: T('a priori', 'prior') }, { x: xs, y: b.curve.map(c => c[2]), cls: 'pl-post', label: T('posterior', 'posterior'), fill: true }],
    points: [{ x: 0, y: b.priorAt0, cls: 'pl-dot-prior', label: T('a priori en ρ = 0', 'prior at ρ = 0') }, { x: 0, y: b.postAt0, cls: 'pl-dot-post', label: T('posterior en ρ = 0', 'posterior at ρ = 0') }] });
  el('b4BayesText').innerHTML = `<p>${L2(`La razón de las dos densidades en ρ = 0 es el factor de Bayes: ${Fmt.num(b.priorAt0, 3)} / ${b.postAt0 < 1e-3 ? fmtBF(Math.log(b.postAt0)) : Fmt.num(b.postAt0, 3)} = ${fmtBF(b.logBF10)}. Si la posterior se aleja de cero, los datos hacen menos creíble ρ = 0 de lo que era antes de verlos.`, `The ratio of the two densities at ρ = 0 is the Bayes factor: ${Fmt.num(b.priorAt0, 3)} / ${b.postAt0 < 1e-3 ? fmtBF(Math.log(b.postAt0)) : Fmt.num(b.postAt0, 3)} = ${fmtBF(b.logBF10)}. If the posterior moves away from zero, the data make ρ = 0 less credible than it was before seeing them.`)}</p>` +
    `<table class="b4-ev"><thead><tr><th>BF₁₀</th><th>${L2('Evidencia', 'Evidence')}</th></tr></thead><tbody>` +
    [['1 – 3', 'anecdótica', 'anecdotal', 1], ['3 – 10', 'moderada', 'moderate', 2], ['10 – 30', 'fuerte', 'strong', 3], ['30 – 100', 'muy fuerte', 'very strong', 4], ['> 100', 'extrema', 'extreme', 5]]
      .map(r => `<tr class="${ev.favours === 'h1' && ev.level === r[3] ? 'sel' : ''}"><td>${r[0]}</td><td>${L2(r[1], r[2])}</td></tr>`).join('') + '</tbody></table>' +
    `<p class="hint">${L2('Los recíprocos (1/3, 1/10, …) son evidencia a favor de ρ = 0.', 'The reciprocals (1/3, 1/10, …) are evidence for ρ = 0.')}</p>`;
}
function paintConv() {
  const R = state.pair, m = R.main, list = [];
  m.res.conv.forEach(c => list.push(c));
  list.push([`Bootstrap no paramétrico de los pares: ${fmtNum(R.boot.R, 0)} remuestreos con la semilla ${R.o.seed}${R.boot.bad ? ` (${R.boot.bad} remuestreos sin valor descartados)` : ''}; intervalos normal, básico, percentil y BCa con los cuantiles interpolados en la escala normal (Davison y Hinkley 1997) y la aceleración de la navaja.`,
    `Nonparametric bootstrap of the pairs: ${fmtNum(R.boot.R, 0)} resamples with seed ${R.o.seed}${R.boot.bad ? ` (${R.boot.bad} resamples without a value dropped)` : ''}; normal, basic, percentile and BCa intervals with the quantiles interpolated on the normal scale (Davison and Hinkley 1997) and the jackknife acceleration.`]);
  list.push([`Permutación: ${fmtNum(R.perm.B, 0)} barajas de Y con la semilla ${R.o.seed + 1}; p = (k + 1)/(B + 1), que cuenta lo observado como una de las barajas${DEP.has(m.def.id) ? '; para una medida de dependencia sólo cuentan los valores grandes' : ''}.`,
    `Permutation: ${fmtNum(R.perm.B, 0)} shuffles of Y with seed ${R.o.seed + 1}; p = (k + 1)/(B + 1), which counts the observed value as one of the shuffles${DEP.has(m.def.id) ? '; for a dependence measure only large values count' : ''}.`]);
  if (R.bayes) list.push([`Factor de Bayes de Jeffreys para la r de Pearson en su forma exacta (Ly, Verhagen y Wagenmakers 2016), con una beta(1/κ, 1/κ) estirada a (−1, 1), κ = ${Fmt.num(R.o.kappa, 3)}; integración numérica adaptativa de Gauss–Kronrod.`,
    `Jeffreys’ Bayes factor for Pearson’s r in its exact form (Ly, Verhagen and Wagenmakers 2016), with a beta(1/κ, 1/κ) stretched to (−1, 1), κ = ${Fmt.num(R.o.kappa, 3)}; adaptive Gauss–Kronrod numerical integration.`]);
  if (R.dropped) list.push([`${R.dropped} fila(s) sin alguno de los dos valores quedaron fuera (${state.data.missingMode === 'listwise' ? 'por listas' : 'por pares'}).`, `${R.dropped} row(s) missing either value were left out (${state.data.missingMode === 'listwise' ? 'listwise' : 'pairwise'}).`]);
  el('b4Conv').innerHTML = list.map(c => `<li>${L2(esc(c[0]), esc(c[1]))}</li>`).join('');
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-4')) return;
  el('b4Cars').addEventListener('click', () => { B2.loadExample('cars'); goStep(4); });
  ['b4X', 'b4Y'].forEach(id => el(id).addEventListener('change', () => { S.pair = [el('b4X').value, el('b4Y').value]; run(); }));
  el('b4Coef').addEventListener('change', e => { S.coef = e.target.value || null; run(); });
  ['b4Alt', 'b4Level', 'b4B', 'b4Seed', 'b4Kappa'].forEach(id => el(id).addEventListener('change', run));
  el('b4Scale').addEventListener('change', () => { if (state.pair) paintResult(); });
  el('b4Table').addEventListener('click', e => {
    const b = e.target.closest('[data-main]');
    if (b) { S.coef = b.dataset.main; el('b4Coef').value = S.coef; run(); return; }
    const m = e.target.closest('[data-measure]');
    if (m) Home.openMeasure(m.dataset.measure);
  });
  el('b4Copy').addEventListener('click', () => {
    /* the sentence as plain text, so that the symbol keeps its underscore (r_pb): the painted one would give "rpb" */
    const R = state.pair, t = R && R.main ? reportSentence(R) : el('b4Report').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => LABG.toast && LABG.toast(T('Copiado', 'Copied')), () => {
      const r = document.createRange(); r.selectNodeContents(el('b4Report')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    });
  });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 4 && state.data && (S.dirty || !state.pair)) run(); });
document.addEventListener('langchange', () => { if (state.data) { paintSelects(); if (state.pair) paintAll(); } });
document.addEventListener('fmtchange', () => { if (state.pair) paintAll(); });
window.B4 = B4;
})();
