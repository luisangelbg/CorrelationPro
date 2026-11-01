/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 10, structured and special data: groups and
   Simpson's paradox, repeated measures, time series with prewhitening,
   spatial data with Dutilleul's modified t, phylogenetic contrasts, circular
   and compositional data. Each card works on the open data and has a
   simulated example (labelled as such) where no public-domain one fits. The
   result goes to state.structure. */
(function () {
'use strict';
const S = { dirty: true, tree: '' };
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const pTxt = v => (isFinite(v) ? 'p ' + Fmt.pValue(v) : '—');
const fr = v => (isFinite(v) ? Fmt.bounded(v, 3) : '—');
const cat = Pal.CAT.laca;
const numCols = ds => ds.cols.filter(c => c.role !== 'exclude' || c.type === 'continuous').filter(c => ['continuous', 'ordinal', 'date'].includes(c.type));
const groupCols = ds => ds.cols.filter(c => ['nominal', 'binary', 'ordinal', 'id'].includes(c.type) && c.levels && c.levels.length >= 2 && c.levels.length <= 60);
const circCols = ds => ds.cols.filter(c => c.type === 'circular');
const textCols = ds => ds.cols.filter(c => ['id', 'text', 'nominal'].includes(c.type));
const col = k => Data.col(state.data, k);
const num = k => Array.from(col(k).num);
const opt = (list, empty) => (empty ? `<option value="">${esc(empty)}</option>` : '') + list.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
function setSel(id, list, pref, empty) {
  const s = el(id), old = s.value;
  s.innerHTML = opt(list, empty);
  const keys = list.map(c => c.key);
  s.value = keys.includes(old) ? old : pref && keys.includes(pref) ? pref : (empty ? '' : keys[0] || '');
}

function onData() {
  const ds = state.data;
  el('b10Empty').hidden = !!ds; el('b10Main').hidden = !ds;
  if (!ds) return;
  const nc = numCols(ds), gc = groupCols(ds), vars = nc.filter(c => c.role === 'var'), k = (vars.length >= 2 ? vars : nc).map(c => c.key);
  const role = r => (ds.cols.find(c => c.role === r) || {}).key;
  setSel('b10GX', nc, k[0]); setSel('b10GY', nc, k[1]); setSel('b10GG', gc, role('group') || (gc.find(c => c.type !== 'id') || {}).key);
  setSel('b10RS', ds.cols.filter(c => c.role === 'subject' || (c.levels && c.levels.length >= 2 && c.levels.length < ds.n)), role('subject'));
  setSel('b10RX', nc, k[0]); setSel('b10RY', nc, k[1]);
  setSel('b10TX', nc, k.find(x => col(x).role !== 'time') || k[0]); setSel('b10TY', nc, k.filter(x => col(x).role !== 'time')[1] || k[1]);
  setSel('b10TT', ds.cols.filter(c => ['continuous', 'date'].includes(c.type)), role('time'), T('El orden de las filas', 'The order of the rows'));
  setSel('b10SX', nc, k[0]); setSel('b10SY', nc, k[1]); setSel('b10SCX', ds.cols.filter(c => c.type === 'continuous'), role('coordX')); setSel('b10SCY', ds.cols.filter(c => c.type === 'continuous'), role('coordY'));
  setSel('b10PSp', textCols(ds), null); setSel('b10PX', nc, k[0]); setSel('b10PY', nc, k[1]);
  const cc = circCols(ds);
  setSel('b10CA', cc, null);
  setSel('b10CB', cc.concat(nc.filter(c => c.type === 'continuous')), cc[1] ? cc[1].key : (vars.find(c => c.type === 'continuous') || {}).key);
  el('b10KG').innerHTML = ds.comp.map((gp, i) => `<option value="${i}">${esc(gp.map(kk => label(col(kk))).join(', '))}</option>`).join('');
  S.dirty = true; state.structure = null;
  if (el('panel-10').classList.contains('active')) runAll();
}
function runAll() {
  state.structure = {};
  [paintGroups, paintRm, paintTs, paintSpace, paintCirc, paintComp].forEach(f => { try { f(); } catch (e) { console.error(e); } });
  if (S.tree) paintPhylo();
  S.dirty = false; refreshStepMarks();
}

/* ---------------- groups ---------------- */
function paintGroups() {
  const kx = el('b10GX').value, ky = el('b10GY').value, kg = el('b10GG').value;
  if (!kx || !ky || !kg || kx === ky) { el('b10GTiles').innerHTML = `<p class="hint">${L2('Hacen falta dos variables numéricas y una de grupos.', 'Two numeric variables and a group variable are needed.')}</p>`; ['b10GSc', 'b10GTable', 'b10GText', 'b10GLeg'].forEach(id => { el(id).innerHTML = ''; }); return; }
  const G = col(kg), R = Struct.groups(num(kx), num(ky), num(kg));
  state.structure.groups = R;
  if (R.groups.filter(b => b.n >= 3).length < 2) { el('b10GTiles').innerHTML = `<p class="hint">${L2('Con esa columna casi todos los grupos tienen uno o dos casos: no hay correlación dentro de ellos. Elige una columna con menos grupos y más casos en cada uno.', 'With that column almost every group has one or two cases: there is no correlation within them. Pick a column with fewer groups and more cases in each.')}</p>`; ['b10GSc', 'b10GTable', 'b10GText', 'b10GLeg'].forEach(id => { el(id).innerHTML = ''; }); state.structure.groups = null; return; }
  const simpson = R.groups.filter(b => isFinite(b.r)).every(b => Math.sign(b.r) !== Math.sign(R.total)) && Math.abs(R.within) > 0.1;
  statTiles('b10GTiles', [
    [T('r juntando todo', 'r pooling everything'), fr(R.total), pTxt(R.totalP)],
    [T('r dentro de los grupos', 'r within the groups'), fr(R.within), `${T('gl', 'df')} ${R.dfW} · ${pTxt(R.withinP)}`, simpson ? 'warn' : 'ok'],
    [T('r entre las medias', 'r between the means'), fr(R.between), T(`${R.K} grupos`, `${R.K} groups`)],
    [T('¿La misma r en todos?', 'The same r in all?'), `Q = ${Fmt.num(R.Q, 2)}`, `${T('gl', 'df')} ${R.dfQ} · ${pTxt(R.pQ)}`, R.pQ < 0.05 ? 'warn' : 'ok'],
  ]);
  const x = num(kx), y = num(ky), g = num(kg), ok = x.map((_, i) => isFinite(x[i]) && isFinite(y[i]) && isFinite(g[i]));
  const xs = x.filter((_, i) => ok[i]), ys = y.filter((_, i) => ok[i]), gs = g.filter((_, i) => ok[i]);
  const mo = Plot.moments(xs, ys), b = mo.cxy / mo.vx, a = mo.my - b * mo.mx, xa = Math.min(...xs), xb = Math.max(...xs);
  el('b10GSc').innerHTML = Plot.scatter({ x: xs, y: ys, groups: gs, groupNames: G.levels, byGroup: true, fit: 'ols', w: 400, h: 330, legend: false, xlab: label(col(kx)), ylab: label(col(ky)), plot: 'b10-groups', clip: 'b10g', r: xs.length > 300 ? 2 : 2.8,
    over: gg => `<line class="b10-all" x1="${gg.sx(xa).toFixed(1)}" y1="${gg.sy(a + b * xa).toFixed(1)}" x2="${gg.sx(xb).toFixed(1)}" y2="${gg.sy(a + b * xb).toFixed(1)}"/>` + R.groups.map((bb, k) => `<circle class="b10-mean" cx="${gg.sx(bb.mx).toFixed(1)}" cy="${gg.sy(bb.my).toFixed(1)}" r="6" style="fill:${cat[k % 8]}"/>`).join('') });
  el('b10GLeg').innerHTML = G.levels.map((nm, k) => `<span class="fl-item"><i style="background:${cat[k % 8]}"></i>${esc(nm)}</span>`).join('') + `<span class="fl-item"><i class="ln ln-ellc"></i>${L2('todos juntos', 'all together')}</span><span class="fl-note">${L2('los círculos grandes son las medias de cada grupo', 'the large circles are the means of each group')}</span>`;
  el('b10GTable').innerHTML = `<table><thead><tr><th>${L2('Grupo', 'Group')}</th><th class="num">n</th><th class="num">r</th><th class="num">p</th></tr></thead><tbody>` + R.groups.map(bb => `<tr><td>${esc(G.levels[bb.k] || bb.k)}</td><td class="num">${bb.n}</td><td class="num">${fr(bb.r)}</td><td class="num">${isFinite(bb.p) ? Fmt.pValue(bb.p) : '—'}</td></tr>`).join('') + '</tbody></table>';
  el('b10GText').innerHTML = `<p>${simpson ? L2(`Paradoja de Simpson: dentro de cada grupo la relación es ${R.within > 0 ? 'positiva' : 'negativa'} (${fr(R.within)}), pero al juntarlos sale ${R.total > 0 ? 'positiva' : 'negativa'} (${fr(R.total)}): las diferencias entre las medias de los grupos dominan. La pregunta decide cuál informar: la relación entre individuos de un mismo grupo es la de dentro.`, `Simpson’s paradox: within each group the relation is ${R.within > 0 ? 'positive' : 'negative'} (${fr(R.within)}), but pooling them it comes out ${R.total > 0 ? 'positive' : 'negative'} (${fr(R.total)}): the differences between the group means dominate. The question decides which to report: the relation between individuals of the same group is the within one.`)
    : L2(`La r juntando todo (${fr(R.total)}) combina la de dentro de los grupos (${fr(R.within)}) con la de entre sus medias (${fr(R.between)}); cuando se parecen poco, la de todos juntos no describe a ninguno de los dos niveles (Robinson 1950: la falacia ecológica).`, `The r pooling everything (${fr(R.total)}) combines the one within the groups (${fr(R.within)}) with the one between their means (${fr(R.between)}); when they differ, the pooled one describes neither level (Robinson 1950: the ecological fallacy).`)}</p>`;
}

/* ---------------- repeated measures ---------------- */
function paintRm() {
  const ks = el('b10RS').value, kx = el('b10RX').value, ky = el('b10RY').value;
  if (!ks || !kx || !ky || kx === ky) { el('b10RTiles').innerHTML = `<p class="hint">${L2('Hace falta una columna de sujetos (con valores repetidos) y dos variables numéricas.', 'A subject column (with repeated values) and two numeric variables are needed.')}</p>`; el('b10RSc').innerHTML = ''; return; }
  const s = num(ks), x = num(kx), y = num(ky), R = Struct.repeated(s, x, y);
  state.structure.rm = R;
  statTiles('b10RTiles', [
    [T('Correlación de medidas repetidas', 'Repeated measures correlation'), fr(R.r), `${T("IC 95 %", "95% CI")} [${fr(R.lo)}, ${fr(R.hi)}] · ${pTxt(R.p)}`, 'ok'],
    [T('Grados de libertad', 'Degrees of freedom'), `${R.df}`, T(`${R.N} filas de ${R.k} sujetos`, `${R.N} rows from ${R.k} subjects`)],
    [T('r ignorando a los sujetos', 'r ignoring the subjects'), fr(R.ignored), T('mezcla dos niveles', 'mixes two levels'), Math.sign(R.ignored) !== Math.sign(R.r) ? 'bad' : 'warn'],
  ]);
  const ok = s.map((_, i) => isFinite(s[i]) && isFinite(x[i]) && isFinite(y[i]));
  const ss = s.filter((_, i) => ok[i]), xs = x.filter((_, i) => ok[i]), ys = y.filter((_, i) => ok[i]);
  const subj = [...new Set(ss)], codes = ss.map(v => subj.indexOf(v));
  el('b10RSc').innerHTML = Plot.scatter({ x: xs, y: ys, groups: codes, w: 720, h: 330, legend: false, xlab: label(col(kx)), ylab: label(col(ky)), plot: 'b10-rm', clip: 'b10r', r: 3,
    over: g => subj.map((sv, k) => {
      const ix = codes.map((c, i) => (c === k ? i : -1)).filter(i => i >= 0), mx = Num.mean(ix.map(i => xs[i])), my = Num.mean(ix.map(i => ys[i])), lo = Math.min(...ix.map(i => xs[i])), hi = Math.max(...ix.map(i => xs[i]));
      return `<line x1="${g.sx(lo).toFixed(1)}" y1="${g.sy(my + R.slope * (lo - mx)).toFixed(1)}" x2="${g.sx(hi).toFixed(1)}" y2="${g.sy(my + R.slope * (hi - mx)).toFixed(1)}" style="stroke:${cat[k % 8]};stroke-width:1.8"/>`;
    }).join('') });
}

/* ---------------- time series ---------------- */
function bars(lags, band, W, H, plot, ttl) {
  const m = { l: 52, r: 14, t: 12, b: 42 }, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const L = lags.length, mx = Math.max(0.3, ...lags.map(l => Math.abs(l.r)), band) * 1.1;
  const sx = Plot.scale(lags[0].lag - 0.5, lags[L - 1].lag + 0.5, x0, x1), sy = Plot.scale(-mx, mx, y0, y1);
  let s = Plot.open(W, H, { plot }, { x0, x1, y0, y1, ex: [lags[0].lag - 0.5, lags[L - 1].lag + 0.5], ey: [-mx, mx] }, ttl);
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(lags[0].lag, lags[L - 1].lag, 7), yt: Plot.ticks(-mx, mx, 5), xlab: T('Retardo k (X adelantada k pasos)', 'Lag k (X ahead by k steps)'), ylab: 'r' });
  s += `<rect class="b9-band" x="${x0}" y="${sy(band).toFixed(1)}" width="${x1 - x0}" height="${(sy(-band) - sy(band)).toFixed(1)}"/><line class="pl-ref0" x1="${x0}" y1="${sy(0).toFixed(1)}" x2="${x1}" y2="${sy(0).toFixed(1)}"/>`;
  lags.forEach(l => { const out = Math.abs(l.r) > band; s += `<line class="${out ? 'b10-bar-hot' : 'b10-bar'}" x1="${sx(l.lag).toFixed(1)}" y1="${sy(0).toFixed(1)}" x2="${sx(l.lag).toFixed(1)}" y2="${sy(l.r).toFixed(1)}"/><circle class="${out ? 'b10-dot-hot' : 'b10-dot'}" cx="${sx(l.lag).toFixed(1)}" cy="${sy(l.r).toFixed(1)}" r="2.6"/>`; });
  return s + '</svg>';
}
function paintTs() {
  const kx = el('b10TX').value, ky = el('b10TY').value, kt = el('b10TT').value;
  if (!kx || !ky || kx === ky) { el('b10TTiles').innerHTML = ''; el('b10TRaw').innerHTML = ''; el('b10TPw').innerHTML = ''; return; }
  let x = num(kx), y = num(ky);
  if (kt) { const t = num(kt), ord = Num.order(t.map(v => (isFinite(v) ? v : Infinity))); x = ord.map(i => x[i]); y = ord.map(i => y[i]); }
  const ok = x.map((_, i) => isFinite(x[i]) && isFinite(y[i])); x = x.filter((_, i) => ok[i]); y = y.filter((_, i) => ok[i]);
  if (x.length < 12) { el('b10TTiles').innerHTML = `<p class="hint">${L2('Hacen falta al menos 12 tiempos.', 'At least 12 time points are needed.')}</p>`; return; }
  const P = Struct.prewhiten(x, y, { maxLag: Math.min(15, Math.floor(x.length / 4)) });
  state.structure.ts = P;
  const at0 = l => l.lags.find(q => q.lag === 0).r, best = l => l.lags.reduce((a, b) => (Math.abs(b.r) > Math.abs(a.r) ? b : a));
  statTiles('b10TTiles', [
    [T('r de las series', 'r of the series'), fr(at0(P.raw)), T(`n = ${x.length}`, `n = ${x.length}`)],
    [T('Modelo de X', 'Model of X'), `AR(${P.model.order})`, P.model.ar.length ? P.model.ar.map((v, i) => `φ${i + 1} = ${Fmt.num(v, 2)}`).join(' · ') : T('sin memoria', 'no memory')],
    [T('r preblanqueada (k = 0)', 'Prewhitened r (k = 0)'), fr(at0(P.ccf)), T(`límite ±${Fmt.num(P.ccf.band, 2)}`, `limit ±${Fmt.num(P.ccf.band, 2)}`), Math.abs(at0(P.ccf)) > P.ccf.band ? 'ok' : 'warn'],
    [T('Retardo más fuerte', 'Strongest lag'), `k = ${best(P.ccf).lag}`, `r = ${fr(best(P.ccf).r)}`],
  ]);
  el('b10TRaw').innerHTML = bars(P.raw.lags, P.raw.band, 380, 280, 'b10-ccf', T('Correlación cruzada', 'Cross-correlation'));
  el('b10TPw').innerHTML = bars(P.ccf.lags, P.ccf.band, 380, 280, 'b10-ccf-pw', T('Correlación cruzada preblanqueada', 'Prewhitened cross-correlation'));
}

