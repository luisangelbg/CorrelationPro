/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — colour: the perceptual colour space, the app's own
   palettes, colour-vision simulation and the checks every palette must pass.

   Every palette of the app is designed here, from anchors in OKLCH (the polar
   form of the OKLab space of B. Ottosson, 2020), so that equal steps of a
   correlation look like equal steps of colour:
     · divergent palettes for r ∈ [−1, 1]: a neutral centre at r = 0 and two
       hues of the same lightness and chroma at ±1, joined by straight lines in
       OKLab (constant hue, lightness and chroma linear in |r|);
     · sequential palettes for |r|, r², −log₁₀ p and densities: three anchors,
       piecewise straight in OKLab;
     · categorical palettes for groups.
   The checks: inside the sRGB gamut along the whole ramp; uniform steps; the
   sign still distinguishable for protanopia, deuteranopia and tritanopia
   (simulation of Machado, Oliveira and Fernandes 2009, in linear RGB); the
   same grey for +r and −r (so the sign must also be carried by the shape of
   the glyph); the contrast of the extremes against the background.

   Names are of Mexican plants, places and crafts; the palettes are original.
   Wrapped in a named function (installs `Pal`), with no DOM access. */
function PalCore(g) {
'use strict';
const { cbrt, sqrt, cos, sin, atan2, PI, abs, min, max, round, pow } = Math;
const Pal = {};

/* ---------------- sRGB ⇄ linear ⇄ OKLab ⇄ OKLCH ---------------- */
const dec = v => v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4);
const enc = v => v <= 0.0031308 ? 12.92 * v : 1.055 * pow(v, 1 / 2.4) - 0.055;
Pal.toLinear = rgb => rgb.map(dec);
Pal.toSRGB = lin => lin.map(enc);
Pal.hexToRgb = function (h) {
  h = String(h).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
Pal.rgbToHex = function (rgb) {
  return '#' + rgb.map(v => {
    const k = round(max(0, min(1, v)) * 255);
    return (k < 16 ? '0' : '') + k.toString(16);
  }).join('').toUpperCase();
};
/* linear sRGB → OKLab (Ottosson's matrices, built for D65 sRGB) */
Pal.linToOklab = function ([r, gg, b]) {
  const l = cbrt(0.4122214708 * r + 0.5363325363 * gg + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * gg + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * gg + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
};
Pal.oklabToLin = function ([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
};
Pal.lchToLab = ([L, C, h]) => [L, C * cos(h * PI / 180), C * sin(h * PI / 180)];
Pal.labToLch = ([L, a, b]) => { const h = atan2(b, a) * 180 / PI; return [L, sqrt(a * a + b * b), h < 0 ? h + 360 : h]; };
Pal.hexToOklab = h => Pal.linToOklab(Pal.toLinear(Pal.hexToRgb(h)));
Pal.oklabToHex = lab => Pal.rgbToHex(Pal.toSRGB(Pal.oklabToLin(lab)));
Pal.oklchToHex = lch => Pal.oklabToHex(Pal.lchToLab(lch));
Pal.inGamut = lin => lin.every(v => v >= -1e-7 && v <= 1 + 1e-7);
/* the largest chroma of a lightness and hue that sRGB can show (bisection) */
Pal.maxChroma = function (L, h) {
  let lo = 0, hi = 0.5;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Pal.inGamut(Pal.oklabToLin(Pal.lchToLab([L, m, h])))) lo = m; else hi = m; }
  return lo;
};
/* bring a colour into the gamut by lowering its chroma at constant L and h */
Pal.clipChroma = function (lab) {
  if (Pal.inGamut(Pal.oklabToLin(lab))) return lab;
  const [L, C, h] = Pal.labToLch(lab);
  return Pal.lchToLab([L, min(C, Pal.maxChroma(L, h)), h]);
};
Pal.deltaE = (p, q) => sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
/* relative luminance (WCAG) and contrast ratio */
Pal.luminance = lin => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
Pal.contrast = function (h1, h2) {
  const a = Pal.luminance(Pal.toLinear(Pal.hexToRgb(h1))), b = Pal.luminance(Pal.toLinear(Pal.hexToRgb(h2)));
  return (max(a, b) + 0.05) / (min(a, b) + 0.05);
};
/* black or white text over a fill, whichever contrasts more */
Pal.inkOn = hex => Pal.contrast(hex, '#000000') >= Pal.contrast(hex, '#FFFFFF') ? '#111111' : '#FFFFFF';

/* ---------------- colour-vision deficiency ----------------
   Dichromacy (severity 1) matrices of Machado, Oliveira and Fernandes (2009,
   IEEE TVCG 15:1291–1298), applied to linear RGB. */
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
Pal.CVD = CVD;
Pal.simulateLin = (kind, lin) => CVD[kind].map(r => max(0, min(1, r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2])));
Pal.simulate = (kind, hex) => kind === 'none' ? hex : Pal.rgbToHex(Pal.toSRGB(Pal.simulateLin(kind, Pal.toLinear(Pal.hexToRgb(hex)))));
/* the grey a colour prints as: same luminance */
Pal.grey = function (hex) {
  const y = Pal.luminance(Pal.toLinear(Pal.hexToRgb(hex)));
  return Pal.rgbToHex(Pal.toSRGB([y, y, y]));
};

