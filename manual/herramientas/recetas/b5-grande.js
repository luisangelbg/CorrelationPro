// ventana 1400x1300
/* Bloque 5 con 300 variables simuladas: el lienzo de colores y la lupa de números (la parte de arriba del panel) */
(async () => {
  await bloque(5, 'swiss'); await W(1500);
  document.getElementById('b5Big').click(); await W(6000);
  const p = document.getElementById('b5FigPane'); irA(p, 120); await W(800);
  const cv = document.querySelector('#b5Fig canvas'), r = cv.getBoundingClientRect();
  cv.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + r.width * 0.22, clientY: r.top + r.height * 0.30 })); await W(500);
  const a = p.getBoundingClientRect(), l = document.getElementById('b5Lens').getBoundingClientRect();
  return [a.left - 8 + scrollX, a.top - 8 + scrollY, a.width + 16, l.bottom - a.top + 18].map(Math.round).join(',');
})()
