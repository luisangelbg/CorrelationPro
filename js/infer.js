/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 12, the engine of comparing, correcting, planning
   and combining correlations.

     Two correlations: from independent groups (Fisher 1925; Zou 2007's
       interval); dependent and overlapping, r_jk against r_jh (Pearson and
       Filon 1898; Hotelling 1940; Williams 1959; Olkin 1967; Dunn and Clark
       1969; Hendrickson, Stanley and Hills 1970; Steiger 1980; Meng,
       Rosenthal and Rubin 1992; Hittner, May and Silver 2003; Zou 2007);
       dependent and non-overlapping, r_jk against r_hm (Pearson and Filon;
       Dunn and Clark; Steiger; Raghunathan, Rosenthal and Rubin 1996;
       Silver, Hittner and May 2004; Zou).
     Two matrices: Jennrich's (1970) χ² for independent samples, and the
       normal-theory test on Fisher's z (Steiger 1980).
     Corrections: for attenuation (Spearman 1904) and for range restriction,
       direct (Thorndike's case II) and indirect (case III) (Thorndike 1949;
       Sackett and Yang 2000).
     Planning: power and sample size by Fisher's z with the bias term of the
       usual implementation, the exact power from the distribution of r
       (Fisher 1915; Hotelling 1953), and n for an interval of given width.
     Meta-analysis on Fisher's z: fixed effect, DerSimonian–Laird and REML
       random effects, Q, I², H², τ², the prediction interval (Higgins,
       Thompson and Spiegelhalter 2009), Egger's regression test; and the
       bare-bones method of Hunter and Schmidt on r.

   Installs `Inf` in the global object it is given; needs Num. */
