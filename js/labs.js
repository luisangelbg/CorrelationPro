/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the six labs of the home page. Each one computes with the
   same engine the app uses on the user's data (Coef, Num, Pal).

   1 Drag the points: twelve coefficients and their p-values, live.
   2 Same r, different shape: the cloud is pulled towards a figure while its
     means, standard deviations and r stay the same to two decimals
     (perturbation with simulated annealing, after Matejka and Fitzmaurice
     2017; the figures are this app's own).
   3 Guess the correlation: scored by how many just-noticeable differences
     the guess is off (Rensink and Baldridge 2010).
   4 What does each coefficient detect: eight shapes, seven coefficients.
   5 The dance of r: repeated samples from one population, their intervals
     and how often they cover ρ.
   6 Range restriction and measurement error: the two ways a real correlation
     comes out smaller, and their corrections (Thorndike 1949; Spearman 1904). */
(function () {
'use strict';
const f = v => (Math.round(v * 100) / 100).toString();
const NS = 'http://www.w3.org/2000/svg';
const RED = '#B3182D', GOLD = '#C9962B', INDIGO = '#555BDC';
const LABS = [
  { id: 'drag', es: 'Arrastra los puntos', en: 'Drag the points', icon: '<circle cx="7" cy="16" r="2"/><circle cx="12" cy="11" r="2"/><circle cx="17" cy="6" r="2"/><path d="M4 20L20 4" opacity=".5"/>' },
  { id: 'same', es: 'Misma r, distinta forma', en: 'Same r, different shape', icon: '<path d="M4 16c3-6 5 2 8-4s5 4 8-2"/><circle cx="6" cy="7" r="1.5"/><circle cx="18" cy="18" r="1.5"/>' },
  { id: 'guess', es: 'Adivina la correlación', en: 'Guess the correlation', icon: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.8.9c0 1.6-2.3 2-2.3 3.4"/><circle cx="12" cy="17" r=".6"/>' },
  { id: 'detect', es: '¿Qué detecta cada coeficiente?', en: 'What does each coefficient detect?', icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/>' },
  { id: 'dance', es: 'La danza de r', en: 'The dance of r', icon: '<path d="M3 6h10M6 10h12M4 14h9M8 18h11"/><circle cx="12" cy="6" r="1.3"/><circle cx="13" cy="10" r="1.3"/><circle cx="9" cy="14" r="1.3"/><circle cx="14" cy="18" r="1.3"/>' },
  { id: 'range', es: 'Rango y error de medición', en: 'Range and measurement error', icon: '<path d="M3 21L21 3"/><rect x="7" y="4" width="6" height="16" opacity=".5"/>' },
];
const sym = id => Fmt.symbol(id, { html: true });
function svgNode(tag, attrs) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }
function pText(p) { return isFinite(p) ? Fmt.pValue(p, { lang: I18N.lang }) : '—'; }

/* ================= lab 1: drag the points ================= */
const Drag = { pts: [], sel: -1, W: 440, H: 380, m: { l: 34, r: 12, t: 12, b: 32 }, pending: false };
const PRESETS = {
  lin: ['Lineal', 'Linear'], out: ['Con un atípico', 'With an outlier'], parab: ['Parábola', 'Parabola'], circle: ['Círculo', 'Circle'],
  step: ['Escalón', 'Step'], noise: ['Al azar', 'Random'], iris: ['Lirios (pétalo)', 'Irises (petal)'],
};
function preset(k) {
  const R = Num.rng(k.length * 97 + 13), P = [];
  const add = (x, y) => P.push([Math.max(0.1, Math.min(9.9, x)), Math.max(0.1, Math.min(9.9, y))]);
  if (k === 'lin') for (let i = 0; i < 30; i++) { const a = R.normal(); add(5 + 1.6 * a, 5 + 1.3 * a + 0.9 * R.normal()); }
  if (k === 'out') { for (let i = 0; i < 28; i++) add(3 + R() * 3, 3 + R() * 3); add(9.3, 9.4); }
  if (k === 'parab') for (let i = 0; i < 30; i++) { const x = 1 + R() * 8; add(x, 1 + 0.32 * (x - 5) ** 2 + 0.4 * R.normal()); }
  if (k === 'circle') for (let i = 0; i < 30; i++) { const t = R() * 2 * Math.PI; add(5 + 3.5 * Math.cos(t) + 0.2 * R.normal(), 5 + 3.5 * Math.sin(t) + 0.2 * R.normal()); }
  if (k === 'step') for (let i = 0; i < 30; i++) { const x = 1 + R() * 8; add(x, (x < 5 ? 3 : 7) + 0.5 * R.normal()); }
  if (k === 'noise') for (let i = 0; i < 30; i++) add(1 + R() * 8, 1 + R() * 8);
  if (k === 'iris') { const D = Datasets.iris, x = D.vars[2].v, y = D.vars[3].v; for (let i = 0; i < 150; i += 3) add(1 + x[i] * 1.2, 1 + y[i] * 3.3); }
  return P;
}
function dragBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('Arrastra un punto, haz clic en un lugar vacío para agregar uno y doble clic sobre uno para quitarlo. Mira cuánto mueve un solo dato a cada coeficiente: las <b>robustas</b> y las <b>de rangos</b> apenas se inmutan; Pearson salta. Las <b>no lineales</b> detectan el círculo y la parábola que Pearson no ve.',
    'Drag a point, click an empty spot to add one and double-click a point to remove it. See how much a single datum moves each coefficient: the <b>robust</b> and <b>rank</b> ones barely react; Pearson jumps. The <b>nonlinear</b> ones detect the circle and the parabola Pearson misses.')}</p>` +
    `<div class="pg-controls"><div class="preset-row">${Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="chip" data-preset="${k}">${L2(v[0], v[1])}</button>`).join('')}</div></div>` +
    `<div class="lab-grid"><div class="pg-pane"><div class="pg-title">${L2('Tus datos', 'Your data')} · <span id="dragN"></span></div><div id="dragSvg"></div></div>` +
    `<div><div class="coef-list" id="dragCoefs"></div><p class="lab-note">${L2('Valores p bilaterales salvo en las de dependencia general (unilaterales). Hoeffding: 199 permutaciones con semilla fija. τ*: sólo el estimador.', 'Two-sided p-values except for the general-dependence ones (one-sided). Hoeffding: 199 permutations with a fixed seed. τ*: estimator only.')}</p></div></div>`;
  Drag.pts = preset('lin');
  host.querySelector('.preset-row').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (!b) return; Drag.pts = preset(b.dataset.preset); dragDraw(); });
  dragDraw();
}
function dragScale() {
  const { W, H, m } = Drag;
  return { sx: Plot.scale(0, 10, m.l, W - m.r), sy: Plot.scale(0, 10, H - m.b, m.t) };
}
function dragDraw() {
  const host = el('dragSvg');
  if (!host) return;
  const { W, H, m } = Drag, { sx, sy } = dragScale();
  const xt = { ticks: [0, 2, 4, 6, 8, 10], step: 2 };
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="pl drag-surface" data-name="lab-drag" role="img" aria-label="${esc(T('Nube de puntos que se puede editar', 'Editable scatter plot'))}"><rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
  s += Plot.frame({ x0: m.l, x1: W - m.r, y0: H - m.b, y1: m.t, sx, sy, xt, yt: xt, xlab: 'x', ylab: '' });
  s += `<g id="dragFit"></g><g id="dragPts"></g></svg>`;
  host.innerHTML = s;
  const svg = host.querySelector('svg');
  const toData = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [Math.max(0.05, Math.min(9.95, sx.inv(q.x))), Math.max(0.05, Math.min(9.95, sy.inv(q.y)))]; };
  svg.addEventListener('pointerdown', ev => {
    const c = ev.target.closest('.pt');
    if (c) { Drag.sel = +c.dataset.i; c.classList.add('on'); svg.setPointerCapture(ev.pointerId); ev.preventDefault(); return; }
    if (Drag.pts.length >= 150) return;
    Drag.pts.push(toData(ev)); Drag.sel = Drag.pts.length - 1; svg.setPointerCapture(ev.pointerId); dragPaint();
  });
  svg.addEventListener('pointermove', ev => { if (Drag.sel < 0) return; Drag.pts[Drag.sel] = toData(ev); dragPaint(); });
  const up = () => { Drag.sel = -1; dragPaint(); };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('dblclick', ev => { const c = ev.target.closest('.pt'); if (c && Drag.pts.length > 4) { Drag.pts.splice(+c.dataset.i, 1); dragPaint(); } });
  dragPaint();
}
function dragPaint() {
  const g = el('dragPts'), fit = el('dragFit');
  if (!g) return;
  const { sx, sy } = dragScale();
  g.innerHTML = Drag.pts.map((p, i) => `<circle class="pt${i === Drag.sel ? ' on' : ''}" data-i="${i}" cx="${f(sx(p[0]))}" cy="${f(sy(p[1]))}" r="6" fill="${i === Drag.sel ? RED : 'var(--fig-point)'}" fill-opacity=".85" stroke="var(--fig-bg)" stroke-width="1.5"/>`).join('');
  const x = Drag.pts.map(p => p[0]), y = Drag.pts.map(p => p[1]);
  const mo = Plot.moments(x, y);
  if (mo.vx > 0) {
    const b = mo.cxy / mo.vx, a = mo.my - b * mo.mx;
    fit.innerHTML = `<path class="pl-ell" d="${Plot.ellipsePath(mo.mx, mo.my, mo.vx, mo.vy, mo.cxy, 0.68, sx, sy)}" style="stroke:${GOLD};fill:${GOLD}"/><line x1="${f(sx(0))}" y1="${f(sy(a))}" x2="${f(sx(10))}" y2="${f(sy(a + 10 * b))}" stroke="${RED}" stroke-width="2" stroke-dasharray="6 4" clip-path="none"/>`;
  }
  el('dragN').textContent = 'n = ' + Drag.pts.length;
  if (!Drag.pending) { Drag.pending = true; requestAnimationFrame(() => { Drag.pending = false; dragCoefs(x, y); }); }
}
function coefRow(c, res, uni) {
  const v = res.est, ok = isFinite(v);
  const val = ok ? (c.id === 'hoeffding' ? Fmt.bounded(v, 3) : Fmt.bounded(v, 2)) : '—';
  let bar = '';
  if (ok) {
    const col = Pal.color(View.palette === 'olinala' ? 'anil' : (Pal.get(View.palette).kind === 'div' ? View.palette : 'anil'), Math.max(-1, Math.min(1, v)), { invert: View.invert });
    if (uni) bar = `<i style="left:0;width:${f(Math.max(0, Math.min(1, v)) * 100)}%;background:${col}"></i>`;
    else { const w = Math.min(1, Math.abs(v)) * 50; bar = `<i style="left:${f(v >= 0 ? 50 : 50 - w)}%;width:${f(w)}%;background:${col}"></i>`; }
  }
  const sig = isFinite(res.p) && res.p < 0.05;
  return `<div class="coef-row" title="${esc((res.conv || []).map(x => T(x[0], x[1])).join(' '))}"><span class="cn">${sym(c.id)} <small>${L2(c.es, c.en)}</small></span><span class="coef-bar${uni ? ' uni' : ''}">${bar}</span><span class="cv">${val}</span><span class="cp${sig ? ' sig' : ''}">${isFinite(res.p) ? 'p ' + pText(res.p) : '—'}</span></div>`;
}
function dragCoefs(x, y) {
  const host = el('dragCoefs');
  if (!host) return;
  const fams = { lin: ['Lineal', 'Linear'], rank: ['De rangos', 'Rank'], rob: ['Robustas', 'Robust'], dep: ['Dependencia general', 'General dependence'] };
  let html = '', last = '';
  for (const c of Coef.PAIR) {
    if (c.fam !== last) { html += `<div class="coef-fam">${L2(fams[c.fam][0], fams[c.fam][1])}</div>`; last = c.fam; }
    let res;
    try { res = c.f(x, y); } catch (e) { res = { est: NaN, p: NaN }; }
    if (c.id === 'hoeffding' && x.length <= 80 && x.length >= 5) {
      const pm = Coef.permutation((a, b) => Coef.hoeffding(a, b).est, x, y, { B: 199, alt: 'greater', seed: 7 });
      res.p = pm.p;
    }
    html += coefRow(c, res, ['dcor', 'taustar'].includes(c.id));
  }
  host.innerHTML = html;
}

