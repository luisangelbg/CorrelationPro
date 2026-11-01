/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Block 1: the numerical core, the coefficients, colour, the
   reporting styles, the glyphs, the catalogue and the labs.

   The references are independent of the code under test:
     · brute force written here, inside the test (concordant pairs counted
       one by one, every permutation of small samples, the τ* kernel over the
       24 orderings of every quadruple);
     · identities that must hold whatever the implementation (Spearman = Pearson
       of the ranks, τb = √(d(Y|X)·d(X|Y)), β changes sign with x, the lit
       fraction of the moon is |r|, the five summaries of the «same r» lab never
       change);
     · values computed with R 4.4.2 (iris), and the comparisons with R
       packages in validation/block1. */

/* ---------------- helpers ---------------- */
const R1 = Num.rng(20261003);
const randn = (n, r) => Array.from({ length: n }, () => (r || R1).normal());
const roundTo = (a, k) => a.map(v => Math.round(v * k) / k);
function bruteConcordance(x, y) {
  let C = 0, D = 0, tx = 0, ty = 0, both = 0;
  for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) {
    const a = Math.sign(x[i] - x[j]), b = Math.sign(y[i] - y[j]);
    if (a && b) { if (a === b) C++; else D++; } else if (!a && !b) both++; else if (!a) tx++; else ty++;
  }
  return { C, D, n1: tx + both, n2: ty + both, n3: both };
}
function permutations(n) {
  const out = [];
  (function rec(p, left) { if (!left.length) { out.push(p); return; } left.forEach((v, i) => rec(p.concat(v), left.filter((_, j) => j !== i))); })([], [...Array(n).keys()]);
  return out;
}

/* ---------------- numerical core ---------------- */
sec('Núcleo numérico');
near('Φ(0) = ½', Num.pnorm(0), 0.5, 1e-16);
near('Φ⁻¹(Φ(1.234)) = 1.234', Num.qnorm(Num.pnorm(1.234)), 1.234, 1e-13);
near('Φ⁻¹(0.975) = 1.959964', Num.qnorm(0.975), 1.959963984540054, 1e-14);
near('t con 1 gl es Cauchy: P(T ≤ 1) = 3/4', Num.pt(1, 1), 0.75, 1e-14);
near('t con 2 gl, forma cerrada: P(T ≤ 2) = ½ + 1/√6·…', Num.pt(2, 2), 0.5 + 2 / (2 * Math.sqrt(2 + 4)), 1e-14);
near('qt inversa de pt (gl = 7)', Num.pt(Num.qt(0.9123, 7), 7), 0.9123, 1e-13);
near('χ² con 2 gl es exponencial: P(X > 3) = e^(−1.5)', Num.pchisq(3, 2, true), Math.exp(-1.5), 1e-14);
near('log Γ(10) = log 9!', Num.lgamma(10), Math.log(362880), 1e-13);
near('log B(500, ½) por Stirling = suma de log Γ en precisión extendida', Num.lbeta(500, 0.5), Num.lgamma(500) + Num.lgamma(0.5) - Num.lgamma(500.5), 1e-10);
near('I_x(a, 1) = x^a', Num.betaInc(0.3, 2.5, 1), Math.pow(0.3, 2.5), 1e-14);
{
  const d = Num.kendallDist(12);
  near('la distribución exacta de Kendall suma 1 (n = 12)', d.pmf.reduce((a, b) => a + b, 0), 1, 1e-13);
  /* brute force: inversions of every permutation of 6 */
  const P = permutations(6), cnt = new Array(16).fill(0);
  P.forEach(p => { let inv = 0; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (p[i] > p[j]) inv++; cnt[inv]++; });
  const d6 = Num.kendallDist(6);
  t('Kendall exacto = conteo de inversiones de las 720 permutaciones de 6', cnt.every((c, k) => Math.abs(c / 720 - d6.pmf[k]) < 1e-15));
}
{
  const P = permutations(7), cnt = new Map();
  P.forEach(p => { let S = 0; p.forEach((v, i) => { S += (v - i) ** 2; }); cnt.set(S, (cnt.get(S) || 0) + 1); });
  let ok = true;
  for (const S of [0, 10, 24, 56, 100, 112]) { const want = [...cnt.entries()].filter(([s]) => s >= S).reduce((a, [, c]) => a + c, 0) / 5040; if (Math.abs(Num.pSpearmanUpper(S, 7) - want) > 1e-14) ok = false; }
  t('Spearman exacto: P(S ≥ s) = conteo sobre las 5040 permutaciones de 7', ok);
  near('colas de Spearman complementarias: P(S ≤ s) + P(S ≥ s + 2) = 1 (n = 30)', Num.pSpearmanLower(3000, 30) + Num.pSpearmanUpper(3002, 30), 1, 1e-12);
}
{
  const a = Num.rng(5), b = Num.rng(5);
  t('el generador con la misma semilla repite la secuencia', [1, 2, 3, 4, 5].every(() => a() === b()));
  const z = randn(20000, Num.rng(9));
  near('normales del generador: media ≈ 0', Num.mean(z), 0, 0.03);
  near('normales del generador: varianza ≈ 1', Num.variance(z), 1, 0.04);
}
near('suma compensada: 1e16 + 1 − 1e16 = 1', Num.sum([1e16, 1, -1e16]), 1, 0);
near('varianza en dos pasadas con media enorme', Num.variance([1e9 + 4, 1e9 + 7, 1e9 + 13, 1e9 + 16]), 30, 1e-9);

