/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 4, the engine of one pair in depth.

     Resampling. The nonparametric bootstrap of pairs (Efron 1979) with four
       intervals: normal, basic, percentile and BCa (Efron 1987), the last
       with the bias correction z₀ = Φ⁻¹(#{θ* < θ̂}/B) and the acceleration
       a = ΣL³ / (6 (ΣL²)^{3/2}) from the jackknife influence values
       L = (n − 1)(θ̂ − θ₍ᵢ₎) (Davison and Hinkley 1997, §2.7.3 and §5.3; the
       version of Efron and Tibshirani centres them on the jackknife mean
       instead, a difference of the order of 1/n in a); the order statistics
       are interpolated on the normal scale (Davison and Hinkley 1997, eq. 5.8). The permutation test
       (Pitman 1937) with p = (k + 1)/(B + 1).
     Bayes. The default Bayes factor of Jeffreys for Pearson's ρ in the exact
       form of Ly, Verhagen and Wagenmakers (2016): the likelihood of ρ given
       r and n, with the means and variances integrated out under Jeffreys'
       priors, is proportional to
         (1 − ρ²)^{(n−1)/2} (1 − ρr)^{3/2 − n} ₂F₁(½, ½; n − ½; (1 + ρr)/2),
       and the prior on ρ is a beta(1/κ, 1/κ) stretched to (−1, 1); the
       evidence and the posterior are integrated numerically (adaptive
       Gauss–Kronrod on ζ = atanh ρ), one- and two-sided.
     Words. The size of a correlation by three published scales (Cohen 1988;
       Evans 1996; Gignac and Szodorai 2016) and the evidence of a Bayes
       factor by Jeffreys' categories (as given by Lee and Wagenmakers 2013).

   Installs `PairStat` in the global object it is given; needs Num and Coef. */
function PairStatCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, exp, min, max, floor, tanh, log1p } = Math;
const PS = {};

/* ---------------- numerical integration ---------------- */
/* Gauss–Kronrod 7–15 nodes and weights (the classical tables) */
const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975,
  0.417959183673469387755102040816327];
function gk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2, fc = f(c);
  let K = fc * WGK[7], G = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const d = h * XGK[j], s = f(c - d) + f(c + d);
    K += WGK[j] * s;
    if (j % 2 === 1) G += WG[(j - 1) / 2] * s;
  }
  return { K: K * h, err: abs((K - G) * h) };
}
/* globally adaptive: the piece with the largest error is halved until the
   summed error is below max(abs, rel·|integral|), at most «limit» pieces */
PS.integrate = function (f, a, b, o) {
  o = o || {};
  const rel = o.tol || 1e-12, absTol = o.abs == null ? 1e-15 : o.abs, limit = o.limit || 2000;
  const parts = [Object.assign({ a, b }, gk15(f, a, b))];
  let K = parts[0].K, E = parts[0].err;
  while (E > Math.max(absTol, rel * abs(K)) && parts.length < limit) {
    let w = 0;
    for (let i = 1; i < parts.length; i++) if (parts[i].err > parts[w].err) w = i;
    const p = parts[w], m = (p.a + p.b) / 2;
    if (m <= p.a || m >= p.b) break;
    const L = Object.assign({ a: p.a, b: m }, gk15(f, p.a, m)), R = Object.assign({ a: m, b: p.b }, gk15(f, m, p.b));
    K += L.K + R.K - p.K; E += L.err + R.err - p.err;
    parts[w] = L; parts.push(R);
  }
  return K;
};

/* ---------------- ₂F₁(½, ½; c; z) for 0 ≤ z < 1 ----------------
   Its series; near z = 1 with small c, the linear transformation to 1 − z
   (Abramowitz and Stegun 1964, 15.3.6), valid because c − 1 is not an integer
   (c = n − ½). Returns the logarithm. */
