/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the numerical core.

   Sums, moments, ranks, the special functions and the probability
   distributions every test of the app rests on, the exact null distributions
   of Kendall's and Spearman's statistics, and a seeded random generator.

   Wrapped in a named function that installs `Num` in the global object it is
   given: the page calls it with `window`, a Web Worker with its own `self`
   (built from this very source text, so it also works when the app is opened
   with a double click), and the test benches with a sandbox. Nothing here
   touches the DOM. */
function NumCore(g) {
'use strict';
const { abs, sqrt, exp, log, log1p, expm1, floor, PI, min, max } = Math;
const Num = {};
const LN_SQRT_2PI = 0.9189385332046727418;
const SQRT2 = 1.4142135623730950488;

/* ---------------- sums and moments ----------------
   Neumaier's compensated sum, and two-pass mean and variance: the naive
   one-pass formula loses every digit when the mean is large compared with the
   spread (heights in mm, dates as numbers…). */
Num.sum = function (a) {
  let s = 0, c = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i], t = s + v;
    c += abs(s) >= abs(v) ? (s - t) + v : (v - t) + s;
    s = t;
  }
  return s + c;
};
Num.mean = a => Num.sum(a) / a.length;
Num.variance = function (a, m) {
  const n = a.length;
  if (n < 2) return NaN;
  if (m == null) m = Num.mean(a);
  let s = 0, c = 0;
  for (let i = 0; i < n; i++) { const d = a[i] - m; s += d * d; c += d; }
  return (s - c * c / n) / (n - 1);
};
Num.sd = a => sqrt(Num.variance(a));
Num.median = function (a) {
  const s = Float64Array.from(a).sort(), n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
/* sample quantile, continuous definition 7 (the default of most statistics books) */
Num.quantile = function (a, p) {
  const s = Float64Array.from(a).sort(), n = s.length;
  if (!n) return NaN;
  const h = (n - 1) * p, lo = floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
};
/* median absolute deviation, unscaled (constant 1) */
Num.mad = function (a, med) {
  if (med == null) med = Num.median(a);
  return Num.median(Array.from(a, v => abs(v - med)));
};

/* ---------------- ranks ----------------
   Average ranks (ties share the mean of the ranks they span), as in every
   rank correlation of the classical literature. `tieGroups` returns the sizes
   of the groups of tied values, which the variance corrections need. */
Num.order = function (a) {
  const idx = Array.from({ length: a.length }, (_, i) => i);
  idx.sort((i, j) => (a[i] - a[j]) || (i - j));
  return idx;
};
Num.rank = function (a) {
  const n = a.length, o = Num.order(a), r = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && a[o[j + 1]] === a[o[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[o[k]] = avg;
    i = j + 1;
  }
  return r;
};
Num.tieGroups = function (a) {
  const s = Float64Array.from(a).sort(), out = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[i]) j++;
    if (j > i) out.push(j - i + 1);
    i = j + 1;
  }
  return out;
};

