/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 11, the engine of correlation networks.

     Edges from a correlation matrix by a threshold or by significance, from
       the partial correlations, or from the graphical lasso (Friedman,
       Hastie and Tibshirani 2008: block coordinate descent, each column a
       lasso solved by coordinate descent) along a path of 100 penalties from
       λmax = max|rᵢⱼ| down to λmax/100, the network chosen by the extended
       BIC (Foygel and Drton 2010) with γ = 0.5, as is usual in psychology
       (Epskamp and Fried 2018).
     Centralities on the weighted network: degree, strength, expected
       influence, closeness and betweenness with lengths 1/|w| (Opsahl,
       Agneessens and Skvoretz 2010; Brandes 2001), eigenvector.
     Communities: modularity (Newman 2006) maximized by the Louvain method
       (Blondel et al. 2008), deterministic in the order of the nodes.
     Layouts: force-directed (Fruchterman and Reingold 1991, seeded), circle
       ordered by community, line (for arc diagrams).

   Installs `Net` in the global object it is given; needs Num and Mat. */
function NetworkCore(g) {
'use strict';
const Num = g.Num, Mat = g.Mat;
const { abs, sqrt, log, exp, max, min, PI, cos, sin } = Math;
const N = {};

/* ---------------- graphical lasso ---------------- */
const soft = (z, t) => (z > t ? z - t : z < -t ? z + t : 0);
/* S: covariance (here a correlation) matrix; rho: penalty. Warm start
   from o.W, o.B. Returns W (estimated covariance), Theta (precision). */
N.graphLasso = function (S, rho, o) {
  o = o || {};
  const p = S.length, thr = o.thr || 1e-12, maxit = o.maxit || 10000, penDiag = !!o.penalizeDiagonal;
  const W = o.W ? o.W.map(r => Float64Array.from(r)) : S.map((r, i) => Float64Array.from(r, (v, j) => (i === j && penDiag ? v + rho : v)));
  if (!o.W) for (let i = 0; i < p; i++) W[i][i] = S[i][i] + (penDiag ? rho : 0);
  const B = o.B ? o.B.map(r => Float64Array.from(r)) : Array.from({ length: p }, () => new Float64Array(p));
  let offS = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) offS += abs(S[i][j]);
  offS /= p * (p - 1);
  let it = 0;
  for (; it < maxit; it++) {
    let change = 0;
    for (let j = 0; j < p; j++) {
      const beta = B[j];
      /* lasso: minimize ½βᵀW₁₁β − s₁₂ᵀβ + ρ|β|₁ over the coordinates k ≠ j */
      for (let inner = 0; inner < 10000; inner++) {
        let dmax = 0;
        for (let k = 0; k < p; k++) {
          if (k === j) continue;
          let r = S[k][j];
          for (let l = 0; l < p; l++) if (l !== j && l !== k) r -= W[k][l] * beta[l];
          const nb = soft(r, rho) / W[k][k], d = abs(nb - beta[k]);
          if (d > dmax) dmax = d;
          beta[k] = nb;
        }
        if (dmax < thr * 1e-2) break;
      }
      for (let k = 0; k < p; k++) {
        if (k === j) continue;
        let w = 0;
        for (let l = 0; l < p; l++) if (l !== j) w += W[k][l] * beta[l];
        change += abs(w - W[k][j]);
        W[k][j] = W[j][k] = w;
      }
    }
    if (change / (p * (p - 1)) < thr * offS) break;
  }
  /* the precision matrix from W and the β's */
  const Theta = Array.from({ length: p }, () => new Float64Array(p));
  for (let j = 0; j < p; j++) {
    let s = W[j][j];
    for (let k = 0; k < p; k++) if (k !== j) s -= W[k][j] * B[j][k];
    const t = 1 / s;
    Theta[j][j] = t;
    for (let k = 0; k < p; k++) if (k !== j) Theta[k][j] = -B[j][k] * t;
  }
  /* symmetrize (the two estimates of each entry agree at convergence) */
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { const v = (Theta[i][j] + Theta[j][i]) / 2; Theta[i][j] = Theta[j][i] = v; }
  return { W: W.map(r => Array.from(r)), Theta: Theta.map(r => Array.from(r)), B, iterations: it + 1, rho };
};
/* partial correlations from a precision matrix */
N.wi2net = Th => Th.map((r, i) => r.map((v, j) => (i === j ? 0 : -v / sqrt(Th[i][i] * Th[j][j]))));
/* the EBIC path */
N.ebicLasso = function (R, n, o) {
  o = o || {};
  const p = R.length, gamma = o.gamma == null ? 0.5 : o.gamma, nl = o.nlambda || 100, ratio = o.lambdaMinRatio || 0.01;
  let lmax = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) lmax = max(lmax, abs(R[i][j]));
  const lmin = ratio * lmax, lambdas = Array.from({ length: nl }, (_, k) => exp(log(lmin) + (log(lmax) - log(lmin)) * k / (nl - 1)));
  const path = [];
  let warm = null;
  /* from the largest penalty down, with warm starts */
  for (let k = nl - 1; k >= 0; k--) {
    const fit = N.graphLasso(R, lambdas[k], Object.assign({ thr: o.thr || 1e-10 }, warm || {}));
    warm = { W: fit.W, B: fit.B.map(r => Array.from(r)) };
    const K = fit.Theta, ld = Mat.logDet(K);
    let tr = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) tr += K[i][j] * R[j][i];
    const L = n / 2 * (ld - tr);
    let E = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < i; j++) if (K[i][j] !== 0 && abs(K[i][j]) > 1e-12) E++;
    path[k] = { lambda: lambdas[k], K, E, ebic: -2 * L + E * log(n) + 4 * E * gamma * log(p), L };
  }
  let best = 0;
  path.forEach((q, k) => { if (q.ebic < path[best].ebic) best = k; });
  return { path, best, lambda: lambdas[best], net: N.wi2net(path[best].K), lambdas, gamma };
};