/* ---------------- coefficients ---------------- */
sec('Coeficientes de dos variables');
{
  const x = roundTo(randn(60), 2), y = x.map(v => Math.round((v * 0.5 + R1.normal()) * 2) / 2);
  const k = Coef.concordance(x, y), b = bruteConcordance(x, y);
  t('Knight O(n log n) = conteo de pares uno por uno (con empates)', k.C === b.C && k.D === b.D && k.n1 === b.n1 && k.n2 === b.n2 && k.n3 === b.n3, JSON.stringify([k, b]));
  const K = Coef.kendall(x, y), S = Coef.somers(x, y);
  near('τ-b = √(d(Y|X)·d(X|Y))', K.est, Math.sign(K.est) * Math.sqrt(S.extra.dYX * S.extra.dXY), 1e-14);
  near('Spearman = Pearson de los rangos promedio', Coef.spearman(x, y).est, Coef.rawPearson(Num.rank(x), Num.rank(y)), 1e-15);
  near('γ = (C − D)/(C + D) por fuerza bruta', Coef.gamma(x, y).est, (b.C - b.D) / (b.C + b.D), 1e-15);
  const nx = x.map(v => -v);
  near('β de Blomqvist cambia de signo (sólo de signo) si x cambia de signo', Coef.blomqvist(nx, y).est, -Coef.blomqvist(x, y).est, 1e-15);
}
{
  const x = randn(25), y = x.map(v => 2 * v + 1);
  near('r = 1 con una recta creciente', Coef.pearson(x, y).est, 1, 1e-15);
  near('ξ alcanza su máximo (n − 2)/(n + 1) cuando y es función monótona de x', Coef.xi(x, x.map(Math.exp)).est, 23 / 26, 1e-14);
  t('ξ con una función no monótona (parábola) queda por debajo de ese máximo', Coef.xi(x, x.map(v => v * v)).est < 23 / 26);
  near('30·D de Hoeffding = 1 con una relación monótona perfecta', Coef.hoeffding(x, x.map(Math.exp)).est, 1, 1e-12);
  near('dCor = 1 con una relación lineal', Coef.dcor(x, y).est, 1, 1e-12);
}
{
  const x = roundTo(randn(11), 1), y = roundTo(randn(11), 1);
  /* τ* over every ordered quadruple of distinct indices, kernel from its definition */
  const I = (a, b, c, d) => Math.max(a, b) < Math.min(c, d) ? 1 : 0;
  const ak = z => I(z[0], z[2], z[1], z[3]) + I(z[1], z[3], z[0], z[2]) - I(z[0], z[3], z[1], z[2]) - I(z[1], z[2], z[0], z[3]);
  let s = 0, m = 0;
  const n = x.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) for (let l = 0; l < n; l++) {
    if (new Set([i, j, k, l]).size < 4) continue;
    s += ak([x[i], x[j], x[k], x[l]]) * ak([y[i], y[j], y[k], y[l]]); m++;
  }
  near('τ* con tabla de patrones = definición sobre las cuádruplas ordenadas (con empates)', Coef.tauStar(x, y).est, s / m, 1e-14);
}
{
  /* exact p-values against full enumeration: Kendall and Spearman, n = 7 */
  const x = [3.1, 1.2, 4.4, 2.0, 5.9, 0.5, 6.6], y = [2.0, 1.5, 3.3, 2.8, 4.9, 0.4, 3.9];
  const P = permutations(7), obsK = Coef.kendall(x, y).est, obsS = Coef.spearman(x, y).est;
  let geK = 0, geS = 0;
  P.forEach(p => { const yp = p.map(i => y[i]); if (Math.abs(Coef.kendall(x, yp).est) >= Math.abs(obsK) - 1e-12) geK++; if (Math.abs(Coef.spearman(x, yp).est) >= Math.abs(obsS) - 1e-12) geS++; });
  near('p exacto de Kendall = proporción de las 5040 permutaciones con |τ| ≥ |τ observado|', Coef.kendall(x, y).p, geK / 5040, 1e-12);
  near('p exacto de Spearman = proporción de las 5040 permutaciones con |ρ| ≥ |ρ observado|', Coef.spearman(x, y).p, geS / 5040, 1e-12);
}
{
  const D = Datasets.iris, v = D.vars;
  near('iris: r(largo, ancho del sépalo) = −0.117570 (R)', Coef.pearson(v[0].v, v[1].v).est, -0.117569784133002, 1e-14);
  const g = v[4].v;
  [0.74254668566516, 0.525910717282825, 0.457227816394113].forEach((want, k) => {
    const ix = g.map((s, i) => s === k ? i : -1).filter(i => i >= 0);
    near(`iris: la misma r dentro de ${D.vars[4].levels[k]} (R)`, Coef.pearson(ix.map(i => v[0].v[i]), ix.map(i => v[1].v[i])).est, want, 1e-14);
  });
  const P = Coef.pearson(v[2].v, v[3].v);
  near('iris: r de los pétalos = 0.962865 (R)', P.est, 0.962865431402796, 1e-14);
  near('iris: intervalo de los pétalos, límite inferior (R)', P.ci.lo, 0.949052459311114, 1e-13);
  near('iris: estadístico t de los pétalos (R)', P.stat.value, 43.3872373820692, 1e-11);
}
{
  const x = randn(40), y = x.map(v => v + R1.normal());
  const pm = Coef.permutation((a, b) => Coef.rawPearson(a, b), x, y, { B: 199, seed: 4 });
  t('el valor p por permutación nunca es cero: (k + 1)/(B + 1)', pm.p >= 1 / 200 && pm.p <= 1);
  t('cada coeficiente informa su convenio', Coef.PAIR.every(c => { const r = c.f(x, y); return Array.isArray(r.conv) && r.conv.length > 0; }));
}

