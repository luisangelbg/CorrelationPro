/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 10, the engine of structured and special data.

     Groups: r in each group, the pooled within-group correlation (of the
       data centred on their group means), the correlation of the group means,
       and the test that the groups share one correlation (Fisher's z,
       Σ(nₖ − 3)(zₖ − z̄)² ~ χ²_{K−1}).
     Repeated measures (Bakdash and Marusich 2017): the correlation of the
       within-subject parts from the ANCOVA y ~ subject + x, with N − k − 1 df.
     Time series: the cross-correlation function, and prewhitening (Box and
       Jenkins 1976): an autoregressive model for x by Yule–Walker with the
       order chosen by AIC, the same filter applied to y, then the cross-
       correlation of the filtered series.
     Space: the modified t test of Dutilleul (1993; Clifford, Richardson and
       Hémon 1989): Moran's I of each variable in distance classes, the
       effective sample size 1 + tr(Rx)tr(Ry)/tr(RxRy) from the centred
       autocorrelation matrices, and F = (n̂ − 2)r²/(1 − r²).
     Phylogeny: independent contrasts (Felsenstein 1985) on a tree written
       in Newick, and their correlation through the origin (Garland, Harvey
       and Ives 1992).
     Circles: the circular–circular correlation of Jammalamadaka and
       SenGupta (1988) with its asymptotic test, and the circular–linear one
       of Mardia (1976).
     Compositions: the centred log-ratio and the proportionality ρp (Lovell
       et al. 2015; Erb and Notredame 2016).

   Installs `Struct` in the global object it is given; needs Num and Coef. */
function StructCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const { abs, sqrt, log, atan2, sin, cos, min, max, PI } = Math;
const St = {};
const fz = r => 0.5 * log((1 + r) / (1 - r));

/* ---------------- groups ---------------- */
St.groups = function (x0, y0, g0) {
  const x = [], y = [], gg = [];
  for (let i = 0; i < x0.length; i++) if (isFinite(x0[i]) && isFinite(y0[i]) && isFinite(g0[i])) { x.push(x0[i]); y.push(y0[i]); gg.push(g0[i]); }
  const n = x.length, keys = [...new Set(gg)].sort((a, b) => a - b);
  const by = keys.map(k => { const idx = []; gg.forEach((v, i) => { if (v === k) idx.push(i); }); return { k, idx, x: idx.map(i => x[i]), y: idx.map(i => y[i]) }; });
  const total = Coef.pearson(x, y);
  by.forEach(b => { b.n = b.idx.length; b.r = b.n >= 3 ? Coef.pearson(b.x, b.y).est : NaN; b.p = b.n >= 4 ? Coef.pearson(b.x, b.y).p : NaN; b.mx = Num.mean(b.x); b.my = Num.mean(b.y); });
  /* pooled within: centre each group on its means */
  const cx = new Array(n), cy = new Array(n);
  by.forEach(b => b.idx.forEach((i, j) => { cx[i] = b.x[j] - b.mx; cy[i] = b.y[j] - b.my; }));
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += cx[i] * cy[i]; sxx += cx[i] * cx[i]; syy += cy[i] * cy[i]; }
  const within = sxy / sqrt(sxx * syy), K = by.length, dfW = n - K - 1;
  const tW = within * sqrt(dfW / (1 - within * within));
  const ok = by.filter(b => b.n >= 2);
  const between = ok.length >= 3 ? Coef.pearson(ok.map(b => b.mx), ok.map(b => b.my)).est : NaN;
  /* homogeneity of the group correlations */
  const zs = by.filter(b => b.n > 3 && abs(b.r) < 1);
  const wsum = zs.reduce((s, b) => s + b.n - 3, 0), zbar = zs.reduce((s, b) => s + (b.n - 3) * fz(b.r), 0) / wsum;
  const Q = zs.reduce((s, b) => s + (b.n - 3) * (fz(b.r) - zbar) ** 2, 0);
  return { n, K, total: total.est, totalP: total.p, groups: by.map(b => ({ k: b.k, n: b.n, r: b.r, p: b.p, mx: b.mx, my: b.my })), within, withinP: 2 * Num.pt(-abs(tW), dfW), dfW, between, Q, dfQ: zs.length - 1, pQ: zs.length > 1 ? Num.pchisq(Q, zs.length - 1, true) : NaN, pooledZ: Math.tanh(zbar) };
};

