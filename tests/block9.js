/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Blocks 9 to 13: agreement, structured data, networks,
   comparing and combining correlations, palettes and references. The
   comparisons with R are in validation/block9 … validation/block12. */

const R9 = Num.rng(20261009);
const rn9 = n => Array.from({ length: n }, () => R9.normal());

sec('Bloque 9 · acuerdo y fiabilidad');
{
  const x = rn9(80), shift = x.map(v => v + 2), noisy = x.map(v => v + 0.5 * R9.normal());
  near('CCC de un método consigo mismo = 1', Agree.ccc(x, x).est, 1, 1e-12);
  const c = Agree.ccc(x, shift);
  t('un sesgo fijo baja la CCC aunque r = 1', c.est < 0.6 && Math.abs(c.r - 1) < 1e-12, c.est);
  near('CCC = r · C_b', Agree.ccc(x, noisy).est, Agree.ccc(x, noisy).r * Agree.ccc(x, noisy).Cb, 1e-12);
  near('Bland–Altman: el sesgo es la media de las diferencias', Agree.blandAltman(shift, x).bias, 2, 1e-12);
  const M = x.map((v, i) => [v, v, v]), I = Agree.icc(M);
  t('evaluadores idénticos: todas las formas del ICC valen 1', I.forms.every(f => Math.abs(f.est - 1) < 1e-9), I.forms.map(f => f.est).join(', '));
  const a = Array.from({ length: 60 }, (_, i) => i % 4), k = Agree.kappa2(a, a);
  near('κ de Cohen con acuerdo perfecto = 1', k.est, 1, 1e-12);
  near('κ de Fleiss con acuerdo perfecto = 1', Agree.fleiss(a.map(v => [v, v, v])).est, 1, 1e-12);
  near('W de Kendall con órdenes idénticos = 1', Agree.kendallW(x.map(v => [v, v, v, v])).est, 1, 1e-12);
  near('α de Krippendorff con acuerdo perfecto = 1', Agree.kripp(a.map(v => [v, v]), 'nominal').est, 1, 1e-12);
  const kq = Agree.kappa2(a, a.map(v => Math.min(3, v + (R9() < 0.3 ? 1 : 0))), 'quadratic');
  t('κ ponderada entre −1 y 1', kq.est > -1 && kq.est <= 1, kq.est);
}

sec('Bloque 10 · datos con estructura');
{
  /* Simpson: inside each group y falls with x, between the groups it rises */
  const g = [], x = [], y = [];
  for (let k = 0; k < 4; k++) for (let i = 0; i < 30; i++) { const u = R9.normal(); g.push(k); x.push(3 * k + u); y.push(3 * k - 0.8 * u + 0.3 * R9.normal()); }
  const G = Struct.groups(x, y, g);
  t('paradoja de Simpson: r total > 0, r dentro de los grupos < 0', G.total > 0 && G.within < 0, `${G.total} · ${G.within}`);
  const s = [], xr = [], yr = [];
  for (let k = 0; k < 10; k++) for (let i = 0; i < 6; i++) { const u = R9.normal(); s.push(k); xr.push(5 * k + u); yr.push(-2 * k + u + 0.4 * R9.normal()); }
  const rm = Struct.repeated(s, xr, yr);
  t('medidas repetidas: r dentro de los sujetos > 0 aunque la ingenua sea < 0', rm.r > 0.5 && rm.ignored < 0, `${rm.r} · ${rm.ignored}`);
  /* an AR(1) series */
  const ar = [0]; for (let i = 1; i < 2000; i++) ar.push(0.7 * ar[i - 1] + R9.normal());
  const fit = Struct.arYW(ar);
  t('Yule–Walker recupera φ = .7 de un AR(1)', fit.order >= 1 && Math.abs(fit.ar[0] - 0.7) < 0.05, fit.ar);
  const cc = Struct.ccf(ar, ar, 3);
  near('la correlación cruzada de una serie consigo misma en el rezago 0 es 1', cc.lags.find(l => l.lag === 0).r, 1, 1e-12);
  const ang = rn9(50).map(v => (v * 60 + 720) % 360 * Math.PI / 180);
  near('correlación circular de un ángulo consigo mismo = 1', Struct.circCirc(ang, ang).r, 1, 1e-12);
  const parts = [rn9(30).map(v => Math.exp(v)), rn9(30).map(v => Math.exp(v)), rn9(30).map(v => Math.exp(v))], cl = Struct.clr(parts);
  near('la razón logarítmica centrada suma 0 en cada fila', cl[0][4] + cl[1][4] + cl[2][4], 0, 1e-12);
  near('ρp de una parte consigo misma = 1', Struct.rhoP(cl[0], cl[0]), 1, 1e-12);
  const tree = Struct.parseNewick('((a:1,b:1):1,(c:1,d:1):1);');
  t('el árbol de Newick tiene sus cuatro puntas', tree.tips.length === 4 && tree.tips.join('') === 'abcd', tree.tips);
}

