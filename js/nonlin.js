/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 6, the engine of nonlinear dependence and copulas.

     HSIC (Gretton et al. 2005) with Gaussian kernels whose bandwidth is the
       median heuristic √(½·median‖xᵢ − xⱼ‖²); its V-statistic, the gamma
       approximation of its null distribution (Gretton et al. 2008, with the
       moment estimates of Pfister et al. 2018) and a permutation test.
     MIC (Reshef et al. 2011): the characteristic matrix of the best grids
       with x·y < B = n^0.6 cells, computed by the approximation of the
       authors' supplement: an equipartition of one axis, "clumps" of the other
       merged into at most c·x superclumps (c = 15), and the dynamic program
       over column boundaries; both orientations.
     Mutual information by the k-nearest-neighbour estimator of Kraskov,
       Stögbauer and Grassberger (2004, their first algorithm) on the two
       standardized variables, in nats, and
       its "information coefficient of correlation" √(1 − e^{−2I}) (Linfoot 1957).
     Maximal correlation of Gebelein and Rényi on a table of quantile classes:
       the second singular value of D_r^{−½} P D_c^{−½}.
     Copulas: pseudo-observations, the inversion of Kendall's τ for the
       Gaussian, Student, Clayton, Gumbel and Frank families, maximum
       pseudo-likelihood (Genest, Ghoudi and Rivest 1995), AIC, their tail
       dependence (Joe 1997) and the empirical one, and samples to draw.

   Installs `NL` in the global object it is given; needs Num and Coef. */
function NonlinCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, exp, min, max, floor, PI } = Math;
const NL = {};

/* ---------------- special functions ---------------- */
NL.digamma = function (x) {
  let r = 0;
  while (x < 12) { r -= 1 / x; x += 1; }
  const f = 1 / (x * x);
  return r + log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132))));
};
/* Debye function D₁(θ) = (1/θ)∫₀^θ t/(eᵗ − 1) dt, for Frank's τ */
NL.debye1 = function (th) {
  if (th === 0) return 1;
  const a = abs(th), n = 400;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const t = a * i / n, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    s += w * (t === 0 ? 1 : t / Math.expm1(t));
  }
  const d = s * (a / n) / 3 / a;
  return th > 0 ? d : d + a / 2;
};

/* ---------------- HSIC ---------------- */
/* the median heuristic: σ = √(½·m), m the upper median of the squared distances
   between distinct points (with an even count, the larger of the two middle
   values, not their average: the convention of the usual implementation) */