/* ---------------- repeated measures ---------------- */
St.repeated = function (s0, x0, y0, o) {
  o = o || {};
  const s = [], x = [], y = [];
  for (let i = 0; i < x0.length; i++) if (isFinite(s0[i]) && isFinite(x0[i]) && isFinite(y0[i])) { s.push(s0[i]); x.push(x0[i]); y.push(y0[i]); }
  const N = x.length, subj = [...new Set(s)], k = subj.length;
  /* centre x and y within subjects: the slope common to all subjects and its sums of squares */
  const mx = new Map(), my = new Map(), cnt = new Map();
  s.forEach((v, i) => { mx.set(v, (mx.get(v) || 0) + x[i]); my.set(v, (my.get(v) || 0) + y[i]); cnt.set(v, (cnt.get(v) || 0) + 1); });
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < N; i++) { const dx = x[i] - mx.get(s[i]) / cnt.get(s[i]), dy = y[i] - my.get(s[i]) / cnt.get(s[i]); sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const b = sxy / sxx, ssModel = b * sxy, ssErr = syy - ssModel, df = N - k - 1;
  const r = Math.sign(b) * sqrt(ssModel / (ssModel + ssErr)), F = ssModel / (ssErr / df);
  const z = Num.qnorm(1 - (1 - (o.conf || 0.95)) / 2);
  return { r, df, F, p: Num.pf(F, 1, df, true), lo: Math.tanh(fz(r) - z / sqrt(df - 1)), hi: Math.tanh(fz(r) + z / sqrt(df - 1)), slope: b, N, k, ignored: Coef.pearson(x, y).est };
};

/* ---------------- time series ---------------- */
St.ccf = function (x0, y0, maxLag) {
  const [x, y] = Coef.complete(x0, y0), n = x.length, mx = Num.mean(x), my = Num.mean(y);
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
  const L = maxLag == null ? Math.floor(10 * Math.log10(n)) : maxLag, out = [];
  for (let k = -L; k <= L; k++) {
    let s = 0;
    for (let t = 0; t < n; t++) { const tk = t + k; if (tk >= 0 && tk < n) s += (x[tk] - mx) * (y[t] - my); }
    out.push({ lag: k, r: s / sqrt(sx * sy) });
  }
  return { n, lags: out, band: 2 / sqrt(n), bound: 1.959963984540054 / sqrt(n) };
};
/* Yule–Walker by Durbin–Levinson with the order chosen by AIC (as the usual
   implementation: demeaned series, autocovariances with the n divisor) */
St.arYW = function (x0, o) {
  o = o || {};
  const x = x0.filter(isFinite), n = x.length, m = Num.mean(x), z = x.map(v => v - m);
  const K = o.orderMax != null ? o.orderMax : Math.min(n - 1, Math.floor(10 * Math.log10(n)));
  const acv = [];
  for (let k = 0; k <= K; k++) { let s = 0; for (let t = k; t < n; t++) s += z[t] * z[t - k]; acv.push(s / n); }
  const r = acv.map(v => v / acv[0]);
  let phi = [], v = acv[0];
  const vars = [acv[0]], coefs = [[]];
  for (let k = 1; k <= K; k++) {
    let num = r[k];
    for (let j = 1; j < k; j++) num -= phi[j - 1] * r[k - j];
    let den = 1;
    for (let j = 1; j < k; j++) den -= phi[j - 1] * r[j];
    const pk = num / den, nphi = phi.map((p, j) => p - pk * phi[k - 2 - j]);
    nphi.push(pk); phi = nphi; v *= (1 - pk * pk);
    vars.push(v); coefs.push(phi.slice());
  }
  const aic = vars.map((vv, k) => n * log(vv) + 2 * k + 2);
  let order = 0;
  aic.forEach((a, k) => { if (a < aic[order]) order = k; });
  if (o.order != null) order = o.order;
  return { order, ar: coefs[order], aic: aic.map(a => a - Math.min(...aic)), varPred: vars[order] * n / (n - (order + 1)), mean: m };
};
St.arFilter = function (x, ar, mean) {
  const p = ar.length, out = [];
  for (let t = p; t < x.length; t++) { let e = x[t] - mean; for (let j = 1; j <= p; j++) e -= ar[j - 1] * (x[t - j] - mean); out.push(e); }
  return out;
};
St.prewhiten = function (x0, y0, o) {
  const [x, y] = Coef.complete(x0, y0);
  const A = St.arYW(Array.from(x), o);
  const ex = St.arFilter(Array.from(x), A.ar, A.mean), my = Num.mean(y), ey = St.arFilter(Array.from(y), A.ar, my);
  return { model: A, ex, ey, ccf: St.ccf(ex, ey, o && o.maxLag), raw: St.ccf(x, y, o && o.maxLag) };
};