function series(a, b, c, z) {
  let t = 1, s = 1;
  for (let k = 0; k < 100000; k++) {
    t *= (a + k) * (b + k) / ((c + k) * (k + 1)) * z;
    s += t;
    if (abs(t) <= 1e-17 * abs(s)) break;
  }
  return s;
}
const LG = Num.lgamma, LPI = log(Math.PI);
const gammaSign = x => (x > 0 ? 1 : (floor(-x) % 2 === 0 ? -1 : 1));
PS.log2F1half = function (c, z) {
  if (z <= 0.75 || c >= 20) return log(series(0.5, 0.5, c, z));
  const w = 1 - z;
  const A = exp(LG(c) + LG(c - 1) - 2 * LG(c - 0.5));
  const B = gammaSign(1 - c) * exp(LG(c) + LG(1 - c) - LPI) * Math.pow(w, c - 1);
  return log(A * series(0.5, 0.5, 2 - c, w) + B * series(c - 0.5, c - 0.5, c, w));
};

/* ---------------- the Bayes factor of Pearson's ρ ---------------- */
PS.logLik = function (rho, r, n) {
  return (n - 1) / 2 * log1p(-rho * rho) + (1.5 - n) * log1p(-rho * r) + PS.log2F1half(n - 0.5, (1 + rho * r) / 2);
};
PS.logPrior = function (rho, kappa) {
  const a = 1 / kappa;
  return (1 - 2 * a) * Math.LN2 - Num.lbeta(a, a) + (a - 1) * log1p(-rho * rho);
};
/* the logarithm of ∫ exp(li) over [a, b]: the integrand is scaled by its own
   maximum on the interval (a scan and a ternary refinement), so that even a
   side that holds 10⁻³⁰⁰ of the mass is integrated to full relative precision */
function logIntegral(li, a, b, sd) {
  let zBest = a, M = -Infinity;
  for (let i = 0; i <= 1000; i++) { const z = a + (b - a) * i / 1000, v = li(z); if (v > M) { M = v; zBest = z; } }
  let lo = Math.max(a, zBest - (b - a) / 1000), hi = Math.min(b, zBest + (b - a) / 1000);
  for (let it = 0; it < 80; it++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (li(m1) < li(m2)) lo = m1; else hi = m2; }
  const zm = (lo + hi) / 2;
  if (li(zm) > M) { M = li(zm); zBest = zm; }
  const f = z => exp(li(z) - M);
  const cuts = [a, zBest - 12 * sd, zBest - 4 * sd, zBest - sd, zBest, zBest + sd, zBest + 4 * sd, zBest + 12 * sd, b].filter(z => z >= a && z <= b).sort((u, v) => u - v);
  let s = 0;
  for (let i = 0; i + 1 < cuts.length; i++) if (cuts[i + 1] > cuts[i]) s += PS.integrate(f, cuts[i], cuts[i + 1], { abs: 0 });
  return { log: log(s) + M, at: zBest, max: M };
}
const lse = (u, v) => (u > v ? u + log1p(exp(v - u)) : v + log1p(exp(u - v)));
/* o: {kappa (default 1/3), level}; returns BF10, BF+0, BF−0 (and their
   logarithms), the posterior median, mean and central credible interval,
   and the prior and posterior curves */
