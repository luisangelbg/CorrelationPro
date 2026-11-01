// ventana 1400x1200
/* Bloque 3 con los lirios: la tarjeta de #b3Group */
(async () => {
  await bloque(3, 'iris'); await W(1500);
  const c = document.getElementById('b3Group').closest('.card'); irA(c); await W(500);
  return caja([c], 4);
})()
