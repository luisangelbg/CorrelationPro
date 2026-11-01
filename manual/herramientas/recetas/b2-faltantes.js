// ventana 1400x1100
/* Bloque 2: los faltantes de unos datos pegados: tres maneras de escribir «sin dato», dos celdas vacías y dos -999 */
(async () => {
  await bloque(2);
  document.getElementById('b2PasteBtn').click(); await W(400);
  const t = document.getElementById('b2PasteText');
  t.value = ['parcela\taltura\tdiametro\tcobertura', 'P1\t12.4\t31\t0.62', 'P2\t15.1\t38\t0.71', 'P3\tn/d\t29\t0.55', 'P4\t9.8\t-999\t0.48', 'P5\t14.0\t36\t', 'P6\t11.2\t30\t0.58', 'P7\t16.5\t41\tNA', 'P8\t13.3\t33\t0.66', 'P9\t10.4\t27\t0.51', 'P10\t15.8\t\t0.74', 'P11\t12.9\t-999\t0.60', 'P12\t14.6\t37\t0.69'].join('\n');
  document.getElementById('b2PasteGo').click(); await W(1200);
  const c = document.getElementById('b2MissTiles').closest('.card'); irA(c); await W(400);
  return caja([c], 4);
})()
