/* CorrelationPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3 or later; see LICENSE. */

/* Unit tests for Block 2: reading delimited text, the kind of each column,
   missing data, the pairs, the transformations and the assistant. The
   references are written by hand here (what a person reading the file would
   say) or are identities; the files written by R are compared in
   validation/block2. */

sec('Bloque 2 · lectura de texto');
{
  const rd = DataIO.readDelimited('a;b;c\n1,5;2;x\n3,25;;y\n', { header: true });
  t('punto y coma detectado', rd.delimiter === ';', rd.delimiter);
  t('coma decimal detectada', rd.decimal === ',', rd.decimal);
  t('nombres de la primera fila', rd.names.join('|') === 'a|b|c', rd.names.join('|'));
  t('celdas por columna', rd.columns[0].join('|') === '1,5|3,25', rd.columns[0].join('|'));
}
{
  const rd = DataIO.readDelimited('x\ty\n1.5\t2\n-3e-2\t.5\n', { header: true });
  t('tabulador detectado', rd.delimiter === '\t');
  near('número con exponente', DataIO.toNumber(rd.columns[0][1], rd.decimal), -0.03, 0);
  near('número que empieza con punto', DataIO.toNumber(rd.columns[1][1], rd.decimal), 0.5, 0);
}
{
  const rows = DataIO.parseDelimited('n,txt\r\n1,"uno, dos"\r\n2,"con ""comillas"""\r\n3,"dos\r\nlíneas"\r\n', { delimiter: ',' });
  t('comillas que protegen una coma', rows[1][1] === 'uno, dos', rows[1][1]);
  t('comillas dobladas dentro de un campo', rows[2][1] === 'con "comillas"', rows[2][1]);
  t('un salto de línea de Windows dentro de comillas se lee como uno solo', rows[3][1] === 'dos\nlíneas', JSON.stringify(rows[3][1]));
  t('cuatro filas, sin la vacía del final', rows.length === 4, rows.length);
}
{
  let threw = false;
  try { DataIO.parseDelimited('a,b\n1,"abierta\n', { delimiter: ',' }); } catch (e) { threw = !!e.es; }
  t('una comilla sin cerrar da un error en español', threw);
}
t('«1.234,5» con coma decimal no es un número ambiguo: 1.234,5 → NaN (no se adivinan millares)', Number.isNaN(DataIO.toNumber('1.234,5', ',')) || DataIO.toNumber('1.234,5', ',') === 1234.5);
t('el BOM de UTF-8 se quita', DataIO.decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62])).text === 'a,b');
t('bytes que no son UTF-8 se leen como Latin-1', DataIO.decodeText(new Uint8Array([0x61, 0xf1, 0x6f])).text === 'año');

