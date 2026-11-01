/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — coefficients of two variables.

   Each coefficient returns the same kind of object:
     { id, est, n, stat: {name, value, df}, p, alt, ci: {lo, hi, level, method},
       conv: [[es, en], …], extra }
   `conv` says, in words, which convention was followed wherever the
   literature (and the programs that implement it) disagree — ties, exact or
   approximate p-values, the scale of a statistic. The interface prints it
   next to the result, so a number is never left without its definition.

   Missing pairs are dropped first (complete pairs). Alternatives: 'two.sided',
   'greater' (positive association), 'less' (negative association).

   Wrapped in a named function so that a Web Worker can be built from its own
   source text. Needs Num (num.js) in the same global. */
function CoefCore(g) {
'use strict';
const Num = g.Num;
const { abs, sqrt, min, max, floor, sign, tanh } = Math;
const Coef = {};

/* ---------------- helpers ---------------- */
Coef.complete = function (x, y) {
  const xs = [], ys = [];
  const n = min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    const a = +x[i], b = +y[i];
    if (x[i] !== null && y[i] !== null && x[i] !== '' && y[i] !== '' && isFinite(a) && isFinite(b)) { xs.push(a); ys.push(b); }
  }
  return [Float64Array.from(xs), Float64Array.from(ys)];
};
const altOf = o => (o && o.alt) || 'two.sided';
const confOf = o => (o && o.conf) || 0.95;
/* p-value of a statistic with a symmetric reference distribution, given the
   two tail probabilities */
function pAlt(alt, pUpper, pLower) {
  if (alt === 'greater') return pUpper;
  if (alt === 'less') return pLower;
  return min(1, 2 * min(pUpper, pLower));
}
/* Fisher's z interval for a correlation, with a chosen standard error */
function fisherCI(r, se, alt, conf, method) {
  if (!(se > 0) || !isFinite(se) || abs(r) >= 1) return { lo: NaN, hi: NaN, level: conf, method };
  const z = Num.atanh(r);
  if (alt === 'greater') return { lo: tanh(z - Num.qnorm(conf) * se), hi: 1, level: conf, method };
  if (alt === 'less') return { lo: -1, hi: tanh(z + Num.qnorm(conf) * se), level: conf, method };
  const q = Num.qnorm((1 + conf) / 2);
  return { lo: tanh(z - q * se), hi: tanh(z + q * se), level: conf, method };
}
Coef.fisherCI = fisherCI;
function clip1(r) { return r > 1 ? 1 : r < -1 ? -1 : r; }
function tTest(r, df, alt) {
  const t = r * sqrt(df / (1 - r * r));
  const tt = abs(r) >= 1 ? (r > 0 ? Infinity : -Infinity) : t;
  return { stat: { name: 't', value: tt, df }, p: pAlt(alt, Num.pt(tt, df, true), Num.pt(tt, df)) };
}
/* Pearson's r of two arrays (two passes: means first) */
function rawPearson(x, y) {
  const n = x.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxx += a * a; syy += b * b; sxy += a * b; }
  if (sxx === 0 || syy === 0) return NaN;
  return clip1(sxy / sqrt(sxx * syy));
}
Coef.rawPearson = rawPearson;
const out = (id, est, n, extra) => Object.assign({ id, est, n, stat: null, p: NaN, alt: 'two.sided', ci: null, conv: [] }, extra || {});
const constantNote = ['Una de las dos variables es constante: la correlación no está definida.', 'One of the two variables is constant: the correlation is undefined.'];

/* ---------------- Pearson ---------------- */
Coef.pearson = function (x0, y0, o) {
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), conf = confOf(o);
  const r = n >= 2 ? rawPearson(x, y) : NaN;
  const res = out('pearson', r, n, { alt });
  if (!isFinite(r)) { res.conv.push(constantNote); return res; }
  if (n > 2) Object.assign(res, tTest(r, n - 2, alt));
  if (n > 3) res.ci = fisherCI(r, 1 / sqrt(n - 3), alt, conf, 'fisher');
  res.conv.push(['Prueba t con n − 2 grados de libertad; intervalo por la transformación z de Fisher con error 1/√(n − 3).',
    't test with n − 2 degrees of freedom; interval by Fisher’s z transformation with standard error 1/√(n − 3).']);
  return res;
};

/* ---------------- Spearman ----------------
   ρ = Pearson's r of the average ranks. Its test:
     · without ties and n < 1290: the exact distribution of S = Σd²
       (enumerated for n ≤ 9, Edgeworth series of AS 89 beyond), as the
       classical tables;
     · with ties or larger n: the t approximation with n − 2 df.
   Interval: Fisher's z with the variance 1.06/(n − 3) of Fieller, Hartley and
   Pearson (1957) by default; 'fisher' (1/(n − 3)) and 'bonett' (Bonett and
   Wright 2000: (1 + ρ²/2)/(n − 3)) on request. */