/* ================= lab 2: same r, different shape ================= */
const Same = { pts: null, target: 'ajolote', run: false, it: 0, raf: null, stats0: null, segs: null };
function ellipseSegs(cx, cy, rx, ry, rot, k) {
  const P = [];
  for (let i = 0; i <= (k || 36); i++) { const t = 2 * Math.PI * i / (k || 36), u = rx * Math.cos(t), v = ry * Math.sin(t), c = Math.cos(rot || 0), s = Math.sin(rot || 0); P.push([cx + u * c - v * s, cy + u * s + v * c]); }
  return P;
}
const SHAPES = {
  ajolote: ['Ajolote', 'Axolotl', () => [
    ellipseSegs(48, 45, 27, 10.5), ellipseSegs(80, 46, 10.5, 9),
    [[74, 53], [69, 67]], [[78, 55], [77, 70]], [[83, 54], [87, 67]], [[74, 39], [68, 27]], [[79, 37], [77, 24]], [[84, 38], [88, 26]],
    [[22, 51], [4, 49], [22, 39]], [[64, 36], [67, 23]], [[38, 36], [35, 23]], ellipseSegs(85, 49, 1.4, 1.4, 0, 8), [[85, 42], [90, 43]]]],
  nopal: ['Nopal', 'Prickly pear', () => [ellipseSegs(50, 33, 20, 27), ellipseSegs(32, 72, 12, 15, -0.45), ellipseSegs(69, 74, 11, 14, 0.45), ellipseSegs(73, 90, 3, 3.5, 0, 12), ellipseSegs(28, 89, 3, 3.5, 0, 12)]],
  piramide: ['Pirámide', 'Pyramid', () => [[[8, 8], [92, 8]], [[8, 8], [15, 28], [24, 28], [29, 46], [37, 46], [41, 62], [46, 62], [47, 72], [53, 72], [54, 62], [59, 62], [63, 46], [71, 46], [76, 28], [85, 28], [92, 8]], [[46, 8], [47, 72]], [[54, 8], [53, 72]], [[46, 72], [46, 82], [54, 82], [54, 72]]]],
  maguey: ['Maguey', 'Agave', () => {
    const S = [];
    [[15, 48], [32, 56], [52, 60], [72, 58], [90, 52], [108, 58], [128, 60], [148, 56], [165, 48]].forEach(([a, L]) => {
      const t = a * Math.PI / 180, tip = [50 + L * Math.cos(t), 10 + L * Math.sin(t) * 0.95];
      const w = 3.2, nx = -Math.sin(t) * w, ny = Math.cos(t) * w;
      S.push([[50 + nx, 10 + ny], tip, [50 - nx, 10 - ny]]);
    });
    S.push([[50, 10], [50, 97]], [[50, 86], [60, 92]], [[50, 80], [40, 87]], [[50, 90], [44, 96]]);
    return S;
  }],
  estrella: ['Estrella', 'Star', () => { const P = []; for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, R = i % 2 ? 17 : 42; P.push([50 + R * Math.cos(a), 50 + R * Math.sin(a)]); } return [P]; }],
  circulo: ['Círculo', 'Circle', () => [ellipseSegs(50, 50, 34, 34, 0, 60)]],
  x: ['Equis', 'X', () => [[[12, 12], [88, 88]], [[12, 88], [88, 12]]]],
};
function segList(shape) {
  const L = [];
  shape.forEach(poly => { for (let i = 0; i + 1 < poly.length; i++) L.push([poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]]); });
  return L;
}
function distSeg(px, py, L) {
  let best = Infinity;
  for (const [x1, y1, x2, y2] of L) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x1 + t * dx - px, ey = y1 + t * dy - py, d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
/* the five summaries kept fixed, from running sums */
function sums(P) { const s = { n: P.length, x: 0, y: 0, xx: 0, yy: 0, xy: 0 }; for (const [a, b] of P) { s.x += a; s.y += b; s.xx += a * a; s.yy += b * b; s.xy += a * b; } return s; }
function statsOf(s) {
  const n = s.n, mx = s.x / n, my = s.y / n;
  const vx = (s.xx - n * mx * mx) / (n - 1), vy = (s.yy - n * my * my) / (n - 1), c = (s.xy - n * mx * my) / (n - 1);
  return { mx, my, sx: Math.sqrt(vx), sy: Math.sqrt(vy), r: c / Math.sqrt(vx * vy) };
}
const round2 = st => [st.mx, st.my, st.sx, st.sy, st.r].map(v => Math.round(v * 100) / 100).join('|');
function sameReset() {
  const R = Num.rng(2017), P = [];
  for (let i = 0; i < 110; i++) { const a = R.normal(), b = R.normal(); P.push([54 + 16 * a, 48 + 14 * (0.15 * a + 0.99 * b)]); }
  Same.pts = P; Same.it = 0;
  Same.stats0 = round2(statsOf(sums(P)));
}
function sameBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('Los puntos se mueven poco a poco hacia la figura que elijas, pero un movimiento sólo se acepta si las <b>medias</b>, las <b>desviaciones estándar</b> y la <b>r de Pearson</b> siguen iguales a dos decimales. Al final tienes nubes completamente distintas con los mismos números: por eso <b>siempre hay que ver los datos</b> (Anscombe 1973). El método es el recocido simulado de Matejka y Fitzmaurice (2017); las figuras son de esta app.',
    'The points drift towards the figure you pick, but a move is only accepted if the <b>means</b>, the <b>standard deviations</b> and <b>Pearson\'s r</b> stay equal to two decimals. You end up with completely different clouds with the same numbers: that is why <b>one must always look at the data</b> (Anscombe 1973). The method is the simulated annealing of Matejka and Fitzmaurice (2017); the figures are this app\'s own.')}</p>` +
    `<div class="pg-controls"><div class="preset-row" id="sameShapes">${Object.entries(SHAPES).map(([k, v]) => `<button type="button" class="chip${k === Same.target ? ' on' : ''}" data-shape="${k}">${L2(v[0], v[1])}</button>`).join('')}</div>` +
    `<button type="button" class="btn btn-primary btn-sm" id="sameGo">${L2('Transformar', 'Morph')}</button><button type="button" class="btn btn-ghost btn-sm" id="sameReset">${L2('Volver a la nube', 'Back to the cloud')}</button></div>` +
    `<div class="lab-grid"><div class="pg-pane"><div id="sameSvg"></div></div><div><div class="score-tiles" id="sameStats"></div><p class="pg-status" id="sameStatus"></p></div></div>`;
  sameReset();
  host.querySelector('#sameShapes').addEventListener('click', e => {
    const b = e.target.closest('[data-shape]'); if (!b) return;
    Same.target = b.dataset.shape; host.querySelectorAll('#sameShapes .chip').forEach(c => c.classList.toggle('on', c === b));
    Same.it = 0; samePaint(); sameStart();
  });
  el('sameGo').addEventListener('click', () => { Same.it = 0; sameStart(); });
  el('sameReset').addEventListener('click', () => { sameStop(); sameReset(); samePaint(); });
  samePaint();
}
/* points spread along the outline by length, to measure the figure */
function outlineSample(L, k) {
  const len = L.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1)), tot = len.reduce((a, b) => a + b, 0), P = [];
  L.forEach((s, i) => { const m = Math.max(1, Math.round(k * len[i] / tot)); for (let j = 0; j < m; j++) { const t = (j + 0.5) / m; P.push([s[0] + (s[2] - s[0]) * t, s[1] + (s[3] - s[1]) * t]); } });
  return P;
}
/* the figure moved and stretched so that its outline has the cloud's means and
   standard deviations: the summaries kept fixed can then be met on the figure */
function fitShape(L, st) {
  const S = outlineSample(L, 600), n = S.length;
  const mx = S.reduce((a, p) => a + p[0], 0) / n, my = S.reduce((a, p) => a + p[1], 0) / n;
  const sx = Math.sqrt(S.reduce((a, p) => a + (p[0] - mx) ** 2, 0) / (n - 1)), sy = Math.sqrt(S.reduce((a, p) => a + (p[1] - my) ** 2, 0) / (n - 1));
  const X = v => st.mx + (v - mx) * st.sx / sx, Y = v => st.my + (v - my) * st.sy / sy;
  return L.map(([x1, y1, x2, y2]) => [X(x1), Y(y1), X(x2), Y(y2)]);
}
function sameStart() {
  sameStop();
  Same.segs = fitShape(segList(SHAPES[Same.target][2]()), statsOf(sums(Same.pts)));
  Same.run = true;
  const R = Num.rng(Same.it + 31);
  const s = sums(Same.pts);
  const TOTAL = 160000;
  const loop = () => {
    if (!Same.run) return;
    for (let k = 0; k < 2500 && Same.it < TOTAL; k++, Same.it++) {
      const temp = 0.4 * (1 - Same.it / TOTAL) + 0.01;
      const i = Math.floor(R() * Same.pts.length), [a, b] = Same.pts[i];
      const na = a + R.normal() * 0.45, nb = b + R.normal() * 0.45;
      if (na < -15 || na > 115 || nb < -15 || nb > 115) continue;
      const d0 = distSeg(a, b, Same.segs), d1 = distSeg(na, nb, Same.segs);
      if (!(d1 < d0 || R() < temp)) continue;
      s.x += na - a; s.y += nb - b; s.xx += na * na - a * a; s.yy += nb * nb - b * b; s.xy += na * nb - a * b;
      if (round2(statsOf(s)) !== Same.stats0) { s.x -= na - a; s.y -= nb - b; s.xx -= na * na - a * a; s.yy -= nb * nb - b * b; s.xy -= na * nb - a * b; continue; }
      Same.pts[i] = [na, nb];
    }
    samePaint();
    if (Same.it < TOTAL) Same.raf = requestAnimationFrame(loop); else Same.run = false;
  };
  Same.raf = requestAnimationFrame(loop);
}
function sameStop() { Same.run = false; cancelAnimationFrame(Same.raf); }
function samePaint() {
  const host = el('sameSvg');
  if (!host) return;
  const W = 460, H = 420, sx = Plot.scale(-10, 110, 30, W - 12), sy = Plot.scale(-10, 110, H - 28, 12);
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="pl" data-name="lab-same" role="img" aria-label="${esc(T('Nube que se transforma en una figura', 'Cloud morphing into a figure'))}"><rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
  s += Plot.frame({ x0: 30, x1: W - 12, y0: H - 28, y1: 12, sx, sy, xt: { ticks: [0, 25, 50, 75, 100], step: 25 }, yt: { ticks: [0, 25, 50, 75, 100], step: 25 } });
  if (Same.segs && Same.run) s += `<g stroke="${GOLD}" stroke-opacity=".35" stroke-width="6" stroke-linecap="round" fill="none">${Same.segs.map(([x1, y1, x2, y2]) => `<line x1="${f(sx(x1))}" y1="${f(sy(y1))}" x2="${f(sx(x2))}" y2="${f(sy(y2))}"/>`).join('')}</g>`;
  s += Same.pts.map(([a, b]) => `<circle cx="${f(sx(a))}" cy="${f(sy(b))}" r="3" fill="${RED}" fill-opacity=".88"/>`).join('');
  host.innerHTML = s + '</svg>';
  const st = statsOf(sums(Same.pts));
  el('sameStats').innerHTML = [['x̄', st.mx], ['ȳ', st.my], [T('DE de x', 'SD of x'), st.sx], [T('DE de y', 'SD of y'), st.sy], ['r', st.r]]
    .map(([k, v]) => `<div><small>${k}</small><b>${k === 'r' ? Fmt.bounded(v, 2) : Fmt.num(v, 2)}</b></div>`).join('');
  const pct = Math.round(100 * Same.it / 160000);
  el('sameStatus').innerHTML = Same.run ? L2(`Transformando… ${pct} %`, `Morphing… ${pct}%`) : L2('Los cinco números de arriba no cambian en ningún momento.', 'The five numbers above never change.');
}

/* ================= lab 3: guess the correlation ================= */
const Guess = { round: 0, total: 0, errs: [], r: 0, x: [], y: [], shown: false, seed: 1 };
/* the just-noticeable difference of a correlation (Rensink and Baldridge 2010):
   proportional to (1/b − |r|), smaller for strong correlations; b ≈ 0.9 and
   the constant are approximate values from that line of work */
const jnd = r => 0.22 * (1 / 0.9 - Math.min(0.99, Math.abs(r)));
function guessNew() {
  const R = Num.rng(Guess.seed++ * 7919);
  const rho = Math.round((R() * 2 - 1) * 100) / 100, n = 80, x = [], y = [];
  for (let i = 0; i < n; i++) { const a = R.normal(), b = R.normal(); x.push(a); y.push(rho * a + Math.sqrt(1 - rho * rho) * b); }
  Guess.x = x; Guess.y = y; Guess.r = Coef.pearson(x, y).est; Guess.shown = false;
}
function guessBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('¿Qué tan bien lees una nube? Mueve el control hasta la <i>r</i> que creas y pulsa «Comprobar». La puntuación no cuenta el error a secas: lo divide entre la diferencia que el ojo alcanza a notar, que es grande cerca de cero y chica cerca de ±1. Diez rondas.',
    'How well do you read a cloud? Move the control to the <i>r</i> you believe and press «Check». The score does not count the raw error: it divides it by the difference the eye can notice, which is large near zero and small near ±1. Ten rounds.')}</p>` +
    `<div class="lab-grid"><div class="pg-pane"><div id="guessSvg"></div></div><div>` +
    `<div class="lab-big" id="guessVal">.00</div><input type="range" class="guess-range" id="guessIn" min="-1" max="1" step="0.01" value="0" aria-label="${esc(T('Tu estimación de r', 'Your estimate of r'))}">` +
    `<div class="btn-row"><button type="button" class="btn btn-primary" id="guessCheck">${L2('Comprobar', 'Check')}</button><button type="button" class="btn btn-secondary" id="guessNext">${L2('Otra nube', 'Another cloud')}</button><button type="button" class="btn btn-ghost" id="guessRestart">${L2('Empezar de nuevo', 'Start over')}</button></div>` +
    `<div class="score-tiles" id="guessTiles"></div><p class="pg-status" id="guessMsg"></p></div></div>`;
  const inp = el('guessIn');
  inp.addEventListener('input', () => { el('guessVal').textContent = Fmt.bounded(+inp.value, 2); });
  el('guessCheck').addEventListener('click', () => {
    if (Guess.shown || Guess.round >= 10) return;
    const g = +inp.value, err = Math.abs(g - Guess.r), units = err / jnd(Guess.r), pts = Math.round(100 * Math.exp(-units / 2));
    Guess.shown = true; Guess.round++; Guess.total += pts; Guess.errs.push(err);
    el('guessMsg').innerHTML = L2(`La <i>r</i> de esta nube es <b>${Fmt.bounded(Guess.r, 2)}</b>; te desviaste ${Fmt.num(err, 2)} (${Fmt.num(units, 1)} diferencias notables): <b>${pts} puntos</b>.`,
      `The <i>r</i> of this cloud is <b>${Fmt.bounded(Guess.r, 2)}</b>; you were off by ${Fmt.num(err, 2)} (${Fmt.num(units, 1)} noticeable differences): <b>${pts} points</b>.`) +
      (Guess.round >= 10 ? ' ' + L2(`Fin: <b>${Guess.total}</b> de 1000.`, `End: <b>${Guess.total}</b> out of 1000.`) : '');
    guessTiles(); guessPaint();
  });
  el('guessNext').addEventListener('click', () => { if (Guess.round >= 10) return; guessNew(); el('guessMsg').innerHTML = ''; guessPaint(); });
  el('guessRestart').addEventListener('click', () => { Object.assign(Guess, { round: 0, total: 0, errs: [] }); guessNew(); el('guessMsg').innerHTML = ''; guessTiles(); guessPaint(); });
  guessNew(); guessTiles(); guessPaint();
}
function guessTiles() {
  const me = Guess.errs.length ? Guess.errs.reduce((a, b) => a + b, 0) / Guess.errs.length : NaN;
  el('guessTiles').innerHTML = `<div><small>${L2('Ronda', 'Round')}</small><b>${Math.min(10, Guess.round + (Guess.shown ? 0 : 1))} / 10</b></div><div><small>${L2('Puntos', 'Points')}</small><b>${Guess.total}</b></div><div><small>${L2('Error medio', 'Mean error')}</small><b>${isFinite(me) ? Fmt.num(me, 2) : '—'}</b></div>`;
}
function guessPaint() {
  el('guessSvg').innerHTML = Plot.scatter({ x: Guess.x, y: Guess.y, w: 440, h: 400, legend: false, xlab: 'x', ylab: 'y', plot: 'lab-guess', clip: 'gsc', xlim: [-3.6, 3.6], ylim: [-3.6, 3.6], ellipse: Guess.shown ? 0.68 : 0, fit: Guess.shown ? 'ols' : 'none' });
}