/* ---------------- colour ---------------- */
sec('Color y paletas');
{
  const lab = Pal.hexToOklab('#FFFFFF');
  near('el blanco en OKLab es L = 1', lab[0], 1, 1e-6);
  t('ida y vuelta hex → OKLab → hex en 512 colores', [...Array(512).keys()].every(i => { const h = Pal.rgbToHex([(i >> 6) / 7, ((i >> 3) & 7) / 7, (i & 7) / 7]); return Pal.oklabToHex(Pal.hexToOklab(h)) === h; }));
  t('las 19 paletas pasan sus cinco controles', Pal.ALL.every(p => Pal.check(p).pass), Pal.ALL.filter(p => !Pal.check(p).pass).map(p => p.id).join(','));
  t('las 12 versiones oscuras pasan sus controles sobre fondo negro', Pal.DIV.every(p => Pal.check(Pal.darkVersion(p), '#141414').pass));
  t('invertir el signo intercambia los extremos', Pal.color('anil', 0.7, { invert: true }) === Pal.color('anil', -0.7));
  const m = Pal.checkCategorical('laca');
  t('paleta categórica propia: distancia mínima ≥ 0.08 con visión habitual y los tres daltonismos', Object.values(m).every(v => v >= 0.08), JSON.stringify(m));
  near('una paleta divergente tiene el mismo gris en +1 y −1', Pal.hexToOklab(Pal.grey(Pal.color('cortes', 1)))[0], Pal.hexToOklab(Pal.grey(Pal.color('cortes', -1)))[0], 0.03);
  t('el blanco no cambia con ninguna simulación de daltonismo', ['protan', 'deutan', 'tritan'].every(k => Pal.simulate(k, '#FFFFFF') === '#FFFFFF'));
}

