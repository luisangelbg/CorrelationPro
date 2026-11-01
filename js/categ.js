/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 8, the engine of categorical, ordinal and mixed
   association.

     The contingency table, Pearson's χ² (with Yates' correction for 2 × 2 on
       request), the likelihood-ratio G², Fisher's exact test for 2 × 2 and a
       Monte Carlo p for larger tables (the table margins kept by permuting
       one variable, which draws from the same hypergeometric distribution).
     Nominal measures: φ, Cramér's V and its bias-corrected version (Bergsma
       2013), Pearson's C, Tschuprow's T, Goodman and Kruskal's λ and τ, and
       Theil's uncertainty coefficient U (each asymmetric and symmetric).
     2 × 2: Yule's Q and Y, the odds ratio with Woolf's interval.
     Latent normal: the bivariate normal distribution function by Genz's
       (2004) method (Gauss–Legendre on the Drezner–Wesolowsky integral), the
       tetrachoric and polychoric correlations by the two-step method (the
       thresholds from the margins, then ρ by maximum likelihood; Olsson
       1979), the polyserial by the ad hoc estimator and by two-step maximum
       likelihood (Olsson, Drasgow and Dorans 1982), the biserial (Pearson
       1909).
     Binary or nominal with continuous: point-biserial, rank-biserial (Glass
       1965; Kerby 2014) and the correlation ratio η.
     The heterogeneous matrix: for each pair, the coefficient its two kinds
       ask for.

   Installs `Cat` in the global object it is given; needs Num and Coef. */
function CategCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, exp, min, max, PI, asin, sin } = Math;
const Cat = {};

/* ---------------- the table ---------------- */
/* a, b: integer codes (NaN missing), with ka, kb levels */
Cat.table = function (a, b, ka, kb) {
  const T = Array.from({ length: ka }, () => new Array(kb).fill(0));
  let n = 0;
  for (let i = 0; i < a.length; i++) if (isFinite(a[i]) && isFinite(b[i])) { T[a[i]][b[i]]++; n++; }
  return Cat.fromTable(T);
};
Cat.fromTable = function (T0) {
  /* drop empty rows and columns */
  let T = T0.filter(r => r.some(v => v > 0));
  const keepC = T[0] ? T[0].map((_, j) => T.some(r => r[j] > 0)) : [];
  T = T.map(r => r.filter((_, j) => keepC[j]));
  const r = T.length, c = r ? T[0].length : 0;
  const rs = T.map(row => row.reduce((s, v) => s + v, 0)), cs = Array.from({ length: c }, (_, j) => T.reduce((s, row) => s + row[j], 0));
  const n = rs.reduce((s, v) => s + v, 0);
  return { T, r, c, rs, cs, n, keptRows: T0.map(row => row.some(v => v > 0)), keptCols: keepC };
};
Cat.chisq = function (tb, o) {
  o = o || {};
  const { T, r, c, rs, cs, n } = tb;
  let X2 = 0, G2 = 0, minE = Infinity;
  const yates = o.correct && r === 2 && c === 2;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    const E = rs[i] * cs[j] / n, O = T[i][j];
    minE = min(minE, E);
    const d = yates ? max(0, abs(O - E) - 0.5) : O - E;
    X2 += d * d / E;
    if (O > 0) G2 += 2 * O * log(O / E);
  }
  const df = (r - 1) * (c - 1);
  return { X2, df, p: Num.pchisq(X2, df, true), G2, pG: Num.pchisq(G2, df, true), minE, yates, small: minE < 5 };
};
/* Fisher's exact test for 2 × 2: hypergeometric probabilities of the tables
   with the observed margins; two-sided sums those not more probable than
   the observed one (with the usual relative tolerance 1e−7) */