/* ---------------- space ---------------- */
function paintSpace() {
  const kx = el('b10SX').value, ky = el('b10SY').value, cx = el('b10SCX').value, cy = el('b10SCY').value;
  if (!kx || !ky || !cx || !cy || new Set([kx, ky, cx, cy]).size < 4) { el('b10STiles').innerHTML = `<p class="hint">${L2('Elige dos variables y las dos coordenadas (distintas).', 'Pick two variables and the two (distinct) coordinates.')}</p>`; el('b10SMap').innerHTML = ''; el('b10SCor').innerHTML = ''; return; }
  if (state.data.n > 1500) { el('b10STiles').innerHTML = `<p class="hint">${L2('La prueba se calcula hasta 1 500 lugares.', 'The test is computed up to 1,500 places.')}</p>`; return; }
  const D = Struct.dutilleul(num(kx), num(ky), num(cx), num(cy));
  state.structure.space = D;
  statTiles('b10STiles', [
    ['<span class="nc">r</span>', fr(D.r), `n = ${D.n}`],
    [T('Valor p habitual', 'Usual p-value'), pTxt(D.naiveP), T(`como si hubiera ${D.n} lugares independientes`, `as if there were ${D.n} independent places`)],
    [T('Tamaño efectivo', 'Effective size'), Fmt.num(D.ess, 1), T('lugares independientes que valen los datos', 'independent places the data are worth'), D.ess < D.n * 0.5 ? 'warn' : 'ok'],
    [T('Valor p de Dutilleul', 'Dutilleul’s p-value'), pTxt(D.p), `F(1, ${Fmt.num(D.df, 1)}) = ${Fmt.num(D.F, 2)}`, D.p < 0.05 ? 'ok' : 'warn'],
  ]);
  const X = num(cx), Y = num(cy), v = num(kx), ok = X.map((_, i) => [X[i], Y[i], v[i]].every(isFinite));
  const xs = X.filter((_, i) => ok[i]), ys = Y.filter((_, i) => ok[i]), vs = v.filter((_, i) => ok[i]), vmin = Math.min(...vs), vmax = Math.max(...vs);
  el('b10SMap').innerHTML = Plot.scatter({ x: xs, y: ys, w: 380, h: 330, legend: false, xlab: label(col(cx)), ylab: label(col(cy)), plot: 'b10-map', clip: 'b10m', r: 0.01,
    over: g => xs.map((a, i) => `<circle cx="${g.sx(a).toFixed(1)}" cy="${g.sy(ys[i]).toFixed(1)}" r="4.2" fill="${Pal.color('maiz', (vs[i] - vmin) / ((vmax - vmin) || 1))}" stroke="var(--fig-bg)" stroke-width=".6"/>`).join('') });
  const cls = D.classes.filter(c => c.n > 0);
  el('b10SCor').innerHTML = Plot.curves({ w: 380, h: 300, plot: 'b10-correlogram', xlab: T('Distancia (límite superior de la clase)', 'Distance (upper bound of the class)'), ylab: T('I de Moran', 'Moran’s I'),
    xlim: [0, cls[cls.length - 1].upper * 1.02], ylim: [Math.min(-0.3, ...cls.map(c => Math.min(c.Ix, c.Iy))) * 1.1, Math.max(0.3, ...cls.map(c => Math.max(c.Ix, c.Iy))) * 1.1],
    series: [{ x: cls.map(c => c.upper), y: cls.map(c => c.Ix), cls: 'pl-post', label: label(col(kx)) }, { x: cls.map(c => c.upper), y: cls.map(c => c.Iy), cls: 'b10-iy', label: label(col(ky)) }, { x: [0, cls[cls.length - 1].upper * 1.02], y: [0, 0], cls: 'pl-prior' }],
    legendAt: 'right' });
}