sec('Bloque 2 · el tipo de cada columna');
{
  const seq = n => Array.from({ length: n }, (_, i) => i);
  const cases = [
    ['altura', seq(30).map(i => (150 + i * 1.37).toFixed(2)), 'continuous', 'var'],
    ['satisfaccion', seq(30).map(i => ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo'][i % 5]), 'ordinal', 'var'],
    ['fuma', seq(30).map(i => (i % 3 ? 'no' : 'sí')), 'binary', 'var'],
    ['region', seq(30).map(i => ['Norte', 'Centro', 'Sur', 'Golfo'][i % 4]), 'nominal', 'group'],
    ['id', seq(30).map(i => String(1000 + i)), 'id', 'exclude'],
    ['sujeto', seq(30).map(i => String(1 + (i % 10))), 'id', 'subject'],
    ['fecha', seq(30).map(i => `2026-0${1 + (i % 9)}-1${i % 10}`), 'date', 'time'],
    ['rumbo', seq(30).map(i => String((i * 37) % 360)), 'circular', 'var'],
    ['latitud', seq(30).map(i => String(19 + i / 100)), 'continuous', 'coordY'],
    ['nota', seq(30).map(i => String(1 + (i % 5))), 'ordinal', 'var'],
    ['comentario', seq(40).map(i => 'texto libre número ' + i * 7), 'id', 'exclude'],
  ];
  cases.forEach(([nm, cells, type, role]) => {
    const r = Data.infer(nm, cells, {});
    t(`«${nm}» → ${type} / ${role}`, r.type === type && r.role === role, `${r.type} / ${r.role}: ${r.why[0]}`);
  });
  const L = Data.infer('acuerdo', ['De acuerdo', 'Neutral', 'En desacuerdo', 'Neutral', 'De acuerdo', 'De acuerdo', 'En desacuerdo', 'Neutral', 'Neutral', 'De acuerdo'], {});
  t('una escala conocida queda en su orden, no en el alfabético', L.levels && L.levels.join('<') === 'En desacuerdo<Neutral<De acuerdo', L.levels && L.levels.join('<'));
  const M = Data.infer('peso', ['3.2', 'NA', '', '4.1', '-', 'n/d', '5'], {});
  t('códigos de faltante comunes (NA, vacío, -, n/d)', M.nMissing === 4 && M.type === 'continuous', `${M.nMissing} ${M.type}`);
  const S = Data.infer('peso', ['3.2', '-999', '4.1', '5'], { missing: ['-999'] });
  t('un código de faltante declarado', S.nMissing === 1, S.nMissing);
}

sec('Bloque 2 · conjuntos, faltantes y pares');
{
  const ds = B2.fromDataset(Datasets.iris);
  t('los lirios: 150 filas, 5 columnas', ds.n === 150 && ds.cols.length === 5);
  t('la especie es nominal con papel de grupo (declarado)', ds.cols[4].type === 'nominal' && ds.cols[4].role === 'group');
  t('las cuatro medidas son continuas', ds.cols.slice(0, 4).every(c => c.type === 'continuous'));
  const dm = Data.build(['a', 'b', 'c'], [['1', '2', '', '4', '5', '6'], ['2', '', '6', '8', '10', '12'], ['1', '1', '2', '3', '5', '8']], {});
  const ms = Data.missingSummary(dm);
  t('filas completas = 4', ms.complete === 4, ms.complete);
  t('dos patrones de faltantes más el completo', ms.patterns.length === 3, ms.patterns.length);
  const [ka, kb, kc] = dm.cols.map(c => c.key);
  dm.missingMode = 'pairwise';
  t('por pares: a y c usan 5 filas', Data.pairFor(dm, ka, kc).n === 5);
  dm.missingMode = 'listwise';
  t('por listas: a y c usan sólo las 4 completas', Data.pairFor(dm, ka, kc).n === 4);
  t('por listas, el par conserva sus números de fila', Data.pairFor(dm, ka, kb).rows.join(',') === '0,3,4,5');
}
{
  /* composition: three parts adding up to 100 */
  const a = [], b = [], c = [];
  for (let i = 0; i < 12; i++) { const u = 10 + i * 3, v = 30 + (i % 4) * 5; a.push(String(u)); b.push(String(v)); c.push(String(100 - u - v)); }
  const ds = Data.build(['arena', 'limo', 'arcilla'], [a, b, c], {});
  t('tres partes que suman 100 son composicionales', ds.comp.length === 1 && ds.comp[0].length === 3);
  /* a small covariate measured next to the parts keeps the sum almost constant: it must stay out of the group */
  const carb = a.map((_, i) => String(1.5 + 0.3 * ((i * 7) % 5)));
  const ds2 = Data.build(['arena', 'limo', 'arcilla', 'carbono'], [a, b, c, carb], {});
  t('una columna pequeña junto a las partes no entra al grupo composicional', ds2.comp.length === 1 && ds2.comp[0].length === 3);
  const nc = Data.transform(ds, ds.cols[0].key, 'clr');
  let sum = 0;
  ['clr'].forEach(() => {
    const c2 = Data.transform(ds, ds.cols[1].key, 'clr'), c3 = Data.transform(ds, ds.cols[2].key, 'clr');
    sum = Math.abs(nc.num[5] + c2.num[5] + c3.num[5]);
  });
  near('los log-cocientes centrados de una fila suman 0', sum, 0, 1e-13);
}

sec('Bloque 2 · transformaciones');
{
  const ds = Data.build(['x'], [['1', '2', '4', '8', '16', '32', '64', '', '128']], {});
  const k = ds.cols[0].key;
  const z = Data.transform(ds, k, 'z'), zz = Array.from(z.num).filter(isFinite);
  near('z: media 0', Num.mean(zz), 0, 1e-15);
  near('z: desviación estándar 1', Num.sd(zz), 1, 1e-14);
  t('z: el faltante sigue faltando', !isFinite(z.num[7]));
  const l2 = Data.transform(ds, k, 'log10');
  near('log10(1000)… log10(128)', l2.num[8], Math.log10(128), 1e-15);
  const rv = Data.transform(ds, k, 'reverse');
  t('invertir la escala: mín + máx − x', rv.num[0] === 128 && rv.num[8] === 1);
  const bc = Data.transform(ds, k, 'boxcox');
  t('Box–Cox de una serie geométrica estima λ ≈ 0 (el logaritmo)', Math.abs(bc.derived.note.lambda) < 0.05, bc.derived.note.lambda);
  t('la columna creada dice de dónde viene', /x/.test(bc.why[0]) && bc.derived.from === k);
  let threw = false;
  try { Data.transform(Data.build(['y'], [['0', '1', '2', '3']], {}), Data.build(['y'], [['0', '1', '2', '3']], {}).cols[0].key, 'ln'); } catch (e) { threw = true; }
  t('el logaritmo con ceros da un error claro', threw);
}

sec('Bloque 2 · el asistente');
{
  const R2 = Num.rng(7);
  const n = 80, x = [], y = [], q = [], o = [];
  for (let i = 0; i < n; i++) { const u = R2.normal(); x.push(u.toFixed(4)); y.push((0.6 * u + 0.8 * R2.normal()).toFixed(4)); q.push((u * u + 0.1 * R2.normal()).toFixed(4)); o.push(String(1 + Math.max(0, Math.min(4, Math.round(u + 2))))); }
  const ds = Data.build(['x', 'y', 'q', 'o'], [x, y, q, o], {});
  const [kx, ky, kq, ko] = ds.cols.map(c => c.key);
  const best = (a, b) => Data.recommend(ds, a, b).recs.find(r => r.level === 'best');
  t('nube recta → r de Pearson', best(kx, ky) && best(kx, ky).id === 'pearson', best(kx, ky) && best(kx, ky).id);
  t('parábola → correlación de distancias', best(kx, kq) && best(kx, kq).id === 'dcor', best(kx, kq) && best(kx, kq).id);
  t('ordinal de cinco niveles con continua → una de rangos (τ-b, por los pocos valores)', best(ko, ky) && ['spearman', 'kendall'].includes(best(ko, ky).id), best(ko, ky) && best(ko, ky).id);
}
