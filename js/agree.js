/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 9, the engine of agreement and reliability.

     Lin's (1989) concordance correlation ρc = 2s_xy/(s_x² + s_y² + (x̄ − ȳ)²)
       (moments with the n divisor), its bias-correction factor C_b = ρc/r and
       the interval on Fisher's z with Lin's asymptotic standard error.
     The intraclass correlations of McGraw and Wong (1996): one-way, two-way
       consistency and two-way absolute agreement, single and average
       measures, with their F tests and exact or Satterthwaite intervals (the
       six forms of Shrout and Fleiss 1979 among them).
     Cohen's κ (1960) and weighted κ (Cohen 1968; linear and quadratic
       weights) with the null standard error of Fleiss, Cohen and Everitt
       (1969); Fleiss' κ for m raters (1971) with the standard error of Fleiss,
       Nee and Landis (1979), and Conger's (1980) exact version; Kendall's W
       with the correction for ties and its χ² test; Krippendorff's α for
       nominal, ordinal, interval and ratio data (missing ratings allowed);
       Gwet's AC1 and AC2 (2008) with their standard error.
     Bland and Altman (1986, 1999): the mean difference, the 95 % limits of
       agreement and their confidence intervals, and the regression of the
       differences on the means (proportional bias).

   Installs `Agree` in the global object it is given; needs Num and Coef. */
function AgreeCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, exp, min, max } = Math;
const A = {};

/* the F quantile, by bisection on the log scale */
A.qf = function (p, d1, d2) {
  let lo = -60, hi = 60;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Num.pf(exp(m), d1, d2) < p) lo = m; else hi = m; }
  return exp((lo + hi) / 2);
};
const rowsComplete = M => M.filter(r => r.every(isFinite));

/* ---------------- Lin's concordance ---------------- */
A.ccc = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, z = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2);
  const mx = Num.mean(x), my = Num.mean(y), sx2 = Num.variance(x) * (n - 1) / n, sy2 = Num.variance(y) * (n - 1) / n;
  const r = Coef.pearson(x, y).est, sxy = r * sqrt(sx2 * sy2);
  const p = 2 * sxy / (sx2 + sy2 + (my - mx) ** 2);
  const u = (my - mx) / Math.pow(sx2 * sy2, 0.25);
  const sep = sqrt(((1 - r * r) * p * p * (1 - p * p) / (r * r) + 2 * p ** 3 * (1 - p) * u * u / r - 0.5 * p ** 4 * u ** 4 / (r * r)) / (n - 2));
  const t = Math.atanh(p), set = sep / (1 - p * p);
  return { est: p, r, Cb: p / r, n, shift: { location: u, scale: sqrt(sy2) / sqrt(sx2) }, se: sep, lo: Math.tanh(t - z * set), hi: Math.tanh(t + z * set), loAsym: p - z * sep, hiAsym: p + z * sep };
};

