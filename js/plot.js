/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the figure kit.

   Every figure is an SVG string built here: axes with round numbers, scatter
   plots with their data ellipses, the glyph matrix and the colour bar. The
   conventions the suite's figure editor (✎) and figure studio rely on are
   written into the markup: data-plot (the plotting area, "left top width
   height") with data-xr and data-yr (the ranges of the axes) on the <svg>,
   data-role on axes, ticks, labels and the legend, data-li on each legend
   entry, data-legend on the colour bar; data-name names the figure.

   Colours. Ink, grid and background come from the theme (CSS variables), so
   they follow light and dark without a redraw. A data colour that depends on
   the theme (the divergent palettes, whose centre is near white on paper and
   near black on a dark screen) is written as two custom properties on the
   element, --cl (light) and --cd (dark), and the stylesheet picks one: when
   the studio exports "with the colours of the light theme" it reads the
   computed style under data-theme="light" and gets the paper version.

   Needs Pal (palettes.js), Glyph (glyphs.js), Fmt (fmt.js). */
(function () {
'use strict';
const Plot = {};
const f = v => (Math.round(v * 100) / 100).toString();
const escx = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
Plot.esc = escx;

/* ---------------- numbers on axes ---------------- */
/* round tick values covering [lo, hi] (Heckbert's "nice numbers") */
Plot.ticks = function (lo, hi, count) {
  count = count || 5;
  if (!(hi > lo)) { hi = lo + 1; lo = lo - 1; }
  const nice = (x, round) => {
    const e = Math.floor(Math.log10(x)), fr = x / Math.pow(10, e);
    let nf;
    if (round) nf = fr < 1.5 ? 1 : fr < 3 ? 2 : fr < 7 ? 5 : 10;
    else nf = fr <= 1 ? 1 : fr <= 2 ? 2 : fr <= 5 ? 5 : 10;
    return nf * Math.pow(10, e);
  };
  const range = nice(hi - lo, false), step = nice(range / Math.max(1, count - 1), true);
  const t0 = Math.ceil(lo / step - 1e-9) * step, out = [];
  for (let v = t0; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return { ticks: out, step };
};
Plot.tickLabel = function (v, step, o) {
  const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return window.Fmt ? Fmt.num(v, d, o) : v.toFixed(d).replace('-', '−');
};
Plot.scale = (d0, d1, r0, r1) => { const k = (r1 - r0) / ((d1 - d0) || 1); const s = v => r0 + (v - d0) * k; s.inv = p => d0 + (p - r0) / k; return s; };
/* the axis limits of a variable: the data range padded by 6 % (a fixed rule,
   so that how correlated a cloud looks does not depend on the zoom; see
   Cleveland, Diaconis and McGill 1982) */
Plot.extent = function (v, pad) {
  let lo = Infinity, hi = -Infinity;
  for (const a of v) if (isFinite(a)) { if (a < lo) lo = a; if (a > hi) hi = a; }
  if (!isFinite(lo)) return [0, 1];
  if (hi === lo) { lo -= 1; hi += 1; }
  const p = (hi - lo) * (pad == null ? 0.06 : pad);
  return [lo - p, hi + p];
};

/* the opening of a figure with one plotting area: the <svg> with the marks the
   figure editor reads, and the background */
Plot.open = function (W, H, o, g, label) {
  const mark = g ? ` data-plot="${f(g.x0)} ${f(g.y1)} ${f(g.x1 - g.x0)} ${f(g.y0 - g.y1)}" data-xr="${+g.ex[0].toPrecision(10)} ${+g.ex[1].toPrecision(10)}" data-yr="${+g.ey[0].toPrecision(10)} ${+g.ey[1].toPrecision(10)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="pl${o.cls ? ' ' + o.cls : ''}"${mark} data-name="${escx(o.plot || 'figure')}" role="img" aria-label="${escx(label || '')}"><rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
};
/* a polyline through (x, y) in data units */
Plot.line = function (x, y, sx, sy) {
  let d = '';
  for (let i = 0; i < x.length; i++) if (isFinite(x[i]) && isFinite(y[i])) d += (d ? 'L' : 'M') + f(sx(x[i])) + ' ' + f(sy(y[i]));
  return d;
};

/* ---------------- the frame: axes, grid, labels ---------------- */
Plot.frame = function (o) {
  const { x0, x1, y0, y1, sx, sy, xt, yt, xlab, ylab } = o;
  let s = '';
  if (o.grid !== false) {
    s += `<g data-role="grid" class="pl-grid">`;
    xt.ticks.forEach(v => { const X = sx(v); if (X >= x0 - 0.5 && X <= x1 + 0.5) s += `<line x1="${f(X)}" y1="${f(y0)}" x2="${f(X)}" y2="${f(y1)}"/>`; });
    yt.ticks.forEach(v => { const Y = sy(v); if (Y <= y0 + 0.5 && Y >= y1 - 0.5) s += `<line x1="${f(x0)}" y1="${f(Y)}" x2="${f(x1)}" y2="${f(Y)}"/>`; });
    s += `</g>`;
  }
  s += `<g data-role="axis" class="pl-axis"><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y0)}"/><line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x0)}" y2="${f(y1)}"/></g>`;
  s += `<g class="pl-tick" data-role="xtick">`;
  xt.ticks.forEach(v => { const X = sx(v); if (X >= x0 - 0.5 && X <= x1 + 0.5) s += `<line x1="${f(X)}" y1="${f(y0)}" x2="${f(X)}" y2="${f(y0 + 4)}"/><text x="${f(X)}" y="${f(y0 + 15)}" text-anchor="middle">${Plot.tickLabel(v, xt.step)}</text>`; });
  s += `</g><g class="pl-tick" data-role="ytick">`;
  yt.ticks.forEach(v => { const Y = sy(v); if (Y <= y0 + 0.5 && Y >= y1 - 0.5) s += `<line x1="${f(x0 - 4)}" y1="${f(Y)}" x2="${f(x0)}" y2="${f(Y)}"/><text x="${f(x0 - 7)}" y="${f(Y + 3.5)}" text-anchor="end">${Plot.tickLabel(v, yt.step)}</text>`; });
  s += `</g>`;
  if (xlab) s += `<text class="pl-lab" data-role="xlab" x="${f((x0 + x1) / 2)}" y="${f(y0 + 32)}" text-anchor="middle">${escx(xlab)}</text>`;
  if (ylab) s += `<text class="pl-lab" data-role="ylab" transform="translate(${f(x0 - 38)} ${f((y0 + y1) / 2)}) rotate(-90)" text-anchor="middle">${escx(ylab)}</text>`;
  return s;
};

/* ---------------- data ellipse ----------------
   {x : (x − m)ᵀS⁻¹(x − m) ≤ c²}; c = √(χ²₂(level)) = √(−2 log(1 − level)):
   1.177 for 50 %, 1.510 for 68 %, 2.448 for 95 % (Friendly, Monette and Fox 2013). */
Plot.ellipsePath = function (mx, my, vx, vy, cxy, level, sx, sy) {
  const c = Math.sqrt(-2 * Math.log(1 - (level || 0.68)));
  const tr = vx + vy, det = vx * vy - cxy * cxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const th = Math.abs(cxy) < 1e-15 ? (vx >= vy ? 0 : Math.PI / 2) : Math.atan2(l1 - vx, cxy);
  const a = c * Math.sqrt(Math.max(0, l1)), b = c * Math.sqrt(Math.max(0, l2));
  let d = '';
  for (let i = 0; i <= 72; i++) {
    const t = 2 * Math.PI * i / 72, u = a * Math.cos(t), v = b * Math.sin(t);
    const X = mx + u * Math.cos(th) - v * Math.sin(th), Y = my + u * Math.sin(th) + v * Math.cos(th);
    d += (i ? 'L' : 'M') + f(sx(X)) + ' ' + f(sy(Y));
  }
  return d + 'Z';
};
Plot.moments = function (x, y) {
  const n = x.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let vx = 0, vy = 0, c = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; vx += a * a; vy += b * b; c += a * b; }
  return { n, mx, my, vx: vx / (n - 1), vy: vy / (n - 1), cxy: c / (n - 1) };
};

/* ---------------- scatter plot ----------------
   o: {x, y, groups?, groupNames?, palette?, xlab, ylab, w, h, ellipse?, fit?
       ('ols' | 'none'), byGroup?, title?, plot (name of the figure), smooth?
       ({x, y} line, e.g. LOWESS), ring? (indices to circle), ringLabels?,
       under?/over? (function ({sx, sy, x0, x1, y0, y1}) → SVG, drawn under
       or over the points, inside the plotting area)} */
Plot.scatter = function (o) {
  const W = o.w || 520, H = o.h || 380;
  const m = { l: 56, r: o.legend === false ? 16 : 128, t: o.title ? 30 : 14, b: 46 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const ex = o.xlim || Plot.extent(o.x), ey = o.ylim || Plot.extent(o.y);
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(ey[0], ey[1], y0, y1);
  const xt = Plot.ticks(ex[0], ex[1], 6), yt = Plot.ticks(ey[0], ey[1], 6);
  const cat = window.Pal ? Pal.CAT[o.palette || 'laca'] : ['#B3182D', '#C9962B', '#1F6F78'];
  const G = o.groups || null, K = G ? Math.max(...G) + 1 : 1;
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || (o.xlab + ' · ' + o.ylab));
  if (o.title) s += `<text class="pl-title" data-role="title" x="${f(x0)}" y="18">${escx(o.title)}</text>`;
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt, yt, xlab: o.xlab, ylab: o.ylab });
  const G0 = { sx, sy, x0, x1, y0, y1 };
  s += `<defs><clipPath id="${o.clip || 'plc'}"><rect x="${x0}" y="${y1}" width="${x1 - x0}" height="${y0 - y1}"/></clipPath></defs><g clip-path="url(#${o.clip || 'plc'})">`;
  const sets = [];
  if (o.byGroup && G) for (let k = 0; k < K; k++) { const idx = []; G.forEach((gk, i) => { if (gk === k) idx.push(i); }); sets.push({ k, x: idx.map(i => o.x[i]), y: idx.map(i => o.y[i]) }); }
  const all = { k: -1, x: o.x, y: o.y };
  const draws = o.byGroup && G ? sets : [all];
  if (o.under) s += o.under(G0);
  draws.forEach(d => {
    const mo = Plot.moments(d.x, d.y), col = d.k < 0 ? 'var(--fig-ink)' : cat[d.k % cat.length];
    /* a group of fewer than three points, or with no spread, has no ellipse or line */
    if (d.x.length < 3 || !(mo.vx > 0) || !(mo.vy > 0)) return;
    if (o.ellipse) s += `<path class="pl-ell" d="${Plot.ellipsePath(mo.mx, mo.my, mo.vx, mo.vy, mo.cxy, o.ellipse, sx, sy)}" style="stroke:${col};fill:${col}"/>`;
    if (o.fit === 'ols') {
      const b = mo.cxy / mo.vx, a = mo.my - b * mo.mx;
      const xa = Math.min(...d.x), xb = Math.max(...d.x);
      s += `<line class="pl-fit" x1="${f(sx(xa))}" y1="${f(sy(a + b * xa))}" x2="${f(sx(xb))}" y2="${f(sy(a + b * xb))}" style="stroke:${col}"/>`;
    }
  });
  s += `<g class="pl-pts">`;
  for (let i = 0; i < o.x.length; i++) {
    const col = G ? cat[G[i] % cat.length] : 'var(--fig-point)';
    s += `<circle cx="${f(sx(o.x[i]))}" cy="${f(sy(o.y[i]))}" r="${o.r || 3.2}" style="fill:${col}"/>`;
  }
  s += `</g>`;
  if (o.smooth) s += `<path class="pl-smooth" d="${Plot.line(o.smooth.x, o.smooth.y, sx, sy)}"/>`;
  if (o.over) s += o.over(G0);
  /* each label goes to the first corner of its ring that stays inside the plotting area and clear of the
     labels already placed (10 px bold: about 6.2 px a character) */
  const placed = [];
  if (o.ring) o.ring.forEach((i, k) => {
    const cx = sx(o.x[i]), cy = sy(o.y[i]), d = (o.r || 3.2) + 6;
    s += `<circle class="pl-ring" cx="${f(cx)}" cy="${f(cy)}" r="${f((o.r || 3.2) + 3.5)}"/>`;
    if (!o.ringLabels) return;
    const t = String(o.ringLabels[k]), w = 6.2 * t.length + 2, h = 11;
    const cands = [[cx + d, cy - 4, 'start'], [cx + d, cy + 12, 'start'], [cx - d, cy - 4, 'end'], [cx - d, cy + 12, 'end']].map(([X, Y, a]) => ({ X, Y, a, l: a === 'start' ? X : X - w, t: Y - h + 2 }));
    const inside = c => c.l >= x0 + 1 && c.l + w <= x1 - 1 && c.t >= y1 + 1 && c.t + h <= y0 - 1;
    const clear = c => placed.every(b => c.l + w <= b.l || b.l + b.w <= c.l || c.t + h <= b.t || b.t + b.h <= c.t);
    const c = cands.find(c => inside(c) && clear(c)) || cands.find(inside) || cands[0];
    placed.push({ l: c.l, t: c.t, w, h });
    s += `<text class="pl-ringlab" x="${f(c.X)}" y="${f(c.Y)}"${c.a === 'end' ? ' text-anchor="end"' : ''}>${escx(t)}</text>`;
  });
  s += `</g>`;
  if (G && o.legend !== false && o.groupNames) {
    s += `<g data-role="legend" class="pl-legend" transform="translate(${f(x1 + 14)} ${f(y1 + 6)})">`;
    if (o.legendTitle) s += `<text class="pl-legend-title" x="0" y="0">${escx(o.legendTitle)}</text>`;
    o.groupNames.forEach((nm, k) => {
      const Y = 16 + k * 18;
      s += `<circle data-li="${k}" cx="5" cy="${Y - 4}" r="4.5" style="fill:${cat[k % cat.length]}"/><text data-li="${k}" x="15" y="${Y}">${escx(nm)}</text>`;
    });
    s += `</g>`;
  }
  return s + '</svg>';
};

/* ---------------- the glyph matrix ----------------
   o: {R (p×p array of arrays), labels, glyph (kind or {lower, upper, diag}),
       palette, invert, p (p-values, optional), alpha, insig ('cross' | 'blank'
       | 'none'), size (cell px), order (indices), triangle ('full' | 'lower'
       | 'upper'), digits} */
Plot.matrix = function (o) {
  const p = o.R.length, ord = o.order || [...Array(p).keys()];
  const cell = o.size || 46, lab = o.labelWidth != null ? o.labelWidth : 120;
  /* column labels on top, turned, when asked */
  const top = o.colLabels ? Math.min(120, 6 + 4.6 * Math.max(...o.labels.map(s => String(s).length))) : 0;
  /* the turned labels already bring their own air on top */
  const X0 = lab, Y0 = (o.colLabels ? 8 : 24) + top;
  const W = lab + p * cell + 96 + (o.colLabels ? 30 : 0), H = Y0 + p * cell + 32;
  const pal = window.Pal ? Pal.get(o.palette || 'anil') : null;
  const dark = pal && window.Pal ? Pal.darkVersion(pal) : null;
  const kindAt = (i, j) => {
    const gl = o.glyph || 'circle';
    if (typeof gl === 'string') return i === j ? 'diag' : gl;
    if (i === j) return gl.diag || 'diag';
    return i > j ? gl.lower : gl.upper;
  };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="pl pl-matrix" data-name="${escx(o.plot || 'matrix')}" role="img" aria-label="${escx(o.label || 'Matriz de correlación')}">`;
  s += `<rect class="pl-bg" x="0" y="0" width="${W}" height="${H}"/>`;
  /* column labels on the diagonal side, row labels on the left */
  ord.forEach((v, j) => {
    const cx = X0 + j * cell + cell / 2;
    s += `<text class="pl-mlab" x="${f(X0 - 8)}" y="${f(Y0 + j * cell + cell / 2 + 4)}" text-anchor="end">${escx(o.labels[v])}</text>`;
    void cx;
  });
  if (o.colLabels) ord.forEach((v, j) => {
    const cx = X0 + j * cell + cell / 2;
    s += `<text class="pl-mlab" transform="translate(${f(cx + 3)} ${f(Y0 - 6)}) rotate(-50)" text-anchor="start">${escx(o.labels[v])}</text>`;
  });
  s += `<g class="pl-mgrid">`;
  for (let i = 0; i <= p; i++) {
    s += `<line x1="${X0}" y1="${f(Y0 + i * cell)}" x2="${X0 + p * cell}" y2="${f(Y0 + i * cell)}"/>`;
    s += `<line x1="${f(X0 + i * cell)}" y1="${Y0}" x2="${f(X0 + i * cell)}" y2="${Y0 + p * cell}"/>`;
  }
  s += `</g>`;
  const half = cell / 2;
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
    const i = ord[a], j = ord[b];
    if (o.triangle === 'lower' && b > a) continue;
    if (o.triangle === 'upper' && b < a) continue;
    const r = o.R[i][j], kind = kindAt(a, b);
    const cx = X0 + b * cell + half, cy = Y0 + a * cell + half;
    if (kind === 'diag') {
      s += `<rect class="pl-mdiagbg" x="${f(cx - half + 1)}" y="${f(cy - half + 1)}" width="${f(cell - 2)}" height="${f(cell - 2)}"/>`;
      if (o.diagLabels) s += `<text class="pl-mdiag" x="${f(cx)}" y="${f(cy + 4)}" text-anchor="middle">${escx(o.diagLabels[i])}</text>`;
      continue;
    }
    if (!isFinite(r) || kind === 'blank') continue;
    /* a number must stay legible even when r is near zero (its colour, near the
       neutral centre, would vanish): numbers take the palette colour of
       sign(r)·(0.55 + 0.45|r|); the value itself is written out */
    const rc = kind === 'number' ? Math.sign(r || 1) * (0.55 + 0.45 * Math.min(1, Math.abs(r))) : r;
    const cl = pal ? Pal.color(pal, rc, { invert: o.invert }) : '#888', cd = dark ? Pal.color(dark, rc, { invert: o.invert }) : cl;
    const sig = !o.pv || !isFinite(o.pv[i][j]) || o.pv[i][j] < (o.alpha || 0.05);
    const style = `--cl:${cl};--cd:${cd}`;
    const tip = `${o.labels[i]} · ${o.labels[j]}: ${window.Fmt ? Fmt.bounded(r, 2) : r.toFixed(2)}`;
    const sel = o.sel && ((o.sel[0] === i && o.sel[1] === j) || (o.sel[0] === j && o.sel[1] === i));
    const cellStart = s.length;
    s += `<g class="pl-cell${sel ? ' pl-csel' : ''}" data-i="${i}" data-j="${j}"><title>${escx(o.tip ? o.tip(i, j) : tip)}</title>`;
    if (kind === 'color' || kind === 'shade') {
      s += `<rect class="pl-gl" x="${f(cx - half + 1)}" y="${f(cy - half + 1)}" width="${f(cell - 2)}" height="${f(cell - 2)}" style="${style}"/>`;
      if (kind === 'shade' && Math.abs(r) > 0.04) {
        const step = Math.max(5, cell / 6);
        s += `<g class="pl-stripe" clip-path="none">`;
        for (let k = -cell; k <= cell; k += step) {
          const xa = cx - half + 1 + k, xb = xa + cell - 2;
          if (r > 0) s += `<line x1="${f(xa)}" y1="${f(cy + half - 1)}" x2="${f(xb)}" y2="${f(cy - half + 1)}"/>`;
          else s += `<line x1="${f(xa)}" y1="${f(cy - half + 1)}" x2="${f(xb)}" y2="${f(cy + half - 1)}"/>`;
        }
        s += `</g>`;
      }
    } else if (kind === 'number') {
      s += `<text class="pl-gl pl-num" x="${f(cx)}" y="${f(cy + 4.5)}" text-anchor="middle" style="${style};font-size:${f(Math.min(14, cell * 0.3))}px">${window.Fmt ? Fmt.bounded(r, o.digits || 2) : r.toFixed(2)}</text>`;
    } else {
      if (kind === 'moon') s += `<circle class="pl-moonbg" cx="${f(cx)}" cy="${f(cy)}" r="${f(0.9 * (half - 2))}"/>`;
      s += `<path class="pl-gl" data-k="${kind}" data-r="${f(r)}" data-cx="${f(cx)}" data-cy="${f(cy)}" data-h="${f(half - 2)}" d="${Glyph.path(kind, r, half - 2, cx, cy)}" style="${style}"/>`;
    }
    if (sel) s += `<rect class="pl-cselbox" x="${f(cx - half + 1)}" y="${f(cy - half + 1)}" width="${f(cell - 2)}" height="${f(cell - 2)}"/>`;
    /* a number is never crossed out (it would not be read): it fades instead */
    if (!sig && (o.insig === 'blank' || (o.insig === 'cross' && kind === 'number'))) s = s.slice(0, cellStart) + s.slice(cellStart).replace(/class="pl-gl/g, 'class="pl-gl pl-faint');
    if (!sig && o.insig === 'cross' && kind !== 'number') s += `<path class="pl-insig" d="M${f(cx - half * 0.55)} ${f(cy - half * 0.55)}L${f(cx + half * 0.55)} ${f(cy + half * 0.55)}M${f(cx + half * 0.55)} ${f(cy - half * 0.55)}L${f(cx - half * 0.55)} ${f(cy + half * 0.55)}"/>`;
    s += `</g>`;
  }
  /* colour bar */
  if (pal && o.colorbar !== false) {
    const bx = X0 + p * cell + 26, by = Y0, bh = p * cell, bw = 12;
    s += `<g data-legend="colorbar" class="pl-cbar">`;
    const k = 40;
    for (let i = 0; i < k; i++) {
      const v = 1 - 2 * (i + 0.5) / k;
      s += `<rect x="${bx}" y="${f(by + i * bh / k)}" width="${bw}" height="${f(bh / k + 0.4)}" class="pl-gl" style="--cl:${Pal.color(pal, v, { invert: o.invert })};--cd:${dark ? Pal.color(dark, v, { invert: o.invert }) : Pal.color(pal, v)}"/>`;
    }
    [1, 0.5, 0, -0.5, -1].forEach(v => {
      const Y = by + (1 - v) / 2 * bh;
      s += `<line class="pl-cbtick" x1="${bx + bw}" y1="${f(Y)}" x2="${bx + bw + 4}" y2="${f(Y)}"/><text class="pl-cbtext" x="${bx + bw + 7}" y="${f(Y + 3.5)}">${v === 0 ? '0' : window.Fmt ? Fmt.bounded(v, 1) : v}</text>`;
    });
    s += `</g>`;
  }
  return s + '</svg>';
};

/* ---------------- histogram with the normal curve ----------------
   o: {x, w, h, xlab, normal (default true), plot, mini}
   Bins: Freedman–Diaconis, never fewer than Sturges' and never more than 40,
   on round break points. Bars as density, so the curve is on the same scale. */
Plot.breaks = function (x) {
  const n = x.length, lo = Math.min(...x), hi = Math.max(...x);
  if (!(hi > lo)) return [lo - 0.5, lo + 0.5];
  const iqr = Num.quantile(x, 0.75) - Num.quantile(x, 0.25);
  const st = Math.ceil(Math.log2(n) + 1), fd = iqr > 0 ? Math.ceil((hi - lo) / (2 * iqr * Math.pow(n, -1 / 3))) : st;
  const k = Math.max(st, Math.min(40, fd));
  const t = Plot.ticks(lo, hi, k + 1), step = t.step, b0 = Math.floor(lo / step + 1e-9) * step, out = [];
  for (let v = b0; v < hi + step * 0.999; v += step) out.push(+v.toPrecision(12));
  if (out[out.length - 1] < hi) out.push(+(out[out.length - 1] + step).toPrecision(12));
  if (out.length < 2) out.push(out[0] + step);
  return out;
};
Plot.histCounts = function (x, br) {
  const c = new Array(br.length - 1).fill(0);
  for (const v of x) { let i = 0; while (i < c.length - 1 && v > br[i + 1]) i++; c[i]++; }
  return c;
};
Plot.hist = function (o) {
  const x = o.x.filter(isFinite), n = x.length, W = o.w || 360, H = o.h || 240, mini = !!o.mini;
  const m = mini ? { l: 2, r: 2, t: 2, b: 2 } : { l: 52, r: 14, t: 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const br = Plot.breaks(x), cnt = Plot.histCounts(x, br), bw = br[1] - br[0];
  const dens = cnt.map(c => c / (n * bw)), mu = Num.mean(x), sd = Num.sd(x);
  const nd = v => Math.exp(-0.5 * ((v - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
  const ex = [br[0], br[br.length - 1]], top = Math.max(...dens, o.normal === false || !(sd > 0) ? 0 : nd(mu)) * 1.08;
  const ey = [0, top || 1];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(0, ey[1], y0, y1);
  let s = Plot.open(W, H, o, mini ? null : { x0, x1, y0, y1, ex, ey }, o.label || (o.xlab || ''));
  if (!mini) s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 6), yt: Plot.ticks(0, ey[1], 5), xlab: o.xlab, ylab: o.ylab });
  s += '<g class="pl-bars">';
  dens.forEach((d, i) => { if (d > 0) s += '<rect x="' + f(sx(br[i]) + 0.5) + '" y="' + f(sy(d)) + '" width="' + f(Math.max(0.5, sx(br[i + 1]) - sx(br[i]) - 1)) + '" height="' + f(y0 - sy(d)) + '"/>'; });
  s += '</g>';
  if (o.normal !== false && sd > 0) {
    let d = '';
    for (let i = 0; i <= 80; i++) { const v = ex[0] + (ex[1] - ex[0]) * i / 80; d += (i ? 'L' : 'M') + f(sx(v)) + ' ' + f(sy(nd(v))); }
    s += '<path class="pl-normal" d="' + d + '"/>';
  }
  return s + '</svg>';
};

/* ---------------- normal Q–Q plot ----------------
   o: {x, w, h, mini, xlab, ylab, plot}. The plotting positions are those of
   Blom for n ≤ 10 and (i − ½)/n beyond; the line goes through the quartiles. */
Plot.ppoints = n => Array.from({ length: n }, (_, i) => { const a = n <= 10 ? 3 / 8 : 0.5; return (i + 1 - a) / (n + 1 - 2 * a); });
Plot.qq = function (o) {
  const x = Float64Array.from(o.x.filter(isFinite)).sort(), n = x.length, W = o.w || 360, H = o.h || 260, mini = !!o.mini;
  const m = mini ? { l: 3, r: 3, t: 3, b: 3 } : { l: 56, r: 14, t: 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const z = Plot.ppoints(n).map(p => Num.qnorm(p));
  const q1 = Num.quantile(x, 0.25), q3 = Num.quantile(x, 0.75), z1 = Num.qnorm(0.25), z3 = Num.qnorm(0.75);
  const sl = (q3 - q1) / (z3 - z1), ic = q1 - sl * z1;
  const ex = Plot.extent(z), ey = Plot.extent(x);
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(ey[0], ey[1], y0, y1);
  let s = Plot.open(W, H, o, mini ? null : { x0, x1, y0, y1, ex, ey }, o.label || 'Q–Q');
  if (!mini) s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 6), yt: Plot.ticks(ey[0], ey[1], 6), xlab: o.xlab, ylab: o.ylab });
  const cl = 'qc' + Math.random().toString(36).slice(2, 8);
  s += '<defs><clipPath id="' + cl + '"><rect x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (y0 - y1) + '"/></clipPath></defs><g clip-path="url(#' + cl + ')">';
  s += '<line class="pl-ref" x1="' + f(sx(ex[0])) + '" y1="' + f(sy(ic + sl * ex[0])) + '" x2="' + f(sx(ex[1])) + '" y2="' + f(sy(ic + sl * ex[1])) + '"/>';
  s += '<g class="pl-pts">';
  const r = mini ? (n > 200 ? 0.9 : 1.3) : (n > 300 ? 2 : 2.8);
  for (let i = 0; i < n; i++) s += '<circle cx="' + f(sx(z[i])) + '" cy="' + f(sy(x[i])) + '" r="' + r + '"' + (mini ? ' style="stroke:none"' : '') + '/>';
  return s + '</g></g></svg>';
};

/* ---------------- χ² Q–Q plot of squared distances ----------------
   o: {d2 (classical), d2r (robust), p, cut, w, h, plot, names: [classical, robust]} */
Plot.chiqq = function (o) {
  const W = o.w || 440, H = o.h || 320, m = { l: 56, r: 16, t: 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const n = o.d2.length, q = Plot.ppoints(n).map(pp => o.qchisq(pp, o.p));
  const a = Float64Array.from(o.d2).sort(), b = o.d2r ? Float64Array.from(o.d2r).sort() : null;
  const hi = Math.max(q[n - 1], a[n - 1], b ? b[n - 1] : 0, o.cut || 0);
  const ex = [0, q[n - 1] * 1.05], ey = [0, hi * 1.05];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(ey[0], ey[1], y0, y1);
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || 'χ² Q–Q');
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 6), yt: Plot.ticks(ey[0], ey[1], 6), xlab: o.xlab, ylab: o.ylab });
  s += '<line class="pl-ref" x1="' + f(sx(0)) + '" y1="' + f(sy(0)) + '" x2="' + f(sx(ex[1])) + '" y2="' + f(sy(Math.min(ex[1], ey[1]))) + '"/>';
  if (o.cut) s += '<line class="pl-cut" x1="' + x0 + '" y1="' + f(sy(o.cut)) + '" x2="' + x1 + '" y2="' + f(sy(o.cut)) + '"/>';
  s += '<g class="pl-pts pl-classic">';
  for (let i = 0; i < n; i++) s += '<circle cx="' + f(sx(q[i])) + '" cy="' + f(sy(a[i])) + '" r="2.4"/>';
  s += '</g>';
  if (b) { s += '<g class="pl-pts pl-robust">'; for (let i = 0; i < n; i++) s += '<circle cx="' + f(sx(q[i])) + '" cy="' + f(sy(b[i])) + '" r="2.4"/>'; s += '</g>'; }
  s += '<g data-role="legend" class="pl-legend" transform="translate(' + f(x0 + 12) + ' ' + f(y1 + 8) + ')">';
  const nm = o.names || ['clásica', 'robusta'];
  s += '<circle data-li="0" class="pl-classic-k" cx="5" cy="8" r="4.5"/><text data-li="0" x="15" y="12">' + escx(nm[0]) + '</text>';
  if (b) s += '<circle data-li="1" class="pl-robust-k" cx="5" cy="26" r="4.5"/><text data-li="1" x="15" y="30">' + escx(nm[1]) + '</text>';
  if (o.cut) s += '<line data-li="2" class="pl-cut" x1="0" y1="44" x2="10" y2="44"/><text data-li="2" x="15" y="48">' + escx(o.cutName || 'χ²(0.975)') + '</text>';
  return s + '</g></svg>';
};