function InferCore(g) {
'use strict';
const Num = g.Num;
const { abs, sqrt, log, exp, min, max, tanh, atanh } = Math;
const I = {};
const z2r = z => tanh(z);
const pv = (stat, alt, df) => {
  const up = df ? Num.pt(stat, df, true) : Num.pnorm(stat, true), lo = df ? Num.pt(stat, df) : Num.pnorm(stat);
  return alt === 'greater' ? up : alt === 'less' ? lo : min(1, 2 * min(up, lo));
};

/* ---------------- comparing correlations ---------------- */
I.indep = function (r1, n1, r2, n2, o) {
  o = o || {};
  const alt = o.alt || 'two.sided', zc = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2);
  const z = (atanh(r1) - atanh(r2)) / sqrt(1 / (n1 - 3) + 1 / (n2 - 3));
  const l1 = z2r(atanh(r1) - zc / sqrt(n1 - 3)), u1 = z2r(atanh(r1) + zc / sqrt(n1 - 3)), l2 = z2r(atanh(r2) - zc / sqrt(n2 - 3)), u2 = z2r(atanh(r2) + zc / sqrt(n2 - 3));
  return {
    diff: r1 - r2,
    tests: [{ id: 'fisher1925', es: 'z de Fisher (1925)', en: 'Fisher’s z (1925)', stat: z, dist: 'z', p: pv(z, alt) }],
    zou: [r1 - r2 - sqrt((r1 - l1) ** 2 + (u2 - r2) ** 2), r1 - r2 + sqrt((u1 - r1) ** 2 + (r2 - l2) ** 2)],
  };
};
const Rdet = (a, b, c) => 1 + 2 * a * b * c - a * a - b * b - c * c;
/* r_jk against r_jh, with r_kh between the other two */
I.overlap = function (rjk, rjh, rkh, n, o) {
  o = o || {};
  const alt = o.alt || 'two.sided', zc = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2), T = [];
  const add = (id, es, en, stat, df, extra) => T.push(Object.assign({ id, es, en, stat, dist: df ? 't' : 'z', df, p: pv(stat, alt, df) }, extra || {}));
  const zjk = atanh(rjk), zjh = atanh(rjh);
  { const k = rkh * (1 - rjk * rjk - rjh * rjh) - 0.5 * rjk * rjh * (1 - rjk * rjk - rjh * rjh - rkh * rkh); add('pearson1898', 'z de Pearson y Filon (1898)', 'Pearson and Filon’s z (1898)', sqrt(n) * (rjk - rjh) / sqrt((1 - rjk * rjk) ** 2 + (1 - rjh * rjh) ** 2 - 2 * k)); }
  add('hotelling1940', 't de Hotelling (1940)', 'Hotelling’s t (1940)', (rjk - rjh) * sqrt((n - 3) * (1 + rkh)) / sqrt(2 * Rdet(rjk, rjh, rkh)), n - 3);
  { const rm = (rjk + rjh) / 2; add('williams1959', 't de Williams (1959)', 'Williams’ t (1959)', (rjk - rjh) * sqrt((n - 1) * (1 + rkh) / (2 * ((n - 1) / (n - 3)) * Rdet(rjk, rjh, rkh) + rm * rm * (1 - rkh) ** 3)), n - 3); }
  add('olkin1967', 'z de Olkin (1967)', 'Olkin’s z (1967)', (rjk - rjh) * sqrt(n) / sqrt((1 - rjk * rjk) ** 2 + (1 - rjh * rjh) ** 2 - 2 * rkh ** 3 - (2 * rkh - rjk * rjh) * (1 - rjk * rjk - rjh * rjh - rkh * rkh)));
  { const cov = (rkh * (1 - rjk * rjk - rjh * rjh) - 0.5 * rjk * rjh * (1 - rjk * rjk - rjh * rjh - rkh * rkh)) / ((1 - rjk * rjk) * (1 - rjh * rjh)); add('dunn1969', 'z de Dunn y Clark (1969)', 'Dunn and Clark’s z (1969)', sqrt(n - 3) * (zjk - zjh) / sqrt(2 - 2 * cov)); }
  add('hendrickson1970', 't de Hendrickson, Stanley y Hills (1970)', 'Hendrickson, Stanley and Hills’ t (1970)', (rjk - rjh) * sqrt((n - 3) * (1 + rkh)) / sqrt(2 * Rdet(rjk, rjh, rkh) + (rjk - rjh) ** 2 * (1 - rkh) ** 3 / (4 * (n - 1))), n - 3);
  const viaMean = rp => { const cov = (rkh * (1 - 2 * rp * rp) - 0.5 * rp * rp * (1 - 2 * rp * rp - rkh * rkh)) / (1 - rp * rp) ** 2; return sqrt(n - 3) * (zjk - zjh) / sqrt(2 - 2 * cov); };
  add('steiger1980', 'z de Steiger (1980)', 'Steiger’s z (1980)', viaMean((rjk + rjh) / 2));
  { const r2m = (rjk * rjk + rjh * rjh) / 2; let f = (1 - rkh) / (2 * (1 - r2m)); if (f > 1) f = 1; const h = (1 - f * r2m) / (1 - r2m), zd = zjk - zjh, term = zc * sqrt(2 * (1 - rkh) * h / (n - 3));
    add('meng1992', 'z de Meng, Rosenthal y Rubin (1992)', 'Meng, Rosenthal and Rubin’s z (1992)', zd * sqrt((n - 3) / (2 * (1 - rkh) * h)), null, { ciZ: [zd - term, zd + term] }); }
  add('hittner2003', 'z de Hittner, May y Silver (2003)', 'Hittner, May and Silver’s z (2003)', viaMean(z2r((zjk + zjh) / 2)));
  const x = zc * sqrt(1 / (n - 3)), c = ((rkh - 0.5 * rjk * rjh) * (1 - rjk * rjk - rjh * rjh - rkh * rkh) + rkh ** 3) / ((1 - rjk * rjk) * (1 - rjh * rjh));
  const l1 = z2r(zjk - x), u1 = z2r(zjk + x), l2 = z2r(zjh - x), u2 = z2r(zjh + x);
  return { diff: rjk - rjh, tests: T, zou: [rjk - rjh - sqrt((rjk - l1) ** 2 + (u2 - rjh) ** 2 - 2 * c * (rjk - l1) * (u2 - rjh)), rjk - rjh + sqrt((u1 - rjk) ** 2 + (rjh - l2) ** 2 - 2 * c * (u1 - rjk) * (rjh - l2))] };
};
/* r_jk against r_hm, with the four cross correlations */
I.nonoverlap = function (rjk, rhm, rjh, rjm, rkh, rkm, n, o) {
  o = o || {};
  const alt = o.alt || 'two.sided', zc = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2), T = [];
  const add = (id, es, en, stat) => T.push({ id, es, en, stat, dist: 'z', p: pv(stat, alt) });
  const zjk = atanh(rjk), zhm = atanh(rhm);
  const K = (a, b) => (rjh - a * rkh) * (rkm - rkh * b) + (rjm - rjh * b) * (rkh - a * rjh) + (rjh - rjm * b) * (rkm - a * rjm) + (rjm - a * rkm) * (rkh - rkm * b);
  const k0 = (rjh - rjk * rkh) * (rkm - rkh * rhm) + (rjm - rjh * rhm) * (rkh - rjk * rjh) + (rjh - rjm * rhm) * (rkm - rjk * rjm) + (rjm - rjk * rkm) * (rkh - rkm * rhm);
  add('pearson1898', 'z de Pearson y Filon (1898)', 'Pearson and Filon’s z (1898)', sqrt(n) * (rjk - rhm) / sqrt((1 - rjk * rjk) ** 2 + (1 - rhm * rhm) ** 2 - k0));
  add('dunn1969', 'z de Dunn y Clark (1969)', 'Dunn and Clark’s z (1969)', sqrt(n - 3) * (zjk - zhm) / sqrt(2 - 2 * k0 / (2 * (1 - rjk * rjk) * (1 - rhm * rhm))));
  { const rp = (rjk + rhm) / 2; add('steiger1980', 'z de Steiger (1980)', 'Steiger’s z (1980)', sqrt(n - 3) * (zjk - zhm) / sqrt(2 - 2 * K(rp, rp) / (2 * (1 - rp * rp) ** 2))); }
  add('raghunathan1996', 'z de Raghunathan, Rosenthal y Rubin (1996)', 'Raghunathan, Rosenthal and Rubin’s z (1996)', sqrt((n - 3) / 2) * (zjk - zhm) / sqrt(1 - k0 / (2 * (1 - rjk * rjk) * (1 - rhm * rhm))));
  { const rb = z2r((zjk + zhm) / 2); add('silver2004', 'z de Silver, Hittner y May (2004)', 'Silver, Hittner and May’s z (2004)', sqrt(n - 3) * (zjk - zhm) / sqrt(2 - 2 * K(rb, rb) / (2 * (1 - rb * rb) ** 2))); }
  const c = (0.5 * rjk * rhm * (rjh * rjh + rjm * rjm + rkh * rkh + rkm * rkm) + rjh * rkm + rjm * rkh - (rjk * rjh * rjm + rjk * rkh * rkm + rjh * rkh * rhm + rjm * rkm * rhm)) / ((1 - rjk * rjk) * (1 - rhm * rhm));
  const x = zc * sqrt(1 / (n - 3)), l1 = z2r(zjk - x), u1 = z2r(zjk + x), l2 = z2r(zhm - x), u2 = z2r(zhm + x);
  return { diff: rjk - rhm, tests: T, zou: [rjk - rhm - sqrt((rjk - l1) ** 2 + (u2 - rhm) ** 2 - 2 * c * (rjk - l1) * (u2 - rhm)), rjk - rhm + sqrt((u1 - rjk) ** 2 + (rhm - l2) ** 2 - 2 * c * (u1 - rjk) * (rhm - l2))] };
};

