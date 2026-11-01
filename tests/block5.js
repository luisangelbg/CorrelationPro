/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Blocks 5 to 8: the identities the matrix, nonlinear, partial
   and categorical engines must satisfy whatever the data. The comparisons with
   R are in validation/block5 … validation/block8. */

const R5 = Num.rng(20261005);
const rn5 = n => Array.from({ length: n }, () => R5.normal());
const maxAbs = (A, B) => Math.max(...Array.from(A, (r, i) => Math.max(...Array.from(r, (v, j) => Math.abs(v - B[i][j])))));
const mmul = (A, B) => Array.from(A, r => Array.from(B[0], (_, j) => Array.from(r).reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = A => Array.from(A[0], (_, j) => Array.from(A, r => r[j]));

sec('Bloque 5 · pruebas múltiples');
{
  const p = [0.001, 0.01, 0.02, 0.04, 0.3, 0.8];
  const h = Mat.adjust(p, 'holm'), b = Mat.adjust(p, 'bonferroni'), bh = Mat.adjust(p, 'BH'), hb = Mat.adjust(p, 'hochberg');
  t('Holm ≥ p sin corregir', h.every((v, i) => v >= p[i] - 1e-15));
  t('Bonferroni ≥ Holm ≥ Hochberg', b.every((v, i) => v >= h[i] - 1e-15 && h[i] >= hb[i] - 1e-15));
  t('Benjamini–Hochberg ≤ Holm', bh.every((v, i) => v <= h[i] + 1e-15));
  t('Holm conserva el orden de los p', h.every((v, i) => i === 0 || v >= h[i - 1] - 1e-15));
  t('ningún p corregido pasa de 1', [h, b, bh, hb, Mat.adjust(p, 'BY'), Mat.adjust(p, 'hommel')].every(a => a.every(v => v <= 1)));
  near('Bonferroni del menor p = m·p', b[0], 6 * 0.001, 1e-15);
}

sec('Bloque 5 · álgebra de la matriz');
{
  const X = Array.from({ length: 5 }, () => rn5(60)), C = Mat.compute(X, { method: 'pearson' }), R = C.R;
  const E = Mat.eigen(R), V = E.vectors, D = E.values.map((v, i) => E.values.map((_, j) => (i === j ? v : 0)));
  t('R = VΛVᵀ (descomposición espectral)', maxAbs(mmul(mmul(V, D), tr(V)), R) < 1e-12, maxAbs(mmul(mmul(V, D), tr(V)), R));
  near('la suma de los valores propios es p', E.values.reduce((s, v) => s + v, 0), 5, 1e-12);
  const L = Mat.cholesky(R);
  t('L·Lᵀ = R (Cholesky)', maxAbs(mmul(L, tr(L)), R) < 1e-12);
  const I = mmul(R, Mat.inverse(R));
  t('R·R⁻¹ = I', maxAbs(I, R.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)))) < 1e-11);
  near('log|R| = Σ log λ', Mat.logDet(R), E.values.reduce((s, v) => s + Math.log(v), 0), 1e-10);
  const K = Mat.kmo(R);
  t('KMO entre 0 y 1', K.overall > 0 && K.overall < 1 && K.msa.every(v => v >= 0 && v <= 1));
  /* a matrix that is not positive definite */
  const B = [[1, 0.9, -0.6], [0.9, 1, 0.3], [-0.6, 0.3, 1]];
  t('la matriz inconsistente se diagnostica como no definida positiva', !Mat.diagnose(B).pd);
  const NP = Mat.nearestPD(B).R;
  t('la más cercana es definida positiva y de diagonal 1', Mat.diagnose(NP).psd && NP.every((r, i) => Math.abs(r[i] - 1) < 1e-12));
  const sh = Mat.shrink(X);
  t('la contracción da λ en [0, 1] y diagonal 1', sh.lambda >= 0 && sh.lambda <= 1 && sh.R.every((r, i) => Math.abs(r[i] - 1) < 1e-12));
  const ord = Mat.order(R, 'hclust');
  t('el orden por conglomerados es una permutación', Array.isArray(ord) && ord.slice().sort((a, b) => a - b).every((v, i) => v === i), ord);
}