/* ---------------- intraclass correlation ---------------- */
/* X: subjects × raters (rows with a missing value are dropped) */
A.icc = function (X0, o) {
  o = o || {};
  const X = rowsComplete(X0), ns = X.length, nr = X[0].length, alpha = 1 - (o.conf || 0.95);
  const gm = Num.mean(X.flat()), rm = X.map(r => Num.mean(r)), cm = X[0].map((_, j) => Num.mean(X.map(r => r[j])));
  let SST = 0;
  X.forEach(r => r.forEach(v => { SST += (v - gm) ** 2; }));
  const SSR = nr * rm.reduce((s, v) => s + (v - gm) ** 2, 0), SSC = ns * cm.reduce((s, v) => s + (v - gm) ** 2, 0), SSE = SST - SSR - SSC;
  const MSr = SSR / (ns - 1), MSc = SSC / (nr - 1), MSe = SSE / ((ns - 1) * (nr - 1)), MSw = (SSC + SSE) / (ns * (nr - 1));
  const out = { ns, nr, MSr, MSc, MSe, MSw, forms: [] };
  const add = (id, es, en, coeff, F, df1, df2, lo, hi) => out.forms.push({ id, es, en, est: coeff, F, df1, df2, p: Num.pf(F, df1, df2, true), lo, hi });
  /* one-way */
  {
    const F = MSr / MSw, df1 = ns - 1, df2 = ns * (nr - 1), FL = F / A.qf(1 - alpha / 2, df1, df2), FU = F * A.qf(1 - alpha / 2, df2, df1);
    add('ICC1', 'Unidireccional, una medida — ICC(1)', 'One-way, single measure — ICC(1)', (MSr - MSw) / (MSr + (nr - 1) * MSw), F, df1, df2, (FL - 1) / (FL + (nr - 1)), (FU - 1) / (FU + (nr - 1)));
    add('ICCk', `Unidireccional, promedio de ${nr} — ICC(${nr})`, `One-way, average of ${nr} — ICC(${nr})`, (MSr - MSw) / MSr, F, df1, df2, 1 - 1 / FL, 1 - 1 / FU);
  }
  /* two-way, consistency */
  {
    const F = MSr / MSe, df1 = ns - 1, df2 = (ns - 1) * (nr - 1), FL = F / A.qf(1 - alpha / 2, df1, df2), FU = F * A.qf(1 - alpha / 2, df2, df1);
    add('C1', 'Bidireccional, consistencia, una medida — ICC(C,1)', 'Two-way, consistency, single measure — ICC(C,1)', (MSr - MSe) / (MSr + (nr - 1) * MSe), F, df1, df2, (FL - 1) / (FL + (nr - 1)), (FU - 1) / (FU + (nr - 1)));
    add('Ck', `Bidireccional, consistencia, promedio — ICC(C,${nr})`, `Two-way, consistency, average — ICC(C,${nr})`, (MSr - MSe) / MSr, F, df1, df2, 1 - 1 / FL, 1 - 1 / FU);
  }
  /* two-way, absolute agreement: Satterthwaite degrees of freedom */
  {
    const c1 = (MSr - MSe) / (MSr + (nr - 1) * MSe + (nr / ns) * (MSc - MSe));
    const vOf = c => { const a = nr * c / (ns * (1 - c)), b = 1 + nr * c * (ns - 1) / (ns * (1 - c)); return (a * MSc + b * MSe) ** 2 / ((a * MSc) ** 2 / (nr - 1) + (b * MSe) ** 2 / ((ns - 1) * (nr - 1))); };
    let v = vOf(c1), FL = A.qf(1 - alpha / 2, ns - 1, v), FU = A.qf(1 - alpha / 2, v, ns - 1);
    add('A1', 'Bidireccional, acuerdo absoluto, una medida — ICC(A,1)', 'Two-way, absolute agreement, single measure — ICC(A,1)', c1, MSr / MSe, ns - 1, (ns - 1) * (nr - 1),
      ns * (MSr - FL * MSe) / (FL * (nr * MSc + (nr * ns - nr - ns) * MSe) + ns * MSr), ns * (FU * MSr - MSe) / (nr * MSc + (nr * ns - nr - ns) * MSe + ns * FU * MSr));
    const ck = (MSr - MSe) / (MSr + (MSc - MSe) / ns);
    v = vOf(ck); FL = A.qf(1 - alpha / 2, ns - 1, v); FU = A.qf(1 - alpha / 2, v, ns - 1);
    add('Ak', `Bidireccional, acuerdo absoluto, promedio — ICC(A,${nr})`, `Two-way, absolute agreement, average — ICC(A,${nr})`, ck, MSr / MSe, ns - 1, (ns - 1) * (nr - 1),
      ns * (MSr - FL * MSe) / (FL * (MSc - MSe) + ns * MSr), ns * (FU * MSr - MSe) / (MSc - MSe + ns * FU * MSr));
  }
  return out;
};
/* Koo and Li (2016): < .5 poor, .5–.75 moderate, .75–.9 good, > .9 excellent */
A.iccWords = v => (v < 0.5 ? ['pobre', 'poor'] : v < 0.75 ? ['moderada', 'moderate'] : v < 0.9 ? ['buena', 'good'] : ['excelente', 'excellent']);