/* ---------------- comparing matrices ---------------- */
const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
/* Jennrich (1970): χ² = ½ tr(Z²) − dg(Z)ᵀ S⁻¹ dg(Z), Z = √c R̄⁻¹(R₁ − R₂), S = I + R̄ ∘ R̄⁻¹ */
I.jennrich = function (R1, R2, n1, n2, o) {
  o = o || {};
  const p = R1.length, c = n1 * n2 / (n1 + n2);
  const R = R1.map((row, i) => row.map((v, j) => (n1 * v + n2 * R2[i][j]) / (n1 + n2)));
  const Ri = g.Mat.inverse(R);
  /* o.square: the variant with S = R̄ ∘ R̄ and tr(ZZᵀ) found in some implementations */
  const S = o.square ? R.map(row => row.map(v => v * v)) : R.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) + v * Ri[i][j]));
  const Si = g.Mat.inverse(S);
  const D = R1.map((row, i) => row.map((v, j) => v - R2[i][j]));
  const Z = mm(Ri, D).map(row => row.map(v => sqrt(c) * v));
  let tr = 0;
  for (let i = 0; i < p; i++) for (let k = 0; k < p; k++) tr += Z[i][k] * (o.square ? Z[i][k] : Z[k][i]);
  const dz = Z.map((row, i) => row[i]);
  let q = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) q += dz[i] * Si[i][j] * dz[j];
  const chi2 = tr / 2 - q, df = p * (p - 1) / 2;
  return { chi2, df, p: Num.pchisq(chi2, df, true) };
};
/* element by element on Fisher's z (Steiger 1980): each difference with variance
   1/(n₁ − 3) + 1/(n₂ − 3), and their sum of squares. The sum is χ² only when the
   correlations are independent of one another (all near zero); with correlated
   variables it rejects too often, so the matrix test is Jennrich's.
   o.harmonic: the variance 1/(ñ − 3), ñ = n₁n₂/(n₁ + n₂), of some implementations. */