/* ================= lab 4: what does each coefficient detect ================= */
const DET_SHAPES = [
  ['lin', 'Recta con ruido', 'Noisy line'], ['mono', 'Monótona curva', 'Curved monotonic'], ['parab', 'Parábola', 'Parabola'], ['sine', 'Seno', 'Sine'],
  ['circle', 'Círculo', 'Circle'], ['x', 'Equis', 'X'], ['step', 'Escalón', 'Step'], ['fan', 'Abanico', 'Fan'], ['indep', 'Independencia', 'Independence'],
];
const DET_COEF = ['pearson', 'spearman', 'kendall', 'blomqvist', 'dcor', 'xi', 'hoeffding'];
function detData(k, n, seed) {
  const R = Num.rng(seed), x = [], y = [];
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, e = R.normal();
    let X = u, Y;
    if (k === 'lin') Y = u + 0.4 * e;
    else if (k === 'mono') Y = Math.exp(2.2 * u) + 0.3 * e;
    else if (k === 'parab') Y = u * u + 0.08 * e;
    else if (k === 'sine') Y = Math.sin(4 * u) + 0.15 * e;
    else if (k === 'circle') { const t = R() * 2 * Math.PI; X = Math.cos(t) + 0.05 * R.normal(); Y = Math.sin(t) + 0.05 * e; }
    else if (k === 'x') Y = (R() < 0.5 ? u : -u) + 0.05 * e;
    else if (k === 'step') Y = (u > 0 ? 1 : 0) + 0.15 * e;
    else if (k === 'fan') Y = u * e;
    else Y = R.normal();
    x.push(X); y.push(Y);
  }
  return [x, y];
}
const Det = { n: 150, seed: 1 };
function detectBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('Nueve formas de relación, siete coeficientes. Pearson sólo ve la recta; Spearman y Kendall, lo monótono; la correlación de distancias, la ξ de Chatterjee y la D de Hoeffding detectan también la parábola, el seno, el círculo y la equis. El color es el valor absoluto; con asterisco, los significativos al 5 %.',
    'Nine shapes of relation, seven coefficients. Pearson only sees the line; Spearman and Kendall, what is monotonic; distance correlation, Chatterjee\'s ξ and Hoeffding\'s D also detect the parabola, the sine, the circle and the X. Colour is the absolute value; with an asterisk, those significant at 5 %.')}</p>` +
    `<div class="pg-controls"><label class="inline-label" for="detN">n = <b id="detNv">150</b></label><input type="range" id="detN" min="20" max="400" step="10" value="150" style="width:200px"><button type="button" class="btn btn-secondary btn-sm" id="detAgain">${L2('Otra muestra', 'Another sample')}</button></div>` +
    `<div class="detect-wrap" id="detTable"></div><p class="lab-note">${L2('Valores p: Pearson y Spearman por t, Kendall normal, Blomqvist normal, dCor por su prueba t, ξ asintótica, Hoeffding por 199 permutaciones.', 'p-values: Pearson and Spearman by t, Kendall normal, Blomqvist normal, dCor by its t test, ξ asymptotic, Hoeffding by 199 permutations.')}</p>`;
  const inp = el('detN');
  inp.addEventListener('input', () => { el('detNv').textContent = inp.value; });
  inp.addEventListener('change', () => { Det.n = +inp.value; detectPaint(); });
  el('detAgain').addEventListener('click', () => { Det.seed++; detectPaint(); });
  detectPaint();
}
function detectPaint() {
  const host = el('detTable');
  if (!host) return;
  const seq = Pal.get('lacandona');
  let h = `<table class="detect-table"><thead><tr><th></th><th></th>${DET_COEF.map(id => `<th>${sym(id)}</th>`).join('')}</tr></thead><tbody>`;
  DET_SHAPES.forEach(([k, es, en], j) => {
    const [x, y] = detData(k, Det.n, Det.seed * 101 + j);
    const mini = Art.dots(x, y, [3, 3, 58, 38], 'var(--fig-point)', 1);
    h += `<tr><td class="mini"><svg viewBox="0 0 64 44" aria-hidden="true">${mini}</svg></td><th class="rowh">${L2(es, en)}</th>`;
    DET_COEF.forEach(id => {
      const c = Coef.PAIR.find(q => q.id === id);
      const res = c.f(x, y, id === 'kendall' ? { exact: false } : {});
      if (id === 'hoeffding') res.p = Coef.permutation((a, b) => Coef.hoeffding(a, b).est, x, y, { B: 199, alt: 'greater', seed: 3 }).p;
      const v = Math.min(1, Math.abs(res.est)), bg = Pal.color(seq, v * 0.9), ink = Pal.inkOn(bg);
      const sig = isFinite(res.p) && res.p < 0.05;
      h += `<td class="${sig ? 'sig' : 'ns'}" style="background:${bg};color:${ink}" title="p ${pText(res.p)}">${Fmt.bounded(res.est, 2)}${sig ? '<sup>*</sup>' : ''}</td>`;
    });
    h += '</tr>';
  });
  host.innerHTML = h + '</tbody></table>';
}

/* ================= lab 5: the dance of r ================= */
const Dance = { rho: 0.5, n: 20, list: [], hist: new Array(40).fill(0), total: 0, cover: 0, raf: null, run: false, seed: 1, last: 0 };
function danceBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('Cada fila es una muestra nueva de la misma población, con su <i>r</i> y su intervalo del 95 %. Mira cuánto «baila» <i>r</i> con muestras chicas y cuántos intervalos tocan la ρ verdadera (la línea dorada): a la larga, el 95 %. Al lado se junta la distribución de <i>r</i> (Cumming 2008).',
    'Each row is a new sample from the same population, with its <i>r</i> and its 95 % interval. See how much <i>r</i> «dances» with small samples and how many intervals touch the true ρ (the gold line): in the long run, 95 %. Alongside, the distribution of <i>r</i> builds up (Cumming 2008).')}</p>` +
    `<div class="pg-controls"><label class="inline-label" for="danceRho">ρ = <b id="danceRhov">.50</b></label><input type="range" id="danceRho" min="-0.95" max="0.95" step="0.05" value="0.5" style="width:160px">` +
    `<label class="inline-label" for="danceN">n = <b id="danceNv">20</b></label><input type="range" id="danceN" min="5" max="200" step="1" value="20" style="width:160px">` +
    `<button type="button" class="btn btn-primary btn-sm" id="danceGo">${L2('Bailar', 'Dance')}</button><button type="button" class="btn btn-ghost btn-sm" id="danceClear">${L2('Borrar', 'Clear')}</button></div>` +
    `<div class="lab-grid"><div class="pg-pane"><div id="danceSvg"></div></div><div class="pg-pane"><div id="danceHist"></div></div></div><p class="pg-status" id="danceMsg"></p>`;
  const rho = el('danceRho'), n = el('danceN');
  const reset = () => { Dance.list = []; Dance.hist.fill(0); Dance.total = 0; Dance.cover = 0; dancePaint(); };
  rho.addEventListener('input', () => { Dance.rho = +rho.value; el('danceRhov').textContent = Fmt.bounded(Dance.rho, 2); reset(); });
  n.addEventListener('input', () => { Dance.n = +n.value; el('danceNv').textContent = Dance.n; reset(); });
  el('danceGo').addEventListener('click', () => { if (Dance.run) danceStop(); else danceStart(); });
  el('danceClear').addEventListener('click', reset);
  dancePaint();
}
function danceSample() {
  const R = Num.rng(Dance.seed++ * 104729), x = [], y = [], rho = Dance.rho;
  for (let i = 0; i < Dance.n; i++) { const a = R.normal(), b = R.normal(); x.push(a); y.push(rho * a + Math.sqrt(1 - rho * rho) * b); }
  const res = Coef.pearson(x, y);
  const ok = res.ci && res.ci.lo <= rho && rho <= res.ci.hi;
  Dance.list.unshift({ r: res.est, lo: res.ci ? res.ci.lo : NaN, hi: res.ci ? res.ci.hi : NaN, ok });
  if (Dance.list.length > 28) Dance.list.pop();
  const bin = Math.max(0, Math.min(39, Math.floor((res.est + 1) * 20)));
  Dance.hist[bin]++; Dance.total++; if (ok) Dance.cover++;
}
function danceStart() {
  Dance.run = true;
  el('danceGo').innerHTML = L2('Detener', 'Stop');
  const loop = now => {
    if (!Dance.run) return;
    if (now - Dance.last > 180) { danceSample(); dancePaint(); Dance.last = now; }
    Dance.raf = requestAnimationFrame(loop);
  };
  Dance.raf = requestAnimationFrame(loop);
}
function danceStop() { Dance.run = false; cancelAnimationFrame(Dance.raf); const b = el('danceGo'); if (b) b.innerHTML = L2('Bailar', 'Dance'); }
function dancePaint() {
  const host = el('danceSvg');
  if (!host) return;
  const W = 440, H = 420, sx = Plot.scale(-1, 1, 30, W - 14);
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="pl" data-name="lab-dance" role="img" aria-label="${esc(T('Intervalos de muestras repetidas', 'Intervals of repeated samples'))}"><rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
  s += `<g class="pl-grid">${[-1, -0.5, 0, 0.5, 1].map(v => `<line x1="${f(sx(v))}" y1="10" x2="${f(sx(v))}" y2="${H - 28}"/>`).join('')}</g>`;
  s += `<g class="pl-tick">${[-1, -0.5, 0, 0.5, 1].map(v => `<text x="${f(sx(v))}" y="${H - 12}" text-anchor="middle">${Fmt.bounded(v, 1)}</text>`).join('')}</g>`;
  s += `<line x1="${f(sx(Dance.rho))}" y1="6" x2="${f(sx(Dance.rho))}" y2="${H - 26}" stroke="${GOLD}" stroke-width="2.5"/>`;
  Dance.list.forEach((d, i) => {
    const y = 18 + i * 13.6, c = d.ok ? 'var(--fig-ink)' : RED;
    if (isFinite(d.lo)) s += `<line x1="${f(sx(d.lo))}" y1="${f(y)}" x2="${f(sx(d.hi))}" y2="${f(y)}" stroke="${c}" stroke-width="${d.ok ? 1.6 : 2.4}"/>`;
    s += `<circle cx="${f(sx(d.r))}" cy="${f(y)}" r="${i === 0 ? 5 : 3.4}" fill="${d.ok ? INDIGO : RED}"/>`;
  });
  host.innerHTML = s + '</svg>';
  /* histogram with the theoretical density of r (Fisher's exact form via z) */
  const HW = 440, HH = 420, hsx = Plot.scale(-1, 1, 30, HW - 14), max = Math.max(1, ...Dance.hist);
  let h = `<svg xmlns="${NS}" viewBox="0 0 ${HW} ${HH}" class="pl" data-name="lab-dance-hist" role="img" aria-label="${esc(T('Distribución de r', 'Distribution of r'))}"><rect class="pl-bg" x="0" y="0" width="${HW}" height="${HH}"/>`;
  Dance.hist.forEach((c, i) => { const hh = c / max * (HH - 70); h += `<rect x="${f(hsx(-1 + i / 20) + 0.5)}" y="${f(HH - 30 - hh)}" width="${f(hsx(-1 + (i + 1) / 20) - hsx(-1 + i / 20) - 1)}" height="${f(hh)}" fill="${INDIGO}" opacity=".75"/>`; });
  if (Dance.total > 5) {
    const z0 = Num.atanh(Dance.rho), se = 1 / Math.sqrt(Math.max(1, Dance.n - 3));
    let d = '', peak = 0; const pts = [];
    for (let i = 0; i <= 200; i++) { const r = -0.999 + i * 1.998 / 200, z = Num.atanh(r); const dens = Num.dnorm((z - z0) / se) / se / (1 - r * r); pts.push([r, dens]); peak = Math.max(peak, dens); }
    const scale = (Dance.total * 0.05) / max * (HH - 70);
    pts.forEach(([r, v], i) => { d += (i ? 'L' : 'M') + f(hsx(r)) + ' ' + f(HH - 30 - v * scale); });
    h += `<path d="${d}" fill="none" stroke="${RED}" stroke-width="2"/>`;
  }
  h += `<line x1="${f(hsx(Dance.rho))}" y1="16" x2="${f(hsx(Dance.rho))}" y2="${HH - 30}" stroke="${GOLD}" stroke-width="2.5"/>`;
  h += `<g class="pl-tick">${[-1, -0.5, 0, 0.5, 1].map(v => `<text x="${f(hsx(v))}" y="${HH - 12}" text-anchor="middle">${Fmt.bounded(v, 1)}</text>`).join('')}</g>`;
  el('danceHist').innerHTML = h + '</svg>';
  const pc = Dance.total ? Math.round(100 * Dance.cover / Dance.total) : 0;
  el('danceMsg').innerHTML = Dance.total ? L2(`${Dance.total} muestras de n = ${Dance.n}: el ${pc} % de los intervalos contiene ρ = ${Fmt.bounded(Dance.rho, 2)}. La curva roja es la distribución teórica de <i>r</i> por la <i>z</i> de Fisher.`,
    `${Dance.total} samples of n = ${Dance.n}: ${pc}% of the intervals contain ρ = ${Fmt.bounded(Dance.rho, 2)}. The red curve is the theoretical distribution of <i>r</i> through Fisher's <i>z</i>.`) : L2('Pulsa «Bailar».', 'Press «Dance».');
}

