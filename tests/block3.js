/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Block 3: normality, multivariate normality, shape of a pair,
   robust scale and OGK, influence and the verdict. The references are
   properties every correct implementation has (invariance, equivariance,
   closed forms, brute force); the values against R are in validation/block3. */

const R3 = Num.rng(20261007);
const rn = n => Array.from({ length: n }, () => R3.normal());

sec('Bloque 3 · normalidad de una variable');
{
  const x = rn(40);
  const a = Assume.shapiro(x), b = Assume.shapiro(x.map(v => 3 - 2.5 * v));
  near('Shapiro–Wilk no cambia con a + b·x (ni con el signo)', a.W, b.W, 1e-13);
  near('ni su valor p', a.p, b.p, 1e-12);
  const e = Assume.shapiro([1, 2, 3]);
  near('n = 3 equiespaciados: W = 1', e.W, 1, 1e-14);
  const w3 = Assume.shapiro([1, 2, 7]);
  near('n = 3: p = 6/π (asin √W − asin √¾)', w3.p, 6 / Math.PI * (Math.asin(Math.sqrt(w3.W)) - Math.asin(Math.sqrt(0.75))), 1e-14);
  const A1 = Assume.anderson(x), A2 = Assume.anderson(x.map(v => 10 + 4 * v));
  near('Anderson–Darling no cambia con a + b·x', A1.A2, A2.A2, 1e-12);
  const sym = [-3, -2, -1, 0, 1, 2, 3];
  near('asimetría de una muestra simétrica = 0', Assume.moments(sym).skew, 0, 1e-15);
  const fl = Assume.moments([-1, -1, 1, 1]);
  near('curtosis en exceso de ±1 = −2 (el mínimo posible)', fl.kurt, -2, 1e-14);
  const ex = Assume.shapiro(rn(200).map(Math.exp));
  t('una lognormal se rechaza (p < .001)', ex.p < 0.001, ex.p);
}

sec('Bloque 3 · normalidad multivariada');
{
  const n = 60, X = Array.from({ length: n }, () => [R3.normal(), R3.normal(), R3.normal()]);
  const M = [[2, 0.5, -1], [0, 1, 0.3], [0.2, -0.7, 1.5]], b = [5, -2, 1];
  const Y = X.map(r => M.map((row, i) => row.reduce((s, v, k) => s + v * r[k], 0) + b[i]));
  const a1 = Assume.mardia(X), a2 = Assume.mardia(Y);
  near('Mardia (asimetría) es invariante afín', a1.g1, a2.g1, 1e-10);
  near('Mardia (curtosis) es invariante afín', a1.g2, a2.g2, 1e-10);
  const h1 = Assume.henzeZirkler(X), h2 = Assume.henzeZirkler(Y);
  near('Henze–Zirkler es invariante afín', h1.HZ, h2.HZ, 1e-10);
  /* brute force of b₁,ₚ with the MLE covariance */
  const m = Assume.mean(X), S = Assume.cov(X, true), Si = Assume.inverse(S);
  let g1 = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let s = 0; for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) s += (X[i][a] - m[a]) * Si[a][c] * (X[j][c] - m[c]); g1 += s ** 3; }
  near('b₁,ₚ = (1/n²) ΣΣ (dᵢⱼ)³ contado a mano', a1.g1, g1 / (n * n), 1e-11);
  const E = Assume.eigen([[4, 1], [1, 3]]);
  near('valores propios de [[4,1],[1,3]]', E.values[0], (7 + Math.sqrt(5)) / 2, 1e-13);
  const I = Assume.inverse([[4, 1], [1, 3]]);
  near('inversa 2×2', I[0][1], -1 / 11, 1e-15);
}

sec('Bloque 3 · forma de un par');
{
  const x = Array.from({ length: 40 }, (_, i) => -2 + i * 0.1), y = x.map(v => 1 + 2 * v);
  const L = Assume.lowess(x, y);
  t('LOWESS de una recta exacta es la recta', L.y.every((v, i) => Math.abs(v - y[i]) < 1e-12));
  const c = Assume.lowess(x, x.map(() => 7));
  t('LOWESS de una constante es la constante', c.y.every(v => Math.abs(v - 7) < 1e-12));
  const P = Assume.curvature(x, x.map(v => v * v + 0.01 * R3.normal()));
  t('una parábola: curvatura con p < 1e-10', P.p < 1e-10, P.p);
  const Q = Assume.curvature(x, y.map(v => v + 0.3 * R3.normal()));
  t('una recta con ruido: curvatura no significativa casi siempre (p > .001)', Q.p > 0.001, Q.p);
  const fan = x.map(v => 2 + v + (0.1 + Math.abs(v + 2)) * R3.normal());
  t('un abanico: Breusch–Pagan lo detecta', Assume.breuschPagan(x, fan).p < 0.05);
  const b1 = Assume.breuschPagan(x, fan), b2 = Assume.breuschPagan(x, fan.map(v => 10 * v - 3));
  near('Breusch–Pagan no cambia con a + b·y', b1.BP, b2.BP, 1e-10);
  const xs = rn(25), ys = xs.map(v => 0.5 * v + R3.normal());
  const J = Assume.jackknifeR(xs, ys);
  const brute = xs.map((_, i) => Coef.pearson(xs.filter((_, j) => j !== i), ys.filter((_, j) => j !== i)).est);
  t('r sin cada punto = Pearson recalculado sin él', J.without.every((v, i) => Math.abs(v - brute[i]) < 1e-12));
}