function medianBandwidth(x) {
  const n = x.length, d = new Float64Array(n * (n - 1) / 2);
  let k = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const t = x[i] - x[j]; d[k++] = t * t; }
  d.sort();
  const b = sqrt(0.5 * d[Math.floor(d.length / 2)]);
  return b > 0 ? b : 0.001;
}
function gram(x, bw) {
  const n = x.length, K = new Float64Array(n * n), c = 1 / (2 * bw * bw);
  for (let i = 0; i < n; i++) { K[i * n + i] = 1; for (let j = i + 1; j < n; j++) { const t = x[i] - x[j], v = exp(-t * t * c); K[i * n + j] = K[j * n + i] = v; } }
  return K;
}
function hsicOf(K, L, n) {
  let sKL = 0, sK = 0, sL = 0, sR = 0;
  for (let i = 0; i < n; i++) {
    let rk = 0, rl = 0;
    for (let j = 0; j < n; j++) { const a = K[i * n + j], b = L[i * n + j]; sKL += a * b; rk += a; rl += b; }
    sK += rk; sL += rl; sR += rk * rl;
  }
  return sKL / (n * n) + sK * sL / (n * n * n * n) - 2 * sR / (n * n * n);
}
/* o: {test: 'gamma' | 'permutation', B, seed} */
NL.hsic = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const bx = medianBandwidth(x), by = medianBandwidth(y), K = gram(x, bx), L = gram(y, by);
  const h = hsicOf(K, L, n);
  const out = { id: 'hsic', est: h, n, bandwidth: [bx, by], conv: [] };
  /* gamma approximation */
  const mom = M => { let s = 0, s2 = 0, sr = 0; for (let i = 0; i < n; i++) { let r = 0; for (let j = 0; j < n; j++) { const v = M[i * n + j]; s += v; s2 += v * v; r += v; } sr += r * r; } return { a: s / (n * n), b: s2 / (n * n), c: sr / (n * n * n) }; };
  const A = mom(K), Bm = mom(L);
  const ex = (1 - A.a) * (1 - Bm.a) / n;
  const terms = A.b * Bm.b + (A.a * Bm.a) ** 2 + 2 * A.c * Bm.c + (A.b * Bm.a * Bm.a + Bm.b * A.a * A.a) - 2 * (A.b * Bm.c + Bm.b * A.c) - 2 * (A.c * Bm.a * Bm.a + Bm.c * A.a * A.a) + 2 * A.c * Bm.c;
  const varE = 2 * (n - 4) * (n - 5) / (n * (n - 1) * (n - 2) * (n - 3)) * terms;
  const shape = ex * ex / varE, scale = n * varE / ex;
  out.gamma = { shape, scale, stat: n * h };
  out.p = Num.gammaInc2(shape, n * h / scale)[1];
  out.conv.push(['Núcleos gaussianos con el ancho de la mediana; valor p por la aproximación gamma de la distribución nula.', 'Gaussian kernels with the median bandwidth; p-value by the gamma approximation of the null distribution.']);
  if (o.test === 'permutation') {
    const B = o.B || 999, rnd = Num.rng(o.seed || 1), idx = Array.from({ length: n }, (_, i) => i), Lp = new Float64Array(n * n);
    let ge = 0;
    for (let b = 0; b < B; b++) {
      rnd.shuffle(idx);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Lp[i * n + j] = L[idx[i] * n + idx[j]];
      if (hsicOf(K, Lp, n) >= h) ge++;
    }
    out.pPerm = (ge + 1) / (B + 1);
    out.conv.push([`Permutación: ${B} barajas.`, `Permutation: ${B} shuffles.`]);
  }
  return out;
};

/* ---------------- MIC ---------------- */
/* rows of an equipartition of the points (in increasing order of v) into
   at most `rows` groups, keeping ties together */
function equipartition(order, v, rows) {
  const n = order.length, Q = new Int32Array(n);
  let i = 0, cur = 0, size = 0, desired = n / rows;
  while (i < n) {
    let s = 1;
    while (i + s < n && v[order[i + s]] === v[order[i]]) s++;
    if (size !== 0 && abs(size + s - desired) >= abs(size - desired)) { cur++; size = 0; desired = (n - i) / (rows - cur); }
    for (let j = i; j < i + s; j++) Q[order[j]] = cur;
    size += s; i += s;
  }
  return { Q, rows: cur + 1 };
}
/* the best mutual information with at most 2..xMax columns, for a fixed
   row partition Q of the points ordered by x, cutting only between
   superclumps */