Cat.fisher = function (tb) {
  const [[a, b], [c, d]] = tb.T, r1 = a + b, c1 = a + c, n = a + b + c + d;
  const lo = max(0, r1 + c1 - n), hi = min(r1, c1);
  const lch = (N, k) => Num.lgamma(N + 1) - Num.lgamma(k + 1) - Num.lgamma(N - k + 1);
  const lp = x => lch(c1, x) + lch(n - c1, r1 - x) - lch(n, r1);
  const p0 = lp(a);
  let two = 0, less = 0, greater = 0;
  for (let x = lo; x <= hi; x++) {
    const v = exp(lp(x));
    if (lp(x) <= p0 + log(1 + 1e-7)) two += v;
    if (x <= a) less += v;
    if (x >= a) greater += v;
  }
  return { p: min(1, two), less: min(1, less), greater: min(1, greater) };
};
/* Monte Carlo p of χ² keeping both margins: permute the column labels */
Cat.monteCarlo = function (tb, o) {
  o = o || {};
  const B = o.B || 2000, rnd = Num.rng(o.seed || 1), { T, r, c, n } = tb;
  const rowLab = [], colLab = [];
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) for (let k = 0; k < T[i][j]; k++) { rowLab.push(i); colLab.push(j); }
  const obs = Cat.chisq(tb).X2;
  let ge = 0;
  const M = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let b = 0; b < B; b++) {
    rnd.shuffle(colLab);
    M.forEach(row => row.fill(0));
    for (let k = 0; k < n; k++) M[rowLab[k]][colLab[k]]++;
    if (Cat.chisq({ T: M, r, c, rs: tb.rs, cs: tb.cs, n }).X2 >= obs * (1 - 64 * Number.EPSILON)) ge++;
  }
  return { p: (ge + 1) / (B + 1), B };
};

/* ---------------- nominal measures ---------------- */
Cat.nominal = function (tb) {
  const { T, r, c, rs, cs, n } = tb, X2 = Cat.chisq(tb).X2, phi2 = X2 / n, k = min(r, c);
  const out = { phi2, X2 };
  out.cramer = sqrt(phi2 / (k - 1));
  /* Bergsma (2013) bias correction */
  const phi2c = max(0, phi2 - (r - 1) * (c - 1) / (n - 1)), rc = r - (r - 1) ** 2 / (n - 1), cc = c - (c - 1) ** 2 / (n - 1);
  out.cramerBC = sqrt(phi2c / min(rc - 1, cc - 1));
  out.contingency = sqrt(X2 / (X2 + n));
  out.contingencyMax = sqrt((k - 1) / k);
  out.tschuprow = sqrt(phi2 / sqrt((r - 1) * (c - 1)));
  if (r === 2 && c === 2) { const [[a, b], [cq, d]] = T; out.phi = (a * d - b * cq) / sqrt(rs[0] * rs[1] * cs[0] * cs[1]); }
  /* λ: predicting the column from the row (C|R), the row from the column (R|C), symmetric */
  const sumRowMax = T.reduce((s, row) => s + Math.max(...row), 0), sumColMax = cs.map((_, j) => Math.max(...T.map(row => row[j]))).reduce((s, v) => s + v, 0);
  const maxC = Math.max(...cs), maxR = Math.max(...rs);
  out.lambdaCR = (sumRowMax - maxC) / (n - maxC);
  out.lambdaRC = (sumColMax - maxR) / (n - maxR);
  out.lambda = (sumRowMax + sumColMax - maxC - maxR) / (2 * n - maxC - maxR);
  /* τ of Goodman and Kruskal: proportional reduction of the Gini variation */
  const sc2 = cs.reduce((s, v) => s + v * v, 0) / n, sr2 = rs.reduce((s, v) => s + v * v, 0) / n;
  let a1 = 0, a2 = 0;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { a1 += T[i][j] * T[i][j] / rs[i]; a2 += T[i][j] * T[i][j] / cs[j]; }
  out.tauCR = (a1 - sc2) / (n - sc2);
  out.tauRC = (a2 - sr2) / (n - sr2);
  /* Theil's U */
  const H = v => { let h = 0; for (const x of v) if (x > 0) h -= x / n * log(x / n); return h; };
  const HR = H(rs), HC = H(cs), HRC = H(T.flat()), I = HR + HC - HRC;
  out.uCR = I / HC; out.uRC = I / HR; out.u = 2 * I / (HR + HC); out.mi = I;
  return out;
};
/* 2 × 2 */
Cat.twoByTwo = function (tb, o) {
  o = o || {};
  const [[a, b], [c, d]] = tb.T, z = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2);
  const Q = (a * d - b * c) / (a * d + b * c), Y = (sqrt(a * d) - sqrt(b * c)) / (sqrt(a * d) + sqrt(b * c));
  const or = a * d / (b * c), se = sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const rr = (a / (a + b)) / (c / (c + d));
  return { Q, Y, or, orLo: exp(log(or) - z * se), orHi: exp(log(or) + z * se), logSE: se, rr };
};

