/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 3, the engine of exploration and assumptions.

     Univariate normality: Shapiro–Wilk W with the approximations of Royston
       (1992, 1995: algorithm AS R94) and Anderson–Darling A² with Stephens'
       modification and p-value (D'Agostino and Stephens 1986); skewness and
       excess kurtosis.
     Multivariate normality: Mardia's skewness and kurtosis (1970), with the
       small-sample correction of the skewness for n < 20; Henze and Zirkler's
       (1990) statistic with its lognormal approximation.
     Shape of a pair: the F test for adding a quadratic term to the line
       (curvature), the Koenker form of the Breusch–Pagan test of constant
       spread (Breusch and Pagan 1979; Koenker 1981), and the LOWESS smoother
       of Cleveland (1979): tricube weights over the ⌊f·n⌋ nearest neighbours,
       local lines, bisquare robustness iterations with 6·median|residual|.
     Outliers and influence: classical and robust Mahalanobis distances, the
       robust ones from the orthogonalized Gnanadesikan–Kettenring estimate
       (OGK, Maronna and Zamar 2002) with τ-scales and hard-rejection
       reweighting; the jackknife of r (r without each point).

   Installs `Assume` in the global object it is given; needs Num. */
function AssumeCore(g) {
'use strict';
const Num = g.Num;
const { abs, sqrt, log, exp, floor, min, max, asin, PI } = Math;
const A = {};
const poly = (c, x) => { let s = 0; for (let i = c.length - 1; i >= 0; i--) s = s * x + c[i]; return s; };

/* ---------------- Shapiro–Wilk ---------------- */
const C1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
const C2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
const C3 = [0.544, -0.39978, 0.025054, -6.714e-4], C4 = [1.3822, -0.77857, 0.062767, -0.0020322];
const C5 = [-1.5861, -0.31082, -0.083751, 0.0038915], C6 = [-0.4803, -0.082676, 0.0030302], G = [-2.273, 0.459];
A.shapiro = function (x0) {
  const x = Float64Array.from(x0.filter(isFinite)).sort(), n = x.length;
  if (n < 3 || n > 5000) return { W: NaN, p: NaN, n, note: ['Shapiro–Wilk pide entre 3 y 5000 datos.', 'Shapiro–Wilk needs between 3 and 5,000 values.'] };
  const range = x[n - 1] - x[0];
  if (range === 0) return { W: NaN, p: NaN, n, note: ['Todos los valores son iguales.', 'All values are equal.'] };
  const nn2 = floor(n / 2), a = new Float64Array(nn2 + 1);
  if (n === 3) a[1] = Math.SQRT1_2;
  else {
    let summ2 = 0;
    for (let i = 1; i <= nn2; i++) { a[i] = Num.qnorm((i - 0.375) / (n + 0.25)); summ2 += a[i] * a[i]; }
    summ2 *= 2;
    const ssumm2 = sqrt(summ2), rsn = 1 / sqrt(n);
    const a1 = poly(C1, rsn) - a[1] / ssumm2;
    let i1, fac;
    if (n > 5) {
      i1 = 3;
      const a2 = -a[2] / ssumm2 + poly(C2, rsn);
      fac = sqrt((summ2 - 2 * a[1] * a[1] - 2 * a[2] * a[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
      a[2] = a2;
    } else { i1 = 2; fac = sqrt((summ2 - 2 * a[1] * a[1]) / (1 - 2 * a1 * a1)); }
    a[1] = a1;
    for (let i = i1; i <= nn2; i++) a[i] /= -fac;
  }
  /* W as the squared correlation of the data with the antisymmetric
     coefficients (written as 1 − W to keep the digits near 1) */
  const coef = new Float64Array(n);
  for (let i = 0; i < nn2; i++) { coef[i] = -a[i + 1]; coef[n - 1 - i] = a[i + 1]; }
  let sa = 0, sx = 0;
  for (let i = 0; i < n; i++) { sa += coef[i]; sx += x[i] / range; }
  sa /= n; sx /= n;
  let ssa = 0, ssx = 0, sax = 0;
  for (let i = 0; i < n; i++) { const u = coef[i] - sa, v = x[i] / range - sx; ssa += u * u; ssx += v * v; sax += u * v; }
  const ss = sqrt(ssa * ssx), w1 = (ss - sax) * (ss + sax) / (ssa * ssx), W = 1 - w1;
  let p;
  if (n === 3) p = max(0, 6 / PI * (asin(sqrt(W)) - PI / 3));
  else {
    let y = log(w1), m, s;
    if (n <= 11) {
      const gam = poly(G, n);
      if (y >= gam) return { W, p: 1e-99, n };
      y = -log(gam - y); m = poly(C3, n); s = exp(poly(C4, n));
    } else { const ln = log(n); m = poly(C5, ln); s = exp(poly(C6, ln)); }
    p = Num.pnorm((y - m) / s, true);
  }
  return { W, p, n };
};

/* ---------------- Anderson–Darling ---------------- */
A.anderson = function (x0) {
  const x = Float64Array.from(x0.filter(isFinite)).sort(), n = x.length;
  if (n < 8) return { A2: NaN, p: NaN, n, note: ['Anderson–Darling pide al menos 8 datos.', 'Anderson–Darling needs at least 8 values.'] };
  const m = Num.mean(x), s = Num.sd(x);
  const h = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const z1 = (x[i] - m) / s, z2 = (x[n - 1 - i] - m) / s;
    h[i] = (2 * i + 1) * (log(Num.pnorm(z1)) + log(Num.pnorm(z2, true)));
  }
  const A2 = -n - Num.sum(h) / n, AA = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  let p;
  if (AA < 0.2) p = 1 - exp(-13.436 + 101.14 * AA - 223.73 * AA * AA);
  else if (AA < 0.34) p = 1 - exp(-8.318 + 42.796 * AA - 59.938 * AA * AA);
  else if (AA < 0.6) p = exp(0.9177 - 4.279 * AA - 1.38 * AA * AA);
  else p = exp(1.2937 - 5.709 * AA + 0.0186 * AA * AA);
  return { A2, p: min(1, max(0, p)), n };
};
/* sample skewness g₁ and excess kurtosis g₂ (moments with divisor n) */
A.moments = function (x0) {
  const x = x0.filter(isFinite), n = x.length, m = Num.mean(x);
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of x) { const d = v - m; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; }
  m2 /= n; m3 /= n; m4 /= n;
  return { n, skew: m3 / Math.pow(m2, 1.5), kurt: m4 / (m2 * m2) - 3 };
};

/* ---------------- small matrices ---------------- */
A.mean = X => X[0].map((_, j) => Num.mean(X.map(r => r[j])));
A.cov = function (X, divisorN) {
  const n = X.length, p = X[0].length, m = A.mean(X), S = [];
  for (let a = 0; a < p; a++) { S.push(new Array(p).fill(0)); }
  for (const r of X) for (let a = 0; a < p; a++) { const da = r[a] - m[a]; for (let b = a; b < p; b++) S[a][b] += da * (r[b] - m[b]); }
  const d = divisorN ? n : n - 1;
  for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { S[a][b] /= d; S[b][a] = S[a][b]; }
  return S;
};
/* inverse of a symmetric positive-definite matrix (Gauss–Jordan with pivoting) */
A.inverse = function (M) {
  const p = M.length, a = M.map((r, i) => r.concat(Array.from({ length: p }, (_, j) => (i === j ? 1 : 0))));
  for (let i = 0; i < p; i++) {
    let piv = i;
    for (let r = i + 1; r < p; r++) if (abs(a[r][i]) > abs(a[piv][i])) piv = r;
    [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (abs(d) < 1e-300) return null;
    for (let j = 0; j < 2 * p; j++) a[i][j] /= d;
    for (let r = 0; r < p; r++) if (r !== i) { const f = a[r][i]; if (f) for (let j = 0; j < 2 * p; j++) a[r][j] -= f * a[i][j]; }
  }
  return a.map(r => r.slice(p));
};
/* eigen-decomposition of a symmetric matrix, cyclic Jacobi; vectors in columns, values decreasing */
A.eigen = function (M) {
  const p = M.length, a = M.map(r => r.slice()), V = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) off += a[i][j] * a[i][j];
    if (off < 1e-30) break;
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
      if (abs(a[i][j]) < 1e-300) continue;
      const th = (a[j][j] - a[i][i]) / (2 * a[i][j]), t = (th >= 0 ? 1 : -1) / (abs(th) + sqrt(th * th + 1)), c = 1 / sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < p; k++) { const x = a[k][i], y = a[k][j]; a[k][i] = c * x - s * y; a[k][j] = s * x + c * y; }
      for (let k = 0; k < p; k++) { const x = a[i][k], y = a[j][k]; a[i][k] = c * x - s * y; a[j][k] = s * x + c * y; }
      for (let k = 0; k < p; k++) { const x = V[k][i], y = V[k][j]; V[k][i] = c * x - s * y; V[k][j] = s * x + c * y; }
    }
  }
  const idx = [...Array(p).keys()].sort((u, v) => a[v][v] - a[u][u]);
  return { values: idx.map(i => a[i][i]), vectors: V.map(r => idx.map(i => r[i])) };
};
/* squared Mahalanobis distances of rows */
A.mahalanobis = function (X, center, Sinv) {
  return X.map(r => { const d = r.map((v, j) => v - center[j]); let s = 0; for (let a = 0; a < d.length; a++) for (let b = 0; b < d.length; b++) s += d[a] * Sinv[a][b] * d[b]; return s; });
};