/* ---------------- special functions ---------------- */
/* log Γ(x) for x > 0: Lanczos (g = 7, 9 terms), with the reflection formula below 0.5 */
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
Num.lgamma = function (x) {
  if (x < 0.5) return log(PI / abs(Math.sin(PI * x))) - Num.lgamma(1 - x);
  x -= 1;
  let a = LZ[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LZ[i] / (x + i);
  return LN_SQRT_2PI + (x + 0.5) * log(t) - t + log(a);
};
/* The remainder of Stirling's series, lgamma(x) − [(x − ½)log x − x + log √(2π)],
   for x ≥ 10: the odd powers of 1/x with the Bernoulli coefficients B₂ₖ/(2k(2k−1)),
   seven terms (the next one is below 1e-17 at x = 10). */
const STIR = [1 / 12, -1 / 360, 1 / 1260, -1 / 1680, 1 / 1188, -691 / 360360, 1 / 156, -3617 / 122400];
function stirRest(x) {
  const z = 1 / (x * x);
  let s = STIR[STIR.length - 1];
  for (let k = STIR.length - 2; k >= 0; k--) s = s * z + STIR[k];
  return s / x;
}
/* log B(a, b). Summing three log-gammas of size ~a log a to get a number of
   size ~1 throws away the digits of the result when a or b is large (t with a
   thousand degrees of freedom: twelve digits); the Stirling form keeps them:
     both ≥ 10:  ½log 2π − ½log(p+q) + corr + (p − ½)log(p/(p+q)) + (q − ½)log1p(−p/(p+q))
     p < 10 ≤ q: lgamma(p) + corr + p − p·log(p+q) + (q − ½)log1p(−p/(p+q))
   with p ≤ q and corr the difference of the Stirling remainders. */
Num.lbeta = function (a, b) {
  const p = min(a, b), q = max(a, b);
  if (q < 10) return Num.lgamma(p) + Num.lgamma(q) - Num.lgamma(p + q);
  const r = p / (p + q);
  if (p >= 10) {
    const corr = stirRest(p) + stirRest(q) - stirRest(p + q);
    return LN_SQRT_2PI - 0.5 * log(p + q) + corr + (p - 0.5) * log(r) + (q - 0.5) * log1p(-r);
  }
  const corr = stirRest(q) - stirRest(p + q);
  return Num.lgamma(p) + corr + p - p * log(p + q) + (q - 0.5) * log1p(-r);
};
/* log n! exactly summed for small n, Lanczos beyond */
const LFACT = [0];
for (let i = 1; i <= 170; i++) LFACT[i] = LFACT[i - 1] + log(i);
Num.lfactorial = n => n <= 170 ? LFACT[n] : Num.lgamma(n + 1);

/* Regularized incomplete beta I_x(a, b): continued fraction (modified
   Lentz), evaluated on the side where it converges fast. */
function betacf(x, a, b) {
  const TINY = 1e-300, EPS = 1e-16;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 10000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (abs(del - 1) < EPS) break;
  }
  return h;
}
/* returns [I_x(a,b), 1 − I_x(a,b)], each computed directly (no cancellation).
   y = 1 − x may be passed when the caller knows it exactly: near x = 1,
   forming 1 − x in floating point throws away the digits that a·log x and
   the continued fraction on the other side need (t with many degrees of
   freedom, F with a large denominator). */
Num.betaInc2 = function (x, a, b, y) {
  if (y == null) y = 1 - x;
  if (x <= 0) return [0, 1];
  if (y <= 0) return [1, 0];
  const lx = x < 0.5 ? log(x) : log1p(-y), ly = y < 0.5 ? log(y) : log1p(-x);
  const lfront = a * lx + b * ly - Num.lbeta(a, b);
  if (x < (a + 1) / (a + b + 2)) {
    const v = exp(lfront) * betacf(x, a, b) / a;
    return [v, 1 - v];
  }
  const v = exp(lfront) * betacf(y, b, a) / b;
  return [1 - v, v];
};
Num.betaInc = (x, a, b) => Num.betaInc2(x, a, b)[0];

/* Regularized lower incomplete gamma P(a, x) and its complement Q(a, x). */
Num.gammaInc2 = function (a, x) {
  if (x <= 0) return [0, 1];
  const lf = a * log(x) - x - Num.lgamma(a);
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 1; n < 100000; n++) { ap += 1; del *= x / ap; sum += del; if (abs(del) < abs(sum) * 1e-16) break; }
    const p = exp(lf) * sum;
    return [p, 1 - p];
  }
  const TINY = 1e-300;
  let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 100000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (abs(d) < TINY) d = TINY;
    c = b + an / c; if (abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (abs(del - 1) < 1e-16) break;
  }
  const q = exp(lf) * h;
  return [1 - q, q];
};

/* ---------------- the normal distribution ----------------
   Φ through erfc: a Chebyshev-fitted rational approximation of erfc on three
   ranges (W. J. Cody 1969, Math. Comp. 23:631–637), accurate to ~1e-16
   relative also deep in the tails, which the tests of tiny p-values need. */
const CA = [3.16112374387056560e00, 1.13864154151050156e02, 3.77485237685302021e02, 3.20937758913846947e03, 1.85777706184603153e-1];
const CB = [2.36012909523441209e01, 2.44024637934444173e02, 1.28261652607737228e03, 2.84423683343917062e03];
const CC = [5.64188496988670089e-1, 8.88314979438837594e00, 6.61191906371416295e01, 2.98635138197400131e02,
  8.81952221241769090e02, 1.71204761263407058e03, 2.05107837782607147e03, 1.23033935479799725e03, 2.15311535474403846e-8];
