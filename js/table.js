/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — the data model.

   A dataset is a list of columns. Each column keeps its raw cells (so that its
   kind can be changed at any time) and, from them, a numeric vector `num`
   (NaN where missing): the value itself for continuous and circular columns,
   the code of the level for ordinal, binary and nominal ones, days since
   1970-01-01 for dates.

   The kind of each column is inferred, never imposed: every guess comes with
   the reason, in words, so that the user can check it and change it.
     continuous · ordinal · binary · nominal · circular · date · id · text · empty
   and a role: var (to analyse), group, subject (repeated measures), time,
   coordX, coordY, weight, exclude.

   Also here: missing values (codes and patterns, pairwise or listwise), groups
   of compositional columns (parts that add up to a constant), the
   transformations, and the assistant that proposes a coefficient for a pair.

   Installs `Data` in the global object it is given; needs Num and Coef. */
function DataCore(g) {
'use strict';
const Num = g.Num, Coef = g.Coef;
const Data = {};
const strip = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/* ---------------- missing values ---------------- */
Data.MISSING = ['', 'na', 'n/a', 'n.a.', 'nan', 'null', 'none', '.', '-', '--', '?', 'nd', 'n.d.', 'n/d', 'n.d', 's/d', 's.d.', 'no disponible', 'sin dato', 'sin datos', '#n/a', '#na', '#value!', '#valor!', '#div/0!', '#¡valor!', '#¡div/0!', 'missing', 'faltante'];
const MISS = new Set(Data.MISSING.map(strip));
Data.isMissing = (v, extra) => v === null || v === undefined || (typeof v === 'number' ? !isFinite(v) : (MISS.has(strip(v)) || (extra && extra.has(strip(v)))));
/* numbers often used as «no data»: suggested, never applied without asking */
const SENTINELS = [-999, -99, -9999, 999, 9999, -9, 99, -1];

/* ---------------- dates ---------------- */
function parseDate(s) {
  s = String(s).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) / 86400000;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) { const a = +m[1], b = +m[2]; return (a > 12 || b <= 12) ? Date.UTC(+m[3], b - 1, a) / 86400000 : Date.UTC(+m[3], a - 1, b) / 86400000; }
  return NaN;
}
Data.parseDate = parseDate;

/* ---------------- known ordinal scales (Spanish and English) ---------------- */
const SCALES = [
  ['muy bajo', 'bajo', 'medio', 'alto', 'muy alto'], ['bajo', 'medio', 'alto'], ['baja', 'media', 'alta'], ['muy baja', 'baja', 'media', 'alta', 'muy alta'],
  ['very low', 'low', 'medium', 'high', 'very high'], ['low', 'medium', 'high'], ['low', 'moderate', 'high'],
  ['nunca', 'casi nunca', 'a veces', 'casi siempre', 'siempre'], ['never', 'rarely', 'sometimes', 'often', 'always'],
  ['totalmente en desacuerdo', 'en desacuerdo', 'ni de acuerdo ni en desacuerdo', 'de acuerdo', 'totalmente de acuerdo'],
  ['muy en desacuerdo', 'en desacuerdo', 'neutral', 'de acuerdo', 'muy de acuerdo'],
  ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'], ['strongly disagree', 'disagree', 'neither agree nor disagree', 'agree', 'strongly agree'],
  ['ninguno', 'leve', 'moderado', 'severo'], ['ninguna', 'leve', 'moderada', 'severa'], ['none', 'mild', 'moderate', 'severe'],
  ['sin estudios', 'primaria', 'secundaria', 'preparatoria', 'licenciatura', 'posgrado'], ['primaria', 'secundaria', 'bachillerato', 'licenciatura', 'maestria', 'doctorado'],
  ['pequeno', 'mediano', 'grande'], ['chico', 'mediano', 'grande'], ['small', 'medium', 'large'],
  ['malo', 'regular', 'bueno', 'excelente'], ['muy malo', 'malo', 'regular', 'bueno', 'muy bueno'], ['poor', 'fair', 'good', 'very good', 'excellent'], ['poor', 'fair', 'good', 'excellent'],
  ['joven', 'adulto', 'viejo'], ['plantula', 'juvenil', 'adulto'], ['seedling', 'juvenile', 'adult'], ['1st', '2nd', '3rd'], ['first', 'second', 'third', 'crew'],
  ['i', 'ii', 'iii', 'iv', 'v'],
];
function matchScale(levels) {
  const L = levels.map(strip);
  for (const sc of SCALES) if (L.length >= 2 && L.every(v => sc.includes(v))) return levels.slice().sort((a, b) => sc.indexOf(strip(a)) - sc.indexOf(strip(b)));
  return null;
}

/* ---------------- names that say what a column is ---------------- */
const NAME = {
  angleDeg: /(^|_|\b)(angulo|angle|orientacion|orientation|aspecto|aspect|exposicion|direccion|direction|azimut|azimuth|rumbo|bearing|viento_dir|wind_?dir)/,
  doy: /(dia_?juliano|julian|doy|day_?of_?year|dia_?del_?ano|fecha_?juliana)/,
  hour: /(^|_)(hora|hour|hr)(_|$)/,
  month: /(^|_)(mes|month)(_|$)/,
  lat: /(^|_)(lat|latitud|latitude|y_?utm|utm_?y|norte|northing|coord_?y)(_|$)/,
  lon: /(^|_)(lon|long|lng|longitud|longitude|x_?utm|utm_?x|este|easting|coord_?x)(_|$)/,
  id: /(^|_)(id|clave|folio|codigo|code|num(ero)?_?(de_)?(planta|muestra|ejemplar|individuo)|sujeto|subject|individuo|individual|paciente|patient|planta|ejemplar|muestra|accesion|accession)(_|$)/,
  /* a sampling weight or a frequency, not a body weight: «weight» alone stays a variable */
  weight: /(^|_)(peso_?muestral|ponderador|factor_?de_?expansion|sample_?weights?|survey_?weights?|freq|frecuencia)(_|$)/,
  time: /(^|_)(fecha|date|ano|year|tiempo|time|semana|week|dia|day)(_|$)/,
};
const normName = s => strip(s).replace(/[\s.\-]+/g, '_');

