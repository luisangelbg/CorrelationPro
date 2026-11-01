// ventana 1400x1200
/* Bloque 11 con Suiza, 1888: la misma red como cuerdas agrupadas */
(async () => {
  await bloque(11, 'swiss'); await W(2500);
  document.querySelector('.b11-bar [data-view="bundle"]').click(); await W(2000);
  const p = document.getElementById('b11NetPane'); irA(p); await W(600);
  return caja([p], 8);
})()