/* ---------------- the network from a matrix ---------------- */
/* W: symmetric weights (0 = no edge) */
N.edges = function (W, names) {
  const p = W.length, E = [];
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) if (W[i][j] !== 0 && isFinite(W[i][j])) E.push({ i, j, w: W[i][j] });
  return E;
};

/* ---------------- centralities ---------------- */
/* shortest paths by Dijkstra on lengths 1/|w| from one source; counts of shortest paths for Brandes */
function dijkstra(W, s) {
  const p = W.length, d = new Array(p).fill(Infinity), sigma = new Array(p).fill(0), P = Array.from({ length: p }, () => []), done = new Array(p).fill(false), order = [];
  d[s] = 0; sigma[s] = 1;
  for (;;) {
    let u = -1;
    for (let v = 0; v < p; v++) if (!done[v] && d[v] < Infinity && (u < 0 || d[v] < d[u])) u = v;
    if (u < 0) break;
    done[u] = true; order.push(u);
    for (let v = 0; v < p; v++) {
      if (v === u || !W[u][v]) continue;
      const nd = d[u] + 1 / abs(W[u][v]);
      if (nd < d[v] - 1e-12 * max(1, nd)) { d[v] = nd; sigma[v] = sigma[u]; P[v] = [u]; }
      else if (abs(nd - d[v]) <= 1e-12 * max(1, nd)) { sigma[v] += sigma[u]; P[v].push(u); }
    }
  }
  return { d, sigma, P, order };
}
N.centrality = function (W) {
  const p = W.length;
  const degree = W.map(r => r.filter((v, j) => v !== 0 && isFinite(v)).length);
  const strength = W.map(r => r.reduce((s, v) => s + abs(v || 0), 0));
  const influence = W.map(r => r.reduce((s, v) => s + (v || 0), 0));
  const closeness = new Array(p).fill(0), betweenness = new Array(p).fill(0);
  for (let s = 0; s < p; s++) {
    const D = dijkstra(W, s);
    const reach = D.d.filter((v, i) => i !== s && isFinite(v));
    closeness[s] = reach.length ? 1 / reach.reduce((a, b) => a + b, 0) : 0;
    /* Brandes accumulation */
    const delta = new Array(p).fill(0);
    for (let k = D.order.length - 1; k >= 0; k--) {
      const w = D.order[k];
      for (const v of D.P[w]) delta[v] += D.sigma[v] / D.sigma[w] * (1 + delta[w]);
      if (w !== s) betweenness[w] += delta[w];
    }
  }
  for (let i = 0; i < p; i++) betweenness[i] /= 2;
  /* eigenvector centrality of |W| by power iteration, scaled to a maximum of 1 */
  let v = new Array(p).fill(1);
  for (let it = 0; it < 1000; it++) {
    const nv = W.map(r => r.reduce((s, x, j) => s + abs(x || 0) * v[j], 0)), m = Math.max(...nv) || 1;
    const nn = nv.map(x => x / m);
    const d = nn.reduce((s, x, i) => s + abs(x - v[i]), 0);
    v = nn;
    if (d < 1e-13) break;
  }
  return { degree, strength, influence, closeness, betweenness, eigenvector: v };
};