/* ---------------- phylogeny ---------------- */
function paintPhylo() {
  clearMessages('b10PMsgs');
  const ksp = el('b10PSp').value, kx = el('b10PX').value, ky = el('b10PY').value, txt = el('b10PTree').value.trim();
  if (!txt) { showMessage('b10PMsgs', 'warn', L2('Pega un árbol en formato Newick.', 'Paste a tree in Newick format.')); return; }
  if (!ksp || !kx || !ky) { showMessage('b10PMsgs', 'warn', L2('Elige la columna de especies y dos variables.', 'Pick the species column and two variables.')); return; }
  try {
    const tree = Struct.parseNewick(txt), sp = col(ksp), x = num(kx), y = num(ky);
    const nameOf = r => (sp.levels ? sp.levels[sp.num[r]] : String(sp.raw[r]).trim());
    const vx = {}, vy = {};
    for (let r = 0; r < state.data.n; r++) { const nm = nameOf(r); if (nm) { vx[nm] = x[r]; vy[nm] = y[r]; } }
    const miss = tree.tips.filter(t => !(t in vx));
    if (miss.length) throw new Error(T(`Estas especies del árbol no están en los datos: ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? '…' : ''}`, `These species of the tree are not in the data: ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? '…' : ''}`));
    const R = Struct.picCor(tree, vx, vy);
    const raw = Coef.pearson(tree.tips.map(t => vx[t]), tree.tips.map(t => vy[t]));
    state.structure.phylo = R;
    statTiles('b10PTiles', [
      [T('r de las especies', 'r of the species'), fr(raw.est), T(`${tree.tips.length} especies · ${pTxt(raw.p)}`, `${tree.tips.length} species · ${pTxt(raw.p)}`)],
      [T('r de los contrastes', 'r of the contrasts'), fr(R.r), `t(${R.df}) = ${Fmt.num(R.t, 2)} · ${pTxt(R.p)}`, 'ok'],
      [T('Contrastes', 'Contrasts'), `${R.n}`, T('uno por nodo interno', 'one per internal node')],
    ]);
    el('b10PScPane').hidden = false;
    const ext = Math.max(...R.cx.map(Math.abs)) * 1.1, eyy = Math.max(...R.cy.map(Math.abs)) * 1.1, slope = R.cx.reduce((s, v, i) => s + v * R.cy[i], 0) / R.cx.reduce((s, v) => s + v * v, 0);
    el('b10PSc').innerHTML = Plot.scatter({ x: R.cx, y: R.cy, w: 720, h: 320, legend: false, xlim: [-ext, ext], ylim: [-eyy, eyy], xlab: T(`Contraste de ${label(col(kx))}`, `Contrast of ${label(col(kx))}`), ylab: T(`Contraste de ${label(col(ky))}`, `Contrast of ${label(col(ky))}`), plot: 'b10-pic', clip: 'b10p', r: 3.2,
      under: g => `<line class="pl-ref0" x1="${g.x0}" y1="${g.sy(0).toFixed(1)}" x2="${g.x1}" y2="${g.sy(0).toFixed(1)}"/><line class="pl-ref0" x1="${g.sx(0).toFixed(1)}" y1="${g.y0}" x2="${g.sx(0).toFixed(1)}" y2="${g.y1}"/><line class="b10-all" x1="${g.sx(-ext).toFixed(1)}" y1="${g.sy(-ext * slope).toFixed(1)}" x2="${g.sx(ext).toFixed(1)}" y2="${g.sy(ext * slope).toFixed(1)}"/>` });
  } catch (e) { showMessage('b10PMsgs', 'error', esc(e.message)); }
}

