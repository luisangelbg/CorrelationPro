// ventana 1400x1300
/* Bloque 6 con la economía de 1947 a 1962: el rastreo de todos los pares, con MIC */
(async () => {
  await W(1000); B2.loadExample('longley'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  B6.setPair(k('year'), k('armed_forces')); goStep(6); await W(4000);
  document.getElementById('b6SweepMic').checked = true; document.getElementById('b6SweepGo').click(); await W(5000);
  const c = tarjeta(6, 1); irA(c); await W(600);
  const rows = document.querySelectorAll('#b6Sweep tbody tr');
  const a = c.querySelector('h2').getBoundingClientRect(), z = rows[Math.min(9, rows.length - 1)].getBoundingClientRect(), g = document.getElementById('b6Gallery').getBoundingClientRect();
  return [g.left - 14 + scrollX, a.top - 14 + scrollY, g.width + 28, z.bottom - a.top + 16].map(Math.round).join(',');
})()