Coef.spearman = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), conf = confOf(o);
  const rx = Num.rank(x), ry = Num.rank(y);
  const rho = n >= 2 ? rawPearson(rx, ry) : NaN;
  const res = out('spearman', rho, n, { alt });
  if (!isFinite(rho)) { res.conv.push(constantNote); return res; }
  const ties = Num.tieGroups(x).length + Num.tieGroups(y).length > 0;
  const useExact = o.exact === false ? false : (!ties && n < 1290 && n > 2);
  if (useExact) {
    const S = Math.round((n * n * n - n) * (1 - rho) / 6);
    const pUp = Num.pSpearmanLower(S, n);   /* ρ large ⇔ S small */
    const pLo = Num.pSpearmanUpper(S, n);
    res.stat = { name: 'S', value: S };
    res.p = pAlt(alt, pUp, pLo);
    res.conv.push(n <= 9
      ? ['Valor p exacto: distribución de S = Σd² enumerada sobre las n! permutaciones.', 'Exact p-value: distribution of S = Σd² enumerated over the n! permutations.']
      : ['Valor p de la distribución de S = Σd² por la serie de Edgeworth (algoritmo AS 89 de Best y Roberts 1975).', 'p-value from the distribution of S = Σd² by the Edgeworth series (algorithm AS 89, Best and Roberts 1975).']);
  } else if (n > 2) {
    Object.assign(res, tTest(rho, n - 2, alt));
    res.conv.push([ties ? 'Hay empates: valor p por la aproximación t con n − 2 grados de libertad (la distribución exacta supone rangos sin empates).'
      : 'Valor p por la aproximación t con n − 2 grados de libertad.',
    ties ? 'There are ties: p-value by the t approximation with n − 2 degrees of freedom (the exact distribution assumes untied ranks).'
      : 'p-value by the t approximation with n − 2 degrees of freedom.']);
  }
  const ciM = o.ci || 'fieller';
  if (n > 3) {
    const se = ciM === 'fisher' ? 1 / sqrt(n - 3) : ciM === 'bonett' ? sqrt((1 + rho * rho / 2) / (n - 3)) : sqrt(1.06 / (n - 3));
    res.ci = fisherCI(rho, se, alt, conf, ciM);
    res.conv.push(ciM === 'fieller' ? ['Intervalo por z de Fisher con la varianza 1.06/(n − 3) de Fieller, Hartley y Pearson (1957).', 'Interval by Fisher’s z with the variance 1.06/(n − 3) of Fieller, Hartley and Pearson (1957).']
      : ciM === 'bonett' ? ['Intervalo por z de Fisher con la varianza (1 + ρ²/2)/(n − 3) de Bonett y Wright (2000).', 'Interval by Fisher’s z with the variance (1 + ρ²/2)/(n − 3) of Bonett and Wright (2000).']
        : ['Intervalo por z de Fisher con la varianza 1/(n − 3) de Pearson.', 'Interval by Fisher’s z with Pearson’s variance 1/(n − 3).']);
  }
  return res;
};

/* ---------------- concordance counts (Knight 1966) ----------------
   Sort by x (then y), count the pairs tied in x (n1) and tied in both (n3),
   then sort y by merging and count the exchanges, which are the discordant
   pairs; the ties in y (n2) are counted on the sorted y. O(n log n). */
Coef.concordance = function (x, y) {
  const n = x.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((i, j) => (x[i] - x[j]) || (y[i] - y[j]));
  let n1 = 0, n3 = 0, t = 0, u = 0;
  for (let i = 1; i <= n; i++) {
    const sameX = i < n && x[idx[i]] === x[idx[i - 1]];
    if (sameX) t++; else { n1 += t * (t + 1) / 2; t = 0; }
    if (sameX && y[idx[i]] === y[idx[i - 1]]) u++; else { n3 += u * (u + 1) / 2; u = 0; }
  }
  let a = Float64Array.from(idx, i => y[i]), b = new Float64Array(n), swaps = 0;
  for (let w = 1; w < n; w *= 2) {
    for (let lo = 0; lo < n; lo += 2 * w) {
      const mid = min(lo + w, n), hi = min(lo + 2 * w, n);
      let i = lo, j = mid, k = lo;
      while (i < mid && j < hi) {
        if (a[i] <= a[j]) b[k++] = a[i++];
        else { b[k++] = a[j++]; swaps += mid - i; }
      }
      while (i < mid) b[k++] = a[i++];
      while (j < hi) b[k++] = a[j++];
    }
    const tmp = a; a = b; b = tmp;
  }
  let n2 = 0; t = 0;
  for (let i = 1; i <= n; i++) { if (i < n && a[i] === a[i - 1]) t++; else { n2 += t * (t + 1) / 2; t = 0; } }
  const n0 = n * (n - 1) / 2, D = swaps, C = n0 - n1 - n2 + n3 - D;
  return { n, n0, n1, n2, n3, C, D };
};
function distinct(a) { return new Set(a).size; }

