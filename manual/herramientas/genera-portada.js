/* CorrelationPro — manual de usuario: dibuja la portada (es/00a-portada.html).
   Una sola ilustración vectorial original, hecha con los propios motores de la app sobre datos reales de dominio
   público, para que la portada no sea un adorno sino una figura correcta:
     – al centro, los lirios de Anderson (1935) y Fisher (1936): largo y ancho del sépalo de las 150 flores, con la
       recta de todas juntas (r negativa) y la de cada especie (r positiva): la paradoja de Simpson, que es la
       figura de la portada de la app;
     – debajo, la tira de los nueve glifos de la app, de r = −1 a r = +1, con la paleta Añil–Achiote;
     – la franja de los trece colores de los bloques, los mismos del manual;
     – al pie, tres viñetas: la matriz de Pearson de los lirios, la red regularizada de Suiza (1888) y la
       distribución exacta de r bajo H₀ y bajo ρ = .30 con n = 50 (la potencia sombreada).
   Fondo blanco, como las demás portadas de la suite, con el negro laca, el rojo y el oro de la app.
   Sin azar: todo sale de los datos. Uso, desde la carpeta de la app:  node manual/herramientas/genera-portada.js
   La edición inglesa (en/00a-portada.html: el mismo dibujo con los textos en inglés):  … genera-portada.js --idioma en */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const APP = path.resolve(__dirname, '..', '..');

/* the app's engines, as the validation scripts load them */
const box = { window: {} }; box.window = box; vm.createContext(box);
for (const f of ['num.js', 'coef.js', 'palettes.js', 'pairstat.js', 'matrix.js', 'network.js', 'infer.js', 'datasets.js']) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f), 'utf8'), box);
vm.runInContext('NumCore(this); CoefCore(this); PalCore(this); PairStatCore(this); MatrixCore(this); NetworkCore(this); InferCore(this);', box);
const { Num, Coef, Pal, Mat, Net, Infer, Datasets } = box;
const D = id => Datasets.list.find(d => d.id === id);
const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
/* the language of the texts: Spanish by default, English with --idioma en */
const EN = process.argv.includes('--idioma') && process.argv[process.argv.indexOf('--idioma') + 1] === 'en';
const L = (es, en) => (EN ? en : es);

/* ---------------- the palette of the cover ---------------- */
const C = {
  fondo: '#ffffff', oro: '#8f6a1c', oroLin: '#b98d2c', marfil: '#1c1414', gris: '#5e5250', rojo: '#c41e33',
  setosa: '#cf2a40', versicolor: '#b2811a', virginica: '#4a52c4',
};
const BLOQUES = ['#b3182d', '#a57a1f', '#2f6e8f', '#8e2440', '#4c52c9', '#00829a', '#6e4fa3', '#b0562a', '#2e7d4f', '#7a5a2e', '#a63aa0', '#3e5c8a', '#8a6a1a'];

/* ---------------- the iris ---------------- */
const iris = D('iris'), V = k => iris.vars.find(v => v.key === k).v;
const spv = iris.vars.find(v => v.key === 'species'), sl = V('sepal_length'), sw = V('sepal_width'), sp = spv.v.map(c => spv.levels[c]);
const especies = ['setosa', 'versicolor', 'virginica'];
const ols = (x, y) => { const mx = Num.mean(x), my = Num.mean(y); let sxy = 0, sxx = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; }); const b = sxy / sxx; return { a: my - b * mx, b, mx, my }; };