const CD = [1.57449261107098347e01, 1.17693950891312499e02, 5.37181101862009858e02, 1.62138957456669019e03,
  3.29079923573345963e03, 4.36261909014324716e03, 3.43936767414372164e03, 1.23033935480374942e03];
const CP = [3.05326634961232344e-1, 3.60344899949804439e-1, 1.25781726111229246e-1, 1.60837851487422766e-2,
  6.58749161529837803e-4, 1.63153871373020978e-2];
const CQ = [2.56852019228982242e00, 1.87295284992346725e00, 5.27905102951428412e-1, 6.05183413124413191e-2, 2.33520497626869185e-3];
const SQRPI = 5.6418958354775628695e-1;
/* erfc(x) for x ≥ 0 */
function erfcPos(x) {
  if (x < 0.46875) {
    const y = x * x;
    let xn = CA[4] * y, xd = y;
    for (let i = 0; i < 3; i++) { xn = (xn + CA[i]) * y; xd = (xd + CB[i]) * y; }
    return 1 - x * (xn + CA[3]) / (xd + CB[3]);
  }
  let r;
  if (x <= 4) {
    let xn = CC[8] * x, xd = x;
    for (let i = 0; i < 7; i++) { xn = (xn + CC[i]) * x; xd = (xd + CD[i]) * x; }
    r = (xn + CC[7]) / (xd + CD[7]);
  } else {
    if (x > 27) return 0;
    const z = 1 / (x * x);
    let xn = CP[5] * z, xd = z;
    for (let i = 0; i < 4; i++) { xn = (xn + CP[i]) * z; xd = (xd + CQ[i]) * z; }
    r = z * (xn + CP[4]) / (xd + CQ[4]);
    r = (SQRPI - r) / x;
  }
  /* exp(−x²) split to keep the digits of x² */
  const xs = floor(x * 16) / 16, del = (x - xs) * (x + xs);
  return exp(-xs * xs) * exp(-del) * r;
}
Num.erfc = x => x >= 0 ? erfcPos(x) : 2 - erfcPos(-x);
/* Φ(z) and its upper tail 1 − Φ(z), each without cancellation */
Num.pnorm = function (z, upper) {
  if (z !== z) return NaN;
  const lower = z < 0 ? 0.5 * erfcPos(-z / SQRT2) : 1 - 0.5 * erfcPos(z / SQRT2);
  const up = z > 0 ? 0.5 * erfcPos(z / SQRT2) : 1 - 0.5 * erfcPos(-z / SQRT2);
  return upper ? up : lower;
};
Num.dnorm = z => exp(-0.5 * z * z - LN_SQRT_2PI);
/* Φ⁻¹(p): algorithm AS 241 (Wichura 1988, Appl. Statist. 37:477–484), PPND16,
   about 1e-16 relative. */
Num.qnorm = function (p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const q = p - 0.5;
  if (abs(q) <= 0.425) {
    const r = 0.180625 - q * q;
    return q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r +
      45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r +
      3.387132872796366608) / (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r +
      21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1);
  }
  let r = q < 0 ? p : 1 - p;
  r = sqrt(-log(r));
  let v;
  if (r <= 5) {
    r -= 1.6;
    v = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
      1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r + 4.6303378461565452959) * r +
      1.42343711074968357734) / (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r +
      0.0151986665636164571966) * r + 0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r +
      2.05319162663775882187) * r + 1);
  } else {
    r -= 5;
    v = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
      0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r +
      6.6579046435011037772) / (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r +
      1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r + 0.0148753612908506148525) * r +
      0.13692988092273580531) * r + 0.59983220655588793769) * r + 1);
  }
  return q < 0 ? -v : v;
};

