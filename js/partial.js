/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 7, the engine of partial, multiple and set
   correlation.

     Partial and semipartial correlation of x and y given a set Z, for
       Pearson (covariances), Spearman (covariances of ranks) and Kendall (the
       matrix of sign concordances), from the inverse of the matrix of
       (x, y, Z): the partial is −Pᵢⱼ/√(PᵢᵢPⱼⱼ); the semipartial removes Z
       from one of the two only. Tests: t with n − 2 − k df; for Kendall, the
       normal approximation with variance 2(2(n − k) + 5)/(9(n − k)(n − 1 − k))
       (Kendall 1942 as used by Kim 2015).
     Partial distance correlation (Székely and Rizzo 2014): U-centred distance
       matrices, the projection of x and y on the complement of z, and a
       permutation test.
     Multiple correlation: R, R², adjusted R² and the F test of a
       regression; standardized coefficients, squared semipartials (the
       unique share of each predictor) and structure coefficients.
     Canonical correlation (Hotelling 1936): the singular values of
       Rₓₓ^{−½} Rₓᵧ Rᵧᵧ^{−½}, the canonical weights and loadings; the tests of
       dimensions k..min(p, q) by Wilks' Λ with Rao's F, the traces of
       Hotelling–Lawley and Pillai–Bartlett with their F approximations, and
       Roy's largest root (an upper bound).
     Between sets: the RV coefficient (Escoufier 1973; Robert and Escoufier
       1976) with its permutation mean and a permutation test; the symmetric
       Procrustes correlation (Gower 1975; Peres-Neto and Jackson 2001); the
       Mantel test (1967) between two distance matrices, Pearson or Spearman.

   Installs `Part` in the global object it is given; needs Num, Coef and Mat. */
function PartialCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef, Mat = g.Mat;
const { abs, sqrt, min, max } = Math;
const P = {};
const complete = cols => { const n = cols[0].length, keep = []; for (let r = 0; r < n; r++) if (cols.every(c => isFinite(c[r]))) keep.push(r); return { cols: cols.map(c => keep.map(r => c[r])), rows: keep }; };

/* ---------------- the covariance-like matrix of a method ---------------- */
function covOf(cols, method) {
  const p = cols.length, n = cols[0].length;
  const C = Array.from({ length: p }, () => new Array(p).fill(0));
  if (method === 'kendall') {
    for (let a = 0; a < p; a++) for (let b = a; b < p; b++) {
      let s = 0;
      const x = cols[a], y = cols[b];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s += Math.sign(x[i] - x[j]) * Math.sign(y[i] - y[j]);
      C[a][b] = C[b][a] = s;
    }
    return C;
  }
  const Z = method === 'spearman' ? cols.map(c => Array.from(Num.rank(c))) : cols;
  const m = Z.map(c => Num.mean(c));
  for (let a = 0; a < p; a++) for (let b = a; b < p; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += (Z[a][i] - m[a]) * (Z[b][i] - m[b]);
    C[a][b] = C[b][a] = s / (n - 1);
  }
  return C;
}
/* x, y: arrays; Z: array of arrays (may be empty); o: {method, which:
   'partial' | 'semi'} → {est, stat, p, n, k} */
P.partial = function (x, y, Z, o) {
  o = o || {};
  const method = o.method || 'pearson';
  const cc = complete([x, y].concat(Z || [])), cols = cc.cols, n = cols[0].length, k = cols.length - 2;
  const C = covOf(cols, method), Pm = Mat.inverse(C);
  if (!Pm) return { est: NaN, p: NaN, n, k, singular: true };
  const pc = -Pm[0][1] / sqrt(Pm[0][0] * Pm[1][1]);
  /* semipartial: Z removed from y only (the convention of the usual implementation) */
  const sp = -Pm[0][1] / sqrt(Pm[0][0] * Pm[1][1]) / sqrt(C[0][0]) / sqrt(abs(Pm[0][0] - Pm[0][1] * Pm[0][1] / Pm[1][1]));
  const test = r => {
    if (method === 'kendall') { const z = r / sqrt(2 * (2 * (n - k) + 5) / (9 * (n - k) * (n - 1 - k))); return { stat: z, name: 'z', p: 2 * Num.pnorm(-abs(z)) }; }
    const df = n - 2 - k, t = r * sqrt(df / (1 - r * r));
    return { stat: t, name: 't', df, p: 2 * Num.pt(-abs(t), df) };
  };
  return { method, n, k, partial: Object.assign({ est: pc }, test(pc)), semi: Object.assign({ est: sp }, test(sp)), zero: method === 'pearson' ? Coef.pearson(cols[0], cols[1]).est : method === 'spearman' ? Coef.spearman(cols[0], cols[1]).est : Coef.kendall(cols[0], cols[1]).est, rows: cc.rows, cols };
};
/* residuals of v on the columns of Z (least squares with an intercept) */
P.residuals = function (v, Z) {
  if (!Z.length) { const m = Num.mean(v); return v.map(a => a - m); }
  const f = g.Assume.ols(Z, v);
  return Array.from(f.res);
};

