/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 5, the engine of the correlation matrix.

     The matrix of any coefficient of two variables, pairwise or listwise,
       with its p-values and the number of pairs behind each cell; Pearson and
       Spearman for many variables by products of standardized columns.
     Multiple testing: Bonferroni, Holm (1979), Hochberg (1988), Hommel
       (1988), Benjamini–Hochberg (1995) and Benjamini–Yekutieli (2001).
     Is it a correlation matrix? Eigenvalues (Householder tridiagonalization
       and the implicit QL method), determinant, condition number; the nearest
       positive-definite correlation matrix by alternating projections with
       Dykstra's correction (Higham 2002); the shrinkage estimate of Schäfer
       and Strimmer (2005), with its analytic λ; the Kaiser–Meyer–Olkin
       measure (Kaiser 1970, 1974) and Bartlett's (1950) test of sphericity.
     Orderings: the angular order of the first two eigenvectors (Friendly
       2002), the first principal component, and agglomerative clustering on
       1 − r (single, complete, average, Ward on squared distances) with the
       leaf order of its tree.

   Installs `Mat` in the global object it is given; needs Num and Coef. */
function MatrixCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, max, min, atan2, PI } = Math;
const M = {};

/* ---------------- the matrix of a coefficient ---------------- */
M.METHODS = {
  pearson: { f: (x, y, o) => Coef.pearson(x, y, o), sym: true, fast: 'pearson' },
  spearman: { f: (x, y, o) => Coef.spearman(x, y, o), sym: true, fast: 'spearman' },
  kendall: { f: (x, y, o) => Coef.kendall(x, y, o), sym: true },
  gaussian: { f: (x, y, o) => Coef.gaussianRank(x, y, o), sym: true },
  blomqvist: { f: (x, y, o) => Coef.blomqvist(x, y, o), sym: true },
  biweight: { f: (x, y, o) => Coef.biweight(x, y, o), sym: true },
  pbend: { f: (x, y, o) => Coef.percentageBend(x, y, o), sym: true },
  winsorized: { f: (x, y, o) => Coef.winsorized(x, y, o), sym: true },
  dcor: { f: (x, y, o) => Coef.dcor(x, y, o), sym: true, dep: true },
  xi: { f: (x, y, o) => Coef.xi(x, y, o), sym: false, dep: true },
  hoeffding: { f: (x, y, o) => Coef.hoeffding(x, y, o), sym: true, dep: true },
};
/* rows complete in every column */
function listwise(cols) {
  const n = cols[0].length, keep = [];
  for (let r = 0; r < n; r++) if (cols.every(c => isFinite(c[r]))) keep.push(r);
  return cols.map(c => keep.map(r => c[r]));
}
/* standardized columns (mean 0, Σz² = 1) of complete data */
function standardize(c) {
  const n = c.length, m = Num.mean(c);
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (c[i] - m) * (c[i] - m);
  const s = sqrt(ss), z = new Float64Array(n);
  for (let i = 0; i < n; i++) z[i] = s > 0 ? (c[i] - m) / s : NaN;
  return z;
}
/* o: {method, missing ('pairwise' | 'listwise'), alt, progress} →
   {R, P, N, method, p (vars)} ; R[i][j] for ξ is ξ(column j | column i) */
