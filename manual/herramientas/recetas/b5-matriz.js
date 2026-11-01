// ventana 1400x1200
/* Bloque 5 con Suiza, 1888: la matriz con elipses abajo y números arriba, y un par elegido */
(async () => {
  await bloque(5, 'swiss'); await W(2500);
  const cell = document.querySelector('#b5Fig .pl-cell[data-i="3"][data-j="0"]'); if (cell) cell.dispatchEvent(new MouseEvent('click', { bubbles: true })); await W(600);
  const p = document.getElementById('b5FigPane'); irA(p); await W(600);
  return caja([p, document.getElementById('b5ToPair')], 8);
})()