/* ---------------- partial distance correlation ---------------- */
function distMat(cols) {
  const n = cols[0].length, D = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let s = 0; for (const c of cols) { const d = c[i] - c[j]; s += d * d; } D[i][j] = D[j][i] = sqrt(s); }
  return D;
}
/* U-centring (Székely and Rizzo 2014, eq. 2.3) */
function ucenter(D) {
  const n = D.length, rs = D.map(r => r.reduce((s, v) => s + v, 0)), tot = rs.reduce((s, v) => s + v, 0);
  const A = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] = i === j ? 0 : D[i][j] - rs[i] / (n - 2) - rs[j] / (n - 2) + tot / ((n - 1) * (n - 2));
  return A;
}
const ip = (A, B) => { const n = A.length; let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) s += A[i][j] * B[i][j]; return s / (n * (n - 3)); };
P.pdcor = function (x, y, Z, o) {
  o = o || {};
  const cc = complete([x, y].concat(Z)), cols = cc.cols, n = cols[0].length;
  const A = ucenter(distMat([cols[0]])), B = ucenter(distMat([cols[1]])), Cz = ucenter(distMat(cols.slice(2)));
  const cz = ip(Cz, Cz);
  const proj = M => { const c = cz > 0 ? ip(M, Cz) / cz : 0; return M.map((r, i) => r.map((v, j) => v - c * Cz[i][j])); };
  const Px = proj(A), Py = proj(B);
  const pxy = ip(Px, Py), pxx = ip(Px, Px), pyy = ip(Py, Py);
  const est = pxx * pyy > 0 ? pxy / sqrt(pxx * pyy) : 0;
  const out = { est, pdcov: pxy, n };
  const Bp = o.B == null ? 999 : o.B;
  if (Bp > 0) {
    const rnd = Num.rng(o.seed || 1), idx = Array.from({ length: n }, (_, i) => i);
    let ge = 0;
    for (let b = 0; b < Bp; b++) {
      rnd.shuffle(idx);
      let s = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) s += Px[idx[i]][idx[j]] * Py[i][j];
      if (s / (n * (n - 3)) >= pxy) ge++;
    }
    out.p = (ge + 1) / (Bp + 1); out.B = Bp;
  }
  return out;
};

/* ---------------- multiple correlation ---------------- */
P.multiple = function (y, X) {
  const cc = complete([y].concat(X)), cols = cc.cols, n = cols[0].length, k = X.length;
  const fit = g.Assume.ols(cols.slice(1), cols[0]);
  const R2 = fit.r2, R = sqrt(max(0, R2)), adj = 1 - (1 - R2) * (n - 1) / (n - k - 1);
  const F = (R2 / k) / ((1 - R2) / (n - k - 1));
  const sy = Num.sd(cols[0]);
  const beta = fit.beta.map((b, j) => b * Num.sd(cols[j + 1]) / sy);
  /* squared semipartials: the drop in R² when each predictor leaves */
  const unique = X.map((_, j) => { const rest = cols.slice(1).filter((__, i) => i !== j); const r2 = rest.length ? g.Assume.ols(rest, cols[0]).r2 : 0; return R2 - r2; });
  const yhat = Array.from(fit.fit);
  const structure = cols.slice(1).map(c => Coef.pearson(c, yhat).est);
  const zero = cols.slice(1).map(c => Coef.pearson(c, cols[0]).est);
  /* t tests of each coefficient */
  const Xc = cols.slice(1).map(c => { const m = Num.mean(c); return c.map(v => v - m); });
  const XtX = Xc.map(a => Xc.map(b => a.reduce((s, v, i) => s + v * b[i], 0)));
  const inv = Mat.inverse(XtX), s2 = fit.rss / (n - k - 1);
  const tcoef = fit.beta.map((b, j) => { const se = sqrt(s2 * inv[j][j]); const t = b / se; return { b, se, t, p: 2 * Num.pt(-abs(t), n - k - 1) }; });
  return { n, k, R, R2, adj, F, df1: k, df2: n - k - 1, p: Num.pf(F, k, n - k - 1, true), beta, unique, shared: R2 - unique.reduce((s, v) => s + v, 0), structure, zero, coef: tcoef, intercept: fit.intercept, rows: cc.rows };
};