/* ---------------- communities: Louvain ---------------- */
N.modularity = function (W, member) {
  const p = W.length;
  let m2 = 0;
  const k = W.map(r => r.reduce((s, v) => s + abs(v || 0), 0));
  k.forEach(v => { m2 += v; });
  let Q = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (member[i] === member[j]) Q += abs(W[i][j] || 0) - k[i] * k[j] / m2;
  return Q / m2;
};
N.louvain = function (W0) {
  /* on |w| */
  let W = W0.map(r => r.map(v => abs(v || 0)));
  const p0 = W.length;
  let member = Array.from({ length: p0 }, (_, i) => i);
  for (let level = 0; level < 20; level++) {
    const p = W.length, k = W.map(r => r.reduce((s, v) => s + v, 0)), m2 = k.reduce((s, v) => s + v, 0);
    if (m2 === 0) break;
    const comm = Array.from({ length: p }, (_, i) => i), tot = k.slice();
    let moved = true, any = false;
    while (moved) {
      moved = false;
      for (let i = 0; i < p; i++) {
        const ci = comm[i], links = new Map();
        for (let j = 0; j < p; j++) if (j !== i && W[i][j]) links.set(comm[j], (links.get(comm[j]) || 0) + W[i][j]);
        tot[ci] -= k[i];
        let best = ci, gain = (links.get(ci) || 0) - tot[ci] * k[i] / m2;
        for (const [c, l] of links) { const gn = l - tot[c] * k[i] / m2; if (gn > gain + 1e-12) { gain = gn; best = c; } }
        tot[best] += k[i];
        if (best !== ci) { comm[i] = best; moved = true; any = true; }
      }
    }
    if (!any) break;
    /* aggregate */
    const ids = [...new Set(comm)], idx = new Map(ids.map((c, i) => [c, i])), q = ids.length;
    member = member.map(c => idx.get(comm[c]));
    const NW = Array.from({ length: q }, () => new Array(q).fill(0));
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) NW[idx.get(comm[i])][idx.get(comm[j])] += W[i][j];
    W = NW;
    if (q === p) break;
  }
  /* label communities by their first node */
  const order = [], lab = new Map();
  member.forEach(c => { if (!lab.has(c)) { lab.set(c, order.length); order.push(c); } });
  const m = member.map(c => lab.get(c));
  return { member: m, count: order.length, Q: N.modularity(W0, m) };
};

/* ---------------- layouts ---------------- */
N.layoutFR = function (W, o) {
  o = o || {};
  const p = W.length, rnd = Num.rng(o.seed || 3), iters = o.iters || 500;
  const pos = Array.from({ length: p }, (_, i) => [cos(2 * PI * i / p) + 0.1 * (rnd() - 0.5), sin(2 * PI * i / p) + 0.1 * (rnd() - 0.5)]);
  const area = 4, kk = sqrt(area / max(1, p));
  let t = 0.2;
  for (let it = 0; it < iters; it++) {
    const disp = pos.map(() => [0, 0]);
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
      let dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], d = sqrt(dx * dx + dy * dy) || 1e-6;
      const rep = kk * kk / d, w = abs(W[i][j] || 0), att = w ? (d * d / kk) * w * 2 : 0, f = (rep - att) / d;
      disp[i][0] += dx * f; disp[i][1] += dy * f; disp[j][0] -= dx * f; disp[j][1] -= dy * f;
    }
    for (let i = 0; i < p; i++) {
      /* a weak pull to the centre keeps isolated nodes on the page */
      disp[i][0] -= pos[i][0] * 0.05; disp[i][1] -= pos[i][1] * 0.05;
      const d = sqrt(disp[i][0] ** 2 + disp[i][1] ** 2) || 1e-9, step = min(d, t);
      pos[i][0] += disp[i][0] / d * step; pos[i][1] += disp[i][1] / d * step;
    }
    t *= 0.992;
  }
  return normalize(pos);
};
function normalize(pos) {
  const xs = pos.map(p => p[0]), ys = pos.map(p => p[1]);
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2, s = max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 || 1;
  return pos.map(p => [(p[0] - mx) / s, (p[1] - my) / s]);
}
/* nodes on a circle, grouped by community and ordered within it */
N.circleOrder = function (member) {
  const p = member.length;
  return Array.from({ length: p }, (_, i) => i).sort((a, b) => member[a] - member[b] || a - b);
};
N.layoutCircle = function (order) {
  const p = order.length, pos = new Array(p);
  order.forEach((node, k) => { const a = -PI / 2 + 2 * PI * k / p; pos[node] = [cos(a), sin(a)]; });
  return pos;
};

g.Net = N;
return N;
}
if (typeof window !== 'undefined') NetworkCore(window);