function optimizeX(ordX, xs, Q, nrows, xMax, khat) {
  const n = ordX.length;
  /* clumps: runs in x order with the same row; tied x with different rows form one clump */
  const lab = new Int32Array(n);
  for (let i = 0; i < n; i++) lab[i] = Q[ordX[i]];
  let fresh = -1;
  for (let i = 0; i < n;) {
    let s = 1, flag = false;
    while (i + s < n && xs[ordX[i + s]] === xs[ordX[i]]) { if (lab[i + s] !== lab[i]) flag = true; s++; }
    if (s > 1 && flag) { for (let j = i; j < i + s; j++) lab[j] = fresh; fresh--; }
    i += s;
  }
  const clump = new Int32Array(n);
  let k = 0;
  for (let i = 1; i < n; i++) { if (lab[i] !== lab[i - 1]) k++; clump[i] = k; }
  k++;
  /* superclumps: equipartition of the points by their clump index */
  let groupOf = clump;
  if (k > khat) {
    const ord = Array.from({ length: n }, (_, i) => i), cv = Array.from(clump);
    const ep = equipartition(ord, cv, khat);
    groupOf = ep.Q; k = ep.rows;
  }
  /* boundaries c₀ < c₁ < … < c_k (counts) and, per group, the row counts */
  const c = [0], counts = [];
  let cur = new Int32Array(nrows);
  for (let i = 0; i < n; i++) {
    if (i > 0 && groupOf[i] !== groupOf[i - 1]) { c.push(i); counts.push(cur); cur = new Int32Array(nrows); }
    cur[Q[ordX[i]]]++;
  }
  c.push(n); counts.push(cur);
  const K = counts.length;
  /* cumulative row counts at each boundary */
  const cum = [new Int32Array(nrows)];
  for (let t = 0; t < K; t++) { const a = Int32Array.from(cum[t]); for (let r = 0; r < nrows; r++) a[r] += counts[t][r]; cum.push(a); }
  /* W(s, t) = (c_t − c_s)·H(rows of the points in (c_s, c_t]) */
  const Wcol = (s, t) => {
    const m = c[t] - c[s];
    if (m <= 0) return 0;
    let h = 0;
    for (let r = 0; r < nrows; r++) { const q = cum[t][r] - cum[s][r]; if (q > 0) h -= q * log(q / m); }
    return h;
  };
  const HQ = (() => { let h = 0; for (let r = 0; r < nrows; r++) { const q = cum[K][r]; if (q > 0) h -= q / n * log(q / n); } return h; })();
  /* dynamic program on "at most ℓ columns": W[ℓ][t] = min Σ n_col·H_col over the first c_t points */
  const I = [];
  let prev = new Float64Array(K + 1);
  for (let t = 1; t <= K; t++) prev[t] = Wcol(0, t);
  for (let l = 2; l <= xMax; l++) {
    const nw = new Float64Array(K + 1);
    for (let t = 1; t <= K; t++) {
      let best = prev[t];
      for (let s = max(1, l - 1); s < t; s++) { const v = prev[s] + Wcol(s, t); if (v < best) best = v; }
      nw[t] = best;
    }
    I.push(HQ - nw[K] / n);
    prev = nw;
  }
  return I;   /* I[ℓ − 2] for ℓ = 2..xMax */
}
/* o: {alpha (0.6), c (15)} → {MIC, M (characteristic matrix), B} */
NL.mic = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alpha = o.alpha || 0.6, cc = o.c || 15;
  const B = max(Math.pow(n, alpha), 4);
  const ordX = Num.order(x), ordY = Num.order(y);
  const M = {};
  let best = 0, at = null;
  const side = (ordA, a, ordB, b, swap) => {
    for (let rows = 2; rows <= floor(B / 2); rows++) {
      const xMax = floor(B / rows);
      if (xMax < 2) continue;
      const ep = equipartition(ordB, b, rows);
      const khat = max(1, floor(cc * xMax));
      const I = optimizeX(ordA, a, ep.Q, ep.rows, xMax, khat);
      I.forEach((v, li) => {
        const cols = li + 2, key = swap ? rows + ',' + cols : cols + ',' + rows;
        const score = v / log(min(cols, rows));
        if (!(M[key] >= score)) M[key] = score;
        if (score > best) { best = score; at = swap ? [rows, cols] : [cols, rows]; }
      });
    }
  };
  side(ordX, x, ordY, y, false);
  side(ordY, y, ordX, x, true);
  return { id: 'mic', est: Math.min(1, best), n, B, M, at, conv: [['MIC aproximado de Reshef et al. (2011): B = n^0.6, c = 15.', 'Approximate MIC of Reshef et al. (2011): B = n^0.6, c = 15.']] };
};

