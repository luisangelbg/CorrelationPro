/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — reading data files, without libraries.

   · Delimited text (comma, semicolon, tab, bar): RFC 4180 quoting, CRLF/LF/CR,
     UTF-8 with or without BOM, UTF-16 with BOM, Latin-1 as fallback; the
     delimiter and the decimal mark are detected from the first lines.
   · Spreadsheet workbooks (.xlsx, .xlsm, .ods): a workbook is a ZIP of XML
     files; the ZIP is read and inflated here (DEFLATE, RFC 1951: stored, fixed
     and dynamic Huffman blocks) and the XML is walked without building a tree.
     Every cell comes back as a number (the stored value, not the displayed one),
     a date 'YYYY-MM-DD[ HH:MM:SS]', a text, or '' when empty; error cells
     (#N/A, #DIV/0!) are empty.
   It shares its design with the reader of another program by the same author.

   Installs `DataIO` in the global object it is given; no DOM access. */
function DataIOCore(g) {
'use strict';
const IO = {};
class DataError extends Error {
  constructor(es, en, hint) { super(en); this.es = es; this.en = en; this.hint = hint || null; }
}
IO.DataError = DataError;

/* ================= DEFLATE ================= */
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073,
  4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
/* canonical decoding table from code lengths: a direct table of 2^max
   entries, each one symbol·16 + length, indexed by the bits in stream order */
function huffman(lengths) {
  let max = 0;
  for (const l of lengths) if (l > max) max = l;
  const table = new Int32Array(1 << Math.max(max, 1)).fill(-1);
  if (!max) return { table, max: 1 };
  const count = new Int32Array(16);
  for (const l of lengths) if (l) count[l]++;
  const next = new Int32Array(16);
  let code = 0;
  for (let l = 1; l <= 15; l++) { code = (code + count[l - 1]) << 1; next[l] = code; }
  for (let s = 0; s < lengths.length; s++) {
    const l = lengths[s];
    if (!l) continue;
    const c = next[l]++;
    let inv = 0;
    for (let i = 0; i < l; i++) inv |= ((c >> i) & 1) << (l - 1 - i);
    for (let r = inv; r < table.length; r += 1 << l) table[r] = (s << 4) | l;
  }
  return { table, max };
}
let FIX_LIT = null, FIX_DIST = null;
function fixedTables() {
  if (FIX_LIT) return;
  const l = new Int32Array(288);
  for (let i = 0; i < 288; i++) l[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8;
  FIX_LIT = huffman(l);
  FIX_DIST = huffman(new Int32Array(30).fill(5));
}
const broken = () => new DataError('El archivo comprimido está dañado o incompleto.', 'The compressed file is damaged or incomplete.', ['Vuelve a guardarlo o descárgalo de nuevo.', 'Save it again or download it again.']);
IO.inflate = function (src, expected) {
  let pos = 0, buf = 0, nbits = 0, o = 0;
  let out = new Uint8Array(expected > 0 ? expected : Math.max(1024, src.length * 4));
  const room = extra => {
    if (o + extra <= out.length) return;
    let n = out.length * 2;
    while (n < o + extra) n *= 2;
    const m = new Uint8Array(n); m.set(out.subarray(0, o)); out = m;
  };
  const bits = n => {
    while (nbits < n) { if (pos >= src.length) throw broken(); buf |= src[pos++] << nbits; nbits += 8; }
    const v = buf & ((1 << n) - 1);
    buf >>>= n; nbits -= n;
    return v;
  };
  const symbol = h => {
    while (nbits < h.max && pos < src.length) { buf |= src[pos++] << nbits; nbits += 8; }
    const e = h.table[buf & ((1 << h.max) - 1)];
    if (e < 0 || (e & 15) > nbits) throw broken();
    const l = e & 15;
    buf >>>= l; nbits -= l;
    return e >> 4;
  };
  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      buf = 0; nbits = 0;
      if (pos + 4 > src.length) throw broken();
      const len = src[pos] | (src[pos + 1] << 8), nlen = src[pos + 2] | (src[pos + 3] << 8);
      pos += 4;
      if ((len ^ 0xffff) !== nlen || pos + len > src.length) throw broken();
      room(len); out.set(src.subarray(pos, pos + len), o); o += len; pos += len;
      continue;
    }
    let lit, dist;
    if (type === 1) { fixedTables(); lit = FIX_LIT; dist = FIX_DIST; }
    else if (type === 2) {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const lc = new Int32Array(19);
      for (let i = 0; i < hclen; i++) lc[CL_ORDER[i]] = bits(3);
      const hc = huffman(lc);
      const lens = new Int32Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist;) {
        const s = symbol(hc);
        if (s < 16) lens[i++] = s;
        else {
          let rep, val = 0;
          if (s === 16) { if (!i) throw broken(); val = lens[i - 1]; rep = 3 + bits(2); }
          else if (s === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          if (i + rep > hlit + hdist) throw broken();
          while (rep--) lens[i++] = val;
        }
      }
      lit = huffman(lens.subarray(0, hlit));
      dist = huffman(lens.subarray(hlit));
    } else throw broken();
    for (;;) {
      const s = symbol(lit);
      if (s < 256) { room(1); out[o++] = s; continue; }
      if (s === 256) break;
      const k = s - 257;
      if (k >= 29) throw broken();
      const len = LEN_BASE[k] + bits(LEN_EXTRA[k]);
      const ds = symbol(dist);
      if (ds >= 30) throw broken();
      const d = DIST_BASE[ds] + bits(DIST_EXTRA[ds]);
      if (d > o) throw broken();
      room(len);
      for (let i = 0; i < len; i++, o++) out[o] = out[o - d];
    }
  }
  return out.subarray(0, o);
};

/* ================= ZIP (reading) ================= */
IO.unzip = function (bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const notZip = () => new DataError('El archivo no es un libro .xlsx ni .ods (no es un ZIP).', 'The file is not an .xlsx or .ods workbook (it is not a ZIP).',
    ['Si es un libro del formato viejo (.xls), guárdalo como .xlsx o .csv.', 'If it is an old-format workbook (.xls), save it as .xlsx or .csv.']);
  if (u8.length < 22) throw notZip();
  let end = -1;
  for (let i = u8.length - 22; i >= 0 && i >= u8.length - 22 - 65535; i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw notZip();
  const total = dv.getUint16(end + 10, true);
  let p = dv.getUint32(end + 16, true);
  if (p === 0xffffffff) throw new DataError('El archivo usa el formato ZIP64, que este lector no abre.', 'The file uses ZIP64, which this reader does not open.');
  const dec = new TextDecoder('utf-8');
  const entries = {}, names = [];
  for (let i = 0; i < total && p + 46 <= u8.length && dv.getUint32(p, true) === 0x02014b50; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    const ln = dv.getUint16(local + 26, true), le = dv.getUint16(local + 28, true);
    const start = local + 30 + ln + le;
    entries[name] = { method, usize, data: u8.subarray(start, start + csize) };
    names.push(name);
    p += 46 + nlen + elen + clen;
  }
  return {
    names,
    bytes(name) {
      const e = entries[name];
      if (!e) return null;
      if (e.method === 0) return e.data;
      if (e.method === 8) return IO.inflate(e.data, e.usize);
      throw new DataError('El archivo usa un método de compresión que este lector no abre.', 'The file uses a compression method this reader does not open.');
    },
    /* XML text with its line ends normalized to a line feed, as the XML specification asks (§2.11) */
    text(name) { const b = this.bytes(name); return b ? dec.decode(b).replace(/\r\n?/g, '\n') : null; },
  };
};

/* ================= XML walking (SAX style) ================= */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEnt(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m;
  });
}
function attrs(s) {
  const out = {}, re = /([^\s=\/]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = decodeEnt(m[3] !== undefined ? m[3] : m[4]);
  return out;
}
function tagEnd(t, i) {
  let q = null;
  for (let k = i; k < t.length; k++) {
    const c = t[k];
    if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') return k;
  }
  return -1;
}
IO.walkXML = function (t, h) {
  const open = h.open || (() => {}), close = h.close || (() => {}), text = h.text || null;
  let i = 0;
  const n = t.length;
  while (i < n) {
    const lt = t.indexOf('<', i);
    if (lt < 0) { if (text) { const s = t.slice(i); if (s.trim()) text(decodeEnt(s)); } break; }
    if (lt > i && text) text(decodeEnt(t.slice(i, lt)));
    const c1 = t[lt + 1];
    if (c1 === '!') {
      if (t.startsWith('<!--', lt)) { const f = t.indexOf('-->', lt + 4); i = f < 0 ? n : f + 3; continue; }
      if (t.startsWith('<![CDATA[', lt)) { const f = t.indexOf(']]>', lt + 9); if (text) text(t.slice(lt + 9, f < 0 ? n : f)); i = f < 0 ? n : f + 3; continue; }
      const f = t.indexOf('>', lt); i = f < 0 ? n : f + 1; continue;
    }
    if (c1 === '?') { const f = t.indexOf('?>', lt); i = f < 0 ? n : f + 2; continue; }
    const gt = tagEnd(t, lt + 1);
    if (gt < 0) break;
    if (c1 === '/') { close(t.slice(lt + 2, gt).trim()); i = gt + 1; continue; }
    let body = t.slice(lt + 1, gt);
    const empty = body.endsWith('/');
    if (empty) body = body.slice(0, -1);
    const sp = body.search(/\s/);
    const name = sp < 0 ? body : body.slice(0, sp);
    open(name, sp < 0 ? {} : attrs(body.slice(sp + 1)), empty);
    if (empty) close(name);
    i = gt + 1;
  }
};
function tree(t) {
  const root = { name: '#root', a: {}, kids: [], text: '' }, stack = [root];
  IO.walkXML(t, {
    open(name, a) { const nd = { name, a, kids: [], text: '' }; stack[stack.length - 1].kids.push(nd); stack.push(nd); },
    close() { if (stack.length > 1) stack.pop(); },
    text(s) { stack[stack.length - 1].text += s; },
  });
  return root;
}
function find(nd, name, out) {
  out = out || [];
  for (const h of nd.kids) {
    const local = h.name.indexOf(':') >= 0 ? h.name.slice(h.name.indexOf(':') + 1) : h.name;
    if (h.name === name || local === name) out.push(h);
    find(h, name, out);
  }
  return out;
}

/* ================= workbooks ================= */
function colOf(ref) {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) n = n * 26 + (c - 64); else if (c >= 97 && c <= 122) n = n * 26 + (c - 96); else break;
  }
  return n - 1;
}
const two = v => (v < 10 ? '0' : '') + v;
/* serial number of a spreadsheet date → 'YYYY-MM-DD[ HH:MM:SS]' (base 1899-12-30, or 1904-01-01) */
IO.dateFromSerial = function (serial, b1904) {
  const base = b1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const d = new Date(base + Math.round(serial * 86400) * 1000);
  const day = d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate());
  const s = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  return s ? day + ' ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ':' + two(d.getUTCSeconds()) : day;
};
function dense(rows) {
  const w = rows.reduce((m, f) => Math.max(m, f ? f.length : 0), 0);
  const out = [];
  for (const f of rows) {
    const full = Array.from({ length: w }, (_, i) => (f && f[i] !== undefined && f[i] !== null ? f[i] : ''));
    if (full.some(v => v !== '')) out.push(full);
  }
  if (!out.length) return out;
  let lastC = -1, firstC = Infinity;
  for (const f of out) {
    for (let j = f.length - 1; j > lastC; j--) if (f[j] !== '') { lastC = j; break; }
    for (let j = 0; j < Math.min(firstC, f.length); j++) if (f[j] !== '') { firstC = j; break; }
  }
  return out.map(f => f.slice(firstC, lastC + 1));
}
const DATE_FMT = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
function isDateFormat(id, code) {
  if (DATE_FMT.has(id)) return true;
  if (!code) return false;
  const c = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[ymdhs]/i.test(c) && !/^[#0.,%E+\-\s]*$/.test(c);
}
function sharedStrings(t) {
  const list = [];
  if (!t) return list;
  let cur = null, inT = false, ph = 0;
  IO.walkXML(t, {
    open(n) { if (n === 'si') cur = ''; else if (n === 'rPh') ph++; else if (n === 't' && cur !== null && !ph) inT = true; },
    close(n) { if (n === 'si') { list.push(cur); cur = null; } else if (n === 'rPh') ph--; else if (n === 't') inT = false; },
    text(s) { if (inT) cur += s; },
  });
  return list;
}
function dateStyles(t) {
  if (!t) return [];
  const a = tree(t), own = {};
  for (const f of find(a, 'numFmt')) own[+f.a.numFmtId] = f.a.formatCode;
  const xfs = find(a, 'cellXfs')[0];
  if (!xfs) return [];
  return xfs.kids.filter(h => h.name === 'xf' || h.name.endsWith(':xf')).map(xf => { const id = +(xf.a.numFmtId || 0); return isDateFormat(id, own[id]); });
}
function sheetXlsx(t, strings, isDate, b1904) {
  const rows = [];
  let row = null, rowN = -1, nextC = 0, cell = null, buf = '', inV = false, inT = false, inIs = false;
  IO.walkXML(t, {
    open(n, a) {
      if (n === 'row') { rowN = a.r ? +a.r - 1 : rowN + 1; row = []; nextC = 0; }
      else if (n === 'c') { const col = a.r ? colOf(a.r) : nextC; nextC = col + 1; cell = { col, type: a.t || 'n', style: +(a.s || 0) }; buf = ''; inV = false; inT = false; inIs = false; }
      else if (n === 'v' && cell) { inV = true; buf = ''; }
      else if (n === 'is' && cell) { inIs = true; buf = ''; }
      else if (n === 't' && inIs) inT = true;
    },
    close(n) {
      if (n === 'v') inV = false;
      else if (n === 't') inT = false;
      else if (n === 'is') inIs = false;
      else if (n === 'c' && cell) {
        let v = '';
        const ty = cell.type;
        if (ty === 's') v = strings[+buf] !== undefined ? strings[+buf] : '';
        else if (ty === 'inlineStr' || ty === 'str') v = buf;
        else if (ty === 'e') v = '';
        else if (ty === 'b') v = buf === '1' ? 'TRUE' : buf === '0' ? 'FALSE' : '';
        else if (buf !== '') { const x = Number(buf); v = Number.isNaN(x) ? buf : (isDate[cell.style] ? IO.dateFromSerial(x, b1904) : x); }
        row[cell.col] = v;
        cell = null;
      } else if (n === 'row') { rows[rowN] = row; row = null; }
    },
    text(s) { if (cell && (inV || inT)) buf += s; },
  });
  return dense(rows);
}
function readXlsx(z) {
  const wb = z.text('xl/workbook.xml');
  if (!wb) throw new DataError('El archivo no tiene la estructura de un libro .xlsx.', 'The file does not have the structure of an .xlsx workbook.');
  const a = tree(wb), pr = find(a, 'workbookPr')[0];
  const b1904 = !!pr && (pr.a.date1904 === '1' || pr.a.date1904 === 'true');
  const target = {}, rels = z.text('xl/_rels/workbook.xml.rels');
  if (rels) for (const r of find(tree(rels), 'Relationship')) target[r.a.Id] = r.a.Target;
  const strings = sharedStrings(z.text('xl/sharedStrings.xml')), isDate = dateStyles(z.text('xl/styles.xml'));
  const names = [], sheets = {};
  find(a, 'sheet').forEach((s, i) => {
    const name = s.a.name || 'Sheet' + (i + 1);
    let path = target[s.a['r:id']] || 'worksheets/sheet' + (i + 1) + '.xml';
    path = path.replace(/^\//, '').replace(/^xl\//, '');
    const t = z.text('xl/' + path);
    if (t === null) return;
    names.push(name);
    sheets[name] = sheetXlsx(t, strings, isDate, b1904);
  });
  return { names, sheets };
}
const REPEAT_LIMIT = 1000;
function readOds(z) {
  const t = z.text('content.xml');
  if (!t) throw new DataError('El archivo no tiene la estructura de un libro .ods.', 'The file does not have the structure of an .ods workbook.');
  const names = [], sheets = {};
  let table = null, rows = null, row = null, cell = null, inP = 0, bufP = '', paras = [];
  const closeCell = () => {
    if (!cell || !row) { cell = null; return; }
    const a = cell.a, ty = a['office:value-type'];
    let v = '';
    if (!cell.covered) {
      if (ty === 'float' || ty === 'percentage' || ty === 'currency') v = Number(a['office:value']);
      else if (ty === 'boolean') v = a['office:boolean-value'] === 'true' ? 'TRUE' : 'FALSE';
      else if (ty === 'date') { const raw = a['office:date-value'] || ''; v = raw.length > 10 ? raw.slice(0, 10) + (raw.slice(11, 19) !== '00:00:00' ? ' ' + raw.slice(11, 19) : '') : raw; }
      else v = paras.join('\n');
    }
    if (!(v === '' && cell.repeat > REPEAT_LIMIT)) for (let k = 0; k < cell.repeat; k++) row.cells.push(v);
    else row.cells.push('');
    cell = null;
  };
  IO.walkXML(t, {
    open(n, a, empty) {
      if (n === 'table:table') { table = a['table:name'] || 'Sheet' + (names.length + 1); rows = []; }
      else if (n === 'table:table-row' && table) row = { cells: [], repeat: Math.max(1, +(a['table:number-rows-repeated'] || 1)) };
      else if ((n === 'table:table-cell' || n === 'table:covered-table-cell') && row) {
        cell = { a, covered: n !== 'table:table-cell', repeat: Math.max(1, +(a['table:number-columns-repeated'] || 1)) };
        paras = [];
        if (empty) closeCell();
      } else if (n === 'text:p' && cell) { inP++; bufP = ''; }
      else if (n === 'text:s' && inP) bufP += ' '.repeat(Math.max(1, +(a['text:c'] || 1)));
      else if (n === 'text:tab' && inP) bufP += '\t';
    },
    close(n) {
      if (n === 'text:p' && inP) { inP--; paras.push(bufP); }
      else if ((n === 'table:table-cell' || n === 'table:covered-table-cell') && cell) closeCell();
      else if (n === 'table:table-row' && row) {
        const full = row.cells.some(v => v !== '');
        if (full || row.repeat <= REPEAT_LIMIT) for (let k = 0; k < row.repeat; k++) rows.push(row.cells.slice());
        row = null;
      } else if (n === 'table:table' && table) { names.push(table); sheets[table] = dense(rows); table = null; }
    },
    text(s) { if (inP) bufP += s; },
  });
  if (!names.length) throw new DataError('El libro no tiene hojas que se puedan leer.', 'The workbook has no readable sheets.');
  return { names, sheets };
}
/* a workbook from its bytes: { names, sheets: { name: rows } } */
IO.readWorkbook = function (bytes) {
  const z = IO.unzip(bytes);
  if (z.names.includes('content.xml') && !z.names.includes('xl/workbook.xml')) return readOds(z);
  return readXlsx(z);
};

/* ================= delimited text ================= */
IO.decodeText = function (bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u8.length >= 2 && ((u8[0] === 0xff && u8[1] === 0xfe) || (u8[0] === 0xfe && u8[1] === 0xff))) {
    const le = u8[0] === 0xff;
    return { text: new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(u8.subarray(2)), encoding: le ? 'UTF-16LE' : 'UTF-16BE' };
  }
  const bom = u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf;
  const body = bom ? u8.subarray(3) : u8;
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(body), encoding: 'UTF-8' }; }
  catch (e) { return { text: new TextDecoder('windows-1252').decode(body), encoding: 'Latin-1 (Windows-1252)' }; }
};
/* rows of cells, honouring quotes */
IO.parseDelimited = function (text, o) {
  o = o || {};
  const d = o.delimiter || ',', q = o.quote === undefined ? '"' : o.quote;
  let t = String(text);
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rows = [];
  let row = [], cell = '', inside = false, i = 0, quoted = false;
  const n = t.length;
  while (i < n) {
    const c = t[i];
    if (inside) {
      if (c === q) { if (t[i + 1] === q) { cell += q; i += 2; continue; } inside = false; i++; continue; }
      /* a line break inside quotes is one line feed, whatever system wrote it */
      if (c === '\r') { cell += '\n'; i += t[i + 1] === '\n' ? 2 : 1; continue; }
      cell += c; i++; continue;
    }
    if (c === q && q && cell.trim() === '' && !quoted) { inside = true; quoted = true; cell = ''; i++; continue; }
    if (c === d) { row.push(cell); cell = ''; quoted = false; i++; continue; }
    if (c === '\r' || c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; quoted = false; i += c === '\r' && t[i + 1] === '\n' ? 2 : 1; continue; }
    cell += c; i++;
  }
  if (inside) throw new DataError('Hay una comilla que no se cierra en el archivo.', 'There is a quote that is never closed in the file.', ['Revisa que cada texto entre comillas tenga su comilla final.', 'Check that every quoted text has its closing quote.']);
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(f => f.some(v => v.trim() !== ''));
};
const NUM_DOT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const NUM_COMMA = /^[+-]?(\d+,?\d*|,\d+)([eE][+-]?\d+)?$/;
/* a text as a number with the given decimal mark ('.' or ','); NaN if it is not one */
IO.toNumber = function (s, decimal) {
  if (typeof s === 'number') return s;
  const v = String(s).trim();
  if (v === '') return NaN;
  if (v === 'Inf' || v === '+Inf') return Infinity;
  if (v === '-Inf') return -Infinity;
  if ((decimal || '.') === ',') {
    if (NUM_COMMA.test(v)) return Number(v.replace(',', '.'));
    if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) return Number(v.replace(/\./g, '').replace(',', '.'));
    return NaN;
  }
  if (NUM_DOT.test(v)) return Number(v);
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v) && (v.match(/,/g) || []).length > 1) return Number(v.replace(/,/g, ''));
  return NaN;
};
/* the most likely delimiter and decimal mark, from the first lines */
IO.detect = function (text) {
  const sample = String(text).replace(/^﻿/, '').slice(0, 20000);
  let best = ',', score = -1;
  for (const d of ['\t', ';', ',', '|']) {
    let rows;
    try { rows = IO.parseDelimited(sample, { delimiter: d }).slice(0, 30); } catch (e) { continue; }
    if (rows.length > 1 && sample.length >= 20000) rows.pop();
    const widths = rows.map(f => f.length);
    if (!widths.length || Math.max(...widths) < 2) continue;
    const cnt = {};
    for (const w of widths) cnt[w] = (cnt[w] || 0) + 1;
    const [mode, times] = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0];
    const p = (times / widths.length) * 10 + Math.min(+mode, 50) / 100;
    if (p > score) { score = p; best = d; }
  }
  let decimal = '.';
  if (best !== ',') {
    let comma = 0, dot = 0;
    for (const f of IO.parseDelimited(sample, { delimiter: best }).slice(1, 200)) for (const v of f) {
      const s = v.trim();
      if (/^[+-]?\d+,\d+$/.test(s)) comma++; else if (/^[+-]?\d+\.\d+$/.test(s)) dot++;
    }
    if (comma > dot) decimal = ',';
  }
  return { delimiter: best, decimal };
};
/* empty or repeated names → V1, name.1 … */
IO.uniqueNames = function (list) {
  const out = [];
  list.forEach((nm, j) => {
    const base = String(nm || '').trim() || 'V' + (j + 1);
    let name = base, k = 0;
    while (out.includes(name)) { k++; name = base + '.' + k; }
    out.push(name);
  });
  return out;
};
/* rows (first one with the names, if header) → { names, columns: [[cell…]…] } of raw cells */
IO.rowsToColumns = function (rows, header) {
  if (!rows.length) throw new DataError('El archivo está vacío.', 'The file is empty.');
  const w = rows.reduce((m, f) => Math.max(m, f.length), 0);
  let names = header !== false ? rows[0].map(s => String(s).trim()) : [];
  while (names.length < w) names.push('');
  names = IO.uniqueNames(names);
  const body = header !== false ? rows.slice(1) : rows;
  const columns = names.map((_, j) => body.map(f => (f[j] === undefined ? '' : f[j])));
  return { names, columns, rows: body.length };
};
/* delimited text → raw columns, with what was detected */
IO.readDelimited = function (text, o) {
  o = Object.assign({}, o || {});
  const det = (!o.delimiter || !o.decimal) ? IO.detect(text) : null;
  const delimiter = o.delimiter || det.delimiter, decimal = o.decimal || det.decimal;
  const rows = IO.parseDelimited(text, { delimiter });
  const t = IO.rowsToColumns(rows, o.header);
  return Object.assign(t, { delimiter, decimal });
};

g.DataIO = IO;
return IO;
}
if (typeof window !== 'undefined') DataIOCore(window);