sec('Bloque 3 · escala robusta y OGK');
{
  const x = rn(50), T1 = Assume.tau(x), T2 = Assume.tau(x.map(v => 3 + 4 * v));
  near('escala τ: equivariante (σ(3 + 4x) = 4σ(x))', T2.sigma, 4 * T1.sigma, 1e-12);
  near('ubicación τ: equivariante', T2.mu, 3 + 4 * T1.mu, 1e-12);
  const big = rn(4000), Tb = Assume.tau(big);
  t('escala τ de una normal grande ≈ 1 (consistente)', Math.abs(Tb.sigma - 1) < 0.05, Tb.sigma);
  /* a cluster of 10 outliers far along a direction that hides them from the classical distance */
  const X = Array.from({ length: 100 }, () => { const u = R3.normal(); return [u, 0.9 * u + 0.43 * R3.normal()]; });
  for (let i = 0; i < 10; i++) X[i] = [2 + 0.1 * R3.normal(), -2 + 0.1 * R3.normal()];
  const O = Assume.outliers(X);
  const robustFound = O.flagged.slice(0, 10).filter(Boolean).length, classicFound = O.flaggedC.slice(0, 10).filter(Boolean).length;
  t('la distancia robusta encuentra los 10 atípicos agrupados', robustFound === 10, robustFound);
  t('la clásica encuentra menos (enmascaramiento)', classicFound < robustFound, classicFound);
  near('χ²₂(0.975) = −2 log(0.025)', Assume.qchisq(0.975, 2), -2 * Math.log(0.025), 1e-13);
  near('qchisq es la inversa de pchisq (gl = 7)', Num.pchisq(Assume.qchisq(0.3, 7), 7), 0.3, 1e-14);
}

sec('Bloque 3 · el veredicto de cada par');
{
  const n = 120, x = rn(n);
  const v = (y, o) => Assume.pairCheck(x, y, o).verdict.id;
  t('nube recta normal → Pearson', v(x.map(u => 0.7 * u + 0.7 * R3.normal())) === 'pearson');
  t('parábola → dCor', v(x.map(u => u * u + 0.2 * R3.normal())) === 'dcor');
  t('curva monótona → Spearman', v(x.map(u => Math.exp(1.5 * u) + 0.05 * R3.normal())) === 'spearman');
  t('una ordinal → ρ o τ-b', ['spearman', 'kendallB'].includes(v(x.map(u => 0.5 * u + R3.normal()), { ordinal: true })));
  /* Simpson: within each of two groups y falls with x, but the groups are shifted up and right */
  const g = x.map((_, i) => i % 2), xs = x.map((u, i) => u + 4 * g[i]), ys = x.map((u, i) => -0.8 * u + 0.5 * R3.normal() + 6 * g[i]);
  const ps = Assume.pairCheck(xs, ys, { groups: g });
  t('Simpson: r positiva juntando todo, negativa en cada grupo', ps.r > 0 && ps.byGroup.every(rg => rg < 0), `${ps.r} · ${ps.byGroup}`);
  t('Simpson → analizar por grupos', ps.verdict.id === 'groups' && ps.verdict.flags.includes('simpson'));
  /* one influential point */
  const xi = rn(30), yi = xi.map(u => 0.1 * u + R3.normal()); xi[0] = 8; yi[0] = 8;
  const pi = Assume.pairCheck(xi, yi);
  t('un punto influyente se nombra (fila 1)', pi.maxAt === 0 && pi.verdict.flags.includes('infl'), `${pi.maxAt} ${pi.verdict.flags}`);
}

sec('Bloque 3 · figuras');
{
  const cols = [rn(30), rn(30), rn(30)];
  const s = Plot.splom({ cols, labels: ['a', 'b', 'c'], stats: [[null, { r: 0.1, rho: 0.1, p: 0.5 }, { r: -0.3, rho: -0.2, p: 0.04 }], [null, null, { r: 0.6, rho: 0.5, p: 0.0001 }], [null, null, null]] });
  const doc = new DOMParser().parseFromString(s, 'image/svg+xml');
  t('la matriz de dispersión tiene p² = 9 celdas', doc.querySelectorAll('.sp-cell').length === 9);
  t('y 3 nubes abajo, 3 números arriba', doc.querySelectorAll('.sp-low').length === 3 && doc.querySelectorAll('.sp-r').length === 3);
  t('el número de una r con p < .001 lleva tres estrellas', [...doc.querySelectorAll('.sp-star')].some(e => e.textContent === '***'));
  const q = Plot.qq({ x: rn(20), w: 300, h: 200 });
  const dq = new DOMParser().parseFromString(q, 'image/svg+xml');
  t('la gráfica Q–Q marca su área para el editor (data-plot con 4 números)', (dq.documentElement.getAttribute('data-plot') || '').split(' ').length === 4);
  t('Q–Q: un punto por dato', dq.querySelectorAll('.pl-pts circle').length === 20);
  const br = Plot.breaks([0.1, 0.4, 0.45, 0.9, 1.3, 2.2, 2.25, 3.9]);
  t('los cortes del histograma cubren los datos', br[0] <= 0.1 && br[br.length - 1] >= 3.9);
}