/* ---------------- mutual information (Kraskov et al. 2004) ---------------- */
NL.mutualInfo = function (x0, y0, o) {
  o = o || {};
  const [x1, y1] = Coef.complete(x0, y0), n = x1.length, k = o.k || 5;
  /* the neighbourhoods are squares in the max norm, so the two variables go in standard units: in their
     own units the one with the larger spread would decide every neighbour alone */
  const z = v => { const m = Num.mean(v), s = Num.sd(v); return Array.from(v, t => (t - m) / s); };
  const sx = Num.sd(x1), sy = Num.sd(y1);
  if (!(sx > 0) || !(sy > 0) || n <= k) return { id: 'mi', est: NaN, n, k, linfoot: NaN, conv: [] };
  const x = z(x1), y = z(y1);
  let acc = 0;
  const nx = new Int32Array(n), ny = new Int32Array(n);
  const ox = Num.order(x), rankX = new Int32Array(n);
  ox.forEach((i, r) => { rankX[i] = r; });
  for (let i = 0; i < n; i++) {
    /* distance to the k-th neighbour in the max norm (brute force; n is moderate) */
    const d = [];
    for (let j = 0; j < n; j++) if (j !== i) d.push(max(abs(x[i] - x[j]), abs(y[i] - y[j])));
    d.sort((a, b) => a - b);
    const eps = d[k - 1];
    let cx = 0, cy = 0;
    for (let j = 0; j < n; j++) if (j !== i) { if (abs(x[i] - x[j]) < eps) cx++; if (abs(y[i] - y[j]) < eps) cy++; }
    nx[i] = cx; ny[i] = cy;
    acc += NL.digamma(cx + 1) + NL.digamma(cy + 1);
  }
  const I = NL.digamma(k) + NL.digamma(n) - acc / n;
  return { id: 'mi', est: I, n, k, linfoot: sqrt(1 - exp(-2 * max(0, I))), conv: [[`Estimador de Kraskov, Stögbauer y Grassberger con k = ${k} vecinos sobre las dos variables estandarizadas, en nats.`, `Kraskov–Stögbauer–Grassberger estimator with k = ${k} neighbours on the two standardized variables, in nats.`]] };
};

/* ---------------- maximal correlation on quantile classes ---------------- */
function classes(v, k) {
  const n = v.length, ord = Num.order(v), out = new Int32Array(n);
  /* equal-count classes, ties kept together */
  const ep = equipartition(ord, v, k);
  for (let i = 0; i < n; i++) out[i] = ep.Q[i];
  return { codes: out, k: ep.rows };
}
NL.svd2 = function (A, r, c) {
  /* the singular values of a small r × c matrix from the eigenvalues of AᵀA (Jacobi) */
  const AtA = [];
  for (let i = 0; i < c; i++) { AtA.push(new Array(c).fill(0)); for (let j = 0; j < c; j++) { let s = 0; for (let k = 0; k < r; k++) s += A[k][i] * A[k][j]; AtA[i][j] = s; } }
  return g.Mat ? g.Mat.eigen(AtA).values.map(v => sqrt(max(0, v))) : g.Assume.eigen(AtA).values.map(v => sqrt(max(0, v)));
};
NL.maximal = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const kk = o.k || max(3, min(10, floor(Math.cbrt(n))));
  const cx = classes(x, kk), cy = classes(y, kk);
  const P = Array.from({ length: cx.k }, () => new Array(cy.k).fill(0));
  for (let i = 0; i < n; i++) P[cx.codes[i]][cy.codes[i]] += 1 / n;
  const rs = P.map(r => r.reduce((s, v) => s + v, 0)), cs = P[0].map((_, j) => P.reduce((s, r) => s + r[j], 0));
  const A = P.map((r, i) => r.map((v, j) => v / sqrt(rs[i] * cs[j])));
  const sv = NL.svd2(A, cx.k, cy.k);
  return { id: 'maximal', est: sv[1] == null ? NaN : Math.min(1, sv[1]), n, classes: [cx.k, cy.k], table: P, conv: [[`Correlación máxima de Gebelein–Rényi sobre ${cx.k} × ${cy.k} clases de cuantiles: el segundo valor singular de la tabla normalizada.`, `Gebelein–Rényi maximal correlation on ${cx.k} × ${cy.k} quantile classes: the second singular value of the normalized table.`]] };
};