/* ---------------- the bivariate normal ---------------- */
const GL = [
  { x: [-0.9324695142031522, -0.6612093864662647, -0.2386191860831970], w: [0.1713244923791705, 0.3607615730481384, 0.4679139345726904] },
  { x: [-0.9815606342467191, -0.9041172563704750, -0.7699026741943050, -0.5873179542866171, -0.3678314989981802, -0.1252334085114692], w: [0.04717533638651177, 0.1069393259953183, 0.1600783285433464, 0.2031674267230659, 0.2334925365383547, 0.2491470458134029] },
  { x: [-0.9931285991850949, -0.9639719272779138, -0.9122344282513259, -0.8391169718222188, -0.7463319064601508, -0.6360536807265150, -0.5108670019508271, -0.3737060887154196, -0.2277858511416451, -0.07652652113349733], w: [0.01761400713915212, 0.04060142980038694, 0.06267204833410906, 0.08327674157670475, 0.1019301198172404, 0.1181945319615184, 0.1316886384491766, 0.1420961093183821, 0.1491729864726037, 0.1527533871307259] },
];
const Phi = z => Num.pnorm(z);
/* P(X > h, Y > k) for the standard bivariate normal with correlation r (Genz 2004) */
Cat.bvnu = function (h, k, r) {
  if (h === -Infinity) return k === -Infinity ? 1 : Phi(-k);
  if (k === -Infinity) return Phi(-h);
  if (h === Infinity || k === Infinity) return 0;
  const G = abs(r) < 0.3 ? GL[0] : abs(r) < 0.75 ? GL[1] : GL[2], x = G.x, w = G.w, lg = x.length;
  let hk = h * k, bvn = 0;
  if (abs(r) < 0.925) {
    const hs = (h * h + k * k) / 2, asr = asin(r);
    for (let i = 0; i < lg; i++) {
      let sn = sin(asr * (1 + x[i]) / 2);
      bvn += w[i] * exp((sn * hk - hs) / (1 - sn * sn));
      sn = sin(asr * (1 - x[i]) / 2);
      bvn += w[i] * exp((sn * hk - hs) / (1 - sn * sn));
    }
    return bvn * asr / (4 * PI) + Phi(-h) * Phi(-k);
  }
  if (r < 0) { k = -k; hk = -hk; }
  if (abs(r) < 1) {
    const as = (1 - r) * (1 + r);
    let a = sqrt(as);
    const bs = (h - k) * (h - k), c = (4 - hk) / 8, d = (12 - hk) / 16;
    bvn = a * exp(-(bs / as + hk) / 2) * (1 - c * (bs - as) * (1 - d * bs / 5) / 3 + c * d * as * as / 5);
    if (hk > -160) { const b = sqrt(bs); bvn -= exp(-hk / 2) * sqrt(2 * PI) * Phi(-b / a) * b * (1 - c * bs * (1 - d * bs / 5) / 3); }
    a /= 2;
    for (let i = 0; i < lg; i++) {
      let xs = (a * (1 + x[i])) ** 2, rs = sqrt(1 - xs);
      bvn += a * w[i] * (exp(-bs / (2 * xs) - hk / (1 + rs)) / rs - exp(-(bs / xs + hk) / 2) * (1 + c * xs * (1 + d * xs)));
      xs = as * (1 - x[i]) ** 2 / 4; rs = sqrt(1 - xs);
      bvn += a * w[i] * exp(-(bs / xs + hk) / 2) * (exp(-hk * (1 - rs) / (2 * (1 + rs))) / rs - (1 + c * xs * (1 + d * xs)));
    }
    bvn = -bvn / (2 * PI);
  }
  if (r > 0) return bvn + Phi(-max(h, k));
  bvn = -bvn;
  if (k > h) bvn += Phi(k) - Phi(h);
  return bvn;
};
/* P(a₁ < X < b₁, a₂ < Y < b₂) */
Cat.bvnRect = function (a1, b1, a2, b2, r) {
  return max(0, Cat.bvnu(a1, a2, r) - Cat.bvnu(a1, b2, r) - Cat.bvnu(b1, a2, r) + Cat.bvnu(b1, b2, r));
};
function golden(f, lo, hi, tol) {
  const gr = (sqrt(5) - 1) / 2;
  let a = lo, b = hi, c = b - gr * (b - a), d = a + gr * (b - a), fc = f(c), fd = f(d);
  while (b - a > (tol || 1e-10)) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}