I.elementwise = function (R1, R2, n1, n2, o) {
  o = o || {};
  const p = R1.length, v = o.harmonic ? 1 / (n1 * n2 / (n1 + n2) - 3) : 1 / (n1 - 3) + 1 / (n2 - 3), cells = [];
  let s = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < i; j++) {
    const d = atanh(R1[i][j]) - atanh(R2[i][j]), z = d / sqrt(v);
    s += z * z;
    cells.push({ i, j, r1: R1[i][j], r2: R2[i][j], z, p: 2 * Num.pnorm(-abs(z)) });
  }
  const df = p * (p - 1) / 2;
  if (g.Mat && g.Mat.adjust) { const adj = g.Mat.adjust(cells.map(c => c.p), o.adjust || 'holm'); cells.forEach((c, k) => { c.padj = adj[k]; }); }
  return { chi2: s, df, p: Num.pchisq(s, df, true), cells };
};

/* ---------------- corrections ---------------- */
I.attenuation = (r, rxx, ryy) => r / sqrt(rxx * ryy);
/* direct range restriction on x (case II): U = S/s, the unrestricted over the restricted SD */
I.caseII = (r, U) => r * U / sqrt(1 + r * r * (U * U - 1));
/* indirect, through a third variable z (case III) */
I.caseIII = (rxy, rxz, ryz, U) => (rxy + rxz * ryz * (U * U - 1)) / sqrt((1 + rxz * rxz * (U * U - 1)) * (1 + ryz * ryz * (U * U - 1)));