M.compute = function (cols0, o) {
  o = o || {};
  const method = o.method || 'pearson', def = M.METHODS[method], p = cols0.length;
  let cols = cols0.map(c => Array.from(c));
  if (o.missing === 'listwise') cols = listwise(cols);
  const anyMissing = cols.some(c => c.some(v => !isFinite(v)));
  const R = [], P = [], N = [];
  for (let i = 0; i < p; i++) { R.push(new Array(p).fill(NaN)); P.push(new Array(p).fill(NaN)); N.push(new Array(p).fill(0)); }
  const alt = o.alt || 'two.sided';
  if (def.fast && !anyMissing && p > 30) {
    /* many variables, complete data: r = Σ zᵢ zⱼ; p from the t approximation */
    const n = cols[0].length;
    const Z = cols.map(c => standardize(def.fast === 'spearman' ? Num.rank(c) : c));
    for (let i = 0; i < p; i++) {
      R[i][i] = 1; N[i][i] = n;
      for (let j = i + 1; j < p; j++) {
        const a = Z[i], b = Z[j];
        let s = 0;
        for (let k = 0; k < n; k++) s += a[k] * b[k];
        const r = Math.max(-1, Math.min(1, s));
        R[i][j] = R[j][i] = r; N[i][j] = N[j][i] = n;
        const t = r * sqrt((n - 2) / Math.max(1e-300, 1 - r * r));
        const pv = alt === 'greater' ? Num.pt(t, n - 2, true) : alt === 'less' ? Num.pt(t, n - 2) : Math.min(1, 2 * Num.pt(abs(t), n - 2, true));
        P[i][j] = P[j][i] = pv;
      }
      if (o.progress && i % 20 === 0) o.progress(i / p);
    }
    return { R, P, N, method, p, fast: true };
  }
  for (let i = 0; i < p; i++) {
    for (let j = def.sym ? i : 0; j < p; j++) {
      if (i === j) { R[i][i] = method === 'hoeffding' || method === 'xi' ? 1 : 1; P[i][i] = NaN; N[i][i] = cols[i].filter(isFinite).length; continue; }
      const res = def.f(cols[i], cols[j], { alt, exact: o.exact != null ? o.exact : (p > 60 ? false : undefined) });
      R[i][j] = res.est; P[i][j] = res.p; N[i][j] = res.n;
      if (def.sym) { R[j][i] = res.est; P[j][i] = res.p; N[j][i] = res.n; }
    }
    if (o.progress && i % 5 === 0) o.progress(i / p);
  }
  return { R, P, N, method, p, fast: false };
};

/* ---------------- multiple testing ---------------- */
/* p: array (NaN allowed, left as NaN); method: bonferroni | holm | hochberg |
   hommel | BH | BY | none */
M.adjust = function (p0, method) {
  const idx = [], p = [];
  p0.forEach((v, i) => { if (isFinite(v)) { idx.push(i); p.push(v); } });
  const m = p.length, out = p0.map(() => NaN);
  if (!m || method === 'none') { idx.forEach((k, i) => { out[k] = p[i]; }); return out; }
  if (method === 'hommel' && m <= 2) method = 'hochberg';   /* the same procedure for two tests */
  const ord = Num.order(p), adj = new Array(m);
  if (method === 'bonferroni') for (let i = 0; i < m; i++) adj[i] = min(1, m * p[i]);
  else if (method === 'holm') {
    let run = 0;
    ord.forEach((k, r) => { run = max(run, (m - r) * p[k]); adj[k] = min(1, run); });
  } else if (method === 'hochberg') {
    let run = 1;
    for (let r = m - 1; r >= 0; r--) { const k = ord[r]; run = min(run, (m - r) * p[k]); adj[k] = min(1, run); }
  } else if (method === 'BH' || method === 'BY') {
    let q = 1;
    if (method === 'BY') { let s = 0; for (let i = 1; i <= m; i++) s += 1 / i; q = s; }
    let run = 1;
    for (let r = m - 1; r >= 0; r--) { const k = ord[r]; run = min(run, q * m / (r + 1) * p[k]); adj[k] = min(1, run); }
  } else if (method === 'hommel') {
    /* Hommel (1988), the closed-testing form computed as in Wright (1992) */
    const s = ord.map(k => p[k]);
    let q = s.map(() => 0), pa = s.map(() => 0);
    const mn = Math.min(...s.map((v, i) => m * v / (i + 1)));
    q = q.map(() => mn); pa = pa.map(() => mn);
    for (let j = m - 1; j >= 2; j--) {
      const i1 = m - j + 1;   /* indices 1..m−j+1 (1-based) */
      let q1 = Infinity;
      for (let k = 2; k <= j; k++) q1 = min(q1, j * s[m - j + k - 1] / k);
      for (let i = 0; i < i1; i++) q[i] = min(j * s[i], q1);
      for (let i = i1; i < m; i++) q[i] = q[i1 - 1];
      for (let i = 0; i < m; i++) pa[i] = max(pa[i], q[i]);
    }
    ord.forEach((k, r) => { adj[k] = max(pa[r], s[r]); });
  } else throw new Error('método desconocido: ' + method);
  idx.forEach((k, i) => { out[k] = adj[i]; });
  return out;
};
/* the upper-triangle p-values of a matrix, adjusted, put back symmetric */
M.adjustMatrix = function (P, method) {
  const p = P.length, flat = [], pos = [];
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { flat.push(P[i][j]); pos.push([i, j]); }
  const a = M.adjust(flat, method), Q = P.map(r => r.map(() => NaN));
  pos.forEach(([i, j], k) => { Q[i][j] = Q[j][i] = a[k]; });
  return Q;
};