/* ---------------- influence: r without each point ----------------
   o: {v (Δr = r₍₋ᵢ₎ − r), rows (row numbers), w, h, top (how many to name), ylab, xlab, limit} */
Plot.influence = function (o) {
  const v = o.v, n = v.length, W = o.w || 520, H = o.h || 240, m = { l: 62, r: 14, t: 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const big = Math.max(...v.map(Math.abs), o.limit || 0, 1e-6) * 1.12;
  const ex = [0, n + 1], ey = [-big, big];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(ey[0], ey[1], y0, y1);
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || 'Δr');
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(1, n, 6), yt: Plot.ticks(ey[0], ey[1], 5), xlab: o.xlab, ylab: o.ylab });
  if (o.limit) [o.limit, -o.limit].forEach(L => { s += '<line class="pl-cut" x1="' + x0 + '" y1="' + f(sy(L)) + '" x2="' + x1 + '" y2="' + f(sy(L)) + '"/>'; });
  s += '<line class="pl-ref0" x1="' + x0 + '" y1="' + f(sy(0)) + '" x2="' + x1 + '" y2="' + f(sy(0)) + '"/>';
  const top = Num.order(v.map(a => -Math.abs(a))).slice(0, o.top == null ? 3 : o.top);
  const lw = n > 400 ? 0.6 : n > 150 ? 1 : 1.6;
  s += '<g class="pl-stems">';
  for (let i = 0; i < n; i++) s += '<line x1="' + f(sx(i + 1)) + '" y1="' + f(sy(0)) + '" x2="' + f(sx(i + 1)) + '" y2="' + f(sy(v[i])) + '" style="stroke-width:' + lw + '"/>';
  s += '</g><g class="pl-pts">';
  for (let i = 0; i < n; i++) s += '<circle cx="' + f(sx(i + 1)) + '" cy="' + f(sy(v[i])) + '" r="' + (n > 300 ? 1.4 : 2.4) + '"' + (top.includes(i) && o.limit && Math.abs(v[i]) > o.limit ? ' class="pl-hot"' : '') + '/>';
  s += '</g>';
  top.forEach(i => { if (Math.abs(v[i]) > 0) s += '<text class="pl-ringlab" x="' + f(sx(i + 1) + 5) + '" y="' + f(sy(v[i]) + (v[i] > 0 ? -4 : 11)) + '">' + escx(o.rows ? o.rows[i] : i + 1) + '</text>'; });
  return s + '</svg>';
};