/* ---------------- the app's palettes ----------------
   Divergent: [id, name, English gloss, L at ±1, C at ±1, hue of +r, hue of −r,
   L of the centre]. The centre is near white (L 0.975) except in the two made
   for dark backgrounds, whose pair (the light version that keeps the meaning)
   is used when a figure is exported with the colours of the light theme. */
const DIV = [
  ['anil', 'Añil–Achiote', 'Indigo–Annatto', 0.45, 0.150, 268, 33, 0.975],
  ['cortes', 'Mar de Cortés–Sonora', 'Sea of Cortez–Sonoran desert', 0.48, 0.097, 255, 78, 0.975],
  ['jacaranda', 'Jacaranda–Cempasúchil', 'Jacaranda–Marigold', 0.50, 0.111, 295, 62, 0.975],
  ['agave', 'Agave–Grana', 'Blue agave–Cochineal', 0.47, 0.093, 232, 18, 0.975],
  ['laguna', 'Laguna–Bugambilia', 'Lagoon–Bougainvillea', 0.50, 0.130, 248, 8, 0.975],
  ['cenote', 'Cenote–Cantera', 'Cenote–Pink quarry stone', 0.48, 0.088, 225, 40, 0.975],
  ['huasteca', 'Huasteca–Tezontle', 'Huasteca river–Volcanic stone', 0.52, 0.090, 218, 45, 0.975],
  ['nopal', 'Nopal–Tuna', 'Prickly pear pad–Prickly pear fruit', 0.50, 0.121, 125, 335, 0.975],
  ['zacate', 'Zacate–Orquídea', 'Grass–Orchid', 0.48, 0.125, 130, 310, 0.975],
  ['pizarra', 'Pizarra–Barro', 'Slate–Clay', 0.45, 0.060, 250, 55, 0.975],
  ['teotihuacan', 'Noche de Teotihuacan', 'Night at Teotihuacan', 0.82, 0.130, 210, 70, 0.22, 'cortes'],
  ['monarca', 'Monarca–Oyamel', 'Monarch–Sacred fir', 0.80, 0.125, 200, 52, 0.24, 'huasteca'],
].map(([id, es, gloss, L1, C1, hPos, hNeg, L0, pair]) => ({ id, es, en: es, gloss, L1, C1, hPos, hNeg, L0, dark: L0 < 0.5, pair: pair || null, kind: 'div' }));
/* Sequential: three OKLCH anchors from light to dark */
const SEQ = [
  ['maiz', 'Maíz azul', 'Blue maize', [[0.97, 0.015, 300], [0.62, 0.150, 290], [0.28, 0.120, 285]]],
  ['cacao', 'Cacao', 'Cacao', [[0.97, 0.030, 85], [0.62, 0.100, 60], [0.28, 0.055, 40]]],
  ['lacandona', 'Selva Lacandona', 'Lacandon rainforest', [[0.97, 0.060, 115], [0.65, 0.150, 145], [0.30, 0.060, 165]]],
  ['desierto', 'Atardecer en el desierto', 'Desert sunset', [[0.96, 0.080, 100], [0.68, 0.165, 50], [0.30, 0.120, 340]]],
  ['caribe', 'Mar Caribe', 'Caribbean Sea', [[0.97, 0.040, 190], [0.66, 0.110, 215], [0.28, 0.110, 262]]],
  ['obsidiana', 'Obsidiana', 'Obsidian', [[0.98, 0.004, 260], [0.60, 0.012, 260], [0.20, 0.020, 260]]],
  ['olinala', 'Laca de Olinalá', 'Olinalá lacquer', [[0.95, 0.060, 90], [0.60, 0.170, 28], [0.22, 0.030, 20]]],
].map(([id, es, gloss, anchors]) => ({ id, es, en: es, gloss, anchors, kind: 'seq' }));
/* Categorical (groups): the suite's own sets, plus the one published for
   colour-blind readers by Okabe and Ito (2008), cited as such */