/* ---------------- Kendall ----------------
   τa = (C − D)/n0; τb = (C − D)/√((n0 − n1)(n0 − n2)) (the default, it is τa
   when there are no ties); τc (Stuart 1953) = 2m(C − D)/(n²(m − 1)), m the
   smaller number of distinct values. Test of the count S = C − D:
     · without ties and n < 50: exact (Mahonian distribution of the inversions);
     · otherwise: normal with Kendall's variance corrected for ties (Kendall
       1970, eq. 4.4), with an optional continuity correction. */
Coef.kendall = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), conf = confOf(o);
  const res = out('kendall', NaN, n, { alt });
  if (n < 2) return res;
  const k = Coef.concordance(x, y);
  const S = k.C - k.D, dx = k.n0 - k.n1, dy = k.n0 - k.n2;
  if (dx === 0 || dy === 0) { res.conv.push(constantNote); return res; }
  const tb = S / sqrt(dx * dy);
  const m = min(distinct(x), distinct(y));
  const kind = o.variant || 'b';
  const est = kind === 'a' ? S / k.n0 : kind === 'c' ? (m > 1 ? 2 * m * S / (n * n * (m - 1)) : NaN) : tb;
  res.est = clip1(est);
  res.extra = { C: k.C, D: k.D, S, tauA: S / k.n0, tauB: tb, tauC: m > 1 ? 2 * m * S / (n * n * (m - 1)) : NaN, ties: { x: k.n1, y: k.n2, both: k.n3 } };
  const ties = k.n1 > 0 || k.n2 > 0;
  const useExact = o.exact === false ? false : (!ties && n < 50);
  if (useExact) {
    const T = k.C;
    const pUp = Num.pKendallConcordant(T, n, true), pLo = Num.pKendallConcordant(T, n);
    res.stat = { name: 'T', value: T };
    res.p = pAlt(alt, pUp, pLo);
    res.conv.push(['Valor p exacto: distribución del número de pares concordantes sin empates (n < 50).',
      'Exact p-value: distribution of the number of concordant pairs without ties (n < 50).']);
  } else if (n > 2) {
    const tx = Num.tieGroups(x), ty = Num.tieGroups(y);
    const sum = (a, f) => a.reduce((s, t) => s + f(t), 0);
    const v0 = n * (n - 1) * (2 * n + 5);
    const vt = sum(tx, t => t * (t - 1) * (2 * t + 5)), vu = sum(ty, t => t * (t - 1) * (2 * t + 5));
    const v1 = sum(tx, t => t * (t - 1)) * sum(ty, t => t * (t - 1));
    const v2 = sum(tx, t => t * (t - 1) * (t - 2)) * sum(ty, t => t * (t - 1) * (t - 2));
    const varS = (v0 - vt - vu) / 18 + v1 / (2 * n * (n - 1)) + v2 / (9 * n * (n - 1) * (n - 2));
    let num = S;
    if (o.continuity) num = sign(S) * max(0, abs(S) - 1);
    const z = num / sqrt(varS);
    res.stat = { name: 'z', value: z };
    res.p = pAlt(alt, Num.pnorm(z, true), Num.pnorm(z));
    res.conv.push([ties ? 'Hay empates: valor p normal con la varianza de S corregida por empates (Kendall 1970).' : 'Valor p normal con la varianza de S de Kendall.',
      ties ? 'There are ties: normal p-value with the variance of S corrected for ties (Kendall 1970).' : 'Normal p-value with Kendall’s variance of S.']);
    if (o.continuity) res.conv.push(['Con corrección por continuidad (|S| − 1).', 'With continuity correction (|S| − 1).']);
  }
  if (n > 4 && kind === 'b') {
    res.ci = fisherCI(res.est, sqrt(0.437 / (n - 4)), alt, conf, 'fieller');
    res.conv.push(['Intervalo por z de Fisher con la varianza 0.437/(n − 4) de Fieller, Hartley y Pearson (1957).', 'Interval by Fisher’s z with the variance 0.437/(n − 4) of Fieller, Hartley and Pearson (1957).']);
  }
  return res;
};
/* Goodman and Kruskal's γ = (C − D)/(C + D): ignores every tied pair */
Coef.gamma = function (x0, y0) {
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const k = Coef.concordance(x, y);
  return out('gamma', (k.C + k.D) ? (k.C - k.D) / (k.C + k.D) : NaN, n, { extra: { C: k.C, D: k.D } });
};
/* Somers' d of Y given X: (C − D) over the pairs not tied in X */
Coef.somers = function (x0, y0, o) {
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const k = Coef.concordance(x, y);
  const yx = (k.n0 - k.n1) ? (k.C - k.D) / (k.n0 - k.n1) : NaN;
  const xy = (k.n0 - k.n2) ? (k.C - k.D) / (k.n0 - k.n2) : NaN;
  const res = out('somers', o && o.dir === 'xy' ? xy : yx, n, { extra: { dYX: yx, dXY: xy } });
  res.conv.push(o && o.dir === 'xy' ? ['d de X dada Y: pares no empatados en Y en el denominador.', 'd of X given Y: pairs untied in Y in the denominator.']
    : ['d de Y dada X: pares no empatados en X en el denominador.', 'd of Y given X: pairs untied in X in the denominator.']);
  return res;
};