/* ---------------- inferring the kind of a column ---------------- */
/* cells → {type, role, unit, levels, num, why:[es,en], nMissing} */
Data.infer = function (name, cells, o) {
  o = o || {};
  const extra = o.missing ? new Set(o.missing.map(strip)) : null;
  const n = cells.length, nm = normName(name);
  const present = [], idx = [];
  cells.forEach((c, i) => { if (!Data.isMissing(c, extra)) { present.push(c); idx.push(i); } });
  const nMissing = n - present.length;
  const res = { type: 'empty', role: 'exclude', unit: null, levels: null, num: new Float64Array(n).fill(NaN), nMissing, why: ['La columna está vacía.', 'The column is empty.'] };
  if (!present.length) return res;
  /* numbers? */
  const dec = o.decimal || '.';
  const nums = present.map(c => (typeof c === 'number' ? c : g.DataIO ? g.DataIO.toNumber(c, dec) : Number(c)));
  const allNum = nums.every(v => !Number.isNaN(v));
  if (allNum) {
    nums.forEach((v, k) => { res.num[idx[k]] = v; });
    const distinct = [...new Set(nums)].sort((a, b) => a - b), k = distinct.length;
    const allInt = nums.every(v => Number.isInteger(v)), mn = distinct[0], mx = distinct[k - 1];
    res.role = 'var';
    if (NAME.doy.test(nm) && mn >= 1 && mx <= 366) return Object.assign(res, { type: 'circular', unit: 'doy', why: ['El nombre dice «día del año» y los valores van de 1 a 366: es un dato circular (el día 365 está junto al 1).', 'The name says “day of year” and values lie between 1 and 366: circular data (day 365 is next to day 1).'] });
    if (NAME.angleDeg.test(nm) && mn >= 0 && mx <= 360) return Object.assign(res, { type: 'circular', unit: 'deg', why: ['El nombre indica una dirección y los valores van de 0 a 360: es un ángulo en grados (circular).', 'The name indicates a direction and values lie between 0 and 360: an angle in degrees (circular).'] });
    if (NAME.hour.test(nm) && mn >= 0 && mx <= 24) return Object.assign(res, { type: 'circular', unit: 'hour', why: ['El nombre dice «hora» y los valores van de 0 a 24: es circular (las 23 h están junto a las 0 h).', 'The name says “hour” and values lie between 0 and 24: circular (23 h is next to 0 h).'] });
    if (NAME.month.test(nm) && allInt && mn >= 1 && mx <= 12) return Object.assign(res, { type: 'circular', unit: 'month', why: ['El nombre dice «mes» y los valores son enteros de 1 a 12: es circular (diciembre está junto a enero).', 'The name says “month” and values are integers from 1 to 12: circular (December is next to January).'] });
    if (NAME.lat.test(nm)) return Object.assign(res, { type: 'continuous', role: 'coordY', why: ['El nombre indica una coordenada norte–sur: queda como coordenada Y (para los análisis espaciales del Bloque 10).', 'The name indicates a north–south coordinate: kept as the Y coordinate (for the spatial analyses of Block 10).'] });
    if (NAME.lon.test(nm)) return Object.assign(res, { type: 'continuous', role: 'coordX', why: ['El nombre indica una coordenada este–oeste: queda como coordenada X.', 'The name indicates an east–west coordinate: kept as the X coordinate.'] });
    if (NAME.id.test(nm) && allInt) {
      const repeats = k < present.length;
      return Object.assign(res, repeats
        ? { type: 'id', role: 'subject', why: ['Parece un identificador y sus valores se repiten: cada valor es un sujeto medido varias veces (medidas repetidas).', 'It looks like an identifier and its values repeat: each value is a subject measured several times (repeated measures).'] }
        : { type: 'id', role: 'exclude', why: ['Parece un identificador (un valor distinto por fila): no se analiza.', 'It looks like an identifier (a different value per row): not analyzed.'] });
    }
    if (NAME.weight.test(nm) && mn >= 0) return Object.assign(res, { type: 'continuous', role: 'weight', why: ['El nombre indica un peso muestral o una frecuencia por fila. Ningún bloque pondera los casos, así que la columna se conserva pero no se analiza; cámbiala a «variable» si quieres usarla.', 'The name indicates a sampling weight or a frequency per row. No block weights the cases, so the column is kept but not analyzed; change it to “variable” to use it.'] });
    if (k === 1) return Object.assign(res, { type: 'continuous', role: 'exclude', why: ['Todos los valores son iguales: no puede correlacionar con nada.', 'All values are equal: it cannot correlate with anything.'] });
    if (k === 2) return Object.assign(res, { type: 'binary', levels: distinct.map(String), num: recode(res.num, distinct), why: [`Sólo toma dos valores (${distinct.join(' y ')}): binaria.`, `It takes only two values (${distinct.join(' and ')}): binary.`] });
    if (allInt && k <= 7 && present.length >= 10 && mx - mn <= 10) return Object.assign(res, { type: 'ordinal', levels: distinct.map(String), num: recode(res.num, distinct), why: [`Toma ${k} valores enteros (${mn} a ${mx}): probablemente una escala ordinal. Si es un conteo, cámbiala a continua.`, `It takes ${k} integer values (${mn} to ${mx}): probably an ordinal scale. If it is a count, change it to continuous.`] });
    if (NAME.time.test(nm) && allInt && k === present.length && mx - mn === k - 1) return Object.assign(res, { type: 'continuous', role: 'time', why: ['Valores enteros consecutivos con un nombre de tiempo: queda como el tiempo de una serie.', 'Consecutive integers with a time name: kept as the time of a series.'] });
    const share = k / present.length;
    return Object.assign(res, { type: 'continuous', why: [`Números con ${k} valores distintos${share < 0.5 ? ` (muchos repetidos: los empates importan para Spearman y Kendall)` : ''}: continua.`, `Numbers with ${k} distinct values${share < 0.5 ? ` (many repeated: ties matter for Spearman and Kendall)` : ''}: continuous.`] });
  }
  /* dates? */
  const dates = present.map(parseDate);
  if (dates.every(v => !Number.isNaN(v))) {
    dates.forEach((v, k) => { res.num[idx[k]] = v; });
    return Object.assign(res, { type: 'date', role: 'time', why: ['Todos los valores son fechas: quedan como el tiempo (días desde 1970).', 'All values are dates: kept as time (days since 1970).'] });
  }
  /* text */
  const texts = present.map(c => String(c).trim());
  const levels = [...new Set(texts)];
  const k = levels.length;
  if (k === present.length && present.length > 10) return Object.assign(res, { type: 'id', role: NAME.id.test(nm) ? 'exclude' : 'exclude', why: ['Un texto distinto en cada fila: es un identificador o una etiqueta; no se analiza.', 'A different text in every row: an identifier or a label; not analyzed.'] });
  if (NAME.id.test(nm) && k < present.length) {
    const lv = levels.slice().sort();
    return Object.assign(res, { type: 'id', role: 'subject', levels: lv, num: codes(cells, idx, texts, lv, n), why: ['Parece un identificador que se repite: cada valor es un sujeto medido varias veces.', 'It looks like a repeated identifier: each value is a subject measured several times.'] });
  }
  const ord = matchScale(levels);
  if (ord) return Object.assign(res, { type: k === 2 ? 'binary' : 'ordinal', role: 'var', levels: ord, num: codes(cells, idx, texts, ord, n), why: [`Sus categorías forman una escala conocida (${ord.join(' < ')}): ordinal, en ese orden.`, `Its categories form a known scale (${ord.join(' < ')}): ordinal, in that order.`] });
  const lv = levels.slice().sort((a, b) => a.localeCompare(b, 'es'));
  if (k === 2) return Object.assign(res, { type: 'binary', role: 'var', levels: lv, num: codes(cells, idx, texts, lv, n), why: [`Dos categorías (${lv.join(' y ')}): binaria.`, `Two categories (${lv.join(' and ')}): binary.`] });
  if (k > Math.max(30, present.length / 2)) return Object.assign(res, { type: 'text', role: 'exclude', why: [`${k} textos distintos: demasiados para ser categorías; no se analiza.`, `${k} different texts: too many to be categories; not analyzed.`] });
  return Object.assign(res, { type: 'nominal', role: k <= 12 ? 'group' : 'var', levels: lv, num: codes(cells, idx, texts, lv, n), why: [`${k} categorías sin orden: nominal${k <= 12 ? '; puede servir para separar grupos' : ''}.`, `${k} unordered categories: nominal${k <= 12 ? '; it can be used to split groups' : ''}.`] });
};
function recode(num, levelValues) { const map = new Map(levelValues.map((v, i) => [v, i])); return num.map(v => (map.has(v) ? map.get(v) : NaN)); }
function codes(cells, idx, texts, levels, n) {
  const out = new Float64Array(n).fill(NaN), map = new Map(levels.map((v, i) => [v, i]));
  idx.forEach((i, k) => { out[i] = map.has(texts[k]) ? map.get(texts[k]) : NaN; });
  return out;
}
/* re-type a column with a kind chosen by the user */
Data.retype = function (col, type, o) {
  o = o || {};
  const cells = col.raw, n = cells.length;
  const extra = o.missing ? new Set(o.missing.map(strip)) : null;
  const present = [], idx = [];
  cells.forEach((c, i) => { if (!Data.isMissing(c, extra)) { present.push(c); idx.push(i); } });
  const num = new Float64Array(n).fill(NaN);
  const dec = o.decimal || '.';
  col.type = type;
  if (type === 'continuous' || type === 'circular') {
    present.forEach((c, k) => { num[idx[k]] = typeof c === 'number' ? c : g.DataIO ? g.DataIO.toNumber(c, dec) : Number(c); });
    col.levels = null;
    if (type === 'circular' && !col.unit) col.unit = 'deg';
  } else if (type === 'date') present.forEach((c, k) => { num[idx[k]] = parseDate(c); });
  else if (type === 'ordinal' || type === 'binary' || type === 'nominal' || type === 'id') {
    const texts = present.map(c => String(typeof c === 'number' ? c : c).trim());
    let levels = o.levels || col.levels;
    const seen = [...new Set(texts)];
    if (!levels || !seen.every(v => levels.includes(v))) {
      const allNum = seen.every(v => !Number.isNaN(Number(v)));
      levels = allNum ? seen.sort((a, b) => Number(a) - Number(b)) : (matchScale(seen) || seen.sort((a, b) => a.localeCompare(b, 'es')));
    }
    col.levels = levels;
    const map = new Map(levels.map((v, i) => [v, i]));
    idx.forEach((i, k) => { num[i] = map.has(texts[k]) ? map.get(texts[k]) : NaN; });
  }
  col.num = num;
  col.nMissing = Array.from(num).filter(v => !isFinite(v)).length;
  col.why = [`Tipo elegido por ti: ${Data.TYPE_NAMES[type][0]}.`, `Kind chosen by you: ${Data.TYPE_NAMES[type][1]}.`];
  col.userType = true;
  return col;
};
Data.TYPE_NAMES = {
  continuous: ['continua', 'continuous'], ordinal: ['ordinal', 'ordinal'], binary: ['binaria', 'binary'], nominal: ['nominal', 'nominal'],
  circular: ['circular', 'circular'], date: ['fecha', 'date'], id: ['identificador', 'identifier'], text: ['texto', 'text'], empty: ['vacía', 'empty'],
};
Data.ROLE_NAMES = {
  var: ['variable', 'variable'], group: ['grupo', 'group'], subject: ['sujeto', 'subject'], time: ['tiempo', 'time'],
  coordX: ['coordenada X', 'X coordinate'], coordY: ['coordenada Y', 'Y coordinate'], weight: ['peso', 'weight'], exclude: ['no se usa', 'not used'],
};
Data.UNITS = { deg: ['grados (0–360)', 'degrees (0–360)', 360], rad: ['radianes (0–2π)', 'radians (0–2π)', 2 * Math.PI], hour: ['horas (0–24)', 'hours (0–24)', 24], doy: ['día del año (1–365)', 'day of year (1–365)', 365.25], month: ['mes (1–12)', 'month (1–12)', 12] };
/* a circular column in radians */
Data.toRadians = function (col) {
  const per = Data.UNITS[col.unit || 'deg'][2], shift = col.unit === 'doy' || col.unit === 'month' ? 1 : 0;
  return col.num.map(v => (isFinite(v) ? ((v - shift) / per) * 2 * Math.PI : NaN));
};