/* ---------------- power and sample size ---------------- */
/* the approximation of the usual implementation: Fisher's z with the bias term r/(2(n − 1)) */
I.powerApprox = function (r, n, alpha, alt) {
  alt = alt || 'two.sided';
  if (alt === 'less') r = -r;
  if (alt === 'two.sided') r = abs(r);
  const t = Num.qt(1 - (alt === 'two.sided' ? alpha / 2 : alpha), n - 2), rc = sqrt(t * t / (t * t + n - 2));
  const zr = atanh(r) + r / (2 * (n - 1)), zrc = atanh(rc);
  return alt === 'two.sided' ? Num.pnorm((zr - zrc) * sqrt(n - 3)) + Num.pnorm((-zr - zrc) * sqrt(n - 3)) : Num.pnorm((zr - zrc) * sqrt(n - 3));
};
/* the exact density of r for a bivariate normal with correlation ρ (Hotelling 1953's form) */
I.densityR = function (r, rho, n) {
  const lg = Num.lgamma;
  const lc = log(n - 2) + lg(n - 1) - 0.5 * log(2 * Math.PI) - lg(n - 0.5) + (n - 1) / 2 * Math.log1p(-rho * rho) + (n - 4) / 2 * Math.log1p(-r * r) - (n - 1.5) * Math.log1p(-rho * r);
  return exp(lc + g.PairStat.log2F1half(n - 0.5, (1 + rho * r) / 2));
};
I.cdfR = function (r, rho, n) {
  if (r <= -1) return 0;
  if (r >= 1) return 1;
  /* on the Fisher scale, where the density is smooth */
  const f = z => { const t = tanh(z); return I.densityR(t, rho, n) * (1 - t * t); };
  return min(1, max(0, g.PairStat.integrate(f, -19, atanh(r), { abs: 0, tol: 1e-12 })));
};
I.powerExact = function (rho, n, alpha, alt) {
  alt = alt || 'two.sided';
  const t = Num.qt(1 - (alt === 'two.sided' ? alpha / 2 : alpha), n - 2), rc = sqrt(t * t / (t * t + n - 2));
  if (alt === 'greater') return 1 - I.cdfR(rc, rho, n);
  if (alt === 'less') return I.cdfR(-rc, rho, n);
  return 1 - I.cdfR(rc, rho, n) + I.cdfR(-rc, rho, n);
};
I.sampleSize = function (r, power, alpha, alt, exact) {
  const pw = n => (exact ? I.powerExact(r, n, alpha, alt) : I.powerApprox(r, n, alpha, alt));
  let n = 4;
  while (n < 100000 && pw(n) < power) n = n < 64 ? n + 1 : Math.ceil(n * 1.05);
  /* back down to the first n that reaches it */
  while (n > 4 && pw(n - 1) >= power) n--;
  return { n, power: pw(n) };
};
I.sampleSizeReal = function (r, power, alpha, alt) {
  let lo = 4 + 1e-9, hi = 8;
  while (I.powerApprox(r, hi, alpha, alt) < power && hi < 1e7) hi *= 2;
  for (let it = 0; it < 200; it++) { const m = (lo + hi) / 2; if (I.powerApprox(r, m, alpha, alt) < power) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
/* n so that the interval of r has half-width ≤ w around a planned r (Fisher's z) */
I.nForWidth = function (r, w, conf) {
  const zc = Num.qnorm(1 - (1 - (conf || 0.95)) / 2);
  for (let n = 5; n < 1e6; n++) { const z = atanh(r), lo = tanh(z - zc / sqrt(n - 3)), hi = tanh(z + zc / sqrt(n - 3)); if ((hi - lo) / 2 <= w) return { n, lo, hi }; }
  return { n: NaN };
};

/* ---------------- meta-analysis ---------------- */
/* studies: [{r, n, name}] → on Fisher's z with v = 1/(n − 3) */
I.meta = function (studies, o) {
  o = o || {};
  const S = studies.filter(s => isFinite(s.r) && isFinite(s.n) && s.n > 3 && abs(s.r) < 1), k = S.length;
  const y = S.map(s => atanh(s.r)), v = S.map(s => 1 / (s.n - 3)), zc = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2);
  const fit = tau2 => {
    const w = v.map(vi => 1 / (vi + tau2)), sw = w.reduce((a, b) => a + b, 0), mu = w.reduce((a, wi, i) => a + wi * y[i], 0) / sw;
    return { w, sw, mu, se: sqrt(1 / sw) };
  };
  const F = fit(0);
  const Q = F.w.reduce((a, wi, i) => a + wi * (y[i] - F.mu) ** 2, 0), df = k - 1;
  const c = F.sw - F.w.reduce((a, wi) => a + wi * wi, 0) / F.sw;
  const tauDL = max(0, (Q - df) / c);
  /* REML: the restricted log-likelihood maximized over τ² ≥ 0 */
  const ll = t2 => { const f = fit(t2); return -0.5 * v.reduce((a, vi) => a + log(vi + t2), 0) - 0.5 * log(f.sw) - 0.5 * f.w.reduce((a, wi, i) => a + wi * (y[i] - f.mu) ** 2, 0); };
  let lo = 0, hi = max(1, 10 * tauDL + 1);
  const gr = (sqrt(5) - 1) / 2;
  let a = lo, b = hi, x1 = b - gr * (b - a), x2 = a + gr * (b - a), f1 = ll(x1), f2 = ll(x2);
  for (let it = 0; it < 300 && b - a > 1e-14; it++) { if (f1 > f2) { b = x2; x2 = x1; f2 = f1; x1 = b - gr * (b - a); f1 = ll(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (b - a); f2 = ll(x2); } }
  let tauREML = (a + b) / 2;
  if (ll(0) >= ll(tauREML)) tauREML = 0;
  else {
    /* polished on the score, ½[Σw²(y − μ)² − Σw + Σw²/Σw] = 0, which the search above
       only brackets to √ε */
    const score = t2 => { const f = fit(t2); let s = 0, w2 = 0; f.w.forEach((wi, i) => { s += wi * wi * (y[i] - f.mu) ** 2; w2 += wi * wi; }); return s - f.sw + w2 / f.sw; };
    let L = tauREML * (1 - 1e-3), U = tauREML * (1 + 1e-3) + 1e-12;
    if (score(L) > 0 && score(U) < 0) { for (let it = 0; it < 200; it++) { const m = (L + U) / 2; if (m <= L || m >= U) break; if (score(m) > 0) L = m; else U = m; } tauREML = (L + U) / 2; }
  }
  const model = (tau2, id, es, en) => {
    const f = fit(tau2), fixed = id === 'FE';
    /* for the fixed effect I² and H² come from Q; for the random effects from τ² and the
       typical within-study variance s² = (k − 1)/c (Higgins and Thompson 2002) */
    const vt = df / c, I2 = fixed ? (df > 0 && Q > 0 ? max(0, (Q - df) / Q) : 0) : tau2 / (tau2 + vt), H2 = fixed ? (df > 0 ? Q / df : NaN) : (tau2 + vt) / vt;
    const pi = [f.mu - zc * sqrt(f.se * f.se + tau2), f.mu + zc * sqrt(f.se * f.se + tau2)];
    return { id, es, en, tau2, mu: f.mu, se: f.se, z: f.mu / f.se, p: 2 * Num.pnorm(-abs(f.mu / f.se)), ci: [f.mu - zc * f.se, f.mu + zc * f.se], r: tanh(f.mu), rci: [tanh(f.mu - zc * f.se), tanh(f.mu + zc * f.se)], rpi: pi.map(tanh), I2, H2, weights: f.w.map(w => w / f.sw) };
  };
  const out = { k, Q, df, pQ: Num.pchisq(Q, df, true), y, v, studies: S, I2: df > 0 ? max(0, (Q - df) / Q) : 0 };
  out.fixed = model(0, 'FE', 'Efecto fijo', 'Fixed effect');
  out.dl = model(tauDL, 'DL', 'Aleatorio (DerSimonian–Laird)', 'Random (DerSimonian–Laird)');
  out.reml = model(tauREML, 'REML', 'Aleatorio (REML)', 'Random (REML)');
  /* Hunter and Schmidt's τ² on the z scale: (Q − k)/Σw */
  out.hsz = model(max(0, (Q - k) / F.sw), 'HS', 'Aleatorio (Hunter–Schmidt)', 'Random (Hunter–Schmidt)');
  /* Egger (1997): standardized effect on precision, the intercept tested with t on k − 2 df */
  if (k >= 3) {
    const se = v.map(Math.sqrt), Y = y.map((yi, i) => yi / se[i]), X = se.map(s => 1 / s);
    const mx = Num.mean(X), my = Num.mean(Y);
    let sxx = 0, sxy = 0;
    for (let i = 0; i < k; i++) { sxx += (X[i] - mx) ** 2; sxy += (X[i] - mx) * (Y[i] - my); }
    const b1 = sxy / sxx, b0 = my - b1 * mx;
    let rss = 0;
    for (let i = 0; i < k; i++) rss += (Y[i] - b0 - b1 * X[i]) ** 2;
    const s2 = rss / (k - 2), seb0 = sqrt(s2 * (1 / k + mx * mx / sxx)), t = b0 / seb0;
    out.egger = { intercept: b0, se: seb0, t, df: k - 2, p: 2 * Num.pt(-abs(t), k - 2), slope: b1, X, Y };
  }
  /* Hunter and Schmidt, bare bones on r: the sampling-error variance study by
     study, Σ nᵢ(1 − r̄²)²/(nᵢ − 1) / N, and the credibility interval (80 % by
     their custom) from the residual variance */
  const N = S.reduce((a, s) => a + s.n, 0), rbar = S.reduce((a, s) => a + s.n * s.r, 0) / N;
  const varr = S.reduce((a, s) => a + s.n * (s.r - rbar) ** 2, 0) / N;
  const vare = S.reduce((a, s) => a + s.n * (1 - rbar * rbar) ** 2 / (s.n - 1), 0) / N;
  const varRes = varr - vare, sdRho = sqrt(max(0, varRes)), zcr = Num.qnorm(1 - (1 - (o.cred || 0.8)) / 2);
  out.hs = { rbar, N, varr, vare, varRes, sdRho, pctExplained: varr > 0 ? min(100, 100 * vare / varr) : 100, cred: [rbar - zcr * sdRho, rbar + zcr * sdRho], credLevel: o.cred || 0.8 };
  return out;
};

g.Infer = I;
return I;
}
if (typeof window !== 'undefined') InferCore(window);
