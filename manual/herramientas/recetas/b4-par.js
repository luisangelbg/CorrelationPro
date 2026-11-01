// ventana 1400x1200
/* Bloque 4 con el frenado de los autos: la tarjeta del par y la pregunta */
(async () => {
  await bloque(4, 'cars'); await W(3500);
  const c = tarjeta(4, 0); irA(c); await W(600);
  return caja([c], 4);
})()
