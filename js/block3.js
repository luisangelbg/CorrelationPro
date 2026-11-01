/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 3, exploration and assumptions: the scatterplot
   matrix, the normality of each variable and of the set, multivariate
   outliers (classical and robust), the assumptions of each pair with the
   coefficient it asks for, and one pair seen closely (ellipses, residuals,
   influence). Listens to `datachange`; the result goes to state.explore. */
(function () {
'use strict';
const B3 = {};
const NUMERIC = ['continuous', 'ordinal'];
const MAXV = 10, MAXN_MULTI = 2500, MAXPTS = 1500;
const S = { keys: null, group: '', smooth: 'lowess', uni: null, pair: null, dirty: true };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function cands(ds) { return ds.cols.filter(c => c.role === 'var' && NUMERIC.includes(c.type)); }
function groupCands(ds) { return ds.cols.filter(c => c.role !== 'exclude' && ['nominal', 'binary'].includes(c.type) && c.levels && c.levels.length >= 2 && c.levels.length <= 8); }
const P = v => (isFinite(v) ? Fmt.pValue(v) : '—');
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const lvlP = (p, a, b) => (!isFinite(p) ? '' : p < (a || 0.01) ? 'bad' : p < (b || 0.05) ? 'warn' : 'ok');

/* ---------------- setting up after new data ---------------- */
function onData() {
  const ds = state.data;
  el('b3Empty').hidden = !!ds;
  el('b3Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds);
  const keep = S.keys ? S.keys.filter(k => cs.some(c => c.key === k)) : [];
  S.keys = keep.length >= 2 ? keep : cs.slice(0, 8).map(c => c.key);
  const gs = groupCands(ds);
  if (!gs.some(c => c.key === S.group)) { const g = gs.find(c => c.role === 'group'); S.group = g ? g.key : ''; }
  S.uni = S.uni && S.keys.includes(S.uni) ? S.uni : S.keys[0] || null;
  if (!S.pair || !S.keys.includes(S.pair[0]) || !S.keys.includes(S.pair[1])) S.pair = S.keys.length > 1 ? [S.keys[0], S.keys[1]] : null;
  paintControls();
  S.dirty = true;
  state.explore = null;
  if (el('panel-3').classList.contains('active')) run();
}
function paintControls() {
  const ds = state.data, cs = cands(ds);
  el('b3Vars').innerHTML = cs.length ? cs.map(c => `<button type="button" class="chip${S.keys.includes(c.key) ? ' on' : ''}" data-k="${c.key}" aria-pressed="${S.keys.includes(c.key)}">${esc(label(c))}${c.type === 'ordinal' ? ' <small>' + L2('ord.', 'ord.') + '</small>' : ''}</button>`).join('')
    : `<p class="hint">${L2('No hay variables numéricas con papel «variable». Revisa los tipos en el Bloque 2.', 'There are no numeric variables with the role «variable». Check the kinds in Block 2.')}</p>`;
  const gs = groupCands(ds);
  el('b3Group').innerHTML = `<option value="">${esc(T('Sin grupos', 'No groups'))}</option>` + gs.map(c => `<option value="${c.key}">${esc(label(c))} (${c.levels.length})</option>`).join('');
  el('b3Group').value = S.group;
  el('b3Smooth').value = S.smooth;
}

/* ---------------- the computation ---------------- */
function compute() {
  const ds = state.data, keys = S.keys, cols = keys.map(k => Data.col(ds, k));
  const G = S.group ? Data.col(ds, S.group) : null;
  const R = { keys, group: S.group, uni: {}, pairs: {}, stats: [], mv: null, n: ds.n };
  /* each variable */
  cols.forEach(c => {
    const v = Array.from(c.num).filter(isFinite), n = v.length;
    const u = { key: c.key, n, mean: Num.mean(v), sd: n > 1 ? Num.sd(v) : NaN };
    const m = n > 2 ? Assume.moments(v) : { skew: NaN, kurt: NaN };
    u.skew = m.skew; u.kurt = m.kurt;
    u.sw = n >= 3 && n <= 5000 ? Assume.shapiro(v) : { W: NaN, p: NaN };
    u.ad = n >= 8 ? Assume.anderson(v) : { A2: NaN, p: NaN };
    R.uni[c.key] = u;
  });
  /* each pair */
  for (let i = 0; i < keys.length; i++) {
    R.stats.push([]);
    for (let j = 0; j < keys.length; j++) R.stats[i].push(null);
  }
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const pr = Data.pairFor(ds, keys[i], keys[j]);
    if (pr.n < 5) { R.pairs[keys[i] + '|' + keys[j]] = { n: pr.n, few: true }; continue; }
    let groups = null;
    if (G) { const gg = pr.rows.map(r => G.num[r]); if (gg.every(isFinite)) groups = gg; }
    const ord = cols[i].type === 'ordinal' || cols[j].type === 'ordinal';
    const pc = Assume.pairCheck(pr.x, pr.y, { groups, ordinal: ord, rows: pr.rows });
    pc.rows = pr.rows; pc.dropped = pr.dropped;
    R.pairs[keys[i] + '|' + keys[j]] = pc;
    /* the matrix shows the row variable on the vertical axis: cell [i][j] with i < j is above the diagonal */
    R.stats[i][j] = { r: pc.r, rho: pc.rho, p: pc.pr, byGroup: pc.byGroup };
  }
  /* the set */
  const rows = Data.completeRows(ds, keys);
  if (keys.length >= 2 && rows.length > keys.length + 3) {
    const X = rows.map(r => cols.map(c => c.num[r]));
    const mv = { rows, n: rows.length, p: keys.length };
    if (rows.length <= MAXN_MULTI) { mv.mardia = Assume.mardia(X); mv.hz = Assume.henzeZirkler(X); }
    try { mv.out = Assume.outliers(X); } catch (e) { mv.out = null; }
    R.mv = mv;
  }
  return R;
}
function run() {
  if (!state.data || !S.keys || S.keys.length < 1) return;
  clearMessages('b3Msgs');
  if (S.keys.length < 2) showMessage('b3Msgs', 'warn', L2('Elige al menos dos variables para ver pares.', 'Pick at least two variables to see pairs.'));
  const big = state.data.n > 400 || S.keys.length > 6;
  const w = big && window.LABG ? LABG.work({ title: T('Explorando los datos…', 'Exploring the data…'), message: T(`${S.keys.length} variables, ${S.keys.length * (S.keys.length - 1) / 2} pares`, `${S.keys.length} variables, ${S.keys.length * (S.keys.length - 1) / 2} pairs`), delay: 250 }) : null;
  const go = () => { state.explore = compute(); S.dirty = false; paintAll(); refreshStepMarks(); };
  if (w) cpAfterPaint(go, w); else go();
}

/* ---------------- painting ---------------- */
function paintAll() {
  if (!state.explore) return;
  paintSplom(); paintUni(); paintUniFigs(); paintMv(); paintPairs(); paintPairSelects(); paintPair();
}
function splomLowess(x, y) { const lo = Math.min(...x), hi = Math.max(...x); return Assume.lowess(x, y, { delta: 0.01 * (hi - lo) }); }
function groupInfo() {
  const ds = state.data;
  if (!S.group) return null;
  const G = Data.col(ds, S.group);
  return { col: G, codes: Array.from(G.num, v => (isFinite(v) ? v : 0)), names: G.levels };
}
function paintSplom() {
  const ds = state.data, R = state.explore, keys = R.keys;
  if (keys.length < 2) { el('b3Splom').innerHTML = ''; el('b3SplomLegend').innerHTML = ''; el('b3SplomNote').innerHTML = ''; return; }
  const cols = keys.map(k => Array.from(Data.col(ds, k).num));
  if (ds.missingMode === 'listwise') {
    const ok = new Set(Data.completeRows(ds, ds.cols.filter(c => c.role !== 'exclude' && !['text', 'empty'].includes(c.type)).map(c => c.key)));
    cols.forEach(c => { for (let r = 0; r < c.length; r++) if (!ok.has(r)) c[r] = NaN; });
  }
  const gi = groupInfo();
  const sel = S.pair ? [keys.indexOf(S.pair[0]), keys.indexOf(S.pair[1])] : null;
  el('b3Splom').innerHTML = Plot.splom({
    cols, labels: keys.map(k => short(label(Data.col(ds, k)), 18)), groups: gi ? gi.codes : null, palette: 'laca', div: View.palette, invert: View.invert,
    smooth: S.smooth, lowess: splomLowess, stats: R.stats, sel, max: MAXPTS, plot: 'b3-splom', clip: 'b3',
    label: T('Matriz de dispersión de las variables elegidas', 'Scatterplot matrix of the chosen variables'),
  });
  el('b3SplomLegend').innerHTML = gi ? `<span class="fl-title">${esc(label(gi.col))}:</span> ` + gi.names.map((nm, k) => `<span class="fl-item"><i style="background:${Pal.CAT.laca[k % 8]}"></i>${esc(nm)}</span>`).join('') + `<span class="fl-note">${L2('los números de colores, abajo de cada celda de arriba, son la r dentro de cada grupo', 'the coloured numbers at the bottom of each upper cell are r within each group')}</span>` : '';
  el('b3SplomNote').innerHTML = ds.n > MAXPTS ? L2(`Las nubes muestran ${MAXPTS} de las ${fmtNum(ds.n, 0)} filas, al azar; los números usan todas.`, `The clouds show ${MAXPTS} of the ${fmtNum(ds.n, 0)} rows, at random; the numbers use all of them.`) : '';
}
function verdictTxt(u) {
  if (!isFinite(u.sw.p)) return ['—', ''];
  const big = Math.abs(u.skew) > 1 || Math.abs(u.kurt) > 2;
  if (u.sw.p >= 0.05) return [T('parece normal', 'looks normal'), 'ok'];
  if (u.n > 300 && !big) return [T('se aparta poco (n grande)', 'departs little (large n)'), 'note'];
  return [u.skew > 1 ? T('sesgada a la derecha', 'right-skewed') : u.skew < -1 ? T('sesgada a la izquierda', 'left-skewed') : Math.abs(u.kurt) > 2 ? (u.kurt > 0 ? T('colas pesadas', 'heavy tails') : T('colas ligeras', 'light tails')) : T('no normal', 'not normal'), u.sw.p < 0.01 ? 'bad' : 'warn'];
}
function paintUni() {
  const ds = state.data, R = state.explore;
  const rows = R.keys.map(k => {
    const u = R.uni[k], c = Data.col(ds, k), v = Array.from(c.num).filter(isFinite), vt = verdictTxt(u);
    return { k, name: label(c), u, vt, qq: v.length > 2 ? Plot.qq({ x: v, w: 92, h: 48, mini: true, plot: 'b3-mini-qq', label: 'Q–Q ' + label(c) }) : '' };
  });
  let h = `<table class="b3-uni"><thead><tr><th>${L2('Variable', 'Variable')}</th><th class="num">n</th><th class="num">${L2('Media', 'Mean')}</th><th class="num">${L2('DE', 'SD')}</th><th class="num">g₁</th><th class="num">g₂</th><th class="num">W</th><th class="num">p (S–W)</th><th class="num">A²</th><th class="num">p (A–D)</th><th>Q–Q</th><th>${L2('Lectura', 'Reading')}</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const u = r.u, d = 2;
    h += `<tr class="${r.k === S.uni ? 'sel' : ''}" data-uni="${r.k}" tabindex="0"><td class="pair-n"><b>${esc(r.name)}</b></td><td class="num">${u.n}</td><td class="num">${Fmt.num(u.mean, d)}</td><td class="num">${Fmt.num(u.sd, d)}</td>` +
      `<td class="num ${Math.abs(u.skew) > 1 ? 'warn-t' : ''}">${Fmt.num(u.skew, 2)}</td><td class="num ${Math.abs(u.kurt) > 2 ? 'warn-t' : ''}">${Fmt.num(u.kurt, 2)}</td>` +
      `<td class="num">${isFinite(u.sw.W) ? Fmt.num(u.sw.W, 3) : '—'}</td><td class="num ${lvlP(u.sw.p)}-t">${P(u.sw.p)}</td><td class="num">${isFinite(u.ad.A2) ? Fmt.num(u.ad.A2, 3) : '—'}</td><td class="num ${lvlP(u.ad.p)}-t">${P(u.ad.p)}</td>` +
      `<td class="mini-fig">${r.qq}</td><td><span class="pill ${r.vt[1]}">${esc(r.vt[0])}</span></td></tr>`;
  });
  el('b3UniTable').innerHTML = h + '</tbody></table>';
}
function paintUniFigs() {
  const ds = state.data, k = S.uni;
  if (!k) return;
  const c = Data.col(ds, k), v = Array.from(c.num).filter(isFinite), nm = label(c);
  el('b3HistTitle').innerHTML = keepGreek(L2(`Distribución de ${esc(nm)} y la normal con su media y DE`, `Distribution of ${esc(nm)} and the normal with its mean and SD`));
  el('b3QQTitle').innerHTML = keepGreek(L2(`Q–Q normal de ${esc(nm)}`, `Normal Q–Q of ${esc(nm)}`));
  el('b3Hist').innerHTML = Plot.hist({ x: v, w: 400, h: 280, xlab: nm, ylab: T('Densidad', 'Density'), plot: 'b3-hist' });
  el('b3QQ').innerHTML = Plot.qq({ x: v, w: 400, h: 280, xlab: T('Cuantil normal', 'Normal quantile'), ylab: nm, plot: 'b3-qq' });
}
function paintMv() {
  const R = state.explore, mv = R.mv;
  if (!mv) { el('b3MvTiles').innerHTML = `<p class="hint">${L2('Hacen falta al menos dos variables y más filas completas que variables.', 'At least two variables and more complete rows than variables are needed.')}</p>`; el('b3Chi').innerHTML = ''; el('b3MvOut').innerHTML = ''; return; }
  const M = mv.mardia, H = mv.hz;
  statTiles('b3MvTiles', [
    [T('Filas completas', 'Complete rows'), fmtNum(mv.n, 0), T(`${mv.p} variables`, `${mv.p} variables`)],
    M ? [T('Asimetría de Mardia', 'Mardia skewness'), Fmt.num(M.skew, 2), `χ²(${M.df}) · ${pTxt(M.pSkew)}${M.small ? T(' · corregida n < 20', ' · corrected n < 20') : ''}`, lvlP(M.pSkew)] : null,
    M ? [T('Curtosis de Mardia', 'Mardia kurtosis'), Fmt.num(M.kurt, 2), `z · ${pTxt(M.pKurt)}`, lvlP(M.pKurt)] : null,
    H ? ['Henze–Zirkler', Fmt.num(H.HZ, 3), pTxt(H.p_value), lvlP(H.p_value)] : null,
    mv.out ? [T('Atípicos robustos', 'Robust outliers'), `${mv.out.flagged.filter(Boolean).length}`, T(`clásicos: ${mv.out.flaggedC.filter(Boolean).length}`, `classical: ${mv.out.flaggedC.filter(Boolean).length}`), mv.out.flagged.some(Boolean) ? 'warn' : 'ok'] : null,
    !M ? [T('Mardia y Henze–Zirkler', 'Mardia and Henze–Zirkler'), '—', T(`sólo hasta ${MAXN_MULTI} filas`, `only up to ${MAXN_MULTI} rows`)] : null,
  ]);
  if (mv.out) {
    el('b3Chi').innerHTML = Plot.chiqq({ d2: mv.out.classical, d2r: mv.out.robust, p: mv.p, cut: mv.out.cut, qchisq: Assume.qchisq, w: 400, h: 300, plot: 'b3-chiqq',
      xlab: T(`Cuantil de χ² con ${mv.p} gl`, `χ² quantile with ${mv.p} df`), ylab: T('Distancia de Mahalanobis²', 'Squared Mahalanobis distance'),
      names: [T('clásica', 'classical'), T('robusta (OGK)', 'robust (OGK)')], cutName: T('corte χ²(0.975)', 'cut χ²(0.975)') });
    const flagged = mv.rows.map((r, i) => ({ r, i, d: mv.out.robust[i], dc: mv.out.classical[i] })).filter(o => o.d > mv.out.cut).sort((a, b) => b.d - a.d);
    el('b3MvOut').innerHTML = `<div class="pg-title">${L2('Filas más alejadas (distancia robusta)', 'Farthest rows (robust distance)')}</div>` + (flagged.length ? `<table class="b3-out"><thead><tr><th>${L2('Fila', 'Row')}</th><th class="num">${L2('Robusta', 'Robust')}</th><th class="num">${L2('Clásica', 'Classical')}</th></tr></thead><tbody>` +
      flagged.slice(0, 8).map(o => `<tr${o.dc <= mv.out.cut ? ' class="masked"' : ''}><td>${o.r + 1}</td><td class="num">${Fmt.num(o.d, 1)}</td><td class="num">${Fmt.num(o.dc, 1)}</td></tr>`).join('') + '</tbody></table>' +
      (flagged.length > 8 ? `<p class="hint">${L2(`y ${flagged.length - 8} más`, `and ${flagged.length - 8} more`)}</p>` : '') +
      (flagged.some(o => o.dc <= mv.out.cut) ? `<p class="hint">${L2('En gris, las que la distancia clásica no ve: el enmascaramiento.', 'In grey, those the classical distance does not see: masking.')}</p>` : '')
      : `<p class="hint">${L2('Ninguna fila pasa el corte.', 'No row passes the cut.')}</p>`);
  }
}
const FLAG = {
  curv: ['curva', 'curved'], hetero: ['abanico', 'fan'], nonnorm: ['no normal', 'not normal'], infl: ['punto influyente', 'influential point'],
  ties: ['pocos valores', 'few values'], nonmono: ['no monótona', 'not monotonic'], simpson: ['Simpson', 'Simpson'], groups: ['grupos', 'groups'],
};
function paintPairs() {
  const ds = state.data, R = state.explore, keys = R.keys;
  if (keys.length < 2) { el('b3PairTable').innerHTML = ''; return; }
  let h = `<table class="b3-pairs"><thead><tr><th>${L2('Par', 'Pair')}</th><th class="num">n</th><th class="num">r</th><th class="num">ρ</th><th class="num" title="${esc(T('Valor p del término cuadrático', 'p-value of the quadratic term'))}">${L2('Curva', 'Curve')}</th><th class="num" title="${esc(T('Valor p de Breusch–Pagan', 'Breusch–Pagan p-value'))}">${L2('Abanico', 'Fan')}</th><th class="num" title="${esc(T('Fuera de la elipse robusta del 97.5 %', 'Outside the 97.5% robust ellipse'))}">${L2('Fuera', 'Out')}</th><th class="num">${L2('Mayor |Δr|', 'Largest |Δr|')}</th><th>${L2('Señales', 'Signals')}</th><th>${L2('Recomendada', 'Recommended')}</th></tr></thead><tbody>`;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const pc = R.pairs[keys[i] + '|' + keys[j]], a = label(Data.col(ds, keys[i])), b = label(Data.col(ds, keys[j]));
    const on = S.pair && ((S.pair[0] === keys[i] && S.pair[1] === keys[j]) || (S.pair[0] === keys[j] && S.pair[1] === keys[i]));
    if (pc.few) { h += `<tr><td>${esc(a)} · ${esc(b)}</td><td class="num">${pc.n}</td><td colspan="8" class="cmut">${L2('muy pocos pares completos', 'too few complete pairs')}</td></tr>`; continue; }
    const v = pc.verdict;
    h += `<tr class="${on ? 'sel' : ''}" data-pair="${keys[i]}|${keys[j]}" tabindex="0"><td class="pair-n"><b>${esc(short(a, 24))}</b><br><b>${esc(short(b, 24))}</b></td><td class="num">${pc.n}</td><td class="num">${Fmt.bounded(pc.r, 2)}</td><td class="num">${Fmt.bounded(pc.rho, 2)}</td>` +
      `<td class="num ${lvlP(pc.curv.p)}-t">${P(pc.curv.p)}</td><td class="num ${lvlP(pc.bp.p)}-t">${P(pc.bp.p)}</td><td class="num">${pc.nOut}</td>` +
      `<td class="num ${Math.abs(pc.maxDelta) > pc.inflLimit ? 'warn-t' : ''}">${Fmt.num(Math.abs(pc.maxDelta), 3)}</td>` +
      `<td class="flags">${v.flags.map(f => `<span class="flag f-${f}">${esc(T(FLAG[f][0], FLAG[f][1]))}</span>`).join(' ')}</td><td><span class="pill ${v.level === 'ok' ? 'ok' : v.level === 'note' ? 'note' : 'alt'}">${esc(T(v.es, v.en))}</span></td></tr>`;
  }
  el('b3PairTable').innerHTML = h + '</tbody></table>';
}
function paintPairSelects() {
  const ds = state.data, R = state.explore, keys = R.keys;
  const opts = keys.map(k => `<option value="${k}">${esc(label(Data.col(ds, k)))}</option>`).join('');
  el('b3X').innerHTML = opts; el('b3Y').innerHTML = opts;
  if (S.pair) { el('b3X').value = S.pair[0]; el('b3Y').value = S.pair[1]; }
  el('b3PairCard').hidden = keys.length < 2;
}
function pairOf(ka, kb) {
  const R = state.explore;
  const pc = R.pairs[ka + '|' + kb] || R.pairs[kb + '|' + ka];
  return { pc, swap: !R.pairs[ka + '|' + kb] };
}
function paintPair() {
  const ds = state.data, R = state.explore;
  if (!S.pair || R.keys.length < 2) return;
  const [ka, kb] = S.pair;
  if (ka === kb) { el('b3PairTiles').innerHTML = `<p class="hint">${L2('Elige dos variables distintas.', 'Pick two different variables.')}</p>`; ['b3Verdict', 'b3Sc', 'b3Res', 'b3Inf', 'b3ScLegend'].forEach(id => { el(id).innerHTML = ''; }); return; }
  const A = Data.col(ds, ka), B = Data.col(ds, kb), pr = Data.pairFor(ds, ka, kb);
  const { pc } = pairOf(ka, kb);
  if (!pc || pc.few) { el('b3PairTiles').innerHTML = `<p class="hint">${L2('Muy pocos pares completos.', 'Too few complete pairs.')}</p>`; return; }
  /* the pair's own look in the chosen orientation (x horizontal): r and the verdict are symmetric; the
     line, the residuals and the spread test are of y on x */
  const x = pr.x, y = pr.y, n = pr.n;
  const curv = Assume.curvature(x, y), bp = Assume.breuschPagan(x, y), fit = Assume.ols([x], y);
  statTiles('b3PairTiles', [
    ['<span class="nc">n</span>', fmtNum(n, 0), pr.dropped ? T(`${pr.dropped} fila(s) sin el par`, `${pr.dropped} row(s) without the pair`) : null],
    ['<span class="nc">r</span>', Fmt.bounded(pc.r, 3), pTxt(pc.pr)],
    ['<span class="nc">ρ</span>', Fmt.bounded(pc.rho, 3), T('de rangos', 'of ranks')],
    ['<span class="nc">dCor</span>', isFinite(pc.dcor) ? Fmt.bounded(pc.dcor, 3) : '—', T('cualquier forma', 'any shape')],
    [T('Curvatura', 'Curvature'), `F = ${Fmt.num(curv.F, 2)}`, pTxt(curv.p), lvlP(curv.p)],
    [T('Dispersión (BP)', 'Spread (BP)'), `χ² = ${Fmt.num(bp.BP, 2)}`, pTxt(bp.p), lvlP(bp.p)],
    [T('Mayor <span class="nc">|Δr|</span>', 'Largest <span class="nc">|Δr|</span>'), Fmt.num(Math.abs(pc.maxDelta), 3), T(`fila ${pc.rows[pc.maxAt] + 1} · límite ${Fmt.num(pc.inflLimit, 3)}`, `row ${pc.rows[pc.maxAt] + 1} · limit ${Fmt.num(pc.inflLimit, 3)}`), Math.abs(pc.maxDelta) > pc.inflLimit ? 'warn' : 'ok'],
  ]);
  const v = pc.verdict;
  el('b3Verdict').innerHTML = `<div class="rec rec-${v.level === 'ok' ? 'best' : 'also'} b3-verdict"><div class="rec-h"><span class="rec-l">${L2('Para este par', 'For this pair')}</span><b>${L2(esc(v.es), esc(v.en))}</b>${Catalog.byId(v.id) ? `<button type="button" class="btn btn-ghost btn-sm rec-info" data-measure="${v.id}">${L2('¿Qué es?', 'What is it?')}</button>` : ''}</div>` +
    `<div class="rec-w">${L2(v.why[0], v.why[1])}</div>${v.notes.map(nt => `<div class="rec-w">${L2(nt[0], nt[1])}</div>`).join('')}</div>`;
  /* the cloud: line, LOWESS, classical and robust 97.5 % ellipses, the robust outliers ringed */
  const lw = Assume.lowess(x, y, { delta: 0.01 * (Math.max(...x) - Math.min(...x)) });
  const out = Assume.outliers(x.map((a, i) => [a, y[i]]));
  const ring = out.flagged.map((f, i) => (f ? i : -1)).filter(i => i >= 0);
  const top = ring.slice().sort((a, b) => out.robust[b] - out.robust[a]).slice(0, 8);
  const mo = Plot.moments(x, y), rc = out.robustCov, rm = out.robustCenter;
  /* the limits must hold both ellipses */
  const ellBox = (mx, my, vx, vy) => { const c = Math.sqrt(-2 * Math.log(0.025)); return [mx - c * Math.sqrt(vx), mx + c * Math.sqrt(vx), my - c * Math.sqrt(vy), my + c * Math.sqrt(vy)]; };
  const e1 = ellBox(mo.mx, mo.my, mo.vx, mo.vy), e2 = ellBox(rm[0], rm[1], rc[0][0], rc[1][1]);
  const xlim = Plot.extent([...x, e1[0], e1[1], e2[0], e2[1]], 0.03), ylim = Plot.extent([...y, e1[2], e1[3], e2[2], e2[3]], 0.03);
  const gi = groupInfo(), gcodes = gi ? pr.rows.map(r => gi.codes[r]) : null;
  el('b3Sc').innerHTML = Plot.scatter({
    x, y, w: 400, h: 340, legend: false, groups: gcodes, groupNames: gi ? gi.names : null, xlab: label(A), ylab: label(B), plot: 'b3-pair', clip: 'b3pc', fit: 'ols', r: n > 300 ? 2 : 3, xlim, ylim,
    smooth: lw, ring: top, ringLabels: top.map(i => String(pr.rows[i] + 1)),
    under: g => `<path class="pl-ell-c" d="${Plot.ellipsePath(mo.mx, mo.my, mo.vx, mo.vy, mo.cxy, 0.975, g.sx, g.sy)}"/><path class="pl-ell-r" d="${Plot.ellipsePath(rm[0], rm[1], rc[0][0], rc[1][1], rc[0][1], 0.975, g.sx, g.sy)}"/>`,
  });
  el('b3ScLegend').innerHTML = `<span class="fl-item"><i class="ln ln-fit"></i>${L2('recta', 'line')}</span><span class="fl-item"><i class="ln ln-smooth"></i>LOWESS</span><span class="fl-item"><i class="ln ln-ellc"></i>${L2('elipse clásica', 'classical ellipse')}</span><span class="fl-item"><i class="ln ln-ellr"></i>${L2('elipse robusta', 'robust ellipse')}</span>` + (ring.length ? `<span class="fl-item"><i class="ring"></i>${L2(`${ring.length} fuera de la robusta`, `${ring.length} outside the robust one`)}</span>` : '') +
    (gi ? gi.names.map((nm, k) => `<span class="fl-item"><i style="background:${Pal.CAT.laca[k % 8]}"></i>${esc(nm)}</span>`).join('') : '');
  /* residuals against x with their LOWESS: a curve shows curvature, a fan shows changing spread */
  const res = Array.from(fit.res), lr = Assume.lowess(x, res, { delta: 0.01 * (Math.max(...x) - Math.min(...x)) });
  el('b3Res').innerHTML = Plot.scatter({ x, y: res, w: 400, h: 340, legend: false, groups: gcodes, xlab: label(A), ylab: T('Residuo', 'Residual'), plot: 'b3-resid', clip: 'b3rc', r: n > 300 ? 2 : 3, smooth: lr,
    under: g => `<line class="pl-ref0" x1="${g.x0}" y1="${g.sy(0).toFixed(2)}" x2="${g.x1}" y2="${g.sy(0).toFixed(2)}"/>` });
  /* influence */
  const J = Assume.jackknifeR(x, y), d = J.without.map(w => w - J.r);
  el('b3Inf').innerHTML = Plot.influence({ v: d, rows: pr.rows.map(r => r + 1), w: 720, h: 230, top: 4, limit: pc.inflLimit, plot: 'b3-infl',
    xlab: T('Posición en el par (filas completas, en orden)', 'Position in the pair (complete rows, in order)'), ylab: T('Δr sin el punto', 'Δr without it') });
}

/* ---------------- wiring ---------------- */
function choosePair(ka, kb) {
  S.pair = [ka, kb];
  paintSplom(); paintPairs(); paintPairSelects(); paintPair();
}
B3.choosePair = choosePair;
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-3')) return;
  el('b3Iris').addEventListener('click', () => { B2.loadExample('iris'); goStep(3); });
  el('b3Vars').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k, on = S.keys.includes(k);
    if (on && S.keys.length <= 1) return;
    if (!on && S.keys.length >= MAXV) { showMessage('b3Msgs', 'warn', L2(`Hasta ${MAXV} variables a la vez; para más usa la matriz del Bloque 5.`, `Up to ${MAXV} variables at a time; for more use the matrix of Block 5.`)); return; }
    const order = cands(state.data).map(c => c.key);
    S.keys = on ? S.keys.filter(x => x !== k) : order.filter(x => S.keys.includes(x) || x === k);
    if (!S.keys.includes(S.uni)) S.uni = S.keys[0];
    if (S.pair && (!S.keys.includes(S.pair[0]) || !S.keys.includes(S.pair[1]))) S.pair = S.keys.length > 1 ? [S.keys[0], S.keys[1]] : null;
    paintControls(); run();
  });
  el('b3Group').addEventListener('change', e => { S.group = e.target.value; run(); });
  el('b3Smooth').addEventListener('change', e => { S.smooth = e.target.value; paintSplom(); });
  el('b3Splom').addEventListener('click', e => {
    const c = e.target.closest('.sp-cell');
    if (!c) return;
    const keys = state.explore.keys, a = +c.dataset.a, b = +c.dataset.b;
    if (a === b) { S.uni = keys[a]; paintUni(); paintUniFigs(); el('b3UniTable').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    /* lower cell: x = column variable, y = row variable; upper cell: the same pair, same orientation */
    const [xi, yi] = b > a ? [a, b] : [b, a];
    choosePair(keys[xi], keys[yi]);
    el('b3PairCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const pickUni = e => { const tr = e.target.closest('[data-uni]'); if (tr) { S.uni = tr.dataset.uni; paintUni(); paintUniFigs(); } };
  el('b3UniTable').addEventListener('click', pickUni);
  el('b3UniTable').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickUni(e); } });
  const pickPair = e => { const tr = e.target.closest('[data-pair]'); if (tr) { const [a, b] = tr.dataset.pair.split('|'); choosePair(a, b); el('b3PairCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  el('b3PairTable').addEventListener('click', pickPair);
  el('b3PairTable').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickPair(e); } });
  ['b3X', 'b3Y'].forEach(id => el(id).addEventListener('change', () => choosePair(el('b3X').value, el('b3Y').value)));
  el('b3Verdict').addEventListener('click', e => { const m = e.target.closest('[data-measure]'); if (m) Home.openMeasure(m.dataset.measure); });
  el('b3ToPair').addEventListener('click', () => { if (window.B4 && S.pair) B4.setPair(S.pair[0], S.pair[1]); goStep(4); });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 3 && state.data && (S.dirty || !state.explore)) run(); });
document.addEventListener('langchange', () => { if (state.data) { paintControls(); paintAll(); } });
document.addEventListener('fmtchange', () => { if (state.explore) paintAll(); });
document.addEventListener('palettechange', () => { if (state.explore) paintSplom(); });
window.B3 = B3;
})();