sec('Bloque 11 · redes');
{
  /* two blocks of three variables, correlated inside, independent between */
  const f1 = rn9(400), f2 = rn9(400), X = [0, 1, 2, 3, 4, 5].map(j => (j < 3 ? f1 : f2).map(v => v + 0.7 * R9.normal()));
  const R = Mat.compute(X, { method: 'pearson' }).R;
  const g0 = Net.graphLasso(R, 0, { thr: 1e-12 }), Ri = Mat.inverse(R);
  t('el lazo gráfico con ρ = 0 da la inversa', Math.max(...g0.Theta.map((r, i) => Math.max(...r.map((v, j) => Math.abs(v - Ri[i][j]))))) < 1e-6);
  const E = Net.ebicLasso(R, 400), W = E.net;
  t('la red EBIC es simétrica y de diagonal 0', W.every((r, i) => r[i] === 0 && r.every((v, j) => Math.abs(v - W[j][i]) < 1e-12)));
  const L = Net.louvain(W);
  t('Louvain encuentra los dos bloques', L.count === 2 && L.member[0] === L.member[1] && L.member[0] === L.member[2] && L.member[3] === L.member[5] && L.member[0] !== L.member[3], L.member);
  near('modularidad de una sola comunidad = 0', Net.modularity(W, [0, 0, 0, 0, 0, 0]), 0, 1e-12);
  const C = Net.centrality(W);
  near('la suma de las fuerzas es el doble de la suma de |w|', C.strength.reduce((s, v) => s + v, 0), 2 * W.reduce((s, r, i) => s + r.slice(i + 1).reduce((a, v) => a + Math.abs(v), 0), 0), 1e-12);
  const pos = Net.layoutFR(W, { seed: 3 });
  t('el acomodo de fuerzas da posiciones finitas', pos.every(p => isFinite(p[0] !== undefined ? p[0] : p.x)));
}

