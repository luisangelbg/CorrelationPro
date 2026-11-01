/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the glyphs of a correlation matrix.

   Nine ways of drawing one coefficient r inside a square cell of half-side s,
   centred at (0, 0). Each one carries the SIGN in its geometry as well as in
   its colour, because a symmetric divergent palette prints +r and −r as the
   same grey:
     number   the value, in colour;
     color    the whole cell filled;
     shade    filled by |r|, with white diagonal stripes rising for r > 0
              and falling for r < 0 (Friendly 2002);
     circle   area ∝ |r| (radius ∝ √|r|);
     square   area ∝ |r| (side ∝ √|r|);
     ellipse  the contour of a bivariate normal with correlation r (Murdoch and
              Chow 1996): semi-axes ∝ √(1 ± |r|), along the rising diagonal for
              r > 0 and the falling one for r < 0; a line when |r| = 1;
     pie      a sector of 360°·|r| from twelve o'clock, clockwise for r > 0 and
              anticlockwise for r < 0 (Friendly 2002);
     bar      height ∝ |r|, rising from the floor for r > 0, hanging from the
              ceiling for r < 0;
     moon     this app's own glyph: a disk of fixed size whose lit fraction is
              exactly |r| — waxing (lit on the right) for r > 0, waning (lit on
              the left) for r < 0. The terminator is a half-ellipse of
              semi-axis R·|1 − 2|r||, so the lit area is |r|·πR²; the size never
              changes, so a strong correlation does not look "heavier" than a
              weak one, only fuller.
   The polygonal glyphs are also given as closed outlines of N points that
   start at twelve o'clock and run clockwise, so that any of them can be
   morphed into any other by interpolating the points.

   No DOM: returns path strings and point lists. */