let s = '';
const W = 850, H = 1100;
/* frame */
s += `<defs>
  <radialGradient id="laca" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#fbf3ec"/><stop offset="0.6" stop-color="#fffdfb"/><stop offset="1" stop-color="#ffffff"/></radialGradient>
  <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6ae55"/><stop offset="0.5" stop-color="#9c7320"/><stop offset="1" stop-color="#cfa548"/></linearGradient>
  <clipPath id="nube"><rect x="150" y="374" width="560" height="312"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#laca)"/>
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="url(#oro)" stroke-width="2.2"/>
<rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="#b98d2c" stroke-width="0.7" opacity="0.7"/>`;
/* corner ornaments: four little ellipse glyphs at r = ±.8 */
const glifo = (cx, cy, rr, r, fill, stroke, sw0) => {
  const a = rr * Math.sqrt(1 + Math.abs(r)), b = rr * Math.sqrt(Math.max(0.0001, 1 - Math.abs(r))), ang = r >= 0 ? -45 : 45;
  return `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f2(a)}" ry="${f2(b)}" transform="rotate(${ang} ${f1(cx)} ${f1(cy)})" fill="${fill}" stroke="${stroke}" stroke-width="${sw0}"/>`;
};
[[60, 60, 0.8], [W - 60, 60, -0.8], [60, H - 60, -0.8], [W - 60, H - 60, 0.8]].forEach(([x, y, r]) => { s += glifo(x, y, 13, r, 'none', '#b98d2c', 1.1) + glifo(x, y, 6, -r, '#b3182d', 'none', 0); });

/* title */
s += `<text x="${W / 2}" y="104" text-anchor="middle" font-family="Jost" font-weight="500" font-size="12.5" letter-spacing="5.5" fill="${C.oro}">${L('LABG SUITE · CIENCIA ABIERTA EN EL NAVEGADOR', 'LABG SUITE · OPEN SCIENCE IN THE BROWSER')}</text>
<text x="${W / 2}" y="196" text-anchor="middle" font-family="Cormorant" font-weight="600" font-size="92" fill="${C.marfil}">Correlation<tspan fill="${C.rojo}">Pro</tspan></text>
<line x1="${W / 2 - 70}" y1="222" x2="${W / 2 + 70}" y2="222" stroke="${C.oro}" stroke-width="1.4"/>`;
s += EN
  ? `
<text x="${W / 2}" y="257" text-anchor="middle" font-family="Cormorant" font-weight="600" font-size="36" fill="${C.marfil}">User’s Manual</text>
<text x="${W / 2}" y="285" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="25" fill="${C.oro}">Manual de usuario</text>
<text x="${W / 2}" y="312" text-anchor="middle" font-family="Jost" font-weight="400" font-size="15" fill="${C.marfil}" opacity="0.88">Correlation analysis of every kind, with its theory</text>
<text x="${W / 2}" y="331" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="14" fill="${C.gris}">Análisis de correlación de todo tipo, con su teoría</text>`
  : `
<text x="${W / 2}" y="262" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="36" fill="${C.oro}">Manual de usuario</text>
<text x="${W / 2}" y="296" text-anchor="middle" font-family="Jost" font-weight="400" font-size="15" fill="${C.marfil}" opacity="0.88">Análisis de correlación de todo tipo, con su teoría</text>
<text x="${W / 2}" y="318" text-anchor="middle" font-family="Jost" font-weight="300" font-size="11.5" letter-spacing="1.2" fill="${C.gris}">User’s manual · Correlation analysis of every kind</text>`;

