// ventana 1400x1100
/* Bloque 1: el catálogo de medidas, primeras filas */
(async () => {
  await W(1500);
  const ns = seccion('catalog'); irA(ns[0], 150); await W(700);
  const gal = document.getElementById('methodGallery'), cards = [...gal.children].slice(0, 12);
  return caja([ns[0], ns[1], document.getElementById('methodSearch'), document.getElementById('methodFilter'), ...cards], 8);
})()
