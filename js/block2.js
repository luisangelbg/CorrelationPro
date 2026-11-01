/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — Block 2, the data: open, look, type, missing values,
   transformations and the «which correlation?» assistant. Everything that
   changes the data fires `datachange`, which Blocks 3 and 4 listen to. */
(function () {
'use strict';
const B2 = {};
const TYPES = ['continuous', 'ordinal', 'binary', 'nominal', 'circular', 'date', 'id', 'text'];
const ROLES = ['var', 'group', 'subject', 'time', 'coordX', 'coordY', 'weight', 'exclude'];
const TNAME = t => T(Data.TYPE_NAMES[t][0], Data.TYPE_NAMES[t][1]);
const label = c => (c.label ? T(c.label.es, c.label.en) : c.name);
B2.label = label;
function err2msg(e) { return e && e.es ? T(e.es, e.en) + (e.hint ? ' ' + T(e.hint[0], e.hint[1]) : '') : (e && e.message) || String(e); }
function missingCodes() { return el('b2Miss').value.split(',').map(s => s.trim()).filter(Boolean); }

/* ---------------- loading ---------------- */
function setData(ds, info) {
  ds.missingMode = 'pairwise';
  state.data = ds;
  Object.keys(state).forEach(k => { if (!['data', 'figures'].includes(k)) state[k] = null; });
  el('b2Loaded').hidden = false;
  clearMessages('b2Msgs');
  showMessage('b2Msgs', 'ok', info || L2(`Datos leídos: ${ds.n} filas y ${ds.cols.length} columnas.`, `Data read: ${ds.n} rows and ${ds.cols.length} columns.`));
  paintAll();
  [3, 4].forEach(n => enableStep(n, true));
  refreshStepMarksSoon();
  document.dispatchEvent(new CustomEvent('datachange', { detail: { reason: 'load' } }));
}
function refreshStepMarksSoon() { setTimeout(() => enableStep(2, true), 0); }
B2.fromDataset = function (d) {
  const names = d.vars.map(v => v.key);
  /* the categories come in the language the app is in when the dataset is opened */
  const lv = v => (I18N.lang === 'es' && v.levels_es ? v.levels_es : v.levels);
  const columns = d.vars.map(v => (v.levels ? v.v.map(c => lv(v)[c]) : v.v.slice()));
  const declared = d.vars.map(v => ({ name: v.key, type: v.type, role: v.role, levels: lv(v), unit: v.unit, label: { es: v.es, en: v.en } }));
  const ds = Data.build(names, columns, { name: d.id, declared, source: { kind: 'example', id: d.id } });
  ds.title = { es: d.es, en: d.en };
  ds.cols.forEach((c, j) => { c.unitText = d.vars[j].unit || null; });
  return ds;
};
function loadExample(id) {
  const d = Datasets[id];
  if (!d) return;
  setData(B2.fromDataset(d), L2(`Conjunto «${d.es}»: ${d.n} filas y ${d.vars.length} columnas. ${d.license.es}`, `Dataset «${d.en}»: ${d.n} rows and ${d.vars.length} columns. ${d.license.en}`));
}
B2.loadExample = loadExample;
B2.useDataset = (ds, info) => setData(ds, info);
function fromRows(rows, name, info, decimal) {
  const t = DataIO.rowsToColumns(rows, el('b2Header').checked);
  return Data.build(t.names, t.columns, { name, missing: missingCodes(), decimal: decimal || '.', source: info });
}
function readText(text, name, src) {
  const delimiter = el('b2Delim').value || null, decimal = el('b2Dec').value || null;
  const t = DataIO.readDelimited(text, { delimiter, decimal, header: el('b2Header').checked });
  const ds = Data.build(t.names, t.columns, { name, missing: missingCodes(), decimal: t.decimal, source: Object.assign({ delimiter: t.delimiter, decimal: t.decimal }, src) });
  const dname = { ',': T('coma', 'comma'), ';': T('punto y coma', 'semicolon'), '\t': T('tabulador', 'tab'), '|': T('barra', 'bar') }[t.delimiter];
  setData(ds, L2(`Leído «${esc(name)}»: ${ds.n} filas y ${ds.cols.length} columnas, separadas por ${dname}, con ${t.decimal === ',' ? 'coma' : 'punto'} decimal${src.encoding ? ' (' + src.encoding + ')' : ''}.`,
    `Read «${esc(name)}»: ${ds.n} rows and ${ds.cols.length} columns, separated by ${dname}, with a decimal ${t.decimal === ',' ? 'comma' : 'point'}${src.encoding ? ' (' + src.encoding + ')' : ''}.`));
}
async function readFile(file) {
  clearMessages('b2Msgs');
  el('b2SheetPick').hidden = true;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const isBook = /\.(xlsx|xlsm|ods)$/i.test(file.name) || (buf[0] === 0x50 && buf[1] === 0x4b);
    if (isBook) {
      const wb = DataIO.readWorkbook(buf);
      const use = nm => { const ds = fromRows(wb.sheets[nm].map(r => r.map(v => (typeof v === 'number' ? v : String(v)))), file.name, { kind: 'file', file: file.name, sheet: nm }); setData(ds, L2(`Leída la hoja «${esc(nm)}» de «${esc(file.name)}»: ${ds.n} filas y ${ds.cols.length} columnas.`, `Read sheet «${esc(nm)}» of «${esc(file.name)}»: ${ds.n} rows and ${ds.cols.length} columns.`)); };
      const full = wb.names.filter(nm => wb.sheets[nm].length > 1);
      if (full.length > 1) {
        const box = el('b2SheetPick');
        box.hidden = false;
        box.innerHTML = `<span>${L2('El libro tiene varias hojas; elige una:', 'The workbook has several sheets; pick one:')}</span> ` + full.map(nm => `<button type="button" class="chip" data-sheet="${esc(nm)}">${esc(nm)} (${wb.sheets[nm].length - 1})</button>`).join('');
        box.onclick = e => { const b = e.target.closest('[data-sheet]'); if (b) { box.hidden = true; use(b.dataset.sheet); } };
        use(full[0]);
      } else if (full.length === 1) use(full[0]);
      else throw new DataIO.DataError('El libro no tiene ninguna hoja con datos.', 'The workbook has no sheet with data.');
    } else {
      const d = DataIO.decodeText(buf);
      readText(d.text, file.name, { kind: 'file', file: file.name, encoding: d.encoding });
    }
  } catch (e) {
    console.error(e);
    showMessage('b2Msgs', 'error', esc(err2msg(e)));
  }
}

/* ---------------- painting ---------------- */
function paintAll() {
  paintTiles(); paintGrid(); paintTypes(); paintMissing(); paintTransform(); paintAssistSelects(); paintAssist();
}
function paintTiles() {
  const ds = state.data, ms = Data.missingSummary(ds);
  const used = ds.cols.filter(c => c.role !== 'exclude');
  const title = ds.title ? T(ds.title.es, ds.title.en) : ds.name;
  statTiles('b2Tiles', [
    [T('Conjunto', 'Dataset'), esc(title)],
    [T('Filas', 'Rows'), fmtNum(ds.n, 0)],
    [T('Columnas', 'Columns'), `${ds.cols.length}`, T(`${used.length} en uso`, `${used.length} in use`)],
    [T('Filas completas', 'Complete rows'), fmtNum(ms.complete, 0), ms.complete < ds.n ? T(`${ds.n - ms.complete} con algún faltante`, `${ds.n - ms.complete} with some missing`) : T('ningún faltante', 'no missing'), ms.complete < ds.n ? 'warn' : 'ok'],
    [T('Composicionales', 'Compositional'), ds.comp.length ? `${ds.comp.length}` : '—', ds.comp.length ? T('grupos de partes de un todo', 'groups of parts of a whole') : null],
  ]);
}
const TYPE_CLASS = { continuous: 'tc', ordinal: 'to', binary: 'tb', nominal: 'tn', circular: 'ta', date: 'td', id: 'ti', text: 'ti', empty: 'ti' };
function cellText(c, r) {
  const v = c.num[r];
  if (!isFinite(v)) return '<span class="na">—</span>';
  if (c.levels && ['ordinal', 'binary', 'nominal', 'id'].includes(c.type)) return esc(c.levels[v]);
  if (c.type === 'date') { const d = new Date(v * 86400000); return d.toISOString().slice(0, 10); }
  return esc(Fmt.num(v, Math.min(6, decimalsOf(v)), { lang: I18N.lang, style: 'nom', decimal: Fmt.opts.decimal }));
}
function decimalsOf(v) { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(6, s.length - i - 1); }
function paintGrid() {
  const ds = state.data, lim = Math.min(ds.n, 200);
  let h = '<table class="data-grid"><thead><tr><th class="rn">#</th>';
  ds.cols.forEach(c => { h += `<th class="${TYPE_CLASS[c.type] || ''}${c.role === 'exclude' ? ' off' : ''}" title="${esc(TNAME(c.type))}"><span class="cname">${esc(label(c))}</span><span class="ctype">${esc(TNAME(c.type))}</span></th>`; });
  h += '</tr></thead><tbody>';
  for (let r = 0; r < lim; r++) { h += `<tr><td class="rn">${r + 1}</td>`; ds.cols.forEach(c => { h += `<td class="${c.role === 'exclude' ? 'off' : ''}${['continuous', 'circular'].includes(c.type) ? ' num' : ''}">${cellText(c, r)}</td>`; }); h += '</tr>'; }
  el('b2Grid').innerHTML = h + '</tbody></table>';
  el('b2GridNote').innerHTML = ds.n > lim ? L2(`Se muestran las primeras ${lim} de ${fmtNum(ds.n, 0)} filas.`, `Showing the first ${lim} of ${fmtNum(ds.n, 0)} rows.`) : '';
}
function summaryText(c) {
  const s = Data.summary(c);
  if (!s.n) return '—';
  if (s.counts) return s.counts.slice(0, 5).map(x => `${esc(x.level)} (${x.n})`).join(', ') + (s.counts.length > 5 ? ' …' : '');
  if (c.type === 'date') return '';
  const d = 2;
  return `${Fmt.num(s.mean, d)} ± ${Fmt.num(s.sd, d)} · ${T('mín.', 'min')} ${Fmt.num(s.min, d)} · ${T('máx.', 'max')} ${Fmt.num(s.max, d)}`;
}
function paintTypes() {
  const ds = state.data;
  let h = `<table class="types-table"><thead><tr><th>${L2('Columna', 'Column')}</th><th>${L2('Tipo', 'Kind')}</th><th>${L2('Papel', 'Role')}</th><th>${L2('Resumen', 'Summary')}</th><th>${L2('Por qué', 'Why')}</th></tr></thead><tbody>`;
  ds.cols.forEach(c => {
    const unit = c.type === 'circular' ? `<select class="b2-unit" data-key="${c.key}" aria-label="${esc(T('Unidad del ángulo de ', 'Angle unit of ') + label(c))}">${Object.keys(Data.UNITS).map(u => `<option value="${u}"${c.unit === u ? ' selected' : ''}>${esc(T(Data.UNITS[u][0], Data.UNITS[u][1]))}</option>`).join('')}</select>` : '';
    const lv = c.levels && ['ordinal', 'binary'].includes(c.type) ? `<div class="lvl-edit" data-key="${c.key}">${c.levels.map((l, i) => `<span class="lvl">${esc(l)}${i < c.levels.length - 1 ? ` <button type="button" class="lvl-sw" data-i="${i}" title="${esc(T('Intercambiar con el siguiente', 'Swap with the next one'))}" aria-label="${esc(T('Intercambiar ', 'Swap ') + l)}">⇄</button>` : ''}</span>`).join(' <span class="lvl-lt">&lt;</span> ')}</div>` : '';
    h += `<tr data-key="${c.key}"><td><b>${esc(label(c))}</b>${c.label ? `<div class="cmut">${esc(c.name)}${c.unitText ? ' · ' + esc(c.unitText) : ''}</div>` : ''}${c.derived ? `<div class="cmut">${L2('derivada', 'derived')}</div>` : ''}</td>` +
      `<td><select class="b2-type" data-key="${c.key}" aria-label="${esc(T('Tipo de ', 'Kind of ') + label(c))}">${TYPES.map(t => `<option value="${t}"${c.type === t ? ' selected' : ''}>${esc(TNAME(t))}</option>`).join('')}</select>${unit}${lv}</td>` +
      `<td><select class="b2-role" data-key="${c.key}" aria-label="${esc(T('Papel de ', 'Role of ') + label(c))}">${ROLES.map(r => `<option value="${r}"${c.role === r ? ' selected' : ''}>${esc(T(Data.ROLE_NAMES[r][0], Data.ROLE_NAMES[r][1]))}</option>`).join('')}</select></td>` +
      `<td class="csum">${summaryText(c)}${c.nMissing ? `<div class="cmut">${L2(`${c.nMissing} faltante(s)`, `${c.nMissing} missing`)}</div>` : ''}</td>` +
      `<td class="cwhy">${esc(T(c.why[0], c.why[1]))}</td></tr>`;
  });
  el('b2Types').innerHTML = h + '</tbody></table>';
}
function paintMissing() {
  const ds = state.data, ms = Data.missingSummary(ds, ds.cols.filter(c => c.role !== 'exclude').map(c => c.key));
  const totalMiss = ms.perCol.reduce((a, c) => a + c.missing, 0);
  statTiles('b2MissTiles', [
    [T('Celdas faltantes', 'Missing cells'), fmtNum(totalMiss, 0), T(`de ${fmtNum(ds.n * ms.perCol.length, 0)}`, `of ${fmtNum(ds.n * ms.perCol.length, 0)}`), totalMiss ? 'warn' : 'ok'],
    [T('Filas completas', 'Complete rows'), fmtNum(ms.complete, 0), T(`${Math.round(100 * ms.complete / Math.max(1, ds.n))} % de las filas`, `${Math.round(100 * ms.complete / Math.max(1, ds.n))}% of the rows`)],
    [T('Patrones distintos', 'Distinct patterns'), `${ms.patterns.length}`],
  ]);
  const max = Math.max(1, ...ms.perCol.map(c => c.missing));
  el('b2MissBars').innerHTML = `<div class="pg-title">${L2('Faltantes por columna', 'Missing per column')}</div>` + ms.perCol.map(c => `<div class="mbar"><span class="mbn">${esc(label(Data.col(ds, c.key)))}</span><span class="mbt"><i style="width:${(100 * c.missing / max).toFixed(1)}%"></i></span><span class="mbv">${c.missing}</span></div>`).join('');
  const cols = ms.perCol;
  el('b2MissPatterns').innerHTML = `<div class="pg-title">${L2('Patrones de filas (■ presente, □ faltante)', 'Row patterns (■ present, □ missing)')}</div><table class="pat-table"><tbody>` +
    ms.patterns.slice(0, 8).map(([p, k]) => `<tr><td class="pk">${k}</td>${[...p].map((b, j) => `<td class="${b === '1' ? 'p1' : 'p0'}" title="${esc(cols[j].name)}"></td>`).join('')}</tr>`).join('') + '</tbody></table>' +
    (ms.patterns.length > 8 ? `<p class="hint">${L2(`y ${ms.patterns.length - 8} patrones más`, `and ${ms.patterns.length - 8} more patterns`)}</p>` : '');
  el('b2Mode').value = ds.missingMode;
  el('b2ModeNote').innerHTML = ds.missingMode === 'pairwise'
    ? L2('Por pares se aprovecha cada dato, pero cada correlación de una matriz puede salir de filas distintas y la matriz puede no ser válida (el Bloque 5 lo revisa y la corrige).', 'Pairwise uses every datum, but each correlation of a matrix may come from different rows and the matrix may not be valid (Block 5 checks and corrects it).')
    : L2('Por listas todas las correlaciones salen de las mismas filas, a costa de perder las incompletas.', 'Listwise every correlation comes from the same rows, at the cost of losing the incomplete ones.');
  clearMessages('b2MissMsgs');
  ds.cols.forEach(c => { const s = Data.sentinels(c); if (s.length) showMessage('b2MissMsgs', 'warn', L2(`«${esc(label(c))}» tiene el valor ${s.join(', ')}, muy lejos de los demás: ¿es un código de «sin dato»? Si lo es, escríbelo en «Otros códigos de faltante» y vuelve a abrir el archivo.`, `«${esc(label(c))}» has the value ${s.join(', ')}, far from the others: is it a «no data» code? If so, write it in «Other missing codes» and open the file again.`)); });
}
function paintTransform() {
  const ds = state.data, sc = el('b2TrCol'), cur = sc.value;
  const cand = ds.cols.filter(c => c.role !== 'exclude' && ['continuous', 'ordinal', 'date'].includes(c.type));
  sc.innerHTML = cand.map(c => `<option value="${c.key}">${esc(label(c))}</option>`).join('');
  if (cand.some(c => c.key === cur)) sc.value = cur;
  paintTrOps();
  const der = ds.cols.filter(c => c.derived);
  el('b2TrList').innerHTML = der.length ? `<table class="types-table"><thead><tr><th>${L2('Columna creada', 'Created column')}</th><th>${L2('A partir de', 'From')}</th><th></th></tr></thead><tbody>` +
    der.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(T(c.why[0], c.why[1]))}</td><td><button type="button" class="btn btn-ghost btn-sm" data-del="${c.key}">${L2('Quitar', 'Remove')}</button></td></tr>`).join('') + '</tbody></table>' : '';
}
function paintTrOps() {
  const ds = state.data, c = Data.col(ds, el('b2TrCol').value), so = el('b2TrOp'), cur = so.value;
  if (!c) { so.innerHTML = ''; return; }
  const ops = Object.entries(Data.TRANSFORMS).filter(([, t]) => t.ok(c, ds));
  so.innerHTML = ops.map(([k, t]) => `<option value="${k}">${esc(T(t.es, t.en))}</option>`).join('');
  if (ops.some(([k]) => k === cur)) so.value = cur;
}
function paintAssistSelects() {
  const ds = state.data, cand = ds.cols.filter(c => c.role !== 'exclude' && c.type !== 'text' && c.type !== 'empty');
  const sx = el('b2AsX'), sy = el('b2AsY'), ox = sx.value, oy = sy.value;
  const opts = cand.map(c => `<option value="${c.key}">${esc(label(c))} · ${esc(TNAME(c.type))}</option>`).join('');
  sx.innerHTML = opts; sy.innerHTML = opts;
  if (cand.some(c => c.key === ox)) sx.value = ox;
  if (cand.some(c => c.key === oy)) sy.value = oy; else if (cand.length > 1) sy.value = cand[1].key;
}
function paintAssist() {
  const ds = state.data, kx = el('b2AsX').value, ky = el('b2AsY').value;
  const host = el('b2AsRecs'), look = el('b2AsLook'), plot = el('b2AsPlot');
  if (!kx || !ky || kx === ky) { host.innerHTML = `<p class="hint">${L2('Elige dos columnas distintas.', 'Pick two different columns.')}</p>`; look.innerHTML = ''; plot.innerHTML = ''; return; }
  const R = Data.recommend(ds, kx, ky), A = Data.col(ds, kx), B = Data.col(ds, ky), p = Data.pair(ds, kx, ky);
  const lvl = { best: ['Recomendada', 'Recommended'], also: ['También', 'Also'], avoid: ['Con cautela', 'With care'] };
  host.innerHTML = `<div class="rec-list">` + R.recs.map(r => {
    const m = Catalog.byId(r.id) || Catalog.byId(r.id === 'kendall' ? 'kendallB' : r.id === 'dcor' ? 'dcor' : r.id);
    return `<div class="rec rec-${r.level}"><div class="rec-h"><span class="rec-l">${L2(lvl[r.level][0], lvl[r.level][1])}</span><b>${L2(r.es, r.en)}</b><span class="rec-b">${L2('Bloque ' + r.blk, 'Block ' + r.blk)}</span>${m ? `<button type="button" class="btn btn-ghost btn-sm rec-info" data-measure="${m.id}">${L2('¿Qué es?', 'What is it?')}</button>` : ''}</div><div class="rec-w">${L2(r.why[0], r.why[1])}</div></div>`;
  }).join('') + '</div>' + (R.recs.some(r => r.blk === 4) ? `<div class="btn-row"><button type="button" class="btn btn-primary btn-sm" id="b2ToPair">${L2('Estudiar este par en el Bloque 4 →', 'Study this pair in Block 4 →')}</button></div>` : '');
  if (R.look) {
    const L = R.look;
    statTiles(look, [
      ['n', fmtNum(L.n, 0), p.dropped ? T(`${p.dropped} fila(s) sin el par`, `${p.dropped} row(s) without the pair`) : null],
      [T('Atípicos', 'Outliers'), `${L.outliers}`, T('|z robusta| > 3.5', '|robust z| > 3.5'), L.outliers ? 'warn' : 'ok'],
      [T('Curvatura', 'Curvature'), isFinite(L.curveP) ? 'p ' + Fmt.pValue(L.curveP) : '—', T('término cuadrático', 'quadratic term'), L.curveP < 0.01 ? 'warn' : 'ok'],
      [T('Empates', 'Ties'), `${Math.round(100 * Math.max(L.tiesX, L.tiesY))} %`],
      ['r · ρ', `${fmtR(L.r)} · ${fmtR(L.rho)}`], ['dCor', isFinite(L.dcor) ? fmtR(L.dcor) : '—'],
    ]);
  } else look.innerHTML = '';
  if (['continuous', 'ordinal', 'circular', 'binary', 'date'].includes(A.type) && ['continuous', 'ordinal', 'circular', 'binary', 'date'].includes(B.type) && p.n > 2) {
    plot.innerHTML = Plot.scatter({ x: p.x, y: p.y, w: 420, h: 340, legend: false, xlab: label(A), ylab: label(B), plot: 'b2-assist', clip: 'b2asc', ellipse: 0.68, fit: 'ols', r: p.n > 300 ? 2 : 3 });
  } else plot.innerHTML = `<p class="hint" style="padding:12px">${L2('Para variables categóricas, la tabla de contingencia llega en el Bloque 8.', 'For categorical variables, the contingency table arrives in Block 8.')}</p>`;
}

/* ---------------- the examples gallery ---------------- */
function paintExamples() {
  const host = el('b2ExGrid');
  if (!host) return;
  host.innerHTML = Datasets.list.map(d => `<div class="ex-card"><div class="ex-h"><b>${L2(esc(d.es), esc(d.en))}</b><span class="ex-n">${fmtNum(d.n, 0)} × ${d.vars.length}</span></div>` +
    `<p>${L2(esc(d.desc.es), esc(d.desc.en))}</p><div class="ex-f">${L2(esc(d.license.es), esc(d.license.en))} ${d.refs.map(k => `<span class="ex-ref">${esc(Theory.refText(k, I18N.lang).replace(/<[^>]+>/g, '').slice(0, 80))}…</span>`).join(' ')}</div>` +
    `<button type="button" class="btn btn-secondary btn-sm" data-ex="${d.id}">${L2('Usar este conjunto', 'Use this dataset')}</button></div>`).join('');
}

/* ---------------- CSV out ---------------- */
function csvOut() {
  const ds = state.data;
  const q = s => (/[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const lines = [ds.cols.map(c => q(c.name)).join(',')];
  for (let r = 0; r < ds.n; r++) lines.push(ds.cols.map(c => { const v = c.num[r]; if (!isFinite(v)) return 'NA'; if (c.levels && ['ordinal', 'binary', 'nominal', 'id'].includes(c.type)) return q(c.levels[v]); if (c.type === 'date') return new Date(v * 86400000).toISOString().slice(0, 10); return String(v); }).join(','));
  download('﻿' + lines.join('\r\n') + '\r\n', (ds.name || 'datos').replace(/\.[^.]+$/, '') + '_correlationpro.csv', 'text/csv;charset=utf-8');
}

/* ---------------- wiring ---------------- */
function changed(reason) {
  const ds = state.data;
  ds.comp = Data.findCompositional(ds);
  paintAll();
  document.dispatchEvent(new CustomEvent('datachange', { detail: { reason } }));
}
document.addEventListener('DOMContentLoaded', () => {
  if (!el('panel-2')) return;
  paintExamples();
  const file = el('b2File'), drop = el('b2Drop');
  file.addEventListener('change', () => { if (file.files[0]) readFile(file.files[0]); file.value = ''; });
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
  el('b2PasteBtn').addEventListener('click', () => { el('b2PasteBox').hidden = false; el('b2PasteText').focus(); });
  el('b2PasteCancel').addEventListener('click', () => { el('b2PasteBox').hidden = true; });
  el('b2PasteGo').addEventListener('click', () => {
    const t = el('b2PasteText').value;
    if (!t.trim()) return;
    try { readText(t, T('datos pegados', 'pasted data'), { kind: 'paste' }); el('b2PasteBox').hidden = true; }
    catch (e) { showMessage('b2Msgs', 'error', esc(err2msg(e))); }
  });
  el('b2ExamplesBtn').addEventListener('click', () => el('b2Examples').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  el('b2ExGrid').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (b) { loadExample(b.dataset.ex); el('b2Loaded').scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  el('b2Types').addEventListener('change', e => {
    const ds = state.data, s = e.target;
    const c = Data.col(ds, s.dataset.key);
    if (!c) return;
    if (s.classList.contains('b2-type')) { Data.retype(c, s.value, { decimal: ds.decimal, missing: ds.missingCodes }); if (s.value === 'id' || s.value === 'text') c.role = 'exclude'; else if (c.role === 'exclude') c.role = 'var'; changed('type'); }
    else if (s.classList.contains('b2-role')) { c.role = s.value; changed('role'); }
    else if (s.classList.contains('b2-unit')) { c.unit = s.value; changed('unit'); }
  });
  el('b2Types').addEventListener('click', e => {
    const b = e.target.closest('.lvl-sw');
    if (!b) return;
    const ds = state.data, c = Data.col(ds, b.closest('.lvl-edit').dataset.key), i = +b.dataset.i;
    const lv = c.levels.slice(); [lv[i], lv[i + 1]] = [lv[i + 1], lv[i]];
    Data.retype(c, c.type, { levels: lv, decimal: ds.decimal });
    c.why = [`Orden de los niveles elegido por ti: ${lv.join(' < ')}.`, `Order of the levels chosen by you: ${lv.join(' < ')}.`];
    changed('levels');
  });
  el('b2Restore').addEventListener('click', () => {
    const ds = state.data;
    ds.cols.forEach(c => { if (c.derived || !c.auto) return; const inf = Data.infer(c.name, c.raw, { decimal: ds.decimal, missing: ds.missingCodes }); Object.assign(c, inf); c.userType = false; });
    changed('restore');
  });
  el('b2Mode').addEventListener('change', e => { state.data.missingMode = e.target.value; paintMissing(); document.dispatchEvent(new CustomEvent('datachange', { detail: { reason: 'missing' } })); });
  el('b2TrCol').addEventListener('change', paintTrOps);
  el('b2TrGo').addEventListener('click', () => {
    clearMessages('b2TrMsgs');
    try {
      const nc = Data.transform(state.data, el('b2TrCol').value, el('b2TrOp').value);
      changed('transform');
      showMessage('b2TrMsgs', 'ok', L2(`Columna «${esc(nc.name)}» creada.`, `Column «${esc(nc.name)}» created.`));
    } catch (e) { showMessage('b2TrMsgs', 'error', esc(err2msg(e))); }
  });
  el('b2TrList').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    state.data.cols = state.data.cols.filter(c => c.key !== b.dataset.del);
    changed('remove');
  });
  ['b2AsX', 'b2AsY'].forEach(id => el(id).addEventListener('change', paintAssist));
  el('b2AsRecs').addEventListener('click', e => {
    const m = e.target.closest('[data-measure]');
    if (m) { Home.openMeasure(m.dataset.measure); return; }
    if (e.target.closest('#b2ToPair')) { if (window.B4) B4.setPair(el('b2AsX').value, el('b2AsY').value); goStep(4); }
  });
  el('b2Csv').addEventListener('click', csvOut);
});
document.addEventListener('langchange', () => { paintExamples(); if (state.data) paintAll(); });
document.addEventListener('fmtchange', () => { if (state.data) paintAll(); });
window.B2 = B2;
})();