/* ---------------- polychoric and tetrachoric ---------------- */
Cat.polychoric = function (tb, o) {
  o = o || {};
  const { T, r, c, rs, cs, n } = tb;
  const cum = v => { const out = []; let s = 0; for (let i = 0; i < v.length - 1; i++) { s += v[i]; out.push(Num.qnorm(s / n)); } return out; };
  const rc = [-Infinity, ...cum(rs), Infinity], cc = [-Infinity, ...cum(cs), Infinity];
  const nll = rho => {
    let s = 0;
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) if (T[i][j] > 0) s -= T[i][j] * log(max(1e-300, Cat.bvnRect(rc[i], rc[i + 1], cc[j], cc[j + 1], rho)));
    return s;
  };
  /* a coarse scan, then golden section around the best */
  let best = 0, bv = Infinity;
  for (let k = -39; k <= 39; k++) { const v = nll(k / 40); if (v < bv) { bv = v; best = k / 40; } }
  const rho = golden(nll, max(-0.9999, best - 0.025), min(0.9999, best + 0.025), 1e-12);
  /* standard error from the observed information (numerical second derivative) */
  const hh = 1e-4, d2 = (nll(rho + hh) - 2 * nll(rho) + nll(rho - hh)) / (hh * hh);
  const se = d2 > 0 ? 1 / sqrt(d2) : NaN;
  /* fit of the bivariate normal: G² against the saturated table */
  let G2 = 0;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) if (T[i][j] > 0) G2 += 2 * T[i][j] * log(T[i][j] / (n * Cat.bvnRect(rc[i], rc[i + 1], cc[j], cc[j + 1], rho)));
  const df = r * c - r - c;
  return { est: rho, se, z: rho / se, p: 2 * Num.pnorm(-abs(rho / se)), rowCuts: rc.slice(1, -1), colCuts: cc.slice(1, -1), G2, df, pFit: df > 0 ? Num.pchisq(G2, df, true) : NaN, tetrachoric: r === 2 && c === 2 };
};
/* ---------------- polyserial, biserial ---------------- */
/* x continuous, y ordinal codes 0..s−1 (NaN missing) */
Cat.polyserial = function (x0, y0, o) {
  o = o || {};
  const x = [], y = [];
  for (let i = 0; i < x0.length; i++) if (isFinite(x0[i]) && isFinite(y0[i])) { x.push(x0[i]); y.push(y0[i]); }
  const n = x.length, levels = [...new Set(y)].sort((a, b) => a - b), s = levels.length;
  const yi = y.map(v => levels.indexOf(v));
  const tab = levels.map((_, k) => yi.filter(v => v === k).length);
  let cumN = 0;
  const cuts = [];
  for (let k = 0; k < s - 1; k++) { cumN += tab[k]; cuts.push(Num.qnorm(cumN / n)); }
  const m = Num.mean(x), sd = Num.sd(x), z = x.map(v => (v - m) / sd);
  /* the ad hoc estimator: √((n−1)/n)·sd(y)·r(x, y) / Σ φ(τⱼ), y scored 1..s */
  const ys = yi.map(v => v + 1);
  const adhoc = sqrt((n - 1) / n) * Num.sd(ys) * Coef.pearson(x, ys).est / cuts.reduce((t, c) => t + Num.dnorm(c), 0);
  const cts = [-Infinity, ...cuts, Infinity];
  const nll = rho => {
    const q = sqrt(1 - rho * rho);
    let t = 0;
    for (let i = 0; i < n; i++) { const k = yi[i]; const pr = Num.pnorm((cts[k + 1] - rho * z[i]) / q) - Num.pnorm((cts[k] - rho * z[i]) / q); t -= log(max(1e-300, pr)) + log(Num.dnorm(z[i])); }
    return t;
  };
  let best = 0, bv = Infinity;
  for (let k = -39; k <= 39; k++) { const v = nll(k / 40); if (v < bv) { bv = v; best = k / 40; } }
  const rho = golden(nll, max(-0.9999, best - 0.025), min(0.9999, best + 0.025), 1e-12);
  const hh = 1e-4, d2 = (nll(rho + hh) - 2 * nll(rho) + nll(rho - hh)) / (hh * hh), se = d2 > 0 ? 1 / sqrt(d2) : NaN;
  return { est: rho, adhoc, se, z: rho / se, p: 2 * Num.pnorm(-abs(rho / se)), cuts, n, levels: s };
};
/* biserial: the point-biserial rescaled by √(pq)/φ(z_p), with the standard deviation of the whole sample (n − 1) */
Cat.biserial = function (x0, b0) {
  const x = [], b = [];
  for (let i = 0; i < x0.length; i++) if (isFinite(x0[i]) && isFinite(b0[i])) { x.push(x0[i]); b.push(b0[i] > 0 ? 1 : 0); }
  const n = x.length, n1 = b.filter(v => v === 1).length, p = n1 / n, q = 1 - p;
  const rpb = Coef.pearson(x, b).est;
  const m1 = Num.mean(x.filter((_, i) => b[i] === 1)), m0 = Num.mean(x.filter((_, i) => b[i] === 0)), sd = Num.sd(x);
  const yq = Num.dnorm(Num.qnorm(q));
  const rb = (m1 - m0) / sd * p * q / yq;
  return { pointBiserial: rpb, pPB: Coef.pearson(x, b).p, biserial: rb, n, p };
};
/* rank-biserial: (mean rank of group 1 − mean rank of group 0)·2/n, = 1 − 2U/(n₁n₀) with U of group 0 */
Cat.rankBiserial = function (x0, b0) {
  const x = [], b = [];
  for (let i = 0; i < x0.length; i++) if (isFinite(x0[i]) && isFinite(b0[i])) { x.push(x0[i]); b.push(b0[i] > 0 ? 1 : 0); }
  const n = x.length, rk = Num.rank(x);
  let s1 = 0, n1 = 0;
  for (let i = 0; i < n; i++) if (b[i] === 1) { s1 += rk[i]; n1++; }
  const n0 = n - n1, U1 = s1 - n1 * (n1 + 1) / 2;
  const r = 2 * U1 / (n1 * n0) - 1;
  /* the Wilcoxon–Mann–Whitney normal test with the tie correction */
  const ties = Num.tieGroups(x), tc = ties.reduce((t, k) => t + k * k * k - k, 0);
  const sigma = sqrt(n1 * n0 / 12 * ((n + 1) - tc / (n * (n - 1))));
  const zz = (U1 - n1 * n0 / 2) / sigma;
  return { est: r, U: U1, z: zz, p: 2 * Num.pnorm(-abs(zz)), n1, n0 };
};
/* the correlation ratio η of a continuous y on groups */
Cat.eta = function (y0, g0) {
  const y = [], gg = [];
  for (let i = 0; i < y0.length; i++) if (isFinite(y0[i]) && isFinite(g0[i])) { y.push(y0[i]); gg.push(g0[i]); }
  const n = y.length, m = Num.mean(y), groups = new Map();
  y.forEach((v, i) => { const k = gg[i]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); });
  let ssb = 0, sst = 0;
  for (const v of y) sst += (v - m) * (v - m);
  for (const [, arr] of groups) { const mk = Num.mean(arr); ssb += arr.length * (mk - m) * (mk - m); }
  const k = groups.size, eta2 = ssb / sst, F = (ssb / (k - 1)) / ((sst - ssb) / (n - k));
  return { eta: sqrt(eta2), eta2, F, df1: k - 1, df2: n - k, p: Num.pf(F, k - 1, n - k, true), k, n };
};