/* ---------------- canonical correlation ---------------- */
function symPow(M, pw) {
  const E = Mat.eigen(M), p = M.length;
  return Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => { let s = 0; for (let k = 0; k < p; k++) s += E.vectors[i][k] * Math.pow(max(E.values[k], 1e-300), pw) * E.vectors[j][k]; return s; }));
}
const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = A => A[0].map((_, j) => A.map(r => r[j]));
P.canonical = function (Xs, Ys) {
  const cc = complete(Xs.concat(Ys)), cols = cc.cols, n = cols[0].length, p = Xs.length, q = Ys.length;
  const R = Array.from({ length: p + q }, (_, i) => Array.from({ length: p + q }, (_, j) => (i === j ? 1 : Coef.pearson(cols[i], cols[j]).est)));
  const Rxx = R.slice(0, p).map(r => r.slice(0, p)), Ryy = R.slice(p).map(r => r.slice(p)), Rxy = R.slice(0, p).map(r => r.slice(p));
  const Ax = symPow(Rxx, -0.5), Ay = symPow(Ryy, -0.5);
  const K = mm(mm(Ax, Rxy), Ay);
  /* singular values of K from the eigen-decomposition of K Kᵀ */
  const E = Mat.eigen(mm(K, tr(K))), s = min(p, q);
  const rho = E.values.slice(0, s).map(v => sqrt(max(0, Math.min(1, v))));
  const U = E.vectors.map(r => r.slice(0, s));
  const wx = mm(Ax, U);                       /* weights on standardized X */
  const Vy = mm(mm(tr(K), U), rho.map((r, i) => rho.map((_, j) => (i === j ? (r > 0 ? 1 / r : 0) : 0))));
  const wy = mm(Ay, Vy);
  const loadX = mm(Rxx, wx), loadY = mm(Ryy, wy);   /* structure correlations */
  /* sequential tests of the dimensions k..s */
  const tests = [];
  for (let k = 0; k < s; k++) {
    const rest = rho.slice(k), r2 = rest.map(r => r * r);
    const wilks = r2.reduce((a, v) => a * (1 - v), 1);
    const df1 = (p - k) * (q - k);
    const nu = (p - k === 1 || q - k === 1) ? 1 : sqrt((df1 * df1 - 4) / ((p - k) ** 2 + (q - k) ** 2 - 5));
    const de = n - 1.5 - (p + q) / 2, df2 = de * nu - df1 / 2 + 1, w = Math.pow(wilks, 1 / nu);
    const raoF = df2 / df1 * (1 - w) / w;
    const hl = r2.reduce((a, v) => a + v / (1 - v), 0), hdf2 = s * (n - 2 - p - q + 2 * k) + 2, hF = hl / s / df1 * hdf2;
    const pb = r2.reduce((a, v) => a + v, 0), pdf2 = s * (n - 1 + s - p - q + 2 * k), pF = pb / df1 * pdf2 / (s - pb);
    tests.push({
      k: k + 1, wilks: { stat: wilks, F: raoF, df1, df2, p: Num.pf(raoF, df1, df2, true) },
      hotelling: { stat: hl, F: hF, df1, df2: hdf2, p: Num.pf(hF, df1, hdf2, true) },
      pillai: { stat: pb, F: pF, df1, df2: pdf2, p: Num.pf(pF, df1, pdf2, true) },
    });
  }
  const roy = { stat: rho[0] * rho[0], df1: q, df2: n - 1 - q };
  roy.F = roy.stat / roy.df1 * roy.df2 / (1 - roy.stat); roy.p = Num.pf(roy.F, roy.df1, roy.df2, true);
  /* scores of the first two pairs (standardized data) */
  const zc = cols.map(c => { const m = Num.mean(c), sd = Num.sd(c); return c.map(v => (v - m) / sd); });
  const score = (W, off, d) => Array.from({ length: n }, (_, i) => W.reduce((sum, row, j) => sum + row[d] * zc[off + j][i], 0));
  const scores = rho.slice(0, 2).map((_, d) => ({ x: score(wx, 0, d), y: score(wy, p, d) }));
  return { n, p, q, rho, wx, wy, loadX, loadY, tests, roy, scores, rows: cc.rows };
};