/* ---------------- Blomqvist's β (quadrant correlation) ----------------
   β = mean of sgn(x − med x)·sgn(y − med y); an observation on a median
   contributes zero, so β changes sign — and only sign — when x does.
   With o.ties = 'below' an observation on a median is counted with the lower
   half instead, β = 2·P(both ≤ or both >) − 1: the convention of some
   implementations, kept to reproduce them. Without values on the medians the
   two coincide. Test: the normal approximation of Σ sgn over the m
   observations that are off both medians. */
Coef.blomqvist = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o);
  const mx = Num.median(x), my = Num.median(y);
  let s = 0, m = 0, conc = 0;
  for (let i = 0; i < n; i++) {
    const a = sign(x[i] - mx) * sign(y[i] - my); s += a; if (a !== 0) m++;
    if ((x[i] <= mx && y[i] <= my) || (x[i] > mx && y[i] > my)) conc++;
  }
  const beta = !n ? NaN : o.ties === 'below' ? 2 * conc / n - 1 : s / n;
  const res = out('blomqvist', beta, n, { alt });
  if (o.ties === 'below') res.conv.push(['Datos sobre la mediana contados con la mitad inferior: β = 2·P(ambos ≤ o ambos >) − 1.', 'Values on a median counted with the lower half: β = 2·P(both ≤ or both >) − 1.']);
  if (m > 0) {
    const z = s / sqrt(m);
    res.stat = { name: 'z', value: z };
    res.p = pAlt(alt, Num.pnorm(z, true), Num.pnorm(z));
  }
  res.conv.push(['β = promedio de sgn(x − mediana)·sgn(y − mediana); un dato sobre una mediana aporta cero. Valor p normal: Σ sgn ≈ N(0, m) con m los datos fuera de las medianas.',
    'β = mean of sgn(x − median)·sgn(y − median); a point on a median contributes zero. Normal p-value: Σ sgn ≈ N(0, m) with m the points off the medians.']);
  return res;
};

/* ---------------- Gaussian rank correlation ----------------
   Pearson's r of the normal scores Φ⁻¹(R/(n + 1)) (van der Waerden scores;
   Boudt, Cornelissen and Croux 2012). Inference as for Pearson's r. */
Coef.gaussianRank = function (x0, y0, o) {
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), conf = confOf(o);
  const sx = Array.from(Num.rank(x), r => Num.qnorm(r / (n + 1))), sy = Array.from(Num.rank(y), r => Num.qnorm(r / (n + 1)));
  const r = n >= 2 ? rawPearson(sx, sy) : NaN;
  const res = out('gaussian', r, n, { alt });
  if (!isFinite(r)) { res.conv.push(constantNote); return res; }
  if (n > 2) Object.assign(res, tTest(r, n - 2, alt));
  if (n > 3) res.ci = fisherCI(r, 1 / sqrt(n - 3), alt, conf, 'fisher');
  res.conv.push(['Puntuaciones normales Φ⁻¹(R/(n + 1)); prueba t e intervalo de Fisher como para Pearson (aproximación).',
    'Normal scores Φ⁻¹(R/(n + 1)); t test and Fisher interval as for Pearson (approximation).']);
  return res;
};

/* ---------------- biweight midcorrelation ----------------
   u = (x − med)/(9·MAD) with the unscaled MAD; weights (1 − u²)² inside
   |u| < 1, zero outside; the correlation of the weighted deviations from the
   medians (Mosteller and Tukey 1977; Wilcox 2012). */
function biweightVec(x) {
  const med = Num.median(x), mad = Num.mad(x, med);
  if (!(mad > 0)) return null;
  return Array.from(x, v => { const u = (v - med) / (9 * mad); return abs(u) < 1 ? (v - med) * (1 - u * u) * (1 - u * u) : 0; });
}
Coef.biweight = function (x0, y0, o) {
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), conf = confOf(o);
  const a = biweightVec(x), b = biweightVec(y);
  const res = out('biweight', NaN, n, { alt });
  if (!a || !b) { res.conv.push(['La desviación absoluta mediana de una variable es cero: el peso doble no está definido.', 'The median absolute deviation of one variable is zero: the biweight is undefined.']); return res; }
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += a[i] * b[i]; saa += a[i] * a[i]; sbb += b[i] * b[i]; }
  const r = clip1(sab / sqrt(saa * sbb));
  res.est = r;
  if (n > 2) Object.assign(res, tTest(r, n - 2, alt));
  if (n > 3) res.ci = fisherCI(r, 1 / sqrt(n - 3), alt, conf, 'fisher');
  res.conv.push(['Constante de afinación 9 con la desviación absoluta mediana sin escalar; prueba t con n − 2 gl (aproximación).',
    'Tuning constant 9 with the unscaled median absolute deviation; t test with n − 2 df (approximation).']);
  return res;
};

