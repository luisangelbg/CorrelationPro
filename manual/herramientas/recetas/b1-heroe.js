// ventana 1400x900
/* Bloque 1: la portada con la paradoja de Simpson vista por especie */
(async () => {
  await W(1500);
  const b = (vis('.hero button', 'Ver por especie') || vis('.hero button', 'See by species')); if (b) b.click(); await W(1400);
  const h = vis('.hero'); irA(h, 170); await W(400);
  return caja([h], 2);
})()