/* ---------------- multivariate normality ---------------- */
A.mardia = function (X) {
  const n = X.length, p = X[0].length;
  const S = A.cov(X, true), Si = A.inverse(S);
  if (!Si) return null;
  const m = A.mean(X), D = X.map(r => r.map((v, j) => v - m[j]));
  let g1 = 0, g2 = 0;
  const q = D.map(d => { const o = new Array(p).fill(0); for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) o[a] += Si[a][b] * d[b]; return o; });
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let a = 0; a < p; a++) s += q[i][a] * D[j][a]; g1 += s * s * s; if (i === j) g2 += s * s; }
  g1 /= n * n; g2 /= n;
  const df = p * (p + 1) * (p + 2) / 6;
  const k = (p + 1) * (n + 1) * (n + 3) / (n * ((n + 1) * (p + 1) - 6));
  const skew = n < 20 ? n * k * g1 / 6 : n * g1 / 6;
  const kurt = (g2 - p * (p + 2)) * sqrt(n / (8 * p * (p + 2)));
  return { n, p, g1, g2, skew, df, pSkew: Num.pchisq(skew, df, true), kurt, pKurt: min(1, 2 * Num.pnorm(abs(kurt), true)), small: n < 20 };
};
A.henzeZirkler = function (X) {
  const n = X.length, p = X[0].length;
  const S = A.cov(X, true), Si = A.inverse(S);
  if (!Si) return null;
  const m = A.mean(X), D = X.map(r => r.map((v, j) => v - m[j]));
  const b = (1 / Math.SQRT2) * Math.pow((2 * p + 1) / 4, 1 / (p + 4)) * Math.pow(n, 1 / (p + 4)), b2 = b * b;
  const quad = (u, v) => { let s = 0; for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) s += u[a] * Si[a][c] * v[c]; return s; };
  const Dj = D.map(d => quad(d, d));
  let s1 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = D[i].map((v, a) => v - D[j][a]); s1 += exp(-b2 / 2 * quad(d, d)); }
  let s2 = 0;
  for (let j = 0; j < n; j++) s2 += exp(-b2 / (2 * (1 + b2)) * Dj[j]);
  const HZ = n * (s1 / (n * n) - 2 * Math.pow(1 + b2, -p / 2) * s2 / n + Math.pow(1 + 2 * b2, -p / 2));
  const wb = (1 + b2) * (1 + 3 * b2), a = 1 + 2 * b2, b4 = b2 * b2, b8 = b4 * b4;
  const mu = 1 - Math.pow(a, -p / 2) * (1 + p * b2 / a + p * (p + 2) * b4 / (2 * a * a));
  const si2 = 2 * Math.pow(1 + 4 * b2, -p / 2) + 2 * Math.pow(a, -p) * (1 + 2 * p * b4 / (a * a) + 3 * p * (p + 2) * b8 / (4 * Math.pow(a, 4))) -
    4 * Math.pow(wb, -p / 2) * (1 + 3 * p * b4 / (2 * wb) + p * (p + 2) * b8 / (2 * wb * wb));
  const pmu = log(sqrt(mu * mu * mu * mu / (si2 + mu * mu))), psi = sqrt(log((si2 + mu * mu) / (mu * mu)));
  return { n, p, HZ, b, p_value: Num.pnorm((log(HZ) - pmu) / psi, true) };
};