/* ---------------- reporting styles ---------------- */
sec('Estilos de reporte');
{
  const res = { id: 'pearson', est: 0.4512, stat: { name: 't', df: 48 }, ci: { lo: 0.1963, hi: 0.6474, level: 0.95 }, p: 0.00098 };
  t('APA: r(48) = .45, 95% CI [.20, .65], p < .001', Fmt.sentence(res, { style: 'apa', decimal: '.', lang: 'en', html: false }) === 'r(48) = .45, 95% CI [.20, .65], p < .001', Fmt.sentence(res, { style: 'apa', lang: 'en' }));
  t('biomédico: cero inicial, P mayúscula, «0.20 to 0.65»', Fmt.sentence(res, { style: 'sampl', decimal: '.', lang: 'en', html: false }) === 'r(48) = 0.45, 95% CI, 0.20 to 0.65, P < 0.001', Fmt.sentence(res, { style: 'sampl', lang: 'en' }));
  t('normativo con coma: 0,45 y límites separados por punto y coma', Fmt.ci(0.1963, 0.6474, 0.95, { style: 'nom', decimal: ',', lang: 'es' }) === 'IC 95 % [0,20; 0,65]', Fmt.ci(0.1963, 0.6474, 0.95, { style: 'nom', decimal: ',', lang: 'es' }));
  t('signo menos verdadero (U+2212), nunca guion', Fmt.bounded(-0.32, 2, { style: 'apa' }) === '−.32');
  t('p = .032 en APA y P = 0.03 en el biomédico', Fmt.p(0.0321, { style: 'apa' }) === 'p = .032' && Fmt.p(0.0321, { style: 'sampl' }) === 'P = 0.03');
  t('el cero no lleva signo: −0.001 con dos decimales es 0.00', Fmt.num(-0.001, 2, { style: 'nom' }) === '0.00');
}

/* ---------------- glyphs ---------------- */
sec('Glifos');
{
  const s = 20;
  [0.1, 0.25, 0.5, 0.8].forEach(r => near(`media luna: la parte iluminada es exactamente |r| = ${r}`, Glyph.moonFraction(r), r, 1e-15));
  const full = Glyph.area(Glyph.points('moon', 0.999999, s, 720)), half = Glyph.area(Glyph.points('moon', 0.3, s, 720));
  near('media luna: área del polígono ∝ |r| (0.3)', half / full, 0.3, 0.01);
  near('círculo: área ∝ |r|', Glyph.area(Glyph.points('circle', 0.36, s, 720)) / Glyph.area(Glyph.points('circle', 0.81, s, 720)), 0.36 / 0.81, 0.005);
  near('cuadrado: área ∝ |r|', Glyph.area(Glyph.points('square', 0.25, s, 400)) / Glyph.area(Glyph.points('square', 1, s, 400)), 0.25, 0.01);
  const cxOf = P => P.reduce((a, q) => a + q[0], 0) / P.length;
  t('pastel: r > 0 se abre a la derecha y r < 0 a la izquierda', cxOf(Glyph.points('pie', 0.4, s)) > 0 && cxOf(Glyph.points('pie', -0.4, s)) < 0);
  t('elipse: r > 0 sube a la derecha', (() => { const p = Glyph.points('ellipse', 0.9, s, 360); const far = p.reduce((a, q) => (q[0] > a[0] ? q : a)); return far[1] < 0; })());
  t('todos los contornos tienen el mismo número de puntos (para transformarse)', Glyph.POLY.every(k => Glyph.points(k, 0.5, s).length === Glyph.N));
}