/* ---------------- circles ---------------- */
function paintCirc() {
  clearMessages('b10CMsgs');
  const ka = el('b10CA').value, kb = el('b10CB').value;
  el('b10CScPane').hidden = true; el('b10CTiles').innerHTML = '';
  if (!ka) { showMessage('b10CMsgs', 'info', L2('No hay columnas circulares (ángulos, horas, días del año, meses). Márcalas como «circular» en el Bloque 2, o usa el ejemplo simulado.', 'There are no circular columns (angles, hours, days of the year, months). Mark them as “circular” in Block 2, or use the simulated example.')); return; }
  if (!kb || kb === ka) return;
  const A = col(ka), B = col(kb), a = Array.from(Data.toRadians(A));
  el('b10CScPane').hidden = false;
  if (B.type === 'circular') {
    const b = Array.from(Data.toRadians(B)), R = Struct.circCirc(a, b);
    state.structure.circ = R;
    statTiles('b10CTiles', [[T('Circular–circular', 'Circular–circular'), fr(R.r), `z = ${Fmt.num(R.z, 2)} · ${pTxt(R.p)}`, R.p < 0.05 ? 'ok' : 'warn'], [T('Pearson (ingenua)', 'Pearson (naive)'), fr(Coef.pearson(Array.from(A.num), Array.from(B.num)).est), T('trata 359° y 1° como lejanos', 'treats 359° and 1° as far apart')]]);
    el('b10CTitle').innerHTML = L2('Los dos ángulos (en grados, de 0 a 360)', 'The two angles (in degrees, 0 to 360)');
    const deg = v => ((v * 180 / Math.PI) % 360 + 360) % 360;
    el('b10CSc').innerHTML = Plot.scatter({ x: a.map(deg), y: b.map(deg), w: 720, h: 320, legend: false, xlim: [0, 360], ylim: [0, 360], xlab: label(A) + ' (°)', ylab: label(B) + ' (°)', plot: 'b10-torus', clip: 'b10c', r: 3 });
  } else {
    const x = Array.from(B.num), R = Struct.circLin(x, a);
    state.structure.circ = R;
    statTiles('b10CTiles', [[T('Circular–lineal (Mardia)', 'Circular–linear (Mardia)'), fr(R.R), `R² = ${fr(R.R2)} · F(2, ${R.df2}) = ${Fmt.num(R.F, 2)} · ${pTxt(R.p)}`, R.p < 0.05 ? 'ok' : 'warn'], [T('Pearson (ingenua)', 'Pearson (naive)'), fr(Coef.pearson(Array.from(A.num), x).est), T('trata el ángulo como recta', 'treats the angle as a line')]]);
    el('b10CTitle').innerHTML = L2('La variable lineal según el ángulo, con su onda ajustada', 'The linear variable by angle, with its fitted wave');
    const ok = a.map((v, i) => isFinite(v) && isFinite(x[i])), aa = a.filter((_, i) => ok[i]), xx = x.filter((_, i) => ok[i]);
    const fit = Assume.ols([aa.map(Math.cos), aa.map(Math.sin)], xx);
    const deg = v => ((v * 180 / Math.PI) % 360 + 360) % 360, wave = Array.from({ length: 121 }, (_, i) => i * 3);
    el('b10CSc').innerHTML = Plot.scatter({ x: aa.map(deg), y: xx, w: 720, h: 320, legend: false, xlim: [0, 360], xlab: label(A) + ' (°)', ylab: label(B), plot: 'b10-circlin', clip: 'b10cl', r: 3,
      smooth: { x: wave, y: wave.map(d => fit.intercept + fit.beta[0] * Math.cos(d * Math.PI / 180) + fit.beta[1] * Math.sin(d * Math.PI / 180)) } });
  }
}