/* ---------------- the scatter: Simpson in the irises ---------------- */
const X0 = 150, X1 = 710, Y0 = 686, Y1 = 374, xl = [4.1, 8.1], yl = [1.85, 4.55];
const sx = v => X0 + (v - xl[0]) / (xl[1] - xl[0]) * (X1 - X0), sy = v => Y0 - (v - yl[0]) / (yl[1] - yl[0]) * (Y0 - Y1);
/* grid and ticks */
for (let v = 4.5; v <= 8; v += 0.5) s += `<line x1="${f1(sx(v))}" y1="${Y1}" x2="${f1(sx(v))}" y2="${Y0}" stroke="#8f6a1c" stroke-opacity="${v % 1 ? 0.08 : 0.16}" stroke-width="0.8"/>`;
for (let v = 2; v <= 4.5; v += 0.5) s += `<line x1="${X0}" y1="${f1(sy(v))}" x2="${X1}" y2="${f1(sy(v))}" stroke="#8f6a1c" stroke-opacity="${v % 1 ? 0.08 : 0.16}" stroke-width="0.8"/>`;
s += `<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${C.marfil}" stroke-opacity="0.55" stroke-width="1"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" stroke="${C.marfil}" stroke-opacity="0.55" stroke-width="1"/>`;
for (let v = 5; v <= 8; v++) s += `<text x="${f1(sx(v))}" y="${Y0 + 16}" text-anchor="middle" font-family="Jost" font-size="10" fill="${C.marfil}" opacity="0.6">${v}</text>`;
for (let v = 2; v <= 4; v++) s += `<text x="${X0 - 8}" y="${f1(sy(v) + 3.5)}" text-anchor="end" font-family="Jost" font-size="10" fill="${C.marfil}" opacity="0.6">${v}</text>`;
s += `<text x="${(X0 + X1) / 2}" y="${Y0 + 34}" text-anchor="middle" font-family="Jost" font-size="10.5" letter-spacing="1" fill="${C.marfil}" opacity="0.7">${L('LARGO DEL SÉPALO (cm)', 'SEPAL LENGTH (cm)')}</text>
<text transform="translate(${X0 - 30} ${(Y0 + Y1) / 2}) rotate(-90)" text-anchor="middle" font-family="Jost" font-size="10.5" letter-spacing="1" fill="${C.marfil}" opacity="0.7">${L('ANCHO DEL SÉPALO (cm)', 'SEPAL WIDTH (cm)')}</text>`;
/* data ellipses (68 %), within lines, points */
const rs = {};
s += '<g clip-path="url(#nube)">';
especies.forEach(e => {
  const idx = sp.map((v, i) => (v === e ? i : -1)).filter(i => i >= 0), x = idx.map(i => sl[i]), y = idx.map(i => sw[i]);
  const mo = { mx: Num.mean(x), my: Num.mean(y), vx: Num.variance(x), vy: Num.variance(y) };
  let c = 0; x.forEach((v, i) => { c += (v - mo.mx) * (y[i] - mo.my); }); c /= x.length - 1;
  rs[e] = Coef.pearson(x, y).est;
  /* the ellipse {(x − m)ᵀS⁻¹(x − m) ≤ c²}, c² = −2 log(1 − .68), drawn as a path in data units */
  const cc = Math.sqrt(-2 * Math.log(1 - 0.68)), tr = mo.vx + mo.vy, det = mo.vx * mo.vy - c * c;
  const l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det), th = Math.atan2(l1 - mo.vx, c);
  let d = '';
  for (let k = 0; k <= 96; k++) { const t = 2 * Math.PI * k / 96, u = cc * Math.sqrt(l1) * Math.cos(t), w = cc * Math.sqrt(l2) * Math.sin(t); d += (k ? 'L' : 'M') + f1(sx(mo.mx + u * Math.cos(th) - w * Math.sin(th))) + ' ' + f1(sy(mo.my + u * Math.sin(th) + w * Math.cos(th))); }
  s += `<path d="${d}Z" fill="${C[e]}" fill-opacity="0.08" stroke="${C[e]}" stroke-opacity="0.6" stroke-width="1"/>`;
  const L = ols(x, y), xa = Math.min(...x) - 0.1, xb = Math.max(...x) + 0.1;
  s += `<line x1="${f1(sx(xa))}" y1="${f1(sy(L.a + L.b * xa))}" x2="${f1(sx(xb))}" y2="${f1(sy(L.a + L.b * xb))}" stroke="${C[e]}" stroke-width="2.4" stroke-linecap="round"/>`;
});
/* the line of all of them together */
{ const L = ols(sl, sw), xa = 4.2, xb = 8.0; s += `<line x1="${f1(sx(xa))}" y1="${f1(sy(L.a + L.b * xa))}" x2="${f1(sx(xb))}" y2="${f1(sy(L.a + L.b * xb))}" stroke="${C.marfil}" stroke-width="1.8" stroke-dasharray="7 5" opacity="0.85"/>`; }
/* the points (repeated values drawn once, a little bigger) */
const vistos = new Map();
sl.forEach((v, i) => { const k = v + '|' + sw[i] + '|' + sp[i]; vistos.set(k, (vistos.get(k) || 0) + 1); });
for (const [k, m] of vistos) { const [x, y, e] = k.split('|'); s += `<circle cx="${f1(sx(+x))}" cy="${f1(sy(+y))}" r="${f1(3.1 + 0.9 * Math.sqrt(m - 1))}" fill="${C[e]}" stroke="#ffffff" stroke-width="0.8"/>`; }
s += '</g>';
const rAll = Coef.pearson(sl, sw).est;
const fr = v => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2).replace(/^0/, '');
/* the legend, as a reader would write it */
s += `<g font-family="Jost" font-size="11.5" fill="${C.marfil}">
  <line x1="472" y1="394" x2="500" y2="394" stroke="${C.marfil}" stroke-width="1.8" stroke-dasharray="7 5"/><text x="508" y="398">${L('las 150 flores juntas', 'all 150 flowers pooled')}: r = ${fr(rAll)}</text>
  ${especies.map((e, k) => `<line x1="472" y1="${414 + 18 * k}" x2="500" y2="${414 + 18 * k}" stroke="${C[e]}" stroke-width="2.4"/><circle cx="486" cy="${414 + 18 * k}" r="3.4" fill="${C[e]}"/><text x="508" y="${418 + 18 * k}"><tspan font-style="italic">I. ${e}</tspan>: r = ${fr(rs[e])}</text>`).join('')}
</g>`;
s += `<text x="${X1}" y="${Y1 - 10}" text-anchor="end" font-family="Cormorant" font-style="italic" font-size="15" fill="${C.oro}">${L('dentro de cada especie suben; juntas, bajan: la paradoja de Simpson', 'within each species they rise; pooled, they fall: Simpson’s paradox')}</text>`;