/* ---------------- percentage bend correlation (Wilcox 1994) ----------------
   ω = the ⌊(1 − β)n⌋-th smallest |x − med x|; the percentage bend location
   φ = (Σ of the x with |x − med|/ω ≤ 1 + ω(i₂ − i₁))/(n − i₁ − i₂); then
   a = (x − φ)/ω clipped to [−1, 1], and r = Σab/√(Σa²Σb²). */
function pbVec(x, beta) {
  const n = x.length, med = Num.median(x);
  const w = Array.from(x, v => abs(v - med)).sort((p, q) => p - q);
  const m = floor((1 - beta) * n);
  const om = w[max(0, m - 1)];
  if (!(om > 0)) return null;
  let i1 = 0, i2 = 0, s = 0;
  for (let i = 0; i < n; i++) { const psi = (x[i] - med) / om; if (psi < -1) i1++; else if (psi > 1) i2++; else s += x[i]; }
  const phi = (s + om * (i2 - i1)) / (n - i1 - i2);
  return Array.from(x, v => { const a = (v - phi) / om; return a < -1 ? -1 : a > 1 ? 1 : a; });
}
Coef.percentageBend = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), beta = o.beta == null ? 0.2 : o.beta;
  const a = pbVec(x, beta), b = pbVec(y, beta);
  const res = out('pbend', NaN, n, { alt });
  if (!a || !b) { res.conv.push(constantNote); return res; }
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += a[i] * b[i]; saa += a[i] * a[i]; sbb += b[i] * b[i]; }
  const r = clip1(sab / sqrt(saa * sbb));
  res.est = r;
  if (n > 2) Object.assign(res, tTest(r, n - 2, alt));
  res.conv.push([`Flexión β = ${beta}; prueba t con n − 2 grados de libertad (Wilcox 1994).`, `Bend β = ${beta}; t test with n − 2 degrees of freedom (Wilcox 1994).`]);
  return res;
};

/* ---------------- winsorized correlation ----------------
   g = ⌊γn⌋ values of each tail are pulled in to the nearest kept value, then
   Pearson's r. Test statistic r√((n − 2)/(1 − r²)) referred to a t with
   n − 2g − 2 degrees of freedom (Wilcox 2012). */
function winsorize(x, gam) {
  const n = x.length, s = Float64Array.from(x).sort(), k = floor(gam * n);
  const lo = s[k], hi = s[n - k - 1];
  return [Array.from(x, v => v < lo ? lo : v > hi ? hi : v), k];
}
Coef.winsorized = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length, alt = altOf(o), gam = o.trim == null ? 0.2 : o.trim;
  const [wx, k] = winsorize(x, gam), [wy] = winsorize(y, gam);
  const r = rawPearson(wx, wy);
  const res = out('winsorized', r, n, { alt });
  if (!isFinite(r)) { res.conv.push(constantNote); return res; }
  const df = n - 2 * k - 2;
  if (df > 0) {
    const t = abs(r) >= 1 ? sign(r) * Infinity : r * sqrt((n - 2) / (1 - r * r));
    res.stat = { name: 't', value: t, df };
    res.p = pAlt(alt, Num.pt(t, df, true), Num.pt(t, df));
  }
  res.conv.push([`Winsorización del ${Math.round(gam * 100)} % por cola (g = ${k}); t = r√((n − 2)/(1 − r²)) con n − 2g − 2 = ${df} grados de libertad.`,
    `${Math.round(gam * 100)} % winsorizing per tail (g = ${k}); t = r√((n − 2)/(1 − r²)) with n − 2g − 2 = ${df} degrees of freedom.`]);
  return res;
};

/* ---------------- distance correlation (Székely, Rizzo and Bakirov 2007) ----------------
   dCor: square root of the V-statistic ratio built on doubly centred distance
   matrices; it is 0 only under independence, but biased upwards in small
   samples. The bias-corrected version (Székely and Rizzo 2013, 2014) uses
   U-centred matrices, lives on the scale of the square and can be negative;
   its t test (one-sided, df = n(n − 3)/2 − 1) is the default test. */