/* ---------------- building a dataset ---------------- */
let KEY = 0;
Data.build = function (names, columns, o) {
  o = o || {};
  const cols = names.map((nm, j) => {
    const raw = columns[j];
    const inf = Data.infer(nm, raw, o);
    return Object.assign({ key: 'c' + (++KEY), name: nm, raw, auto: { type: inf.type, role: inf.role, unit: inf.unit, levels: inf.levels } }, inf);
  });
  const n = columns.length ? columns[0].length : 0;
  const ds = { name: o.name || 'datos', source: o.source || {}, n, cols, missingCodes: o.missing || [], decimal: o.decimal || '.', comp: [] };
  /* declared kinds (the example datasets know theirs) */
  if (o.declared) for (const d of o.declared) {
    const c = cols.find(x => x.name === d.name);
    if (!c) continue;
    if (d.type && d.type !== c.type) Data.retype(c, d.type, { levels: d.levels, decimal: ds.decimal });
    if (d.levels && c.levels) Data.retype(c, c.type, { levels: d.levels, decimal: ds.decimal });
    if (d.role) c.role = d.role;
    if (d.unit) c.unit = d.unit;
    if (d.label) c.label = d.label;
    if (d.why) c.why = d.why; else if (d.type || d.role) c.why = ['Tipo y papel declarados en la descripción del conjunto de datos.', 'Kind and role declared in the description of the dataset.'];
    /* a name alone does not make the kind declared */
    if (d.type || d.role || d.levels || d.unit || d.why) c.declared = true;
  }
  ds.comp = Data.findCompositional(ds);
  ds.comp.forEach(gp => gp.forEach(k => { const c = cols.find(x => x.key === k); if (c && c.type === 'continuous' && !c.declared) c.why = [c.why[0] + ' Forma parte de un grupo de partes que suman una constante (composicional).', c.why[1] + ' It is part of a group of parts adding up to a constant (compositional).']; }));
  return ds;
};
/* the column objects of the variables that can be analysed */
Data.vars = (ds, types) => ds.cols.filter(c => c.role === 'var' && (!types || types.includes(c.type)));
Data.col = (ds, key) => ds.cols.find(c => c.key === key);

