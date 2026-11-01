/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the illustrations of the home page.

   Every picture is computed, not drawn by hand: the hero is Anderson's irises
   with their real correlations, the cards and the catalogue are seeded
   simulations whose coefficients are those named, and the theory figures are
   the distributions they describe. Texts are written with T() at drawing
   time, so the pictures are redrawn when the language changes. */
(function () {
'use strict';
const f = v => (Math.round(v * 100) / 100).toString();
const LACA = ['#B3182D', '#C9962B', '#555BDC', '#00A2C7', '#E14074', '#A63AA0', '#9C72FE', '#967600'];
const NEG = '#B35F4E', POS = '#5E77BD', RED = '#B3182D', GOLD = '#C9962B', INDIGO = '#555BDC';
const svg = (w, h, body, cls) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${cls ? `class="${cls}"` : ''} aria-hidden="true" focusable="false">${body}</svg>`;
const txt = (x, y, s, o) => `<text x="${f(x)}" y="${f(y)}" ${o || ''}>${Plot.esc(s)}</text>`;
function cloud(n, rho, seed, shape) {
  const R = Num.rng(seed), x = [], y = [];
  for (let i = 0; i < n; i++) {
    const a = R.normal(), b = R.normal();
    let X = a, Y = rho * a + Math.sqrt(1 - rho * rho) * b;
    if (shape === 'parab') { X = (R() * 2 - 1) * 2; Y = X * X + 0.25 * b; }
    else if (shape === 'sine') { X = (R() * 2 - 1) * 3; Y = Math.sin(X * 1.6) + 0.18 * b; }
    else if (shape === 'circle') { const t = R() * 2 * Math.PI; X = Math.cos(t) + 0.06 * a; Y = Math.sin(t) + 0.06 * b; }
    else if (shape === 'mono') { X = R() * 3; Y = Math.exp(X * 0.9) / 4 + 0.15 * b; }
    else if (shape === 'fan') { X = R() * 3; Y = X * (0.6 + 0.6 * b); }
    x.push(X); y.push(Y);
  }
  return [x, y];
}
/* points of (x, y) in a box [x0, y0, w, h] */
function dots(x, y, box, col, r) {
  const ex = Plot.extent(x, 0.08), ey = Plot.extent(y, 0.08);
  const sx = Plot.scale(ex[0], ex[1], box[0], box[0] + box[2]), sy = Plot.scale(ey[0], ey[1], box[1] + box[3], box[1]);
  return x.map((v, i) => `<circle cx="${f(sx(v))}" cy="${f(sy(y[i]))}" r="${r || 2.2}" fill="${Array.isArray(col) ? col[i] : col}"/>`).join('');
}

/* ---------------- the hero: Simpson's paradox in Anderson's irises ---------------- */
const Hero = { mode: 0, timer: null, morph: null };
function heroData() {
  const D = Datasets.iris, x = D.vars[0].v, y = D.vars[1].v, g = D.vars[4].v;
  const all = Coef.pearson(x, y).est;
  const per = [0, 1, 2].map(k => { const ix = g.map((v, i) => v === k ? i : -1).filter(i => i >= 0); return { k, x: ix.map(i => x[i]), y: ix.map(i => y[i]), r: Coef.pearson(ix.map(i => x[i]), ix.map(i => y[i])).est }; });
  const vars = D.vars.slice(0, 4).map(v => v.v);
  const R = vars.map(a => vars.map(b => Coef.pearson(a, b).est));
  return { x, y, g, all, per, R };
}
Hero.svg = function () {
  const H = heroData();
  const W = 660, Hh = 440;
  const box = { x0: 44, x1: 400, y0: 380, y1: 28 };
  const ex = [4.1, 8.1], ey = [1.8, 4.6];
  const sx = Plot.scale(ex[0], ex[1], box.x0, box.x1), sy = Plot.scale(ey[0], ey[1], box.y0, box.y1);
  const sp = ['setosa', 'versicolor', 'virginica'];
  const col = [RED, GOLD, '#8F95FF'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" class="hero-svg" focusable="false" aria-hidden="true">`;
  s += `<defs><linearGradient id="hgGold" x1="0" x2="1"><stop offset="0" stop-color="#BF8B3C"/><stop offset="1" stop-color="#F6D985"/></linearGradient>` +
    `<filter id="hgGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>`;
  /* axes */
  s += `<g stroke="rgba(230,196,112,.22)" stroke-width="1">`;
  for (let v = 4.5; v <= 8; v += 0.5) s += `<line x1="${f(sx(v))}" y1="${box.y1}" x2="${f(sx(v))}" y2="${box.y0}"/>`;
  for (let v = 2; v <= 4.5; v += 0.5) s += `<line x1="${box.x0}" y1="${f(sy(v))}" x2="${box.x1}" y2="${f(sy(v))}"/>`;
  s += `</g><g fill="#B9AAA1" font-size="10" font-family="system-ui, sans-serif">`;
  for (let v = 5; v <= 8; v += 1) s += txt(sx(v), box.y0 + 14, Fmt.num(v, 0), 'text-anchor="middle"');
  for (let v = 2; v <= 4.5; v += 1) s += txt(box.x0 - 6, sy(v) + 3.5, Fmt.num(v, 0), 'text-anchor="end"');
  s += `</g>`;
  s += `<text x="${f((box.x0 + box.x1) / 2)}" y="${box.y0 + 30}" fill="#E6DCD5" font-size="11.5" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">${Plot.esc(T('Largo del sépalo (cm)', 'Sepal length (cm)'))}</text>`;
  s += `<text transform="translate(14 ${f((box.y0 + box.y1) / 2)}) rotate(-90)" fill="#E6DCD5" font-size="11.5" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">${Plot.esc(T('Ancho del sépalo (cm)', 'Sepal width (cm)'))}</text>`;
  /* ellipses and lines by species (mode 1) */
  let labels = '';
  s += `<g class="hg-species" style="transition:opacity .9s ease">`;
  H.per.forEach((p, k) => {
    const m = Plot.moments(p.x, p.y);
    s += `<path d="${Plot.ellipsePath(m.mx, m.my, m.vx, m.vy, m.cxy, 0.68, sx, sy)}" fill="${col[k]}" fill-opacity=".10" stroke="${col[k]}" stroke-opacity=".7" stroke-width="1.3"/>`;
    const b = m.cxy / m.vx, a = m.my - b * m.mx, xa = Math.min(...p.x) - 0.1, xb = Math.max(...p.x) + 0.1;
    s += `<line x1="${f(sx(xa))}" y1="${f(sy(a + b * xa))}" x2="${f(sx(xb))}" y2="${f(sy(a + b * xb))}" stroke="${col[k]}" stroke-width="3" stroke-linecap="round"/>`;
    const lx = [62, 262, 318][k], ly = [52, 372, 300][k];
    labels += `<g font-family="system-ui, sans-serif" paint-order="stroke" stroke="#0B0909" stroke-width="4" stroke-linejoin="round"><text x="${lx}" y="${ly}" fill="${col[k]}" font-size="17" font-weight="800">r = ${Fmt.bounded(p.r, 2).replace(/^(?!−)/, '+')}</text><text x="${lx}" y="${ly + 14}" fill="#E6DCD5" font-size="10.5" font-style="italic">Iris ${sp[k]}</text></g>`;
  });
  s += `</g>`;
  /* the pooled line (mode 0) */
  {
    const m = Plot.moments(H.x, H.y), b = m.cxy / m.vx, a = m.my - b * m.mx;
    s += `<g class="hg-pooled" style="transition:opacity .9s ease"><line x1="${f(sx(4.2))}" y1="${f(sy(a + b * 4.2))}" x2="${f(sx(8))}" y2="${f(sy(a + b * 8))}" stroke="url(#hgGold)" stroke-width="3.4" stroke-linecap="round"/>` +
      `<text x="${f(sx(6.55))}" y="${f(sy(4.38))}" fill="#F6D985" font-size="19" font-weight="800" font-family="system-ui, sans-serif">r = ${Fmt.bounded(H.all, 2)}</text>` +
      `<text x="${f(sx(6.55))}" y="${f(sy(4.38) + 15)}" fill="#D9CDC6" font-size="10.5" font-family="system-ui, sans-serif">${Plot.esc(T('las 150 flores juntas', 'all 150 flowers pooled'))}</text></g>`;
  }
  /* points */
  s += `<g class="hg-pts">`;
  H.x.forEach((v, i) => { s += `<circle cx="${f(sx(v))}" cy="${f(sy(H.y[i]))}" r="3.6" fill="${col[H.g[i]]}" data-g="${H.g[i]}" stroke="#0B0909" stroke-width=".8" style="transition:fill .9s ease"/>`; });
  s += `</g><g class="hg-species hg-labels" style="transition:opacity .9s ease">${labels}</g>`;
  /* the glyph matrix */
  const cx0 = 428, cy0 = 52, cell = 44, names = T(['L. sép.', 'A. sép.', 'L. pét.', 'A. pét.'], ['S. len.', 'S. wid.', 'P. len.', 'P. wid.']);
  s += `<g font-family="system-ui, sans-serif">`;
  s += `<text x="${cx0}" y="${cy0 - 20}" fill="#E6C470" font-size="10" font-weight="700" letter-spacing="1.4">${Plot.esc(T('MATRIZ DE PEARSON', 'PEARSON MATRIX'))}</text>`;
  for (let i = 0; i < 4; i++) {
    s += `<text x="${cx0 + 4 * cell + 8}" y="${cy0 + i * cell + cell / 2 + 4}" fill="#CFC3BB" font-size="10">${names[i]}</text>`;
    for (let j = 0; j < 4; j++) {
      const X = cx0 + j * cell, Y = cy0 + i * cell;
      s += `<rect x="${X + 0.5}" y="${Y + 0.5}" width="${cell - 1}" height="${cell - 1}" fill="rgba(255,255,255,.03)" stroke="rgba(230,196,112,.16)"/>`;
      if (i === j) { s += `<text x="${X + cell / 2}" y="${Y + cell / 2 + 4}" fill="#8F837C" font-size="10" text-anchor="middle">1</text>`; continue; }
      const r = H.R[i][j];
      const c = Pal.color(Pal.darkVersion(Pal.get('anil')), r);
      s += `<path class="hg-gl" data-r="${f(r)}" data-cx="${X + cell / 2}" data-cy="${Y + cell / 2}" fill="${c}" d="${Glyph.pathOf(Glyph.points('circle', r, cell / 2 - 4), X + cell / 2, Y + cell / 2)}"/>`;
    }
  }
  s += `<text class="hg-glname" x="${cx0 + 2 * cell}" y="${cy0 + 4 * cell + 20}" fill="#E6C470" font-size="11" font-weight="700" text-anchor="middle">${Plot.esc(T('círculo', 'circle'))}</text>`;
  /* the legend of species */
  sp.forEach((nm, k) => {
    const Y = cy0 + 4 * cell + 50 + k * 18;
    s += `<circle cx="${cx0 + 6}" cy="${Y - 4}" r="4.5" fill="${col[k]}"/><text x="${cx0 + 16}" y="${Y}" fill="#E6DCD5" font-size="11" font-style="italic">Iris ${nm}</text>`;
  });
  s += `<text x="${cx0}" y="${cy0 + 4 * cell + 112}" fill="#9F938C" font-size="9.5">${Plot.esc(T('Anderson (1935); Fisher (1936)', 'Anderson (1935); Fisher (1936)'))}</text>`;
  s += `</g></svg>`;
  return s;
};
Hero.mount = function (host) {
  if (!host) return;
  host.innerHTML = Hero.svg() + `<div class="ha-row"><span class="ha-caption" id="heroCap"></span><button type="button" class="ha-toggle" id="heroToggle"></button></div>`;
  Hero.apply(host);
  const tg = host.querySelector('#heroToggle');
  tg.addEventListener('click', () => { Hero.mode = 1 - Hero.mode; Hero.apply(host); Hero.restart(host); });
  Hero.restart(host);
  Hero.startMorph(host);
};
Hero.apply = function (host) {
  const m = Hero.mode;
  const po = host.querySelector('.hg-pooled');
  host.querySelectorAll('.hg-species').forEach(g => { g.style.opacity = m ? 1 : 0; });
  if (po) po.style.opacity = m ? 0 : 1;
  host.querySelectorAll('.hg-pts circle').forEach(c => { c.style.fill = m ? '' : '#D9CDC6'; });
  const cap = host.querySelector('#heroCap'), tg = host.querySelector('#heroToggle');
  if (cap) cap.textContent = m ? T('Dentro de cada especie, las flores con sépalo más largo lo tienen más ancho.', 'Within each species, flowers with longer sepals have wider ones.')
    : T('Juntas, las 150 flores parecen decir lo contrario: es la paradoja de Simpson.', 'Pooled, the 150 flowers seem to say the opposite: Simpson’s paradox.');
  if (tg) tg.textContent = m ? T('Ver todas juntas', 'See them pooled') : T('Ver por especie', 'See by species');
};
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
Hero.restart = function (host) {
  clearInterval(Hero.timer);
  if (reduced()) return;
  Hero.timer = setInterval(() => { if (!document.hidden && document.body.classList.contains('on-home')) { Hero.mode = 1 - Hero.mode; Hero.apply(host); } }, 6000);
};
/* the matrix glyphs morph through the polygonal kinds */
Hero.startMorph = function (host) {
  cancelAnimationFrame(Hero.morph);
  const kinds = ['circle', 'ellipse', 'moon', 'pie', 'square', 'bar'];
  const names = { circle: ['círculo', 'circle'], ellipse: ['elipse', 'ellipse'], moon: ['media luna (propia)', 'moon (own)'], pie: ['pastel', 'pie'], square: ['cuadrado', 'square'], bar: ['barra', 'bar'] };
  const paths = [...host.querySelectorAll('.hg-gl')];
  const label = host.querySelector('.hg-glname');
  let k = 0, t0 = performance.now(), phase = 'hold';
  const HOLD = 2600, MORPH = 900, half = 44 / 2 - 4;
  const step = now => {
    Hero.morph = requestAnimationFrame(step);
    if (document.hidden || reduced() || !document.body.classList.contains('on-home')) return;
    const dt = now - t0;
    if (phase === 'hold' && dt > HOLD) { phase = 'morph'; t0 = now; }
    else if (phase === 'morph') {
      const u = Math.min(1, dt / MORPH), e = Glyph.ease(u), a = kinds[k], b = kinds[(k + 1) % kinds.length];
      paths.forEach(p => {
        const r = +p.dataset.r, cx = +p.dataset.cx, cy = +p.dataset.cy;
        p.setAttribute('d', Glyph.pathOf(Glyph.lerp(Glyph.points(a, r, half), Glyph.points(b, r, half), e), cx, cy));
      });
      if (u >= 1) { k = (k + 1) % kinds.length; phase = 'hold'; t0 = now; if (label) label.textContent = T(names[kinds[k]][0], names[kinds[k]][1]); }
    }
  };
  Hero.morph = requestAnimationFrame(step);
};

/* ---------------- the cards of the thirteen blocks ---------------- */
const W = 260, Hc = 112;
const cards = {
  1: () => svg(W, Hc, [['circle', 0.7], ['ellipse', -0.55], ['moon', 0.4], ['pie', -0.8]].map(([k, r], j) =>
    `<path d="${Glyph.path(k, r, 21, 46 + j * 56, 56)}" fill="${Pal.color('anil', r)}"/>`).join('')),
  2: () => {
    let s = '';
    const types = [['1.4', '#5E77BD'], ['A', '#B3182D'], ['3', '#C9962B'], ['45°', '#00A2C7']];
    for (let c = 0; c < 4; c++) {
      s += `<rect x="${24 + c * 56}" y="14" width="50" height="16" rx="4" fill="${types[c][1]}" opacity=".85"/><text x="${49 + c * 56}" y="26" font-size="10" text-anchor="middle" fill="#fff" font-weight="700">${types[c][0]}</text>`;
      for (let r = 0; r < 4; r++) s += `<rect x="${24 + c * 56}" y="${36 + r * 17}" width="50" height="13" rx="3" class="art-cell" fill="currentColor" opacity=".08"/>`;
    }
    return svg(W, Hc, `<g style="color:var(--fig-ink)">${s}</g>`);
  },
  3: () => {
    let s = '';
    const [x, y] = cloud(40, 0.7, 3), [x2, y2] = cloud(40, -0.4, 4), [x3, y3] = cloud(40, 0.1, 5);
    const P = [[x, y], [x2, y2], [x3, y3]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const bx = 64 + j * 46, by = 6 + i * 34;
      s += `<rect x="${bx}" y="${by}" width="42" height="31" rx="3" fill="none" stroke="var(--fig-grid)"/>`;
      if (i === j) s += `<path d="M${bx + 4} ${by + 27} Q${bx + 21} ${by - 4} ${bx + 38} ${by + 27}" fill="${GOLD}" fill-opacity=".35" stroke="${GOLD}"/>`;
      else s += dots(P[(i + j) % 3][0], P[(i + j) % 3][1], [bx + 3, by + 3, 36, 25], i > j ? POS : NEG, 1.3);
    }
    return svg(W, Hc, s);
  },
  4: () => {
    const [x, y] = cloud(60, 0.75, 7);
    const m = Plot.moments(x, y), ex = Plot.extent(x, 0.1), ey = Plot.extent(y, 0.1);
    const sx = Plot.scale(ex[0], ex[1], 14, 140), sy = Plot.scale(ey[0], ey[1], 104, 8);
    let s = `<path d="${Plot.ellipsePath(m.mx, m.my, m.vx, m.vy, m.cxy, 0.9, sx, sy)}" fill="${RED}" fill-opacity=".1" stroke="${RED}"/>` + dots(x, y, [14, 8, 126, 96], 'var(--fig-point)', 1.8);
    const bars = [0.74, 0.71, 0.55, 0.62, 0.38];
    bars.forEach((v, i) => { s += `<rect x="152" y="${14 + i * 18}" width="${f(v * 96)}" height="11" rx="3" fill="${[POS, POS, GOLD, RED, INDIGO][i]}" opacity=".85"/>`; });
    return svg(W, Hc, s);
  },
  5: () => {
    const R = [[1, .8, .6, -.3, .2, -.6], [.8, 1, .5, -.2, .1, -.5], [.6, .5, 1, .1, .4, -.2], [-.3, -.2, .1, 1, .7, .5], [.2, .1, .4, .7, 1, .3], [-.6, -.5, -.2, .5, .3, 1]];
    let s = '';
    const kinds = ['circle', 'ellipse', 'moon', 'pie'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const cx = 64 + j * 18 + 9, cy = 2 + i * 18 + 9;
      if (i === j) { s += `<rect x="${cx - 8}" y="${cy - 8}" width="16" height="16" fill="var(--fig-grid)"/>`; continue; }
      s += `<path d="${Glyph.path(i > j ? 'circle' : kinds[(i + j) % 4], R[i][j], 7.5, cx, cy)}" fill="${Pal.color('anil', R[i][j])}"/>`;
    }
    return svg(W, Hc, s);
  },
  6: () => { const [x, y] = cloud(90, 0, 11, 'sine'); return svg(W, Hc, dots(x, y, [20, 10, 220, 92], RED, 2)); },
  7: () => svg(W, Hc, `<g font-family="system-ui, sans-serif" font-weight="700" font-size="13">` +
    `<line x1="70" y1="82" x2="190" y2="82" stroke="${RED}" stroke-width="3" stroke-dasharray="6 4"/><line x1="70" y1="82" x2="130" y2="24" stroke="${GOLD}" stroke-width="3"/><line x1="190" y1="82" x2="130" y2="24" stroke="${GOLD}" stroke-width="3"/>` +
    [['X', 70, 82], ['Y', 190, 82], ['Z', 130, 24]].map(([l, x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="var(--fig-bg)" stroke="var(--fig-ink)" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" class="art-txt">${l}</text>`).join('') + `</g>`),
  8: () => {
    const col = [[.32, .1, .08], [.12, .2, .05], [.04, .05, .04]];
    let s = '', x = 30;
    [0.5, 0.35, 0.15].forEach((wc, c) => {
      let y = 8; const w = wc * 200, tot = col.reduce((a, r) => a + r[c], 0);
      col.forEach((r, i) => { const h = r[c] / tot * 94; s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w - 3)}" height="${f(h - 3)}" rx="2" fill="${LACA[i]}" opacity="${0.55 + 0.15 * i}"/>`; y += h; });
      x += w;
    });
    return svg(W, Hc, s);
  },
  9: () => {
    const R = Num.rng(19); let s = `<line x1="16" y1="56" x2="244" y2="56" stroke="var(--fig-ink)" stroke-width="1"/><line x1="16" y1="26" x2="244" y2="26" stroke="${RED}" stroke-dasharray="5 4"/><line x1="16" y1="86" x2="244" y2="86" stroke="${RED}" stroke-dasharray="5 4"/><line x1="16" y1="48" x2="244" y2="48" stroke="${GOLD}" stroke-width="2"/>`;
    for (let i = 0; i < 46; i++) s += `<circle cx="${f(22 + R() * 216)}" cy="${f(48 + R.normal() * 13)}" r="2.2" fill="var(--fig-point)"/>`;
    return svg(W, Hc, s);
  },
  10: () => {
    let s = '';
    [[RED, 30, 70, .7], [GOLD, 95, 50, .6], [INDIGO, 160, 30, .5]].forEach(([c, x0, y0, b], k) => {
      const [x, y] = cloud(18, 0.8, 30 + k);
      s += dots(x, y, [x0, y0 - 20, 60, 44], c, 1.8) + `<line x1="${x0}" y1="${y0 + 20}" x2="${x0 + 60}" y2="${y0 - 18}" stroke="${c}" stroke-width="2"/>`;
      void b;
    });
    s += `<line x1="30" y1="22" x2="230" y2="96" stroke="var(--fig-ink)" stroke-width="1.6" stroke-dasharray="4 4"/>`;
    return svg(W, Hc, s);
  },
  11: () => {
    const N = [[50, 30], [92, 74], [130, 28], [168, 80], [210, 40], [130, 96], [62, 92]];
    const E = [[0, 1, .8], [0, 2, .5], [1, 2, .6], [2, 4, -.6], [3, 4, .7], [1, 5, .4], [5, 3, -.5], [6, 1, .6], [6, 5, .3]];
    let s = E.map(([a, b, r]) => `<line x1="${N[a][0]}" y1="${N[a][1]}" x2="${N[b][0]}" y2="${N[b][1]}" stroke="${Pal.color('anil', r)}" stroke-width="${f(1 + 4 * Math.abs(r))}" stroke-linecap="round"/>`).join('');
    s += N.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8" fill="${LACA[i % 8]}" stroke="var(--fig-bg)" stroke-width="2"/>`).join('');
    return svg(W, Hc, s);
  },
  12: () => {
    let s = `<line x1="130" y1="6" x2="130" y2="100" stroke="var(--fig-grid)" stroke-width="1.5"/>`;
    [[.42, .2, .6], [.55, .3, .75], [.3, .02, .52], [.48, .36, .58]].forEach(([m, lo, hi], i) => {
      const y = 16 + i * 20, X = v => 40 + v * 180;
      s += `<line x1="${f(X(lo))}" y1="${y}" x2="${f(X(hi))}" y2="${y}" stroke="var(--fig-ink)" stroke-width="1.5"/><rect x="${f(X(m) - 4)}" y="${y - 4}" width="8" height="8" fill="${INDIGO}"/>`;
    });
    s += `<path d="M${f(40 + .44 * 180)} 96 l10 -7 l10 7 l-10 7 z" fill="${RED}"/>`;
    return svg(W, Hc, s);
  },
  13: () => {
    let s = '';
    ['anil', 'cortes', 'agave', 'olinala'].forEach((id, k) => {
      const st = Pal.stops(id, 11);
      st.forEach((c, i) => { s += `<rect x="${110 + i * 12}" y="${14 + k * 22}" width="12.4" height="16" fill="${c}"/>`; });
    });
    s += `<text x="20" y="72" font-size="46" font-weight="800" class="art-txt" font-family="Georgia, serif">Aa</text><text x="24" y="92" font-size="11" class="art-mut">r = .45</text>`;
    return svg(W, Hc, s);
  },
};

/* ---------------- kinds of data ---------------- */
const types = {
  cc: () => { const [x, y] = cloud(40, 0.7, 41); return svg(200, 70, dots(x, y, [10, 6, 180, 58], POS, 1.8)); },
  oo: () => { let s = ''; const R = Num.rng(42); for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const v = Math.max(0, 1 - Math.abs(i - j) * 0.45 + 0.1 * R.normal()); s += `<rect x="${44 + j * 23}" y="${3 + i * 13}" width="21" height="11.5" rx="2" fill="${GOLD}" opacity="${f(0.12 + 0.8 * v)}"/>`; } return svg(200, 70, s); },
  nn: () => { let s = ''; [[.3, .05, .1], [.05, .25, .05], [.08, .02, .1]].forEach((r, i) => r.forEach((v, j) => { s += `<circle cx="${70 + j * 30}" cy="${14 + i * 21}" r="${f(Math.sqrt(v) * 22)}" fill="${LACA[j]}" opacity=".7"/>`; })); return svg(200, 70, s); },
  bc: () => { const R = Num.rng(43); let s = `<line x1="40" y1="20" x2="160" y2="20" stroke="var(--fig-grid)"/><line x1="40" y1="50" x2="160" y2="50" stroke="var(--fig-grid)"/>`; for (let i = 0; i < 24; i++) { s += `<circle cx="${f(60 + R.normal() * 15)}" cy="${f(20 + R.normal() * 3)}" r="2.2" fill="${RED}"/><circle cx="${f(120 + R.normal() * 15)}" cy="${f(50 + R.normal() * 3)}" r="2.2" fill="${INDIGO}"/>`; } return svg(200, 70, s); },
  rr: () => { let s = ''; for (let i = 0; i < 6; i++) { const y = 8 + i * 10; s += `<line x1="30" y1="${y}" x2="170" y2="${y}" stroke="var(--fig-grid)"/>`; [0, 1, 2].forEach(k => { s += `<circle cx="${f(50 + i * 22 + (k - 1) * 4)}" cy="${y}" r="3" fill="${LACA[k]}"/>`; }); } return svg(200, 70, s); },
  ang: () => { let s = `<circle cx="100" cy="35" r="30" fill="none" stroke="var(--fig-grid)" stroke-width="2"/>`; const R = Num.rng(44); for (let i = 0; i < 30; i++) { const a = 0.8 + R.normal() * 0.5; s += `<circle cx="${f(100 + 30 * Math.cos(a))}" cy="${f(35 - 30 * Math.sin(a))}" r="2.4" fill="${GOLD}"/>`; } return svg(200, 70, s); },
  comp: () => { let s = ''; for (let i = 0; i < 8; i++) { let x = 20; [0.5, 0.3, 0.2].map(v => v + 0.08 * Math.sin(i + v * 9)).forEach((v, k, a) => { const w = v / a.reduce((p, q) => p + q, 0) * 160; s += `<rect x="${f(x)}" y="${4 + i * 8}" width="${f(w - 1)}" height="6.5" fill="${LACA[k + 2]}" opacity=".8"/>`; x += w; }); } return svg(200, 70, s); },
  time: () => { let a = 'M10 50', b = 'M10 40'; const R = Num.rng(45); let u = 0, v = 0; for (let i = 1; i <= 36; i++) { u = 0.7 * u + R.normal() * 4; v = 0.7 * v + R.normal() * 4; a += ` L${10 + i * 5} ${f(52 - i * 0.6 + u)}`; b += ` L${10 + i * 5} ${f(30 - i * 0.4 + v)}`; } return svg(200, 70, `<path d="${a}" fill="none" stroke="${RED}" stroke-width="1.8"/><path d="${b}" fill="none" stroke="${INDIGO}" stroke-width="1.8"/>`); },
  sets: () => svg(200, 70, `<rect x="24" y="8" width="60" height="54" rx="6" fill="${POS}" opacity=".18"/><rect x="116" y="8" width="60" height="54" rx="6" fill="${NEG}" opacity=".2"/>` + [0, 1, 2].map(k => `<line x1="84" y1="${20 + k * 15}" x2="116" y2="${24 + k * 13}" stroke="${GOLD}" stroke-width="2"/>`).join('')),
};

/* ---------------- the catalogue cards ---------------- */
function methodArt(fam, seed) {
  const box = [10, 6, 190, 74];
  if (fam === 'cla') { const [x, y] = cloud(50, 0.65, seed); return svg(210, 86, dots(x, y, box, POS, 1.7)); }
  if (fam === 'rob') { const [x, y] = cloud(40, 0.6, seed); x.push(3.6, 3.9); y.push(-3.2, -3.6); return svg(210, 86, dots(x, y, box, x.map((_, i) => i >= 40 ? RED : 'var(--fig-point)'), 1.8)); }
  if (fam === 'dep') { const [x, y] = cloud(70, 0, seed, ['sine', 'parab', 'circle'][seed % 3]); return svg(210, 86, dots(x, y, box, RED, 1.7)); }
  if (fam === 'par') return cards[7]().replace(`viewBox="0 0 ${W} ${Hc}"`, `viewBox="0 0 ${W} ${Hc}"`);
  if (fam === 'cat') return cards[8]();
  if (fam === 'acu') { const [x, y] = cloud(40, 0.97, seed); return svg(210, 86, `<line x1="10" y1="80" x2="200" y2="6" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="4 3"/>` + dots(x, y.map(v => v * 0.85 + 0.6), box, INDIGO, 1.8)); }
  if (fam === 'est') return types.time().replace('viewBox="0 0 200 70"', 'viewBox="0 0 200 70"');
  if (fam === 'esp') return types.ang();
  return cards[12]();
}

/* ---------------- theory figures ---------------- */
const theory = {
  cosine: () => svg(330, 150, `<line x1="60" y1="120" x2="270" y2="120" stroke="var(--fig-grid)"/><line x1="60" y1="120" x2="250" y2="70" stroke="${INDIGO}" stroke-width="3"/><line x1="60" y1="120" x2="220" y2="22" stroke="${RED}" stroke-width="3"/>` +
    `<path d="M110 107 A52 52 0 0 0 100 94" fill="none" stroke="${GOLD}" stroke-width="2"/><text x="118" y="96" class="art-txt" font-size="13" font-style="italic">θ</text>` +
    `<text x="255" y="66" class="art-txt" font-size="12">x − x̄</text><text x="226" y="20" class="art-txt" font-size="12">y − ȳ</text><text x="150" y="142" class="art-mut" font-size="12" text-anchor="middle">r = cos θ</text>`),
  shapes: () => {
    let s = '';
    ['parab', 'circle', 'sine', 'fan'].forEach((sh, k) => {
      const [x, y] = cloud(70, 0, 50 + k, sh);
      const r = Coef.pearson(x, y).est, d = Coef.dcor(x, y).est;
      s += dots(x, y, [8 + k * 81, 8, 74, 82], k % 2 ? RED : INDIGO, 1.4) + `<text x="${45 + k * 81}" y="108" font-size="10.5" text-anchor="middle" class="art-txt">r = ${Fmt.bounded(r, 2)}</text><text x="${45 + k * 81}" y="122" font-size="10.5" text-anchor="middle" class="art-mut">dCor = ${Fmt.bounded(d, 2)}</text>`;
    });
    return svg(330, 130, s);
  },
  dag: () => {
    const node = (x, y, l, c) => `<circle cx="${x}" cy="${y}" r="13" fill="var(--fig-bg)" stroke="${c || 'var(--fig-ink)'}" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" class="art-txt">${l}</text>`;
    const arr = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c || 'var(--fig-ink)'}" stroke-width="1.8" marker-end="url(#ar)"/>`;
    let s = `<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--fig-ink)"/></marker></defs>`;
    s += node(40, 90, 'X') + node(100, 90, 'Y') + node(70, 35, 'Z', GOLD) + arr(62, 46, 46, 77) + arr(78, 46, 94, 77) + `<text x="70" y="128" text-anchor="middle" font-size="10" class="art-mut">${Plot.esc(T('confusor', 'confounder'))}</text>`;
    s += node(150, 50, 'X') + node(210, 50, 'Y') + node(180, 100, 'C', RED) + arr(156, 61, 172, 88) + arr(204, 61, 188, 88) + `<text x="180" y="128" text-anchor="middle" font-size="10" class="art-mut">${Plot.esc(T('colisionador', 'collider'))}</text>`;
    s += `<path d="M250 100 Q265 60 280 70 T310 30" fill="none" stroke="${INDIGO}" stroke-width="2"/><path d="M250 105 Q268 75 282 82 T312 45" fill="none" stroke="${RED}" stroke-width="2"/><text x="282" y="128" text-anchor="middle" font-size="10" class="art-mut">${Plot.esc(T('tendencias', 'trends'))}</text>`;
    return svg(330, 140, s);
  },
  null: () => {
    const curve = (n, col) => { let d = ''; for (let i = 0; i <= 120; i++) { const r = -1 + i / 60; const dens = Math.pow(1 - r * r, (n - 4) / 2); d += (i ? 'L' : 'M') + f(20 + i * 2.4) + ' ' + f(118 - dens * 96); } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4"/>`; };
    return svg(330, 140, `<line x1="20" y1="118" x2="308" y2="118" stroke="var(--fig-axis)"/>` + curve(10, GOLD) + curve(50, RED) +
      `<text x="164" y="134" text-anchor="middle" font-size="10" class="art-mut">0</text><text x="22" y="134" font-size="10" class="art-mut">−1</text><text x="300" y="134" font-size="10" class="art-mut">1</text>` +
      `<text x="250" y="60" font-size="11" fill="${GOLD}" font-weight="700">n = 10</text><text x="186" y="26" font-size="11" fill="${RED}" font-weight="700">n = 50</text>`);
  },
  fisherz: () => {
    let d = '';
    for (let i = 0; i <= 100; i++) { const r = -0.99 + i * 1.98 / 100; d += (i ? 'L' : 'M') + f(30 + (r + 1) * 135) + ' ' + f(76 - Num.atanh(r) * 22); }
    return svg(330, 150, `<line x1="30" y1="76" x2="300" y2="76" stroke="var(--fig-grid)"/><line x1="165" y1="10" x2="165" y2="140" stroke="var(--fig-grid)"/><path d="${d}" fill="none" stroke="${RED}" stroke-width="2.6"/>` +
      `<text x="300" y="90" font-size="11" class="art-mut" text-anchor="end">r</text><text x="172" y="18" font-size="11" class="art-mut">z = atanh r</text>`);
  },
  multiple: () => {
    const R = Num.rng(77); let s = '', k = 0;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 19; j++) { const sig = R() < 0.05; if (sig) k++; s += `<rect x="${12 + j * 16.5}" y="${8 + i * 12}" width="14" height="10" rx="2" fill="${sig ? RED : 'var(--fig-grid)'}"/>`; }
    return svg(330, 140, s + `<text x="165" y="136" text-anchor="middle" font-size="11" class="art-mut">${Plot.esc(T(`${k} de 190 con p < .05 sin ninguna correlación real`, `${k} of 190 with p < .05 and no real correlation`))}</text>`);
  },
  outlier: () => {
    const [x, y] = cloud(30, 0, 88); x.push(6); y.push(6);
    const r0 = Coef.pearson(x.slice(0, 30), y.slice(0, 30)).est, r1 = Coef.pearson(x, y).est;
    return svg(330, 140, dots(x, y, [20, 8, 290, 110], x.map((_, i) => i === 30 ? RED : 'var(--fig-point)'), 2.6) +
      `<text x="24" y="134" font-size="11" class="art-mut">${Plot.esc(T(`sin el punto rojo: r = ${Fmt.bounded(r0, 2)}`, `without the red point: r = ${Fmt.bounded(r0, 2)}`))}</text><text x="306" y="134" font-size="11" fill="${RED}" text-anchor="end" font-weight="700">${Plot.esc(T(`con él: r = ${Fmt.bounded(r1, 2)}`, `with it: r = ${Fmt.bounded(r1, 2)}`))}</text>`);
  },
  simpson: () => {
    const D = Datasets.iris, x = D.vars[0].v, y = D.vars[1].v, g = D.vars[4].v;
    return Plot.scatter({ x, y, groups: g, groupNames: ['I. setosa', 'I. versicolor', 'I. virginica'], byGroup: true, fit: 'ols', w: 330, h: 230, legend: false, xlab: T('Largo del sépalo', 'Sepal length'), ylab: T('Ancho', 'Width'), plot: 'theory-simpson', clip: 'thsc', r: 2.2, palette: 'laca' });
  },
  agreement: () => {
    const R = Num.rng(91); let s = `<line x1="20" y1="130" x2="150" y2="10" stroke="${GOLD}" stroke-dasharray="4 3" stroke-width="1.5"/>`;
    for (let i = 0; i < 30; i++) { const t = R(); const xv = 20 + t * 110, yv = 130 - (t * 1.2) * 110 + R.normal() * 2; s += `<circle cx="${f(xv)}" cy="${f(Math.max(8, yv))}" r="2.3" fill="${INDIGO}"/>`; }
    s += `<text x="86" y="146" text-anchor="middle" font-size="10" class="art-mut">r = .99</text>`;
    s += `<line x1="180" y1="70" x2="320" y2="70" stroke="var(--fig-grid)"/><line x1="180" y1="50" x2="320" y2="50" stroke="${GOLD}" stroke-width="2"/><line x1="180" y1="36" x2="320" y2="36" stroke="${RED}" stroke-dasharray="4 3"/><line x1="180" y1="64" x2="320" y2="64" stroke="${RED}" stroke-dasharray="4 3"/>`;
    for (let i = 0; i < 30; i++) s += `<circle cx="${f(184 + R() * 132)}" cy="${f(50 + R.normal() * 4.5)}" r="2.2" fill="${INDIGO}"/>`;
    s += `<text x="250" y="146" text-anchor="middle" font-size="10" class="art-mut">${Plot.esc(T('diferencia contra promedio', 'difference vs mean'))}</text>`;
    return svg(330, 150, s);
  },
};

/* a 28-px icon per family of measures */
const FAM_ICON = {
  cla: '<circle cx="6" cy="20" r="2.2"/><circle cx="11" cy="15" r="2.2"/><circle cx="16" cy="12" r="2.2"/><circle cx="22" cy="7" r="2.2"/>',
  rob: '<circle cx="7" cy="18" r="2.2"/><circle cx="12" cy="14" r="2.2"/><circle cx="17" cy="10" r="2.2"/><circle cx="22" cy="22" r="2.6" opacity=".55"/>',
  dep: '<path d="M3 18c4-12 7-12 11 0s7 12 11 0" fill="none" stroke-width="2.4" stroke="currentColor"/>',
  par: '<circle cx="6" cy="20" r="3"/><circle cx="22" cy="20" r="3"/><circle cx="14" cy="6" r="3"/><path d="M8 18L12 9M20 18L16 9" stroke="currentColor" stroke-width="1.8"/>',
  cat: '<rect x="3" y="4" width="12" height="12" rx="1.5"/><rect x="17" y="4" width="8" height="6" rx="1.5" opacity=".6"/><rect x="17" y="12" width="8" height="12" rx="1.5"/><rect x="3" y="18" width="12" height="6" rx="1.5" opacity=".6"/>',
  acu: '<path d="M4 24L24 4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/><circle cx="8" cy="20" r="2.2"/><circle cx="14" cy="14" r="2.2"/><circle cx="20" cy="8" r="2.2"/>',
  est: '<path d="M3 20l5-6 4 3 5-8 4 4 4-6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  esp: '<circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20.4" cy="7.6" r="2.6"/>',
  inf: '<path d="M5 8h10M9 14h12M4 20h9" stroke="currentColor" stroke-width="2"/><rect x="8.5" y="6.5" width="3" height="3"/><rect x="13.5" y="12.5" width="3" height="3"/><rect x="7" y="18.5" width="3" height="3"/>',
};
const famIcon = fam => `<svg viewBox="0 0 28 28" fill="currentColor" aria-hidden="true" focusable="false">${FAM_ICON[fam] || ''}</svg>`;

/* the app's own mark: the 68 % ellipse of a correlated cloud, in gold, with three points of lacquer red */
const logo = () => '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7" fill="#0B0909"/><ellipse cx="16" cy="16" rx="12" ry="5.2" transform="rotate(-45 16 16)" fill="none" stroke="#D4A848" stroke-width="2.2"/><circle cx="9.5" cy="22.5" r="2.3" fill="#E2384C"/><circle cx="15" cy="16.5" r="2.3" fill="#E2384C"/><circle cx="21.5" cy="10" r="2.3" fill="#E2384C"/></svg>';

window.Art = { Hero, cards, types, methodArt, theory, cloud, dots, famIcon, logo };
})();