/* ---------------- the scatterplot matrix ----------------
   o: {cols (arrays, NaN = missing), labels, groups?, groupNames?, palette
       (categorical), div (divergent palette for r), invert, smooth ('lowess' |
       'ols' | 'none'), sel ([a, b] selected cell), stats (p×p {r, rho, p,
       byGroup:[r…]}), lowess (fn(x, y) → {x, y}), max (points drawn), plot}
   Lower triangle: the clouds (row variable on the vertical axis); diagonal:
   the name and the histogram; upper triangle: r, ρ and, with groups, r in
   each group: the place where Simpson's paradox shows itself. */
Plot.splom = function (o) {
  const p = o.cols.length, cell = o.cell || (p <= 3 ? 150 : p <= 4 ? 124 : p <= 6 ? 100 : p <= 8 ? 82 : 68), gap = 4;
  const L = 40, B = 30, T0 = 6, R = 6;
  const W = L + p * (cell + gap) - gap + R, H = T0 + p * (cell + gap) - gap + B;
  const cat = Pal.CAT[o.palette || 'laca'], G = o.groups || null;
  const pal = Pal.get(o.div || 'anil'), dark = Pal.darkVersion(pal);
  const ext = o.cols.map(c => Plot.extent(c));
  const n = o.cols[0].length;
  let idx = [...Array(n).keys()];
  if (o.max && n > o.max) { const g = Num.rng(20261004); g.shuffle(idx); idx = idx.slice(0, o.max).sort((a, b) => a - b); }
  const rpt = n > 600 ? 1.1 : n > 200 ? 1.5 : cell > 100 ? 2.2 : 1.8;
  let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="pl pl-splom" data-name="' + escx(o.plot || 'splom') + '" role="img" aria-label="' + escx(o.label || 'Matriz de dispersión') + '"><rect class="pl-bg" x="0" y="0" width="' + W + '" height="' + H + '"/>';
  const X0 = j => L + j * (cell + gap), Y0 = i => T0 + i * (cell + gap);
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    const cx = X0(j), cy = Y0(i);
    const sx = Plot.scale(ext[j][0], ext[j][1], cx, cx + cell), sy = Plot.scale(ext[i][0], ext[i][1], cy + cell, cy);
    const isSel = o.sel && ((o.sel[0] === j && o.sel[1] === i) || (o.sel[0] === i && o.sel[1] === j));
    s += '<g class="sp-cell' + (i === j ? ' sp-diag' : i > j ? ' sp-low' : ' sp-up') + (isSel ? ' sp-on' : '') + '" data-a="' + j + '" data-b="' + i + '">';
    s += '<rect class="sp-frame" x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '"/>';
    if (i === j) {
      const v = o.cols[i].filter(isFinite);
      if (v.length > 1) {
        const br = Plot.breaks(v), cnt = Plot.histCounts(v, br), mx = Math.max(...cnt);
        const hx = Plot.scale(ext[i][0], ext[i][1], cx, cx + cell), cl = 'spd' + i + (o.clip || '');
        s += '<defs><clipPath id="' + cl + '"><rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '"/></clipPath></defs><g class="pl-bars" clip-path="url(#' + cl + ')">';
        cnt.forEach((c, k) => { if (c) { const hh = (cell * 0.58) * c / mx; s += '<rect x="' + f(hx(br[k]) + 0.3) + '" y="' + f(cy + cell - 3 - hh) + '" width="' + f(Math.max(0.4, hx(br[k + 1]) - hx(br[k]) - 0.6)) + '" height="' + f(hh) + '"/>'; } });
        s += '</g>';
      }
      s += '<text class="sp-name" x="' + f(cx + cell / 2) + '" y="' + f(cy + 15) + '" text-anchor="middle">' + escx(o.labels[i]) + '</text>';
    } else if (i > j) {
      const cl = 'spc' + i + '_' + j + (o.clip || '');
      s += '<defs><clipPath id="' + cl + '"><rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '"/></clipPath></defs><g clip-path="url(#' + cl + ')"><g class="pl-pts">';
      const xs = o.cols[j], ys = o.cols[i];
      for (const k of idx) if (isFinite(xs[k]) && isFinite(ys[k])) s += '<circle cx="' + f(sx(xs[k])) + '" cy="' + f(sy(ys[k])) + '" r="' + rpt + '"' + (G ? ' style="fill:' + cat[G[k] % cat.length] + '"' : '') + '/>';
      s += '</g>';
      if (o.smooth && o.smooth !== 'none') {
        const px = [], py = [];
        for (let k = 0; k < n; k++) if (isFinite(xs[k]) && isFinite(ys[k])) { px.push(xs[k]); py.push(ys[k]); }
        if (px.length > 4) {
          if (o.smooth === 'lowess' && o.lowess) { const lw = o.lowess(px, py); s += '<path class="pl-smooth" d="' + Plot.line(lw.x, lw.y, sx, sy) + '"/>'; }
          else { const mo = Plot.moments(px, py), b = mo.cxy / mo.vx, a = mo.my - b * mo.mx, xa = Math.min(...px), xb = Math.max(...px); s += '<line class="pl-smooth" x1="' + f(sx(xa)) + '" y1="' + f(sy(a + b * xa)) + '" x2="' + f(sx(xb)) + '" y2="' + f(sy(a + b * xb)) + '"/>'; }
        }
      }
      s += '</g>';
    } else {
      const st = o.stats && o.stats[i] && o.stats[i][j];
      if (st && isFinite(st.r)) {
        const rc = Math.sign(st.r || 1) * (0.55 + 0.45 * Math.min(1, Math.abs(st.r)));
        const style = '--cl:' + Pal.color(pal, rc, { invert: o.invert }) + ';--cd:' + Pal.color(dark, rc, { invert: o.invert });
        const fs = Math.min(cell * 0.3, 11 + cell * 0.14 * Math.abs(st.r) + 3);
        const stars = st.p < 0.001 ? '***' : st.p < 0.01 ? '**' : st.p < 0.05 ? '*' : '';
        const byG = G && st.byGroup && st.byGroup.length <= 4 && cell >= 80;
        const yr = cy + cell / 2 - (byG ? cell * 0.14 : 0) + fs * 0.32;
        s += '<text class="pl-gl sp-r" x="' + f(cx + cell / 2) + '" y="' + f(yr) + '" text-anchor="middle" style="' + style + ';font-size:' + f(fs) + 'px">' + (window.Fmt ? Fmt.bounded(st.r, 2) : st.r.toFixed(2)) + '<tspan class="sp-star" dy="' + f(-fs * 0.35) + '">' + stars + '</tspan></text>';
        if (isFinite(st.rho)) s += '<text class="sp-rho" x="' + f(cx + cell / 2) + '" y="' + f(yr + 13) + '" text-anchor="middle">ρ ' + (window.Fmt ? Fmt.bounded(st.rho, 2) : st.rho.toFixed(2)) + '</text>';
        if (byG) {
          const K = st.byGroup.length, w0 = cell / (K + 1);
          st.byGroup.forEach((rg, k) => { if (isFinite(rg)) s += '<text class="sp-grp" x="' + f(cx + w0 * (k + 1)) + '" y="' + f(cy + cell - 12) + '" text-anchor="middle" style="fill:' + cat[k % cat.length] + '">' + (window.Fmt ? Fmt.bounded(rg, 2) : rg.toFixed(2)) + '</text>'; });
        }
      }
    }
    s += '</g>';
  }
  /* round numbers on the outer edges: the x of each column below, the y of each row on the left */
  s += '<g class="pl-tick sp-ticks">';
  for (let j = 0; j < p; j++) {
    const t = Plot.ticks(ext[j][0], ext[j][1], 3), sx = Plot.scale(ext[j][0], ext[j][1], X0(j), X0(j) + cell), yb = Y0(p - 1) + cell;
    t.ticks.forEach(v => { const X = sx(v); if (X > X0(j) + 2 && X < X0(j) + cell - 2) s += '<line x1="' + f(X) + '" y1="' + f(yb) + '" x2="' + f(X) + '" y2="' + f(yb + 3) + '"/><text x="' + f(X) + '" y="' + f(yb + 13) + '" text-anchor="middle">' + Plot.tickLabel(v, t.step) + '</text>'; });
  }
  for (let i = 0; i < p; i++) {
    const t = Plot.ticks(ext[i][0], ext[i][1], 3), sy = Plot.scale(ext[i][0], ext[i][1], Y0(i) + cell, Y0(i));
    t.ticks.forEach(v => { const Y = sy(v); if (Y > Y0(i) + 2 && Y < Y0(i) + cell - 2) s += '<line x1="' + f(L - 3) + '" y1="' + f(Y) + '" x2="' + L + '" y2="' + f(Y) + '"/><text x="' + f(L - 5) + '" y="' + f(Y + 3) + '" text-anchor="end">' + Plot.tickLabel(v, t.step) + '</text>'; });
  }
  s += '</g>';
  return s + '</svg>';
};

/* ---------------- a distribution of replicates ----------------
   o: {reps, marks: [{v, cls, label}], band: {lo, hi, cls, label}, tail:
       {test (v → true when v counts as extreme)}, xlab, ylab, w, h, plot, xlim}
   A histogram of counts; the band (an interval) is shaded under the bars,
   the bars in the tail are drawn in the accent of the test, the marks are
   vertical lines with their label on top. */
Plot.distribution = function (o) {
  const v = Array.from(o.reps).filter(isFinite), W = o.w || 420, H = o.h || 280, m = { l: 52, r: 14, t: o.marks && o.marks.length ? 26 : 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const ex = o.xlim || Plot.extent(v.concat((o.marks || []).map(k => k.v)), 0.04);
  const br = Plot.breaks(v.length > 1 ? v : [ex[0], ex[1]]), cnt = Plot.histCounts(v, br), top = Math.max(1, ...cnt) * 1.08;
  const ey = [0, top];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(0, top, y0, y1);
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || o.xlab || '');
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 6), yt: Plot.ticks(0, top, 5), xlab: o.xlab, ylab: o.ylab });
  const cl = 'dc' + Math.random().toString(36).slice(2, 8);
  s += '<defs><clipPath id="' + cl + '"><rect x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (y0 - y1) + '"/></clipPath></defs><g clip-path="url(#' + cl + ')">';
  if (o.band && isFinite(o.band.lo) && isFinite(o.band.hi)) s += '<rect class="' + (o.band.cls || 'pl-band') + '" x="' + f(sx(o.band.lo)) + '" y="' + y1 + '" width="' + f(Math.max(0, sx(o.band.hi) - sx(o.band.lo))) + '" height="' + (y0 - y1) + '"/>';
  s += '<g class="pl-bars">';
  cnt.forEach((c, i) => {
    if (!c) return;
    const mid = (br[i] + br[i + 1]) / 2, hot = o.tail && o.tail.test(mid);
    s += '<rect' + (hot ? ' class="pl-tail"' : '') + ' x="' + f(sx(br[i]) + 0.3) + '" y="' + f(sy(c)) + '" width="' + f(Math.max(0.4, sx(br[i + 1]) - sx(br[i]) - 0.6)) + '" height="' + f(y0 - sy(c)) + '"/>';
  });
  s += '</g></g>';
  (o.marks || []).forEach((k, j) => {
    if (!isFinite(k.v)) return;
    const X = sx(k.v);
    if (X < x0 - 1 || X > x1 + 1) return;
    s += '<line class="' + (k.cls || 'pl-mark') + '" x1="' + f(X) + '" y1="' + f(y0) + '" x2="' + f(X) + '" y2="' + f(y1 - 2) + '"/>';
    if (k.label) s += '<text class="pl-marklab" x="' + f(X) + '" y="' + f(y1 - 6 - (j % 2) * 0) + '" text-anchor="' + (X > (x0 + x1) / 2 + (x1 - x0) * 0.3 ? 'end' : X < x0 + (x1 - x0) * 0.2 ? 'start' : 'middle') + '">' + escx(k.label) + '</text>';
  });
  return s + '</svg>';
};