/* ================= lab 6: range restriction and measurement error ================= */
const Rng = { lo: 0, hi: 100, rel: 1, rho: 0.7, x: null, y: null, ex: null, ey: null };
function rangeData() {
  const R = Num.rng(4242), x = [], y = [], ex = [], ey = [];
  for (let i = 0; i < 400; i++) { const a = R.normal(), b = R.normal(); x.push(a); y.push(Rng.rho * a + Math.sqrt(1 - Rng.rho * Rng.rho) * b); ex.push(R.normal()); ey.push(R.normal()); }
  Rng.x = x; Rng.y = y; Rng.ex = ex; Rng.ey = ey;
}
function rangeBuild(host) {
  host.innerHTML = `<p class="lab-intro">${L2('Dos maneras de que una correlación real salga más chica. <b>Restricción de rango</b>: si sólo observas parte de los valores de x (por ejemplo, sólo las plantas que sobrevivieron), <i>r</i> baja; la corrección de Thorndike (caso II) la recupera. <b>Error de medición</b>: si x y y se miden con ruido, <i>r</i> se «atenúa»; la corrección de Spearman la recupera si conoces la fiabilidad.',
    'Two ways a real correlation comes out smaller. <b>Range restriction</b>: if you only observe part of the values of x (e.g. only the plants that survived), <i>r</i> drops; Thorndike\'s correction (case II) recovers it. <b>Measurement error</b>: if x and y are measured with noise, <i>r</i> is «attenuated»; Spearman\'s correction recovers it if the reliability is known.')}</p>` +
    `<div class="pg-controls"><label class="inline-label" for="rngLo">${L2('Se observan los percentiles de x de', 'Observed percentiles of x from')} <b id="rngLov">0</b></label><input type="range" id="rngLo" min="0" max="90" step="5" value="0" style="width:130px">` +
    `<label class="inline-label" for="rngHi">${L2('a', 'to')} <b id="rngHiv">100</b></label><input type="range" id="rngHi" min="10" max="100" step="5" value="100" style="width:130px">` +
    `<label class="inline-label" for="rngRel">${L2('Fiabilidad de cada medición', 'Reliability of each measurement')} <b id="rngRelv">1.00</b></label><input type="range" id="rngRel" min="0.3" max="1" step="0.05" value="1" style="width:130px"></div>` +
    `<div class="lab-grid"><div class="pg-pane"><div id="rngSvg"></div></div><div><div class="score-tiles" id="rngTiles"></div><p class="pg-status" id="rngMsg"></p></div></div>`;
  rangeData();
  const lo = el('rngLo'), hi = el('rngHi'), rel = el('rngRel');
  const upd = () => {
    Rng.lo = Math.min(+lo.value, +hi.value - 10); Rng.hi = Math.max(+hi.value, Rng.lo + 10); Rng.rel = +rel.value;
    el('rngLov').textContent = Rng.lo; el('rngHiv').textContent = Rng.hi; el('rngRelv').textContent = Fmt.num(Rng.rel, 2);
    rangePaint();
  };
  [lo, hi, rel].forEach(i => i.addEventListener('input', upd));
  upd();
}
function rangePaint() {
  /* observed = true score + error with the chosen reliability (var true = 1) */
  const k = Math.sqrt((1 - Rng.rel) / Rng.rel);
  const ox = Rng.x.map((v, i) => v + k * Rng.ex[i]), oy = Rng.y.map((v, i) => v + k * Rng.ey[i]);
  const qs = Float64Array.from(ox).sort(), q = p => qs[Math.min(qs.length - 1, Math.floor(p / 100 * (qs.length - 1)))];
  const a = q(Rng.lo), b = Rng.hi >= 100 ? Infinity : q(Rng.hi);
  const keep = ox.map(v => v >= a && v <= b);
  const kx = ox.filter((_, i) => keep[i]), ky = oy.filter((_, i) => keep[i]);
  const rAll = Coef.pearson(ox, oy).est, rObs = Coef.pearson(kx, ky).est;
  const U = Math.sqrt(Num.variance(ox) / Num.variance(kx));
  const rTh = rObs * U / Math.sqrt(1 - rObs * rObs + rObs * rObs * U * U);
  const rSp = rTh / Rng.rel;
  const W = 460, H = 420;
  const sx = Plot.scale(-4.5, 4.5, 34, W - 12), sy = Plot.scale(-4.5, 4.5, H - 30, 12);
  let s = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" class="pl" data-name="lab-range" role="img" aria-label="${esc(T('Restricción de rango', 'Range restriction'))}"><rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
  s += Plot.frame({ x0: 34, x1: W - 12, y0: H - 30, y1: 12, sx, sy, xt: Plot.ticks(-4, 4, 5), yt: Plot.ticks(-4, 4, 5) });
  if (isFinite(a) && Rng.lo > 0) s += `<rect x="34" y="12" width="${f(sx(a) - 34)}" height="${H - 42}" fill="var(--fig-grid)" opacity=".6"/>`;
  if (isFinite(b)) s += `<rect x="${f(sx(b))}" y="12" width="${f(W - 12 - sx(b))}" height="${H - 42}" fill="var(--fig-grid)" opacity=".6"/>`;
  s += ox.map((v, i) => `<circle cx="${f(sx(Math.max(-4.4, Math.min(4.4, v))))}" cy="${f(sy(Math.max(-4.4, Math.min(4.4, oy[i]))))}" r="2.6" fill="${keep[i] ? RED : 'var(--fig-muted)'}" fill-opacity="${keep[i] ? 0.8 : 0.25}"/>`).join('');
  el('rngSvg').innerHTML = s + '</svg>';
  el('rngTiles').innerHTML = [[T('ρ verdadera', 'True ρ'), Rng.rho], [T('r con todos', 'r with all'), rAll], [T('r observada', 'Observed r'), rObs], [T('corregida por rango', 'range-corrected'), rTh], [T('y por atenuación', 'and for attenuation'), rSp]]
    .map(([t, v]) => `<div><small>${t}</small><b>${Fmt.bounded(v, 2)}</b></div>`).join('');
  el('rngMsg').innerHTML = L2(`Con ${kx.length} de 400 plantas, la <i>r</i> observada es ${Fmt.bounded(rObs, 2)}. La corrección de Thorndike usa la razón de desviaciones <i>U</i> = ${Fmt.num(U, 2)}; la de Spearman divide entre la fiabilidad (${Fmt.num(Rng.rel, 2)}). Ninguna corrección es mejor que la información que se le da.`,
    `With ${kx.length} of 400 plants the observed <i>r</i> is ${Fmt.bounded(rObs, 2)}. Thorndike's correction uses the ratio of deviations <i>U</i> = ${Fmt.num(U, 2)}; Spearman's divides by the reliability (${Fmt.num(Rng.rel, 2)}). No correction is better than the information it is given.`);
}