function distMatrix(x) {
  const n = x.length, D = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = abs(x[i] - x[j]); D[i * n + j] = d; D[j * n + i] = d; }
  return D;
}
function doubleCentre(D, n) {
  const row = new Float64Array(n);
  let tot = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += D[i * n + j]; row[i] = s / n; tot += s; }
  tot /= n * n;
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i * n + j] = D[i * n + j] - row[i] - row[j] + tot;
  return A;
}
function uCentre(D, n) {
  const row = new Float64Array(n);
  let tot = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += D[i * n + j]; row[i] = s; tot += s; }
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    A[i * n + j] = i === j ? 0 : D[i * n + j] - row[i] / (n - 2) - row[j] / (n - 2) + tot / ((n - 1) * (n - 2));
  return A;
}
function inner(A, B) { let s = 0; for (let i = 0; i < A.length; i++) s += A[i] * B[i]; return s; }
Coef.dcor = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const res = out('dcor', NaN, n, { alt: 'greater' });
  if (n < 4) return res;
  const DX = distMatrix(x), DY = distMatrix(y);
  const A = doubleCentre(DX, n), B = doubleCentre(DY, n);
  const vxy = inner(A, B) / (n * n), vxx = inner(A, A) / (n * n), vyy = inner(B, B) / (n * n);
  const dc = vxx > 0 && vyy > 0 ? sqrt(max(0, vxy) / sqrt(vxx * vyy)) : 0;
  res.est = dc;
  res.extra = { dcov: sqrt(max(0, vxy)), dvarX: sqrt(vxx), dvarY: sqrt(vyy) };
  const Au = uCentre(DX, n), Bu = uCentre(DY, n);
  const uxy = inner(Au, Bu), uxx = inner(Au, Au), uyy = inner(Bu, Bu);
  const rstar = uxx > 0 && uyy > 0 ? uxy / sqrt(uxx * uyy) : 0;
  res.extra.dcorUnbiased = rstar;
  const M = n * (n - 3) / 2, df = M - 1;
  const T = sqrt(df) * rstar / sqrt(1 - rstar * rstar);
  res.extra.T = T;
  res.stat = { name: 'T', value: T, df };
  res.p = Num.pt(T, df, true);
  res.conv.push(['dCor = raíz del cociente de V-estadísticos con matrices de distancia doblemente centradas (sesgada hacia arriba en muestras chicas). Valor p unilateral de la prueba t con dCor² corregida por sesgo (U-centrado), gl = n(n − 3)/2 − 1.',
    'dCor = square root of the ratio of V-statistics with doubly centered distance matrices (biased upwards in small samples). One-sided p-value from the t test on the bias-corrected dCor² (U-centring), df = n(n − 3)/2 − 1.']);
  return res;
};

/* ---------------- Chatterjee's ξ (2021) ----------------
   Order the pairs by x, breaking ties in x at random (seeded, reported);
   r_i = #{j: y_j ≤ y_(i)}, l_i = #{j: y_j ≥ y_(i)};
   ξ = 1 − nΣ|r_{i+1} − r_i| / (2Σ l_i(n − l_i))   (= 1 − 3Σ|Δr|/(n² − 1) without ties in y).
   Asymmetric: ξ(X, Y) measures how much Y is a function of X. Test: √n ξ is
   asymptotically normal with a variance estimated from the data (Theorem 2.2
   of the paper), or 2/5 when y is known to be continuous. */
Coef.xi = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const res = out('xi', NaN, n, { alt: 'greater' });
  if (n < 3) return res;
  const rnd = Num.rng(o.seed == null ? 20261003 : o.seed);
  const jitter = Float64Array.from({ length: n }, () => rnd());
  const idx = Array.from({ length: n }, (_, i) => i).sort((i, j) => (x[i] - x[j]) || (jitter[i] - jitter[j]));
  const ys = Float64Array.from(idx, i => y[i]);
  const sorted = Float64Array.from(ys).sort();
  /* r = number ≤ y (upper bound), l = number ≥ y */
  const upper = v => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m; } return lo; };
  const lower = v => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; } return lo; };
  const r = Float64Array.from(ys, upper), l = Float64Array.from(ys, v => n - lower(v));
  let sd = 0, sl = 0;
  for (let i = 0; i < n - 1; i++) sd += abs(r[i + 1] - r[i]);
  for (let i = 0; i < n; i++) sl += l[i] * (n - l[i]);
  if (sl === 0) { res.conv.push(constantNote); return res; }
  const xi = 1 - n * sd / (2 * sl);
  res.est = xi;
  /* variance under independence */
  let tau2;
  if (o.continuous) tau2 = 0.4;
  else {
    const u = Float64Array.from(r).sort();
    let an = 0, bn = 0, cn = 0, v = 0;
    for (let i = 1; i <= n; i++) {
      const ui = u[i - 1];
      v += ui;
      an += (2 * n - 2 * i + 1) * ui * ui;
      cn += (2 * n - 2 * i + 1) * ui;
      const w = v + (n - i) * ui;
      bn += w * w;
    }
    an /= n ** 4; bn /= n ** 5; cn /= n ** 3;
    const dn = sl / n ** 3;
    tau2 = (an - 2 * bn + cn * cn) / (dn * dn);
  }
  const se = sqrt(tau2 / n);
  const z = xi / se;
  res.stat = { name: 'z', value: z };
  res.p = Num.pnorm(z, true);
  res.extra = { sd: se, tau2, seed: o.seed == null ? 20261003 : o.seed, tiesX: Num.tieGroups(x).length > 0 };
  res.conv.push([o.continuous ? 'Valor p unilateral: √n·ξ ≈ N(0, 2/5) bajo independencia (y continua).' : 'Valor p unilateral: √n·ξ ≈ N(0, τ²) bajo independencia, con τ² estimada de los datos (teorema 2.2 de Chatterjee 2021).',
    o.continuous ? 'One-sided p-value: √n·ξ ≈ N(0, 2/5) under independence (continuous y).' : 'One-sided p-value: √n·ξ ≈ N(0, τ²) under independence, with τ² estimated from the data (Theorem 2.2 of Chatterjee 2021).']);
  if (res.extra.tiesX) res.conv.push([`Hay empates en x: se rompieron al azar con la semilla ${res.extra.seed}; otra semilla puede dar otro ξ.`, `There are ties in x: they were broken at random with seed ${res.extra.seed}; another seed may give another ξ.`]);
  res.conv.push(['ξ es asimétrica: mide cuánto y es función de x, no al revés.', 'ξ is asymmetric: it measures how much y is a function of x, not the other way round.']);
  return res;
};