/* ---------------- shape of a pair ---------------- */
/* least squares of y on the columns of X (with intercept), via the normal equations on centred columns */
function ols(cols, y) {
  const n = y.length, p = cols.length, my = Num.mean(y), cm = cols.map(c => Num.mean(c));
  const Xc = cols.map((c, j) => c.map(v => v - cm[j])), yc = y.map(v => v - my);
  const M = [], r = [];
  for (let i = 0; i < p; i++) { M.push([]); for (let j = 0; j < p; j++) { let s = 0; for (let k = 0; k < n; k++) s += Xc[i][k] * Xc[j][k]; M[i].push(s); } let s = 0; for (let k = 0; k < n; k++) s += Xc[i][k] * yc[k]; r.push(s); }
  const Mi = A.inverse(M);
  if (!Mi) return null;
  const beta = Mi.map(row => row.reduce((s, v, j) => s + v * r[j], 0));
  const fit = new Float64Array(n), res = new Float64Array(n);
  let rss = 0, tss = 0;
  for (let k = 0; k < n; k++) { let f = my; for (let j = 0; j < p; j++) f += beta[j] * Xc[j][k]; fit[k] = f; res[k] = y[k] - f; rss += res[k] * res[k]; tss += yc[k] * yc[k]; }
  return { beta, intercept: my - beta.reduce((s, b, j) => s + b * cm[j], 0), fit, res, rss, tss, r2: 1 - rss / tss };
}
A.ols = ols;
/* curvature: F for adding (x − x̄)² to the straight line */
A.curvature = function (x, y) {
  const n = x.length;
  if (n < 6) return { F: NaN, p: NaN };
  const mx = Num.mean(x), u = x.map(v => v - mx);
  const f1 = ols([u], y), f2 = ols([u, u.map(v => v * v)], y);
  if (!f1 || !f2 || !(f2.rss > 0)) return { F: NaN, p: NaN };
  const F = (f1.rss - f2.rss) / (f2.rss / (n - 3));
  return { F, df1: 1, df2: n - 3, p: Num.pf(F, 1, n - 3, true) };
};
/* Breusch–Pagan, studentized (Koenker): n·R² of the squared residuals on x */
A.breuschPagan = function (x, y) {
  const f = ols([x], y);
  if (!f) return { BP: NaN, p: NaN };
  const e2 = Array.from(f.res, v => v * v), g2 = ols([x], e2);
  const BP = x.length * g2.r2;
  return { BP, df: 1, p: Num.pchisq(BP, 1, true) };
};
/* LOWESS (Cleveland 1979, with the conventions of his 1981 program): local
   lines with tricube weights over the k = ⌊f·n⌋ nearest neighbours of each
   point (ties on the right come in; distances within 0.1 % of the radius
   count as 0 or as the radius), `iter` robustness iterations with bisquare
   weights of residual/(6·median|residual|). Points closer than `delta` to
   the last fitted one are interpolated, tied x share their fit. */