/* ---------------- compositions ---------------- */
function paintComp() {
  clearMessages('b10KMsgs');
  const ds = state.data;
  if (!ds.comp.length) { showMessage('b10KMsgs', 'info', L2('No se encontraron grupos de columnas que sumen una constante. Usa el ejemplo simulado para verlo.', 'No groups of columns adding up to a constant were found. Use the simulated example to see it.')); el('b10K').innerHTML = ''; return; }
  const gp = ds.comp[+el('b10KG').value || 0], parts = gp.map(num), names = gp.map(k => label(col(k)));
  const C = Struct.composition(parts, names);
  state.structure.comp = C;
  const mat = (M, ttl, plot, aria) => `<div class="pg-pane"><div class="pg-title">${ttl}</div>${Plot.matrix({ R: M, labels: names.map(s => short(s, 14)), glyph: { lower: 'number', upper: 'ellipse', diag: 'diag' }, palette: View.palette, invert: View.invert, size: 46, labelWidth: 96, colorbar: false, plot, label: aria })}</div>`;
  el('b10K').innerHTML = mat(C.raw, L2('Pearson de las partes (espuria)', 'Pearson of the parts (spurious)'), 'b10-raw', T('Pearson de las partes', 'Pearson of the parts')) + mat(C.clrR, L2('Pearson de los log-cocientes centrados', 'Pearson of the centered log-ratios'), 'b10-clr', T('Pearson de los log-cocientes centrados', 'Pearson of the centered log-ratios')) + mat(C.rhoP, L2('Proporcionalidad <span class="nc">ρ<sub>p</sub></span>', 'Proportionality <span class="nc">ρ<sub>p</sub></span>'), 'b10-rhop', T('Proporcionalidad ρp', 'Proportionality ρp'));
}

