/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 12, compare, correct, plan and combine: two
   correlations (independent, overlapping, non-overlapping), two matrices
   (Jennrich and cell by cell), the corrections for attenuation and range
   restriction, power and sample size with the exact distribution of r, the
   Bayes factor of a published r, and the meta-analysis of correlations. It
   works with typed summaries or with the open data; the results go to
   state.inference. */
(function () {
'use strict';
const S = { sec: 'cmp', design: 'indep', vals: {}, from: {}, mat: { group: null, a: null, b: null, keys: null }, metaCols: null };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
const f2 = v => (isFinite(v) ? Fmt.num(v, 2) : '—');
const num = id => parseFloat(String(el(id).value).replace(',', '.'));
const zc = conf => Num.qnorm(1 - (1 - conf) / 2);
const fisherCI = (r, n, conf) => { const z = Math.atanh(r), h = zc(conf) / Math.sqrt(n - 3); return [Math.tanh(z - h), Math.tanh(z + h)]; };
const res = () => (state.inference = state.inference || {});
const conts = ds => ds.cols.filter(c => c.role !== 'exclude' && c.type === 'continuous');
const groupCols = ds => ds.cols.filter(c => c.role !== 'exclude' && ['nominal', 'binary', 'ordinal'].includes(c.type) && c.levels && c.levels.length >= 2 && c.levels.length <= 30);
/* the symbols keep their case under the uppercase labels */
const sym = s => String(s).replace(/(^|[\s(·/])([rnszt])(?=[\s)·,/]|$)/g, '$1<span class="nc">$2</span>');
const opt = (v, txt, sel) => `<option value="${esc(String(v))}"${sel ? ' selected' : ''}>${esc(txt)}</option>`;

/* ---------------- sections ---------------- */
function showSec(sec) {
  S.sec = sec;
  el('panel-12').querySelectorAll('.b12-bar [data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === sec));
  el('panel-12').querySelectorAll('.b12-sec').forEach(d => { d.hidden = d.id !== 'b12Sec-' + sec; });
  paint();
}
function paint() {
  if (!el('panel-12').classList.contains('active')) return;
  ({ cmp: runCmp, mat: runMat, cor: runCor, plan: runPlan, meta: runMeta })[S.sec]();
  if (S.sec === 'plan') runBF();
  refreshStepMarks();
}

/* ================= two correlations ================= */
const FIELDS = {
  indep: [['r1', 'r del grupo 1', 'r of group 1', 0.5], ['n1', 'n del grupo 1', 'n of group 1', 100], ['r2', 'r del grupo 2', 'r of group 2', 0.3], ['n2', 'n del grupo 2', 'n of group 2', 120]],
  overlap: [['rjk', 'r_jk', 'r_jk', 0.5], ['rjh', 'r_jh', 'r_jh', 0.3], ['rkh', 'r_kh (entre k y h)', 'r_kh (between k and h)', 0.4], ['n', 'n', 'n', 100]],
  nonoverlap: [['rjk', 'r_jk', 'r_jk', 0.5], ['rhm', 'r_hm', 'r_hm', 0.3], ['rjh', 'r_jh', 'r_jh', 0.2], ['rjm', 'r_jm', 'r_jm', 0.25], ['rkh', 'r_kh', 'r_kh', 0.15], ['rkm', 'r_km', 'r_km', 0.35], ['n', 'n', 'n', 100]],
};
/* r_jk → r with the subscript; then the lone symbols */
const fieldLabel = s => sym(esc(s).replace(/\br_([a-z]{2})\b/g, '<span class="nc">r<sub>$1</sub></span>'));
const ROLES = { indep: ['j', 'k'], overlap: ['j', 'k', 'h'], nonoverlap: ['j', 'k', 'h', 'm'] };
function paintNums() {
  const d = S.design, v = S.vals[d] = S.vals[d] || {};
  el('b12Nums').innerHTML = FIELDS[d].map(([k, es, en, def]) => {
    if (v[k] == null) v[k] = def;
    const isN = k[0] === 'n';
    return `<div class="field"><label for="b12N_${k}">${fieldLabel(T(es, en))}</label><input type="number" id="b12N_${k}" data-k="${k}" value="${v[k]}" step="${isN ? 1 : 0.001}" min="${isN ? 4 : -0.999}" max="${isN ? 1e7 : 0.999}"></div>`;
  }).join('');
}
function paintFrom() {
  const ds = state.data, g = el('b12FromGrid');
  if (!ds || conts(ds).length < 2) { g.innerHTML = `<p class="hint">${esc(T('Abre en el Bloque 2 unos datos con al menos dos columnas continuas, o usa el ejemplo.', 'Open in Block 2 some data with at least two continuous columns, or use the example.'))}</p>`; el('b12FromGo').hidden = true; return; }
  el('b12FromGo').hidden = false;
  const cs = conts(ds), d = S.design, f = S.from[d] = S.from[d] || {};
  ROLES[d].forEach((role, i) => { if (!cs.some(c => c.key === f[role])) f[role] = cs[Math.min(i, cs.length - 1)].key; });
  let h = ROLES[d].map(role => `<div class="field"><label for="b12F_${role}">${esc(T('Variable ', 'Variable '))}<span class="nc">${role}</span></label><select id="b12F_${role}" data-role="${role}">${cs.map(c => opt(c.key, label(c), c.key === f[role])).join('')}</select></div>`).join('');
  if (d === 'indep') {
    const gc = groupCols(ds);
    if (!gc.length) h += `<p class="hint">${esc(T('Para dos grupos independientes hace falta una columna de grupo (nominal).', 'Two independent groups need a grouping column (nominal).'))}</p>`;
    else {
      if (!gc.some(c => c.key === f.g)) f.g = gc[0].key;
      const G = Data.col(ds, f.g);
      if (!(f.a >= 0 && f.a < G.levels.length)) f.a = 0;
      if (!(f.b >= 0 && f.b < G.levels.length) || f.b === f.a) f.b = f.a === 0 ? 1 : 0;
      h += `<div class="field"><label for="b12F_g">${esc(T('Grupo', 'Group'))}</label><select id="b12F_g" data-role="g">${gc.map(c => opt(c.key, label(c), c.key === f.g)).join('')}</select></div>` +
        `<div class="field"><label for="b12F_a">${esc(T('Grupo 1', 'Group 1'))}</label><select id="b12F_a" data-role="a">${G.levels.map((l, i) => opt(i, l, i === f.a)).join('')}</select></div>` +
        `<div class="field"><label for="b12F_b">${esc(T('Grupo 2', 'Group 2'))}</label><select id="b12F_b" data-role="b">${G.levels.map((l, i) => opt(i, l, i === f.b)).join('')}</select></div>`;
    }
  }
  g.innerHTML = h;
}
function fromData() {
  const ds = state.data, d = S.design, f = S.from[d], v = S.vals[d];
  clearMessages('b12CMsgs');
  if (!ds) return;
  const col = k => Data.col(ds, k).num;
  const keys = ROLES[d].map(r => f[r]);
  if (new Set(keys).size < keys.length) { showMessage('b12CMsgs', 'warn', L2('Elige variables distintas para cada papel.', 'Pick different variables for each role.')); return; }
  const rOf = (a, b, rows) => Coef.pearson(rows.map(i => col(a)[i]), rows.map(i => col(b)[i])).est;
  if (d === 'indep') {
    if (!f.g) return;
    const G = col(f.g), rows = Data.completeRows(ds, [f.j, f.k]);
    const ra = rows.filter(i => G[i] === +f.a), rb = rows.filter(i => G[i] === +f.b);
    if (ra.length < 5 || rb.length < 5) { showMessage('b12CMsgs', 'warn', L2('Cada grupo necesita al menos 5 casos completos.', 'Each group needs at least 5 complete cases.')); return; }
    Object.assign(v, { r1: +rOf(f.j, f.k, ra).toFixed(6), n1: ra.length, r2: +rOf(f.j, f.k, rb).toFixed(6), n2: rb.length });
    const lv = Data.col(ds, f.g).levels;
    S.names = { indep: true, j: label(Data.col(ds, f.j)), k: label(Data.col(ds, f.k)), a: lv[f.a], b: lv[f.b] };
  } else {
    const rows = Data.completeRows(ds, keys), R = (a, b) => +rOf(f[a], f[b], rows).toFixed(6);
    if (rows.length < 5) { showMessage('b12CMsgs', 'warn', L2('Hacen falta al menos 5 casos completos.', 'At least 5 complete cases are needed.')); return; }
    if (d === 'overlap') Object.assign(v, { rjk: R('j', 'k'), rjh: R('j', 'h'), rkh: R('k', 'h'), n: rows.length });
    else Object.assign(v, { rjk: R('j', 'k'), rhm: R('h', 'm'), rjh: R('j', 'h'), rjm: R('j', 'm'), rkh: R('k', 'h'), rkm: R('k', 'm'), n: rows.length });
    S.names = { j: label(Data.col(ds, f.j)), k: label(Data.col(ds, f.k)), h: label(Data.col(ds, f.h)), m: f.m ? label(Data.col(ds, f.m)) : '' };
  }
  S.names.design = d;
  paintNums(); runCmp();
}
const RECOMMENDED = { indep: ['fisher1925'], overlap: ['williams1959', 'hittner2003'], nonoverlap: ['silver2004', 'raghunathan1996'] };
function runCmp() {
  const d = S.design, v = S.vals[d];
  clearMessages('b12CMsgs');
  FIELDS[d].forEach(([k]) => { const x = num('b12N_' + k); if (isFinite(x)) v[k] = x; });
  const bad = FIELDS[d].find(([k]) => (k[0] === 'n' ? !(v[k] > 3) : !(Math.abs(v[k]) < 1)));
  if (bad) { showMessage('b12CMsgs', 'warn', L2('Cada r debe estar entre −1 y 1 (sin incluirlos) y cada n ser mayor que 3.', 'Each r must lie strictly between −1 and 1 and each n be above 3.')); return; }
  const alt = el('b12Alt').value, conf = +el('b12Conf').value, o = { alt, conf };
  let out, a, b, na, nb, la, lb;
  const nm = S.names && S.names.design === d ? S.names : null;
  if (d === 'indep') {
    out = Infer.indep(v.r1, v.n1, v.r2, v.n2, o); a = v.r1; b = v.r2; na = v.n1; nb = v.n2;
    la = nm ? `${T('r en', 'r in')} ${nm.a}` : T('r del grupo 1', 'r of group 1'); lb = nm ? `${T('r en', 'r in')} ${nm.b}` : T('r del grupo 2', 'r of group 2');
  } else if (d === 'overlap') {
    const det = 1 + 2 * v.rjk * v.rjh * v.rkh - v.rjk ** 2 - v.rjh ** 2 - v.rkh ** 2;
    if (!(det > 0)) { showMessage('b12CMsgs', 'warn', L2('Esas tres correlaciones no pueden darse juntas (la matriz no es definida positiva).', 'Those three correlations cannot occur together (the matrix is not positive definite).')); return; }
    out = Infer.overlap(v.rjk, v.rjh, v.rkh, v.n, o); a = v.rjk; b = v.rjh; na = nb = v.n;
    la = nm ? `r(${short(nm.j, 14)}, ${short(nm.k, 14)})` : 'r_jk'; lb = nm ? `r(${short(nm.j, 14)}, ${short(nm.h, 14)})` : 'r_jh';
  } else {
    const M = [[1, v.rjk, v.rjh, v.rjm], [v.rjk, 1, v.rkh, v.rkm], [v.rjh, v.rkh, 1, v.rhm], [v.rjm, v.rkm, v.rhm, 1]];
    if (!(Math.min(...Mat.eigen(M).values) > 0)) { showMessage('b12CMsgs', 'warn', L2('Esas seis correlaciones no pueden darse juntas (la matriz no es definida positiva).', 'Those six correlations cannot occur together (the matrix is not positive definite).')); return; }
    out = Infer.nonoverlap(v.rjk, v.rhm, v.rjh, v.rjm, v.rkh, v.rkm, v.n, o); a = v.rjk; b = v.rhm; na = nb = v.n;
    la = nm ? `r(${short(nm.j, 14)}, ${short(nm.k, 14)})` : 'r_jk'; lb = nm ? `r(${short(nm.h, 14)}, ${short(nm.m, 14)})` : 'r_hm';
  }
  const rec = RECOMMENDED[d], main = out.tests.find(t => t.id === rec[0]), zouIn0 = out.zou[0] <= 0 && out.zou[1] >= 0;
  res().compare = { design: d, values: Object.assign({}, v), alt, conf, out, labels: [la, lb] };
  const pc = Math.round(conf * 100);
  statTiles('b12CTiles', [
    [T('Diferencia', 'Difference'), Fmt.num(out.diff, 3), `${fieldLabel(la)} − ${fieldLabel(lb)}`],
    [T(`IC ${pc} % de Zou`, `Zou ${pc}% CI`), `[${Fmt.num(out.zou[0], 3)}, ${Fmt.num(out.zou[1], 3)}]`, zouIn0 ? T('incluye el 0', 'includes 0') : T('no incluye el 0', 'excludes 0'), zouIn0 ? 'warn' : 'ok'],
    [sym(esc(T(main.es, main.en))), main.dist === 't' ? `t(${main.df}) = ${Fmt.num(main.stat, 3)}` : `z = ${Fmt.num(main.stat, 3)}`, `${pTxt(main.p)} · ${T('recomendada', 'recommended')}`, main.p < 1 - conf ? 'ok' : 'warn'],
  ]);
  const nSig = out.tests.filter(t => t.p < 1 - conf).length;
  el('b12CTable').innerHTML = `<table><thead><tr><th>${L2('Prueba', 'Test')}</th><th class="num">${L2('Estadístico', 'Statistic')}</th><th class="num">p</th><th></th></tr></thead><tbody>` +
    out.tests.map(t => `<tr${rec.includes(t.id) ? ' class="b12-rec"' : ''}><td>${esc(T(t.es, t.en))}</td><td class="num nw">${t.dist === 't' ? `t(${t.df}) = ` : 'z = '}${Fmt.num(t.stat, 3)}</td><td class="num">${Fmt.pValue(t.p)}</td><td>${rec.includes(t.id) ? `<span class="pill ok">${L2('recomendada', 'recommended')}</span>` : ''}</td></tr>`).join('') +
    /* with one test there is nothing to count: with independent groups only Fisher's z applies */
    `</tbody></table><p class="hint">${out.tests.length === 1 ? L2(`La prueba ${nSig ? 'rechaza' : 'no rechaza'} al ${Math.round(100 * (1 - conf))} %. Con grupos independientes basta la z de Fisher.`, `The test ${nSig ? 'rejects' : 'does not reject'} at ${Math.round(100 * (1 - conf))}%. With independent groups Fisher’s z is enough.`) : L2(`${nSig} de ${out.tests.length} pruebas rechazan al ${Math.round(100 * (1 - conf))} %. Las fórmulas difieren sobre todo con n pequeña y correlaciones grandes.`, `${nSig} of ${out.tests.length} tests reject at ${Math.round(100 * (1 - conf))}%. The formulas differ mostly with small n and large correlations.`)}</p>`;
  const ca = fisherCI(a, na, conf), cb = fisherCI(b, nb, conf);
  const lo = Math.min(-0.2, ca[0], cb[0], out.zou[0]), hi = Math.max(1, ca[1], cb[1], out.zou[1]);
  el('b12CFig').innerHTML = Plot.forest({
    rows: [{ label: la, est: a, lo: ca[0], hi: ca[1], fam: 'lin' }, { label: lb, est: b, lo: cb[0], hi: cb[1], fam: 'rank' }, { label: T('Diferencia (Zou)', 'Difference (Zou)'), est: out.diff, lo: out.zou[0], hi: out.zou[1], fam: 'dep', main: true }],
    xlim: [Math.max(-2, Math.floor(lo * 5) / 5), Math.min(2, Math.ceil(hi * 5) / 5)], w: 720, labelWidth: 210, plot: 'b12-compare', xlab: T(`Correlación e IC ${pc} %`, `Correlation and ${pc}% CI`), label: T('Dos correlaciones', 'Two correlations'),
  });
}

/* ================= two matrices ================= */
function paintMat() {
  const ds = state.data, gc = ds ? groupCols(ds) : [], cs = ds ? conts(ds) : [];
  const ok = ds && gc.length && cs.length >= 2;
  el('b12MEmpty').hidden = !!ok; el('b12MMain').hidden = !ok; el('b12MRes').hidden = !ok;
  if (!ok) return false;
  const m = S.mat;
  if (!gc.some(c => c.key === m.group)) { m.group = gc[0].key; m.a = 0; m.b = 1; }
  const G = Data.col(ds, m.group);
  if (!(m.a < G.levels.length)) m.a = 0;
  if (!(m.b < G.levels.length) || m.b === m.a) m.b = m.a === 0 ? 1 : 0;
  m.keys = (m.keys || []).filter(k => cs.some(c => c.key === k));
  if (m.keys.length < 2) m.keys = cs.filter(c => c.role === 'var').slice(0, 8).map(c => c.key);
  if (m.keys.length < 2) m.keys = cs.slice(0, 8).map(c => c.key);
  el('b12MGroup').innerHTML = gc.map(c => opt(c.key, label(c), c.key === m.group)).join('');
  el('b12MA').innerHTML = G.levels.map((l, i) => opt(i, l, i === m.a)).join('');
  el('b12MB').innerHTML = G.levels.map((l, i) => opt(i, l, i === m.b)).join('');
  el('b12MVars').innerHTML = cs.map(c => `<button type="button" class="chip${m.keys.includes(c.key) ? ' on' : ''}" data-k="${c.key}">${esc(label(c))}</button>`).join('');
  return true;
}
function runMat() {
  clearMessages('b12MMsgs');
  if (!paintMat()) return;
  const ds = state.data, m = S.mat, G = Data.col(ds, m.group).num, keys = m.keys, method = el('b12MCoef').value;
  if (keys.length < 2) { showMessage('b12MMsgs', 'warn', L2('Elige al menos dos variables.', 'Pick at least two variables.')); el('b12MRes').hidden = true; return; }
  const rows = Data.completeRows(ds, keys.concat([m.group]));
  const part = lv => { const rr = rows.filter(i => G[i] === lv); return { n: rr.length, cols: keys.map(k => { const c = Data.col(ds, k).num; return rr.map(i => c[i]); }) }; };
  const A = part(m.a), B = part(m.b), p = keys.length;
  if (A.n < p + 3 || B.n < p + 3) { showMessage('b12MMsgs', 'warn', L2(`Cada grupo necesita más casos completos que variables más tres (hay ${A.n} y ${B.n}).`, `Each group needs more complete cases than variables plus three (there are ${A.n} and ${B.n}).`)); el('b12MRes').hidden = true; return; }
  const RA = Mat.compute(A.cols, { method }).R, RB = Mat.compute(B.cols, { method }).R;
  const Rbar = RA.map((r, i) => r.map((x, j) => (A.n * x + B.n * RB[i][j]) / (A.n + B.n)));
  if (!(Math.min(...Mat.eigen(Rbar).values) > 1e-10)) { showMessage('b12MMsgs', 'warn', L2('La matriz combinada es singular (alguna variable es combinación de otras): quita una.', 'The pooled matrix is singular (some variable is a combination of others): remove one.')); el('b12MRes').hidden = true; return; }
  el('b12MRes').hidden = false;
  const J = Infer.jennrich(RA, RB, A.n, B.n), E = Infer.elementwise(RA, RB, A.n, B.n);
  const lv = Data.col(ds, m.group).levels, names = keys.map(k => label(Data.col(ds, k)));
  const nSig = E.cells.filter(c => c.padj < 0.05).length;
  res().matrices = { group: label(Data.col(ds, m.group)), a: lv[m.a], b: lv[m.b], nA: A.n, nB: B.n, method, names, jennrich: J, cells: E.cells };
  if (method === 'spearman') showMessage('b12MMsgs', 'info', L2('La prueba de Jennrich es de teoría normal: con Spearman es aproximada.', 'Jennrich’s test is normal-theory: with Spearman it is approximate.'));
  statTiles('b12MTiles', [
    [T('χ² de Jennrich', 'Jennrich’s χ²'), Fmt.num(J.chi2, 2), `${T('gl', 'df')} ${J.df} · ${pTxt(J.p)}`, J.p < 0.05 ? 'ok' : 'warn'],
    [T('Casos', 'Cases'), `${A.n} · ${B.n}`, `${esc(lv[m.a])} · ${esc(lv[m.b])}`],
    [T('Celdas distintas (Holm 5 %)', 'Cells that differ (Holm 5%)'), `${nSig} / ${E.cells.length}`, T('z de Fisher celda por celda', 'Fisher’s z cell by cell')],
  ]);
  const D = RA.map((r, i) => r.map((x, j) => (i === j ? 0 : x - RB[i][j]))), PV = RA.map(r => r.map(() => NaN));
  E.cells.forEach(c => { PV[c.i][c.j] = PV[c.j][c.i] = c.padj; });
  const size = p <= 5 ? 48 : p <= 8 ? 38 : 28, lw = Math.min(130, 14 + 6.2 * Math.max(...names.map(s => Math.min(18, s.length))));
  const fig = (R, title, plot, extra) => `<div class="pg-pane"><div class="pg-title">${esc(title).split('(n = ').join('(<span class="nc">n</span> = ')}</div>${Plot.matrix(Object.assign({ R, labels: names.map(s => short(s, 18)), glyph: { lower: 'ellipse', upper: 'number', diag: 'diag' }, palette: View.palette, invert: View.invert, size, labelWidth: lw, digits: 2, plot, label: title }, extra || {}))}</div>`;
  el('b12MFigs').innerHTML = fig(RA, `${lv[m.a]} (n = ${A.n})`, 'b12-matA') + fig(RB, `${lv[m.b]} (n = ${B.n})`, 'b12-matB') +
    fig(D, T(`Diferencia ${lv[m.a]} − ${lv[m.b]}`, `Difference ${lv[m.a]} − ${lv[m.b]}`), 'b12-matD', { glyph: { lower: 'color', upper: 'number', diag: 'blank' }, pv: PV, alpha: 0.05, insig: 'blank' }) +
    `<p class="hint b12-span">${L2('En la diferencia, las celdas tenues no son significativas con la corrección de Holm.', 'In the difference, the faint cells are not significant with Holm’s correction.')}</p>`;
  const cells = E.cells.slice().sort((x, y) => x.p - y.p);
  el('b12MTable').innerHTML = `<table><thead><tr><th>${L2('Par', 'Pair')}</th><th class="num">${esc(short(lv[m.a], 14))}</th><th class="num">${esc(short(lv[m.b], 14))}</th><th class="num">${L2('Diferencia', 'Difference')}</th><th class="num">z</th><th class="num">p</th><th class="num">${L2('p (Holm)', 'p (Holm)')}</th></tr></thead><tbody>` +
    cells.map(c => `<tr><td>${esc(short(names[c.j], 18))} · ${esc(short(names[c.i], 18))}</td><td class="num">${fr(c.r1)}</td><td class="num">${fr(c.r2)}</td><td class="num"><b>${Fmt.num(c.r1 - c.r2, 3)}</b></td><td class="num">${Fmt.num(c.z, 2)}</td><td class="num">${Fmt.pValue(c.p)}</td><td class="num">${c.padj < 0.05 ? `<span class="pill ok">${Fmt.pValue(c.padj)}</span>` : Fmt.pValue(c.padj)}</td></tr>`).join('') + '</tbody></table>';
}

/* ================= corrections ================= */
function runCor() {
  const r = num('b12AR'), rxx = num('b12AX'), ryy = num('b12AY');
  const okA = Math.abs(r) <= 1 && rxx > 0 && rxx <= 1 && ryy > 0 && ryy <= 1;
  const rc = okA ? Infer.attenuation(r, rxx, ryy) : NaN, ceil = Math.sqrt(rxx * ryy);
  statTiles('b12ATiles', okA ? [
    [sym(T('r corregida', 'Corrected r')), Math.abs(rc) > 1 ? `${Fmt.num(rc, 3)} !` : fr(rc), Math.abs(rc) > 1 ? T('mayor que 1: revisa las fiabilidades', 'above 1: check the reliabilities') : T('entre las puntuaciones verdaderas', 'between the true scores'), Math.abs(rc) > 1 ? 'bad' : 'ok'],
    [sym(T('Techo de la r observable', 'Ceiling of the observable r')), fr(ceil), T('√(r<sub>xx</sub> · r<sub>yy</sub>): ninguna r observada puede superarlo', '√(r<sub>xx</sub> · r<sub>yy</sub>): no observed r can exceed it')],
    [T('Atenuación', 'Attenuation'), Fmt.num(100 * (1 - ceil), 1) + ' %', T('lo que el error de medida le quita a r', 'what measurement error takes from r')],
  ] : [[T('Valores fuera de rango', 'Values out of range'), '—', T('r en [−1, 1]; fiabilidades en (0, 1]', 'r in [−1, 1]; reliabilities in (0, 1]'), 'warn']]);
  const rr = num('b12RR'), s = num('b12Rs'), Sd = num('b12RS'), cs = el('b12RCase').value, rxz = num('b12Rxz'), ryz = num('b12Ryz');
  els('.b12-c3').forEach(d => { d.hidden = cs !== 'III'; });
  const U = Sd / s, okR = Math.abs(rr) < 1 && s > 0 && Sd > 0 && (cs === 'II' || (Math.abs(rxz) < 1 && Math.abs(ryz) < 1));
  const rU = okR ? (cs === 'II' ? Infer.caseII(rr, U) : Infer.caseIII(rr, rxz, ryz, U)) : NaN;
  statTiles('b12RTiles', okR ? [
    ['U = S / <span class="nc">s</span>', Fmt.num(U, 3), U < 1 ? T('U < 1: la muestra es más variable que la población (corrige hacia abajo)', 'U < 1: the sample is more variable than the population (corrects downwards)') : T(cs === 'II' ? 'sobre x' : 'sobre z', cs === 'II' ? 'on x' : 'on z')],
    [sym(T('r sin restricción', 'Unrestricted r')), fr(rU), T(`${cs === 'II' ? 'caso II' : 'caso III'} de Thorndike`, `Thorndike’s case ${cs}`), 'ok'],
    [T('Cambio', 'Change'), (rU - rr >= 0 ? '+' : '') + Fmt.num(rU - rr, 3), T(`de ${fr(rr)} a ${fr(rU)}`, `from ${fr(rr)} to ${fr(rU)}`)],
  ] : [[T('Valores fuera de rango', 'Values out of range'), '—', T('|r| < 1 y desviaciones estándar positivas', '|r| < 1 and positive standard deviations'), 'warn']]);
  res().corrections = { attenuation: okA ? { r, rxx, ryy, corrected: rc } : null, restriction: okR ? { r: rr, s, S: Sd, U, case: cs, rxz, ryz, corrected: rU } : null };
  /* the case II curve against U for several restricted r, the current one in front */
  const Us = Array.from({ length: 121 }, (_, i) => 1 + i * 0.025), series = [];
  [0.1, 0.3, 0.5, 0.7].forEach(r0 => series.push({ x: Us, y: Us.map(u => Infer.caseII(r0, u)), cls: 'b12-faint', label: i18nR(r0) }));
  if (okR && cs === 'II' && Math.abs(rr) < 1) series.push({ x: Us, y: Us.map(u => Infer.caseII(rr, u)), cls: 'b12-main', label: T(`tu r = ${fr(rr)}`, `your r = ${fr(rr)}`) });
  el('b12RFig').innerHTML = Plot.curves({ series, points: okR && cs === 'II' && U >= 1 && U <= 4 ? [{ x: U, y: rU, cls: 'b12-dot' }] : [], xlim: [1, 4], ylim: [0, 1], w: 620, h: 300, xlab: T('U = DE sin restricción / DE restringida', 'U = unrestricted SD / restricted SD'), ylab: T('r corregida (caso II)', 'corrected r (case II)'), plot: 'b12-caseII', endLabels: true, label: T('Corrección del caso II', 'Case II correction') });
}
const i18nR = r0 => `r = ${fr(r0)}`;

/* ================= power and sample size ================= */
function runPlan() {
  const rho = +el('b12PR').value, n = +el('b12PN').value, alpha = +el('b12PA').value, alt = el('b12PAlt').value, target = +el('b12PPow').value, w = +el('b12PW').value;
  el('b12PRv').textContent = Fmt.bounded(rho, 2); el('b12PNv').textContent = n;
  const pe = Infer.powerExact(rho, n, alpha, alt), pa = Infer.powerApprox(rho, n, alpha, alt);
  const NE = Infer.sampleSize(rho, target, alpha, alt, true), NA = Infer.sampleSize(rho, target, alpha, alt, false), NW = Infer.nForWidth(rho, w, 0.95);
  const tq = Num.qt(1 - (alt === 'two.sided' ? alpha / 2 : alpha), n - 2), rc = Math.sqrt(tq * tq / (tq * tq + n - 2));
  res().plan = { rho, n, alpha, alt, powerExact: pe, powerApprox: pa, target, nExact: NE.n, nApprox: NA.n, width: w, nWidth: NW.n, rc };
  statTiles('b12PTiles', [
    [T('Potencia exacta', 'Exact power'), Fmt.num(100 * pe, 1) + ' %', T(`aproximada ${Fmt.num(100 * pa, 1)} %`, `approximate ${Fmt.num(100 * pa, 1)}%`), pe >= target ? 'ok' : 'warn'],
    [sym(T(`n para ${Math.round(100 * target)} % de potencia`, `n for ${Math.round(100 * target)}% power`)), String(NE.n), T(`exacta · aproximada ${NA.n}`, `exact · approximate ${NA.n}`)],
    [sym(T(`n para un IC 95 % de ± ${Fmt.bounded(w, 2)}`, `n for a 95% CI of ± ${Fmt.bounded(w, 2)}`)), String(NW.n), isFinite(NW.lo) ? `[${fr(NW.lo)}, ${fr(NW.hi)}]` : ''],
    [sym(T('r crítica', 'Critical r')), (alt === 'two.sided' ? '± ' : '') + fr(rc), T(`la menor |r| significativa con n = ${n}`, `the smallest significant |r| with n = ${n}`)],
  ]);
  /* the two sampling distributions, with the rejection region shaded */
  const sd1 = (1 - rho * rho) / Math.sqrt(n - 1), sd0 = 1 / Math.sqrt(n - 1);
  const xl = [Math.max(-0.999, Math.min(-rc, -4 * sd0) - 0.08), Math.min(0.999, Math.max(rho + 5 * sd1, rc + 0.08))];
  const K = 360, xs = Array.from({ length: K + 1 }, (_, i) => xl[0] + (xl[1] - xl[0]) * i / K);
  const d0 = xs.map(x => Infer.densityR(x, 0, n)), d1 = xs.map(x => Infer.densityR(x, rho, n));
  const cut = (d, side) => { const X = [], Y = []; xs.forEach((x, i) => { if (side > 0 ? x >= rc : x <= -rc) { X.push(x); Y.push(d[i]); } }); return { X, Y }; };
  const series = [];
  const addRegion = (d, cls, side) => { const c = cut(d, side); if (c.X.length > 1) { if (side > 0) { c.X.unshift(rc); c.Y.unshift(Infer.densityR(rc, d === d0 ? 0 : rho, n)); } else { c.X.push(-rc); c.Y.push(Infer.densityR(-rc, d === d0 ? 0 : rho, n)); } series.push({ x: c.X, y: c.Y, cls, fill: true }); } };
  addRegion(d1, 'b12-pow', 1); if (alt === 'two.sided') addRegion(d1, 'b12-pow', -1);
  addRegion(d0, 'b12-alpha', 1); if (alt === 'two.sided') addRegion(d0, 'b12-alpha', -1);
  series.push({ x: xs, y: d0, cls: 'b12-h0', label: T('H₀: ρ = 0', 'H₀: ρ = 0') }, { x: xs, y: d1, cls: 'b12-h1', label: T(`ρ = ${Fmt.bounded(rho, 2)} (potencia sombreada)`, `ρ = ${Fmt.bounded(rho, 2)} (power shaded)`) });
  const ymax = Math.max(...d0, ...d1) * 1.12;
  el('b12PDist').innerHTML = Plot.curves({ series, bands: [{ lo: rc - 0.0015, hi: rc + 0.0015, cls: 'b12-crit' }].concat(alt === 'two.sided' ? [{ lo: -rc - 0.0015, hi: -rc + 0.0015, cls: 'b12-crit' }] : []), xlim: xl, ylim: [0, ymax], w: 460, h: 300, xlab: T(`r de una muestra de ${n}`, `r of a sample of ${n}`), ylab: T('densidad', 'density'), plot: 'b12-dist', label: T('Distribuciones de r', 'Distributions of r') });
  /* power against n for a few ρ */
  const nMax = Math.min(5000, Math.max(60, Math.ceil(1.6 * Math.max(NA.n, n)))), ns = Array.from({ length: 120 }, (_, i) => Math.round(5 + (nMax - 5) * i / 119));
  const rhos = [...new Set([0.1, 0.2, 0.3, 0.5, +rho.toFixed(2)])].sort((x, y) => x - y);
  const pc = rhos.map(r0 => ({ x: ns, y: ns.map(k => Infer.powerApprox(r0, k, alpha, alt)), cls: Math.abs(r0 - rho) < 1e-9 ? 'b12-main' : 'b12-faint', label: `ρ = ${Fmt.bounded(r0, 2)}` }));
  pc.push({ x: [5, nMax], y: [target, target], cls: 'b12-target' });
  el('b12PCurve').innerHTML = Plot.curves({ series: pc, points: [{ x: n, y: pe, cls: 'b12-dot', label: T(`n = ${n}: ${Fmt.num(100 * pe, 1)} %`, `n = ${n}: ${Fmt.num(100 * pe, 1)}%`) }], xlim: [5, nMax], ylim: [0, 1], w: 460, h: 300, xlab: 'n', ylab: T('potencia', 'power'), plot: 'b12-power', endLabels: true, label: T('Potencia según n', 'Power by n') });
}
function runBF() {
  const r = num('b12BR'), n = Math.round(num('b12BN')), kappa = +el('b12BK').value;
  if (!(Math.abs(r) < 1 && n >= 4)) { statTiles('b12BTiles', [[T('Valores fuera de rango', 'Values out of range'), '—', '|r| < 1, n ≥ 4', 'warn']]); return; }
  const B = PairStat.bayes(r, n, { kappa }), ev = PairStat.evidence(B.BF10), side = r >= 0 ? B.logBFplus : B.logBFminus;
  const show = lg => (Math.abs(lg) > Math.log(1e6) ? (lg > 0 ? '> 10⁶' : '< 10⁻⁶') : Fmt.num(Math.exp(lg), Math.exp(lg) >= 10 ? 1 : 3));
  res().bayes = { r, n, kappa, BF10: B.BF10, logBF10: B.logBF10, post: B.post };
  statTiles('b12BTiles', [
    ['BF₁₀', show(B.logBF10), T(ev.es, ev.en), ev.favours === 'h1' ? 'ok' : ev.favours === 'h0' ? 'warn' : ''],
    ['BF₀₁', show(-B.logBF10), T('a favor de ρ = 0', 'for ρ = 0')],
    [r >= 0 ? 'BF₊₀' : 'BF₋₀', show(side), T(r >= 0 ? 'unilateral, ρ > 0' : 'unilateral, ρ < 0', r >= 0 ? 'one-sided, ρ > 0' : 'one-sided, ρ < 0')],
    [T('ρ a posteriori', 'Posterior ρ'), fr(B.post.median), `${T('intervalo creíble 95 %', '95% credible interval')} [${fr(B.post.lo)}, ${fr(B.post.hi)}]`],
  ]);
}

/* ================= meta-analysis ================= */
/* the example is simulated, and says so: sixteen studies around a true correlation of .25 with
   heterogeneity τ = 0.10 on Fisher's z scale and sample sizes from 40 to 800; always the same sixteen */
function simStudies() {
  const rnd = Num.rng(1212), out = [];
  for (let i = 0; i < 16; i++) {
    const n = Math.round(40 * Math.exp(3 * rnd()));
    const theta = Math.atanh(0.25) + 0.10 * rnd.normal();
    const z = theta + rnd.normal() / Math.sqrt(n - 3);
    out.push([T('Estudio ', 'Study ') + String(i + 1).padStart(2, '0'), Math.round(1000 * Math.tanh(z)) / 1000, n]);
  }
  return out;
}
function parseStudies(txt) {
  const out = [], bad = [];
  txt.split(/\r?\n/).forEach((line, i) => {
    const s = line.trim();
    if (!s || s[0] === '#') return;
    let parts;
    if (s.includes(';')) parts = s.split(';');
    else if (s.includes('\t')) parts = s.split('\t');
    else { const m = s.match(/^(.*?)[\s,]+(-?[\d.]+)[\s,]+(\d+)$/); parts = m ? [m[1], m[2], m[3]] : [s]; }
    parts = parts.map(p => p.trim());
    if (parts.length === 2) parts.unshift(T(`Estudio ${out.length + 1}`, `Study ${out.length + 1}`));
    const r = parseFloat(String(parts[1]).replace(',', '.')), n = parseFloat(String(parts[2]).replace(',', '.'));
    if (parts.length < 3 || !(Math.abs(r) < 1) || !(n > 3)) { bad.push(i + 1); return; }
    out.push({ name: parts[0] || T(`Estudio ${out.length + 1}`, `Study ${out.length + 1}`), r, n });
  });
  return { studies: out, bad };
}
function paintMetaCols() {
  const ds = state.data, box = el('b12MetaCols');
  if (!ds) { box.hidden = true; showMessage('b12MetaMsgs', 'info', L2('No hay datos abiertos: escribe los estudios o usa el ejemplo.', 'No data are open: type the studies or use the example.')); return; }
  const all = ds.cols.filter(c => c.type !== 'empty'), cs = conts(ds);
  const mc = S.metaCols = S.metaCols || {};
  const guess = re => (cs.find(c => re.test(c.name)) || {}).key;
  if (!cs.some(c => c.key === mc.r)) mc.r = guess(/^(r|ri|cor|corr|correlaci)/i) || (cs[0] || {}).key;
  if (!cs.some(c => c.key === mc.n)) mc.n = guess(/^(n|ni|size|tama)/i) || (cs[1] || cs[0] || {}).key;
  box.hidden = false;
  box.innerHTML = `<div class="field"><label for="b12McName">${esc(T('Nombre del estudio', 'Study name'))}</label><select id="b12McName"><option value="">${esc(T('(número de renglón)', '(row number)'))}</option>${all.map(c => opt(c.key, label(c), c.key === mc.name)).join('')}</select></div>` +
    `<div class="field"><label for="b12McR"><span class="nc">r</span></label><select id="b12McR">${cs.map(c => opt(c.key, label(c), c.key === mc.r)).join('')}</select></div>` +
    `<div class="field"><label for="b12McN"><span class="nc">n</span></label><select id="b12McN">${cs.map(c => opt(c.key, label(c), c.key === mc.n)).join('')}</select></div>` +
    `<div class="field"><button type="button" class="btn btn-secondary btn-sm" id="b12McGo">${esc(T('Pasar al texto y combinar', 'Copy to the text and combine'))}</button></div>`;
}
function metaFromCols() {
  const ds = state.data, mc = S.metaCols;
  mc.name = el('b12McName').value; mc.r = el('b12McR').value; mc.n = el('b12McN').value;
  const R = Data.col(ds, mc.r).num, N = Data.col(ds, mc.n).num, NM = mc.name ? Data.col(ds, mc.name) : null;
  const lines = [];
  for (let i = 0; i < ds.n; i++) if (isFinite(R[i]) && isFinite(N[i])) lines.push(`${NM ? String(NM.raw ? NM.raw[i] : (NM.levels ? NM.levels[NM.num[i]] : NM.num[i])).replace(/;/g, ',') : T('Estudio ', 'Study ') + (i + 1)}; ${R[i]}; ${N[i]}`);
  el('b12MetaTxt').value = lines.join('\n');
  runMeta();
}
function runMeta() {
  clearMessages('b12MetaMsgs');
  const P = parseStudies(el('b12MetaTxt').value);
  if (P.bad.length) showMessage('b12MetaMsgs', 'warn', L2(`Renglones ignorados (r fuera de (−1, 1), n ≤ 3 o formato): ${P.bad.join(', ')}.`, `Lines ignored (r outside (−1, 1), n ≤ 3 or format): ${P.bad.join(', ')}.`));
  if (P.studies.length < 2) { el('b12MetaRes').hidden = true; if (!P.bad.length) showMessage('b12MetaMsgs', 'info', L2('Escribe al menos dos estudios, o usa el ejemplo.', 'Type at least two studies, or use the example.')); return; }
  el('b12MetaRes').hidden = false;
  const st = P.studies, M = Infer.meta(st), key = el('b12MetaModel').value, A = M[key];
  res().meta = { studies: st, model: key, out: M };
  const Hs = M.hs, eg = M.egger;
  statTiles('b12MetaTiles', [
    [sym(T('r combinada', 'Pooled r')), fr(A.r), `${T("IC 95 %", "95% CI")} [${fr(A.rci[0])}, ${fr(A.rci[1])}] · ${pTxt(A.p)}`, A.p < 0.05 ? 'ok' : 'warn'],
    [T('Intervalo de predicción', 'Prediction interval'), key === 'fixed' ? '—' : `[${fr(A.rpi[0])}, ${fr(A.rpi[1])}]`, T('dónde caería la ρ de un estudio nuevo', 'where the ρ of a new study would fall')],
    ['τ · I²', key === 'fixed' ? `0 · ${Fmt.num(100 * M.fixed.I2, 1)} %` : `${Fmt.num(Math.sqrt(A.tau2), 3)} · ${Fmt.num(100 * A.I2, 1)} %`, `Q(${M.df}) = ${Fmt.num(M.Q, 2)} · ${pTxt(M.pQ)}`, M.pQ < 0.1 ? 'warn' : 'ok'],
    eg ? [T('Asimetría (Egger)', 'Asymmetry (Egger)'), Fmt.num(eg.intercept, 2), `t(${eg.df}) = ${Fmt.num(eg.t, 2)} · ${pTxt(eg.p)}`, eg.p < 0.1 ? 'warn' : 'ok'] : null,
    [T('Hunter–Schmidt', 'Hunter–Schmidt'), fr(Hs.rbar), T(`el muestreo explica ${Fmt.num(Hs.pctExplained, 0)} % de la varianza`, `sampling explains ${Fmt.num(Hs.pctExplained, 0)}% of the variance`)],
  ]);
  el('b12Forest').innerHTML = forest(st, M, key);
  el('b12Funnel').innerHTML = funnel(M);
  el('b12MetaText').innerHTML = metaWords(M, A, key);
  const rows = [['fixed', M.fixed], ['dl', M.dl], ['reml', M.reml], ['hsz', M.hsz]];
  el('b12MetaTable').innerHTML = `<table><thead><tr><th>${L2('Modelo', 'Model')}</th><th class="num">r</th><th>${L2('IC 95 %', '95% CI')}</th><th>${L2('Predicción', 'Prediction')}</th><th class="num">τ²</th><th class="num">I²</th></tr></thead><tbody>` +
    rows.map(([k, m]) => `<tr${k === key ? ' class="b12-rec"' : ''}><td>${esc(T(m.es, m.en))}</td><td class="num"><b>${fr(m.r)}</b></td><td class="nw">[${fr(m.rci[0])}, ${fr(m.rci[1])}]</td><td class="nw">${k === 'fixed' ? '—' : `[${fr(m.rpi[0])}, ${fr(m.rpi[1])}]`}</td><td class="num">${Fmt.num(m.tau2, 4)}</td><td class="num">${Fmt.num(100 * m.I2, 1)} %</td></tr>`).join('') +
    `</tbody></table><p class="hint">${L2(`Hunter–Schmidt sobre r: r̄ = ${fr(Hs.rbar)}, DE de ρ = ${Fmt.num(Hs.sdRho, 3)}, intervalo de credibilidad 80 % [${fr(Hs.cred[0])}, ${fr(Hs.cred[1])}]; N total = ${Hs.N}.`, `Hunter–Schmidt on r: r̄ = ${fr(Hs.rbar)}, SD of ρ = ${Fmt.num(Hs.sdRho, 3)}, 80% credibility interval [${fr(Hs.cred[0])}, ${fr(Hs.cred[1])}]; total N = ${Hs.N}.`)}</p>`;
}
/* the reading in words */
function metaWords(M, A, key) {
  const Hs = M.hs, eg = M.egger, k = M.k;
  const het = A.I2 < 0.25 ? ['baja', 'low'] : A.I2 < 0.5 ? ['moderada', 'moderate'] : A.I2 < 0.75 ? ['considerable', 'substantial'] : ['alta', 'high'];
  let s = '<p>' + L2(`Los ${k} estudios (N = ${Hs.N}) dan una correlación promedio de ${fr(A.r)} (IC 95 % de ${fr(A.rci[0])} a ${fr(A.rci[1])}).`, `The ${k} studies (N = ${Hs.N}) give an average correlation of ${fr(A.r)} (95% CI from ${fr(A.rci[0])} to ${fr(A.rci[1])}).`) + '</p>';
  if (key === 'fixed') s += '<p>' + L2(`El efecto fijo supone una sola ρ para todos; Q(${M.df}) = ${Fmt.num(M.Q, 2)}, ${pTxt(M.pQ)}${M.pQ < 0.1 ? ': los datos no lo apoyan, considera efectos aleatorios' : ''}.`, `The fixed effect assumes one ρ for all; Q(${M.df}) = ${Fmt.num(M.Q, 2)}, ${pTxt(M.pQ)}${M.pQ < 0.1 ? ': the data do not support it, consider random effects' : ''}.`) + '</p>';
  else s += '<p>' + L2(`La heterogeneidad es ${het[0]} (I² = ${Fmt.num(100 * A.I2, 1)} %, τ = ${Fmt.num(Math.sqrt(A.tau2), 3)} en la escala z): un estudio nuevo podría encontrar una correlación entre ${fr(A.rpi[0])} y ${fr(A.rpi[1])}.`, `Heterogeneity is ${het[1]} (I² = ${Fmt.num(100 * A.I2, 1)}%, τ = ${Fmt.num(Math.sqrt(A.tau2), 3)} on the z scale): a new study could find a correlation between ${fr(A.rpi[0])} and ${fr(A.rpi[1])}.`) + '</p>';
  if (eg) s += '<p>' + (eg.p < 0.1
    ? L2(`La prueba de Egger encuentra asimetría (p = ${Fmt.pValue(eg.p)}): los estudios pequeños dan correlaciones ${eg.intercept > 0 ? 'mayores' : 'menores'}; puede ser sesgo de publicación o diferencias reales entre estudios.`, `Egger’s test finds asymmetry (p = ${Fmt.pValue(eg.p)}): small studies give ${eg.intercept > 0 ? 'larger' : 'smaller'} correlations; it may be publication bias or real differences between studies.`)
    : L2(`La prueba de Egger no encuentra asimetría en el embudo (p = ${Fmt.pValue(eg.p)}); eso no prueba que no haya sesgo de publicación: con pocos estudios tiene poca potencia.`, `Egger’s test finds no asymmetry in the funnel (p = ${Fmt.pValue(eg.p)}); that does not prove there is no publication bias: with few studies it has little power.`)) + '</p>';
  s += '<p>' + L2(`Hunter y Schmidt: el error de muestreo explica ${Fmt.num(Hs.pctExplained, 0)} % de la varianza observada entre estudios${Hs.pctExplained >= 75 ? ', lo bastante para pensar en una sola ρ (regla del 75 %)' : ''}.`, `Hunter and Schmidt: sampling error explains ${Fmt.num(Hs.pctExplained, 0)}% of the observed variance between studies${Hs.pctExplained >= 75 ? ', enough to think of a single ρ (the 75% rule)' : ''}.`) + '</p>';
  return s;
}
/* the forest plot: one row per study, squares by weight, the diamond of the model and its prediction interval */
function forest(st, M, key) {
  /* the column of names is as wide as the longest one, and never narrower than the label of the model, in bold */
  const A = M[key], k = st.length, W = 780, rowH = 22, right = 190;
  const lab = Math.min(230, 20 + Math.max(6.3 * Math.max(...st.map(s => Math.min(30, s.name.length))), 7.2 * T(A.es, A.en).length));
  const top = 26, H = top + (k + 2.6) * rowH + 44, x0 = lab, x1 = W - right, y0 = H - 40, y1 = 8;
  const cis = st.map(s => fisherCI(s.r, s.n, 0.95));
  const lo = Math.min(...cis.map(c => c[0]), A.rpi ? A.rpi[0] : 0, 0), hi = Math.max(...cis.map(c => c[1]), A.rpi ? A.rpi[1] : 0, 0);
  const ex = [Math.max(-1, Math.floor(lo * 10) / 10 - 0.05), Math.min(1, Math.ceil(hi * 10) / 10 + 0.05)], sx = Plot.scale(ex[0], ex[1], x0, x1);
  let s = Plot.open(W, H, { plot: 'b12-forest' }, { x0, x1, y0, y1, ex, ey: [0, k + 2] }, T('Gráfico de bosque', 'Forest plot'));
  const xt = Plot.ticks(ex[0], ex[1], 8);
  s += `<g data-role="grid" class="pl-grid">${xt.ticks.map(v => `<line x1="${sx(v).toFixed(1)}" y1="${top - 6}" x2="${sx(v).toFixed(1)}" y2="${y0}"/>`).join('')}</g>`;
  s += `<g data-role="axis" class="pl-axis"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}"/></g><g class="pl-tick" data-role="xtick">${xt.ticks.map(v => `<line x1="${sx(v).toFixed(1)}" y1="${y0}" x2="${sx(v).toFixed(1)}" y2="${y0 + 4}"/><text x="${sx(v).toFixed(1)}" y="${y0 + 15}" text-anchor="middle">${Plot.tickLabel(v, xt.step)}</text>`).join('')}</g>`;
  s += `<text class="pl-lab" data-role="xlab" x="${((x0 + x1) / 2).toFixed(1)}" y="${y0 + 32}" text-anchor="middle">${esc(T('Correlación e IC 95 %', 'Correlation and 95% CI'))}</text>`;
  if (ex[0] < 0 && ex[1] > 0) s += `<line class="pl-ref0" x1="${sx(0).toFixed(1)}" y1="${top - 6}" x2="${sx(0).toFixed(1)}" y2="${y0}"/>`;
  s += `<line class="b12-pool" x1="${sx(A.r).toFixed(1)}" y1="${top - 6}" x2="${sx(A.r).toFixed(1)}" y2="${y0}"/>`;
  s += `<text class="b12-fh" x="${lab - 10}" y="${top - 10}" text-anchor="end">${esc(T('Estudio', 'Study'))}</text><text class="b12-fh" x="${x1 + 12}" y="${top - 10}"><tspan class="nc">r</tspan> ${esc(T('[IC 95 %]', '[95% CI]'))}</text><text class="b12-fh" x="${W - 10}" y="${top - 10}" text-anchor="end">${esc(T('Peso', 'Weight'))}</text>`;
  const wmax = Math.max(...A.weights);
  st.forEach((d, i) => {
    const Y = top + i * rowH + rowH / 2, c = cis[i], side = 4 + 9 * Math.sqrt(A.weights[i] / wmax);
    s += `<g class="b12-study">${i % 2 ? '' : `<rect class="fr-bg" x="0" y="${(Y - rowH / 2).toFixed(1)}" width="${W}" height="${rowH}"/>`}<text class="fr-lab" x="${lab - 10}" y="${(Y + 4).toFixed(1)}" text-anchor="end">${esc(short(d.name, 34))}</text>` +
      `<line class="b12-sci" x1="${sx(Math.max(ex[0], c[0])).toFixed(1)}" y1="${Y.toFixed(1)}" x2="${sx(Math.min(ex[1], c[1])).toFixed(1)}" y2="${Y.toFixed(1)}"/>` +
      `<rect class="b12-sq" x="${(sx(d.r) - side / 2).toFixed(1)}" y="${(Y - side / 2).toFixed(1)}" width="${side.toFixed(1)}" height="${side.toFixed(1)}"/>` +
      `<text class="fr-val" x="${x1 + 12}" y="${(Y + 4).toFixed(1)}">${fr(d.r)} [${fr(c[0])}, ${fr(c[1])}]</text><text class="fr-val" x="${W - 10}" y="${(Y + 4).toFixed(1)}" text-anchor="end">${Fmt.num(100 * A.weights[i], 1)} %</text></g>`;
  });
  const Yd = top + (k + 0.9) * rowH, dia = (m, Y, cls) => `<path class="${cls}" d="M${sx(m.rci[0]).toFixed(1)} ${Y.toFixed(1)}L${sx(m.r).toFixed(1)} ${(Y - 7).toFixed(1)}L${sx(m.rci[1]).toFixed(1)} ${Y.toFixed(1)}L${sx(m.r).toFixed(1)} ${(Y + 7).toFixed(1)}Z"/>`;
  if (key !== 'fixed') s += `<line class="b12-pi" x1="${sx(Math.max(ex[0], A.rpi[0])).toFixed(1)}" y1="${Yd.toFixed(1)}" x2="${sx(Math.min(ex[1], A.rpi[1])).toFixed(1)}" y2="${Yd.toFixed(1)}"/>`;
  s += dia(A, Yd, 'b12-dia') + `<text class="fr-lab b12-dl" x="${lab - 10}" y="${(Yd + 4).toFixed(1)}" text-anchor="end">${esc(T(A.es, A.en))}</text><text class="fr-val b12-dl" x="${x1 + 12}" y="${(Yd + 4).toFixed(1)}">${fr(A.r)} [${fr(A.rci[0])}, ${fr(A.rci[1])}]</text>`;
  if (key !== 'fixed') s += `<text class="b12-pil" x="${lab - 10}" y="${(Yd + rowH).toFixed(1)}" text-anchor="end">${esc(T('predicción', 'prediction'))}</text><text class="fr-val" x="${x1 + 12}" y="${(Yd + rowH).toFixed(1)}">[${fr(A.rpi[0])}, ${fr(A.rpi[1])}]</text>`;
  return s + '</svg>';
}
/* the funnel: Fisher's z against its standard error (0 on top), the 95 % funnel around the fixed effect and Egger's line */
function funnel(M) {
  /* the legend goes under the axis: inside, it would cross the funnel's lines */
  const W = 420, H = 356, m = { l: 56, r: 14, t: 12, b: 70 }, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const se = M.v.map(Math.sqrt), seMax = Math.max(...se) * 1.08, mu = M.fixed.mu;
  const ex = Plot.extent(M.y.concat([mu - 1.96 * seMax, mu + 1.96 * seMax]), 0.04), ey = [0, seMax];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(0, seMax, y1, y0);
  let s = Plot.open(W, H, { plot: 'b12-funnel' }, { x0, x1, y0, y1, ex, ey: [seMax, 0] }, T('Embudo', 'Funnel'));
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 7), yt: Plot.ticks(0, seMax, 5), xlab: T('z de Fisher (z = atanh r)', 'Fisher’s z (z = atanh r)'), ylab: T('error estándar', 'standard error') });
  s += `<path class="b12-fun" d="M${sx(mu - 1.96 * seMax).toFixed(1)} ${sy(seMax).toFixed(1)}L${sx(mu).toFixed(1)} ${sy(0).toFixed(1)}L${sx(mu + 1.96 * seMax).toFixed(1)} ${sy(seMax).toFixed(1)}"/>`;
  s += `<line class="b12-pool" x1="${sx(mu).toFixed(1)}" y1="${y1}" x2="${sx(mu).toFixed(1)}" y2="${y0}"/>`;
  if (M.egger) { const e = M.egger, zAt = sv => e.slope + e.intercept * sv; s += `<line class="b12-egger" x1="${sx(zAt(0)).toFixed(1)}" y1="${sy(0).toFixed(1)}" x2="${sx(zAt(seMax)).toFixed(1)}" y2="${sy(seMax).toFixed(1)}"/>`; }
  M.y.forEach((z, i) => { s += `<circle class="b12-fd" cx="${sx(z).toFixed(1)}" cy="${sy(se[i]).toFixed(1)}" r="4"/>`; });
  s += `<g data-role="legend" class="pl-legend" transform="translate(${x0} ${y0 + 50})"><line data-li="0" class="b12-fun" x1="0" y1="4" x2="18" y2="4"/><text data-li="0" x="24" y="8">${esc(T('embudo 95 % (efecto fijo)', '95% funnel (fixed effect)'))}</text>` +
    (M.egger ? `<line data-li="1" class="b12-egger" x1="190" y1="4" x2="208" y2="4"/><text data-li="1" x="214" y="8">${esc(T('recta de Egger', 'Egger’s line'))}</text>` : '') + '</g>';
  return s + '</svg>';
}