/* ================= the tabs ================= */
const BUILD = { drag: dragBuild, same: sameBuild, guess: guessBuild, detect: detectBuild, dance: danceBuild, range: rangeBuild };
let current = 'drag';
function open(id) {
  sameStop(); danceStop();
  current = id;
  els('#labTabs .lab-tab').forEach(b => { const on = b.dataset.lab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  const host = el('labHost');
  host.innerHTML = `<div class="lab on" id="lab-${id}" role="tabpanel" aria-labelledby="labtab-${id}"></div>`;
  BUILD[id](host.firstChild);
}
function build() {
  const tabs = el('labTabs');
  if (!tabs) return;
  tabs.innerHTML = LABS.map(l => `<button type="button" class="lab-tab" role="tab" id="labtab-${l.id}" data-lab="${l.id}" aria-controls="lab-${l.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${l.icon}</svg>${L2(l.es, l.en)}</button>`).join('');
  tabs.addEventListener('click', e => { const b = e.target.closest('.lab-tab'); if (b) open(b.dataset.lab); });
  tabs.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const ids = LABS.map(l => l.id), i = ids.indexOf(current), j = (i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
    open(ids[j]); el('labtab-' + ids[j]).focus();
  });
  open('drag');
}
document.addEventListener('DOMContentLoaded', build);
document.addEventListener('langchange', () => open(current));
document.addEventListener('fmtchange', () => open(current));
document.addEventListener('palettechange', () => { if (current === 'drag') dragPaint(); });
window.Labs = { open, preset, SHAPES, detData, jnd, statsOf, sums, round2 };
})();