/* ---------------- space: Dutilleul's modified t ---------------- */
St.dutilleul = function (x0, y0, cx0, cy0, o) {
  o = o || {};
  const idx = [];
  for (let i = 0; i < x0.length; i++) if ([x0[i], y0[i], cx0[i], cy0[i]].every(isFinite)) idx.push(i);
  const x = idx.map(i => x0[i]), y = idx.map(i => y0[i]), px = idx.map(i => cx0[i]), py = idx.map(i => cy0[i]), n = x.length;
  const nclass = o.nclass || 13;
  const D = [];
  let dmax = 0;
  for (let j = 0; j < n; j++) for (let i = j + 1; i < n; i++) { const d = Math.hypot(px[i] - px[j], py[i] - py[j]); D.push(d); if (d > dmax) dmax = d; }
  /* equal-width distance classes up to the largest distance */
  const ub = Array.from({ length: nclass }, (_, k) => dmax * (k + 1) / nclass);
  const classOf = d => { for (let k = 0; k < nclass; k++) if (d <= ub[k]) return k; return nclass - 1; };
  const mx = Num.mean(x), my = Num.mean(y);
  let vx = 0, vy = 0;
  for (let i = 0; i < n; i++) { vx += (x[i] - mx) ** 2; vy += (y[i] - my) ** 2; }
  vx /= n; vy /= n;
  const sx = new Array(nclass).fill(0), sy = new Array(nclass).fill(0), card = new Array(nclass).fill(0);
  for (let j = 0, t = 0; j < n; j++) for (let i = j + 1; i < n; i++, t++) { const k = classOf(D[t]); card[k]++; sx[k] += (x[i] - mx) * (x[j] - mx); sy[k] += (y[i] - my) * (y[j] - my); }
  const Ix = sx.map((v, k) => (card[k] ? v / card[k] / vx : 0)), Iy = sy.map((v, k) => (card[k] ? v / card[k] / vy : 0));
  /* the effective sample size from the centred autocorrelation matrices */
  let sxx = 0, syy = 0, sxy = 0, trxy = 0;
  const dist = (i, j) => Math.hypot(px[i] - px[j], py[i] - py[j]);
  for (let j = 0; j < n; j++) {
    let rxx = 0, ryy = 0;
    for (let i = 0; i < n; i++) {
      let a = 1, b = 1;
      if (i !== j) { const k = classOf(dist(i, j)); a = Ix[k]; b = Iy[k]; }
      rxx += a; ryy += b; trxy += a * b;
    }
    sxx += rxx; syy += ryy; sxy += rxx * ryy;
  }
  const trxx = n - sxx / n, tryy = n - syy / n;
  trxy += (sxx * syy / n - 2 * sxy) / n;
  const ess = trxx * tryy / trxy + 1, r = Coef.pearson(x, y).est, df = ess - 2, F = r * r / (1 - r * r);
  return { r, n, ess, df, F: df * F, p: Num.pf(df * F, 1, df, true), naiveP: Coef.pearson(x, y).p, classes: ub.map((u, k) => ({ upper: u, n: card[k], Ix: Ix[k], Iy: Iy[k] })) };
};

/* ---------------- phylogeny ---------------- */
/* a Newick tree → {nodes: [{name, len, children}], root} */
St.parseNewick = function (s) {
  s = s.trim().replace(/;\s*$/, '');
  let i = 0;
  const nodes = [];
  const parse = () => {
    const node = { name: '', len: 0, children: [] };
    if (s[i] === '(') {
      i++;
      for (;;) { node.children.push(parse()); if (s[i] === ',') { i++; continue; } if (s[i] === ')') { i++; break; } throw new Error('Newick: se esperaba «,» o «)» en la posición ' + i); }
    }
    let name = '';
    while (i < s.length && !',():;'.includes(s[i])) name += s[i++];
    node.name = name.trim().replace(/^'|'$/g, '');
    if (s[i] === ':') { i++; let num = ''; while (i < s.length && !',();'.includes(s[i])) num += s[i++]; node.len = parseFloat(num); }
    nodes.push(node);
    return node;
  };
  const root = parse();
  return { root, nodes, tips: nodes.filter(n => !n.children.length).map(n => n.name) };
};
/* contrasts of a trait (values by tip name): post-order, each internal node
   with two children i, j gives (xᵢ − xⱼ)/√(vᵢ + vⱼ); its value is the
   weighted mean and its branch is lengthened by vᵢvⱼ/(vᵢ + vⱼ) */
