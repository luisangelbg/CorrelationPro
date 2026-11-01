// ventana 1400x1200
/* Bloque 6 con Suiza, 1888: las cinco cópulas del examen y la educación, los rangos, una muestra de la mejor y las colas */
(async () => {
  await W(1000); B2.loadExample('swiss'); await W(500);
  const k = nm => state.data.cols.find(c => c.name === nm).key;
  B6.setPair(k('examination'), k('education')); goStep(6); await W(4000);
  const c = tarjeta(6, 2); irA(c); await W(600);
  return caja([c], 4);
})()