/* compositional groups: ≥ 3 consecutive non-negative continuous columns whose
   row sums are the same constant (within 0.5 %) on every complete row */
Data.findCompositional = function (ds) {
  const C = ds.cols, out = [];
  const ok = c => c.type === 'continuous' && c.role === 'var' && Array.from(c.num).every(v => !isFinite(v) || v >= 0);
  let i = 0;
  while (i < C.length) {
    if (!ok(C[i])) { i++; continue; }
    /* among the runs whose row sums are nearly constant, the one whose sum varies least: a small extra column
       (a covariate measured next to the parts) keeps the sum almost constant and must not join the group */
    let best = null, bestCv = Infinity;
    for (let j = i + 2; j < C.length && ok(C[j]); j++) {
      const sums = [];
      for (let r = 0; r < ds.n; r++) { let s = 0, full = true; for (let k = i; k <= j; k++) { const v = C[k].num[r]; if (!isFinite(v)) { full = false; break; } s += v; } if (full) sums.push(s); }
      if (sums.length < 3) continue;
      const m = Num.mean(sums), sd = Num.sd(sums);
      if (m > 0 && sd / m < 0.005 && sd / m < bestCv - 1e-12) { best = j; bestCv = sd / m; }
    }
    if (best !== null) { out.push(C.slice(i, best + 1).map(c => c.key)); i = best + 1; } else i++;
  }
  return out;
};

/* ---------------- missing data ---------------- */
Data.missingSummary = function (ds, keys) {
  const cols = (keys || ds.cols.map(c => c.key)).map(k => Data.col(ds, k));
  let complete = 0;
  const rowMiss = new Array(ds.n).fill(0);
  for (let r = 0; r < ds.n; r++) { let full = true; for (const c of cols) if (!isFinite(c.num[r])) { full = false; rowMiss[r]++; } if (full) complete++; }
  const patterns = new Map();
  for (let r = 0; r < ds.n; r++) { const p = cols.map(c => (isFinite(c.num[r]) ? '1' : '0')).join(''); patterns.set(p, (patterns.get(p) || 0) + 1); }
  return { complete, rows: ds.n, perCol: cols.map(c => ({ key: c.key, name: c.name, missing: Array.from(c.num).filter(v => !isFinite(v)).length })), patterns: [...patterns.entries()].sort((a, b) => b[1] - a[1]) };
};
/* numbers that look like «no data» codes in a numeric column */
Data.sentinels = function (col) {
  if (col.type !== 'continuous') return [];
  const v = Array.from(col.num).filter(isFinite);
  if (v.length < 10) return [];
  const med = Num.median(v), mad = Num.mad(v, med) || Num.sd(v) || 1;
  return SENTINELS.filter(s => v.filter(x => x === s).length >= 1 && Math.abs(s - med) / mad > 8);
};
/* the complete pairs of two columns */
Data.pair = function (ds, ka, kb) {
  const a = Data.col(ds, ka).num, b = Data.col(ds, kb).num, x = [], y = [], rows = [];
  for (let r = 0; r < ds.n; r++) if (isFinite(a[r]) && isFinite(b[r])) { x.push(a[r]); y.push(b[r]); rows.push(r); }
  return { x, y, rows, n: x.length, dropped: ds.n - x.length };
};
/* the pair as the chosen missing-data mode asks: pairwise, or only the rows
   complete in every column in use */