/* ---------------- forest plot of coefficients ----------------
   o: {rows: [{label, est, lo, hi, fam, main, note}], xlim, w, plot, zero}
   One row per coefficient: its interval as a bar, the estimate as a dot; the
   measures of dependence live on [0, 1] and say so. */
Plot.forest = function (o) {
  const rows = o.rows, W = o.w || 640, rowH = 26, lab = o.labelWidth || 200, m = { l: lab, r: 70, t: 14, b: 40 };
  const H = m.t + rows.length * rowH + m.b, x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const ex = o.xlim || [-1, 1], ey = [0, rows.length];
  const sx = Plot.scale(ex[0], ex[1], x0, x1);
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || 'forest');
  const xt = Plot.ticks(ex[0], ex[1], 9);
  s += '<g data-role="grid" class="pl-grid">';
  xt.ticks.forEach(v => { s += '<line x1="' + f(sx(v)) + '" y1="' + y1 + '" x2="' + f(sx(v)) + '" y2="' + y0 + '"/>'; });
  s += '</g><g data-role="axis" class="pl-axis"><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '"/></g><g class="pl-tick" data-role="xtick">';
  xt.ticks.forEach(v => { s += '<line x1="' + f(sx(v)) + '" y1="' + y0 + '" x2="' + f(sx(v)) + '" y2="' + (y0 + 4) + '"/><text x="' + f(sx(v)) + '" y="' + (y0 + 15) + '" text-anchor="middle">' + (v === 0 ? '0' : window.Fmt ? Fmt.bounded(v, 1) : v) + '</text>'; });
  s += '</g>';
  if (o.xlab) s += '<text class="pl-lab" data-role="xlab" x="' + f((x0 + x1) / 2) + '" y="' + (y0 + 32) + '" text-anchor="middle">' + escx(o.xlab) + '</text>';
  if (ex[0] < 0 && ex[1] > 0) s += '<line class="pl-ref0" x1="' + f(sx(0)) + '" y1="' + y1 + '" x2="' + f(sx(0)) + '" y2="' + y0 + '"/>';
  rows.forEach((r, i) => {
    const Y = y1 + i * rowH + rowH / 2, cls = 'fr fam-' + (r.fam || 'lin') + (r.main ? ' fr-main' : '');
    s += '<g class="' + cls + '">';
    if (i % 2 === 0) s += '<rect class="fr-bg" x="0" y="' + f(Y - rowH / 2) + '" width="' + W + '" height="' + rowH + '"/>';
    s += '<text class="fr-lab" x="' + (lab - 10) + '" y="' + f(Y + 4) + '" text-anchor="end">' + escx(r.label) + '</text>';
    if (isFinite(r.lo) && isFinite(r.hi)) s += '<line class="fr-ci" x1="' + f(sx(Math.max(ex[0], r.lo))) + '" y1="' + f(Y) + '" x2="' + f(sx(Math.min(ex[1], r.hi))) + '" y2="' + f(Y) + '"/><line class="fr-ci" x1="' + f(sx(Math.max(ex[0], r.lo))) + '" y1="' + f(Y - 4) + '" x2="' + f(sx(Math.max(ex[0], r.lo))) + '" y2="' + f(Y + 4) + '"/><line class="fr-ci" x1="' + f(sx(Math.min(ex[1], r.hi))) + '" y1="' + f(Y - 4) + '" x2="' + f(sx(Math.min(ex[1], r.hi))) + '" y2="' + f(Y + 4) + '"/>';
    if (isFinite(r.est)) s += '<circle class="fr-est" cx="' + f(sx(Math.max(ex[0], Math.min(ex[1], r.est)))) + '" cy="' + f(Y) + '" r="' + (r.main ? 5.5 : 4.2) + '"/>';
    s += '<text class="fr-val" x="' + (x1 + 8) + '" y="' + f(Y + 4) + '">' + (isFinite(r.est) ? (window.Fmt ? Fmt.bounded(r.est, 2) : r.est.toFixed(2)) : '—') + (r.note ? ' ' + escx(r.note) : '') + '</text>';
    s += '</g>';
  });
  return s + '</svg>';
};

