// ventana 1400x1200
/* Bloque 3 con los lirios: la influencia de cada punto y el botón que lleva el par al Bloque 4 */
(async () => {
  await bloque(3, 'iris'); await W(1500);
  const p = document.getElementById('b3InfPane'); irA(p); await W(500);
  return caja([p, document.getElementById('b3ToPair')], 8);
})()
