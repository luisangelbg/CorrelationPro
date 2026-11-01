/* CorrelationPro — correlation analysis of every kind, in the browser.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* CorrelationPro — how numbers are written in a report.

   Three styles, because they genuinely disagree:
     · 'apa'    — the psychology and social-science manual (7th edition): no
                  leading zero for quantities that cannot exceed 1 (r = .45,
                  p = .032), p < .001 below a thousandth, CI in brackets;
     · 'sampl'  — the statistical reporting guidelines of biomedical journals
                  (Lang and Altman 2013): leading zero, capital P, two decimals
                  for P ≥ 0.01 and three below, P < 0.001, CI "0.20 to 0.65";
     · 'nom'    — the Mexican standard of units and numbers (NOM-008-SE-2021)
                  and the academies of the language: the leading zero is
                  compulsory, the decimal sign may be the point or the comma,
                  thousands are grouped with a thin space; with a decimal comma
                  the limits of an interval are separated by a semicolon.
   Everywhere: the true minus sign (U+2212), never the hyphen; italic r, p,
   n, t (Latin letters for statistics), upright Greek letters.

   Pure functions (no DOM): every module and the report use them. */
function FmtCore(g) {
'use strict';
const Fmt = {};
const MINUS = '−', THIN = ' ';
Fmt.opts = { style: 'apa', decimal: '.', lang: 'es', html: false };
Fmt.set = function (o) { Object.assign(Fmt.opts, o || {}); return Fmt.opts; };
const O = o => Object.assign({}, Fmt.opts, o || {});
const it = (s, o) => o.html ? `<i>${s}</i>` : s;
const leading = o => o.style !== 'apa';

/* a plain number with d decimals, the minus sign and the chosen decimal mark */
Fmt.num = function (v, d, o) {
  o = O(o);
  if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return '—';
  if (d == null) d = 2;
  let s = Math.abs(v).toFixed(d);
  if (Number(s) === 0) { s = (0).toFixed(d); return o.decimal === ',' ? s.replace('.', ',') : s; }
  const [ip, fp] = s.split('.');
  const grouped = ip.length > 4 ? ip.replace(/\B(?=(\d{3})+(?!\d))/g, THIN) : ip;
  s = fp != null ? grouped + (o.decimal === ',' ? ',' : '.') + fp : grouped;
  return (v < 0 ? MINUS : '') + s;
};
/* a quantity bounded by 1 (r, ρ, τ, a proportion): APA drops the leading zero */
Fmt.bounded = function (v, d, o) {
  o = O(o);
  const s = Fmt.num(v, d == null ? 2 : d, o);
  if (leading(o) || s === '—') return s;
  return s.replace(/^(−?)0([.,])/, '$1$2');
};
Fmt.r = Fmt.bounded;
/* the p-value */
Fmt.pValue = function (p, o) {
  o = O(o);
  if (p === null || p === undefined || !isFinite(p)) return '—';
  if (o.style === 'sampl') {
    if (p < 0.001) return '< ' + Fmt.num(0.001, 3, o);
    return Fmt.num(p, p < 0.01 ? 3 : 2, o).replace(/^0([.,]\d\d)$/, '0$1');
  }
  if (p < 0.001) return '< ' + Fmt.bounded(0.001, 3, o);
  return Fmt.bounded(p, 3, o);
};
/* "p = .032" or "P < 0.001" */
Fmt.p = function (p, o) {
  o = O(o);
  const v = Fmt.pValue(p, o), sym = it(o.style === 'sampl' ? 'P' : 'p', o);
  return v.startsWith('<') ? `${sym} ${v}` : `${sym} = ${v}`;
};
const pct = (level, o) => {
  const k = Math.round(level * 100);
  return o.lang === 'es' ? `${k}${THIN}%` : `${k}%`;
};
/* the confidence interval of a bounded quantity */
Fmt.ci = function (lo, hi, level, o) {
  o = O(o);
  level = level || 0.95;
  const a = Fmt.bounded(lo, 2, o), b = Fmt.bounded(hi, 2, o);
  const ci = o.lang === 'es' ? 'IC' : 'CI';
  if (o.style === 'sampl') return o.lang === 'es' ? `${ci} ${pct(level, o)}: ${a} a ${b}` : `${pct(level, o)} ${ci}, ${a} to ${b}`;
  const sep = o.decimal === ',' ? '; ' : ', ';
  return o.lang === 'es' ? `${ci} ${pct(level, o)} [${a}${sep}${b}]` : `${pct(level, o)} ${ci} [${a}${sep}${b}]`;
};
/* the symbol of a coefficient: Latin letters in italic, Greek upright */
const SYM = { pearson: 'r', spearman: 'ρ', kendall: 'τ', gaussian: 'r_G', blomqvist: 'β', biweight: 'r_bw', pbend: 'r_pb',
  winsorized: 'r_w', dcor: 'dCor', xi: 'ξ', hoeffding: 'D', taustar: 'τ*', gamma: 'γ', somers: 'd' };
Fmt.symbol = function (id, o) {
  o = O(o);
  const s = SYM[id] || id;
  const latin = /^[a-zA-Z]/.test(s);
  if (!o.html) return s;
  const m = s.match(/^(.*)_(.*)$/);
  const core = m ? `${m[1]}<sub>${m[2]}</sub>` : s;
  return latin && !/^dCor$/.test(s) ? `<i>${core}</i>` : core;
};
/* a number in scientific notation as it is printed: 1.2 × 10⁵ */
const SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
Fmt.sci = function (v, d, o) {
  d = d == null ? 1 : d;
  if (!isFinite(v) || v === 0) return Fmt.num(v, d, o);
  let e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
  if (Math.abs(+m.toFixed(d)) >= 10) { m /= 10; e += 1; }
  return Fmt.num(m, d, o) + ' × 10' + String(e).split('').map(c => SUPS[c] || c).join('');
};
/* the whole sentence of a result, e.g. "r(48) = .45, 95% CI [.20, .65], p < .001" */
Fmt.sentence = function (res, o) {
  o = O(o);
  if (!res || !isFinite(res.est)) return '—';
  const parts = [];
  let head = Fmt.symbol(res.id, o);
  if (res.stat && res.stat.name === 't' && res.stat.df != null && (res.id === 'pearson' || res.id === 'spearman' || res.id === 'gaussian'))
    head += `(${Fmt.num(res.stat.df, Number.isInteger(res.stat.df) ? 0 : 1, o)})`;
  const bounded = !['hoeffding'].includes(res.id);
  parts.push(`${head} = ${bounded ? Fmt.bounded(res.est, 2, o) : Fmt.num(res.est, 3, o)}`);
  if (res.ci && isFinite(res.ci.lo)) parts.push(Fmt.ci(res.ci.lo, res.ci.hi, res.ci.level, o));
  if (isFinite(res.p)) parts.push(Fmt.p(res.p, o));
  return parts.join(', ');
};
/* an example sentence for the style picker */
Fmt.example = function (o) {
  return Fmt.sentence({ id: 'pearson', est: 0.4512, stat: { name: 't', df: 48 }, ci: { lo: 0.1963, hi: 0.6474, level: 0.95 }, p: 0.00098 }, o);
};

g.Fmt = Fmt;
return Fmt;
}
if (typeof window !== 'undefined') FmtCore(window);
