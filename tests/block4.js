/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Block 4: integration, the hypergeometric function, the
   Bayes factor (with the identities it must satisfy), the bootstrap
   intervals, the permutation test and the words. Comparisons with R are in
   validation/block4, and the coverage simulation in validation/block4/coverage.js. */

const R4 = Num.rng(20261008);
const rn4 = n => Array.from({ length: n }, () => R4.normal());

sec('Bloque 4 · integración y ₂F₁');
near('∫₀¹ x² dx = 1/3', PairStat.integrate(x => x * x, 0, 1), 1 / 3, 1e-15);
near('∫ e^(−x²) sobre [−10, 10] = √π', PairStat.integrate(x => Math.exp(-x * x), -10, 10), Math.sqrt(Math.PI), 1e-13);
near('∫₀^π sin x = 2', PairStat.integrate(Math.sin, 0, Math.PI), 2, 1e-14);
{
  /* the two branches of ₂F₁(½, ½; c; z) agree where they meet */
  const c = 3.5, z = 0.8;
  let tt = 1, s = 1;
  for (let k = 0; k < 200000; k++) { tt *= (0.5 + k) * (0.5 + k) / ((c + k) * (k + 1)) * z; s += tt; if (tt < 1e-18 * s) break; }
  near('₂F₁ por la transformación a 1 − z = su serie (c = 3.5, z = 0.8)', PairStat.log2F1half(c, z), Math.log(s), 1e-13);
  near('₂F₁(½, ½; c; 0) = 1', PairStat.log2F1half(10.5, 0), 0, 0);
  /* Gauss: ₂F₁(a, b; c; 1) = Γ(c)Γ(c − a − b) / (Γ(c − a)Γ(c − b)) */
  const c2 = 4.5, gauss = Num.lgamma(c2) + Num.lgamma(c2 - 1) - 2 * Num.lgamma(c2 - 0.5);
  near('₂F₁ cerca de z = 1 se acerca al teorema de Gauss', PairStat.log2F1half(c2, 1 - 1e-12), gauss, 1e-9);
}

sec('Bloque 4 · factor de Bayes de ρ');
{
  const b = PairStat.bayes(0.39, 46, { kappa: 1 / 3 });
  near('n = 46, r = .39, κ = 1/3: BF₁₀ = 8.178315 (paquete de R)', b.BF10, 8.178315, 5e-6);
  near('κ = 1: BF₁₀ = 5.961445 (paquete de R)', PairStat.bayes(0.39, 46, { kappa: 1 }).BF10, 5.961445, 5e-6);
  near('BF₁₀ = (BF₊₀ + BF₋₀)/2 (la a priori es simétrica)', b.BF10, (b.BFplus + b.BFminus) / 2, 1e-12);
  near('Savage–Dickey: BF₁₀ = a priori(0) / posterior(0)', b.BF10, b.priorAt0 / b.postAt0, 1e-9);
  const z = PairStat.bayes(0, 30);
  t('r = 0 da evidencia a favor de ρ = 0 (BF₁₀ < 1)', z.BF10 < 1, z.BF10);
  near('r = 0: la posterior es simétrica (mediana 0)', z.post.median, 0, 1e-9);
  const big = PairStat.bayes(0.96, 150);
  t('evidencia enorme: el logaritmo no se desborda', isFinite(big.logBF10) && big.logBF10 > 150, big.logBF10);
  t('la mediana posterior queda entre 0 y r', big.post.median > 0.9 && big.post.median < 0.96, big.post.median);
  t('categorías: 8.2 es «moderada»', PairStat.evidence(8.2).es === 'moderada');
  t('categorías: 1/40 es «muy fuerte» a favor de ρ = 0', PairStat.evidence(1 / 40).es === 'muy fuerte' && PairStat.evidence(1 / 40).favours === 'h0');
  near('la a priori integra 1 (κ = 1/3)', PairStat.integrate(r => Math.exp(PairStat.logPrior(r, 1 / 3)), -1, 1), 1, 1e-12);
}

sec('Bloque 4 · bootstrap y permutación');
{
  const x = rn4(30), y = x.map(v => 0.5 * v + R4.normal()), f = (a, b) => Coef.pearson(a, b).est;
  const b1 = PairStat.bootstrap(f, x, y, { B: 499, seed: 11 }), b2 = PairStat.bootstrap(f, x, y, { B: 499, seed: 11 });
  t('la misma semilla da las mismas réplicas', b1.reps.every((v, i) => v === b2.reps[i]));
  t('otra semilla, otras réplicas', !PairStat.bootstrap(f, x, y, { B: 499, seed: 12 }).reps.every((v, i) => v === b1.reps[i]));
  near('básico = 2θ̂ − percentil invertido (inferior)', b1.basic[0], 2 * b1.t0 - PairStat.normInter(Float64Array.from(b1.reps).sort(), 0.975), 1e-14);
  t('el intervalo BCa contiene la estimación', b1.bca[0] < b1.t0 && b1.t0 < b1.bca[1]);
  t('ninguno sale de [−1, 1]', ['normal', 'basic', 'percentile', 'bca'].every(k => b1[k][0] >= -1 && b1[k][1] <= 1));
  const s = Float64Array.from({ length: 99 }, (_, i) => i + 1);
  t('cuantil interpolado: (B + 1)α entero da ese orden', PairStat.normInter(s, 0.05) === 5);
  const g = PairStat.intervals(0.5, b1.reps, { level: 0.95, alt: 'greater' });
  t('unilateral «mayor»: sólo cota inferior', g.percentile[1] === 1 && g.percentile[0] > -1);
  const pm = PairStat.permute(f, x, y, { B: 199, seed: 3 });
  t('p por permutación nunca es 0: ≥ 1/(B + 1)', pm.p >= 1 / 200);
  const xs = [1, 2, 3, 4, 5, 6, 7, 8], ys = [2, 1, 4, 3, 6, 5, 8, 7];
  t('una relación casi perfecta: p de permutación = 1/(B + 1)', PairStat.permute(f, xs, ys, { B: 499, seed: 5 }).p < 0.02);
  t('las réplicas de la permutación se guardan para la figura', pm.reps.length === 199);
}

sec('Bloque 4 · el tamaño en palabras');
t('Cohen: .35 es mediana', PairStat.size(0.35, 'cohen').es === 'mediana');
t('Cohen: −.55 es grande', PairStat.size(-0.55, 'cohen').es === 'grande');
t('Evans: .85 es muy fuerte', PairStat.size(0.85, 'evans').es === 'muy fuerte');
t('Gignac y Szodorai: .25 es típica', PairStat.size(0.25, 'gignac').es === 'típica');
{
  const d = Plot.distribution({ reps: rn4(300), marks: [{ v: 0, label: 'θ' }], band: { lo: -1, hi: 1 } });
  const doc = new DOMParser().parseFromString(d, 'image/svg+xml');
  t('la distribución de réplicas dibuja barras y la marca', doc.querySelectorAll('.pl-bars rect').length > 5 && doc.querySelectorAll('.pl-marklab').length === 1);
  const fo = Plot.forest({ rows: [{ label: 'r', est: 0.5, lo: 0.3, hi: 0.7, fam: 'lin', main: true }, { label: 'ρ', est: 0.4, lo: NaN, hi: NaN, fam: 'rank' }] });
  const df = new DOMParser().parseFromString(fo, 'image/svg+xml');
  t('el bosque: una fila por coeficiente y sólo el que tiene intervalo lo dibuja', df.querySelectorAll('.fr-est').length === 2 && df.querySelectorAll('.fr-ci').length === 3);
}