A.lowess = function (x0, y0, o) {
  o = o || {};
  const f = o.f == null ? 2 / 3 : o.f, iter = o.iter == null ? 3 : o.iter;
  const ord = Num.order(x0), x = Float64Array.from(ord, i => x0[i]), y = Float64Array.from(ord, i => y0[i]), n = x.length;
  const out = { x: Array.from(x), y: Array.from(y) };
  if (n < 2) return out;
  const range = x[n - 1] - x[0], delta = o.delta == null ? 0 : o.delta;
  const k = max(2, min(n, floor(f * n + 1e-7)));
  const ys = new Float64Array(n), rw = new Float64Array(n).fill(1), w = new Float64Array(n);
  /* fitted value at x[i] from the window that starts at lo; false when all weights are 0 */
  function local(i, lo, robust) {
    const xs = x[i], h = max(xs - x[lo], x[lo + k - 1] - xs), h9 = 0.999 * h, h1 = 0.001 * h;
    let s = 0, j = lo;
    for (; j < n; j++) {
      const r = abs(x[j] - xs);
      w[j] = 0;
      if (r <= h9) {
        w[j] = r <= h1 ? 1 : Math.pow(1 - Math.pow(r / h, 3), 3);
        if (robust) w[j] *= rw[j];
        s += w[j];
      } else if (x[j] > xs) break;
    }
    const hi = j - 1;
    if (s <= 0) return null;
    for (j = lo; j <= hi; j++) w[j] /= s;
    if (h > 0) {
      let m = 0, c = 0;
      for (j = lo; j <= hi; j++) m += w[j] * x[j];
      for (j = lo; j <= hi; j++) c += w[j] * (x[j] - m) * (x[j] - m);
      if (sqrt(c) > 0.001 * range) { const bb = (xs - m) / c; for (j = lo; j <= hi; j++) w[j] *= bb * (x[j] - m) + 1; }
    }
    let fit = 0;
    for (j = lo; j <= hi; j++) fit += w[j] * y[j];
    return fit;
  }
  for (let it = 0; it <= iter; it++) {
    let lo = 0, last = -1, i = 0;
    for (;;) {
      if (lo + k < n && x[i] - x[lo] > x[lo + k] - x[i]) { lo++; continue; }
      const fit = local(i, lo, it > 0);
      ys[i] = fit == null ? y[i] : fit;
      if (last < i - 1) {
        const den = x[i] - x[last];
        for (let j = last + 1; j < i; j++) { const al = (x[j] - x[last]) / den; ys[j] = al * ys[i] + (1 - al) * ys[last]; }
      }
      last = i;
      const cut = x[last] + delta;
      for (i = last + 1; i < n; i++) {
        if (x[i] > cut) break;
        if (x[i] === x[last]) { ys[i] = ys[last]; last = i; }
      }
      i = max(last + 1, i - 1);
      if (last >= n - 1) break;
    }
    if (it === iter) break;
    const res = Array.from(y, (v, j) => abs(v - ys[j]));
    const sc = res.reduce((s, v) => s + v, 0) / n, cmad = 6 * Num.median(res);
    if (cmad < 1e-7 * sc) break;
    const c9 = 0.999 * cmad, c1 = 0.001 * cmad;
    for (let j = 0; j < n; j++) { const r = res[j]; rw[j] = r <= c1 ? 1 : r <= c9 ? (1 - (r / cmad) ** 2) ** 2 : 0; }
  }
  out.y = Array.from(ys);
  return out;
};