/* ---------------- symmetric eigenproblem ----------------
   Householder reduction to tridiagonal form and the implicit QL method with
   Wilkinson shifts; vectors in the columns of V, values decreasing. */
M.eigen = function (A0) {
  const n = A0.length, V = A0.map(r => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) d[j] = V[n - 1][j];
  /* tridiagonalize */
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0;
    for (let k = 0; k < i; k++) scale += abs(d[k]);
    if (scale === 0) {
      e[i] = d[i - 1];
      for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; }
    } else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], gg = sqrt(h);
      if (f > 0) gg = -gg;
      e[i] = scale * gg; h -= f * gg; d[i - 1] = f - gg;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j]; V[j][i] = f; gg = e[j] + V[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) { gg += V[k][j] * d[k]; e[k] += V[k][j] * f; }
        e[j] = gg;
      }
      f = 0;
      for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h);
      for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) {
        f = d[j]; gg = e[j];
        for (let k = j; k <= i - 1; k++) V[k][j] -= (f * e[k] + gg * d[k]);
        d[j] = V[i - 1][j]; V[i][j] = 0;
      }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    V[n - 1][i] = V[i][i]; V[i][i] = 1;
    const h = d[i + 1];
    if (h !== 0) {
      for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h;
      for (let j = 0; j <= i; j++) {
        let gg = 0;
        for (let k = 0; k <= i; k++) gg += V[k][i + 1] * V[k][j];
        for (let k = 0; k <= i; k++) V[k][j] -= gg * d[k];
      }
    }
    for (let k = 0; k <= i; k++) V[k][i + 1] = 0;
  }
  for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; }
  V[n - 1][n - 1] = 1; e[0] = 0;
  /* QL */
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  e[n - 1] = 0;
  let f = 0, tst1 = 0;
  const eps = Math.pow(2, -52);
  for (let l = 0; l < n; l++) {
    tst1 = max(tst1, abs(d[l]) + abs(e[l]));
    let m = l;
    while (m < n) { if (abs(e[m]) <= eps * tst1) break; m++; }
    if (m > l) {
      let iter = 0;
      do {
        iter++;
        let gg = d[l], pp = (d[l + 1] - gg) / (2 * e[l]), r = Math.hypot(pp, 1);
        if (pp < 0) r = -r;
        d[l] = e[l] / (pp + r); d[l + 1] = e[l] * (pp + r);
        const dl1 = d[l + 1];
        let h = gg - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h;
        f += h;
        pp = d[m];
        let c = 1, c2 = c, c3 = c, el1 = e[l + 1], s = 0, s2 = 0;
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s;
          gg = c * e[i]; h = c * pp; r = Math.hypot(pp, e[i]);
          e[i + 1] = s * r; s = e[i] / r; c = pp / r;
          pp = c * d[i] - s * gg; d[i + 1] = h + s * (c * gg + s * d[i]);
          for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
        }
        pp = -s * s2 * c3 * el1 * e[l] / dl1;
        e[l] = s * pp; d[l] = c * pp;
      } while (abs(e[l]) > eps * tst1 && iter < 60);
    }
    d[l] = d[l] + f; e[l] = 0;
  }
  const idx = [...Array(n).keys()].sort((a, b) => d[b] - d[a]);
  return { values: idx.map(i => d[i]), vectors: Array.from({ length: n }, (_, r) => idx.map(i => V[r][i])) };
};
M.cholesky = function (A) {
  const n = A.length, L = A.map(() => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j];
    for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (!(s > 0)) return null; L[i][i] = sqrt(s); } else L[i][j] = s / L[j][j];
  }
  return L;
};
M.logDet = function (A) { const L = M.cholesky(A); if (!L) return NaN; let s = 0; for (let i = 0; i < A.length; i++) s += 2 * log(L[i][i]); return s; };
M.inverse = function (A) {
  const n = A.length, a = A.map((r, i) => Array.from(r).concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (abs(a[r][i]) > abs(a[piv][i])) piv = r;
    [a[i], a[piv]] = [a[piv], a[i]];
    const d = a[i][i];
    if (abs(d) < 1e-14) return null;
    for (let j = 0; j < 2 * n; j++) a[i][j] /= d;
    for (let r = 0; r < n; r++) if (r !== i) { const f = a[r][i]; if (f) for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j]; }
  }
  return a.map(r => r.slice(n));
};
/* the diagnosis of a matrix */
M.diagnose = function (R) {
  const p = R.length, E = M.eigen(R), lam = E.values;
  const minL = lam[p - 1], maxL = lam[0];
  return { eigen: E, min: minL, max: maxL, pd: minL > 1e-10 * max(1, maxL), psd: minL > -1e-10 * max(1, maxL), logDet: lam.every(v => v > 0) ? lam.reduce((s, v) => s + log(v), 0) : NaN, cond: minL > 0 ? maxL / minL : Infinity, negative: lam.filter(v => v < -1e-10).length, zero: lam.filter(v => Math.abs(v) <= 1e-10 * max(1, maxL)).length };
};