/* ---------------- the band of glyphs ---------------- */
const pal = Pal.get('anil');
const rr9 = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
rr9.forEach((r, k) => {
  const cx = 160 + k * 66.25, cy = 768, col = Pal.color(pal, r);
  s += `<circle cx="${f1(cx)}" cy="${cy}" r="25" fill="none" stroke="#b98d2c" stroke-opacity="0.55" stroke-width="0.8"/>`;
  s += Math.abs(r) === 1 ? `<line x1="${f1(cx - 17)}" y1="${f1(cy + (r > 0 ? 17 : -17))}" x2="${f1(cx + 17)}" y2="${f1(cy + (r > 0 ? -17 : 17))}" stroke="${col}" stroke-width="3.2" stroke-linecap="round"/>` : glifo(cx, cy, 15.5, r, col, '#6b5a52', 0.6);
  s += `<text x="${f1(cx)}" y="${cy + 42}" text-anchor="middle" font-family="Jost" font-size="9.5" fill="${C.marfil}" opacity="0.7">${r === 0 ? '0' : fr(r).replace(/\.?0+$/, '').replace('+1', '+1').replace('−1', '−1')}</text>`;
});

/* ---------------- the band of the thirteen blocks ---------------- */
BLOQUES.forEach((c, k) => { const w = (580 - 12 * 3) / 13; s += `<rect x="${f1(135 + k * (w + 3))}" y="828" width="${f2(w)}" height="7" fill="${c}"/>`; });