sec('Bloque 6 · dependencia no lineal');
{
  const x = rn5(200), y = x.map(v => v * v + 0.1 * R5.normal()), z = rn5(200);
  t('HSIC detecta y = x² (p < .001)', NL.hsic(x, y).p < 0.001);
  t('HSIC no detecta nada entre independientes (p > .01)', NL.hsic(x, z).p > 0.01);
  const m = NL.mic(x, x.map(v => Math.sin(3 * v)));
  t('MIC de una función sin ruido es casi 1', m.est > 0.9, m.est);
  const mx = NL.maximal(x, y);
  t('la correlación máxima pasa a la |r| de Pearson con y = x²', mx.est > Math.abs(Coef.pearson(x, y).est), mx.est);
  near('ψ(1) = −γ (digamma)', NL.digamma(1), -0.5772156649015329, 1e-12);
  /* a copula sample and its fit */
  const F = NL.fitCopulas(x, x.map(v => v + 0.5 * R5.normal()));
  t('el ajuste de cópulas elige una familia', F.best && typeof F.best.id === 'string', F.best && F.best.id);
  t('τ de Kendall de la cópula entre 0 y 1', F.tau > 0 && F.tau < 1, F.tau);
}

sec('Bloque 7 · parcial, múltiple y conjuntos');
{
  const zz = rn5(300), x = zz.map(v => v + 0.6 * R5.normal()), y = zz.map(v => v + 0.6 * R5.normal());
  const P = Part.partial(x, y, [zz]);
  t('controlando por la causa común, la parcial cae cerca de 0', Math.abs(P.partial.est) < 0.15 && Math.abs(P.zero) > 0.5, `${P.partial.est} vs ${P.zero}`);
  t('|semiparcial| ≤ |parcial|', Math.abs(P.semi.est) <= Math.abs(P.partial.est) + 1e-12);
  const M = Part.multiple(y, [x, zz]);
  near('R² = R · R', M.R2, M.R * M.R, 1e-12);
  const Xa = [x, zz], C = Part.canonical([x], [y]);
  near('la canónica de una variable con otra es |r|', C.rho[0], Math.abs(Coef.pearson(x, y).est), 1e-10);
  near('RV de un conjunto consigo mismo = 1', Part.rv(Xa, Xa).rv, 1, 1e-12);
  const pr = Part.procrustes(Xa, Xa);
  near('Procrustes de un conjunto consigo mismo: r = 1', pr.r, 1, 1e-10);
}

sec('Bloque 8 · categóricas y latentes');
{
  const T0 = [[20, 5], [10, 25]], tb = Cat.fromTable(T0), ch = Cat.chisq(tb);
  /* by hand: E = [[12.5, 12.5], [17.5, 17.5]]... */
  const n = 60, rs = [25, 35], cs = [30, 30];
  let X2 = 0; T0.forEach((r, i) => r.forEach((o, j) => { const e = rs[i] * cs[j] / n; X2 += (o - e) ** 2 / e; }));
  near('χ² de Pearson a mano', ch.X2, X2, 1e-12);
  const nm = Cat.nominal(tb), tw = Cat.twoByTwo(tb);
  near('en 2 × 2, V de Cramér = |φ|', nm.cramer, Math.abs(nm.phi), 1e-12);
  near('Q de Yule = (ad − bc)/(ad + bc)', tw.Q, (20 * 25 - 5 * 10) / (20 * 25 + 5 * 10), 1e-12);
  near('razón de momios = ad/bc', tw.or, (20 * 25) / (5 * 10), 1e-12);
  const f = Cat.fisher(tb);
  t('Fisher exacta: las dos colas suman más que la bilateral', f.less + f.greater >= f.p - 1e-12 && f.p <= 1);
  near('perfecta asociación: V = 1', Cat.nominal(Cat.fromTable([[10, 0, 0], [0, 7, 0], [0, 0, 9]])).cramer, 1, 1e-12);
  near('Φ₂(0, 0; ρ = 0) = 1/4', Cat.bvnu(0, 0, 0), 0.25, 1e-12);
  near('Φ₂(0, 0; ρ) = 1/4 + asin(ρ)/(2π)', Cat.bvnu(0, 0, 0.5), 0.25 + Math.asin(0.5) / (2 * Math.PI), 1e-10);
  /* the tetrachoric of a dichotomized normal pair recovers ρ */
  const a = rn5(4000), b = a.map(v => 0.6 * v + 0.8 * R5.normal());
  const T2 = Cat.table(a.map(v => (v > 0.3 ? 1 : 0)), b.map(v => (v > -0.2 ? 1 : 0)), 2, 2);
  const pc = Cat.polychoric(T2);
  t('la tetracórica recupera ρ = .6 (±.06)', Math.abs(pc.est - 0.6) < 0.06, pc.est);
}