PS.bayes = function (r, n, o) {
  o = o || {};
  const kappa = o.kappa || 1 / 3, level = o.level || 0.95;
  if (!(n >= 3) || !isFinite(r)) return null;
  const rr = Math.max(-1 + 1e-15, Math.min(1 - 1e-15, r));
  const ZMAX = 18.5, sd = 1 / sqrt(Math.max(1, n - 1));
  /* the log integrand on ζ = atanh ρ (the Jacobian 1 − ρ² included) */
  const li = z => { const rho = tanh(z); return PS.logLik(rho, rr, n) + PS.logPrior(rho, kappa) + log1p(-rho * rho); };
  const N = logIntegral(li, -ZMAX, 0, sd), P = logIntegral(li, 0, ZMAX, sd);
  const LI = lse(N.log, P.log), l0 = PS.logLik(0, rr, n);
  const out = { r, n, kappa, logBF10: LI - l0, logBFplus: Math.LN2 + P.log - l0, logBFminus: Math.LN2 + N.log - l0 };
  out.BF10 = exp(out.logBF10); out.BF01 = exp(-out.logBF10);
  out.BFplus = exp(out.logBFplus); out.BFminus = exp(out.logBFminus);
  /* the posterior: a grid of ζ over the region that holds it, then Newton on the exact cdf */
  const M = Math.max(N.max, P.max), zTop = N.max > P.max ? N.at : P.at;
  const f = z => exp(li(z) - M), tot = exp(LI - M);
  let za = zTop, zb = zTop;
  const step = Math.min(sd, 0.05) * 2;
  while (za > -ZMAX && li(za) - M > -45) za -= step;
  while (zb < ZMAX && li(zb) - M > -45) zb += step;
  za = Math.max(-ZMAX, za); zb = Math.min(ZMAX, zb);
  const K = 4000, h = (zb - za) / K, cdf = new Float64Array(K + 1), zs = new Float64Array(K + 1), fs = new Float64Array(K + 1);
  for (let i = 0; i <= K; i++) { zs[i] = za + i * h; fs[i] = f(zs[i]); }
  for (let i = 1; i <= K; i++) cdf[i] = cdf[i - 1] + (fs[i - 1] + fs[i]) * h / 2;
  const cdfAt = z => { const cuts = [za, zTop - 4 * sd, zTop, zTop + 4 * sd, z].filter(c => c >= za && c <= z).sort((u, v) => u - v); let s = 0; for (let i = 0; i + 1 < cuts.length; i++) if (cuts[i + 1] > cuts[i]) s += PS.integrate(f, cuts[i], cuts[i + 1], { abs: 0 }); return s / tot; };
  const q = p => {
    const t = p * cdf[K];
    let i = 1;
    while (i < K && cdf[i] < t) i++;
    const u = (t - cdf[i - 1]) / ((cdf[i] - cdf[i - 1]) || 1);
    let z = zs[i - 1] + u * h;
    for (let it = 0; it < 3; it++) { const d = (cdfAt(z) - p) * tot / f(z); if (!isFinite(d)) break; z -= d; if (abs(d) < 1e-12) break; }
    return tanh(z);
  };
  let mean = 0;
  for (let i = 1; i <= K; i++) mean += (tanh(zs[i - 1]) * fs[i - 1] + tanh(zs[i]) * fs[i]) * h / 2;
  out.post = { median: q(0.5), mean: mean / cdf[K], lo: q((1 - level) / 2), hi: q((1 + level) / 2), level, mode: tanh(zTop) };
  /* curves on ρ for the figure: prior and posterior densities */
  const curve = [], LP = LI;
  for (let i = 1; i < 400; i++) {
    const rho = -1 + 2 * i / 400;
    curve.push([rho, exp(PS.logPrior(rho, kappa)), exp(PS.logLik(rho, rr, n) + PS.logPrior(rho, kappa) - LP)]);
  }
  out.curve = curve;
  out.priorAt0 = exp(PS.logPrior(0, kappa));
  out.postAt0 = exp(PS.logLik(0, rr, n) + PS.logPrior(0, kappa) - LP);
  return out;
};
/* Jeffreys' categories of evidence (as tabulated by Lee and Wagenmakers 2013) */
PS.evidence = function (bf) {
  const b = bf >= 1 ? bf : 1 / bf, side = bf >= 1 ? 1 : 0;
  const lv = b < 1.0000001 ? 0 : b < 3 ? 1 : b < 10 ? 2 : b < 30 ? 3 : b < 100 ? 4 : 5;
  const words = [['ninguna', 'none'], ['anecdótica', 'anecdotal'], ['moderada', 'moderate'], ['fuerte', 'strong'], ['muy fuerte', 'very strong'], ['extrema', 'extreme']];
  return { level: lv, favours: lv === 0 ? 'none' : side ? 'h1' : 'h0', es: words[lv][0], en: words[lv][1] };
};