Data.pairFor = function (ds, ka, kb) {
  if (ds.missingMode !== 'listwise') return Data.pair(ds, ka, kb);
  const keys = ds.cols.filter(c => c.role !== 'exclude' && !['text', 'empty'].includes(c.type)).map(c => c.key);
  const rows = Data.completeRows(ds, keys.includes(ka) && keys.includes(kb) ? keys : [ka, kb]);
  const a = Data.col(ds, ka).num, b = Data.col(ds, kb).num;
  return { x: rows.map(r => a[r]), y: rows.map(r => b[r]), rows, n: rows.length, dropped: ds.n - rows.length };
};
/* the rows complete in every one of the columns */
Data.completeRows = function (ds, keys) {
  const cols = keys.map(k => Data.col(ds, k).num), rows = [];
  for (let r = 0; r < ds.n; r++) if (cols.every(c => isFinite(c[r]))) rows.push(r);
  return rows;
};

/* ---------------- summaries ---------------- */
Data.summary = function (col) {
  const v = Array.from(col.num).filter(isFinite), n = v.length;
  const s = { n, missing: col.num.length - n };
  if (!n) return s;
  if (['continuous', 'circular', 'date'].includes(col.type)) {
    const sorted = Float64Array.from(v).sort();
    s.mean = Num.mean(v); s.sd = n > 1 ? Num.sd(v) : NaN; s.min = sorted[0]; s.max = sorted[n - 1];
    s.median = Num.median(v); s.q1 = Num.quantile(v, 0.25); s.q3 = Num.quantile(v, 0.75);
    if (n > 2 && s.sd > 0) {
      let m3 = 0, m4 = 0;
      for (const x of v) { const d = (x - s.mean) / s.sd; m3 += d * d * d; m4 += d * d * d * d; }
      s.skew = m3 / n; s.kurt = m4 / n - 3;
    }
    s.distinct = new Set(v).size;
  } else if (col.levels) {
    s.counts = col.levels.map((lv, i) => ({ level: lv, n: v.filter(x => x === i).length }));
  }
  return s;
};

/* ---------------- transformations ----------------
   Each returns a new numeric vector and a description; the dataset gains a
   column that remembers where it came from. */
function positive(v) { return v.every(x => !isFinite(x) || x > 0); }
/* Box–Cox: λ maximizing the profile log-likelihood of a normal model,
   ℓ(λ) = −(n/2)·log σ̂²(λ) + (λ − 1)·Σ log y (Box and Cox 1964), by golden
   section on [−3, 3] after a coarse grid. */