/* ---------------- curves ----------------
   o: {series: [{x, y, cls, label}], points: [{x, y, cls, label}], xlim, ylim,
       xlab, ylab, w, h, plot, legend (true), endLabels (the label of each
       series written at its right end instead of a legend box)} */
Plot.curves = function (o) {
  const W = o.w || 460, H = o.h || 300, m = { l: 56, r: o.endLabels ? 86 : 14, t: 12, b: 44 };
  const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
  const allX = [], allY = [];
  o.series.forEach(se => { se.x.forEach(v => allX.push(v)); se.y.forEach(v => allY.push(v)); });
  const ex = o.xlim || Plot.extent(allX, 0.02), ey = o.ylim || [0, Math.max(...allY.filter(isFinite)) * 1.1 || 1];
  const sx = Plot.scale(ex[0], ex[1], x0, x1), sy = Plot.scale(ey[0], ey[1], y0, y1);
  let s = Plot.open(W, H, o, { x0, x1, y0, y1, ex, ey }, o.label || '');
  s += Plot.frame({ x0, x1, y0, y1, sx, sy, xt: Plot.ticks(ex[0], ex[1], 9), yt: Plot.ticks(ey[0], ey[1], 5), xlab: o.xlab, ylab: o.ylab });
  const cl = 'cc' + Math.random().toString(36).slice(2, 8);
  s += '<defs><clipPath id="' + cl + '"><rect x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (y0 - y1) + '"/></clipPath></defs><g clip-path="url(#' + cl + ')">';
  (o.bands || []).forEach(b => { s += '<rect class="' + (b.cls || 'pl-band') + '" x="' + f(sx(b.lo)) + '" y="' + y1 + '" width="' + f(Math.max(0, sx(b.hi) - sx(b.lo))) + '" height="' + (y0 - y1) + '"/>'; });
  o.series.forEach(se => {
    if (se.fill) { let d = 'M' + f(sx(se.x[0])) + ' ' + f(sy(ey[0])); se.x.forEach((v, i) => { d += 'L' + f(sx(v)) + ' ' + f(sy(Math.min(ey[1] * 1.5, se.y[i]))); }); d += 'L' + f(sx(se.x[se.x.length - 1])) + ' ' + f(sy(ey[0])) + 'Z'; s += '<path class="' + (se.cls || '') + ' pl-area" d="' + d + '"/>'; }
    s += '<path class="' + (se.cls || 'pl-curve') + '" d="' + Plot.line(se.x, se.y.map(v => Math.min(ey[1] * 1.5, v)), sx, sy) + '"/>';
  });
  (o.points || []).forEach(p => { if (isFinite(p.y)) s += '<circle class="' + (p.cls || 'pl-dot') + '" cx="' + f(sx(p.x)) + '" cy="' + f(sy(Math.min(ey[1], p.y))) + '" r="4.5"/>'; });
  s += '</g>';
  if (o.endLabels) {
    /* at the last point inside the area, pushed apart to 12 px */
    const labs = o.series.filter(se => se.label).map(se => {
      let k = se.x.length - 1;
      while (k > 0 && !(se.x[k] <= ex[1] && isFinite(se.y[k]))) k--;
      return { se, Y: sy(Math.max(ey[0], Math.min(ey[1], se.y[k]))) };
    }).sort((a, b) => a.Y - b.Y);
    for (let i = 1; i < labs.length; i++) if (labs[i].Y - labs[i - 1].Y < 12) labs[i].Y = labs[i - 1].Y + 12;
    const over = labs.length ? labs[labs.length - 1].Y - (y0 + 4) : 0;
    if (over > 0) labs.forEach(l => { l.Y -= over; });
    s += '<g data-role="legend" class="pl-legend pl-endlabs">';
    labs.forEach((l, k) => { s += '<text data-li="' + k + '" class="pl-endlab ' + (l.se.cls || '') + '-t" x="' + f(x1 + 6) + '" y="' + f(l.Y + 3.5) + '">' + escx(l.se.label) + '</text>'; });
    s += '</g>';
  } else if (o.legend !== false) {
    s += '<g data-role="legend" class="pl-legend" transform="translate(' + f(o.legendAt === 'right' ? x1 - 150 : x0 + 12) + ' ' + f(y1 + 10) + ')">';
    let k = 0;
    o.series.forEach(se => { if (!se.label) return; s += '<line data-li="' + k + '" class="' + (se.cls || 'pl-curve') + '" x1="0" y1="' + (k * 18 + 4) + '" x2="18" y2="' + (k * 18 + 4) + '"/><text data-li="' + k + '" x="24" y="' + (k * 18 + 8) + '">' + escx(se.label) + '</text>'; k++; });
    (o.points || []).forEach(p => { if (!p.label) return; s += '<circle data-li="' + k + '" class="' + (p.cls || 'pl-dot') + '" cx="9" cy="' + (k * 18 + 4) + '" r="4"/><text data-li="' + k + '" x="24" y="' + (k * 18 + 8) + '">' + escx(p.label) + '</text>'; k++; });
    s += '</g>';
  }
  return s + '</svg>';
};

window.Plot = Plot;
})();