/* ---------------- bootstrap ---------------- */
/* interpolation of the order statistics on the normal scale: the
   (B + 1)α-th order statistic, between neighbours by Φ⁻¹ */
PS.normInter = function (sorted, alpha) {
  const R = sorted.length, rk = (R + 1) * alpha, k = floor(rk);
  if (k <= 0) return sorted[0];
  if (k >= R) return sorted[R - 1];
  if (k === rk) return sorted[k - 1];
  const t1 = Num.qnorm(alpha), t2 = Num.qnorm(k / (R + 1)), t3 = Num.qnorm((k + 1) / (R + 1));
  const a = sorted[k - 1], b = sorted[k];
  return a + (t1 - t2) / (t3 - t2) * (b - a);
};
/* the resampled values of a statistic of (x, y); NaN replicates (e.g. a
   constant resample) are dropped and counted */
PS.resample = function (stat, x, y, o) {
  o = o || {};
  const n = x.length, B = o.B || 1999, rnd = Num.rng(o.seed == null ? 1 : o.seed);
  const xb = new Float64Array(n), yb = new Float64Array(n), reps = [];
  let bad = 0;
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < n; i++) { const j = rnd.int(n); xb[i] = x[j]; yb[i] = y[j]; }
    const v = stat(xb, yb);
    if (isFinite(v)) reps.push(v); else bad++;
    if (o.progress && b % 200 === 0) o.progress(b / B);
  }
  return { reps: Float64Array.from(reps), bad, B, seed: o.seed == null ? 1 : o.seed };
};
PS.jackknife = function (stat, x, y) {
  const n = x.length, xj = new Float64Array(n - 1), yj = new Float64Array(n - 1), t = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 0; j < n; j++) if (j !== i) { xj[k] = x[j]; yj[k] = y[j]; k++; }
    t[i] = stat(xj, yj);
  }
  return t;
};
/* the four intervals from the replicates; level and alternative as in Coef */
PS.intervals = function (t0, reps, o) {
  o = o || {};
  const level = o.level || 0.95, alt = o.alt || 'two.sided';
  const s = Float64Array.from(reps).sort(), R = s.length;
  /* the tail probabilities of the lower and upper bounds (null: no bound on that side) */
  const a2 = alt === 'two.sided' ? [(1 - level) / 2, (1 + level) / 2] : alt === 'greater' ? [1 - level, null] : [null, level];
  const mean = Num.mean(s), se = Num.sd(s), bias = mean - t0;
  const out = { t0, R, mean, se, bias, level, alt };
  const z = Num.qnorm(alt === 'two.sided' ? (1 + level) / 2 : level);
  const side = (lo, hi) => [alt === 'less' ? -1 : lo, alt === 'greater' ? 1 : hi];
  out.normal = side(t0 - bias - z * se, t0 - bias + z * se);
  const qa = a2.map(a => (a == null ? null : PS.normInter(s, a)));
  out.percentile = side(qa[0], qa[1]);
  /* basic: 2θ̂ minus the opposite quantile */
  out.basic = side(a2[0] == null ? null : 2 * t0 - PS.normInter(s, 1 - a2[0]), a2[1] == null ? null : 2 * t0 - PS.normInter(s, 1 - a2[1]));
  if (o.jack) {
    let below = 0;
    for (let i = 0; i < R; i++) if (s[i] < t0) below++;
    const z0 = Num.qnorm(below / R);
    const n = o.jack.length;
    let s2 = 0, s3 = 0;
    for (let i = 0; i < n; i++) { const L = (n - 1) * (t0 - o.jack[i]); s2 += L * L; s3 += L * L * L; }
    const acc = s2 > 0 ? s3 / (6 * Math.pow(s2, 1.5)) : 0;
    out.z0 = z0; out.acc = acc;
    if (isFinite(z0)) {
      const adj = a => { if (a == null) return null; const za = Num.qnorm(a); return Num.pnorm(z0 + (z0 + za) / (1 - acc * (z0 + za))); };
      const aa = a2.map(adj);
      out.bcaAlpha = aa;
      out.bca = side(aa[0] == null ? null : PS.normInter(s, aa[0]), aa[1] == null ? null : PS.normInter(s, aa[1]));
    }
  }
  /* bounded coefficients: an interval never leaves [−1, 1] */
  if (o.bounded) ['normal', 'basic', 'percentile', 'bca'].forEach(k => { if (out[k]) out[k] = out[k].map(v => Math.max(-1, Math.min(1, v))); });
  return out;
};
PS.bootstrap = function (stat, x, y, o) {
  o = o || {};
  const t0 = stat(x, y), rs = PS.resample(stat, x, y, o);
  const jack = o.bca === false ? null : PS.jackknife(stat, x, y);
  const iv = PS.intervals(t0, rs.reps, { level: o.level, alt: o.alt, jack, bounded: o.bounded !== false });
  return Object.assign(iv, { reps: rs.reps, bad: rs.bad, B: rs.B, seed: rs.seed, jack });
};