/* ---------------- Hoeffding's D (1948) ----------------
   With average ranks R, S and the bivariate rank Q_i = 1 + Σ_j c(x_j, x_i)c(y_j, y_i),
   c(a, b) = 1 if a < b, ½ if a = b (j ≠ i), 0 otherwise:
     D = 30[(n − 2)(n − 3)D₁ + D₂ − 2(n − 2)D₃] / [n(n − 1)(n − 2)(n − 3)(n − 4)]
   with D₁ = Σ(Q − 1)(Q − 2), D₂ = Σ(R − 1)(R − 2)(S − 1)(S − 2), D₃ = Σ(R − 2)(S − 2)(Q − 1).
   Reported on the customary scale 30·D (from −0.5 to 1 without ties). */
Coef.hoeffding = function (x0, y0) {
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const res = out('hoeffding', NaN, n, { alt: 'greater' });
  if (n < 5) return res;
  const R = Num.rank(x), S = Num.rank(y);
  let d1 = 0, d2 = 0, d3 = 0;
  for (let i = 0; i < n; i++) {
    let q = 1;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const cx = x[j] < x[i] ? 1 : x[j] === x[i] ? 0.5 : 0;
      if (!cx) continue;
      const cy = y[j] < y[i] ? 1 : y[j] === y[i] ? 0.5 : 0;
      q += cx * cy;
    }
    d1 += (q - 1) * (q - 2);
    d2 += (R[i] - 1) * (R[i] - 2) * (S[i] - 1) * (S[i] - 2);
    d3 += (R[i] - 2) * (S[i] - 2) * (q - 1);
  }
  const D = 30 * ((n - 2) * (n - 3) * d1 + d2 - 2 * (n - 2) * d3) / (n * (n - 1) * (n - 2) * (n - 3) * (n - 4));
  res.est = D;
  res.conv.push(['Escala habitual 30·D (de −0.5 a 1 sin empates); empates con rangos promedio y cuartos en el rango bivariado.', 'Customary scale 30·D (from −0.5 to 1 without ties); ties with average ranks and quarters in the bivariate rank.']);
  return res;
};

/* ---------------- Bergsma and Dassios' τ* (2014) ----------------
   t* = E[a(X₁,X₂,X₃,X₄)·a(Y₁,Y₂,Y₃,Y₄)] with the kernel
     a(z₁,z₂,z₃,z₄) = I(z₁,z₃ < z₂,z₄) + I(z₂,z₄ < z₁,z₃) − I(z₁,z₄ < z₂,z₃) − I(z₂,z₃ < z₁,z₄),
   where I(a,b < c,d) means max(a, b) < min(c, d). Estimated by its
   U-statistic: the mean over every 4-subset of the kernel symmetrized over
   the 24 orderings. The kernel only looks at the order of the four values, so
   the symmetrized product depends only on the two order patterns (75 weak
   orderings of four values, ties included); it is tabulated once and each
   4-subset costs a lookup. τ* ≥ 0 asymptotically, = 0 only under
   independence. Exhaustive O(n⁴): meant for n up to ~80 here. */