/* ---------------- robust scale and OGK ---------------- */
/* τ-scale of Maronna and Zamar (2002), c1 = 4.5, c2 = 3: weighted location
   with bisquare weights on (x − med)/(c1·MAD), then the mean of the clipped
   squares min(((x − μ)/MAD)², c2²), made consistent at the normal by
   dividing by E[min(Z², (c2·Φ⁻¹(¾))²)] */
const Q34 = 0.6744897501960817;
const E_TAU = (() => { const c = 3 * Q34; return (2 * Num.pnorm(c) - 1) - 2 * c * Num.dnorm(c) + 2 * c * c * Num.pnorm(c, true); })();
A.tau = function (x) {
  const med = Num.median(x), s0 = Num.mad(x, med);
  if (!(s0 > 0)) return { mu: med, sigma: 0 };
  let sw = 0, swx = 0;
  for (const v of x) { const u = (v - med) / (4.5 * s0); const w = abs(u) < 1 ? (1 - u * u) * (1 - u * u) : 0; sw += w; swx += w * v; }
  const mu = swx / sw;
  let s = 0;
  for (const v of x) { const u = (v - mu) / s0; s += min(u * u, 9); }
  return { mu, sigma: s0 * sqrt(s / x.length / E_TAU) };
};
A.ogk = function (X, nIter) {
  nIter = nIter || 2;
  const n = X.length, p = X[0].length;
  let Z = X.map(r => r.slice());
  const As = [];
  for (let it = 0; it < nIter; it++) {
    const d = [];
    for (let j = 0; j < p; j++) d.push(A.tau(Z.map(r => r[j])).sigma);
    Z = Z.map(r => r.map((v, j) => v / d[j]));
    const U = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));
    for (let i = 1; i < p; i++) for (let j = 0; j < i; j++) {
      const s1 = A.tau(Z.map(r => r[i] + r[j])).sigma, s2 = A.tau(Z.map(r => r[i] - r[j])).sigma;
      U[i][j] = U[j][i] = (s1 * s1 - s2 * s2) / 4;
    }
    const E = A.eigen(U).vectors;
    As.push(E.map((row, i) => row.map(v => v * d[i])));
    Z = Z.map(r => E[0].map((_, c) => r.reduce((s, v, k) => s + v * E[k][c], 0)));
  }
  const tz = [];
  for (let j = 0; j < p; j++) tz.push(A.tau(Z.map(r => r[j])));
  const center0 = tz.map(t => t.mu), sg = tz.map(t => t.sigma);
  const dist = Z.map(r => r.reduce((s, v, j) => s + ((v - center0[j]) / sg[j]) ** 2, 0));
  /* the raw estimate, taken back through the rotations */
  let rawCov = sg.map((s, i) => sg.map((_, j) => (i === j ? s * s : 0))), rawCenter = center0.slice();
  for (let it = nIter - 1; it >= 0; it--) {
    const M = As[it];
    const MC = M.map(row => rawCov[0].map((_, j) => row.reduce((s, v, k) => s + v * rawCov[k][j], 0)));
    rawCov = MC.map(row => M.map(r2 => row.reduce((s, v, k) => s + v * r2[k], 0)));
    rawCenter = M.map(row => row.reduce((s, v, k) => s + v * rawCenter[k], 0));
  }
  /* hard rejection: keep d ≤ median(d)·χ²_p(0.9)/χ²_p(0.5) */
  const q = (pr) => { let lo = 0, hi = 1000; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Num.pchisq(m, p) < pr) lo = m; else hi = m; } return (lo + hi) / 2; };
  const d0 = Num.median(dist) * q(0.9) / q(0.5);
  const wts = dist.map(d => (d <= d0 ? 1 : 0)), sw = wts.reduce((s, v) => s + v, 0);
  const wc = new Array(p).fill(0);
  X.forEach((r, i) => { if (wts[i]) r.forEach((v, j) => { wc[j] += v; }); });
  for (let j = 0; j < p; j++) wc[j] /= sw;
  const wcov = Array.from({ length: p }, () => new Array(p).fill(0));
  X.forEach((r, i) => { if (!wts[i]) return; for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) wcov[a][b] += (r[a] - wc[a]) * (r[b] - wc[b]); });
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) wcov[a][b] /= sw;
  return { center: wc, cov: wcov, weights: wts, rawCenter, rawCov, rawDistances: dist };
};
/* outliers of a set of columns: classical and robust squared distances with
   the χ²_p(0.975) cut-off */
