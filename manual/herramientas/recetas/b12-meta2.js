// ventana 1400x1200
/* Bloque 12: el embudo, la lectura y la tabla del metaanálisis */
(async () => {
  await bloque(12); await W(800);
  document.querySelector('.b12-bar [data-sec="meta"]').click(); await W(1200);
  document.getElementById('b12MetaEx').click(); await W(2500);
  const f = document.querySelector('#b12MetaRes .two-figs'); irA(f); await W(600);
  return caja([f, document.getElementById('b12MetaTable')], 8);
})()