let TSTAB = null;
function patternCode(a, b, c, d) {
  const v = [a, b, c, d], u = [...new Set(v)].sort((p, q) => p - q);
  return v.reduce((s, z) => s * 4 + u.indexOf(z), 0);
}
function tauStarTable() {
  if (TSTAB) return TSTAB;
  const PERM = [];
  (function rec(p, left) { if (!left.length) { PERM.push(p); return; } left.forEach((v, i) => rec(p.concat(v), left.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  const I = (p, q, r, t) => (max(p, q) < min(r, t) ? 1 : 0);
  const ak = z => I(z[0], z[2], z[1], z[3]) + I(z[1], z[3], z[0], z[2]) - I(z[0], z[3], z[1], z[2]) - I(z[1], z[2], z[0], z[3]);
  /* every weak ordering of four values, written as dense ranks 0..3 */
  const pats = [];
  for (let c = 0; c < 256; c++) {
    const v = [(c >> 6) & 3, (c >> 4) & 3, (c >> 2) & 3, c & 3], k = new Set(v).size;
    if (v.every(z => z < k)) pats.push(c);
  }
  const vec = c => [(c >> 6) & 3, (c >> 4) & 3, (c >> 2) & 3, c & 3];
  const T = new Float64Array(256 * 256);
  for (const cx of pats) for (const cy of pats) {
    const zx = vec(cx), zy = vec(cy);
    let s = 0;
    for (const p of PERM) s += ak(p.map(i => zx[i])) * ak(p.map(i => zy[i]));
    T[cx * 256 + cy] = s / 24;
  }
  TSTAB = T;
  return T;
}
Coef.tauStar = function (x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0), n = x.length;
  const res = out('taustar', NaN, n, { alt: 'greater' });
  const lim = o.maxN || 80;
  if (n < 4) return res;
  if (n > lim) { res.conv.push([`Con n = ${n} el cálculo exhaustivo es muy lento; se omite.`, `With n = ${n} the exhaustive computation is too slow; skipped.`]); return res; }
  const T = tauStarTable();
  let s = 0, cnt = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) for (let l = k + 1; l < n; l++) {
    s += T[patternCode(x[i], x[j], x[k], x[l]) * 256 + patternCode(y[i], y[j], y[k], y[l])];
    cnt++;
  }
  res.est = s / cnt;
  res.conv.push(['U-estadístico de orden 4 (insesgado), sobre todos los subconjuntos de cuatro puntos; admite empates.', 'Order-4 U-statistic (unbiased), over every subset of four points; ties allowed.']);
  return res;
};
Coef._tauStarTable = tauStarTable;

/* ---------------- permutation test of any coefficient ----------------
   Permutes y against x B times with a seeded generator; the p-value counts
   the observed statistic as one of the permutations ((k + 1)/(B + 1)), so it
   is never zero. Two-sided compares |statistic|. */
Coef.permutation = function (stat, x0, y0, o) {
  o = o || {};
  const [x, y] = Coef.complete(x0, y0);
  const B = o.B || 999, alt = altOf(o), rnd = Num.rng(o.seed == null ? 1 : o.seed);
  const obs = stat(x, y);
  const yp = Float64Array.from(y);
  let ge = 0;
  for (let b = 0; b < B; b++) {
    rnd.shuffle(yp);
    const v = stat(x, yp);
    if (alt === 'greater' ? v >= obs - 1e-12 : alt === 'less' ? v <= obs + 1e-12 : abs(v) >= abs(obs) - 1e-12) ge++;
  }
  return { obs, p: (ge + 1) / (B + 1), B, seed: o.seed == null ? 1 : o.seed };
};

/* the catalogue of the coefficients of two continuous variables, in the order
   the labs and the pair study show them */
Coef.PAIR = [
  { id: 'pearson', f: Coef.pearson, es: 'r de Pearson', en: 'Pearson’s r', sym: 'r', fam: 'lin' },
  { id: 'spearman', f: Coef.spearman, es: 'ρ de Spearman', en: 'Spearman’s ρ', sym: 'ρ', fam: 'rank' },
  { id: 'kendall', f: Coef.kendall, es: 'τ-b de Kendall', en: 'Kendall’s τ-b', sym: 'τ', fam: 'rank' },
  { id: 'gaussian', f: Coef.gaussianRank, es: 'Rangos gaussianos', en: 'Gaussian rank', sym: 'r_G', fam: 'rank' },
  { id: 'blomqvist', f: Coef.blomqvist, es: 'β de Blomqvist', en: 'Blomqvist’s β', sym: 'β', fam: 'rank' },
  { id: 'biweight', f: Coef.biweight, es: 'Peso doble', en: 'Biweight', sym: 'r_bw', fam: 'rob' },
  { id: 'pbend', f: Coef.percentageBend, es: 'Flexión porcentual', en: 'Percentage bend', sym: 'r_pb', fam: 'rob' },
  { id: 'winsorized', f: Coef.winsorized, es: 'Winsorizada', en: 'Winsorized', sym: 'r_w', fam: 'rob' },
  { id: 'dcor', f: Coef.dcor, es: 'Correlación de distancias', en: 'Distance correlation', sym: 'dCor', fam: 'dep' },
  { id: 'xi', f: Coef.xi, es: 'ξ de Chatterjee', en: 'Chatterjee’s ξ', sym: 'ξ', fam: 'dep' },
  { id: 'hoeffding', f: Coef.hoeffding, es: 'D de Hoeffding', en: 'Hoeffding’s D', sym: 'D', fam: 'dep' },
  { id: 'taustar', f: Coef.tauStar, es: 'τ* de Bergsma–Dassios', en: 'Bergsma–Dassios τ*', sym: 'τ*', fam: 'dep' },
];

g.Coef = Coef;
return Coef;
}
if (typeof window !== 'undefined') CoefCore(window);