A.outliers = function (X) {
  const p = X[0].length, cut = (() => { let lo = 0, hi = 1000; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Num.pchisq(m, p) < 0.975) lo = m; else hi = m; } return (lo + hi) / 2; })();
  const S = A.cov(X), Si = A.inverse(S);
  const dC = Si ? A.mahalanobis(X, A.mean(X), Si) : X.map(() => NaN);
  const og = A.ogk(X), Ri = A.inverse(og.cov);
  const dR = Ri ? A.mahalanobis(X, og.center, Ri) : X.map(() => NaN);
  return { cut, classical: dC, robust: dR, robustCenter: og.center, robustCov: og.cov, flagged: dR.map(d => d > cut), flaggedC: dC.map(d => d > cut) };
};

/* ---------------- influence ---------------- */
/* r without each point, from the running sums (O(1) per point) */
A.jackknifeR = function (x, y) {
  const n = x.length;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i]; }
  const r = (Sx, Sy, Sxx, Syy, Sxy, m) => { const cxy = Sxy - Sx * Sy / m, vx = Sxx - Sx * Sx / m, vy = Syy - Sy * Sy / m; return cxy / sqrt(vx * vy); };
  const full = r(sx, sy, sxx, syy, sxy, n);
  return { r: full, without: x.map((_, i) => r(sx - x[i], sy - y[i], sxx - x[i] * x[i], syy - y[i] * y[i], sxy - x[i] * y[i], n - 1)) };
};

/* ---------------- χ² quantiles ---------------- */
/* Wilson–Hilferty start (or, deep in the lower tail, the first term of the
   series, F ≈ (x/2)^k / Γ(k + 1)), then Newton on the cdf kept inside a
   bracket, bisecting on the log scale when a step leaves it */
A.qchisq = function (p, df) {
  if (!(p > 0)) return 0;
  if (!(p < 1)) return Infinity;
  const k = df / 2, lgk = Num.lgamma(k);
  const z = Num.qnorm(p), h = 2 / (9 * df), wh = 1 - h + z * sqrt(h);
  const series = 2 * exp((log(p) + Num.lgamma(k + 1)) / k);
  let x = wh > 0 ? df * wh * wh * wh : series, lo = 0, hi = Infinity;
  if (p < 0.01 && series < x) x = series;
  for (let it = 0; it < 200; it++) {
    /* F − p, from the upper tail when p is near 1 so that no digits are lost */
    const d = p > 0.5 ? (1 - p) - Num.pchisq(x, df, true) : Num.pchisq(x, df) - p;
    if (d > 0) hi = min(hi, x); else lo = max(lo, x);
    if (abs(d) <= 1e-15 * min(p, 1 - p)) break;
    const dens = exp((k - 1) * log(x) - x / 2 - k * Math.LN2 - lgk);
    let nx = x - d / dens;
    if (!(nx > lo && nx < hi) || !isFinite(nx)) nx = !isFinite(hi) ? 2 * x : lo > 0 ? sqrt(lo * hi) : hi / 16;
    if (abs(nx - x) <= 1e-15 * x) { x = nx; break; }
    x = nx;
  }
  return x;
};