const CAT = {
  /* own: lacquer red and gold first (the identity of the app), the other six
     chosen to maximise the smallest colour distance for normal vision and the
     three simulated deficiencies (0.088 in OKLab for all eight; 0.21 for three) */
  laca: ['#B3182D', '#C9962B', '#555BDC', '#00A2C7', '#E14074', '#A63AA0', '#9C72FE', '#967600'],
  vivid: ['#d7263d', '#1b6ca8', '#2e9e5b', '#7b3fa0', '#f08a24', '#8a5a2b', '#e45fa3', '#7d7d7d', '#39a9a0', '#e8c228'],
  bold: ['#b83227', '#2471a3', '#239954', '#7d3c98', '#d68910', '#9c4a13', '#cf5489', '#5d6d7e', '#17a589', '#b7950b'],
  soft: ['#7fc8a9', '#f3a683', '#9aa8d6', '#e7a1c8', '#b5d56a', '#f7d86b', '#dcc19e', '#bfbfbf', '#6fae3e', '#dfad2e'],
  deep: ['#157a62', '#c65d1b', '#6b63a8', '#cf2f7f', '#5d9b2c', '#c9971a', '#98702a', '#5e5e5e', '#2f76a8', '#a94a25'],
  pastel: ['#a8c8ec', '#f7bd92', '#9ddcaf', '#f3a6a3', '#cdbff5', '#dcc0a3', '#f2b6de', '#d3d3d3', '#f6f2a4', '#bde8e5'],
  okabe: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'],
};
const CAT_NAMES = {
  laca: ['Laca (propia)', 'Lacquer (own)'], vivid: ['Viva', 'Vivid'], bold: ['Intensa', 'Bold'], soft: ['Suave', 'Soft'],
  deep: ['Profunda', 'Deep'], pastel: ['Pastel', 'Pastel'], okabe: ['Okabe e Ito (2008)', 'Okabe and Ito (2008)'],
};
Pal.DIV = DIV; Pal.SEQ = SEQ; Pal.CAT = CAT; Pal.CAT_NAMES = CAT_NAMES;
Pal.ALL = DIV.concat(SEQ);
Pal.get = id => (id && typeof id === 'object' ? id : Pal.ALL.find(p => p.id === id) || DIV[0]);
/* a palette of the user's (the designer of Block 13) joins the list under its id */
Pal.register = function (p) { const i = Pal.ALL.findIndex(q => q.id === p.id); if (i >= 0) Pal.ALL[i] = p; else Pal.ALL.push(p); return p; };

/* ---------------- sampling a palette ----------------
   Divergent: t = |r| moves along the straight line from the centre to the
   anchor of r's sign; `invert` swaps the two hues (for readers whose
   convention is the opposite). Sequential: t ∈ [0, 1] from light to dark. */