/* ---------------- the heterogeneous matrix ---------------- */
/* cols: [{num, type ('continuous' | 'ordinal' | 'binary' | 'nominal'), levels}] */
Cat.KIND = c => (c.type === 'continuous' ? 'c' : c.type === 'ordinal' ? 'o' : c.type === 'binary' ? 'b' : 'n');
Cat.hetero = function (cols, o) {
  o = o || {};
  const p = cols.length, R = Array.from({ length: p }, () => new Array(p).fill(NaN)), M = Array.from({ length: p }, () => new Array(p).fill(''));
  for (let i = 0; i < p; i++) { R[i][i] = 1; M[i][i] = ''; }
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    const A = cols[i], B = cols[j], ka = Cat.KIND(A), kb = Cat.KIND(B);
    let v = NaN, m = '';
    try {
      if (ka === 'c' && kb === 'c') { v = Coef.pearson(A.num, B.num).est; m = 'pearson'; }
      else if ((ka === 'c') !== (kb === 'c') && ka !== 'n' && kb !== 'n') { const [C, O] = ka === 'c' ? [A, B] : [B, A]; v = Cat.polyserial(C.num, O.num).est; m = 'polyserial'; }
      else if (ka !== 'c' && kb !== 'c' && ka !== 'n' && kb !== 'n') { const tb = Cat.table(A.num, B.num, A.levels.length, B.levels.length); v = Cat.polychoric(tb).est; m = tb.r === 2 && tb.c === 2 ? 'tetrachoric' : 'polychoric'; }
      else if (ka === 'n' || kb === 'n') {
        if (ka === 'c' || kb === 'c') { const [C, N] = ka === 'c' ? [A, B] : [B, A]; v = Cat.eta(C.num, N.num).eta; m = 'eta'; }
        else { const tb = Cat.table(A.num, B.num, A.levels.length, B.levels.length); v = Cat.nominal(tb).cramerBC; m = 'cramer'; }
      }
    } catch (e) { v = NaN; }
    R[i][j] = R[j][i] = v; M[i][j] = M[j][i] = m;
  }
  return { R, M };
};

g.Cat = Cat;
return Cat;
}
if (typeof window !== 'undefined') CategCore(window);