sec('Bloque 12 · comparar, corregir, planear y combinar');
{
  const a = Infer.indep(0.5, 80, 0.3, 120), b = Infer.indep(0.3, 120, 0.5, 80);
  near('cambiar el orden de los grupos cambia el signo de z', a.tests[0].stat, -b.tests[0].stat, 1e-14);
  near('… y refleja el intervalo de Zou', a.zou[0], -b.zou[1], 1e-14);
  near('correlaciones traslapadas iguales: todas las pruebas valen 0', Math.max(...Infer.overlap(0.4, 0.4, 0.3, 90).tests.map(x => Math.abs(x.stat))), 0, 1e-12);
  near('caso II con U = 1 no cambia r', Infer.caseII(0.37, 1), 0.37, 1e-15);
  near('caso III con U = 1 no cambia r', Infer.caseIII(0.37, 0.5, 0.2, 1), 0.37, 1e-15);
  near('atenuación con fiabilidades 1 no cambia r', Infer.attenuation(0.37, 1, 1), 0.37, 1e-15);
  t('caso II inverso: restringir y corregir regresa a r', Math.abs(Infer.caseII(Infer.caseII(0.5, 0.5), 2) - 0.5) < 1e-12);
  near('con ρ = 0 la potencia exacta es α', Infer.powerExact(0, 30, 0.05), 0.05, 1e-10);
  near('la densidad exacta de r integra 1', PairStat.integrate(r => Infer.densityR(r, 0.6, 25), -1 + 1e-12, 1 - 1e-12, { abs: 0, tol: 1e-12 }), 1, 1e-9);
  t('a mayor ρ, menos casos', Infer.sampleSize(0.5, 0.8, 0.05).n < Infer.sampleSize(0.3, 0.8, 0.05).n);
  const M = Infer.meta([{ r: 0.3, n: 50 }, { r: 0.3, n: 80 }, { r: 0.3, n: 120 }]);
  near('estudios idénticos: Q = 0', M.Q, 0, 1e-12);
  t('… τ² = 0 e I² = 0 en los cuatro modelos', [M.fixed, M.dl, M.reml, M.hsz].every(m => m.tau2 === 0 && m.I2 === 0));
  near('… y la r combinada es la de cada uno', M.reml.r, 0.3, 1e-12);
  const H = Infer.meta([{ r: 0.1, n: 60 }, { r: 0.5, n: 70 }, { r: 0.3, n: 200 }, { r: 0.6, n: 40 }, { r: -0.1, n: 90 }]);
  t('con heterogeneidad, el aleatorio da un intervalo más ancho que el fijo', H.reml.se > H.fixed.se && H.reml.tau2 > 0);
  t('el intervalo de predicción contiene al de confianza', H.reml.rpi[0] <= H.reml.rci[0] && H.reml.rpi[1] >= H.reml.rci[1]);
  const J = Infer.jennrich([[1, 0.5], [0.5, 1]], [[1, 0.5], [0.5, 1]], 50, 60);
  near('matrices iguales: χ² de Jennrich = 0', J.chi2, 0, 1e-12);
}

sec('Bloque 13 · paletas y referencias');
{
  const p = Pal.custom({ hPos: 268, hNeg: 33, L1: 0.46, C1: 0.95 * Math.min(Pal.maxChroma(0.46, 268), Pal.maxChroma(0.46, 33)) });
  const c = Pal.check(p);
  t('la paleta añil–achiote hecha en el diseñador pasa todas las pruebas', c.pass, JSON.stringify(c.ok));
  const q = Pal.register(Object.assign({}, p, { id: 'prueba-13' }));
  t('una paleta registrada se recupera por su nombre', Pal.get('prueba-13') === q);
  t('Pal.get acepta la paleta misma', Pal.get(q) === q);
  t('la paleta de un rojo con su complemento cercano falla con daltonismo', !Pal.check(Pal.custom({ hPos: 140, hNeg: 25, L1: 0.55 })).ok.sign);
  const keys = new Set(Object.keys(Theory.REFS));
  const missing = Catalog.CATALOG.flatMap(m => m.refs).filter(k => !keys.has(k));
  t('cada referencia del catálogo existe', missing.length === 0, missing.join(', '));
  t('cada referencia tiene autor, año y tema', Object.values(Theory.REFS).every(r => /\(\d{4}[a-z]?\)/.test(r[0]) && Theory.REF_TOPICS[r[1]]), Object.entries(Theory.REFS).filter(([, r]) => !/\(\d{4}[a-z]?\)/.test(r[0]) || !Theory.REF_TOPICS[r[1]]).map(([k]) => k).join(', '));
  t('en inglés, la «y» entre autores pasa a «&»', !/, y [A-Z]/.test(Theory.refText('landis1977', 'en')) && /&/.test(Theory.refText('landis1977', 'en')));
}