/* ---------------- Cohen's κ (two raters) ---------------- */
/* a, b: integer codes; weight: 'none' | 'linear' | 'quadratic' */
A.kappa2 = function (a0, b0, weight) {
  const a = [], b = [];
  for (let i = 0; i < a0.length; i++) if (isFinite(a0[i]) && isFinite(b0[i])) { a.push(a0[i]); b.push(b0[i]); }
  const ns = a.length, lev = [...new Set(a.concat(b))].sort((x, y) => x - y), nc = lev.length;
  const T = Array.from({ length: nc }, () => new Array(nc).fill(0));
  for (let i = 0; i < ns; i++) T[lev.indexOf(a[i])][lev.indexOf(b[i])]++;
  const W = Array.from({ length: nc }, (_, i) => Array.from({ length: nc }, (_, j) => (weight === 'linear' ? 1 - abs(i - j) / (nc - 1) : weight === 'quadratic' ? 1 - (i - j) ** 2 / (nc - 1) ** 2 : i === j ? 1 : 0)));
  const t1 = T.map(r => r.reduce((s, v) => s + v, 0)), t2 = T[0].map((_, j) => T.reduce((s, r) => s + r[j], 0));
  let po = 0, pe = 0;
  for (let i = 0; i < nc; i++) for (let j = 0; j < nc; j++) { po += T[i][j] * W[i][j]; pe += t1[i] * t2[j] / ns * W[i][j]; }
  po /= ns; pe /= ns;
  const k = (po - pe) / (1 - pe);
  /* the null standard error of Fleiss, Cohen and Everitt (1969) */
  const wi = Array.from({ length: nc }, (_, j) => { let s = 0; for (let i = 0; i < nc; i++) s += t2[i] / ns * W[i][j]; return s; });
  const wj = Array.from({ length: nc }, (_, i) => { let s = 0; for (let j = 0; j < nc; j++) s += t1[j] / ns * W[i][j]; return s; });
  let vm = 0;
  for (let i = 0; i < nc; i++) for (let j = 0; j < nc; j++) vm += (t1[i] * t2[j] / ns / ns) * (W[i][j] - (wi[i] + wj[j])) ** 2;
  const se = sqrt((vm - pe * pe) / (ns * (1 - pe) ** 2)), zz = k / se;
  return { est: k, po, pe, se, z: zz, p: 2 * (1 - Num.pnorm(abs(zz))), n: ns, levels: lev, table: T, weight: weight || 'none' };
};
/* ---------------- Fleiss / Conger (m raters) ---------------- */
A.fleiss = function (R0, o) {
  o = o || {};
  const R = rowsComplete(R0), ns = R.length, nr = R[0].length, lev = [...new Set(R.flat())].sort((x, y) => x - y), q = lev.length;
  const tt = R.map(row => lev.map(l => row.filter(v => v === l).length));
  const po = tt.reduce((s, row) => s + (row.reduce((t, v) => t + v * v, 0) - nr) / (nr * (nr - 1)), 0) / ns;
  const colSum = lev.map((_, k) => tt.reduce((s, row) => s + row[k], 0));
  let pe = colSum.reduce((s, v) => s + v * v, 0) / (ns * nr) ** 2;
  if (o.exact) {
    /* Conger: subtract the variance between raters of their category proportions */
    const rtab = Array.from({ length: nr }, (_, i) => lev.map(l => R.filter(row => row[i] === l).length / ns));
    let sv = 0;
    for (let k = 0; k < q; k++) { const col = rtab.map(r => r[k]), m = Num.mean(col); sv += col.reduce((s, v) => s + (v - m) ** 2, 0) / (nr - 1) * (nr - 1) / nr; }
    pe -= sv / (nr - 1);
  }
  const k = (po - pe) / (1 - pe), out = { est: k, po, pe, n: ns, m: nr, levels: lev };
  if (!o.exact) {
    const pj = colSum.map(v => v / (ns * nr)), pq = pj.reduce((s, v) => s + v * (1 - v), 0), pq2 = pj.reduce((s, v) => s + v * (1 - v) * (1 - 2 * v), 0);
    const se = sqrt(2 / (pq * pq * ns * nr * (nr - 1)) * (pq * pq - pq2));
    out.se = se; out.z = k / se; out.p = 2 * (1 - Num.pnorm(abs(k / se)));
    out.byCategory = lev.map((l, c) => { const pjk = (tt.reduce((s, row) => s + row[c] * row[c], 0) - ns * nr * pj[c]) / (ns * nr * (nr - 1) * pj[c]); return { level: l, kappa: (pjk - pj[c]) / (1 - pj[c]) }; });
  }
  return out;
};
/* ---------------- Kendall's W ---------------- */
A.kendallW = function (R0, o) {
  o = o || {};
  const R = rowsComplete(R0), ns = R.length, nr = R[0].length;
  const ranks = Array.from({ length: nr }, (_, j) => Array.from(Num.rank(R.map(r => r[j]))));
  const sums = R.map((_, i) => ranks.reduce((s, c) => s + c[i], 0)), v = Num.variance(sums);
  let Tj = 0;
  if (o.correct !== false) ranks.forEach(c => Num.tieGroups(c).forEach(t => { Tj += t * t * t - t; }));
  const W = 12 * v * (ns - 1) / (nr * nr * (ns ** 3 - ns) - nr * Tj), X2 = nr * (ns - 1) * W;
  return { est: W, X2, df: ns - 1, p: Num.pchisq(X2, ns - 1, true), n: ns, m: nr, ties: Tj > 0, meanRho: (nr * W - 1) / (nr - 1) };
};
/* ---------------- Krippendorff's α ---------------- */
/* U: units × coders (NaN = missing); level: nominal | ordinal | interval | ratio */
A.kripp = function (U, level) {
  level = level || 'nominal';
  const vals = [...new Set(U.flat().filter(isFinite))].sort((a, b) => a - b), V = vals.length, idx = new Map(vals.map((v, i) => [v, i]));
  const O = Array.from({ length: V }, () => new Array(V).fill(0));
  U.forEach(row => {
    const r = row.filter(isFinite), m = r.length;
    if (m < 2) return;
    for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) if (a !== b) O[idx.get(r[a])][idx.get(r[b])] += 1 / (m - 1);
  });
  const nc = O.map(r => r.reduce((s, v) => s + v, 0)), n = nc.reduce((s, v) => s + v, 0);
  const d2 = (c, k) => {
    if (c === k) return 0;
    if (level === 'nominal') return 1;
    if (level === 'interval') return (vals[c] - vals[k]) ** 2;
    if (level === 'ratio') return ((vals[c] - vals[k]) / (vals[c] + vals[k])) ** 2;
    const lo = min(c, k), hi = max(c, k);
    let s = 0;
    for (let gg = lo; gg <= hi; gg++) s += nc[gg];
    return (s - (nc[c] + nc[k]) / 2) ** 2;
  };
  let Do = 0, De = 0;
  for (let c = 0; c < V; c++) for (let k = 0; k < V; k++) { const d = d2(c, k); Do += O[c][k] * d; De += nc[c] * nc[k] * d; }
  return { est: 1 - (n - 1) * Do / De, n, values: V, level, pairable: n };
};
/* ---------------- Gwet's AC1 / AC2 ---------------- */
A.gwet = function (R0, o) {
  o = o || {};
  const lev = [...new Set(R0.flat().filter(isFinite))].sort((a, b) => a - b), q = lev.length;
  const W = Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) => (o.weight === 'linear' ? 1 - abs(i - j) / (q - 1) : o.weight === 'quadratic' ? 1 - (i - j) ** 2 / (q - 1) ** 2 : i === j ? 1 : 0)));
  const rows = R0.filter(r => r.some(isFinite)), n = rows.length;
  const agree = rows.map(r => lev.map(l => r.filter(v => v === l).length));
  const ri = agree.map(r => r.reduce((s, v) => s + v, 0));
  const n2 = ri.filter(v => v >= 2).length;
  const agreeW = agree.map(r => lev.map((_, k) => r.reduce((s, v, l) => s + W[k][l] * v, 0)));
  const sumq = agree.map((r, i) => r.reduce((s, v, k) => s + v * (agreeW[i][k] - 1), 0));
  let pa = 0;
  for (let i = 0; i < n; i++) if (ri[i] >= 2) pa += sumq[i] / (ri[i] * (ri[i] - 1));
  pa /= n2;
  const pi = lev.map((_, k) => agree.reduce((s, r, i) => s + r[k] / ri[i], 0) / n);
  const sw = W.flat().reduce((s, v) => s + v, 0);
  const pe = q >= 2 ? sw * pi.reduce((s, v) => s + v * (1 - v), 0) / (q * (q - 1)) : 1e-15;
  const ac = (pa - pe) / (1 - pe);
  /* standard error (Gwet 2008; no finite-population correction) */
  const acI = rows.map((_, i) => { const den = ri[i] * (ri[i] - 1) || -1, paI = sumq[i] / den, peR = ri[i] >= 2 ? pe : 0; return (n / n2) * (paI - peR) / (1 - pe); });
  const peI = agree.map((r, i) => sw / (q * (q - 1)) * r.reduce((s, v, k) => s + v * (1 - pi[k]), 0) / ri[i]);
  const acX = acI.map((v, i) => v - 2 * (1 - ac) * (peI[i] - pe) / (1 - pe));
  const vv = acX.reduce((s, v) => s + (v - ac) ** 2, 0) / (n * (n - 1)), se = sqrt(vv);
  const tq = Num.qt(1 - (1 - (o.conf || 0.95)) / 2, n - 1);
  return { est: ac, pa, pe, se, p: 2 * (1 - Num.pt(abs(ac / se), n - 1)), lo: ac - tq * se, hi: ac + tq * se, n, weight: o.weight || 'none' };
};
/* ---------------- Bland and Altman ---------------- */
A.blandAltman = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, conf = o.conf || 0.95, two = o.two || 1.96;
  const d = Array.from(x, (v, i) => v - y[i]), m = Array.from(x, (v, i) => (v + y[i]) / 2);
  const md = Num.mean(d), sd = Num.sd(d), t = Num.qt((1 + conf) / 2, n - 1);
  const lo = md - two * sd, hi = md + two * sd, seM = sd / sqrt(n), seL = sqrt(3 * sd * sd / n);
  const reg = g.Assume ? g.Assume.ols([m], d) : null;
  const prop = reg ? (() => { const r = Coef.pearson(m, d); return { slope: reg.beta[0], intercept: reg.intercept, r: r.est, p: r.p }; })() : null;
  return { n, bias: md, sd, lo, hi, biasCI: [md - t * seM, md + t * seM], loCI: [lo - t * seL, lo + t * seL], hiCI: [hi - t * seL, hi + t * seL], diffs: d, means: m, prop, pBias: 2 * Num.pt(-abs(md / seM), n - 1) };
};

g.Agree = A;
return A;
}
if (typeof window !== 'undefined') AgreeCore(window);