St.pic = function (tree, values) {
  const out = [];
  const rec = node => {
    if (!node.children.length) { const v = values[node.name]; if (!isFinite(v)) throw new Error('Falta el valor de la especie «' + node.name + '»'); return { x: v, v: node.len }; }
    if (node.children.length !== 2) throw new Error('El árbol debe ser binario (cada nodo con dos hijos).');
    const a = rec(node.children[0]), b = rec(node.children[1]);
    const sv = a.v + b.v;
    out.push((a.x - b.x) / sqrt(sv));
    return { x: (a.x / a.v + b.x / b.v) / (1 / a.v + 1 / b.v), v: node.len + a.v * b.v / sv };
  };
  rec(tree.root);
  return out;
};
St.picCor = function (tree, vx, vy) {
  const cx = St.pic(tree, vx), cy = St.pic(tree, vy), n = cx.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += cx[i] * cy[i]; sxx += cx[i] * cx[i]; syy += cy[i] * cy[i]; }
  const r = sxy / sqrt(sxx * syy), df = n - 1, t = r * sqrt(df / (1 - r * r));
  return { r, df, t, p: 2 * Num.pt(-abs(t), df), cx, cy, n, tipsR: null };
};

/* ---------------- circles ---------------- */
const cmean = a => atan2(a.reduce((s, v) => s + sin(v), 0), a.reduce((s, v) => s + cos(v), 0));
St.circCirc = function (a0, b0) {
  const [a, b] = Coef.complete(a0, b0), n = a.length, ma = cmean(a), mb = cmean(b);
  let num = 0, sa = 0, sb = 0, l20 = 0, l02 = 0, l22 = 0;
  for (let i = 0; i < n; i++) { const u = sin(a[i] - ma), v = sin(b[i] - mb); num += u * v; sa += u * u; sb += v * v; l20 += u * u; l02 += v * v; l22 += u * u * v * v; }
  const r = num / sqrt(sa * sb);
  l20 /= n; l02 /= n; l22 /= n;
  const z = sqrt(n * l20 * l02 / l22) * r;
  return { r, z, p: 2 * (1 - Num.pnorm(abs(z))), n, meanA: ma, meanB: mb };
};
St.circLin = function (x0, a0) {
  const [x, a] = Coef.complete(x0, a0), n = x.length, c = Array.from(a, cos), s = Array.from(a, sin);
  const rxc = Coef.pearson(x, c).est, rxs = Coef.pearson(x, s).est, rcs = Coef.pearson(c, s).est;
  const R2 = (rxc * rxc + rxs * rxs - 2 * rxc * rxs * rcs) / (1 - rcs * rcs), F = (n - 3) * R2 / (2 * (1 - R2));
  return { R: sqrt(max(0, R2)), R2, F, df1: 2, df2: n - 3, p: Num.pf(F, 2, n - 3, true), chi2: n * R2, pChi: Num.pchisq(n * R2, 2, true), n };
};

/* ---------------- compositions ---------------- */
St.clr = function (parts) {
  const n = parts[0].length, out = parts.map(() => new Array(n).fill(NaN));
  for (let r = 0; r < n; r++) {
    const v = parts.map(p => p[r]);
    if (!v.every(x => isFinite(x) && x > 0)) continue;
    const lg = v.map(Math.log), m = lg.reduce((s, t) => s + t, 0) / lg.length;
    lg.forEach((t, j) => { out[j][r] = t - m; });
  }
  return out;
};
St.rhoP = function (c1, c2) {
  const [a, b] = Coef.complete(c1, c2);
  const d = Array.from(a, (v, i) => v - b[i]);
  return 1 - Num.variance(d) / (Num.variance(a) + Num.variance(b));
};
St.composition = function (parts, names) {
  const C = St.clr(parts), p = parts.length, rho = [], raw = [], clrR = [];
  for (let i = 0; i < p; i++) { rho.push([]); raw.push([]); clrR.push([]); for (let j = 0; j < p; j++) { rho[i].push(i === j ? 1 : St.rhoP(C[i], C[j])); raw[i].push(i === j ? 1 : Coef.pearson(parts[i], parts[j]).est); clrR[i].push(i === j ? 1 : Coef.pearson(C[i], C[j]).est); } }
  return { clr: C, rhoP: rho, raw, clrR, names };
};

g.Struct = St;
return St;
}
if (typeof window !== 'undefined') StructCore(window);
