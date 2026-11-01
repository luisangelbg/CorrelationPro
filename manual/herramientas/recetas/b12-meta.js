// ventana 1400x1200
/* Bloque 12: el metaanálisis de 16 estudios: las cifras y el bosque */
(async () => {
  await bloque(12); await W(800);
  document.querySelector('.b12-bar [data-sec="meta"]').click(); await W(1200);
  document.getElementById('b12MetaEx').click(); await W(2500);
  const c = document.getElementById('b12MetaRes'); irA(c); await W(600);
  return caja([c.querySelector('h2'), document.getElementById('b12MetaTiles'), document.getElementById('b12ForestPane')], 12);
})()
