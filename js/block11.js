/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 11, correlation networks: marginal, partial or
   regularized (graphical lasso + EBIC) networks drawn five ways — forces,
   circle, bundled chords, arcs and the matrix itself — with animated
   transitions between them (every edge is a cubic curve whose control
   points move), centralities and communities. The result goes to
   state.network. */
(function () {
'use strict';
const S = { keys: null, view: 'force', dirty: true, anim: null, sel: null };
const W0 = 760, H0 = 560, NS = 'http://www.w3.org/2000/svg';
const label = c => (window.B2 ? B2.label(c) : c.name);
const short = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const fr = v => (isFinite(v) ? Fmt.bounded(v, 2) : '—');
const cands = ds => ds.cols.filter(c => c.role === 'var' && ['continuous', 'ordinal'].includes(c.type));

function onData() {
  const ds = state.data;
  el('b11Empty').hidden = !!ds; el('b11Main').hidden = !ds;
  if (!ds) return;
  const cs = cands(ds);
  const keep = (S.keys || []).filter(k => cs.some(c => c.key === k));
  S.keys = keep.length >= 3 ? keep : cs.slice(0, 40).map(c => c.key);
  paintVars(); S.dirty = true; state.network = null; S.sel = null;
  if (el('panel-11').classList.contains('active')) run();
}
function paintVars() {
  const cs = cands(state.data);
  el('b11Vars').innerHTML = cs.length > 60 ? `<span class="hint">${L2(`Se usan ${S.keys.length} de ${cs.length} variables.`, `Using ${S.keys.length} of ${cs.length} variables.`)}</span>` : cs.map(c => `<button type="button" class="chip${S.keys.includes(c.key) ? ' on' : ''}" data-k="${c.key}">${esc(label(c))}</button>`).join('');
  const kind = el('b11Kind').value;
  el('b11ThrField').hidden = kind !== 'marginal'; el('b11GamField').hidden = kind !== 'lasso';
}

/* ---------------- computation ---------------- */
function compute() {
  const ds = state.data, keys = S.keys, cols = keys.map(k => Array.from(Data.col(ds, k).num)), p = keys.length;
  const rows = Data.completeRows(ds, keys), n = rows.length;
  const X = cols.map(c => rows.map(r => c[r]));
  const method = el('b11Coef').value, kind = el('b11Kind').value;
  const C = Mat.compute(X, { method, missing: 'listwise' });
  let R = C.R;
  const D = Mat.diagnose(R);
  const out = { keys, n, p, kind, method, R };
  if (!D.pd && (kind === 'lasso' || kind === 'partial')) { R = Mat.nearestPD(R).R; out.nearestPD = true; }
  let W;
  if (kind === 'lasso') {
    const E = Net.ebicLasso(R, n, { gamma: +el('b11Gam').value, thr: 1e-8 });
    W = E.net; out.lambda = E.lambda; out.ebic = E;
  } else if (kind === 'partial') {
    const K = Mat.kmo(R), df = n - p;
    const Pm = K.partial.map((row, i) => row.map((v, j) => { if (i === j || df < 1) return NaN; const t = v * Math.sqrt(df / (1 - v * v)); return 2 * Num.pt(-Math.abs(t), df); }));
    const Q = Mat.adjustMatrix(Pm, 'holm');
    W = K.partial.map((row, i) => row.map((v, j) => (i !== j && Q[i][j] < 0.05 ? v : 0)));
  } else if (kind === 'msig') {
    const Q = Mat.adjustMatrix(C.P, 'holm');
    W = R.map((row, i) => row.map((v, j) => (i !== j && Q[i][j] < 0.05 ? v : 0)));
  } else {
    const t = +el('b11Thr').value;
    W = R.map((row, i) => row.map((v, j) => (i !== j && Math.abs(v) >= t ? v : 0)));
  }
  out.W = W;
  out.edges = Net.edges(W);
  out.cent = Net.centrality(W);
  out.com = Net.louvain(W);
  /* communities of two or more nodes, numbered by size; isolated nodes apart */
  const size = {};
  out.com.member.forEach(c => { size[c] = (size[c] || 0) + 1; });
  const real = Object.keys(size).map(Number).filter(c => size[c] > 1).sort((a, b) => size[b] - size[a] || a - b);
  out.show = out.com.member.map(c => (size[c] > 1 ? real.indexOf(c) : -1));
  out.nCom = real.length; out.isolated = out.show.filter(v => v < 0).length;
  out.force = Net.layoutFR(W, { seed: 7 });
  return out;
}
function run() {
  if (!state.data || !S.keys) return;
  clearMessages('b11Msgs');
  if (S.keys.length < 3) { showMessage('b11Msgs', 'warn', L2('Elige al menos tres variables.', 'Pick at least three variables.')); return; }
  const big = S.keys.length > 25 && el('b11Kind').value === 'lasso';
  const w = big && window.LABG ? LABG.work({ title: T('Ajustando la red…', 'Fitting the network…'), message: T('100 penalizaciones del lazo gráfico', '100 graphical lasso penalties'), delay: 200 }) : null;
  const go = () => {
    state.network = compute(); S.dirty = false; S.sel = null;
    const N = state.network;
    if (N.nearestPD) showMessage('b11Msgs', 'info', L2('La matriz no era definida positiva: se usó la más cercana (Bloque 5).', 'The matrix was not positive definite: the nearest one was used (Block 5).'));
    if (N.n < N.p * 3) showMessage('b11Msgs', 'warn', L2(`Hay ${N.n} filas completas para ${N.p} variables: con tan pocas, la red es inestable.`, `There are ${N.n} complete rows for ${N.p} variables: with so few, the network is unstable.`));
    build(); paintCent(); refreshStepMarks();
  };
  if (w) cpAfterPaint(go, w); else { try { go(); } catch (e) { console.error(e); showMessage('b11Msgs', 'error', esc(e.message)); } }
}

/* ---------------- layouts as node positions and edge control points ---------------- */
function layoutOf(view) {
  const N = state.network, p = N.p, m = N.show.map(v => (v < 0 ? 1e6 : v)), order = Net.circleOrder(m);
  const cx = W0 / 2, cy = H0 / 2 + 6;
  let pos;
  if (view === 'force') pos = N.force.map(([x, y]) => [cx + x * 300, cy + y * 220]);
  else if (view === 'circle' || view === 'bundle') { const c = Net.layoutCircle(order); pos = c.map(([x, y]) => [cx + x * 205, cy + y * 205]); }
  else if (view === 'arc') { pos = new Array(p); order.forEach((node, k) => { pos[node] = [60 + k * (W0 - 120) / Math.max(1, p - 1), H0 * 0.66]; }); }
  else { pos = new Array(p); const g = Math.min((W0 - 200) / p, (H0 - 120) / p); order.forEach((node, k) => { pos[node] = [170 + (k + 0.5) * g, 70 + (k + 0.5) * g]; }); }
  /* community centroids on the circle, for the bundles */
  const cent = {};
  if (view === 'bundle') { const groups = {}; m.forEach((c, i) => { (groups[c] = groups[c] || []).push(pos[i]); }); for (const [c, pts] of Object.entries(groups)) { const mx = Num.mean(pts.map(q => q[0])), my = Num.mean(pts.map(q => q[1])); cent[c] = [cx + (mx - cx) * 0.45, cy + (my - cy) * 0.45]; } }
  const ctrl = N.edges.map(e => {
    const a = pos[e.i], b = pos[e.j];
    if (view === 'bundle') { const ca = cent[m[e.i]], cb = cent[m[e.j]]; return m[e.i] === m[e.j] ? [[(a[0] + cx) / 2 * 0.5 + ca[0] * 0.5, (a[1] + cy) / 2 * 0.5 + ca[1] * 0.5], [(b[0] + cx) / 2 * 0.5 + ca[0] * 0.5, (b[1] + cy) / 2 * 0.5 + ca[1] * 0.5]] : [ca, cb]; }
    if (view === 'arc') { const h = Math.abs(b[0] - a[0]) * 0.55; return [[a[0], a[1] - h], [b[0], b[1] - h]]; }
    return [[a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + 2 * (b[0] - a[0]) / 3, a[1] + 2 * (b[1] - a[1]) / 3]];
  });
  return { pos, ctrl, matrix: view === 'matrix' ? 1 : 0, order, view };
}
const f1 = v => v.toFixed(1);
const pathOf = (a, c, b) => `M${f1(a[0])} ${f1(a[1])}C${f1(c[0][0])} ${f1(c[0][1])} ${f1(c[1][0])} ${f1(c[1][1])} ${f1(b[0])} ${f1(b[1])}`;

/* ---------------- drawing ---------------- */
function build() {
  const N = state.network, ds = state.data, p = N.p, names = N.keys.map(k => label(Data.col(ds, k)));
  const pal = Pal.get(View.palette), dark = Pal.darkVersion(pal), maxW = Math.max(1e-9, ...N.edges.map(e => Math.abs(e.w)));
  const maxS = Math.max(1e-9, ...N.cent.strength), cat = Pal.CAT.laca;
  const kindName = { lasso: T(`parciales regularizadas (λ = ${Fmt.num(N.lambda, 3)})`, `regularized partials (λ = ${Fmt.num(N.lambda, 3)})`), partial: T('parciales significativas (Holm)', 'significant partials (Holm)'), msig: T('correlaciones significativas (Holm)', 'significant correlations (Holm)'), marginal: T(`|r| ≥ ${Fmt.bounded(+el('b11Thr').value, 2)}`, `|r| ≥ ${Fmt.bounded(+el('b11Thr').value, 2)}`) }[N.kind];
  el('b11Title').innerHTML = keepGreek(L2(`${p} nodos · ${N.edges.length} aristas · ${esc(kindName)}`, `${p} nodes · ${N.edges.length} edges · ${esc(kindName)}`));
  const L = layoutOf(S.view);
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W0} ${H0}" class="pl b11-svg" data-name="b11-network" role="img" aria-label="${esc(T('Red de correlación', 'Correlation network'))}"><rect class="pl-bg" x="0" y="0" width="${W0}" height="${H0}"/>`;
  /* matrix cells, visible in the matrix view */
  const g = Math.min((W0 - 200) / p, (H0 - 120) / p);
  s += `<g class="b11-cells" style="opacity:${L.matrix}">`;
  L.order.forEach((ni, a) => L.order.forEach((nj, b) => { if (ni === nj) return; const v = N.W[ni][nj]; if (!v) return; s += `<rect class="pl-gl" x="${f1(170 + b * g)}" y="${f1(70 + a * g)}" width="${f1(g - 1)}" height="${f1(g - 1)}" style="--cl:${Pal.color(pal, v, { invert: View.invert })};--cd:${Pal.color(dark, v, { invert: View.invert })}"/>`; }));
  s += `</g><g class="b11-edges" style="opacity:${1 - L.matrix}">`;
  N.edges.forEach((e, k) => {
    const v = Math.sign(e.w) * 0.85;
    s += `<path class="b11-e pl-gls" data-k="${k}" data-i="${e.i}" data-j="${e.j}" d="${pathOf(L.pos[e.i], L.ctrl[k], L.pos[e.j])}" style="--cl:${Pal.color(pal, v, { invert: View.invert })};--cd:${Pal.color(dark, v, { invert: View.invert })};stroke-width:${f1(0.6 + 6 * Math.abs(e.w) / maxW)}"><title>${esc(names[e.i])} — ${esc(names[e.j])}: ${fr(e.w)}</title></path>`;
  });
  s += '</g><g class="b11-nodes">';
  for (let i = 0; i < p; i++) {
    const r = 6 + 11 * N.cent.strength[i] / maxS, [x, y] = L.pos[i];
    const col = N.show[i] < 0 ? 'var(--fig-muted)' : cat[N.show[i] % 8];
    s += `<g class="b11-n" data-i="${i}" transform="translate(${f1(x)} ${f1(y)})"><circle r="${f1(r)}" style="fill:${col}"/><text class="b11-lab" x="${f1(r + 4)}" y="4">${esc(short(names[i], 18))}</text><title>${esc(names[i])}: ${T('fuerza', 'strength')} ${Fmt.num(N.cent.strength[i], 2)}</title></g>`;
  }
  s += '</g></svg>';
  el('b11Net').innerHTML = s;
  S.cur = L;
  placeLabels(L);
  el('b11Leg').innerHTML = `<span class="fl-item"><i class="ln" style="border-top-color:${Pal.color(pal, 0.85, { invert: View.invert })}"></i>${L2('positiva', 'positive')}</span><span class="fl-item"><i class="ln" style="border-top-color:${Pal.color(pal, -0.85, { invert: View.invert })}"></i>${L2('negativa', 'negative')}</span>` +
    Array.from({ length: N.nCom }, (_, c) => `<span class="fl-item"><i style="background:${cat[c % 8]}"></i>${L2('comunidad', 'community')} ${c + 1}</span>`).join('') + (N.isolated ? `<span class="fl-item"><i style="background:var(--fig-muted)"></i>${L2(`aislados (${N.isolated})`, `isolated (${N.isolated})`)}</span>` : '') + `<span class="fl-note">${L2('grosor = |peso|; tamaño del nodo = fuerza; pasa el puntero sobre un nodo para ver sus vecinos', 'thickness = |weight|; node size = strength; hover a node to see its neighbors')}</span>`;
  els('.b11-bar [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === S.view));
  wire();
}
/* label positions by view: outward on the circle, slanted under the arc line, left of the diagonal */
function placeLabels(L) {
  const svg = el('b11Net').querySelector('svg');
  if (!svg) return;
  const cx = W0 / 2, cy = H0 / 2 + 6;
  svg.querySelectorAll('.b11-n').forEach(gn => {
    const i = +gn.dataset.i, t = gn.querySelector('text'), r = +gn.querySelector('circle').getAttribute('r'), [x, y] = L.pos[i];
    t.removeAttribute('transform');
    if (L.view === 'circle' || L.view === 'bundle') { const a = Math.atan2(y - cy, x - cx), right = Math.cos(a) >= 0; t.setAttribute('x', f1(Math.cos(a) * (r + 6))); t.setAttribute('y', f1(Math.sin(a) * (r + 6) + 4)); t.setAttribute('text-anchor', right ? 'start' : 'end'); }
    else if (L.view === 'arc') { t.setAttribute('x', 0); t.setAttribute('y', f1(r + 12)); t.setAttribute('text-anchor', 'end'); t.setAttribute('transform', 'rotate(-40 0 ' + f1(r + 8) + ')'); }
    else if (L.view === 'matrix') { t.setAttribute('x', f1(-(r + 6))); t.setAttribute('y', 4); t.setAttribute('text-anchor', 'end'); }
    else {
      /* to the right of the node, or to its left when it would leave the figure (bold 11 px: about 6.6 px a character) */
      const left = x + r + 4 + 6.6 * t.textContent.length > W0 - 4;
      t.setAttribute('x', f1(left ? -(r + 4) : r + 4)); t.setAttribute('y', 4); t.setAttribute('text-anchor', left ? 'end' : 'start');
    }
  });
}
/* the animated change of view: node positions and edge control points are interpolated */
function animateTo(view, then) {
  const N = state.network;
  if (!N) return;
  const from = S.cur, to = layoutOf(view), svg = el('b11Net').querySelector('svg');
  S.view = view;
  els('.b11-bar [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) { build(); if (then) then(); return; }
  const nodes = [...svg.querySelectorAll('.b11-n')], edges = [...svg.querySelectorAll('.b11-e')], cells = svg.querySelector('.b11-cells'), eg = svg.querySelector('.b11-edges');
  const lerp = (a, b, t) => a + (b - a) * t, lp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  cancelAnimationFrame(S.anim);
  const t0 = performance.now(), D = 1100;
  const step = now => {
    const t = Math.min(1, (now - t0) / D), e = Glyph.ease(t);
    const pos = from.pos.map((a, i) => lp(a, to.pos[i], e));
    nodes.forEach((gn, i) => gn.setAttribute('transform', `translate(${f1(pos[i][0])} ${f1(pos[i][1])})`));
    edges.forEach((pe, k) => { const E = N.edges[k], c = [lp(from.ctrl[k][0], to.ctrl[k][0], e), lp(from.ctrl[k][1], to.ctrl[k][1], e)]; pe.setAttribute('d', pathOf(pos[E.i], c, pos[E.j])); });
    const mx = lerp(from.matrix, to.matrix, e);
    cells.style.opacity = mx; eg.style.opacity = 1 - mx;
    if (t < 1) S.anim = requestAnimationFrame(step);
    else { S.cur = to; placeLabels(to); if (then) then(); }
  };
  if (from.view !== to.view) placeLabels(to.view === 'matrix' ? to : from);
  S.anim = requestAnimationFrame(step);
}
function wire() {
  const svg = el('b11Net').querySelector('svg');
  if (!svg) return;
  const N = state.network, names = N.keys.map(k => label(Data.col(state.data, k)));
  const focus = i => {
    svg.classList.toggle('hl', i != null);
    svg.querySelectorAll('.b11-e').forEach(pe => pe.classList.toggle('on', i != null && (+pe.dataset.i === i || +pe.dataset.j === i)));
    const nb = new Set(i == null ? [] : N.edges.filter(e => e.i === i || e.j === i).flatMap(e => [e.i, e.j]));
    svg.querySelectorAll('.b11-n').forEach(gn => gn.classList.toggle('on', nb.has(+gn.dataset.i) || +gn.dataset.i === i));
  };
  svg.querySelectorAll('.b11-n').forEach(gn => {
    gn.addEventListener('mouseenter', () => focus(+gn.dataset.i));
    gn.addEventListener('mouseleave', () => focus(S.sel));
    gn.addEventListener('click', () => {
      const i = +gn.dataset.i; S.sel = S.sel === i ? null : i; focus(S.sel);
      if (S.sel == null) { el('b11Info').innerHTML = ''; return; }
      const nbs = N.edges.filter(e => e.i === i || e.j === i).map(e => ({ k: e.i === i ? e.j : e.i, w: e.w })).sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
      el('b11Info').innerHTML = `<b>${esc(names[i])}</b> · ${N.show[i] < 0 ? L2('aislado', 'isolated') : L2('comunidad', 'community') + ' ' + (N.show[i] + 1)} · ${L2('fuerza', 'strength')} ${Fmt.num(N.cent.strength[i], 2)} — ` + (nbs.length ? nbs.map(q => `${esc(names[q.k])} <span class="${q.w > 0 ? 'ok-t' : 'bad-t'}">${fr(q.w)}</span>`).join(' · ') : L2('sin aristas', 'no edges'));
    });
  });
}

/* ---------------- centralities ---------------- */
function paintCent() {
  const N = state.network, ds = state.data, names = N.keys.map(k => label(Data.col(ds, k))), C = N.cent;
  const dens = N.edges.length / (N.p * (N.p - 1) / 2);
  statTiles('b11CTiles', [
    [T('Aristas', 'Edges'), `${N.edges.length}`, T(`densidad ${Fmt.num(100 * dens, 1)} %`, `density ${Fmt.num(100 * dens, 1)}%`)],
    [T('Comunidades', 'Communities'), `${N.nCom}`, T(`modularidad Q = ${Fmt.num(N.com.Q, 3)}`, `modularity Q = ${Fmt.num(N.com.Q, 3)}`)],
    [T('Nodo más fuerte', 'Strongest node'), esc(short(names[C.strength.indexOf(Math.max(...C.strength))], 20)), Fmt.num(Math.max(...C.strength), 2)],
    [T('Filas usadas', 'Rows used'), fmtNum(N.n, 0), T('completas en todas', 'complete in all')],
  ]);
  const ord = Num.order(C.strength.map(v => -v));
  el('b11Cent').innerHTML = `<table><thead><tr><th>${L2('Nodo', 'Node')}</th><th class="num">${L2('Comun.', 'Comm.')}</th><th class="num">${L2('Grado', 'Degree')}</th><th class="num">${L2('Fuerza', 'Strength')}</th><th class="num">${L2('Influencia esp.', 'Exp. influence')}</th><th class="num">${L2('Cercanía', 'Closeness')}</th><th class="num">${L2('Intermed.', 'Betweenness')}</th></tr></thead><tbody>` +
    ord.map(i => `<tr><td class="pair-n">${esc(short(names[i], 24))}</td><td class="num">${N.show[i] < 0 ? '—' : N.show[i] + 1}</td><td class="num">${C.degree[i]}</td><td class="num"><b>${Fmt.num(C.strength[i], 2)}</b></td><td class="num">${Fmt.num(C.influence[i], 2)}</td><td class="num">${C.closeness[i] ? Fmt.num(C.closeness[i], 3) : '—'}</td><td class="num">${Fmt.num(C.betweenness[i], 0)}</td></tr>`).join('') + '</tbody></table>';
  const mx = Math.max(...C.strength) || 1;
  el('b11CBar').innerHTML = Plot.forest({ rows: ord.map(i => ({ label: short(names[i], 22), est: C.strength[i] / mx, lo: NaN, hi: NaN, fam: N.show[i] < 0 ? 'none' : ['lin', 'rank', 'rob', 'dep'][N.show[i] % 4] })), w: 420, xlim: [0, 1], plot: 'b11-strength', labelWidth: 170, xlab: T('Fuerza relativa al máximo', 'Strength relative to the maximum') });
}

/* ---------------- wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-11')) return;
  el('b11Swiss').addEventListener('click', () => { B2.loadExample('swiss'); goStep(11); });
  el('b11Vars').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, i = S.keys.indexOf(k); if (i >= 0) { if (S.keys.length > 3) S.keys.splice(i, 1); } else S.keys.push(k); paintVars(); run(); });
  ['b11Kind', 'b11Coef', 'b11Gam'].forEach(id => el(id).addEventListener('change', () => { paintVars(); run(); }));
  el('b11Thr').addEventListener('input', () => { el('b11ThrV').textContent = Fmt.bounded(+el('b11Thr').value, 2); });
  el('b11Thr').addEventListener('change', run);
  els('.b11-bar [data-view]').forEach(b => b.addEventListener('click', () => { if (state.network) animateTo(b.dataset.view); }));
  el('b11Tour').addEventListener('click', () => {
    if (!state.network) return;
    const seq = ['matrix', 'force', 'circle', 'bundle'];
    const go = k => { if (k >= seq.length) return; animateTo(seq[k], () => setTimeout(() => go(k + 1), 700)); };
    S.view = 'matrix'; build(); setTimeout(() => go(1), 900);
  });
  onData();
});
document.addEventListener('datachange', onData);
document.addEventListener('stepchange', e => { if (e.detail.step === 11 && state.data && (S.dirty || !state.network)) run(); });
document.addEventListener('langchange', () => { if (state.data) { paintVars(); if (state.network) { build(); paintCent(); } } });
document.addEventListener('palettechange', () => { if (state.network) build(); });
window.B11 = { state: S };
})();