/* ---------------- between sets ---------------- */
/* RV on column-centred tables (the variables standardized when o.scale) */
P.rv = function (Xs, Ys, o) {
  o = o || {};
  const cc = complete(Xs.concat(Ys)), cols = cc.cols, n = cols[0].length, p = Xs.length;
  const cen = c => { const m = Num.mean(c), s = o.scale ? Num.sd(c) : 1; return c.map(v => (v - m) / s); };
  const X = cols.slice(0, p).map(cen), Y = cols.slice(p).map(cen);
  const W = M => { const W0 = Array.from({ length: n }, () => new Float64Array(n)); for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { let s = 0; for (const c of M) s += c[i] * c[j]; W0[i][j] = W0[j][i] = s; } return W0; };
  const Wx = W(X), Wy = W(Y);
  const trp = (A, B) => { let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += A[i][j] * B[j][i]; return s; };
  const rv = trp(Wx, Wy) / sqrt(trp(Wx, Wx) * trp(Wy, Wy));
  /* permutation mean: √(βx βy)/(n − 1), β = (tr W)²/tr(W²) */
  const trW = A => { let s = 0; for (let i = 0; i < n; i++) s += A[i][i]; return s; };
  const bx = trW(Wx) ** 2 / trp(Wx, Wx), by = trW(Wy) ** 2 / trp(Wy, Wy);
  const out = { rv, n, mean: sqrt(bx * by) / (n - 1) };
  const B = o.B == null ? 999 : o.B;
  if (B > 0) {
    const rnd = Num.rng(o.seed || 1), idx = Array.from({ length: n }, (_, i) => i), den = sqrt(trp(Wx, Wx) * trp(Wy, Wy)), reps = new Float64Array(B);
    let ge = 0;
    for (let b = 0; b < B; b++) {
      rnd.shuffle(idx);
      let s = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += Wx[idx[i]][idx[j]] * Wy[j][i];
      reps[b] = s / den;
      if (reps[b] >= rv - 1e-12) ge++;
    }
    out.p = (ge + 1) / (B + 1); out.B = B; out.reps = reps;
  }
  return out;
};
/* co-inertia analysis (Dolédec and Chessel 1994): each table centred and, by
   default, standardized with the divisor n (as a principal component analysis
   with row weights 1/n); the cross table C = XᵀY/n decomposed by singular
   values gives the pairs of axes of largest covariance. The eigenvalues σ²
   add up to the total co-inertia, and RV = Σσ² / √(tr Sx² · tr Sy²). */
P.coinertia = function (Xs, Ys, o) {
  o = o || {};
  const cc = complete(Xs.concat(Ys)), cols = cc.cols, n = cols[0].length, p = Xs.length, q = Ys.length;
  const cen = c => { const m = Num.mean(c); let v = 0; c.forEach(x => { v += (x - m) ** 2; }); const s = o.scale === false ? 1 : sqrt(v / n); return c.map(x => (x - m) / s); };
  const X = cols.slice(0, p).map(cen), Y = cols.slice(p).map(cen);
  const cross = (A, B) => A.map(a => B.map(b => { let s = 0; for (let i = 0; i < n; i++) s += a[i] * b[i]; return s / n; }));
  const C = cross(X, Y), Sx = cross(X, X), Sy = cross(Y, Y), Ct = tr(C);
  const E = Mat.eigen(mm(C, Ct)), k = min(p, q);
  const eig = E.values.slice(0, k).map(v => max(0, v)), total = eig.reduce((s, v) => s + v, 0);
  const tr2 = S => S.reduce((s, row, i) => s + row.reduce((a, v, j) => a + v * S[j][i], 0), 0);
  /* the axes of X (unit vectors), those of Y from them, and the row scores */
  const u = Array.from({ length: k }, (_, a) => E.vectors.map(row => row[a]));
  const v = u.map((ua, a) => { const w = Ct.map(row => row.reduce((s, x, j) => s + x * ua[j], 0)); const nn = sqrt(w.reduce((s, x) => s + x * x, 0)) || 1; return w.map(x => x / nn); });
  const score = (T0, w) => Array.from({ length: n }, (_, i) => T0.reduce((s, c, j) => s + c[i] * w[j], 0));
  const sX = u.map(w => score(X, w)), sY = v.map(w => score(Y, w));
  return { n, p, q, eig, total, pct: eig.map(e => (total > 0 ? e / total : NaN)), RV: total / sqrt(tr2(Sx) * tr2(Sy)), u, v, scoresX: sX, scoresY: sY, rAxes: sX.map((a, i) => Coef.pearson(a, sY[i]).est), rows: cc.rows };
};
/* symmetric Procrustes: both configurations centred and scaled to unit
   trace; m² = 1 − (Σ singular values of XᵀY)², r = √(1 − m²) */
