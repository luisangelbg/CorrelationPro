// ventana 1400x1200
/* Bloque 6 con los lirios: el ancho del sépalo y el largo del pétalo, la matriz característica de MIC y la lectura */
(async () => {
  await W(1000); B2.loadExample('iris'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  B6.setPair(k('sepal_width'), k('petal_length')); goStep(6); await W(4000);
  const c = tarjeta(6, 0), f = c.querySelectorAll('.two-figs')[1]; irA(f); await W(600);
  return caja([f, c.querySelector('details')], 8);
})()