function GlyphCore(g) {
'use strict';
const { abs, sqrt, cos, sin, PI, min, max } = Math;
const Glyph = {};
Glyph.KINDS = ['circle', 'square', 'ellipse', 'pie', 'moon', 'bar', 'shade', 'color', 'number'];
Glyph.POLY = ['circle', 'square', 'ellipse', 'pie', 'moon', 'bar'];
Glyph.N = 96;
const f = v => (Math.round(v * 100) / 100).toString();

/* resample a closed polyline to n points equally spaced by length, starting
   at the point nearest to twelve o'clock and running clockwise (in screen
   coordinates, y down) */
function resample(pts, n) {
  /* orientation: make it clockwise on screen (positive signed area with y down) */
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  if (area < 0) pts = pts.slice().reverse();
  /* start: the point with the smallest angle measured clockwise from 12 o'clock */
  let best = 0, bestA = Infinity;
  pts.forEach((p, i) => {
    let a = Math.atan2(p[0], -p[1]);
    if (a < 0) a += 2 * PI;
    const d = Math.hypot(p[0], p[1]);
    const key = d < 1e-9 ? 2 * PI + 1 : a;
    if (key < bestA - 1e-9) { bestA = key; best = i; }
  });
  pts = pts.slice(best).concat(pts.slice(0, best));
  const seg = [];
  let tot = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); tot += d; }
  if (tot < 1e-12) return Array.from({ length: n }, () => pts[0].slice());
  const out = [];
  let k = 0, acc = 0;
  for (let j = 0; j < n; j++) {
    const target = j * tot / n;
    while (k < seg.length - 1 && acc + seg[k] < target) { acc += seg[k]; k++; }
    const a = pts[k], b = pts[(k + 1) % pts.length], t = seg[k] ? (target - acc) / seg[k] : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
Glyph.resample = resample;

/* the outline of a polygonal glyph, as dense points before resampling */
function outline(kind, r, s) {
  const ar = min(1, abs(r)), pos = r >= 0, P = [];
  const K = 180;
  if (kind === 'circle') {
    const R = 0.92 * s * sqrt(ar);
    for (let i = 0; i < K; i++) { const a = 2 * PI * i / K; P.push([R * sin(a), -R * cos(a)]); }
  } else if (kind === 'square') {
    const h = 0.92 * s * sqrt(ar);
    const c = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (let e = 0; e < 4; e++) { const a = c[e], b = c[(e + 1) % 4]; for (let i = 0; i < 45; i++) { const t = i / 45; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
  } else if (kind === 'ellipse') {
    const A = 0.95 * s * sqrt((1 + ar) / 2), B = 0.95 * s * sqrt(max(0, (1 - ar) / 2));
    /* rising diagonal on screen (bottom-left to top-right) is −45° with y down */
    const th = pos ? -PI / 4 : PI / 4, ct = cos(th), st = sin(th);
    for (let i = 0; i < K; i++) { const a = 2 * PI * i / K, u = A * cos(a), v = B * sin(a); P.push([u * ct - v * st, u * st + v * ct]); }
  } else if (kind === 'pie') {
    const R = 0.9 * s, span = 2 * PI * ar, dir = pos ? 1 : -1;
    P.push([0, 0]);
    const m = Math.max(2, Math.round(K * ar));
    for (let i = 0; i <= m; i++) { const a = dir * span * i / m; P.push([R * sin(a), -R * cos(a)]); }
  } else if (kind === 'moon') {
    const R = 0.9 * s, e = R * abs(1 - 2 * ar), lit = pos ? 1 : -1;
    /* outer half-circle on the lit side, from top to bottom */
    for (let i = 0; i <= 90; i++) { const a = PI * i / 90; P.push([lit * R * sin(a), -R * cos(a)]); }
    /* terminator from bottom back to top: bulges towards the lit side for a
       crescent (|r| < ½) and towards the dark side for a gibbous moon */
    const side = ar < 0.5 ? lit : -lit;
    for (let i = 1; i < 90; i++) { const a = PI * i / 90; P.push([side * e * sin(a), R * cos(a)]); }
  } else if (kind === 'bar') {
    const w = 0.42 * s, H = 1.84 * s * ar, top = -0.92 * s, bot = 0.92 * s;
    const y0 = pos ? bot - H : top, y1 = pos ? bot : top + H;
    const c = [[-w, y0], [w, y0], [w, y1], [-w, y1]];
    for (let e2 = 0; e2 < 4; e2++) { const a = c[e2], b = c[(e2 + 1) % 4]; for (let i = 0; i < 45; i++) { const t = i / 45; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
  }
  return P;
}
Glyph.points = (kind, r, s, n) => resample(outline(kind, r, s), n || Glyph.N);
Glyph.pathOf = function (pts, cx, cy) {
  cx = cx || 0; cy = cy || 0;
  return pts.map((p, i) => (i ? 'L' : 'M') + f(cx + p[0]) + ' ' + f(cy + p[1])).join('') + 'Z';
};
/* interpolate two outlines (same n) with t ∈ [0, 1] */
Glyph.lerp = (A, B, t) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t]);
Glyph.ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* exact path of a polygonal glyph (for drawing, not for morphing): circles
   and ellipses as arcs, the moon with its two arcs */
Glyph.path = function (kind, r, s, cx, cy) {
  cx = cx || 0; cy = cy || 0;
  const ar = min(1, abs(r)), pos = r >= 0;
  if (kind === 'circle') { const R = 0.92 * s * sqrt(ar); return `M${f(cx)} ${f(cy - R)}A${f(R)} ${f(R)} 0 1 1 ${f(cx)} ${f(cy + R)}A${f(R)} ${f(R)} 0 1 1 ${f(cx)} ${f(cy - R)}Z`; }
  if (kind === 'moon') {
    const R = 0.9 * s, e = R * abs(1 - 2 * ar), lit = pos ? 1 : 0;
    if (ar < 1e-6) return '';
    /* outer arc top → bottom on the lit side; terminator bottom → top */
    const sweepOuter = pos ? 1 : 0;
    const crescent = ar < 0.5;
    const sweepTerm = crescent ? (pos ? 0 : 1) : (pos ? 1 : 0);
    void lit;
    return `M${f(cx)} ${f(cy - R)}A${f(R)} ${f(R)} 0 0 ${sweepOuter} ${f(cx)} ${f(cy + R)}A${f(e)} ${f(R)} 0 0 ${sweepTerm} ${f(cx)} ${f(cy - R)}Z`;
  }
  return Glyph.pathOf(Glyph.points(kind, r, s, 64), cx, cy);
};
/* lit area of the moon divided by the disk (should be exactly |r|) */
Glyph.moonFraction = function (r) {
  const ar = min(1, abs(r));
  const e = abs(1 - 2 * ar);
  return ar < 0.5 ? (1 - e) / 2 : (1 + e) / 2;
};
/* signed polygon area (for the tests: circle and square ∝ |r|) */
Glyph.area = function (pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return abs(a) / 2;
};

g.Glyph = Glyph;
return Glyph;
}
if (typeof window !== 'undefined') GlyphCore(window);
