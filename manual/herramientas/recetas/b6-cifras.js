// ventana 1400x1200
/* Bloque 6 con la economía de 1947 a 1962: el año y las fuerzas armadas, las cifras de cada medida */
(async () => {
  await W(1000); B2.loadExample('longley'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  B6.setPair(k('year'), k('armed_forces')); goStep(6); await W(4000);
  const c = tarjeta(6, 0); irA(c); await W(600);
  return caja([c.querySelector('h2'), c.querySelector('.form-grid'), document.getElementById('b6Tiles')], 12);
})()