/* ---------------- copulas ---------------- */
NL.pseudo = function (x0, y0) {
  const [x, y] = Coef.complete(x0, y0), n = x.length, rx = Num.rank(x), ry = Num.rank(y);
  return { u: Array.from(rx, v => v / (n + 1)), v: Array.from(ry, v => v / (n + 1)), n };
};
const qn = p => Num.qnorm(p);
/* log-densities on (0, 1)² */
NL.COPULAS = {
  gaussian: {
    es: 'Gaussiana', en: 'Gaussian', range: [-0.999, 0.999],
    fromTau: t => Math.sin(PI * t / 2),
    tau: r => 2 / PI * Math.asin(r),
    logd: (u, v, r) => { const a = qn(u), b = qn(v), q = 1 - r * r; return -0.5 * log(q) - (r * r * (a * a + b * b) - 2 * r * a * b) / (2 * q); },
    lower: () => 0, upper: () => 0,
  },
  clayton: {
    es: 'Clayton', en: 'Clayton', range: [1e-4, 60],
    fromTau: t => 2 * t / (1 - t),
    tau: th => th / (th + 2),
    logd: (u, v, th) => log(1 + th) - (1 + th) * (log(u) + log(v)) - (2 + 1 / th) * log(Math.pow(u, -th) + Math.pow(v, -th) - 1),
    lower: th => Math.pow(2, -1 / th), upper: () => 0,
  },
  gumbel: {
    es: 'Gumbel', en: 'Gumbel', range: [1, 60],
    fromTau: t => 1 / (1 - t),
    tau: th => 1 - 1 / th,
    logd: (u, v, th) => {
      const a = -log(u), b = -log(v), A = Math.pow(a, th) + Math.pow(b, th), Aw = Math.pow(A, 1 / th);
      return -Aw + (th - 1) * (log(a) + log(b)) - log(u) - log(v) + (1 / th - 2) * log(A) + log(Aw + th - 1);
    },
    lower: () => 0, upper: th => 2 - Math.pow(2, 1 / th),
  },
  frank: {
    es: 'Frank', en: 'Frank', range: [-60, 60],
    fromTau: t => { if (abs(t) < 1e-10) return 0; let lo = t > 0 ? 1e-6 : -100, hi = t > 0 ? 100 : -1e-6; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (NL.COPULAS.frank.tau(m) < t) lo = m; else hi = m; } return (lo + hi) / 2; },
    tau: th => (abs(th) < 1e-10 ? 0 : 1 - 4 / th * (1 - NL.debye1(th))),
    /* c = θ(1 − e^{−θ}) e^{−θ(u+v)} / (e^{−θu} + e^{−θv} − e^{−θ} − e^{−θ(u+v)})², written so that
       nothing cancels: for θ < 0 the radial symmetry c₋θ(u, v) = c_θ(u, 1 − v); the denominator
       is factored by its largest term e^{−θ·min(u, v)} */
    logd: (u, v, th) => {
      if (abs(th) < 1e-10) return 0;
      if (th < 0) { th = -th; v = 1 - v; }
      const m = min(u, v), M2 = max(u, v);
      const br = -Math.expm1(-th * (1 - m)) - exp(-th * (M2 - m)) * Math.expm1(-th * m);   /* = 1 + e^{−θ(M−m)} − e^{−θ(1−m)} − e^{−θM}, two positive terms */
      return log(th) + log(-Math.expm1(-th)) - th * (u + v) - 2 * (-th * m + log(br));
    },
    lower: () => 0, upper: () => 0,
  },
};
/* Brent-free golden section on a bracket for one parameter */
function maximize1(f, lo, hi, grid, iters) {
  const gr = (sqrt(5) - 1) / 2, G = grid || 60;
  /* a coarse grid first, so a narrow optimum is not missed */
  let bx = lo, bf = -Infinity;
  for (let i = 0; i <= G; i++) { const xx = lo + (hi - lo) * i / G, v = f(xx); if (v > bf) { bf = v; bx = xx; } }
  let a = max(lo, bx - (hi - lo) / G), b = min(hi, bx + (hi - lo) / G);
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < (iters || 120); i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = f(d); }
    if (abs(b - a) < 1e-10 * (1 + abs(a))) break;
  }
  const xm = (a + b) / 2;
  return { x: xm, f: f(xm) };
}
NL.loglik = function (fam, u, v, th) { const F = NL.COPULAS[fam]; let s = 0; for (let i = 0; i < u.length; i++) s += F.logd(u[i], v[i], th); return s; };
/* Student t copula: ρ and ν, log-density from the bivariate t */
NL.tLogd = function (u, v, r, nu) {
  const a = Num.qt(u, nu), b = Num.qt(v, nu);
  return tLogdQ(a, b, r, nu);
};
/* the same from the t quantiles a, b (computed once per ν) */
function tLogdQ(a, b, r, nu) {
  const q = 1 - r * r, lg = Num.lgamma;
  const c = lg((nu + 2) / 2) + lg(nu / 2) - 2 * lg((nu + 1) / 2) - 0.5 * log(q);
  return c - (nu + 2) / 2 * log(1 + (a * a + b * b - 2 * r * a * b) / (nu * q)) + (nu + 1) / 2 * (log(1 + a * a / nu) + log(1 + b * b / nu));
}
NL.tTail = (r, nu) => 2 * Num.pt(-sqrt((nu + 1) * (1 - r) / (1 + r)), nu + 1);
/* fit every family: inversion of τ and maximum pseudo-likelihood */
NL.fitCopulas = function (x0, y0, o) {
  o = o || {};
  const { u, v, n } = NL.pseudo(x0, y0);
  const tau = Coef.kendall(u, v).est;
  const out = { n, tau, fits: [] };
  for (const [id, F] of Object.entries(NL.COPULAS)) {
    if ((id === 'clayton' || id === 'gumbel') && tau <= 0.001) { out.fits.push({ id, es: F.es, en: F.en, skip: true }); continue; }
    const itau = F.fromTau(tau);
    const m = maximize1(th => NL.loglik(id, u, v, th), F.range[0], F.range[1]);
    out.fits.push({ id, es: F.es, en: F.en, itau, theta: m.x, ll: m.f, aic: -2 * m.f + 2, lower: F.lower(m.x), upper: F.upper(m.x), tauFit: F.tau(m.x) });
  }
  /* Student: the profile likelihood of ν (on the log scale, 1.2 to 10 000), ρ by golden section for each ν;
     the t quantiles are computed once per ν */
  const prof = nu => {
    const a = u.map(w => Num.qt(w, nu)), b = v.map(w => Num.qt(w, nu));
    return maximize1(r => { let t = 0; for (let i = 0; i < n; i++) t += tLogdQ(a[i], b[i], r, nu); return t; }, -0.995, 0.995, 40, 120);
  };
  const mn = maximize1(lnu => prof(Math.exp(lnu)).f, Math.log(1.2), Math.log(1e4), 30, 80);
  const pr = prof(Math.exp(mn.x));
  mn.x = Math.exp(mn.x);
  out.fits.push({ id: 't', es: 't de Student', en: 'Student t', itau: Math.sin(PI * tau / 2), theta: pr.x, nu: mn.x, ll: pr.f, aic: -2 * pr.f + 4, lower: NL.tTail(pr.x, mn.x), upper: NL.tTail(pr.x, mn.x), tauFit: 2 / PI * Math.asin(pr.x) });
  const ok = out.fits.filter(f => !f.skip);
  out.best = ok.reduce((a, b) => (b.aic < a.aic ? b : a), ok[0]);
  /* empirical tail dependence at the upper and lower 10 % (counts of joint exceedances) */
  const q = o.q || 0.9;
  let up = 0, lowc = 0, nu0 = 0, nl0 = 0;
  for (let i = 0; i < n; i++) { if (u[i] > q) { nu0++; if (v[i] > q) up++; } if (u[i] <= 1 - q) { nl0++; if (v[i] <= 1 - q) lowc++; } }
  out.empirical = { upper: nu0 ? up / nu0 : NaN, lower: nl0 ? lowc / nl0 : NaN, q };
  out.u = u; out.v = v;
  return out;
};
/* samples from a fitted copula (for the figure): conditional inversion */
NL.sample = function (fit, m, seed) {
  const rnd = Num.rng(seed || 7), u = [], v = [];
  for (let i = 0; i < m; i++) {
    const a = rnd(), w = rnd();
    let b;
    if (fit.id === 'gaussian' || fit.id === 't') {
      const r = fit.theta;
      if (fit.id === 'gaussian') { const z1 = qn(a), z2 = r * z1 + sqrt(1 - r * r) * qn(w); b = Num.pnorm(z2); }
      else { const nu = fit.nu, t1 = Num.qt(a, nu), s = sqrt((nu + t1 * t1) * (1 - r * r) / (nu + 1)), t2 = r * t1 + s * Num.qt(w, nu + 1); b = Num.pt(t2, nu); }
    } else if (fit.id === 'clayton') { const th = fit.theta; b = Math.pow(Math.pow(a, -th) * (Math.pow(w, -th / (1 + th)) - 1) + 1, -1 / th); }
    else if (fit.id === 'frank') { const th = fit.theta; b = abs(th) < 1e-8 ? w : -1 / th * log(1 + w * Math.expm1(-th) / (w + (1 - w) * exp(-th * a))); }
    else {
      /* Gumbel: solve ∂C/∂u (a, b) = w for b by bisection */
      const th = fit.theta, la = -log(a);
      const h = bb => { const lb = -log(bb), A = Math.pow(la, th) + Math.pow(lb, th); return exp(-Math.pow(A, 1 / th)) * Math.pow(A, 1 / th - 1) * Math.pow(la, th - 1) / a; };
      let lo = 1e-12, hi = 1 - 1e-12;
      for (let it = 0; it < 60; it++) { const mm = (lo + hi) / 2; if (h(mm) < w) lo = mm; else hi = mm; }
      b = (lo + hi) / 2;
    }
    u.push(a); v.push(b);
  }
  return { u, v };
};