/* ---------------- nearest correlation matrix ----------------
   Higham (2002): alternate the projections on the positive semidefinite
   cone (eigenvalues clipped at 0) and on the unit-diagonal matrices, with
   Dykstra's correction; then the eigenvalues are raised to eigTol·λmax
   so the result is positive definite, and the diagonal set back to 1 (the
   steps usually followed when the matrix is a correlation matrix). */
M.nearestPD = function (R0, o) {
  o = o || {};
  const n = R0.length, eigTol = o.eigTol == null ? 1e-6 : o.eigTol, convTol = o.convTol == null ? 1e-7 : o.convTol, posdTol = o.posdTol == null ? 1e-8 : o.posdTol, maxit = o.maxit || 100;
  let X = R0.map(r => Float64Array.from(r)), D = X.map(() => new Float64Array(n));
  let iter = 0, conv = Infinity;
  const recon = (V, d) => { const Y = []; for (let i = 0; i < n; i++) { Y.push(new Float64Array(n)); for (let j = 0; j < n; j++) { let s = 0; for (let k = 0; k < n; k++) s += V[i][k] * d[k] * V[j][k]; Y[i][j] = s; } } return Y; };
  while (iter < maxit && conv > convTol) {
    const Y = X;
    const Rr = Y.map((r, i) => r.map((v, j) => v - D[i][j]));
    const E = M.eigen(Rr), d = E.values, V = E.vectors;
    const pos = d.map(v => (v > eigTol * d[0] ? v : 0));
    let Xn;
    if (!pos.some(v => v > 0)) throw new Error('nearestPD: la matriz parece negativa semidefinida');
    Xn = recon(V, pos);
    D = Xn.map((r, i) => r.map((v, j) => v - Rr[i][j]));
    for (let i = 0; i < n; i++) Xn[i][i] = 1;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { let rs = 0, rs2 = 0; for (let j = 0; j < n; j++) { rs += abs(Y[i][j] - Xn[i][j]); rs2 += abs(Y[i][j]); } num = max(num, rs); den = max(den, rs2); }
    conv = num / den;
    X = Xn; iter++;
  }
  /* make it positive definite */
  const E = M.eigen(X), d = E.values, Eps = posdTol * abs(d[0]);
  if (d[n - 1] < Eps) {
    const dd = d.map(v => max(v, Eps));
    const Y = recon(E.vectors, dd);
    const s = Y.map((r, i) => sqrt(Y[i][i]));
    X = Y.map((r, i) => r.map((v, j) => v / (s[i] * s[j])));
    for (let i = 0; i < n; i++) X[i][i] = 1;
  }
  let fro = 0, big = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const dlt = X[i][j] - R0[i][j]; fro += dlt * dlt; big = max(big, abs(dlt)); }
  return { R: X.map(r => Array.from(r)), iterations: iter, converged: conv <= convTol, frobenius: sqrt(fro), maxChange: big };
};