/* ---------------- catalogue and theory ---------------- */
sec('Catálogo y teoría');
{
  const C = Catalog.CATALOG;
  t('98 medidas en el catálogo', C.length === 98, C.length);
  t('identificadores únicos', new Set(C.map(c => c.id)).size === C.length);
  const missing = [];
  C.forEach(c => c.refs.forEach(k => { if (!Theory.REFS[k]) missing.push(c.id + ':' + k); }));
  t('cada referencia citada existe en la bibliografía', missing.length === 0, missing.join(' '));
  t('cada medida trae su descripción en los dos idiomas', C.every(c => c.what[0] && c.what[1] && c.es && c.en));
  const bad = C.filter(c => c.f && !/^<math display="block">.*<\/math>$/.test(c.f) || (c.f && (c.f.match(/<mrow>/g) || []).length !== (c.f.match(/<\/mrow>/g) || []).length)).map(c => c.id);
  t('cada fórmula es MathML bien cerrado', bad.length === 0, bad.join(' '));
  t('ningún nombre de programa ni de marca en los textos', !C.some(c => /\b(SPSS|SAS|Stata|Matlab|Excel|JASP|jamovi|R package|ggplot|corrplot)\b/i.test(JSON.stringify(c))));
  t('13 temas de teoría con texto en los dos idiomas', Theory.THEORY.length >= 12 && Theory.THEORY.every(x => x.es && x.en));
}

/* ---------------- labs ---------------- */
sec('Laboratorios');
{
  /* the «same r» lab: run its loop headless and check the five summaries */
  const R = Num.rng(77), P = [];
  for (let i = 0; i < 80; i++) { const a = R.normal(), b = R.normal(); P.push([54 + 16 * a, 48 + 14 * (0.15 * a + 0.99 * b)]); }
  const s = Labs.sums(P), target = Labs.round2(Labs.statsOf(s));
  for (let k = 0; k < 20000; k++) {
    const i = Math.floor(R() * P.length), [a, b] = P[i], na = a + R.normal() * 0.45, nb = b + R.normal() * 0.45;
    s.x += na - a; s.y += nb - b; s.xx += na * na - a * a; s.yy += nb * nb - b * b; s.xy += na * nb - a * b;
    if (Labs.round2(Labs.statsOf(s)) !== target) { s.x -= na - a; s.y -= nb - b; s.xx -= na * na - a * a; s.yy -= nb * nb - b * b; s.xy -= na * nb - a * b; continue; }
    P[i] = [na, nb];
  }
  const recomputed = Labs.round2(Labs.statsOf(Labs.sums(P)));
  t('misma r: tras 20 000 pasos, medias, desviaciones y r recalculadas desde cero siguen iguales', recomputed === target, recomputed + ' vs ' + target);
  t('la diferencia notable de una correlación baja cuando |r| sube', Labs.jnd(0) > Labs.jnd(0.5) && Labs.jnd(0.5) > Labs.jnd(0.9));
  const [x, y] = Labs.detData('parab', 300, 3);
  t('«qué detecta»: en la parábola r ≈ 0 y dCor no', Math.abs(Coef.pearson(x, y).est) < 0.2 && Coef.dcor(x, y).est > 0.4);
}