/* ---------------- the sweep of a matrix ---------------- */
/* for every pair: r, ρ, dCor, ξ (the larger direction), MIC when asked;
   the pairs Pearson misses rank first (dCor − |r|) */
NL.sweep = function (cols, names, o) {
  o = o || {};
  const p = cols.length, out = [];
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    const [x, y] = Coef.complete(cols[i], cols[j]);
    if (x.length < 8) continue;
    const r = Coef.pearson(x, y).est, rho = Coef.spearman(x, y, { exact: false }).est;
    const dc = x.length <= 3000 ? Coef.dcor(x, y).est : NaN;
    const xi = max(Coef.xi(x, y).est, Coef.xi(y, x).est);
    const mic = o.mic && x.length <= 2000 ? NL.mic(x, y).est : NaN;
    out.push({ i, j, a: names[i], b: names[j], n: x.length, r, rho, dcor: dc, xi, mic, gap: (isFinite(dc) ? dc : xi) - abs(r), micGap: isFinite(mic) ? mic - r * r : NaN });
    if (o.progress) o.progress(out.length / (p * (p - 1) / 2));
  }
  out.sort((a, b) => b.gap - a.gap);
  return out;
};

g.NL = NL;
return NL;
}
if (typeof window !== 'undefined') NonlinCore(window);
