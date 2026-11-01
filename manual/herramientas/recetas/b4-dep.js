// ventana 1400x1200
/* Bloque 4 con la economía de 1947 a 1962: las fuerzas armadas y los empleados, un par no monótono (el Bloque 3 recomienda dCor) */
(async () => {
  await W(1000); B2.loadExample('longley'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  B4.setPair(k('armed_forces'), k('employed')); goStep(4); await W(4500);
  const c = tarjeta(4, 1); irA(c); await W(600);
  return caja([c], 4);
})()