/* ---------------- shrinkage (Schäfer and Strimmer 2005) ----------------
   The empirical correlations are shrunk towards the identity by the λ that
   minimizes the estimated risk: λ = Σᵢ≠ⱼ Var(rᵢⱼ) / Σᵢ≠ⱼ rᵢⱼ², with
   Var(rᵢⱼ) = n/(n−1)³ Σₖ (wₖᵢⱼ − w̄ᵢⱼ)², wₖᵢⱼ = zₖᵢ zₖⱼ on columns
   standardized with the n − 1 divisor. Complete data. */
M.shrink = function (cols0) {
  const cols = listwise(cols0.map(c => Array.from(c))), p = cols.length, n = cols[0].length;
  const Z = cols.map(c => { const m = Num.mean(c), s = Num.sd(c); return c.map(v => (v - m) / s); });
  let num = 0, den = 0;
  const R = [];
  for (let i = 0; i < p; i++) R.push(new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    R[i][i] = 1;
    for (let j = i + 1; j < p; j++) {
      let wm = 0;
      for (let k = 0; k < n; k++) wm += Z[i][k] * Z[j][k];
      wm /= n;
      let v = 0;
      for (let k = 0; k < n; k++) { const d = Z[i][k] * Z[j][k] - wm; v += d * d; }
      v *= n / Math.pow(n - 1, 3);
      const r = n / (n - 1) * wm;
      R[i][j] = R[j][i] = r;
      num += 2 * v; den += 2 * r * r;
    }
  }
  const lambda = den > 0 ? max(0, min(1, num / den)) : 1;
  const S = R.map((row, i) => row.map((v, j) => (i === j ? 1 : (1 - lambda) * v)));
  return { lambda, R: S, raw: R, n };
};

/* ---------------- KMO and Bartlett ---------------- */
M.kmo = function (R) {
  const p = R.length, Ri = M.inverse(R);
  if (!Ri) return null;
  const Q = Ri.map((row, i) => row.map((v, j) => -v / sqrt(Ri[i][i] * Ri[j][j])));
  let r2 = 0, q2 = 0;
  const msa = [];
  for (let i = 0; i < p; i++) {
    let a = 0, b = 0;
    for (let j = 0; j < p; j++) if (j !== i) { a += R[i][j] * R[i][j]; b += Q[i][j] * Q[i][j]; }
    msa.push(a / (a + b)); r2 += a; q2 += b;
  }
  return { overall: r2 / (r2 + q2), msa, partial: Q };
};
M.KMO_WORDS = v => (v >= 0.9 ? ['maravillosa', 'marvelous'] : v >= 0.8 ? ['meritoria', 'meritorious'] : v >= 0.7 ? ['mediana', 'middling'] : v >= 0.6 ? ['mediocre', 'mediocre'] : v >= 0.5 ? ['miserable', 'miserable'] : ['inaceptable', 'unacceptable']);
M.bartlett = function (R, n) {
  const p = R.length, ld = M.logDet(R);
  const chi = -(n - 1 - (2 * p + 5) / 6) * ld, df = p * (p - 1) / 2;
  return { chi2: chi, df, p: Num.pchisq(chi, df, true), logDet: ld };
};

/* ---------------- orderings ---------------- */
/* the first two eigenvectors with a fixed sign: the first with a positive
   sum (most variables load positively), the second with its largest
   component positive; o.signs = [±1, ±1] flips them on request */