Data.boxcoxLL = function (y, lam) {
  const n = y.length;
  let sl = 0;
  for (const v of y) sl += Math.log(v);
  const z = y.map(v => (Math.abs(lam) < 1e-12 ? Math.log(v) : (Math.pow(v, lam) - 1) / lam));
  const m = Num.mean(z);
  let ss = 0;
  for (const v of z) ss += (v - m) * (v - m);
  return -n / 2 * Math.log(ss / n) + (lam - 1) * sl;
};
Data.boxcoxLambda = function (y) {
  let best = -3, bl = -Infinity;
  for (let l = -3; l <= 3.0001; l += 0.05) { const v = Data.boxcoxLL(y, l); if (v > bl) { bl = v; best = l; } }
  let a = Math.max(-3, best - 0.05), b = Math.min(3, best + 0.05);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = Data.boxcoxLL(y, c), fd = Data.boxcoxLL(y, d);
  for (let i = 0; i < 80; i++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = Data.boxcoxLL(y, c); }
    else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = Data.boxcoxLL(y, d); }
  }
  return (a + b) / 2;
};
Data.TRANSFORMS = {
  rank: { es: 'Rangos (promedio en empates)', en: 'Ranks (average for ties)', ok: c => ['continuous', 'ordinal', 'date'].includes(c.type) },
  z: { es: 'Estandarizar (z)', en: 'Standardize (z)', ok: c => c.type === 'continuous' },
  center: { es: 'Centrar en la media', en: 'Center on the mean', ok: c => c.type === 'continuous' },
  ln: { es: 'Logaritmo natural', en: 'Natural logarithm', ok: c => c.type === 'continuous' },
  log10: { es: 'Logaritmo base 10', en: 'Base-10 logarithm', ok: c => c.type === 'continuous' },
  log1p: { es: 'log(x + 1) (admite ceros)', en: 'log(x + 1) (allows zeros)', ok: c => c.type === 'continuous' },
  sqrt: { es: 'Raíz cuadrada', en: 'Square root', ok: c => c.type === 'continuous' },
  inverse: { es: 'Inverso 1/x', en: 'Inverse 1/x', ok: c => c.type === 'continuous' },
  boxcox: { es: 'Box–Cox (λ estimada)', en: 'Box–Cox (estimated λ)', ok: c => c.type === 'continuous' },
  normal: { es: 'Puntuaciones normales', en: 'Normal scores', ok: c => ['continuous', 'ordinal'].includes(c.type) },
  reverse: { es: 'Invertir la escala', en: 'Reverse the scale', ok: c => ['continuous', 'ordinal'].includes(c.type) },
  clr: { es: 'Log-cociente centrado (composicional)', en: 'Centered log-ratio (compositional)', ok: (c, ds) => ds && ds.comp.some(gp => gp.includes(c.key)) },
};
Data.transform = function (ds, key, op) {
  const c = Data.col(ds, key), v = Array.from(c.num), n = v.length;
  const ok = v.filter(isFinite);
  let out, note = null;
  const fail = (es, en) => { throw Object.assign(new Error(en), { es, en }); };
  switch (op) {
    case 'rank': {
      const r = Num.rank(ok); let k = 0; out = v.map(x => (isFinite(x) ? r[k++] : NaN)); break;
    }
    case 'z': case 'center': {
      const m = Num.mean(ok), s = Num.sd(ok);
      out = v.map(x => (isFinite(x) ? (op === 'z' ? (x - m) / s : x - m) : NaN)); break;
    }
    case 'ln': case 'log10': if (!positive(v)) fail('El logaritmo pide valores positivos; usa log(x + 1) si hay ceros.', 'The logarithm needs positive values; use log(x + 1) if there are zeros.');
      out = v.map(x => (isFinite(x) ? (op === 'ln' ? Math.log(x) : Math.log10(x)) : NaN)); break;
    case 'log1p': if (v.some(x => isFinite(x) && x <= -1)) fail('log(x + 1) pide valores mayores que −1.', 'log(x + 1) needs values greater than −1.');
      out = v.map(x => (isFinite(x) ? Math.log1p(x) : NaN)); break;
    case 'sqrt': if (v.some(x => isFinite(x) && x < 0)) fail('La raíz pide valores no negativos.', 'The square root needs non-negative values.');
      out = v.map(x => (isFinite(x) ? Math.sqrt(x) : NaN)); break;
    case 'inverse': if (v.some(x => x === 0)) fail('Hay ceros: el inverso no está definido.', 'There are zeros: the inverse is undefined.');
      out = v.map(x => (isFinite(x) ? 1 / x : NaN)); break;
    case 'boxcox': {
      if (!positive(v)) fail('Box–Cox pide valores positivos.', 'Box–Cox needs positive values.');
      const lam = Data.boxcoxLambda(ok);
      out = v.map(x => (isFinite(x) ? (Math.abs(lam) < 1e-12 ? Math.log(x) : (Math.pow(x, lam) - 1) / lam) : NaN));
      note = { lambda: lam }; break;
    }
    case 'normal': {
      const r = Num.rank(ok), m = ok.length; let k = 0;
      out = v.map(x => (isFinite(x) ? Num.qnorm(r[k++] / (m + 1)) : NaN)); break;
    }
    case 'reverse': {
      const mn = Math.min(...ok), mx = Math.max(...ok);
      out = v.map(x => (isFinite(x) ? mn + mx - x : NaN)); break;
    }
    case 'clr': {
      const gp = ds.comp.find(q => q.includes(key));
      const cols = gp.map(k => Data.col(ds, k).num);
      if (cols.some(cv => Array.from(cv).some(x => isFinite(x) && x <= 0))) fail('Hay ceros en las partes: el log-cociente no está definido; reemplázalos primero.', 'There are zeros among the parts: the log-ratio is undefined; replace them first.');
      out = v.map((x, r) => { if (!cols.every(cv => isFinite(cv[r]))) return NaN; let s = 0; for (const cv of cols) s += Math.log(cv[r]); return Math.log(x) - s / cols.length; });
      break;
    }
    default: fail('Transformación desconocida.', 'Unknown transformation.');
  }
  const T = Data.TRANSFORMS[op];
  const suffix = { rank: 'rango', z: 'z', center: 'c', ln: 'ln', log10: 'log10', log1p: 'log1p', sqrt: 'raiz', inverse: 'inv', boxcox: 'bc', normal: 'normal', reverse: 'inv_esc', clr: 'clr' }[op];
  let name = c.name + '_' + suffix, k2 = 1;
  while (ds.cols.some(x => x.name === name)) name = c.name + '_' + suffix + (++k2);
  const nc = {
    key: 'c' + (++KEY), name, raw: out.map(x => (isFinite(x) ? x : '')), num: Float64Array.from(out), type: op === 'rank' && c.type === 'ordinal' ? 'continuous' : 'continuous', role: 'var', unit: null, levels: null,
    nMissing: out.filter(x => !isFinite(x)).length, derived: { from: c.key, op, note },
    why: [`Creada con «${T.es}» a partir de ${c.name}${note && note.lambda != null ? ` (λ = ${note.lambda.toFixed(3)})` : ''}.`, `Made with “${T.en}” from ${c.name}${note && note.lambda != null ? ` (λ = ${note.lambda.toFixed(3)})` : ''}.`],
  };
  nc.auto = { type: nc.type, role: 'var' };
  ds.cols.push(nc);
  return nc;
};

/* ---------------- the assistant: which correlation? ----------------
   From the kinds of the two columns and, for two continuous ones, a quick
   look at the cloud (outliers, curvature, ties, monotonicity), a ranked list
   of measures with the reason for each one and the block where it lives. */
