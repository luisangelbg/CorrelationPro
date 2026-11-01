// ventana 1400x1200
/* Bloque 12: los estudios y el modelo */
(async () => {
  await bloque(12); await W(800);
  document.querySelector('.b12-bar [data-sec="meta"]').click(); await W(1200);
  document.getElementById('b12MetaEx').click(); await W(2500);
  const c = [...document.querySelectorAll('#b12Sec-meta .card')][0]; irA(c); await W(600);
  return caja([c], 4);
})()