function firstTwo(R, o) {
  const E = M.eigen(R);
  let e1 = E.vectors.map(r => r[0]), e2 = E.vectors.map(r => r[1] == null ? 0 : r[1]);
  if (e1.reduce((t, v) => t + v, 0) < 0) e1 = e1.map(v => -v);
  let k = 0; e2.forEach((v, i) => { if (abs(v) > abs(e2[k])) k = i; });
  if (e2[k] < 0) e2 = e2.map(v => -v);
  if (o && o.signs) { e1 = e1.map(v => v * o.signs[0]); e2 = e2.map(v => v * o.signs[1]); }
  return [e1, e2];
}
/* angular order of the first two eigenvectors (Friendly 2002): the angle of
   each variable in the plane of the first two components */
M.orderAOE = function (R, o) {
  const [e1, e2] = firstTwo(R, o);
  const ang = e1.map((v, i) => (v > 0 ? Math.atan(e2[i] / v) : Math.atan(e2[i] / v) + PI));
  return Num.order(ang);
};
/* order of the loadings on the first principal component */
M.orderFPC = function (R, o) {
  const [e1] = firstTwo(R, o);
  return Num.order(e1);
};
/* agglomerative clustering on d = 1 − r: Lance–Williams updates; returns the
   merges in the usual convention (negative = a variable, positive = an
   earlier merge), the heights and the leaf order of the tree */
M.hclust = function (Dm, method) {
  method = method || 'complete';
  const n = Dm.length, ward = method === 'ward.D2';
  const D = Dm.map(r => Float64Array.from(r, v => (ward ? v * v : v)));
  const active = new Array(n).fill(true), size = new Array(n).fill(1), id = Array.from({ length: n }, (_, i) => -(i + 1));
  const merge = [], height = [];
  for (let step = 0; step < n - 1; step++) {
    let bi = -1, bj = -1, bd = Infinity;
    for (let i = 0; i < n; i++) if (active[i]) for (let j = i + 1; j < n; j++) if (active[j] && D[i][j] < bd) { bd = D[i][j]; bi = i; bj = j; }
    const a = id[bi], b = id[bj];
    /* the usual convention: singletons first, then the earlier cluster */
    const pair = a < 0 && b < 0 ? [max(a, b), min(a, b)] : a < 0 ? [a, b] : b < 0 ? [b, a] : [min(a, b), max(a, b)];
    merge.push(pair); height.push(ward ? sqrt(bd) : bd);
    const ni = size[bi], nj = size[bj];
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === bi || k === bj) continue;
      const dik = D[bi][k], djk = D[bj][k], nk = size[k];
      let v;
      if (method === 'single') v = min(dik, djk);
      else if (method === 'complete') v = max(dik, djk);
      else if (method === 'average') v = (ni * dik + nj * djk) / (ni + nj);
      else v = ((ni + nk) * dik + (nj + nk) * djk - nk * bd) / (ni + nj + nk);
      D[bi][k] = D[k][bi] = v;
    }
    active[bj] = false; size[bi] = ni + nj; id[bi] = step + 1;
  }
  /* leaf order: expand the last merge, left before right */
  const order = [];
  const expand = c => { if (c < 0) order.push(-c - 1); else { expand(merge[c - 1][0]); expand(merge[c - 1][1]); } };
  expand(n - 1);
  return { merge, height, order, method };
};
M.orderHclust = function (R, method) {
  const D = R.map(r => r.map(v => 1 - v));
  return M.hclust(D, method).order;
};
M.order = function (R, how, labels) {
  const p = R.length;
  if (how === 'AOE') return M.orderAOE(R);
  if (how === 'FPC') return M.orderFPC(R);
  if (how && how.startsWith('hclust')) return M.orderHclust(R, how.split(':')[1] || 'complete');
  if (how === 'alpha' && labels) return Num.order(labels.map((_, i) => i)).sort((a, b) => labels[a].localeCompare(labels[b]));
  return [...Array(p).keys()];
};

g.Mat = M;
return M;
}
if (typeof window !== 'undefined') MatrixCore(window);