/* ---------------- the three vignettes ---------------- */
const vin = (x, titulo, cuerpo) => `<g transform="translate(${x} 846)"><rect width="176" height="150" rx="9" fill="#fbf7f1" stroke="#b98d2c" stroke-opacity="0.7" stroke-width="1"/>${cuerpo}<text x="88" y="140" text-anchor="middle" font-family="Jost" font-weight="500" font-size="9" letter-spacing="2" fill="${C.oro}">${titulo}</text></g>`;
/* 1 · the iris matrix: lower triangle numbers, upper ellipses */
{
  const ks = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'], cols = ks.map(V), R = ks.map((a, i) => ks.map((b, j) => Coef.pearson(cols[i], cols[j]).est));
  let g = '';
  const c0 = 26, s0 = 28, y0 = 10;
  R.forEach((row, i) => row.forEach((r, j) => {
    const cx = c0 + j * s0 + s0 / 2, cy = y0 + i * s0 + s0 / 2;
    g += `<rect x="${c0 + j * s0}" y="${y0 + i * s0}" width="${s0 - 2}" height="${s0 - 2}" fill="${i === j ? '#efe4d3' : '#ffffff'}" stroke="#ddcdb6" stroke-width="0.5"/>`;
    if (i < j) g += glifo(cx - 1, cy - 1, 8.5, r, Pal.color(pal, r), 'none', 0);
    else if (i > j) g += `<text x="${cx - 1}" y="${cy + 2.5}" text-anchor="middle" font-family="Jost" font-weight="500" font-size="8.2" fill="${r < 0 ? '#a33a1c' : '#3a3fa6'}">${fr(r).replace('+', '')}</text>`;
    else g += `<text x="${cx - 1}" y="${cy + 2.5}" text-anchor="middle" font-family="Jost" font-size="7" fill="${C.marfil}" opacity="0.6">${(EN ? ['SL', 'SW', 'PL', 'PW'] : ['LS', 'AS', 'LP', 'AP'])[i]}</text>`;
  }));
  s += vin(135, L('LA MATRIZ', 'THE MATRIX'), g);
}
/* 2 · the regularized network of Switzerland */
{
  const sw0 = D('swiss'), cols = sw0.vars.filter(v => v.type === 'continuous').map(v => v.v), names = sw0.vars.filter(v => v.type === 'continuous').map(v => (EN ? v.en : v.es));
  const R = cols.map(a => cols.map(b => Coef.pearson(a, b).est));
  const E = Net.ebicLasso(R, sw0.n, { gamma: 0.5 }), Wt = E.net, pos = Net.layoutFR(Wt, { seed: 3 });
  const px = pos.map(p => p[0]), py = pos.map(p => p[1]), mnx = Math.min(...px), mxx = Math.max(...px), mny = Math.min(...py), mxy = Math.max(...py);
  const tx = v => 22 + (v - mnx) / (mxx - mnx || 1) * 132, ty = v => 16 + (v - mny) / (mxy - mny || 1) * 98;
  let g = '';
  for (let i = 0; i < Wt.length; i++) for (let j = i + 1; j < Wt.length; j++) { const w = Wt[i][j]; if (Math.abs(w) < 1e-9) continue; g += `<line x1="${f1(tx(px[i]))}" y1="${f1(ty(py[i]))}" x2="${f1(tx(px[j]))}" y2="${f1(ty(py[j]))}" stroke="${w > 0 ? C.virginica : C.setosa}" stroke-width="${f1(0.8 + 7 * Math.abs(w))}" stroke-linecap="round" stroke-opacity="0.85"/>`; }
  pos.forEach((p, i) => { g += `<circle cx="${f1(tx(p[0]))}" cy="${f1(ty(p[1]))}" r="7.5" fill="#d4a848" stroke="#ffffff" stroke-width="1.6"/><text x="${f1(tx(p[0]))}" y="${f1(ty(p[1]) + 2.6)}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="6.6" fill="#120c0c">${names[i].slice(0, 2).toUpperCase()}</text>`; });
  s += vin(337, L('LA RED', 'THE NETWORK'), g);
}
/* 3 · the exact distribution of r under H0 and under rho = .30, n = 50 */
{
  const n = 50, rho = 0.3, tq = Num.qt(0.975, n - 2), rc = Math.sqrt(tq * tq / (tq * tq + n - 2));
  const xs = Array.from({ length: 141 }, (_, k) => -0.55 + 1.3 * k / 140), d0 = xs.map(x => Infer.densityR(x, 0, n)), d1 = xs.map(x => Infer.densityR(x, rho, n));
  const ym = Math.max(...d0, ...d1) * 1.08, gx = v => 14 + (v + 0.55) / 1.3 * 148, gy = v => 118 - v / ym * 100;
  const path0 = xs.map((x, k) => (k ? 'L' : 'M') + f1(gx(x)) + ' ' + f1(gy(d0[k]))).join(''), path1 = xs.map((x, k) => (k ? 'L' : 'M') + f1(gx(x)) + ' ' + f1(gy(d1[k]))).join('');
  const reg = xs.map((x, k) => [x, d1[k]]).filter(([x]) => x >= rc);
  const area = `M${f1(gx(rc))} ${f1(gy(0))}` + reg.map(([x, d]) => `L${f1(gx(x))} ${f1(gy(d))}`).join('') + `L${f1(gx(reg[reg.length - 1][0]))} ${f1(gy(0))}Z`;
  let g = `<line x1="14" y1="118" x2="162" y2="118" stroke="${C.marfil}" stroke-opacity="0.55" stroke-width="0.8"/>`;
  g += `<path d="${area}" fill="${C.setosa}" fill-opacity="0.32"/>`;
  g += `<path d="${path0}" fill="none" stroke="${C.marfil}" stroke-opacity="0.75" stroke-width="1.5"/><path d="${path1}" fill="none" stroke="${C.setosa}" stroke-width="2"/>`;
  g += `<line x1="${f1(gx(rc))}" y1="14" x2="${f1(gx(rc))}" y2="118" stroke="#9c7320" stroke-width="0.9" stroke-dasharray="3 2"/><line x1="${f1(gx(-rc))}" y1="14" x2="${f1(gx(-rc))}" y2="118" stroke="#9c7320" stroke-width="0.9" stroke-dasharray="3 2"/>`;
  g += `<text x="${f1(gx(0))}" y="${f1(gy(Math.max(...d0)) - 4)}" text-anchor="middle" font-family="Jost" font-size="7.2" fill="${C.marfil}" opacity="0.8">H₀</text><text x="${f1(gx(rho) + 6)}" y="${f1(gy(Math.max(...d1)) - 4)}" text-anchor="middle" font-family="Jost" font-size="7.2" fill="${C.setosa}">ρ = .30</text>`;
  g += `<text x="${f1(gx(0.55))}" y="102" text-anchor="middle" font-family="Jost" font-size="7" fill="${C.setosa}">${Math.round(100 * Infer.powerExact(rho, n, 0.05))}${L(' %', '%')}</text>`;
  s += vin(539, L('LA POTENCIA', 'THE POWER'), g);
}