/* ---------------- simulated examples ---------------- */
/* the names the columns show, in each language */
const SIM_LABELS = {
  sujeto: ['Sujeto', 'Subject'], horas_de_estudio: ['Horas de estudio', 'Study hours'], calificacion: ['Calificación', 'Grade'],
  este: ['Este', 'East'], norte: ['Norte', 'North'], humedad: ['Humedad', 'Moisture'], rendimiento: ['Rendimiento', 'Yield'],
  especie: ['Especie', 'Species'], rasgo_1: ['Rasgo 1', 'Trait 1'], rasgo_2: ['Rasgo 2', 'Trait 2'],
  direccion_viento: ['Dirección del viento', 'Wind direction'], direccion_racha: ['Dirección de la racha', 'Gust direction'], temperatura: ['Temperatura', 'Temperature'],
  arena: ['Arena', 'Sand'], limo: ['Limo', 'Silt'], arcilla: ['Arcilla', 'Clay'], carbono_organico: ['Carbono orgánico', 'Organic carbon'],
};
function useSim(name, es, en, names, cols, declared, info) {
  const dec = names.map(nm => Object.assign({ name: nm }, (declared || []).find(d => d.name === nm) || {}, SIM_LABELS[nm] ? { label: { es: SIM_LABELS[nm][0], en: SIM_LABELS[nm][1] } } : {}));
  const ds = Data.build(names, cols, { name, declared: dec });
  ds.title = { es, en };
  B2.useDataset(ds, info);
  goStep(10);
}
function simRm() {
  const rnd = Num.rng(1010), names = ['sujeto', 'horas_de_estudio', 'calificacion'], cols = [[], [], []];
  for (let s = 0; s < 12; s++) { const base = 2 + s * 0.8, lvl = 90 - s * 4; for (let k = 0; k < 6; k++) { const h = base + rnd() * 2; cols[0].push('S' + String(s + 1).padStart(2, '0')); cols[1].push(h.toFixed(2)); cols[2].push((lvl + 3 * (h - base) + rnd.normal()).toFixed(2)); } }
  useSim('medidas_repetidas_simuladas', 'Simulado: 12 sujetos medidos 6 veces (no son datos reales)', 'Simulated: 12 subjects measured 6 times (not real data)', names, cols, [{ name: 'sujeto', type: 'id', role: 'subject' }],
    L2('Conjunto simulado: dentro de cada sujeto, más horas dan mejor calificación; entre sujetos, los que estudian más parten de calificaciones más bajas. No son datos reales.', 'Simulated set: within each subject, more hours give a better grade; between subjects, those who study more start from lower grades. These are not real data.'));
}
function simSpace() {
  const rnd = Num.rng(1011), n = 100, names = ['este', 'norte', 'humedad', 'rendimiento'], cols = [[], [], [], []];
  for (let i = 0; i < n; i++) { const x = rnd() * 10, y = rnd() * 10, f = Math.sin(x / 2) + Math.cos(y / 3); cols[0].push(x.toFixed(3)); cols[1].push(y.toFixed(3)); cols[2].push((f + 0.3 * rnd.normal()).toFixed(3)); cols[3].push((0.5 * Math.sin(x / 2) + 0.8 * Math.cos(y / 2.5) + 0.4 * rnd.normal()).toFixed(3)); }
  useSim('parcelas_simuladas', 'Simulado: 100 parcelas con autocorrelación espacial (no son datos reales)', 'Simulated: 100 plots with spatial autocorrelation (not real data)', names, cols, [{ name: 'este', type: 'continuous', role: 'coordX' }, { name: 'norte', type: 'continuous', role: 'coordY' }],
    L2('Conjunto simulado: dos variables con gradientes espaciales. No son datos reales.', 'Simulated set: two variables with spatial gradients. These are not real data.'));
}
function simPhylo() {
  /* a Yule tree by random splits, then Brownian motion of two correlated traits */
  const rnd = Num.rng(1012);
  let lineages = [{ id: 0, t0: 0, children: null }];
  const all = [lineages[0]];
  let t = 0, next = 1;
  while (lineages.length < 30) {
    t += -Math.log(1 - rnd()) / lineages.length;
    const k = Math.floor(rnd() * lineages.length), p = lineages[k];
    p.t1 = t; p.children = [{ id: next++, t0: t }, { id: next++, t0: t }];
    all.push(...p.children);
    lineages.splice(k, 1, ...p.children);
  }
  const T0 = t + 0.3;
  lineages.forEach((l, i) => { l.t1 = T0; l.name = 'sp' + String(i + 1).padStart(2, '0'); });
  const nwk = n => (n.children ? '(' + n.children.map(nwk).join(',') + ')' : n.name) + ':' + (n.t1 - n.t0).toFixed(4);
  const tree = nwk(all[0]).replace(/:[0-9.]+$/, '') + ';';
  const vals = [];
  const walk = (n, a, b) => { const len = n.t1 - n.t0, z1 = rnd.normal() * Math.sqrt(len), z2 = 0.6 * z1 + 0.8 * rnd.normal() * Math.sqrt(len); const A = a + z1, B = b + z2; if (n.children) n.children.forEach(c => walk(c, A, B)); else vals.push([n.name, A, B]); };
  walk(all[0], 10, 5);
  S.tree = tree;
  useSim('especies_simuladas', 'Simulado: 30 especies en un árbol (no son datos reales)', 'Simulated: 30 species on a tree (not real data)', ['especie', 'rasgo_1', 'rasgo_2'], [vals.map(v => v[0]), vals.map(v => v[1].toFixed(4)), vals.map(v => v[2].toFixed(4))], [{ name: 'especie', type: 'id', role: 'exclude' }],
    L2('Conjunto simulado: dos rasgos que evolucionan juntos sobre un árbol de 30 especies (el árbol quedó en el cuadro Newick). No son datos reales.', 'Simulated set: two traits evolving together on a tree of 30 species (the tree is in the Newick box). These are not real data.'));
  el('b10PTree').value = tree;
  setTimeout(() => { const sp = textCols(state.data)[0]; if (sp) el('b10PSp').value = sp.key; paintPhylo(); }, 50);
}
function simCirc() {
  const rnd = Num.rng(1013), n = 120, names = ['direccion_viento', 'direccion_racha', 'temperatura'], cols = [[], [], []];
  for (let i = 0; i < n; i++) { const d = ((rnd() < 0.6 ? 200 : 20) + 40 * rnd.normal() + 360) % 360, g2 = (d + 15 * rnd.normal() + 360) % 360; cols[0].push(d.toFixed(1)); cols[1].push(g2.toFixed(1)); cols[2].push((18 + 5 * Math.cos((d - 210) * Math.PI / 180) + 1.5 * rnd.normal()).toFixed(2)); }
  useSim('viento_simulado', 'Simulado: dirección del viento y temperatura (no son datos reales)', 'Simulated: wind direction and temperature (not real data)', names, cols, [{ name: 'direccion_viento', type: 'circular', role: 'var', unit: 'deg' }, { name: 'direccion_racha', type: 'circular', role: 'var', unit: 'deg' }],
    L2('Conjunto simulado: ángulos en grados y una temperatura que depende de la dirección. No son datos reales.', 'Simulated set: angles in degrees and a temperature that depends on the direction. These are not real data.'));
}
function simComp() {
  const rnd = Num.rng(1014), n = 80, names = ['arena', 'limo', 'arcilla', 'carbono_organico'], cols = [[], [], [], []];
  for (let i = 0; i < n; i++) { const a = Math.exp(1 + 0.5 * rnd.normal()), l = Math.exp(0.8 + 0.4 * rnd.normal()), c = Math.exp(0.5 + 0.5 * rnd.normal()), s = a + l + c; cols[0].push((100 * a / s).toFixed(2)); cols[1].push((100 * l / s).toFixed(2)); cols[2].push((100 - +(100 * a / s).toFixed(2) - +(100 * l / s).toFixed(2)).toFixed(2)); cols[3].push((1 + 0.03 * 100 * c / s + 0.2 * rnd.normal()).toFixed(2)); }
  useSim('textura_simulada', 'Simulado: textura del suelo en porcentajes (no son datos reales)', 'Simulated: soil texture in percentages (not real data)', names, cols, null,
    L2('Conjunto simulado: arena, limo y arcilla suman 100 %. No son datos reales.', 'Simulated set: sand, silt and clay add up to 100%. These are not real data.'));
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-10')) return;
  el('b10Iris').addEventListener('click', () => { B2.loadExample('iris'); goStep(10); });
  ['b10GX', 'b10GY', 'b10GG'].forEach(id => el(id).addEventListener('change', paintGroups));
  ['b10RS', 'b10RX', 'b10RY'].forEach(id => el(id).addEventListener('change', paintRm));
  ['b10TX', 'b10TY', 'b10TT'].forEach(id => el(id).addEventListener('change', paintTs));
  ['b10SX', 'b10SY', 'b10SCX', 'b10SCY'].forEach(id => el(id).addEventListener('change', paintSpace));
  ['b10CA', 'b10CB'].forEach(id => el(id).addEventListener('change', paintCirc));
  el('b10KG').addEventListener('change', paintComp);
  el('b10PGo').addEventListener('click', () => { S.tree = el('b10PTree').value; paintPhylo(); });
  el('b10RSim').addEventListener('click', simRm); el('b10SSim').addEventListener('click', simSpace); el('b10PSim').addEventListener('click', simPhylo);
  el('b10CSim').addEventListener('click', simCirc); el('b10KSim').addEventListener('click', simComp);
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 10 && state.data && (S.dirty || !state.structure)) runAll(); });
document.addEventListener('langchange', () => { if (state.data) onData(); });
document.addEventListener('fmtchange', () => { if (state.structure) runAll(); });
window.B10 = { state: S };
})();