Pal.divLab = function (p, r, invert) {
  const t = min(1, abs(r));
  const pos = (r >= 0) !== !!invert;
  return Pal.clipChroma(Pal.lchToLab([p.L0 + (p.L1 - p.L0) * t, p.C1 * t, pos ? p.hPos : p.hNeg]));
};
/* Sequential: straight segments in OKLab between the anchors, with each
   anchor placed at its share of the total length of the path (arc length),
   so that equal steps of t are equal colour differences along the whole ramp
   and not only within each segment. */
function seqPath(p) {
  if (p._path) return p._path;
  const A = p.anchors.map(Pal.lchToLab), len = [0];
  for (let i = 1; i < A.length; i++) len.push(len[i - 1] + Pal.deltaE(A[i - 1], A[i]));
  const T = len.map(v => v / len[len.length - 1]);
  p._path = { A, T };
  return p._path;
}
Pal.seqRaw = function (p, t) {
  t = max(0, min(1, t));
  const { A, T } = seqPath(p);
  let i = 0;
  while (i < A.length - 2 && t > T[i + 1]) i++;
  const f = (t - T[i]) / (T[i + 1] - T[i]);
  return [0, 1, 2].map(j => A[i][j] + (A[i + 1][j] - A[i][j]) * f);
};
Pal.seqLab = (p, t) => Pal.clipChroma(Pal.seqRaw(p, t));
/* the hex colour of a value: r for divergent, t for sequential */
Pal.color = function (p, v, opts) {
  if (typeof p === 'string') p = Pal.get(p);
  const lab = p.kind === 'div' ? Pal.divLab(p, v, opts && opts.invert) : Pal.seqLab(p, v);
  const hex = Pal.oklabToHex(lab);
  return opts && opts.cvd && opts.cvd !== 'none' ? Pal.simulate(opts.cvd, hex) : hex;
};
/* n evenly spaced stops (−1 → 1 for divergent, 0 → 1 for sequential) */
Pal.stops = function (p, k, opts) {
  if (typeof p === 'string') p = Pal.get(p);
  k = k || 9;
  return Array.from({ length: k }, (_, i) => {
    const t = i / (k - 1);
    return Pal.color(p, p.kind === 'div' ? -1 + 2 * t : t, opts);
  });
};
/* a palette made from the user's own two hues (the palette designer) */
Pal.custom = function (o) {
  const L1 = o.L1 == null ? 0.48 : o.L1, L0 = o.L0 == null ? 0.975 : o.L0;
  const C1 = o.C1 == null ? 0.97 * min(Pal.maxChroma(L1, o.hPos), Pal.maxChroma(L1, o.hNeg)) : o.C1;
  return { id: 'custom', es: o.name || 'Propia', en: o.name || 'Custom', gloss: '', L1, C1, hPos: o.hPos, hNeg: o.hNeg, L0, dark: L0 < 0.5, pair: null, kind: 'div' };
};

/* The version of a divergent palette for a dark screen: the same two hues,
   the centre dark (L 0.24) and the extremes light (L 0.80), with the largest
   chroma both hues can show there. A palette made for dark backgrounds is its
   own dark version, and its light version is its declared pair. */
Pal.darkVersion = function (p) {
  if (typeof p === 'string') p = Pal.get(p);
  if (p.kind !== 'div' || p.dark) return p;
  if (p._dark) return p._dark;
  const L1 = 0.80;
  const C1 = 0.97 * min(Pal.maxChroma(L1, p.hPos), Pal.maxChroma(L1, p.hNeg), p.C1 * 1.25);
  p._dark = Object.assign({}, p, { id: p.id + '-dark', L0: 0.24, L1, C1, dark: true, pair: p.id, _dark: null });
  return p._dark;
};
Pal.lightVersion = function (p) {
  if (typeof p === 'string') p = Pal.get(p);
  return p.dark && p.pair ? Pal.get(p.pair) : p;
};