const K = { continuous: 'c', ordinal: 'o', binary: 'b', nominal: 'n', circular: 'a', date: 'c' };
function curvature(x, y) {
  /* F test for adding x² to the straight line (centred x keeps it stable) */
  const n = x.length;
  if (n < 6) return NaN;
  const mx = Num.mean(x), u = x.map(v => v - mx), u2 = u.map(v => v * v);
  const rss = cols => {
    /* least squares by the normal equations on centred columns (2 or 3 terms) */
    const p = cols.length, X = cols, my = Num.mean(y);
    const yc = y.map(v => v - my), M = [], b = [];
    const cm = X.map(c => Num.mean(c)), Xc = X.map((c, j) => c.map(v => v - cm[j]));
    for (let i = 0; i < p; i++) { M.push([]); for (let j = 0; j < p; j++) { let s = 0; for (let k = 0; k < n; k++) s += Xc[i][k] * Xc[j][k]; M[i].push(s); } let s = 0; for (let k = 0; k < n; k++) s += Xc[i][k] * yc[k]; b.push(s); }
    /* Gauss–Jordan */
    for (let i = 0; i < p; i++) { let piv = i; for (let r = i + 1; r < p; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r; [M[i], M[piv]] = [M[piv], M[i]]; [b[i], b[piv]] = [b[piv], b[i]]; const d = M[i][i]; if (Math.abs(d) < 1e-300) return NaN; for (let j = i; j < p; j++) M[i][j] /= d; b[i] /= d; for (let r = 0; r < p; r++) if (r !== i) { const f = M[r][i]; for (let j = i; j < p; j++) M[r][j] -= f * M[i][j]; b[r] -= f * b[i]; } }
    let ss = 0;
    for (let k = 0; k < n; k++) { let fit = 0; for (let j = 0; j < p; j++) fit += b[j] * Xc[j][k]; ss += (yc[k] - fit) ** 2; }
    return ss;
  };
  const r1 = rss([u]), r2 = rss([u, u2]);
  if (!(r2 > 0)) return NaN;
  const F = (r1 - r2) / (r2 / (n - 3));
  return Num.pf(F, 1, n - 3, true);
}
Data.curvatureP = curvature;
Data.look = function (x, y) {
  const n = x.length, out = { n };
  const robustOut = v => { const med = Num.median(v), mad = Num.mad(v, med) * 1.4826; return mad > 0 ? v.filter(a => Math.abs(a - med) / mad > 3.5).length : 0; };
  out.outliers = robustOut(x) + robustOut(y);
  out.tiesX = 1 - new Set(x).size / n; out.tiesY = 1 - new Set(y).size / n;
  out.r = Coef.pearson(x, y).est; out.rho = Coef.spearman(x, y).est;
  out.curveP = curvature(x, y);
  out.dcor = n <= 3000 ? Coef.dcor(x, y).est : NaN;
  return out;
};
Data.recommend = function (ds, ka, kb) {
  const A = Data.col(ds, ka), B = Data.col(ds, kb);
  const ta = K[A.type] || '?', tb = K[B.type] || '?';
  const key = [ta, tb].sort().join('');
  const recs = [], add = (id, es, en, why, blk, level) => recs.push({ id, es, en, why, blk, level: level || 'also' });
  let look = null;
  if (A.role === 'subject' || B.role === 'subject') add('repeated', 'Correlación de medidas repetidas', 'Repeated measures correlation', ['Hay sujetos medidos varias veces: los pares no son independientes.', 'There are subjects measured several times: the pairs are not independent.'], 10, 'best');
  if (key === 'cc' || key === 'co') {
    const p = Data.pair(ds, ka, kb);
    look = Data.look(p.x, p.y);
    const ord = key === 'co';
    /* the same verdict as Block 3 (curvature, influence of each point, ties, monotonicity) */
    const pc = g.Assume && p.n >= 5 ? g.Assume.pairCheck(p.x, p.y, { ordinal: ord, rows: p.rows }) : null;
    if (pc) {
      const v = pc.verdict;
      const MAP = { pearson: ['pearson', 4], spearman: ['spearman', 4], kendallB: ['kendall', 4], pbend: ['pbend', 4], dcor: ['dcor', 6], groups: ['pearson', 4] };
      const [id, blk] = MAP[v.id] || ['pearson', 4];
      add(id, v.es, v.en, [v.why[0] + (v.notes.length ? ' ' + v.notes.map(nt => nt[0]).join(' ') : ''), v.why[1] + (v.notes.length ? ' ' + v.notes.map(nt => nt[1]).join(' ') : '')], blk, 'best');
      if (id !== 'spearman' && id !== 'dcor') add('spearman', 'ρ de Spearman', 'Spearman’s ρ', ['La correlación de rangos: no supone una recta, sólo que la relación sube (o baja).', 'The rank correlation: it does not assume a line, only that the relation rises (or falls).'], 4);
      if (id !== 'kendall' && (pc.distinct <= 10 || p.n < 30)) add('kendall', 'τ-b de Kendall', 'Kendall’s τ-b', [pc.distinct <= 10 ? 'Una de las dos toma pocos valores: τ-b trata los empates de forma explícita.' : 'La muestra es chica: τ tiene una distribución exacta y un significado claro (concordancia).', pc.distinct <= 10 ? 'One of the two takes few values: τ-b handles ties explicitly.' : 'The sample is small: τ has an exact distribution and a clear meaning (concordance).'], 4);
      if (id !== 'pbend' && pc.nOut > 0) add('pbend', 'Flexión porcentual o peso doble', 'Percentage bend or biweight', [`${pc.nOut} punto(s) fuera de la elipse robusta: una correlación robusta sirve de comparación.`, `${pc.nOut} point(s) outside the robust ellipse: a robust correlation is a useful comparison.`], 4);
      if (!ord && id !== 'pearson') add('pearson', 'r de Pearson (con cautela)', 'Pearson’s r (with care)', ['Infórmala junto a la recomendada si tu campo la espera, pero mira la nube.', 'Report it alongside the recommended one if your field expects it, but look at the cloud.'], 4, 'avoid');
      if (id !== 'dcor') add('dcor', 'Correlación de distancias', 'Distance correlation', ['Como prueba general de independencia, detecta cualquier forma.', 'As a general test of independence, it detects any shape.'], 6);
      if (ord) add('polyserial', 'Poliserial', 'Polyserial', ['Si la ordinal resume una variable continua latente.', 'If the ordinal one summarizes a latent continuous variable.'], 8);
    } else {
      add(ord ? 'spearman' : 'pearson', ord ? 'ρ de Spearman' : 'r de Pearson', ord ? 'Spearman’s ρ' : 'Pearson’s r', ['Muy pocos pares para revisar la forma de la nube.', 'Too few pairs to check the shape of the cloud.'], 4, 'best');
    }
  } else if (key === 'oo') {
    const la = A.levels ? A.levels.length : 0, lb = B.levels ? B.levels.length : 0;
    add(la === lb ? 'kendallB' : 'kendallC', la === lb ? 'τ-b de Kendall' : 'τ-c de Stuart', la === lb ? 'Kendall’s τ-b' : 'Stuart’s τ-c', [la === lb ? 'Dos escalas ordinales con el mismo número de niveles.' : 'Escalas con distinto número de niveles: τ-c puede llegar a ±1.', la === lb ? 'Two ordinal scales with the same number of levels.' : 'Scales with different numbers of levels: τ-c can reach ±1.'], 4, 'best');
    add('spearman', 'ρ de Spearman', 'Spearman’s ρ', ['La correlación de rangos más conocida.', 'The best-known rank correlation.'], 4);
    add('gamma', 'γ de Goodman y Kruskal', 'Goodman and Kruskal’s γ', ['Ignora los empates; exagera con muchos.', 'It ignores ties; it overstates with many.'], 8);
    add('polychoric', 'Policórica', 'Polychoric', ['Si cada escala resume una variable continua latente (reactivos de escala tipo Likert).', 'If each scale summarizes a latent continuous variable (Likert-type items).'], 8);
  } else if (key === 'bc') {
    add('pointBiserial', 'Biserial puntual', 'Point-biserial', ['Una variable binaria genuina y una continua: es la r de Pearson y equivale a la t de dos grupos.', 'A genuine binary variable and a continuous one: it is Pearson’s r and equivalent to the two-group t.'], 8, 'best');
    add('rankBiserial', 'Rango-biserial', 'Rank-biserial', ['Si la continua no es normal o tiene atípicos.', 'If the continuous one is not normal or has outliers.'], 8);
    add('biserial', 'Biserial', 'Biserial', ['Si la binaria es un corte de algo continuo (aprobado/reprobado).', 'If the binary one is a cut of something continuous (pass/fail).'], 8);
  } else if (key === 'bb') {
    add('phi', 'φ', 'φ', ['Dos binarias: su r de Pearson.', 'Two binaries: their Pearson r.'], 8, 'best');
    add('oddsRatio', 'Razón de momios y Q de Yule', 'Odds ratio and Yule’s Q', ['No dependen de las marginales.', 'They do not depend on the margins.'], 8);
    add('tetrachoric', 'Tetracórica', 'Tetrachoric', ['Si cada binaria es un corte de una variable continua latente.', 'If each binary is a cut of a latent continuous variable.'], 8);
  } else if (key === 'bn' || key === 'nn' || key === 'bo' || key === 'no') {
    add('cramer', 'V de Cramér (con corrección de sesgo)', 'Cramér’s V (bias-corrected)', ['Categorías sin orden en al menos una: la asociación de su tabla.', 'Unordered categories in at least one: the association of their table.'], 8, 'best');
    add('theilU', 'U de Theil y λ de Goodman y Kruskal', 'Theil’s U and Goodman–Kruskal’s λ', ['Asimétricas: cuánto predice una a la otra.', 'Asymmetric: how much one predicts the other.'], 8);
  } else if (key === 'cn') {
    add('eta', 'Razón de correlación η', 'Correlation ratio η', ['Una nominal (grupos) y una continua: la fracción de la varianza explicada por los grupos.', 'A nominal (groups) and a continuous one: the share of variance explained by the groups.'], 8, 'best');
  } else if (key === 'aa') {
    add('circJS', 'Correlación circular–circular', 'Circular–circular correlation', ['Dos ángulos: 359° y 1° están juntos y Pearson no lo sabe.', 'Two angles: 359° and 1° are neighbors and Pearson does not know it.'], 10, 'best');
  } else if (key === 'ac' || key === 'ao') {
    add('circLin', 'Correlación circular–lineal', 'Circular–linear correlation', ['Un ángulo y una variable lineal.', 'An angle and a linear variable.'], 10, 'best');
  }
  const comp = ds.comp.some(gp => gp.includes(ka) && gp.includes(kb));
  if (comp) recs.unshift({ id: 'rhoP', es: 'Proporcionalidad ρp', en: 'Proportionality ρp', why: ['Las dos son partes de un mismo todo: su correlación de Pearson es espuria por construcción (Pearson 1897).', 'Both are parts of one whole: their Pearson correlation is spurious by construction (Pearson 1897).'], blk: 10, level: 'best' });
  if (ds.cols.some(c => c.role === 'coordX') && ds.cols.some(c => c.role === 'coordY')) recs.push({ id: 'dutilleul', es: 't modificada de Dutilleul', en: 'Dutilleul’s modified t', why: ['Hay coordenadas: si los lugares cercanos se parecen, el valor p habitual es demasiado optimista.', 'There are coordinates: if nearby places resemble each other, the usual p-value is too optimistic.'], blk: 10, level: 'also' });
  if (ds.cols.some(c => c.role === 'time') && key === 'cc') recs.push({ id: 'ccf', es: 'Correlación cruzada con preblanqueo', en: 'Cross-correlation with prewhitening', why: ['Hay una columna de tiempo: dos series con tendencia correlacionan aunque no se relacionen.', 'There is a time column: two trending series correlate even if unrelated.'], blk: 10, level: 'also' });
  return { types: [A.type, B.type], recs, look };
};

g.Data = Data;
return Data;
}
if (typeof window !== 'undefined') DataCore(window);
