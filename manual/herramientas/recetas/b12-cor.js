// ventana 1400x1200
/* Bloque 12: la corrección por atenuación y por rango restringido */
(async () => {
  await bloque(12); await W(800);
  document.querySelector('.b12-bar [data-sec="cor"]').click(); await W(1500);
  const cs = [...document.querySelectorAll('#b12Sec-cor .card')]; irA(cs[0]); await W(600);
  return caja([cs[0], cs[1].querySelector('#b12RTiles')], 4);
})()