/* ---------------- wiring ---------------- */
function onData() {
  paintFrom();
  if (S.sec === 'mat') runMat(); else paintMat();
}
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-12')) return;
  paintNums();
  el('b12MetaTxt').placeholder = 'Estudio A; 0.32; 85\nEstudio B; 0.18; 140';
  el('panel-12').querySelector('.b12-bar').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) showSec(b.dataset.sec); });
  el('b12Design').addEventListener('change', () => { S.design = el('b12Design').value; paintNums(); paintFrom(); runCmp(); });
  ['b12Alt', 'b12Conf'].forEach(id => el(id).addEventListener('change', runCmp));
  el('b12Nums').addEventListener('input', () => { S.names = null; runCmp(); });
  el('b12FromGrid').addEventListener('change', e => { const t = e.target.closest('[data-role]'); if (!t) return; const f = S.from[S.design]; f[t.dataset.role] = t.dataset.role === 'a' || t.dataset.role === 'b' ? +t.value : t.value; if (t.dataset.role === 'g') { f.a = 0; f.b = 1; paintFrom(); } });
  el('b12FromGo').addEventListener('click', fromData);
  el('b12Iris').addEventListener('click', () => {
    B2.loadExample('iris');
    const ds = state.data, key = nm => (ds.cols.find(c => c.key === nm || c.name === nm) || {}).key;
    S.design = 'indep'; el('b12Design').value = 'indep';
    S.from.indep = { j: key('sepal_length'), k: key('petal_length'), g: (groupCols(ds)[0] || {}).key, a: 0, b: 1 };
    goStep(12); showSec('cmp'); paintNums(); paintFrom(); el('b12From').open = true; fromData();
  });
  el('b12MIris').addEventListener('click', () => { B2.loadExample('iris'); S.mat = { group: null, a: 0, b: 1, keys: null }; goStep(12); showSec('mat'); });
  el('b12MGroup').addEventListener('change', () => { S.mat.group = el('b12MGroup').value; S.mat.a = 0; S.mat.b = 1; runMat(); });
  el('b12MA').addEventListener('change', () => { S.mat.a = +el('b12MA').value; runMat(); });
  el('b12MB').addEventListener('change', () => { S.mat.b = +el('b12MB').value; runMat(); });
  el('b12MCoef').addEventListener('change', runMat);
  el('b12MVars').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, ks = S.mat.keys, i = ks.indexOf(k); if (i >= 0) ks.splice(i, 1); else ks.push(k); runMat(); });
  ['b12AR', 'b12AX', 'b12AY', 'b12RR', 'b12Rs', 'b12RS', 'b12Rxz', 'b12Ryz'].forEach(id => el(id).addEventListener('input', runCor));
  el('b12RCase').addEventListener('change', runCor);
  let raf = 0;
  const plan = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(runPlan); };
  ['b12PR', 'b12PN'].forEach(id => el(id).addEventListener('input', plan));
  ['b12PA', 'b12PAlt', 'b12PPow', 'b12PW'].forEach(id => el(id).addEventListener('change', runPlan));
  ['b12BR', 'b12BN'].forEach(id => el(id).addEventListener('input', runBF));
  el('b12BK').addEventListener('change', runBF);
  el('b12MetaGo').addEventListener('click', runMeta);
  el('b12MetaModel').addEventListener('change', runMeta);
  el('b12MetaEx').addEventListener('click', () => { el('b12MetaTxt').value = simStudies().map(m => m.join('; ')).join('\n'); runMeta(); showMessage('b12MetaMsgs', 'info', L2('Conjunto simulado: 16 estudios alrededor de una correlación verdadera de .25, con heterogeneidad entre estudios (τ = 0.10 en la escala z) y de 40 a 800 casos cada uno. No son datos reales.', 'Simulated set: 16 studies around a true correlation of .25, with heterogeneity between studies (τ = 0.10 on the z scale) and 40 to 800 cases each. These are not real data.')); });
  el('b12MetaData').addEventListener('click', () => { clearMessages('b12MetaMsgs'); paintMetaCols(); });
  el('b12MetaCols').addEventListener('click', e => { if (e.target.closest('#b12McGo')) metaFromCols(); });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 12) paint(); });
document.addEventListener('langchange', () => { paintNums(); paintFrom(); if (!el('b12MetaCols').hidden) paintMetaCols(); paint(); });
document.addEventListener('fmtchange', paint);
document.addEventListener('palettechange', () => { if (S.sec === 'mat') runMat(); });
window.B12 = { state: S, parseStudies };
})();