/* ---------------- permutation ---------------- */
PS.permute = function (stat, x, y, o) {
  o = o || {};
  const n = x.length, B = o.B || 1999, rnd = Num.rng(o.seed == null ? 1 : o.seed), alt = o.alt || 'two.sided';
  const t0 = stat(x, y), yp = Float64Array.from(y), reps = new Float64Array(B);
  let ge = 0, le = 0, ab = 0;
  const eps = 1e-12 * Math.max(1, abs(t0));
  for (let b = 0; b < B; b++) {
    rnd.shuffle(yp);
    const v = stat(x, yp);
    reps[b] = v;
    if (v >= t0 - eps) ge++;
    if (v <= t0 + eps) le++;
    if (abs(v) >= abs(t0) - eps) ab++;
  }
  const p = { 'two.sided': (ab + 1) / (B + 1), greater: (ge + 1) / (B + 1), less: (le + 1) / (B + 1) };
  return { t0, reps, B, seed: o.seed == null ? 1 : o.seed, p: p[alt], pAll: p, alt, n };
};

/* ---------------- the size of a correlation, in words ---------------- */
PS.SCALES = {
  cohen: { es: 'Cohen (1988)', en: 'Cohen (1988)', cuts: [0.1, 0.3, 0.5], words: [['despreciable', 'negligible'], ['pequeña', 'small'], ['mediana', 'medium'], ['grande', 'large']], ref: 'cohen1988' },
  evans: { es: 'Evans (1996)', en: 'Evans (1996)', cuts: [0.2, 0.4, 0.6, 0.8], words: [['muy débil', 'very weak'], ['débil', 'weak'], ['moderada', 'moderate'], ['fuerte', 'strong'], ['muy fuerte', 'very strong']], ref: 'evans1996' },
  gignac: { es: 'Gignac y Szodorai (2016)', en: 'Gignac and Szodorai (2016)', cuts: [0.1, 0.2, 0.3], words: [['muy pequeña', 'very small'], ['pequeña', 'small'], ['típica', 'typical'], ['grande', 'large']], ref: 'gignac2016' },
};
PS.size = function (r, scale) {
  const S = PS.SCALES[scale || 'cohen'], a = abs(r);
  let k = 0;
  while (k < S.cuts.length && a >= S.cuts[k]) k++;
  return { k, es: S.words[k][0], en: S.words[k][1] };
};

g.PairStat = PS;
return PS;
}
if (typeof window !== 'undefined') PairStatCore(window);