/* ---------------- t, F, χ² ---------------- */
/* P(T ≤ t) or P(T > t) with ν degrees of freedom (ν may be fractional) */
Num.pt = function (t, df, upper) {
  if (t !== t || !(df > 0)) return NaN;
  if (!isFinite(t)) return (t > 0) === !upper ? 1 : 0;
  if (df === Infinity) return Num.pnorm(t, upper);
  const t2 = t * t, x = df / (df + t2), y = t2 / (df + t2);
  /* tail = P(|T| > |t|)/2, computed as ½·I_x(ν/2, ½) */
  const [ix] = Num.betaInc2(x, df / 2, 0.5, y);
  const tail = 0.5 * ix;
  const big = t > 0;
  if (upper) return big ? tail : 1 - tail;
  return big ? 1 - tail : tail;
};
/* two-sided p-value of a t statistic */
Num.pt2 = (t, df) => min(1, 2 * Num.pt(abs(t), df, true));
Num.qt = function (p, df) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (df === Infinity) return Num.qnorm(p);
  if (p === 0.5) return 0;
  const lower = p < 0.5, pp = lower ? p : 1 - p;
  /* Newton on the upper tail from the normal start, safeguarded by bisection */
  let lo = 0, hi = 1, x = -Num.qnorm(pp);
  while (Num.pt(hi, df, true) > pp) { lo = hi; hi *= 2; if (hi > 1e12) break; }
  if (!(x > lo && x < hi)) x = (lo + hi) / 2;
  for (let it = 0; it < 200; it++) {
    const f = Num.pt(x, df, true) - pp;
    if (f > 0) lo = x; else hi = x;
    const dens = exp(Num.lgamma((df + 1) / 2) - Num.lgamma(df / 2) - 0.5 * log(df * PI) - (df + 1) / 2 * log1p(x * x / df));
    let nx = x + f / dens;
    if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2;
    if (abs(nx - x) <= 1e-15 * max(1, abs(x))) { x = nx; break; }
    x = nx;
  }
  return lower ? -x : x;
};
Num.pchisq = (x, df, upper) => x <= 0 ? (upper ? 1 : 0) : Num.gammaInc2(df / 2, x / 2)[upper ? 1 : 0];
Num.pf = function (f, d1, d2, upper) {
  if (f <= 0) return upper ? 1 : 0;
  const den = d1 * f + d2;
  const [a, b] = Num.betaInc2(d1 * f / den, d1 / 2, d2 / 2, d2 / den);
  return upper ? b : a;
};

/* ---------------- Kendall's exact null distribution ----------------
   Without ties, the number of discordant pairs among n items is the number
   of inversions of a random permutation; its frequencies obey
   f_n(k) = Σ_{j=0}^{n−1} f_{n−1}(k − j). Kept as probabilities (divided by n
   at each step) so nothing overflows; cached by n. */
const KCACHE = new Map();
Num.kendallDist = function (n) {
  if (KCACHE.has(n)) return KCACHE.get(n);
  let f = new Float64Array([1]);
  for (let m = 2; m <= n; m++) {
    const out = new Float64Array(f.length + m - 1);
    let run = 0;
    for (let k = 0; k < out.length; k++) {
      if (k < f.length) run += f[k];
      if (k - m >= 0 && k - m < f.length) run -= f[k - m];
      out[k] = run / m;
    }
    f = out;
  }
  /* cumulative from below and from above, each summed from its own end so
     that a tiny tail is never 1 minus something close to 1 */
  const cdf = new Float64Array(f.length), sf = new Float64Array(f.length);
  let s = 0;
  for (let k = 0; k < f.length; k++) { s += f[k]; cdf[k] = s; }
  s = 0;
  for (let k = f.length - 1; k >= 0; k--) { s += f[k]; sf[k] = s; }
  const d = { pmf: f, cdf, sf };
  KCACHE.set(n, d);
  return d;
};
/* P(C ≤ c) where C = concordant pairs = n(n−1)/2 − inversions; by symmetry the
   distribution of C is that of the inversions */
Num.pKendallConcordant = function (c, n, upper) {
  const d = Num.kendallDist(n), top = d.pmf.length - 1;
  if (upper) { /* P(C ≥ c) */
    if (c <= 0) return 1;
    if (c > top) return 0;
    return d.sf[c];
  }
  if (c < 0) return 0;
  if (c >= top) return 1;
  return d.cdf[c];
};

/* ---------------- Spearman's exact null distribution ----------------
   S = Σd² over the n! permutations. Enumerated in full (Heap's algorithm) up
   to n = 9; S is always even, so the table is kept by S/2. */