/* footer */
s += `<text x="${W / 2}" y="1040" text-anchor="middle" font-family="Jost" font-weight="400" font-size="12" letter-spacing="2.5" fill="${C.marfil}" opacity="0.85">LUIS ÁNGEL BARRERA-GUZMÁN</text>
<text x="${W / 2}" y="1060" text-anchor="middle" font-family="Jost" font-weight="400" font-size="10" letter-spacing="1.5" fill="${C.oro}">${L('VERSIÓN 1.0 · 2026', 'ENGLISH EDITION · VERSION 1.0 · 2026')}</text>`;

const html = `<!doctype html>
<html lang="${L('es', 'en')}">
<head>
<meta charset="utf-8">
<title>${L('CorrelationPro · Manual de usuario · Portada', 'CorrelationPro · User’s Manual · Cover')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../manual.css">
<!-- dibujada por herramientas/genera-portada.js${L('', ' --idioma en')}: no se edita a mano -->
</head>
<body>
<section class="page cover" aria-label="${L('Portada', 'Cover')}">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Portada del manual de CorrelationPro: la paradoja de Simpson en los lirios de Anderson, los nueve glifos de la correlación y tres viñetas (la matriz, la red y la potencia)', 'Cover of the CorrelationPro manual: Simpson’s paradox in Anderson’s irises, the nine glyphs of correlation and three vignettes (the matrix, the network and the power)')}">
${s}
</svg>
</section>
</body>
</html>
`;
fs.writeFileSync(path.join(APP, 'manual', EN ? 'en' : 'es', '00a-portada.html'), html);
console.log('portada: r juntas', rAll.toFixed(4), 'por especie', especies.map(e => rs[e].toFixed(4)).join(' '), '·', (html.length / 1024).toFixed(0) + ' KB');