/* ---------------- the checks ----------------
   Returns the measures and a verdict per criterion. Thresholds: ΔE_OK ≈ 0.02
   is about one just-noticeable difference; the sign of |r| = .25 must stay
   above it for every simulated vision. */
Pal.check = function (p, bg) {
  if (typeof p === 'string') p = Pal.get(p);
  bg = bg || (p.dark ? '#141414' : '#FFFFFF');
  const res = { id: p.id, gamut: true, steps: [], sign: {}, grey: null, contrast: null, ok: {} };
  const lab = v => p.kind === 'div' ? Pal.divLab(p, v) : Pal.seqLab(p, v);
  /* gamut along 201 samples (without the chroma clip) */
  for (let i = 0; i <= 200; i++) {
    const v = p.kind === 'div' ? -1 + i / 100 : i / 200;
    const raw = p.kind === 'div'
      ? Pal.lchToLab([p.L0 + (p.L1 - p.L0) * abs(v), p.C1 * abs(v), v >= 0 ? p.hPos : p.hNeg])
      : Pal.seqRaw(p, v);
    if (!Pal.inGamut(Pal.oklabToLin(raw))) res.gamut = false;
  }
  /* uniformity: ΔE of steps of 0.05 */
  const from = p.kind === 'div' ? 0 : 0;
  for (let t = from; t < 0.9999; t += 0.05) res.steps.push(Pal.deltaE(lab(t), lab(t + 0.05)));
  const sMin = min(...res.steps), sMax = max(...res.steps);
  res.ok.uniform = (sMax - sMin) / sMax < 0.25;
  if (p.kind === 'div') {
    for (const kind of ['none', 'protan', 'deutan', 'tritan']) {
      const d = v => {
        const a = Pal.hexToOklab(Pal.color(p, v, { cvd: kind })), b = Pal.hexToOklab(Pal.color(p, -v, { cvd: kind }));
        return Pal.deltaE(a, b);
      };
      res.sign[kind] = { at25: d(0.25), at50: d(0.5), at100: d(1) };
    }
    res.ok.sign = Object.values(res.sign).every(s => s.at25 >= 0.02 && s.at100 >= 0.08);
    const gp = Pal.hexToOklab(Pal.grey(Pal.color(p, 1)))[0], gn = Pal.hexToOklab(Pal.grey(Pal.color(p, -1)))[0];
    res.grey = { pos: gp, neg: gn, diff: abs(gp - gn) };
    res.ok.greySymmetric = res.grey.diff <= 0.03;
    res.contrast = { pos: Pal.contrast(Pal.color(p, 1), bg), neg: Pal.contrast(Pal.color(p, -1), bg) };
    res.ok.contrast = res.contrast.pos >= 3 && res.contrast.neg >= 3;
  } else {
    /* sequential: lightness must fall monotonically, also in grey */
    let mono = true, prev = Infinity;
    for (let i = 0; i <= 20; i++) { const L = Pal.hexToOklab(Pal.grey(Pal.color(p, i / 20)))[0]; if (L > prev + 1e-9) mono = false; prev = L; }
    res.ok.greyMonotone = mono;
    res.contrast = { dark: Pal.contrast(Pal.color(p, 1), bg) };
    res.ok.contrast = res.contrast.dark >= 3;
  }
  res.ok.gamut = res.gamut;
  res.pass = Object.values(res.ok).every(Boolean);
  return res;
};
/* the smallest colour distance between any two members of a categorical
   palette, for normal vision and each simulated deficiency */
Pal.checkCategorical = function (key, k) {
  const cols = CAT[key].slice(0, k || CAT[key].length);
  const out = {};
  for (const kind of ['none', 'protan', 'deutan', 'tritan']) {
    let m = Infinity;
    const labs = cols.map(c => Pal.hexToOklab(Pal.simulate(kind, c)));
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) m = min(m, Pal.deltaE(labs[i], labs[j]));
    out[kind] = m;
  }
  return out;
};

g.Pal = Pal;
return Pal;
}
if (typeof window !== 'undefined') PalCore(window);