const SCACHE = new Map();
Num.spearmanDist = function (n) {
  if (SCACHE.has(n)) return SCACHE.get(n);
  const maxS = n * (n * n - 1) / 3;
  const cnt = new Float64Array(maxS / 2 + 1);
  const a = Array.from({ length: n }, (_, i) => i), c = new Array(n).fill(0);
  const tally = () => { let s = 0; for (let k = 0; k < n; k++) { const d = a[k] - k; s += d * d; } cnt[s / 2]++; };
  tally();
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const k = i % 2 ? c[i] : 0;
      const t = a[k]; a[k] = a[i]; a[i] = t;
      tally(); c[i]++; i = 0;
    } else { c[i] = 0; i++; }
  }
  const total = exp(Num.lfactorial(n));
  const cdf = new Float64Array(cnt.length), sf = new Float64Array(cnt.length);
  let s = 0;
  for (let k = 0; k < cnt.length; k++) { s += cnt[k]; cdf[k] = s / total; }
  s = 0;
  for (let k = cnt.length - 1; k >= 0; k--) { s += cnt[k]; sf[k] = s / total; }
  const d = { count: cnt, cdf, sf, total };
  SCACHE.set(n, d);
  return d;
};
/* Upper tail P(S ≥ s) for the statistic S = Σd², without ties.
   n ≤ 9: the full enumeration. 10 ≤ n: the Edgeworth series expansion of
   algorithm AS 89 (D. J. Best and D. E. Roberts 1975, Appl. Statist. 24:377–379),
   which corrects the normal approximation of the standardized statistic with
   terms in 1/n up to the sixth moment. */
const AS89 = [0.2274, 0.2531, 0.1745, 0.0758, 0.1033, 0.3932, 0.0879, 0.0151, 0.0072, 0.0831, 0.0131, 4.6e-4];
Num.pSpearmanUpper = function (s, n) {
  const maxS = n * (n * n - 1) / 3;
  s = Math.round(s);                       /* S = (n³ − n)(1 − ρ)/6 arrives with rounding noise */
  if (s <= 0) return 1;
  if (s > maxS) return 0;
  if (n <= 9) {
    const d = Num.spearmanDist(n);
    return d.sf[Math.ceil(s / 2)];         /* first even S ≥ s */
  }
  const e = edgeworth(s, n);
  const p = e.y + Num.pnorm(e.x, true);
  return p < 0 ? 0 : p > 1 ? 1 : p;
};
/* the standardized statistic x (with the continuity half-step folded into
   s − 1) and the Edgeworth correction y, so that P(S ≥ s) = y + (1 − Φ(x))
   and P(S < s) = Φ(x) − y, each tail without subtracting from one */
function edgeworth(s, n) {
  const c = AS89, b = 1 / n;
  const x = (6 * (s - 1) * b / (n * n - 1) - 1) * sqrt(1 / b - 1);
  const y2 = x * x;
  const u = x * b * (c[0] + b * (c[1] + c[2] * b) + y2 * (-c[3] + b * (c[4] + c[5] * b) -
    y2 * b * (c[6] + c[7] * b - y2 * (c[8] - c[9] * b + y2 * b * (c[10] - c[11] * y2)))));
  return { x, y: u / exp(y2 / 2) };
}

/* P(S ≤ s), summed from below (no cancellation in the lower tail) */
Num.pSpearmanLower = function (s, n) {
  const maxS = n * (n * n - 1) / 3;
  s = Math.round(s);
  if (s < 0) return 0;
  if (s >= maxS) return 1;
  if (n <= 9) return Num.spearmanDist(n).cdf[floor(s / 2)];
  const e = edgeworth(2 * floor(s / 2) + 2, n);   /* P(S ≤ s) = P(S < s + 2) */
  const p = Num.pnorm(e.x) - e.y;
  return p < 0 ? 0 : p > 1 ? 1 : p;
};

/* ---------------- random numbers ----------------
   sfc32 (a small fast counter generator that passes the usual statistical
   batteries), seeded; a normal by Box–Muller with its spare value kept. */
Num.rng = function (seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = (seed >>> 0) ^ 0xdeadbeef;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();
  let spare = null;
  next.normal = function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = next();
    const v = next(), r = sqrt(-2 * log(u));
    spare = r * Math.sin(2 * PI * v);
    return r * Math.cos(2 * PI * v);
  };
  next.int = k => floor(next() * k);
  next.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = floor(next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  return next;
};

/* ---------------- small helpers ---------------- */
Num.clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
Num.atanh = x => 0.5 * log1p(2 * x / (1 - x));
Num.expm1 = expm1;
Num.log1p = log1p;

g.Num = Num;
return Num;
}
if (typeof window !== 'undefined') NumCore(window);