/* ---------------- what each pair asks for ----------------
   One look at a pair: the two correlations, curvature, spread, normality of
   each margin, robust bivariate outliers, the most influential point, ties
   and, up to n = 2000, the distance correlation; then the verdict: which
   coefficient describes this pair best and why. Needs Coef. */
A.pairCheck = function (x, y, o) {
  o = o || {};
  const n = x.length, C = g.Coef, out = { n };
  if (n < 5) { out.few = true; return out; }
  out.r = C.pearson(x, y).est; out.rho = C.spearman(x, y).est;
  out.pr = C.pearson(x, y).p;
  out.curv = A.curvature(x, y); out.bp = A.breuschPagan(x, y);
  out.swx = n <= 5000 ? A.shapiro(x) : { p: NaN }; out.swy = n <= 5000 ? A.shapiro(y) : { p: NaN };
  const X = x.map((v, i) => [v, y[i]]);
  try { out.out = A.outliers(X); out.nOut = out.out.flagged.filter(Boolean).length; } catch (e) { out.out = null; out.nOut = 0; }
  const J = A.jackknifeR(x, y);
  out.delta = J.without.map(v => v - J.r);
  let mi = 0;
  out.delta.forEach((d, i) => { if (abs(d) > abs(out.delta[mi])) mi = i; });
  out.maxDelta = out.delta[mi]; out.maxAt = mi;
  /* a point is influential when, alone, it moves r by more than about one standard error of r */
  out.inflLimit = max(0.02, (1 - out.r * out.r) / sqrt(n - 1));
  out.ties = max(1 - new Set(x).size / n, 1 - new Set(y).size / n);
  out.distinct = min(new Set(x).size, new Set(y).size);
  out.dcor = n <= 2000 ? C.dcor(x, y).est : NaN;
  /* with groups: r inside each one (Simpson's paradox shows as a change of sign or size) */
  if (o.groups) {
    const K = max(...o.groups) + 1;
    out.byGroup = [];
    for (let k = 0; k < K; k++) {
      const gx = [], gy = [];
      o.groups.forEach((gk, i) => { if (gk === k) { gx.push(x[i]); gy.push(y[i]); } });
      out.byGroup.push(gx.length >= 5 ? C.pearson(gx, gy).est : NaN);
    }
    const ok = out.byGroup.filter(isFinite), mw = ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : NaN;
    /* a reversal of sign is Simpson's paradox proper; a large change of size, the groups inflating or hiding r */
    out.simpson = ok.length >= 2 && ok.filter(v => Math.sign(v) !== Math.sign(out.r) && abs(v) >= 0.3).length * 2 >= ok.length;
    out.groupEffect = ok.length >= 2 && !out.simpson && abs(mw - out.r) >= 0.3;
    out.meanWithin = mw;
  }
  out.verdict = A.verdict(out, o);
  return out;
};
const fr = v => (g.Fmt ? g.Fmt.bounded(v, 2) : v.toFixed(2)), f3 = v => (g.Fmt ? g.Fmt.num(v, 3) : v.toFixed(3));
A.verdict = function (c, o) {
  o = o || {};
  const few = c.distinct <= 10;
  const notes = [], flags = [];
  const curved = c.curv.p < 0.01, gap = abs(c.r - c.rho);
  const nonmono = isFinite(c.dcor) && c.dcor > abs(c.rho) + 0.25;
  const infl = abs(c.maxDelta) > c.inflLimit && c.nOut > 0;
  const hetero = c.bp.p < 0.01;
  const nonnorm = (c.swx.p < 0.05) || (c.swy.p < 0.05);
  if (curved) flags.push('curv');
  if (hetero) flags.push('hetero');
  if (nonnorm) flags.push('nonnorm');
  if (infl) flags.push('infl');
  if (few) flags.push('ties');
  if (nonmono) flags.push('nonmono');
  if (c.simpson) flags.push('simpson');
  if (c.groupEffect) flags.push('groups');
  let id, es, en, why;
  if (c.simpson || c.groupEffect) {
    id = 'groups'; es = 'Por grupos'; en = 'By group';
    why = c.simpson
      ? [`Dentro de los grupos la relación tiene el signo contrario (r media en los grupos ${fr(c.meanWithin)} frente a ${fr(c.r)} juntando todo): la paradoja de Simpson. Analiza dentro de los grupos (Bloque 10).`, `Within the groups the relation has the opposite sign (mean r in the groups ${fr(c.meanWithin)} against ${fr(c.r)} pooling everything): Simpson’s paradox. Analyse within the groups (Block 10).`]
      : [`Juntar los grupos ${abs(c.r) > abs(c.meanWithin) ? 'infla' : 'esconde'} la relación (r media en los grupos ${fr(c.meanWithin)} frente a ${fr(c.r)} juntando todo): buena parte de r viene de las diferencias entre grupos. Analiza dentro de los grupos (Bloque 10).`, `Pooling the groups ${abs(c.r) > abs(c.meanWithin) ? 'inflates' : 'hides'} the relation (mean r in the groups ${fr(c.meanWithin)} against ${fr(c.r)} pooling everything): much of r comes from the differences between groups. Analyse within the groups (Block 10).`];
  } else if (nonmono) {
    id = 'dcor'; es = 'dCor o ξ'; en = 'dCor or ξ';
    why = ['La nube sube y baja: la dependencia no es monótona y r y ρ pueden no verla. La correlación de distancias sí (Bloque 6).', 'The cloud rises and falls: the dependence is not monotonic and r and ρ may miss it. The distance correlation does not (Block 6).'];
  } else if (o.ordinal) {
    id = few ? 'kendallB' : 'spearman'; es = few ? 'τ-b de Kendall' : 'ρ de Spearman'; en = few ? 'Kendall’s τ-b' : 'Spearman’s ρ';
    why = ['Al menos una es ordinal: cuenta el orden, no la distancia entre niveles.', 'At least one is ordinal: the order counts, not the distance between levels.'];
  } else if (curved || gap >= 0.1) {
    id = few ? 'kendallB' : 'spearman'; es = few ? 'τ-b de Kendall' : 'ρ de Spearman'; en = few ? 'Kendall’s τ-b' : 'Spearman’s ρ';
    why = [curved ? 'La relación se curva pero conserva el sentido: una correlación de rangos la mide sin suponer una recta.' : 'r y ρ difieren en más de 0.1: la forma o unos pocos puntos pesan en r.', curved ? 'The relation curves but keeps its direction: a rank correlation measures it without assuming a line.' : 'r and ρ differ by more than 0.1: the shape or a few points weigh on r.'];
  } else if (infl) {
    id = 'pbend'; es = 'Flexión porcentual'; en = 'Percentage bend';
    const row = (o.rows ? o.rows[c.maxAt] : c.maxAt) + 1;
    why = [`Un solo punto (fila ${row}) mueve r en ${f3(abs(c.maxDelta))}: una correlación robusta no deja que decida.`, `A single point (row ${row}) moves r by ${f3(abs(c.maxDelta))}: a robust correlation does not let it decide.`];
  } else {
    id = 'pearson'; es = 'r de Pearson'; en = 'Pearson’s r';
    why = ['Nube recta, sin puntos que decidan solos: r describe bien la relación.', 'A straight cloud with no point deciding on its own: r describes the relation well.'];
  }
  if (id === 'pearson' && (nonnorm || hetero)) notes.push([`Para el valor p y el intervalo, ${hetero ? 'la dispersión cambia a lo largo de x' : 'alguna de las dos no es normal'}: usa la permutación o el bootstrap del Bloque 4.`, `For the p-value and the interval, ${hetero ? 'the spread changes along x' : 'one of the two is not normal'}: use the permutation or the bootstrap of Block 4.`]);
  if (id === 'kendallB' && !o.ordinal) notes.push(['Una de las dos toma muy pocos valores distintos: entre las de rangos, τ-b es la que trata los empates de forma explícita.', 'One of the two takes very few distinct values: among the rank correlations, τ-b is the one that handles ties explicitly.']);
  if (id !== 'pearson' && c.nOut > 0 && !infl) notes.push([`${c.nOut} punto(s) fuera de la elipse robusta, sin mover mucho a r.`, `${c.nOut} point(s) outside the robust ellipse, without moving r much.`]);
  const level = id === 'pearson' && !notes.length ? 'ok' : id === 'pearson' ? 'note' : 'alt';
  return { id, es, en, why, notes, flags, level };
};

g.Assume = A;
return A;
}
if (typeof window !== 'undefined') AssumeCore(window);