P.procrustes = function (Xs, Ys, o) {
  o = o || {};
  const cc = complete(Xs.concat(Ys)), cols = cc.cols, n = cols[0].length, p = Xs.length;
  const prep = M => { const C = M.map(c => { const m = Num.mean(c), s = o.scale === false ? 1 : Num.sd(c); return c.map(v => (v - m) / s); }); let t = 0; C.forEach(c => c.forEach(v => { t += v * v; })); const k = sqrt(t); return C.map(c => c.map(v => v / k)); };
  let X = prep(cols.slice(0, p)), Y = prep(cols.slice(p));
  /* pad the smaller table with zero columns */
  while (X.length < Y.length) X.push(new Array(n).fill(0));
  while (Y.length < X.length) Y.push(new Array(n).fill(0));
  const stat = (A, Bm) => { const C = A.map(a => Bm.map(b => a.reduce((s, v, i) => s + v * b[i], 0))); const ev = Mat.eigen(mm(C, tr(C))).values; return ev.reduce((s, v) => s + sqrt(max(0, v)), 0); };
  const r = stat(X, Y), m2 = 1 - r * r;
  const out = { r, m2, n };
  const B = o.B == null ? 999 : o.B;
  if (B > 0) {
    const rnd = Num.rng(o.seed || 2), idx = Array.from({ length: n }, (_, i) => i);
    let ge = 0;
    for (let b = 0; b < B; b++) { rnd.shuffle(idx); const Yp = Y.map(c => idx.map(i => c[i])); if (stat(X, Yp) >= r - 1e-12) ge++; }
    out.p = (ge + 1) / (B + 1); out.B = B;
  }
  return out;
};
/* Mantel between the Euclidean distances of two sets (standardized
   variables when o.scale) or two given distance matrices */
P.mantel = function (Xs, Ys, o) {
  o = o || {};
  let Dx, Dy, n;
  if (o.Dx) { Dx = o.Dx; Dy = o.Dy; n = Dx.length; } else {
    const cc = complete(Xs.concat(Ys)), cols = cc.cols, p = Xs.length;
    const st = c => { const m = Num.mean(c), s = o.scale === false ? 1 : Num.sd(c); return c.map(v => (v - m) / s); };
    Dx = distMat(cols.slice(0, p).map(st)); Dy = distMat(cols.slice(p).map(st)); n = cols[0].length;
  }
  const a = [], b = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { a.push(Dx[i][j]); b.push(Dy[i][j]); }
  const sp = o.method === 'spearman';
  const f = (u, v) => (sp ? Coef.spearman(u, v, { exact: false }).est : Coef.pearson(u, v).est);
  const r = f(a, b);
  const out = { r, n, method: sp ? 'spearman' : 'pearson' };
  const B = o.B == null ? 999 : o.B;
  if (B > 0) {
    const rnd = Num.rng(o.seed || 3), idx = Array.from({ length: n }, (_, i) => i), bp = new Array(a.length);
    let ge = 0;
    for (let k = 0; k < B; k++) {
      rnd.shuffle(idx);
      let t = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) bp[t++] = Dy[idx[i]][idx[j]];
      if (f(a, bp) >= r - 1e-12) ge++;
    }
    out.p = (ge + 1) / (B + 1); out.B = B;
  }
  return out;
};

g.Part = P;
return P;
}
if (typeof window !== 'undefined') PartialCore(window);
